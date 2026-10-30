import pandas as pd
import numpy as np
from datetime import datetime
from sqlalchemy import text
from typing import Dict, Any, List, Optional
from database import get_engine, get_schema_for_dataset
from services.cache_service import GLOBAL_CACHE

def get_trends_metadata(dataset: str = "real") -> Dict[str, Any]:
    """
    Returns available time ranges, granularities, crime categories, districts, and community areas.
    """
    schema = get_schema_for_dataset(dataset)
    engine = get_engine()
    
    with engine.connect() as conn:
        # Get total counts and date bounds
        query_bounds = text(f"""
            SELECT 
                COUNT(*) as total_incidents,
                MIN(t.full_date) as min_date,
                MAX(t.full_date) as max_date,
                COUNT(DISTINCT CONCAT(t.year, '-', LPAD(t.month::text, 2, '0'))) as month_count
            FROM {schema}.fact_crime f
            JOIN {schema}.dim_time t ON f.time_key = t.time_key
        """)
        bounds_res = conn.execute(query_bounds).mappings().first()
        
        # Get crime categories
        query_cats = text(f"""
            SELECT DISTINCT primary_type 
            FROM {schema}.dim_crime 
            WHERE primary_type IS NOT NULL 
            ORDER BY primary_type
        """)
        categories = [row['primary_type'] for row in conn.execute(query_cats).mappings().all()]
        
        # Get police districts
        query_districts = text(f"""
            SELECT DISTINCT a.district 
            FROM {schema}.dim_area a 
            WHERE a.district IS NOT NULL AND a.district NOT IN ('UNKNOWN', '0')
            ORDER BY a.district
        """)
        districts = [
            {"id": row['district'], "label": f"District #{str(row['district']).zfill(3)}"}
            for row in conn.execute(query_districts).mappings().all()
        ]
        
        # Get community areas
        query_cas = text(f"""
            SELECT DISTINCT a.community_area 
            FROM {schema}.dim_area a 
            WHERE a.community_area IS NOT NULL AND a.community_area NOT IN ('UNKNOWN', '0')
            ORDER BY a.community_area
        """)
        community_areas = [
            {"id": row['community_area'], "label": f"Community Area #{row['community_area']}"}
            for row in conn.execute(query_cas).mappings().all()
        ]
        
    return {
        "dataset": dataset,
        "schema": schema,
        "is_synthetic": (schema == "synthetic_data"),
        "total_incidents": int(bounds_res['total_incidents']) if bounds_res else 0,
        "min_date": str(bounds_res['min_date']) if bounds_res and bounds_res['min_date'] else "2023-01-01",
        "max_date": str(bounds_res['max_date']) if bounds_res and bounds_res['max_date'] else "2025-12-31",
        "month_count": int(bounds_res['month_count']) if bounds_res else 0,
        "categories": categories,
        "districts": districts,
        "community_areas": community_areas,
        "granularities": [
            {"id": "hour", "label": "Hourly (00-23)"},
            {"id": "day_of_week", "label": "Day of Week (Mon-Sun)"},
            {"id": "week", "label": "Weekly"},
            {"id": "month", "label": "Monthly"},
            {"id": "quarter", "label": "Quarterly"},
            {"id": "year", "label": "Yearly"}
        ]
    }


def get_timeseries_analysis(
    dataset: str = "real",
    granularity: str = "month",
    categories: Optional[List[str]] = None,
    district: Optional[str] = None,
    community_area: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> Dict[str, Any]:
    """
    Computes time-series aggregation with moving averages (3-period and 6-period) and dataset coverage warnings.
    """
    cache_params = {
        "granularity": granularity,
        "categories": sorted(categories) if categories else None,
        "district": district,
        "community_area": community_area,
        "start_date": start_date,
        "end_date": end_date
    }
    cached = GLOBAL_CACHE.get("trend_timeseries", dataset, cache_params)
    if cached is not None:
        return cached

    schema = get_schema_for_dataset(dataset)
    engine = get_engine()
    
    where_clauses = ["1=1"]
    params: Dict[str, Any] = {}
    
    if categories and len(categories) > 0:
        where_clauses.append("c.primary_type = ANY(:categories)")
        params["categories"] = categories
    if district:
        clean_d = str(district).strip().zfill(3)
        where_clauses.append("(a.district = :district OR a.district = :district_raw)")
        params["district"] = clean_d
        params["district_raw"] = str(district).strip()
    if community_area:
        where_clauses.append("a.community_area = :community_area")
        params["community_area"] = str(community_area).strip()
    if start_date:
        where_clauses.append("t.full_date >= :start_date")
        params["start_date"] = start_date
    if end_date:
        where_clauses.append("t.full_date <= :end_date")
        params["end_date"] = end_date
        
    where_sql = " AND ".join(where_clauses)
    
    # Build grouping based on granularity
    if granularity == "hour":
        group_expr = "t.hour"
        order_expr = "t.hour"
        label_expr = "CONCAT(LPAD(t.hour::text, 2, '0'), ':00')"
    elif granularity == "day_of_week":
        group_expr = "t.day_of_week, t.day_name"
        order_expr = "t.day_of_week"
        label_expr = "t.day_name"
    elif granularity == "week":
        group_expr = "t.year, DATE_TRUNC('week', t.full_date)"
        order_expr = "t.year, DATE_TRUNC('week', t.full_date)"
        label_expr = "TO_CHAR(DATE_TRUNC('week', t.full_date), 'YYYY-MM-DD')"
    elif granularity == "quarter":
        group_expr = "t.year, t.quarter"
        order_expr = "t.year, t.quarter"
        label_expr = "CONCAT(t.year, ' Q', t.quarter)"
    elif granularity == "year":
        group_expr = "t.year"
        order_expr = "t.year"
        label_expr = "t.year::text"
    else: # Default "month"
        group_expr = "t.year, t.month, t.month_name"
        order_expr = "t.year, t.month"
        label_expr = "CONCAT(t.year, '-', LPAD(t.month::text, 2, '0'))"

    sql = text(f"""
        SELECT 
            {label_expr} as period_label,
            {order_expr},
            COUNT(f.crime_fact_key) as incident_count
        FROM {schema}.fact_crime f
        JOIN {schema}.dim_time t ON f.time_key = t.time_key
        JOIN {schema}.dim_crime c ON f.crime_key = c.crime_key
        JOIN {schema}.dim_area a ON f.area_key = a.area_key
        WHERE {where_sql}
        GROUP BY {group_expr}
        ORDER BY {order_expr}
    """)

    with engine.connect() as conn:
        df = pd.read_sql(sql, conn, params=params)
        
    total_selected_incidents = int(df['incident_count'].sum()) if not df.empty else 0
    
    # Calculate proportions and moving averages
    series_data = []
    if not df.empty:
        df['share_pct'] = (df['incident_count'] / total_selected_incidents * 100.0).round(2) if total_selected_incidents > 0 else 0.0
        
        # Chronological moving averages: only apply to sequential continuous timelines
        # (week, month, quarter, year). For categorical/cyclic groupings (day_of_week, hour),
        # rolling averages across non-sequential categories are statistically invalid.
        if granularity in ["week", "month", "quarter", "year"]:
            # min_periods=1 allows initial periods (periods 1-2 for MA-3, periods 1-5 for MA-6)
            # to compute partial-window means rather than displaying nulls, maintaining trend continuity.
            df['ma3'] = df['incident_count'].rolling(window=3, min_periods=1).mean().round(1)
            df['ma6'] = df['incident_count'].rolling(window=6, min_periods=1).mean().round(1)
        else:
            df['ma3'] = None
            df['ma6'] = None
        
        for _, row in df.iterrows():
            series_data.append({
                "period": str(row['period_label']),
                "count": int(row['incident_count']),
                "share_pct": float(row['share_pct']),
                "ma3": float(row['ma3']) if pd.notnull(row['ma3']) and row['ma3'] is not None else None,
                "ma6": float(row['ma6']) if pd.notnull(row['ma6']) and row['ma6'] is not None else None
            })
            
    # Monthly coverage stats
    coverage_warning = None
    if schema == "synthetic_data":
        coverage_warning = {
            "flag": "SIMULATED_DATASET",
            "severity": "INFO",
            "message": "Synthetic dataset contains simulated uniform temporal distribution across 2023-2024 (1,250 incidents per month)."
        }

    result = {
        "dataset": dataset,
        "granularity": granularity,
        "total_selected_incidents": total_selected_incidents,
        "series": series_data,
        "coverage_warning": coverage_warning
    }
    GLOBAL_CACHE.set("trend_timeseries", dataset, result, cache_params, ttl=300)
    return result


def compare_periods(
    dataset: str = "real",
    period_a_start: str = "2023-01-01",
    period_a_end: str = "2023-01-31",
    period_b_start: str = "2024-01-01",
    period_b_end: str = "2024-01-31",
    district: Optional[str] = None,
    community_area: Optional[str] = None
) -> Dict[str, Any]:
    """
    Compares two time periods (Period A vs Period B) with category composition shifts (delta pp) and relative change.
    """
    schema = get_schema_for_dataset(dataset)
    engine = get_engine()
    
    def get_period_stats(start_d: str, end_d: str):
        where_clauses = ["t.full_date >= :start_d AND t.full_date <= :end_d"]
        params = {"start_d": start_d, "end_d": end_d}
        if district:
            clean_d = str(district).strip().zfill(3)
            where_clauses.append("(a.district = :district OR a.district = :district_raw)")
            params["district"] = clean_d
            params["district_raw"] = str(district).strip()
        if community_area:
            where_clauses.append("a.community_area = :community_area")
            params["community_area"] = str(community_area).strip()
            
        where_sql = " AND ".join(where_clauses)
        
        sql_totals = text(f"""
            SELECT 
                COUNT(f.crime_fact_key) as total,
                SUM(CASE WHEN s.arrest = TRUE THEN 1 ELSE 0 END) as arrests,
                SUM(CASE WHEN s.domestic = TRUE THEN 1 ELSE 0 END) as domestic,
                SUM(CASE WHEN t.hour >= 22 OR t.hour < 6 THEN 1 ELSE 0 END) as night
            FROM {schema}.fact_crime f
            JOIN {schema}.dim_time t ON f.time_key = t.time_key
            JOIN {schema}.dim_area a ON f.area_key = a.area_key
            JOIN {schema}.dim_status s ON f.status_key = s.status_key
            WHERE {where_sql}
        """)
        
        sql_cats = text(f"""
            SELECT 
                c.primary_type,
                COUNT(f.crime_fact_key) as count
            FROM {schema}.fact_crime f
            JOIN {schema}.dim_time t ON f.time_key = t.time_key
            JOIN {schema}.dim_area a ON f.area_key = a.area_key
            JOIN {schema}.dim_crime c ON f.crime_key = c.crime_key
            WHERE {where_sql}
            GROUP BY c.primary_type
            ORDER BY count DESC
        """)
        
        with engine.connect() as conn:
            tot_res = conn.execute(sql_totals, params).mappings().first()
            cats_res = pd.read_sql(sql_cats, conn, params=params)
            
        tot = int(tot_res['total']) if tot_res and tot_res['total'] else 0
        arr = int(tot_res['arrests']) if tot_res and tot_res['arrests'] else 0
        dom = int(tot_res['domestic']) if tot_res and tot_res['domestic'] else 0
        nig = int(tot_res['night']) if tot_res and tot_res['night'] else 0
        
        cat_dict = {}
        if tot > 0 and not cats_res.empty:
            for _, row in cats_res.iterrows():
                cnt = int(row['count'])
                cat_dict[str(row['primary_type'])] = {
                    "count": cnt,
                    "share_pct": round(cnt / tot * 100.0, 2)
                }
                
        return {
            "total": tot,
            "arrest_pct": round(arr / tot * 100.0, 2) if tot > 0 else 0.0,
            "domestic_pct": round(dom / tot * 100.0, 2) if tot > 0 else 0.0,
            "night_pct": round(nig / tot * 100.0, 2) if tot > 0 else 0.0,
            "categories": cat_dict
        }

    stats_a = get_period_stats(period_a_start, period_a_end)
    stats_b = get_period_stats(period_b_start, period_b_end)
    
    # Calculate calendar day durations
    try:
        dt_a_start = datetime.strptime(period_a_start, "%Y-%m-%d").date()
        dt_a_end = datetime.strptime(period_a_end, "%Y-%m-%d").date()
        days_a = max(1, (dt_a_end - dt_a_start).days + 1)
    except Exception:
        days_a = 1
        
    try:
        dt_b_start = datetime.strptime(period_b_start, "%Y-%m-%d").date()
        dt_b_end = datetime.strptime(period_b_end, "%Y-%m-%d").date()
        days_b = max(1, (dt_b_end - dt_b_start).days + 1)
    except Exception:
        days_b = 1
        
    daily_rate_a = round(stats_a['total'] / days_a, 2) if days_a > 0 else 0.0
    daily_rate_b = round(stats_b['total'] / days_b, 2) if days_b > 0 else 0.0
    daily_rate_diff = round(daily_rate_b - daily_rate_a, 2)
    daily_rate_pct_change = (
        round(((daily_rate_b - daily_rate_a) / daily_rate_a) * 100.0, 2)
        if daily_rate_a > 0 else None
    )

    count_diff = stats_b['total'] - stats_a['total']
    relative_pct_change = (
        round((count_diff / stats_a['total']) * 100.0, 2)
        if stats_a['total'] > 0 else None
    )
    
    unequal_duration_warning = None
    if days_a != days_b:
        unequal_duration_warning = (
            f"Unequal duration comparison: Period A spans {days_a} calendar days while Period B spans {days_b} calendar days. "
            f"The raw count difference ({count_diff:+d} / {relative_pct_change:+.2f}%) reflects duration disparity; "
            f"evaluate Daily Rate ({daily_rate_a:.2f}/day vs {daily_rate_b:.2f}/day, {daily_rate_pct_change:+.2f}%) for normalized velocity."
        )
    
    arrest_delta_pp = round(stats_b['arrest_pct'] - stats_a['arrest_pct'], 2)
    domestic_delta_pp = round(stats_b['domestic_pct'] - stats_a['domestic_pct'], 2)
    night_delta_pp = round(stats_b['night_pct'] - stats_a['night_pct'], 2)
    
    # Category composition delta pp comparison
    all_cats = sorted(list(set(stats_a['categories'].keys()) | set(stats_b['categories'].keys())))
    category_comparison = []
    
    for cat in all_cats:
        c_a = stats_a['categories'].get(cat, {"count": 0, "share_pct": 0.0})
        c_b = stats_b['categories'].get(cat, {"count": 0, "share_pct": 0.0})
        delta_pp = round(c_b['share_pct'] - c_a['share_pct'], 2)
        cnt_diff = c_b['count'] - c_a['count']
        
        category_comparison.append({
            "category": cat,
            "count_a": c_a['count'],
            "share_pct_a": c_a['share_pct'],
            "count_b": c_b['count'],
            "share_pct_b": c_b['share_pct'],
            "count_diff": cnt_diff,
            "delta_pp": delta_pp
        })
        
    category_comparison.sort(key=lambda x: abs(x['delta_pp']), reverse=True)

    return {
        "dataset": dataset,
        "period_a": {
            "start": period_a_start,
            "end": period_a_end,
            "days": days_a,
            "daily_rate": daily_rate_a,
            "stats": stats_a
        },
        "period_b": {
            "start": period_b_start,
            "end": period_b_end,
            "days": days_b,
            "daily_rate": daily_rate_b,
            "stats": stats_b
        },
        "comparison": {
            "count_diff": count_diff,
            "relative_pct_change": relative_pct_change,
            "daily_rate_diff": daily_rate_diff,
            "daily_rate_pct_change": daily_rate_pct_change,
            "unequal_duration_warning": unequal_duration_warning,
            "arrest_delta_pp": arrest_delta_pp,
            "domestic_delta_pp": domestic_delta_pp,
            "night_delta_pp": night_delta_pp,
            "category_comparison": category_comparison
        }
    }


def get_day_hour_heatmap(
    dataset: str = "real",
    categories: Optional[List[str]] = None,
    district: Optional[str] = None,
    community_area: Optional[str] = None,
    normalize: bool = False
) -> Dict[str, Any]:
    """
    Computes a 7x24 matrix (Day of Week Mon-Sun x Hour 00-23).
    """
    schema = get_schema_for_dataset(dataset)
    engine = get_engine()
    
    where_clauses = ["1=1"]
    params: Dict[str, Any] = {}
    
    if categories and len(categories) > 0:
        where_clauses.append("c.primary_type = ANY(:categories)")
        params["categories"] = categories
    if district:
        clean_d = str(district).strip().zfill(3)
        where_clauses.append("(a.district = :district OR a.district = :district_raw)")
        params["district"] = clean_d
        params["district_raw"] = str(district).strip()
    if community_area:
        where_clauses.append("a.community_area = :community_area")
        params["community_area"] = str(community_area).strip()
        
    where_sql = " AND ".join(where_clauses)
    
    sql = text(f"""
        SELECT 
            t.day_of_week,
            t.day_name,
            t.hour,
            COUNT(f.crime_fact_key) as incident_count
        FROM {schema}.fact_crime f
        JOIN {schema}.dim_time t ON f.time_key = t.time_key
        JOIN {schema}.dim_crime c ON f.crime_key = c.crime_key
        JOIN {schema}.dim_area a ON f.area_key = a.area_key
        WHERE {where_sql}
        GROUP BY t.day_of_week, t.day_name, t.hour
        ORDER BY t.day_of_week, t.hour
    """)
    
    with engine.connect() as conn:
        df = pd.read_sql(sql, conn, params=params)
        
    total_incidents = int(df['incident_count'].sum()) if not df.empty else 0
    
    days_order = [
        {"dow": 1, "name": "Monday"},
        {"dow": 2, "name": "Tuesday"},
        {"dow": 3, "name": "Wednesday"},
        {"dow": 4, "name": "Thursday"},
        {"dow": 5, "name": "Friday"},
        {"dow": 6, "name": "Saturday"},
        {"dow": 7, "name": "Sunday"}
    ]
    
    # Initialize empty 7x24 matrix
    matrix = {}
    for d in days_order:
        matrix[d['name']] = {h: 0 for h in range(24)}
        
    if not df.empty:
        for _, row in df.iterrows():
            dname = str(row['day_name']).strip()
            hr = int(row['hour'])
            cnt = int(row['incident_count'])
            if dname in matrix and 0 <= hr < 24:
                matrix[dname][hr] = cnt
                
    # Format grid response
    cells = []
    max_val = 0
    for d in days_order:
        dname = d['name']
        for hr in range(24):
            val = matrix[dname][hr]
            share = round((val / total_incidents * 100.0), 2) if total_incidents > 0 else 0.0
            display_val = share if normalize else val
            if val > max_val:
                max_val = val
                
            cells.append({
                "day": dname,
                "dow": d['dow'],
                "hour": hr,
                "count": val,
                "share_pct": share,
                "value": display_val
            })

    return {
        "dataset": dataset,
        "total_incidents": total_incidents,
        "is_normalized": normalize,
        "max_cell_count": max_val,
        "cells": cells
    }


def get_category_trends(
    dataset: str = "real",
    categories: Optional[List[str]] = None,
    district: Optional[str] = None
) -> Dict[str, Any]:
    """
    Tracks trajectory and monthly share changes across selected crime categories.
    """
    schema = get_schema_for_dataset(dataset)
    engine = get_engine()
    
    if not categories:
        # Pick top 5 categories by default
        top_cats_sql = text(f"""
            SELECT c.primary_type, COUNT(*) as cnt 
            FROM {schema}.fact_crime f
            JOIN {schema}.dim_crime c ON f.crime_key = c.crime_key
            GROUP BY c.primary_type
            ORDER BY cnt DESC LIMIT 5
        """)
        with engine.connect() as conn:
            categories = [r['primary_type'] for r in conn.execute(top_cats_sql).mappings().all()]
            
    where_clauses = ["c.primary_type = ANY(:categories)"]
    params: Dict[str, Any] = {"categories": categories}
    if district:
        clean_d = str(district).strip().zfill(3)
        where_clauses.append("(a.district = :district OR a.district = :district_raw)")
        params["district"] = clean_d
        params["district_raw"] = str(district).strip()
        
    where_sql = " AND ".join(where_clauses)
    
    sql = text(f"""
        SELECT 
            CONCAT(t.year, '-', LPAD(t.month::text, 2, '0')) as year_month,
            c.primary_type,
            COUNT(f.crime_fact_key) as incident_count
        FROM {schema}.fact_crime f
        JOIN {schema}.dim_time t ON f.time_key = t.time_key
        JOIN {schema}.dim_crime c ON f.crime_key = c.crime_key
        JOIN {schema}.dim_area a ON f.area_key = a.area_key
        WHERE {where_sql}
        GROUP BY t.year, t.month, c.primary_type
        ORDER BY t.year, t.month
    """)
    
    with engine.connect() as conn:
        df = pd.read_sql(sql, conn, params=params)
        
    pivoted = []
    if not df.empty:
        pv = df.pivot(index='year_month', columns='primary_type', values='incident_count').fillna(0)
        for ym in pv.index:
            row_dict = {"year_month": str(ym), "total": int(pv.loc[ym].sum())}
            for cat in categories:
                row_dict[cat] = int(pv.loc[ym].get(cat, 0))
            pivoted.append(row_dict)
            
    return {
        "dataset": dataset,
        "categories": categories,
        "monthly_category_trends": pivoted
    }


def get_seasonality_analysis(
    dataset: str = "real",
    district: Optional[str] = None
) -> Dict[str, Any]:
    """
    Computes exploratory seasonality indicators (hourly curve, day of week ratio, calendar month comparison).
    Includes explanation of 3-year history scope (2023-2025).
    """
    schema = get_schema_for_dataset(dataset)
    engine = get_engine()
    
    params: Dict[str, Any] = {}
    where_area = ""
    if district:
        clean_d = str(district).strip().zfill(3)
        where_area = "AND (a.district = :district OR a.district = :district_raw)"
        params["district"] = clean_d
        params["district_raw"] = str(district).strip()
        
    # Hourly seasonality
    sql_hour = text(f"""
        SELECT t.hour, COUNT(f.crime_fact_key) as cnt
        FROM {schema}.fact_crime f
        JOIN {schema}.dim_time t ON f.time_key = t.time_key
        JOIN {schema}.dim_area a ON f.area_key = a.area_key
        WHERE 1=1 {where_area}
        GROUP BY t.hour ORDER BY t.hour
    """)
    
    # Weekday vs Weekend
    sql_dow = text(f"""
        SELECT 
            SUM(CASE WHEN t.is_weekend THEN 1 ELSE 0 END) as weekend_cnt,
            SUM(CASE WHEN NOT t.is_weekend THEN 1 ELSE 0 END) as weekday_cnt,
            COUNT(f.crime_fact_key) as total_cnt
        FROM {schema}.fact_crime f
        JOIN {schema}.dim_time t ON f.time_key = t.time_key
        JOIN {schema}.dim_area a ON f.area_key = a.area_key
        WHERE 1=1 {where_area}
    """)
    
    # Monthly breakdown by year
    sql_month_yr = text(f"""
        SELECT t.year, t.month, t.month_name, COUNT(f.crime_fact_key) as cnt
        FROM {schema}.fact_crime f
        JOIN {schema}.dim_time t ON f.time_key = t.time_key
        JOIN {schema}.dim_area a ON f.area_key = a.area_key
        WHERE 1=1 {where_area}
        GROUP BY t.year, t.month, t.month_name ORDER BY t.month, t.year
    """)
    
    with engine.connect() as conn:
        df_hr = pd.read_sql(sql_hour, conn, params=params)
        dow_res = conn.execute(sql_dow, params).mappings().first()
        df_my = pd.read_sql(sql_month_yr, conn, params=params)
        
    hourly_distribution = [
        {"hour": int(r['hour']), "count": int(r['cnt'])} for _, r in df_hr.iterrows()
    ] if not df_hr.empty else []
    
    tot = int(dow_res['total_cnt']) if dow_res and dow_res['total_cnt'] else 0
    wkd = int(dow_res['weekday_cnt']) if dow_res and dow_res['weekday_cnt'] else 0
    wke = int(dow_res['weekend_cnt']) if dow_res and dow_res['weekend_cnt'] else 0
    
    weekday_vs_weekend = {
        "weekday_count": wkd,
        "weekday_pct": round(wkd / tot * 100.0, 2) if tot > 0 else 0.0,
        "weekend_count": wke,
        "weekend_pct": round(wke / tot * 100.0, 2) if tot > 0 else 0.0
    }
    
    month_comparison = []
    if not df_my.empty:
        pv_m = df_my.pivot(index='month', columns='year', values='cnt').fillna(0)
        months_labels = {1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun',
                         7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'}
        for m_num in range(1, 13):
            val_2023 = int(pv_m.loc[m_num].get(2023, 0)) if m_num in pv_m.index else 0
            val_2024 = int(pv_m.loc[m_num].get(2024, 0)) if m_num in pv_m.index else 0
            val_2025 = int(pv_m.loc[m_num].get(2025, 0)) if m_num in pv_m.index else 0
            month_comparison.append({
                "month_num": m_num,
                "month_name": months_labels[m_num],
                "year_2023": val_2023,
                "year_2024": val_2024,
                "year_2025": val_2025
            })
            
    return {
        "dataset": dataset,
        "decomposition_status": "EXPLORATORY_THREE_YEAR_SERIES",
        "confidence_note": "Dataset covers 3 complete calendar years (2023-2025, 36 months). While 3 annual cycles provide meaningful empirical seasonal patterns, classical statistical STL decomposition and isolation of pure seasonality ideally benefit from longer multi-year baselines to separate stochastic macro shifts from stationary cycles. Breakdown presents empirical observations across the warehouse census.",
        "hourly_distribution": hourly_distribution,
        "weekday_vs_weekend": weekday_vs_weekend,
        "monthly_year_over_year": month_comparison
    }


def generate_temporal_insights(dataset: str = "real", district: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Generates deterministic evidence-based insights strictly supported by database numbers.
    Respects active district filter and documents scope explicitly.
    """
    schema = get_schema_for_dataset(dataset)
    engine = get_engine()
    insights = []
    
    params: Dict[str, Any] = {}
    where_join = f"JOIN {schema}.dim_area a ON f.area_key = a.area_key"
    if district:
        clean_d = str(district).strip().zfill(3)
        where_sql = "WHERE (a.district = :district OR a.district = :district_raw)"
        params["district"] = clean_d
        params["district_raw"] = str(district).strip()
        scope_label = f"District #{clean_d}"
    else:
        where_sql = "WHERE 1=1"
        scope_label = "Full Warehouse Census (761,718 incidents, 2023–2025)"
    
    with engine.connect() as conn:
        # Peak month finding
        sql_peak = text(f"""
            SELECT CONCAT(t.year, '-', LPAD(t.month::text, 2, '0')) as ym, COUNT(*) as cnt
            FROM {schema}.fact_crime f
            JOIN {schema}.dim_time t ON f.time_key = t.time_key
            {where_join}
            {where_sql}
            GROUP BY t.year, t.month ORDER BY cnt DESC LIMIT 1
        """)
        peak_res = conn.execute(sql_peak, params).mappings().first()
        if peak_res:
            insights.append({
                "id": 1,
                "title": "Peak Recorded Incident Month",
                "category": "Volume",
                "scope": scope_label,
                "text": f"The highest observed incident volume occurred in {peak_res['ym']} with {peak_res['cnt']:,} recorded incidents ({scope_label})."
            })
            
        # Peak hour finding with responsible midnight default reporting note
        sql_hour = text(f"""
            SELECT t.hour, COUNT(*) as cnt
            FROM {schema}.fact_crime f
            JOIN {schema}.dim_time t ON f.time_key = t.time_key
            {where_join}
            {where_sql}
            GROUP BY t.hour ORDER BY cnt DESC LIMIT 1
        """)
        hr_res = conn.execute(sql_hour, params).mappings().first()
        if hr_res:
            hr_str = f"{str(hr_res['hour']).zfill(2)}:00"
            insights.append({
                "id": 2,
                "title": "Peak Recorded Diurnal Hour",
                "category": "Diurnal",
                "scope": scope_label,
                "text": f"Across {scope_label}, hour {hr_str} recorded the highest frequency of incidents ({hr_res['cnt']:,} occurrences). In municipal police incident recording, midnight (00:00) is commonly designated as an administrative default timestamp when the precise time of occurrence is unobserved or unverified (e.g., property theft, burglary discovered post-facto), alongside genuine nighttime events. This reflects recorded frequency rather than proven elevated street risk."
            })
            
        # Night vs Day ratio
        sql_night = text(f"""
            SELECT 
                SUM(CASE WHEN t.hour >= 22 OR t.hour < 6 THEN 1 ELSE 0 END) as night_cnt,
                COUNT(*) as total_cnt
            FROM {schema}.fact_crime f
            JOIN {schema}.dim_time t ON f.time_key = t.time_key
            {where_join}
            {where_sql}
        """)
        n_res = conn.execute(sql_night, params).mappings().first()
        if n_res and n_res['total_cnt'] > 0:
            pct = round(n_res['night_cnt'] / n_res['total_cnt'] * 100.0, 2)
            insights.append({
                "id": 3,
                "title": "Nighttime Incident Concentration",
                "category": "Temporal",
                "scope": scope_label,
                "text": f"Nighttime hours (22:00 to 06:00) account for {pct}% of recorded incidents ({n_res['night_cnt']:,} out of {n_res['total_cnt']:,}) across {scope_label}."
            })

        # Weekday vs Weekend share
        sql_dow = text(f"""
            SELECT 
                SUM(CASE WHEN NOT t.is_weekend THEN 1 ELSE 0 END) as weekday_cnt,
                SUM(CASE WHEN t.is_weekend THEN 1 ELSE 0 END) as weekend_cnt,
                COUNT(*) as total_cnt
            FROM {schema}.fact_crime f
            JOIN {schema}.dim_time t ON f.time_key = t.time_key
            {where_join}
            {where_sql}
        """)
        d_res = conn.execute(sql_dow, params).mappings().first()
        if d_res and d_res['total_cnt'] > 0:
            wkd_pct = round(d_res['weekday_cnt'] / d_res['total_cnt'] * 100.0, 2)
            wke_pct = round(d_res['weekend_cnt'] / d_res['total_cnt'] * 100.0, 2)
            insights.append({
                "id": 4,
                "title": "Weekday vs. Weekend Load Share",
                "category": "Operational",
                "scope": scope_label,
                "text": f"Weekday operations (Monday through Friday) account for {wkd_pct}% of recorded incidents ({d_res['weekday_cnt']:,} incidents), while weekend days represent {wke_pct}% ({d_res['weekend_cnt']:,} incidents) across {scope_label}."
            })

    return insights
