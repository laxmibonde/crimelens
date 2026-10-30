import math
import pandas as pd
import numpy as np
from datetime import datetime
from sqlalchemy import text
from typing import Dict, Any, List, Optional
from database import get_engine, get_schema_for_dataset
from services.hotspot_service import compute_dbscan_clusters, match_spatial_clusters


def parse_date_days(start_str: str, end_str: str) -> int:
    """Calculates inclusive calendar days between two YYYY-MM-DD date strings."""
    try:
        d1 = datetime.strptime(start_str, "%Y-%m-%d")
        d2 = datetime.strptime(end_str, "%Y-%m-%d")
        return max(1, (d2 - d1).days + 1)
    except Exception:
        return 1


def get_change_metadata(dataset: str = "real") -> Dict[str, Any]:
    """Returns metadata, bounds, and filter options for the What Changed? comparison engine."""
    schema = get_schema_for_dataset(dataset)
    engine = get_engine()
    
    with engine.connect() as conn:
        bounds = conn.execute(text(f"""
            SELECT 
                COUNT(*) as total_incidents,
                MIN(t.full_date) as min_date,
                MAX(t.full_date) as max_date
            FROM {schema}.fact_crime f
            JOIN {schema}.dim_time t ON f.time_key = t.time_key
        """)).mappings().first()
        
        cats = [
            r['primary_type'] for r in conn.execute(text(f"""
                SELECT DISTINCT primary_type FROM {schema}.dim_crime 
                WHERE primary_type IS NOT NULL ORDER BY primary_type
            """)).mappings().all()
        ]
        
        districts = [
            {"id": r['district'], "label": f"District #{str(r['district']).zfill(3)}"}
            for r in conn.execute(text(f"""
                SELECT DISTINCT district FROM {schema}.dim_area 
                WHERE district IS NOT NULL AND district NOT IN ('UNKNOWN', '0') ORDER BY district
            """)).mappings().all()
        ]
        
        cas = [
            {"id": r['community_area'], "label": f"Community Area #{r['community_area']}"}
            for r in conn.execute(text(f"""
                SELECT DISTINCT community_area FROM {schema}.dim_area 
                WHERE community_area IS NOT NULL AND community_area NOT IN ('UNKNOWN', '0') ORDER BY community_area
            """)).mappings().all()
        ]
        
    return {
        "dataset": dataset,
        "is_synthetic": (schema == "synthetic_data"),
        "total_incidents": int(bounds['total_incidents']) if bounds else 0,
        "min_date": str(bounds['min_date']) if bounds and bounds['min_date'] else "2023-01-01",
        "max_date": str(bounds['max_date']) if bounds and bounds['max_date'] else "2025-12-31",
        "categories": cats,
        "districts": districts,
        "community_areas": cas,
        "default_period_a": {"start": "2023-01-01", "end": "2023-01-31", "label": "January 2023"},
        "default_period_b": {"start": "2024-01-01", "end": "2024-01-31", "label": "January 2024"}
    }


def get_period_metrics(
    schema: str,
    start_date: str,
    end_date: str,
    categories: Optional[List[str]] = None,
    district: Optional[str] = None,
    community_area: Optional[str] = None
) -> Dict[str, Any]:
    """Helper computing aggregate metrics for a single date range."""
    engine = get_engine()
    where_clauses = ["t.full_date >= :start_date AND t.full_date <= :end_date"]
    params: Dict[str, Any] = {"start_date": start_date, "end_date": end_date}
    
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
            COUNT(f.crime_fact_key) as total,
            SUM(CASE WHEN s.arrest = TRUE THEN 1 ELSE 0 END) as arrests,
            SUM(CASE WHEN s.domestic = TRUE THEN 1 ELSE 0 END) as domestic,
            SUM(CASE WHEN t.hour >= 22 OR t.hour < 6 THEN 1 ELSE 0 END) as night,
            SUM(CASE WHEN t.is_weekend = TRUE THEN 1 ELSE 0 END) as weekend,
            SUM(CASE WHEN l.latitude IS NOT NULL AND l.longitude IS NOT NULL AND l.latitude != 0 THEN 1 ELSE 0 END) as valid_coords
        FROM {schema}.fact_crime f
        JOIN {schema}.dim_time t ON f.time_key = t.time_key
        JOIN {schema}.dim_crime c ON f.crime_key = c.crime_key
        JOIN {schema}.dim_area a ON f.area_key = a.area_key
        JOIN {schema}.dim_status s ON f.status_key = s.status_key
        JOIN {schema}.dim_location l ON f.location_key = l.location_key
        WHERE {where_sql}
    """)
    
    with engine.connect() as conn:
        res = conn.execute(sql, params).mappings().first()
        
    tot = int(res['total']) if res and res['total'] else 0
    arr = int(res['arrests']) if res and res['arrests'] else 0
    dom = int(res['domestic']) if res and res['domestic'] else 0
    nig = int(res['night']) if res and res['night'] else 0
    wke = int(res['weekend']) if res and res['weekend'] else 0
    coords = int(res['valid_coords']) if res and res['valid_coords'] else 0
    
    days = parse_date_days(start_date, end_date)
    daily_rate = round(tot / days, 2) if days > 0 else 0.0
    missing_coords_pct = round((1.0 - (coords / tot)) * 100.0, 2) if tot > 0 else 0.0
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "days": days,
        "total_incidents": tot,
        "daily_rate": daily_rate,
        "arrest_count": arr,
        "arrest_pct": round(arr / tot * 100.0, 2) if tot > 0 else 0.0,
        "domestic_count": dom,
        "domestic_pct": round(dom / tot * 100.0, 2) if tot > 0 else 0.0,
        "night_count": nig,
        "night_pct": round(nig / tot * 100.0, 2) if tot > 0 else 0.0,
        "weekend_count": wke,
        "weekend_pct": round(wke / tot * 100.0, 2) if tot > 0 else 0.0,
        "valid_coords": coords,
        "missing_coords_pct": missing_coords_pct
    }


def get_change_overview(
    dataset: str = "real",
    period_a_start: str = "2023-01-01",
    period_a_end: str = "2023-01-31",
    period_b_start: str = "2024-01-01",
    period_b_end: str = "2024-01-31",
    categories: Optional[List[str]] = None,
    district: Optional[str] = None,
    community_area: Optional[str] = None
) -> Dict[str, Any]:
    """Computes top-level KPI overview comparison between Period A and Period B."""
    schema = get_schema_for_dataset(dataset)
    stats_a = get_period_metrics(schema, period_a_start, period_a_end, categories, district, community_area)
    stats_b = get_period_metrics(schema, period_b_start, period_b_end, categories, district, community_area)
    
    count_diff = stats_b['total_incidents'] - stats_a['total_incidents']
    relative_pct_change = (
        round((count_diff / stats_a['total_incidents']) * 100.0, 2)
        if stats_a['total_incidents'] > 0 else None
    )
    
    daily_rate_diff = round(stats_b['daily_rate'] - stats_a['daily_rate'], 2)
    arrest_delta_pp = round(stats_b['arrest_pct'] - stats_a['arrest_pct'], 2)
    domestic_delta_pp = round(stats_b['domestic_pct'] - stats_a['domestic_pct'], 2)
    night_delta_pp = round(stats_b['night_pct'] - stats_a['night_pct'], 2)
    weekend_delta_pp = round(stats_b['weekend_pct'] - stats_a['weekend_pct'], 2)
    
    # Fair comparison warnings
    duration_warning = None
    if stats_a['days'] != stats_b['days']:
        duration_warning = {
            "flag": "UNEQUAL_PERIOD_DURATIONS",
            "message": f"Period A covers {stats_a['days']} calendar days while Period B covers {stats_b['days']} calendar days. Evaluate Daily Rate ({stats_a['daily_rate']}/day vs {stats_b['daily_rate']}/day) and percentage shares rather than raw counts to avoid duration bias."
        }
        
    coords_warning = None
    max_missing = max(stats_a.get('missing_coords_pct', 0), stats_b.get('missing_coords_pct', 0))
    if max_missing > 5.0:
        coords_warning = {
            "flag": "SPATIAL_COORDINATE_PRECISION",
            "message": f"Up to {max_missing}% of incident records in the compared periods lack valid spatial coordinates and are excluded from geospatial clustering."
        }
        
    sim_warning = None
    if schema == "synthetic_data":
        sim_warning = {
            "flag": "SIMULATED_DATASET",
            "message": "Synthetic dataset mode active. Observed differences demonstrate comparison mechanics on simulated uniform data."
        }

    return {
        "dataset": dataset,
        "period_a": stats_a,
        "period_b": stats_b,
        "comparison": {
            "count_diff": count_diff,
            "relative_pct_change": relative_pct_change,
            "daily_rate_diff": daily_rate_diff,
            "arrest_delta_pp": arrest_delta_pp,
            "domestic_delta_pp": domestic_delta_pp,
            "night_delta_pp": night_delta_pp,
            "weekend_delta_pp": weekend_delta_pp
        },
        "warnings": [w for w in [duration_warning, coords_warning, sim_warning] if w is not None]
    }


def get_category_changes(
    dataset: str = "real",
    period_a_start: str = "2023-01-01",
    period_a_end: str = "2023-01-31",
    period_b_start: str = "2024-01-01",
    period_b_end: str = "2024-01-31",
    district: Optional[str] = None,
    community_area: Optional[str] = None,
    min_sample_size: int = 10
) -> Dict[str, Any]:
    """Computes category-by-category changes, composition shares, delta pp, and top positive/negative movers."""
    schema = get_schema_for_dataset(dataset)
    engine = get_engine()
    
    def fetch_cats(start_d: str, end_d: str):
        where_clauses = ["t.full_date >= :start_d AND t.full_date <= :end_d"]
        params: Dict[str, Any] = {"start_d": start_d, "end_d": end_d}
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
            SELECT c.primary_type, COUNT(f.crime_fact_key) as count
            FROM {schema}.fact_crime f
            JOIN {schema}.dim_time t ON f.time_key = t.time_key
            JOIN {schema}.dim_area a ON f.area_key = a.area_key
            JOIN {schema}.dim_crime c ON f.crime_key = c.crime_key
            WHERE {where_sql}
            GROUP BY c.primary_type
        """)
        
        with engine.connect() as conn:
            return pd.read_sql(sql, conn, params=params)

    df_a = fetch_cats(period_a_start, period_a_end)
    df_b = fetch_cats(period_b_start, period_b_end)
    
    tot_a = int(df_a['count'].sum()) if not df_a.empty else 0
    tot_b = int(df_b['count'].sum()) if not df_b.empty else 0
    
    dict_a = {row['primary_type']: int(row['count']) for _, row in df_a.iterrows()} if not df_a.empty else {}
    dict_b = {row['primary_type']: int(row['count']) for _, row in df_b.iterrows()} if not df_b.empty else {}
    
    all_cats = sorted(list(set(dict_a.keys()) | set(dict_b.keys())))
    category_list = []
    
    for cat in all_cats:
        cnt_a = dict_a.get(cat, 0)
        cnt_b = dict_b.get(cat, 0)
        if cnt_a < min_sample_size and cnt_b < min_sample_size:
            continue
            
        share_a = round((cnt_a / tot_a * 100.0), 2) if tot_a > 0 else 0.0
        share_b = round((cnt_b / tot_b * 100.0), 2) if tot_b > 0 else 0.0
        cnt_diff = cnt_b - cnt_a
        delta_pp = round(share_b - share_a, 2)
        rel_change = round((cnt_diff / cnt_a * 100.0), 2) if cnt_a > 0 else None
        
        category_list.append({
            "category": cat,
            "count_a": cnt_a,
            "share_a": share_a,
            "count_b": cnt_b,
            "share_b": share_b,
            "count_diff": cnt_diff,
            "delta_pp": delta_pp,
            "relative_pct_change": rel_change
        })
        
    category_list.sort(key=lambda x: abs(x['count_diff']), reverse=True)
    
    top_increases = sorted([c for c in category_list if c['count_diff'] > 0], key=lambda x: x['count_diff'], reverse=True)[:5]
    top_decreases = sorted([c for c in category_list if c['count_diff'] < 0], key=lambda x: x['count_diff'])[:5]
    top_shifts = sorted(category_list, key=lambda x: abs(x['delta_pp']), reverse=True)[:5]

    return {
        "dataset": dataset,
        "total_a": tot_a,
        "total_b": tot_b,
        "categories": category_list,
        "top_increases": top_increases,
        "top_decreases": top_decreases,
        "top_shifts": top_shifts
    }


def get_area_changes(
    dataset: str = "real",
    period_a_start: str = "2023-01-01",
    period_a_end: str = "2023-01-31",
    period_b_start: str = "2024-01-01",
    period_b_end: str = "2024-01-31",
    granularity: str = "district",
    min_sample_size: int = 10
) -> Dict[str, Any]:
    """Computes geographic composition shifts across Police Districts or Community Areas."""
    schema = get_schema_for_dataset(dataset)
    engine = get_engine()
    area_col = "a.district" if granularity == "district" else "a.community_area"
    
    def fetch_area_counts(start_d: str, end_d: str):
        sql = text(f"""
            SELECT {area_col} as area_id, COUNT(f.crime_fact_key) as count
            FROM {schema}.fact_crime f
            JOIN {schema}.dim_time t ON f.time_key = t.time_key
            JOIN {schema}.dim_area a ON f.area_key = a.area_key
            WHERE t.full_date >= :start_d AND t.full_date <= :end_d
              AND {area_col} IS NOT NULL AND {area_col} NOT IN ('UNKNOWN', '0')
            GROUP BY {area_col}
        """)
        with engine.connect() as conn:
            return pd.read_sql(sql, conn, params={"start_d": start_d, "end_d": end_d})

    df_a = fetch_area_counts(period_a_start, period_a_end)
    df_b = fetch_area_counts(period_b_start, period_b_end)
    
    tot_a = int(df_a['count'].sum()) if not df_a.empty else 0
    tot_b = int(df_b['count'].sum()) if not df_b.empty else 0
    
    dict_a = {str(row['area_id']).strip(): int(row['count']) for _, row in df_a.iterrows()} if not df_a.empty else {}
    dict_b = {str(row['area_id']).strip(): int(row['count']) for _, row in df_b.iterrows()} if not df_b.empty else {}
    
    all_areas = sorted(list(set(dict_a.keys()) | set(dict_b.keys())))
    area_list = []
    
    for aid in all_areas:
        cnt_a = dict_a.get(aid, 0)
        cnt_b = dict_b.get(aid, 0)
        if cnt_a < min_sample_size and cnt_b < min_sample_size:
            continue
            
        share_a = round((cnt_a / tot_a * 100.0), 2) if tot_a > 0 else 0.0
        share_b = round((cnt_b / tot_b * 100.0), 2) if tot_b > 0 else 0.0
        cnt_diff = cnt_b - cnt_a
        delta_pp = round(share_b - share_a, 2)
        label = f"District #{aid.zfill(3)}" if granularity == "district" else f"Community Area #{aid}"
        
        area_list.append({
            "area_id": aid,
            "label": label,
            "count_a": cnt_a,
            "share_a": share_a,
            "count_b": cnt_b,
            "share_b": share_b,
            "count_diff": cnt_diff,
            "delta_pp": delta_pp
        })
        
    area_list.sort(key=lambda x: abs(x['count_diff']), reverse=True)

    return {
        "dataset": dataset,
        "granularity": granularity,
        "total_a": tot_a,
        "total_b": tot_b,
        "areas": area_list
    }


def get_temporal_changes(
    dataset: str = "real",
    period_a_start: str = "2023-01-01",
    period_a_end: str = "2023-01-31",
    period_b_start: str = "2024-01-01",
    period_b_end: str = "2024-01-31"
) -> Dict[str, Any]:
    """Computes hourly distribution overlays (00-23) and weekday vs weekend shifts."""
    schema = get_schema_for_dataset(dataset)
    engine = get_engine()
    
    def fetch_hourly(start_d: str, end_d: str):
        sql = text(f"""
            SELECT t.hour, COUNT(f.crime_fact_key) as count
            FROM {schema}.fact_crime f
            JOIN {schema}.dim_time t ON f.time_key = t.time_key
            WHERE t.full_date >= :start_d AND t.full_date <= :end_d
            GROUP BY t.hour ORDER BY t.hour
        """)
        with engine.connect() as conn:
            return pd.read_sql(sql, conn, params={"start_d": start_d, "end_d": end_d})

    df_a = fetch_hourly(period_a_start, period_a_end)
    df_b = fetch_hourly(period_b_start, period_b_end)
    
    tot_a = int(df_a['count'].sum()) if not df_a.empty else 0
    tot_b = int(df_b['count'].sum()) if not df_b.empty else 0
    
    dict_a = {int(r['hour']): int(r['count']) for _, r in df_a.iterrows()} if not df_a.empty else {}
    dict_b = {int(r['hour']): int(r['count']) for _, r in df_b.iterrows()} if not df_b.empty else {}
    
    hourly_overlay = []
    for h in range(24):
        cnt_a = dict_a.get(h, 0)
        cnt_b = dict_b.get(h, 0)
        share_a = round((cnt_a / tot_a * 100.0), 2) if tot_a > 0 else 0.0
        share_b = round((cnt_b / tot_b * 100.0), 2) if tot_b > 0 else 0.0
        hourly_overlay.append({
            "hour": h,
            "label": f"{str(h).zfill(2)}:00",
            "count_a": cnt_a,
            "share_a": share_a,
            "count_b": cnt_b,
            "share_b": share_b,
            "delta_pp": round(share_b - share_a, 2)
        })

    return {
        "dataset": dataset,
        "total_a": tot_a,
        "total_b": tot_b,
        "hourly_overlay": hourly_overlay
    }


def get_hotspot_changes(
    dataset: str = "real",
    period_a_start: str = "2023-01-01",
    period_a_end: str = "2023-01-31",
    period_b_start: str = "2024-01-01",
    period_b_end: str = "2024-01-31",
    eps_meters: float = 300.0,
    min_samples: int = 15,
    match_threshold_meters: float = 500.0
) -> Dict[str, Any]:
    """Runs DBSCAN on Period A & Period B, matches spatial centroids via Haversine, and classifies hotspots."""
    res_a = compute_dbscan_clusters(
        eps_meters=eps_meters, min_samples=min_samples,
        filters={"start_date": period_a_start, "end_date": period_a_end},
        dataset=dataset
    )
    res_b = compute_dbscan_clusters(
        eps_meters=eps_meters, min_samples=min_samples,
        filters={"start_date": period_b_start, "end_date": period_b_end},
        dataset=dataset
    )
    
    clusters_a = res_a.get("clusters", [])
    clusters_b = res_b.get("clusters", [])
    
    matches = match_spatial_clusters(clusters_a, clusters_b, distance_threshold_meters=match_threshold_meters)
    
    matched_count = sum(1 for m in matches if m['match_classification'] in ['SPATIALLY_MATCHED', 'UNCERTAIN_MATCH'])
    new_count = sum(1 for m in matches if m['match_classification'] == 'NEWLY_OBSERVED')
    dissolved_count = sum(1 for m in matches if m['match_classification'] == 'NO_LONGER_OBSERVED')

    return {
        "dataset": dataset,
        "period_a": {"start": period_a_start, "end": period_a_end, "clusters_count": len(clusters_a), "eligible_incidents": res_a.get("eligible_incidents", 0)},
        "period_b": {"start": period_b_start, "end": period_b_end, "clusters_count": len(clusters_b), "eligible_incidents": res_b.get("eligible_incidents", 0)},
        "matching_summary": {
            "threshold_meters": match_threshold_meters,
            "persistent_hotspots": matched_count,
            "newly_observed_hotspots": new_count,
            "dissolved_hotspots": dissolved_count,
            "total_matches_evaluated": len(matches)
        },
        "matches": matches
    }


def get_change_attribution(
    dataset: str = "real",
    period_a_start: str = "2023-01-01",
    period_a_end: str = "2023-01-31",
    period_b_start: str = "2024-01-01",
    period_b_end: str = "2024-01-31"
) -> Dict[str, Any]:
    """Computes deterministic orthogonal change decomposition by top crime categories."""
    cats_res = get_category_changes(dataset, period_a_start, period_a_end, period_b_start, period_b_end, min_sample_size=1)
    tot_diff = cats_res['total_b'] - cats_res['total_a']
    
    decompositions = []
    if tot_diff != 0:
        for c in cats_res['categories'][:8]:
            contrib_pct = round((c['count_diff'] / tot_diff * 100.0), 2)
            decompositions.append({
                "category": c['category'],
                "count_diff": c['count_diff'],
                "contribution_to_total_diff_pct": contrib_pct,
                "explanation": f"{c['category']} changed by {c['count_diff']:+} incidents ({contrib_pct}% of total difference)."
            })

    return {
        "dataset": dataset,
        "total_difference": tot_diff,
        "category_decompositions": decompositions
    }


def generate_change_insights(dataset: str = "real") -> List[Dict[str, Any]]:
    """Generates evidence-based insight cards based on actual data comparisons."""
    overview = get_change_overview(dataset)
    insights = []
    
    diff = overview['comparison']['count_diff']
    pct = overview['comparison']['relative_pct_change']
    rel_str = f" ({pct:+}%)" if pct is not None else ""
    
    insights.append({
        "id": 1,
        "title": "Sample Record Count Shift",
        "category": "Volume",
        "text": f"Period B recorded {diff:+} incidents compared to Period A{rel_str} in the analyzed dataset sample."
    })
    
    arr_pp = overview['comparison']['arrest_delta_pp']
    insights.append({
        "id": 2,
        "title": "Arrest Rate Shift",
        "category": "Status",
        "text": f"The sample arrest rate changed by {arr_pp:+} percentage points between Period A ({overview['period_a']['arrest_pct']}%) and Period B ({overview['period_b']['arrest_pct']}%)."
    })
    
    dom_pp = overview['comparison']['domestic_delta_pp']
    insights.append({
        "id": 3,
        "title": "Domestic Incident Share Shift",
        "category": "Composition",
        "text": f"Domestic incidents shifted by {dom_pp:+} percentage points in Period B sample relative to Period A baseline."
    })
    
    return insights
