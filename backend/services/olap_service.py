import os
import sys
import re
import pandas as pd
from typing import Dict, Any, List, Optional

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from database import execute_query, get_schema_for_dataset
from services.cache_service import GLOBAL_CACHE

def build_from_join(dataset: str = "real") -> str:
    schema = get_schema_for_dataset(dataset)
    return f"""
        FROM {schema}.fact_crime f
        JOIN {schema}.dim_time t ON f.time_key = t.time_key
        JOIN {schema}.dim_area a ON f.area_key = a.area_key
        JOIN {schema}.dim_location l ON f.location_key = l.location_key
        JOIN {schema}.dim_crime c ON f.crime_key = c.crime_key
        JOIN {schema}.dim_premise p ON f.premise_key = p.premise_key
        JOIN {schema}.dim_status s ON f.status_key = s.status_key
    """

# Whitelisted Dimensions and Mapping to SQL Expressions
ALLOWED_DIMENSIONS = {
    "year": {
        "expr": "t.year",
        "label": "Year",
        "dim_table": "dim_time",
        "order": "t.year ASC",
        "hierarchy": "time",
        "parent": None,
        "child": "month"
    },
    "quarter": {
        "expr": "t.quarter",
        "label": "Quarter",
        "dim_table": "dim_time",
        "order": "t.quarter ASC",
        "hierarchy": "time",
        "parent": "year",
        "child": "month"
    },
    "month": {
        "expr": "t.month",
        "label": "Month",
        "dim_table": "dim_time",
        "order": "t.month ASC",
        "hierarchy": "time",
        "parent": "year",
        "child": "day"
    },
    "month_name": {
        "expr": "t.month_name",
        "label": "Month Name",
        "dim_table": "dim_time",
        "order": "MIN(t.month) ASC",
        "hierarchy": "time",
        "parent": "year",
        "child": "day"
    },
    "day": {
        "expr": "t.day",
        "label": "Day of Month",
        "dim_table": "dim_time",
        "order": "t.day ASC",
        "hierarchy": "time",
        "parent": "month",
        "child": "hour"
    },
    "day_name": {
        "expr": "t.day_name",
        "label": "Day of Week",
        "dim_table": "dim_time",
        "order": "MIN(t.day_of_week) ASC",
        "hierarchy": "time",
        "parent": None,
        "child": "hour"
    },
    "hour": {
        "expr": "t.hour",
        "label": "Hour of Day",
        "dim_table": "dim_time",
        "order": "t.hour ASC",
        "hierarchy": "time",
        "parent": "day",
        "child": None
    },
    "time_period": {
        "expr": "t.time_period",
        "label": "Time Period",
        "dim_table": "dim_time",
        "order": "t.time_period ASC",
        "hierarchy": "time",
        "parent": None,
        "child": None
    },
    "district": {
        "expr": "a.district",
        "label": "Police District",
        "dim_table": "dim_area",
        "order": "a.district ASC",
        "hierarchy": "area",
        "parent": None,
        "child": "ward"
    },
    "community_area": {
        "expr": "a.community_area",
        "label": "Community Area",
        "dim_table": "dim_area",
        "order": "a.community_area ASC",
        "hierarchy": "area",
        "parent": "district",
        "child": None
    },
    "ward": {
        "expr": "a.ward",
        "label": "Ward",
        "dim_table": "dim_area",
        "order": "a.ward ASC",
        "hierarchy": "area",
        "parent": "district",
        "child": None
    },
    "primary_type": {
        "expr": "c.primary_type",
        "label": "Crime Category",
        "dim_table": "dim_crime",
        "order": "SUM(f.crime_count) DESC",
        "hierarchy": "crime",
        "parent": None,
        "child": "description"
    },
    "description": {
        "expr": "c.description",
        "label": "Offense Description",
        "dim_table": "dim_crime",
        "order": "SUM(f.crime_count) DESC",
        "hierarchy": "crime",
        "parent": "primary_type",
        "child": "iucr"
    },
    "iucr": {
        "expr": "c.iucr",
        "label": "IUCR Code",
        "dim_table": "dim_crime",
        "order": "c.iucr ASC",
        "hierarchy": "crime",
        "parent": "description",
        "child": None
    },
    "location_description": {
        "expr": "p.location_description",
        "label": "Premise Location",
        "dim_table": "dim_premise",
        "order": "SUM(f.crime_count) DESC",
        "hierarchy": "premise",
        "parent": None,
        "child": None
    },
    "arrest": {
        "expr": "CASE WHEN s.arrest = TRUE THEN 'Arrest Made' ELSE 'No Arrest' END",
        "label": "Arrest Status",
        "dim_table": "dim_status",
        "order": "status_label ASC",
        "hierarchy": "status",
        "parent": None,
        "child": None
    },
    "domestic": {
        "expr": "CASE WHEN s.domestic = TRUE THEN 'Domestic' ELSE 'Non-Domestic' END",
        "label": "Domestic Incident",
        "dim_table": "dim_status",
        "order": "status_label ASC",
        "hierarchy": "status",
        "parent": None,
        "child": None
    }
}

BASE_FROM_JOIN = """
    FROM fact_crime f
    JOIN dim_time t ON f.time_key = t.time_key
    JOIN dim_area a ON f.area_key = a.area_key
    JOIN dim_location l ON f.location_key = l.location_key
    JOIN dim_crime c ON f.crime_key = c.crime_key
    JOIN dim_premise p ON f.premise_key = p.premise_key
    JOIN dim_status s ON f.status_key = s.status_key
"""

def build_olap_where_clause(filters: Dict[str, Any]) -> tuple:
    """
    Constructs parameterized WHERE SQL clause and parameter dict for Slice & Dice filtering.
    """
    where_parts = []
    params = {}

    if not filters:
        return "", {}

    for key, val in filters.items():
        if val is None or val == "" or (isinstance(val, list) and len(val) == 0):
            continue

        if key == "year":
            if isinstance(val, list):
                where_parts.append(f"t.year IN ({','.join([f':year_{i}' for i in range(len(val))])})")
                for i, v in enumerate(val):
                    params[f"year_{i}"] = int(v)
            else:
                where_parts.append("t.year = :year")
                params["year"] = int(val)

        elif key == "quarter":
            if isinstance(val, list):
                where_parts.append(f"t.quarter IN ({','.join([f':quarter_{i}' for i in range(len(val))])})")
                for i, v in enumerate(val):
                    params[f"quarter_{i}"] = int(v)
            else:
                where_parts.append("t.quarter = :quarter")
                params["quarter"] = int(val)

        elif key == "month":
            if isinstance(val, list):
                where_parts.append(f"t.month IN ({','.join([f':month_{i}' for i in range(len(val))])})")
                for i, v in enumerate(val):
                    params[f"month_{i}"] = int(v)
            else:
                where_parts.append("t.month = :month")
                params["month"] = int(val)

        elif key == "day":
            if isinstance(val, list):
                where_parts.append(f"t.day IN ({','.join([f':day_{i}' for i in range(len(val))])})")
                for i, v in enumerate(val):
                    params[f"day_{i}"] = int(v)
            else:
                where_parts.append("t.day = :day")
                params["day"] = int(val)

        elif key == "day_name":
            if isinstance(val, list):
                where_parts.append(f"t.day_name IN ({','.join([f':day_name_{i}' for i in range(len(val))])})")
                for i, v in enumerate(val):
                    params[f"day_name_{i}"] = str(v)
            else:
                where_parts.append("t.day_name = :day_name")
                params["day_name"] = str(val)

        elif key == "hour":
            if isinstance(val, list):
                where_parts.append(f"t.hour IN ({','.join([f':hour_{i}' for i in range(len(val))])})")
                for i, v in enumerate(val):
                    params[f"hour_{i}"] = int(v)
            else:
                where_parts.append("t.hour = :hour")
                params["hour"] = int(val)

        elif key == "time_period":
            if isinstance(val, list):
                where_parts.append(f"t.time_period IN ({','.join([f':time_period_{i}' for i in range(len(val))])})")
                for i, v in enumerate(val):
                    params[f"time_period_{i}"] = str(v)
            else:
                where_parts.append("t.time_period = :time_period")
                params["time_period"] = str(val)

        elif key == "district":
            if isinstance(val, list):
                where_parts.append(f"a.district IN ({','.join([f':district_{i}' for i in range(len(val))])})")
                for i, v in enumerate(val):
                    params[f"district_{i}"] = str(v)
            else:
                where_parts.append("a.district = :district")
                params["district"] = str(val)

        elif key == "ward":
            if isinstance(val, list):
                where_parts.append(f"a.ward IN ({','.join([f':ward_{i}' for i in range(len(val))])})")
                for i, v in enumerate(val):
                    params[f"ward_{i}"] = str(v)
            else:
                where_parts.append("a.ward = :ward")
                params["ward"] = str(val)

        elif key == "community_area":
            if isinstance(val, list):
                where_parts.append(f"a.community_area IN ({','.join([f':community_area_{i}' for i in range(len(val))])})")
                for i, v in enumerate(val):
                    params[f"community_area_{i}"] = str(v)
            else:
                where_parts.append("a.community_area = :community_area")
                params["community_area"] = str(val)

        elif key == "primary_type":
            if isinstance(val, list):
                where_parts.append(f"c.primary_type IN ({','.join([f':primary_type_{i}' for i in range(len(val))])})")
                for i, v in enumerate(val):
                    params[f"primary_type_{i}"] = str(v)
            else:
                where_parts.append("c.primary_type = :primary_type")
                params["primary_type"] = str(val)

        elif key == "location_description":
            if isinstance(val, list):
                where_parts.append(f"p.location_description IN ({','.join([f':loc_desc_{i}' for i in range(len(val))])})")
                for i, v in enumerate(val):
                    params[f"loc_desc_{i}"] = str(v)
            else:
                where_parts.append("p.location_description = :location_description")
                params["location_description"] = str(val)

        elif key == "arrest":
            if isinstance(val, bool):
                where_parts.append("s.arrest = :arrest")
                params["arrest"] = val
            elif str(val).lower() in ["true", "false"]:
                where_parts.append("s.arrest = :arrest")
                params["arrest"] = (str(val).lower() == "true")

        elif key == "domestic":
            if isinstance(val, bool):
                where_parts.append("s.domestic = :domestic")
                params["domestic"] = val
            elif str(val).lower() in ["true", "false"]:
                where_parts.append("s.domestic = :domestic")
                params["domestic"] = (str(val).lower() == "true")

    where_sql = (" WHERE " + " AND ".join(where_parts)) if where_parts else ""
    return where_sql, params


def get_rollup_drilldown(
    dimension: str,
    filters: Optional[Dict[str, Any]] = None,
    limit: int = 100,
    dataset: str = "real"
) -> Dict[str, Any]:
    """
    Executes a Roll-Up or Drill-Down query on a selected dimension hierarchy.
    Returns aggregated incident metrics, proportions, and query explanation metadata.
    """
    cache_params = {"dimension": dimension, "filters": filters or {}, "limit": limit}
    cached = GLOBAL_CACHE.get("olap_rollup", dataset, cache_params)
    if cached is not None:
        return cached

    if dimension not in ALLOWED_DIMENSIONS:
        dimension = "month"

    dim_info = ALLOWED_DIMENSIONS[dimension]
    expr = dim_info["expr"]
    label = dim_info["label"]
    order_clause = dim_info["order"]

    where_sql, params = build_olap_where_clause(filters or {})
    params["limit"] = limit

    # Alias handling for STATUS or CASE expressions in SELECT
    alias_name = "dimension_value"
    if dimension in ["arrest", "domestic"]:
        select_expr = f"{expr} AS status_label"
        alias_name = "status_label"
        group_expr = expr
    else:
        select_expr = f"{expr} AS dimension_value"
        group_expr = expr

    from_join = build_from_join(dataset)
    sql = f"""
        SELECT 
            {select_expr},
            SUM(f.crime_count) AS incident_count,
            SUM(CASE WHEN s.arrest = TRUE THEN f.crime_count ELSE 0 END) AS arrest_count,
            SUM(CASE WHEN s.domestic = TRUE THEN f.crime_count ELSE 0 END) AS domestic_count,
            SUM(SUM(f.crime_count)) OVER() AS full_subset_total
        {from_join}
        {where_sql}
        GROUP BY {group_expr}
        ORDER BY {order_clause}
        LIMIT :limit;
    """

    df = execute_query(sql, params)

    if df.empty:
        records = []
        total_view = 0
    else:
        full_total = int(df['full_subset_total'].iloc[0]) if ('full_subset_total' in df.columns and len(df) > 0) else int(df['incident_count'].sum())
        total_view = full_total
        records = []
        for _, row in df.iterrows():
            val = row[alias_name]
            inc = int(row['incident_count'])
            arr = int(row['arrest_count'])
            dom = int(row['domestic_count'])
            pct = round((inc / total_view * 100), 2) if total_view > 0 else 0.0
            arr_rate = round((arr / inc * 100), 2) if inc > 0 else 0.0
            dom_rate = round((dom / inc * 100), 2) if inc > 0 else 0.0

            records.append({
                "dimension_value": str(val) if pd.notna(val) else "UNKNOWN",
                "incident_count": inc,
                "percentage": pct,
                "arrest_count": arr,
                "arrest_rate": arr_rate,
                "domestic_count": dom,
                "domestic_rate": dom_rate
            })

    # Educational Query Explanation
    operation_type = "DRILL_DOWN" if (filters and len(filters) > 0) else "ROLL_UP"
    explanation = {
        "operation": operation_type,
        "title": f"OLAP {operation_type.replace('_', '-')} on {label}",
        "concept_description": (
            f"Roll-Up aggregates crime metrics to higher visual granularity (e.g. Year/Month), "
            f"whereas Drill-Down navigates deeper into granular detail (e.g. Month → Day → Hour) "
            f"using SQL GROUP BY on dimension keys."
        ),
        "target_dimension": label,
        "dimension_key": dimension,
        "sql_operation": f"SELECT {expr}, SUM(crime_count) FROM fact_crime ... GROUP BY {expr}",
        "sql_query_preview": clean_sql_preview(sql, params),
        "active_filters": filters or {},
        "records_returned": len(records),
        "total_incidents_in_view": total_view
    }

    result = {
        "dimension": dimension,
        "dimension_label": label,
        "parent_dimension": dim_info.get("parent"),
        "child_dimension": dim_info.get("child"),
        "total_incidents": total_view,
        "records": records,
        "explanation": explanation
    }
    GLOBAL_CACHE.set("olap_rollup", dataset, result, cache_params, ttl=300)
    return result


def get_pivot_matrix(
    row_dim: str,
    col_dim: str,
    filters: Optional[Dict[str, Any]] = None,
    limit: int = 25,
    dataset: str = "real"
) -> Dict[str, Any]:
    """
    Executes an OLAP Pivot operation cross-tabulating row_dim vs. col_dim.
    Returns structured matrix, row totals, column totals, and grand total.
    """
    cache_params = {"row_dim": row_dim, "col_dim": col_dim, "filters": filters or {}, "limit": limit}
    cached = GLOBAL_CACHE.get("olap_pivot", dataset, cache_params)
    if cached is not None:
        return cached

    if row_dim not in ALLOWED_DIMENSIONS:
        row_dim = "district"
    if col_dim not in ALLOWED_DIMENSIONS or col_dim == row_dim:
        col_dim = "primary_type"

    row_info = ALLOWED_DIMENSIONS[row_dim]
    col_info = ALLOWED_DIMENSIONS[col_dim]

    where_sql, params = build_olap_where_clause(filters or {})
    params["limit"] = limit * 20

    row_expr = row_info["expr"]
    col_expr = col_info["expr"]
    from_join = build_from_join(dataset)

    sql = f"""
        SELECT 
            {row_expr} AS row_val,
            {col_expr} AS col_val,
            SUM(f.crime_count) AS incident_count
        {from_join}
        {where_sql}
        GROUP BY {row_expr}, {col_expr}
        ORDER BY incident_count DESC
        LIMIT :limit;
    """

    df = execute_query(sql, params)

    if df.empty:
        return {
            "row_dim": row_dim,
            "row_label": row_info["label"],
            "col_dim": col_dim,
            "col_label": col_info["label"],
            "rows": [],
            "columns": [],
            "matrix": {},
            "row_totals": {},
            "col_totals": {},
            "grand_total": 0,
            "explanation": {}
        }

    # Clean missing values
    df['row_val'] = df['row_val'].fillna("UNKNOWN").astype(str)
    df['col_val'] = df['col_val'].fillna("UNKNOWN").astype(str)

    # Determine top rows & columns by volume
    top_rows = df.groupby('row_val')['incident_count'].sum().nlargest(limit).index.tolist()
    top_cols = df.groupby('col_val')['incident_count'].sum().nlargest(15).index.tolist()

    df_filtered = df[df['row_val'].isin(top_rows) & df['col_val'].isin(top_cols)]

    # Pivot DataFrame
    pivot_df = df_filtered.pivot_table(
        index='row_val',
        columns='col_val',
        values='incident_count',
        aggfunc='sum',
        fill_value=0
    )

    # Ensure all top rows and cols exist in matrix
    pivot_df = pivot_df.reindex(index=top_rows, columns=top_cols, fill_value=0)

    # Compute Row Totals, Col Totals, and Grand Total
    row_totals = pivot_df.sum(axis=1).to_dict()
    col_totals = pivot_df.sum(axis=0).to_dict()
    grand_total = int(pivot_df.values.sum())

    # Format Matrix dict
    matrix_dict = {}
    for r in top_rows:
        matrix_dict[r] = {}
        for c in top_cols:
            matrix_dict[r][c] = int(pivot_df.loc[r, c]) if (r in pivot_df.index and c in pivot_df.columns) else 0

    explanation = {
        "operation": "PIVOT",
        "title": f"OLAP Pivot Matrix ({row_info['label']} × {col_info['label']})",
        "concept_description": (
            f"Pivot rotates data axes to display multi-dimensional summaries in a 2D cross-tabulation grid. "
            f"Rows depict '{row_info['label']}' and Columns depict '{col_info['label']}' with SUM(crime_count)."
        ),
        "target_dimension": f"{row_info['label']} vs {col_info['label']}",
        "sql_operation": f"SELECT {row_expr}, {col_expr}, SUM(crime_count) GROUP BY {row_expr}, {col_expr}",
        "sql_query_preview": clean_sql_preview(sql, params),
        "active_filters": filters or {},
        "matrix_shape": f"{len(top_rows)} Rows × {len(top_cols)} Columns",
        "grand_total": grand_total
    }

    result = {
        "row_dim": row_dim,
        "row_label": row_info["label"],
        "col_dim": col_dim,
        "col_label": col_info["label"],
        "rows": [str(r) for r in top_rows],
        "columns": [str(c) for c in top_cols],
        "matrix": matrix_dict,
        "row_totals": {str(k): int(v) for k, v in row_totals.items()},
        "col_totals": {str(k): int(v) for k, v in col_totals.items()},
        "grand_total": grand_total,
        "explanation": explanation
    }
    GLOBAL_CACHE.set("olap_pivot", dataset, result, cache_params, ttl=300)
    return result


def get_olap_metadata(dataset: str = "real") -> Dict[str, Any]:
    """
    Returns available dimensions, hierarchies, and filter choices populated from PostgreSQL.
    """
    schema = get_schema_for_dataset(dataset)
    df_years = execute_query(f"SELECT DISTINCT year FROM {schema}.dim_time WHERE year > 1970 ORDER BY year ASC;")
    df_districts = execute_query(f"SELECT DISTINCT district FROM {schema}.dim_area WHERE district != 'UNKNOWN' ORDER BY district ASC;")
    df_categories = execute_query(f"SELECT DISTINCT primary_type FROM {schema}.dim_crime WHERE primary_type != 'UNKNOWN_CRIME' ORDER BY primary_type ASC;")
    df_premises = execute_query(f"SELECT DISTINCT location_description FROM {schema}.dim_premise WHERE location_description != 'UNKNOWN' ORDER BY location_description ASC LIMIT 30;")
    df_periods = execute_query(f"SELECT DISTINCT time_period FROM {schema}.dim_time WHERE time_period != 'UNKNOWN' ORDER BY time_period ASC;")

    dimensions_list = [
        {"key": k, "label": v["label"], "hierarchy": v["hierarchy"]}
        for k, v in ALLOWED_DIMENSIONS.items()
    ]

    df_total_facts = execute_query(f"SELECT COUNT(*) AS cnt FROM {schema}.fact_crime;")
    total_facts = int(df_total_facts['cnt'].iloc[0]) if not df_total_facts.empty else 0

    scope_title = "Synthetic Demo Dataset (30,000 Records)" if schema == "synthetic_data" else "Official Chicago Data Warehouse (49,981 Records)"

    return {
        "dataset_scope": {
            "title": scope_title,
            "total_fact_records": total_facts,
            "schema_used": schema
        },
        "dimensions": dimensions_list,
        "hierarchies": {
            "time": ["year", "quarter", "month", "day", "hour"],
            "area": ["district", "ward", "community_area"],
            "crime": ["primary_type", "description", "iucr"],
            "premise": ["location_description"],
            "status": ["arrest", "domestic"]
        },
        "filter_options": {
            "years": df_years['year'].tolist() if not df_years.empty else [2023, 2024],
            "quarters": [1, 2, 3, 4],
            "months": [
                {"value": 1, "label": "January"},
                {"value": 2, "label": "February"},
                {"value": 3, "label": "March"},
                {"value": 4, "label": "April"},
                {"value": 5, "label": "May"},
                {"value": 6, "label": "June"},
                {"value": 7, "label": "July"},
                {"value": 8, "label": "August"},
                {"value": 9, "label": "September"},
                {"value": 10, "label": "October"},
                {"value": 11, "label": "November"},
                {"value": 12, "label": "December"}
            ],
            "districts": df_districts['district'].tolist() if not df_districts.empty else [],
            "categories": df_categories['primary_type'].tolist() if not df_categories.empty else [],
            "premises": df_premises['location_description'].tolist() if not df_premises.empty else [],
            "time_periods": df_periods['time_period'].tolist() if not df_periods.empty else []
        }
    }


def clean_sql_preview(sql_str: str, params: Dict[str, Any]) -> str:
    """
    Formats SQL string into a clean read-only preview with parameter values inline for display.
    """
    clean_sql = re.sub(r'\s+', ' ', sql_str).strip()
    for k, v in params.items():
        val_str = f"'{v}'" if isinstance(v, str) else str(v)
        clean_sql = clean_sql.replace(f":{k}", val_str)
    return clean_sql
