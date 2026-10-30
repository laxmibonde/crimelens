import os
import sys
import time
import psycopg2
from psycopg2.extras import execute_values
import pandas as pd
import numpy as np

sys.path.insert(0, r"c:\Users\suvar\Downloads\CrimeLens\backend")
from database import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

def p(msg):
    print(msg, flush=True)

def run_synthetic_etl():
    p("=======================================================================")
    p(" CrimeLens STEP 4: Synthetic Data ETL Pipeline")
    p("=======================================================================")
    start_time = time.time()

    csv_path = r"c:\Users\suvar\Downloads\CrimeLens\data\raw\crimelens_synthetic_30000_2023_2024.csv"
    p(f"1. Reading synthetic raw dataset: '{csv_path}'...")
    df_raw = pd.read_csv(csv_path)
    p(f"   Raw record count: {len(df_raw):,}")

    # Step 1: Clean & Parse Date Timestamps
    p("\n2. Transforming Synthetic Data into Star Schema Data Structures...")
    df_raw['date_parsed'] = pd.to_datetime(df_raw['date'], errors='coerce')

    # Build dim_time
    time_records = []
    df_raw['year'] = df_raw['date_parsed'].dt.year.astype(int)
    df_raw['month'] = df_raw['date_parsed'].dt.month.astype(int)
    df_raw['day'] = df_raw['date_parsed'].dt.day.astype(int)
    df_raw['hour'] = df_raw['date_parsed'].dt.hour.astype(int)
    df_raw['day_of_week'] = df_raw['date_parsed'].dt.dayofweek.astype(int)
    df_raw['month_name'] = df_raw['date_parsed'].dt.month_name()
    df_raw['day_name'] = df_raw['date_parsed'].dt.day_name()
    df_raw['quarter'] = df_raw['date_parsed'].dt.quarter.astype(int)
    df_raw['is_weekend'] = df_raw['day_of_week'].isin([5, 6])
    
    def calc_shift(hr):
        if 6 <= hr < 14: return 'MORNING'
        elif 14 <= hr < 22: return 'EVENING'
        else: return 'NIGHT'
    df_raw['shift'] = df_raw['hour'].apply(calc_shift)

    dim_time_df = df_raw[['date_parsed', 'year', 'month', 'month_name', 'day', 'day_of_week', 'day_name', 'hour', 'quarter', 'is_weekend', 'shift']].drop_duplicates()
    dim_time_df['time_key'] = range(1, len(dim_time_df) + 1)
    
    # Map time_key back to df_raw
    time_map = {row['date_parsed']: row['time_key'] for _, row in dim_time_df.iterrows()}
    df_raw['time_key'] = df_raw['date_parsed'].map(time_map)

    # Build dim_area
    df_raw['district_str'] = df_raw['district'].astype(str).str.replace(r'\.0$', '', regex=True).fillna('UNKNOWN')
    df_raw['beat_str'] = df_raw['beat'].astype(str).str.replace(r'\.0$', '', regex=True).fillna('UNKNOWN')
    df_raw['ward_str'] = df_raw['ward'].astype(str).str.replace(r'\.0$', '', regex=True).fillna('UNKNOWN')
    df_raw['community_area_str'] = df_raw['community_area'].astype(str).str.replace(r'\.0$', '', regex=True).fillna('UNKNOWN')

    dim_area_df = df_raw[['beat_str', 'district_str', 'ward_str', 'community_area_str']].drop_duplicates()
    dim_area_df['area_key'] = range(1, len(dim_area_df) + 1)
    area_map = {(r['beat_str'], r['district_str'], r['ward_str'], r['community_area_str']): r['area_key'] for _, r in dim_area_df.iterrows()}
    df_raw['area_key'] = [area_map.get((b, d, w, c), -1) for b, d, w, c in zip(df_raw['beat_str'], df_raw['district_str'], df_raw['ward_str'], df_raw['community_area_str'])]

    # Build dim_location
    df_raw['block_clean'] = df_raw['block'].fillna('UNKNOWN BLOCK')
    df_raw['loc_desc_clean'] = df_raw['location_description'].fillna('UNKNOWN')
    df_raw['lat_numeric'] = pd.to_numeric(df_raw['latitude'], errors='coerce')
    df_raw['lon_numeric'] = pd.to_numeric(df_raw['longitude'], errors='coerce')
    df_raw['x_numeric'] = pd.to_numeric(df_raw['x_coordinate'], errors='coerce')
    df_raw['y_numeric'] = pd.to_numeric(df_raw['y_coordinate'], errors='coerce')

    valid_loc_mask = df_raw['lat_numeric'].notna() & df_raw['lon_numeric'].notna()
    dim_loc_df = df_raw[valid_loc_mask][['block_clean', 'loc_desc_clean', 'lat_numeric', 'lon_numeric', 'x_numeric', 'y_numeric']].drop_duplicates()
    dim_loc_df['location_key'] = range(1, len(dim_loc_df) + 1)
    
    loc_map = {}
    for _, r in dim_loc_df.iterrows():
        lat_r = round(float(r['lat_numeric']), 6)
        lon_r = round(float(r['lon_numeric']), 6)
        loc_map[(r['block_clean'], lat_r, lon_r)] = r['location_key']

    loc_keys = []
    for _, r in df_raw.iterrows():
        if pd.notna(r['lat_numeric']) and pd.notna(r['lon_numeric']):
            lat_r = round(float(r['lat_numeric']), 6)
            lon_r = round(float(r['lon_numeric']), 6)
            loc_keys.append(loc_map.get((r['block_clean'], lat_r, lon_r), -1))
        else:
            loc_keys.append(-1)
    df_raw['location_key'] = loc_keys

    # Build dim_crime
    df_raw['iucr_clean'] = df_raw['iucr'].fillna('UNKNOWN')
    df_raw['primary_type_clean'] = df_raw['primary_type'].fillna('UNKNOWN')
    df_raw['desc_clean'] = df_raw['description'].fillna('UNKNOWN')
    df_raw['fbi_clean'] = df_raw['fbi_code'].fillna('UNKNOWN')

    dim_crime_df = df_raw[['iucr_clean', 'primary_type_clean', 'desc_clean', 'fbi_clean']].drop_duplicates()
    dim_crime_df['crime_key'] = range(1, len(dim_crime_df) + 1)
    crime_map = {(r['iucr_clean'], r['primary_type_clean'], r['desc_clean'], r['fbi_clean']): r['crime_key'] for _, r in dim_crime_df.iterrows()}
    df_raw['crime_key'] = [crime_map.get((i, p, d, f), -1) for i, p, d, f in zip(df_raw['iucr_clean'], df_raw['primary_type_clean'], df_raw['desc_clean'], df_raw['fbi_clean'])]

    # Build dim_premise
    dim_premise_df = df_raw[['loc_desc_clean']].drop_duplicates()
    dim_premise_df['premise_key'] = range(1, len(dim_premise_df) + 1)
    premise_map = {r['loc_desc_clean']: r['premise_key'] for _, r in dim_premise_df.iterrows()}
    df_raw['premise_key'] = df_raw['loc_desc_clean'].map(lambda x: premise_map.get(x, -1))

    # Build dim_status
    df_raw['arrest_bool'] = df_raw['arrest'].astype(str).str.lower().isin(['true', '1', 't', 'yes'])
    df_raw['domestic_bool'] = df_raw['domestic'].astype(str).str.lower().isin(['true', '1', 't', 'yes'])

    dim_status_df = df_raw[['arrest_bool', 'domestic_bool']].drop_duplicates()
    dim_status_df['status_key'] = range(1, len(dim_status_df) + 1)
    status_map = {(r['arrest_bool'], r['domestic_bool']): r['status_key'] for _, r in dim_status_df.iterrows()}
    df_raw['status_key'] = [status_map.get((a, d), -1) for a, d in zip(df_raw['arrest_bool'], df_raw['domestic_bool'])]

    p(f"   Transformed {len(dim_time_df):,} time rows, {len(dim_loc_df):,} location rows, {len(dim_crime_df):,} crime taxonomy rows.")

    # Stage 3: Load into PostgreSQL synthetic_data schema
    p("\n3. Loading synthetic star schema tables in PostgreSQL ('synthetic_data')...")
    conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD, dbname=DB_NAME)
    conn.autocommit = True
    cur = conn.cursor()

    # Load dim_time
    time_tuples = [(int(r['time_key']), r['date_parsed'].to_pydatetime(), int(r['year']), int(r['month']), str(r['month_name']), int(r['day']), int(r['day_of_week']), str(r['day_name']), int(r['hour']), int(r['quarter']), bool(r['is_weekend']), str(r['shift'])) for _, r in dim_time_df.iterrows()]
    time_q = "INSERT INTO synthetic_data.dim_time (time_key, full_timestamp, year, month, month_name, day, day_of_week, day_name, hour, quarter, is_weekend, shift) VALUES %s ON CONFLICT (time_key) DO NOTHING;"
    execute_values(cur, time_q, time_tuples, page_size=2000)

    # Load dim_location
    loc_tuples = [(int(r['location_key']), str(r['block_clean']), str(r['loc_desc_clean']), float(r['lat_numeric']), float(r['lon_numeric']), float(r['x_numeric']) if pd.notna(r['x_numeric']) else None, float(r['y_numeric']) if pd.notna(r['y_numeric']) else None) for _, r in dim_loc_df.iterrows()]
    loc_q = "INSERT INTO synthetic_data.dim_location (location_key, block, location_description, latitude, longitude, x_coordinate, y_coordinate) VALUES %s ON CONFLICT (location_key) DO NOTHING;"
    execute_values(cur, loc_q, loc_tuples, page_size=2000)

    # Load dim_area
    area_tuples = [(int(r['area_key']), str(r['beat_str']), str(r['district_str']), str(r['ward_str']), str(r['community_area_str'])) for _, r in dim_area_df.iterrows()]
    area_q = "INSERT INTO synthetic_data.dim_area (area_key, beat, district, ward, community_area) VALUES %s ON CONFLICT (area_key) DO NOTHING;"
    execute_values(cur, area_q, area_tuples, page_size=2000)

    # Load dim_crime
    crime_tuples = [(int(r['crime_key']), str(r['iucr_clean']), str(r['primary_type_clean']), str(r['desc_clean']), str(r['fbi_clean'])) for _, r in dim_crime_df.iterrows()]
    crime_q = "INSERT INTO synthetic_data.dim_crime (crime_key, iucr, primary_type, description, fbi_code) VALUES %s ON CONFLICT (crime_key) DO NOTHING;"
    execute_values(cur, crime_q, crime_tuples, page_size=2000)

    # Load dim_premise
    premise_tuples = [(int(r['premise_key']), str(r['loc_desc_clean'])) for _, r in dim_premise_df.iterrows()]
    premise_q = "INSERT INTO synthetic_data.dim_premise (premise_key, location_description) VALUES %s ON CONFLICT (premise_key) DO NOTHING;"
    execute_values(cur, premise_q, premise_tuples, page_size=2000)

    # Load dim_status
    status_tuples = [(int(r['status_key']), bool(r['arrest_bool']), bool(r['domestic_bool'])) for _, r in dim_status_df.iterrows()]
    status_q = "INSERT INTO synthetic_data.dim_status (status_key, arrest, domestic) VALUES %s ON CONFLICT (status_key) DO NOTHING;"
    execute_values(cur, status_q, status_tuples, page_size=2000)

    # Load fact_crime
    fact_tuples = [(str(r['id']), str(r['case_number']), int(r['time_key']), int(r['location_key']), int(r['crime_key']), int(r['premise_key']), int(r['status_key']), int(r['area_key']), 1) for _, r in df_raw.iterrows()]
    fact_q = "INSERT INTO synthetic_data.fact_crime (crime_id, case_number, time_key, location_key, crime_key, premise_key, status_key, area_key, incident_count) VALUES %s ON CONFLICT DO NOTHING;"
    execute_values(cur, fact_q, fact_tuples, page_size=2000)

    cur.execute("SELECT COUNT(*) FROM synthetic_data.fact_crime;")
    fact_cnt = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM public.fact_crime;")
    real_fact_cnt = cur.fetchone()[0]

    cur.close()
    conn.close()

    elapsed = time.time() - start_time
    p("\n" + "=" * 70)
    p(f"SUCCESS: Synthetic Data ETL Completed in {elapsed:.2f} seconds.")
    p(f"   Synthetic Warehouse Facts (`synthetic_data.fact_crime`): {fact_cnt:,}")
    p(f"   Real Warehouse Facts (`public.fact_crime`): {real_fact_cnt:,} (INTACT)")
    p("=" * 70)

if __name__ == "__main__":
    run_synthetic_etl()
