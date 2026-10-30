import psycopg2
from psycopg2.extras import execute_values
import pandas as pd
from typing import Dict, Any, Tuple

def load_dimensions_and_facts(conn, dimension_dfs: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
    """
    Idempotently loads transformed Star Schema dimensions and Fact records into PostgreSQL.
    Preserves default UNKNOWN dimension rows (key=0) and enforces ON CONFLICT deduplication.
    """
    cur = conn.cursor()
    load_stats = {}

    # 1. Load dim_time
    dim_time_df = dimension_dfs["dim_time"]
    time_tuples = [
        (
            int(row['time_key']),
            str(row['full_date']),
            str(row['full_timestamp']),
            int(row['year']),
            int(row['quarter']),
            int(row['month']),
            str(row['month_name']),
            int(row['day']),
            int(row['day_of_week']),
            str(row['day_name']),
            int(row['hour']),
            str(row['time_period']),
            bool(row['is_weekend'])
        )
        for _, row in dim_time_df.iterrows()
    ]

    time_query = """
    INSERT INTO dim_time (time_key, full_date, full_timestamp, year, quarter, month, month_name, day, day_of_week, day_name, hour, time_period, is_weekend)
    VALUES %s
    ON CONFLICT (time_key) DO NOTHING;
    """
    execute_values(cur, time_query, time_tuples, page_size=2000)

    # 2. Load dim_area
    dim_area_df = dimension_dfs["dim_area"]
    area_tuples = [
        (row['district'], row['beat'], row['ward'], row['community_area'])
        for _, row in dim_area_df.iterrows()
    ]
    area_query = """
    INSERT INTO dim_area (district, beat, ward, community_area)
    VALUES %s
    ON CONFLICT (district, beat, ward, community_area) DO NOTHING;
    """
    execute_values(cur, area_query, area_tuples, page_size=2000)

    # 3. Load dim_location
    dim_loc_df = dimension_dfs["dim_location"]
    loc_tuples = [
        (
            row['block'],
            float(row['latitude']) if pd.notna(row['latitude']) else None,
            float(row['longitude']) if pd.notna(row['longitude']) else None,
            float(row['x_coordinate']) if pd.notna(row['x_coordinate']) else None,
            float(row['y_coordinate']) if pd.notna(row['y_coordinate']) else None
        )
        for _, row in dim_loc_df.iterrows()
    ]
    loc_query = """
    INSERT INTO dim_location (block, latitude, longitude, x_coordinate, y_coordinate)
    VALUES %s
    ON CONFLICT (block, latitude, longitude) DO NOTHING;
    """
    execute_values(cur, loc_query, loc_tuples, page_size=2000)

    # 4. Load dim_crime
    dim_crime_df = dimension_dfs["dim_crime"]
    crime_tuples = [
        (row['primary_type'], row['description'], row['iucr'], row['fbi_code'])
        for _, row in dim_crime_df.iterrows()
    ]
    crime_query = """
    INSERT INTO dim_crime (primary_type, description, iucr, fbi_code)
    VALUES %s
    ON CONFLICT (iucr, primary_type, description, fbi_code) DO NOTHING;
    """
    execute_values(cur, crime_query, crime_tuples, page_size=2000)

    # 5. Load dim_premise
    dim_premise_df = dimension_dfs["dim_premise"]
    premise_tuples = [(row['location_description'],) for _, row in dim_premise_df.iterrows()]
    premise_query = """
    INSERT INTO dim_premise (location_description)
    VALUES %s
    ON CONFLICT (location_description) DO NOTHING;
    """
    execute_values(cur, premise_query, premise_tuples, page_size=2000)

    # 6. Load dim_status
    dim_status_df = dimension_dfs["dim_status"]
    status_tuples = [(bool(row['arrest']), bool(row['domestic'])) for _, row in dim_status_df.iterrows()]
    status_query = """
    INSERT INTO dim_status (arrest, domestic)
    VALUES %s
    ON CONFLICT (arrest, domestic) DO NOTHING;
    """
    execute_values(cur, status_query, status_tuples, page_size=2000)

    # ------------------------------------------------------------------------
    # 7. Dimension Lookup Mapping for Fact Staging
    # ------------------------------------------------------------------------
    cur.execute("SELECT district, beat, ward, community_area, area_key FROM dim_area;")
    area_map = {(r[0], r[1], r[2], r[3]): r[4] for r in cur.fetchall()}

    cur.execute("SELECT block, latitude, longitude, location_key FROM dim_location WHERE location_key > 0;")
    loc_map = {}
    for r in cur.fetchall():
        lat_val = round(float(r[1]), 6) if r[1] is not None else None
        lon_val = round(float(r[2]), 6) if r[2] is not None else None
        loc_map[(r[0], lat_val, lon_val)] = r[3]

    cur.execute("SELECT iucr, primary_type, description, fbi_code, crime_key FROM dim_crime;")
    crime_map = {(r[0], r[1], r[2], r[3]): r[4] for r in cur.fetchall()}

    cur.execute("SELECT location_description, premise_key FROM dim_premise;")
    premise_map = {r[0]: r[1] for r in cur.fetchall()}

    cur.execute("SELECT arrest, domestic, status_key FROM dim_status;")
    status_map = {(bool(r[0]), bool(r[1])): r[2] for r in cur.fetchall()}

    # ------------------------------------------------------------------------
    # 8. Construct Fact Tuples
    # ------------------------------------------------------------------------
    fact_staging_df = dimension_dfs["fact_staging"]
    fact_tuples = []

    for _, row in fact_staging_df.iterrows():
        src_id = str(row['id'])
        c_num = str(row['case_number']) if pd.notna(row['case_number']) else 'UNKNOWN'
        t_key = int(row['time_key'])

        a_key = area_map.get((row['district'], row['beat'], row['ward'], row['community_area']), 0)
        c_key = crime_map.get((row['iucr'], row['primary_type'], row['description'], row['fbi_code']), 0)
        p_key = premise_map.get(row['location_description'], 0)
        s_key = status_map.get((bool(row['arrest']), bool(row['domestic'])), 0)

        if pd.notna(row['lat_numeric']) and pd.notna(row['lon_numeric']):
            lat_r = round(float(row['lat_numeric']), 6)
            lon_r = round(float(row['lon_numeric']), 6)
            l_key = loc_map.get((row['block'], lat_r, lon_r), 0)
        else:
            l_key = 0

        fact_tuples.append((src_id, c_num, t_key, a_key, l_key, c_key, p_key, s_key, 1))

    # ------------------------------------------------------------------------
    # 9. Load fact_crime (Idempotent ON CONFLICT)
    # ------------------------------------------------------------------------
    fact_query = """
    INSERT INTO fact_crime (source_crime_id, case_number, time_key, area_key, location_key, crime_key, premise_key, status_key, crime_count)
    VALUES %s
    ON CONFLICT (source_crime_id) DO NOTHING;
    """
    execute_values(cur, fact_query, fact_tuples, page_size=2000)

    # ------------------------------------------------------------------------
    # 10. Record Inventory Check
    # ------------------------------------------------------------------------
    cur.execute("SELECT count(*) FROM fact_crime;")
    fact_count = cur.fetchone()[0]

    dim_counts = {}
    for table in ['dim_time', 'dim_area', 'dim_location', 'dim_crime', 'dim_premise', 'dim_status']:
        cur.execute(f"SELECT count(*) FROM {table};")
        dim_counts[table] = cur.fetchone()[0]

    cur.close()

    load_stats = {
        "loaded_fact_count": fact_count,
        "dimension_counts": dim_counts,
        "staged_fact_count": len(fact_tuples)
    }

    return load_stats
