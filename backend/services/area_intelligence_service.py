"""
CrimeLens - Area Intelligence & Comparison Service
Calculates multi-granularity area profiles (Police District & Community Area),
computes sample-normalized side-by-side area comparisons (Percentage-point differences Δpp),
integrates Phase 9 K-Means cluster assignments, and generates evidence-based deterministic insights.
"""

import os
import sys
import json
import math
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from database import execute_query, get_schema_for_dataset
from services.kmeans_service import analyze_kmeans
from services.cache_service import GLOBAL_CACHE

# Global In-Memory Cache for Area Intelligence Results
AREA_INTEL_CACHE: Dict[str, Any] = {}
CACHE_MAX_SIZE = 100


def build_area_where_clause(filters: Optional[Dict[str, Any]]) -> Tuple[str, Dict[str, Any]]:
    where_parts = []
    params = {}
    if not filters:
        return "", {}

    for key, val in filters.items():
        if val is None or val == "" or val == "all" or (isinstance(val, list) and len(val) == 0):
            continue

        if key == "year":
            if isinstance(val, list):
                where_parts.append(f"t.year IN ({','.join([f':year_{i}' for i in range(len(val))])})")
                for i, v in enumerate(val):
                    params[f"year_{i}"] = int(v)
            else:
                where_parts.append("t.year = :year")
                params["year"] = int(val)

        elif key == "month":
            if isinstance(val, list):
                where_parts.append(f"t.month IN ({','.join([f':month_{i}' for i in range(len(val))])})")
                for i, v in enumerate(val):
                    params[f"month_{i}"] = int(v)
            else:
                where_parts.append("t.month = :month")
                params["month"] = int(val)

        elif key in ("district", "area_id"):
            if isinstance(val, list):
                where_parts.append(f"(a.district IN ({','.join([f':dist_{i}' for i in range(len(val))])}) OR a.district IN ({','.join([f':dist_raw_{i}' for i in range(len(val))])}))")
                for i, v in enumerate(val):
                    params[f"dist_{i}"] = str(v).strip().zfill(3)
                    params[f"dist_raw_{i}"] = str(v).strip().lstrip('0') or '0'
            else:
                where_parts.append("(a.district = :district OR a.district = :district_raw)")
                params["district"] = str(val).strip().zfill(3)
                params["district_raw"] = str(val).strip().lstrip('0') or '0'

        elif key in ("primary_type", "category"):
            if isinstance(val, list):
                where_parts.append(f"c.primary_type IN ({','.join([f':cat_{i}' for i in range(len(val))])})")
                for i, v in enumerate(val):
                    params[f"cat_{i}"] = str(v)
            else:
                where_parts.append("c.primary_type = :category")
                params["category"] = str(val)

        elif key == "arrest":
            if str(val).lower() in ("true", "1", "yes"):
                where_parts.append("s.arrest = TRUE")
            elif str(val).lower() in ("false", "0", "no"):
                where_parts.append("s.arrest = FALSE")

        elif key == "domestic":
            if str(val).lower() in ("true", "1", "yes"):
                where_parts.append("s.domestic = TRUE")
            elif str(val).lower() in ("false", "0", "no"):
                where_parts.append("s.domestic = FALSE")

        elif key == "time_period":
            where_parts.append("LOWER(t.time_period) = LOWER(:time_period)")
            params["time_period"] = str(val)

    where_sql = (" AND " + " AND ".join(where_parts)) if where_parts else ""
    return where_sql, params


def get_area_list(dataset: str = "real", granularity: str = "district") -> Dict[str, Any]:
    """
    Returns list of available areas (Districts or Community Areas) with recorded incident counts.
    """
    schema = get_schema_for_dataset(dataset)
    area_col = "a.district" if granularity == "district" else "a.community_area"

    sql = f"""
        SELECT 
            {area_col} AS area_id,
            COUNT(f.crime_fact_key) AS total_incidents
        FROM {schema}.fact_crime f
        JOIN {schema}.dim_area a ON f.area_key = a.area_key
        WHERE {area_col} IS NOT NULL AND {area_col} NOT IN ('UNKNOWN', '0')
        GROUP BY {area_col}
        ORDER BY total_incidents DESC;
    """

    df = execute_query(sql)
    total_dataset_incidents = int(df["total_incidents"].sum()) if not df.empty else 1

    areas = []
    for _, row in df.iterrows():
        a_id = str(row["area_id"]).strip()
        cnt = int(row["total_incidents"])
        label = f"District {a_id.zfill(3)}" if granularity == "district" else f"Community Area #{a_id}"
        areas.append({
            "area_id": a_id,
            "label": label,
            "total_incidents": cnt,
            "share_pct": round((cnt / total_dataset_incidents) * 100, 2)
        })

    return {
        "dataset": dataset,
        "granularity": granularity,
        "total_dataset_incidents": total_dataset_incidents,
        "total_areas_count": len(areas),
        "areas": areas
    }


def calculate_entropy(category_counts: List[int]) -> float:
    """
    Calculates Shannon Entropy across category counts to quantify crime diversity.
    """
    total = sum(category_counts)
    if total <= 0:
        return 0.0
    entropy = 0.0
    for cnt in category_counts:
        if cnt > 0:
            p = cnt / total
            entropy -= p * math.log(p)
    return round(entropy, 4)


def get_area_profile(
    dataset: str = "real",
    granularity: str = "district",
    area_id: str = "001",
    filters: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Computes comprehensive 15-metric area intelligence profile for a single area.
    Integrates Phase 9 K-Means cluster assignment.
    """
    schema = get_schema_for_dataset(dataset)
    area_col = "a.district" if granularity == "district" else "a.community_area"
    clean_area_id = str(area_id).strip().zfill(3) if granularity == "district" else str(area_id).strip()

    where_sql, params = build_area_where_clause(filters)
    params["target_area_id"] = clean_area_id
    params["target_area_id_raw"] = str(area_id).strip()

    # 1. Total Incidents & Global Dataset Context
    sql_total_ds = f"SELECT COUNT(*) AS total FROM {schema}.fact_crime;"
    total_ds_incidents = int(execute_query(sql_total_ds)['total'].iloc[0])

    sql_main = f"""
        SELECT 
            COUNT(f.crime_fact_key) AS total_incidents,
            SUM(CASE WHEN s.arrest = TRUE THEN 1 ELSE 0 END) AS arrest_count,
            SUM(CASE WHEN s.domestic = TRUE THEN 1 ELSE 0 END) AS domestic_count,
            SUM(CASE WHEN LOWER(t.time_period) = 'night' THEN 1 ELSE 0 END) AS night_count,
            SUM(CASE WHEN t.is_weekend = TRUE THEN 1 ELSE 0 END) AS weekend_count,
            SUM(CASE WHEN l.latitude IS NOT NULL AND l.longitude IS NOT NULL AND l.latitude != 0 THEN 1 ELSE 0 END) AS spatially_eligible_count
        FROM {schema}.fact_crime f
        JOIN {schema}.dim_area a ON f.area_key = a.area_key
        JOIN {schema}.dim_time t ON f.time_key = t.time_key
        JOIN {schema}.dim_status s ON f.status_key = s.status_key
        JOIN {schema}.dim_location l ON f.location_key = l.location_key
        WHERE ({area_col} = :target_area_id OR {area_col} = :target_area_id_raw) {where_sql};
    """

    df_main = execute_query(sql_main, params)

    if df_main.empty or df_main["total_incidents"].iloc[0] == 0:
        return {
            "status": "NOT_FOUND",
            "area_id": clean_area_id,
            "granularity": granularity,
            "message": f"No recorded incidents found for {granularity} '{clean_area_id}'."
        }

    row_m = df_main.iloc[0]
    total_inc = int(row_m["total_incidents"])
    arrest_cnt = int(row_m["arrest_count"])
    domestic_cnt = int(row_m["domestic_count"])
    night_cnt = int(row_m["night_count"])
    weekend_cnt = int(row_m["weekend_count"])
    spatially_eligible_cnt = int(row_m["spatially_eligible_count"])

    arrest_pct = round((arrest_cnt / total_inc) * 100, 2)
    domestic_pct = round((domestic_cnt / total_inc) * 100, 2)
    night_pct = round((night_cnt / total_inc) * 100, 2)
    weekend_pct = round((weekend_cnt / total_inc) * 100, 2)
    dataset_share_pct = round((total_inc / total_ds_incidents) * 100, 2)
    spatial_coverage_pct = round((spatially_eligible_cnt / total_inc) * 100, 2)

    # 2. Crime Category Breakdown
    sql_cat = f"""
        SELECT c.primary_type, COUNT(f.crime_fact_key) AS count
        FROM {schema}.fact_crime f
        JOIN {schema}.dim_area a ON f.area_key = a.area_key
        JOIN {schema}.dim_time t ON f.time_key = t.time_key
        JOIN {schema}.dim_crime c ON f.crime_key = c.crime_key
        WHERE ({area_col} = :target_area_id OR {area_col} = :target_area_id_raw) {where_sql}
        GROUP BY c.primary_type
        ORDER BY count DESC;
    """

    df_cat = execute_query(sql_cat, params)
    category_list = []
    cat_counts = []

    for _, c_row in df_cat.iterrows():
        c_name = str(c_row["primary_type"])
        c_cnt = int(c_row["count"])
        cat_counts.append(c_cnt)
        category_list.append({
            "category": c_name,
            "count": c_cnt,
            "share_pct": round((c_cnt / total_inc) * 100, 2)
        })

    diversity_entropy = calculate_entropy(cat_counts)
    top_5_categories = category_list[:5]

    # 3. Hourly Distribution (0 to 23)
    sql_hourly = f"""
        SELECT t.hour, COUNT(f.crime_fact_key) AS count
        FROM {schema}.fact_crime f
        JOIN {schema}.dim_area a ON f.area_key = a.area_key
        JOIN {schema}.dim_time t ON f.time_key = t.time_key
        WHERE ({area_col} = :target_area_id OR {area_col} = :target_area_id_raw) {where_sql}
        GROUP BY t.hour
        ORDER BY t.hour ASC;
    """

    df_hourly = execute_query(sql_hourly, params)
    hourly_dict = {int(h): 0 for h in range(24)}
    for _, h_row in df_hourly.iterrows():
        if pd.notna(h_row["hour"]):
            hourly_dict[int(h_row["hour"])] = int(h_row["count"])

    hourly_list = [
        {
            "hour": h,
            "count": hourly_dict[h],
            "pct": round((hourly_dict[h] / total_inc) * 100, 2)
        }
        for h in range(24)
    ]

    # 4. Day of Week Distribution
    sql_day = f"""
        SELECT t.day_name, COUNT(f.crime_fact_key) AS count
        FROM {schema}.fact_crime f
        JOIN {schema}.dim_area a ON f.area_key = a.area_key
        JOIN {schema}.dim_time t ON f.time_key = t.time_key
        WHERE ({area_col} = :target_area_id OR {area_col} = :target_area_id_raw) {where_sql}
        GROUP BY t.day_name;
    """
    df_day = execute_query(sql_day, params)
    day_map = {row["day_name"]: int(row["count"]) for _, row in df_day.iterrows()}
    days_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    day_list = [
        {
            "day": d,
            "count": day_map.get(d, 0),
            "pct": round((day_map.get(d, 0) / total_inc) * 100, 2)
        }
        for d in days_order
    ]

    # 5. Monthly Distribution
    sql_month = f"""
        SELECT t.year, t.month, CONCAT(t.year, '-', LPAD(t.month::text, 2, '0')) AS year_month, COUNT(f.crime_fact_key) AS count
        FROM {schema}.fact_crime f
        JOIN {schema}.dim_area a ON f.area_key = a.area_key
        JOIN {schema}.dim_time t ON f.time_key = t.time_key
        WHERE ({area_col} = :target_area_id OR {area_col} = :target_area_id_raw) {where_sql}
        GROUP BY t.year, t.month
        ORDER BY t.year ASC, t.month ASC;
    """

    df_month = execute_query(sql_month, params)
    monthly_list = [
        {
            "year_month": str(m_row["year_month"]),
            "count": int(m_row["count"]),
            "pct": round((int(m_row["count"]) / total_inc) * 100, 2)
        }
        for _, m_row in df_month.iterrows()
    ]

    # 6. Fetch K-Means Cluster Assignment from Phase 9 Service
    kmeans_info = {"cluster_id": None, "cluster_label": "Unclustered", "similar_areas": []}
    try:
        km_res = analyze_kmeans(dataset=dataset, area_granularity=granularity, k=4)
        if km_res.get("status") != "INSUFFICIENT_DATA":
            memberships = km_res.get("area_memberships", [])
            matched = next((m for m in memberships if str(m["area_id"]).strip() == str(clean_area_id).strip() or str(m["area_id"]).strip() == str(area_id).strip()), None)
            if matched:
                c_id = matched["cluster_id"]
                cluster_obj = next((c for c in km_res.get("clusters", []) if c["cluster_id"] == c_id), None)
                c_label = cluster_obj["cluster_label"] if cluster_obj else f"Cluster #{c_id}"
                similar_members = [m["area_name"] for m in memberships if m["cluster_id"] == c_id and m["area_id"] != matched["area_id"]]

                kmeans_info = {
                    "cluster_id": c_id,
                    "cluster_label": c_label,
                    "similar_areas": similar_members[:5]
                }
    except Exception as e:
        print(f"K-Means integration soft warning: {e}")

    area_label = f"District {clean_area_id}" if granularity == "district" else f"Community Area #{clean_area_id}"

    return {
        "status": "SUCCESS",
        "area_id": clean_area_id,
        "area_label": area_label,
        "granularity": granularity,
        "dataset": dataset,
        "kpi": {
            "total_incidents": total_inc,
            "dataset_share_pct": dataset_share_pct,
            "arrest_count": arrest_cnt,
            "arrest_pct": arrest_pct,
            "domestic_count": domestic_cnt,
            "domestic_pct": domestic_pct,
            "night_count": night_cnt,
            "night_pct": night_pct,
            "weekend_count": weekend_cnt,
            "weekend_pct": weekend_pct,
            "spatially_eligible_count": spatially_eligible_cnt,
            "spatial_coverage_pct": spatial_coverage_pct,
            "crime_diversity_entropy": diversity_entropy
        },
        "top_categories": top_5_categories,
        "categories_all": category_list,
        "hourly_distribution": hourly_list,
        "day_distribution": day_list,
        "monthly_distribution": monthly_list,
        "kmeans_cluster": kmeans_info
    }


def compare_two_areas(
    dataset: str = "real",
    granularity: str = "district",
    area_id_a: str = "001",
    area_id_b: str = "002",
    filters: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Performs side-by-side sample-normalized comparison between Area A and Area B.
    Calculates absolute differences (Δabs), percentage-point differences (Δpp),
    category overlap, and evidence-based scorecards.
    """
    filter_str = json.dumps(filters or {}, sort_keys=True)
    cache_key = f"ds_{dataset}_gran_{granularity}_a_{area_id_a}_b_{area_id_b}_flt_{filter_str}"

    if cache_key in AREA_INTEL_CACHE:
        return AREA_INTEL_CACHE[cache_key]

    prof_a = get_area_profile(dataset, granularity, area_id_a, filters)
    prof_b = get_area_profile(dataset, granularity, area_id_b, filters)

    if prof_a.get("status") != "SUCCESS" or prof_b.get("status") != "SUCCESS":
        return {
            "status": "ERROR",
            "message": "One or both selected areas have no recorded data matching the filters."
        }

    kpi_a = prof_a["kpi"]
    kpi_b = prof_b["kpi"]

    # Calculate Percentage-Point Differences (Δpp = Area A - Area B)
    diff_metrics = {
        "incidents_diff_abs": kpi_a["total_incidents"] - kpi_b["total_incidents"],
        "dataset_share_diff_pp": round(kpi_a["dataset_share_pct"] - kpi_b["dataset_share_pct"], 2),
        "arrest_diff_pp": round(kpi_a["arrest_pct"] - kpi_b["arrest_pct"], 2),
        "domestic_diff_pp": round(kpi_a["domestic_pct"] - kpi_b["domestic_pct"], 2),
        "night_diff_pp": round(kpi_a["night_pct"] - kpi_b["night_pct"], 2),
        "weekend_diff_pp": round(kpi_a["weekend_pct"] - kpi_b["weekend_pct"], 2),
        "entropy_diff_abs": round(kpi_a["crime_diversity_entropy"] - kpi_b["crime_diversity_entropy"], 4)
    }

    # Relative incident ratio (only when B > 0)
    if kpi_b["total_incidents"] > 0:
        diff_metrics["incidents_relative_ratio"] = round(kpi_a["total_incidents"] / kpi_b["total_incidents"], 2)
    else:
        diff_metrics["incidents_relative_ratio"] = 1.0

    # Grouped Category Comparison Table
    cats_a_map = {c["category"]: c["share_pct"] for c in prof_a["categories_all"]}
    cats_b_map = {c["category"]: c["share_pct"] for c in prof_b["categories_all"]}
    all_categories = sorted(list(set(cats_a_map.keys()).union(set(cats_b_map.keys()))))

    category_comparison = []
    for cat in all_categories:
        pct_a = cats_a_map.get(cat, 0.0)
        pct_b = cats_b_map.get(cat, 0.0)
        diff_pp = round(pct_a - pct_b, 2)
        dominant = "Area A" if diff_pp > 0 else ("Area B" if diff_pp < 0 else "Equal")
        category_comparison.append({
            "category": cat,
            "pct_a": pct_a,
            "pct_b": pct_b,
            "diff_pp": diff_pp,
            "dominant": dominant
        })

    category_comparison.sort(key=lambda x: abs(x["diff_pp"]), reverse=True)

    # Hourly Combined Series
    hr_a_map = {h["hour"]: h["pct"] for h in prof_a["hourly_distribution"]}
    hr_b_map = {h["hour"]: h["pct"] for h in prof_b["hourly_distribution"]}
    hourly_comparison = [
        {
            "hour": h,
            "pct_a": hr_a_map.get(h, 0.0),
            "pct_b": hr_b_map.get(h, 0.0),
            "diff_pp": round(hr_a_map.get(h, 0.0) - hr_b_map.get(h, 0.0), 2)
        }
        for h in range(24)
    ]

    # Generate Evidence-Based Deterministic Insights
    insights = []
    if abs(diff_metrics["arrest_diff_pp"]) >= 1.0:
        higher_area = prof_a["area_label"] if diff_metrics["arrest_diff_pp"] > 0 else prof_b["area_label"]
        lower_area = prof_b["area_label"] if diff_metrics["arrest_diff_pp"] > 0 else prof_a["area_label"]
        insights.append(f"{higher_area} exhibits a +{abs(diff_metrics['arrest_diff_pp'])} pp higher arrest rate ({max(kpi_a['arrest_pct'], kpi_b['arrest_pct'])}%) than {lower_area} ({min(kpi_a['arrest_pct'], kpi_b['arrest_pct'])}%) within the analyzed sample.")

    if abs(diff_metrics["domestic_diff_pp"]) >= 1.0:
        higher_area = prof_a["area_label"] if diff_metrics["domestic_diff_pp"] > 0 else prof_b["area_label"]
        lower_area = prof_b["area_label"] if diff_metrics["domestic_diff_pp"] > 0 else prof_a["area_label"]
        insights.append(f"{higher_area} has a +{abs(diff_metrics['domestic_diff_pp'])} pp higher share of domestic incidents than {lower_area}.")

    if abs(diff_metrics["night_diff_pp"]) >= 1.0:
        higher_area = prof_a["area_label"] if diff_metrics["night_diff_pp"] > 0 else prof_b["area_label"]
        insights.append(f"{higher_area} records a higher proportion of nighttime incidents (+{abs(diff_metrics['night_diff_pp'])} pp).")

    top_diff_cat = category_comparison[0] if category_comparison else None
    if top_diff_cat and abs(top_diff_cat["diff_pp"]) >= 2.0:
        dom_area = prof_a["area_label"] if top_diff_cat["diff_pp"] > 0 else prof_b["area_label"]
        insights.append(f"Crime composition differs most in '{top_diff_cat['category']}', which comprises a higher share in {dom_area} ({max(top_diff_cat['pct_a'], top_diff_cat['pct_b'])}% vs {min(top_diff_cat['pct_a'], top_diff_cat['pct_b'])}%).")

    schema = get_schema_for_dataset(dataset)
    disclaimer = (
        "SIMULATED DATA — Comparison generated from synthetic crime dataset for demonstration."
        if schema == "synthetic_data"
        else "Historical Chicago crime dataset. Comparison reflects recorded sample proportions; sample sizes vary by area and DO NOT represent overall public safety forecasts."
    )

    result = {
        "status": "SUCCESS",
        "dataset": dataset,
        "granularity": granularity,
        "area_a": prof_a,
        "area_b": prof_b,
        "comparison_metrics": diff_metrics,
        "category_comparison": category_comparison,
        "hourly_comparison": hourly_comparison,
        "insights": insights,
        "disclaimer": disclaimer
    }

    if len(AREA_INTEL_CACHE) >= CACHE_MAX_SIZE:
        AREA_INTEL_CACHE.pop(next(iter(AREA_INTEL_CACHE)))
    AREA_INTEL_CACHE[cache_key] = result

    return result


def get_area_explanation_metadata() -> Dict[str, Any]:
    """
    Returns educational documentation and DWM theory for Area Intelligence & Comparison.
    """
    return {
        "title": "Area Intelligence, OLAP Slicing & Sample Normalization",
        "concepts": [
            {
                "term": "Area-Level Aggregation",
                "definition": "Rolls up individual crime facts from fact_crime to dim_area administrative granularities (Police Districts or Community Areas)."
            },
            {
                "term": "Sample Normalization (Proportions)",
                "definition": "To account for unequal sample coverage between areas, comparisons analyze internal percentage shares (e.g. % Theft, % Nighttime) rather than unadjusted raw counts."
            },
            {
                "term": "Percentage-Point Difference (Δpp)",
                "formula": "\\Delta \\text{pp} = \\text{Share}_A(\\%) - \\text{Share}_B(\\%)",
                "definition": "Measures the absolute arithmetic difference between two percentage values, avoiding zero-denominator errors."
            },
            {
                "term": "Shannon Entropy (Crime Diversity)",
                "formula": "H = -\\sum_{c} p_c \\ln(p_c)",
                "definition": "Quantifies the dispersion of crime types in an area. High entropy indicates a diverse mix of crimes; low entropy indicates specialization."
            },
            {
                "term": "K-Means Cluster Integration",
                "definition": "Links individual area profiles to Phase 9 K-Means cluster centroids to identify structurally similar regions across Chicago."
            }
        ],
        "non_causality_note": (
            "Comparisons demonstrate historical statistical differences in recorded sample proportions. "
            "They do not imply causation, police performance scores, or predictive safety rankings."
        )
    }


def get_district_boundaries_geojson() -> Dict[str, Any]:
    """
    Returns the official City of Chicago Police District boundaries GeoJSON
    with verified coordinate reference system documentation.
    """
    geojson_path = os.path.join(BASE_DIR, "data", "chicago_police_districts.geojson")
    if not os.path.exists(geojson_path):
        geojson_path = os.path.join(os.path.dirname(BASE_DIR), "frontend", "public", "data", "chicago_police_districts.geojson")
    
    if os.path.exists(geojson_path):
        with open(geojson_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"type": "FeatureCollection", "features": [], "metadata": {}}


def get_districts_choropleth_summary(
    dataset: str = "real",
    filters: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Computes district-level aggregated crime counts, arrest proportions, and dominant categories
    across Chicago Police Districts for Choropleth map visualization.
    """
    cached = GLOBAL_CACHE.get("districts_summary", dataset, filters)
    if cached is not None:
        return cached

    schema = get_schema_for_dataset(dataset)
    where_sql, params = build_area_where_clause(filters)

    sql = f"""
        SELECT 
            a.district,
            COUNT(f.crime_fact_key) AS total_incidents,
            SUM(CASE WHEN s.arrest = TRUE THEN 1 ELSE 0 END) AS arrest_count,
            SUM(CASE WHEN s.domestic = TRUE THEN 1 ELSE 0 END) AS domestic_count,
            SUM(CASE WHEN LOWER(t.time_period) = 'night' THEN 1 ELSE 0 END) AS night_count
        FROM {schema}.fact_crime f
        JOIN {schema}.dim_area a ON f.area_key = a.area_key
        JOIN {schema}.dim_time t ON f.time_key = t.time_key
        JOIN {schema}.dim_status s ON f.status_key = s.status_key
        JOIN {schema}.dim_crime c ON f.crime_key = c.crime_key
        WHERE a.district IS NOT NULL AND a.district NOT IN ('UNKNOWN', '0')
        {where_sql}
        GROUP BY a.district
        ORDER BY total_incidents DESC;
    """

    df = execute_query(sql, params)
    
    total_incidents = int(df["total_incidents"].sum()) if not df.empty else 0
    min_count = int(df["total_incidents"].min()) if not df.empty else 0
    max_count = int(df["total_incidents"].max()) if not df.empty else 0
    avg_count = round(float(df["total_incidents"].mean()), 1) if not df.empty else 0

    # Query top crime category per district
    sql_top_cat = f"""
        WITH RankedCats AS (
            SELECT 
                a.district,
                c.primary_type,
                COUNT(f.crime_fact_key) AS cnt,
                ROW_NUMBER() OVER (PARTITION BY a.district ORDER BY COUNT(f.crime_fact_key) DESC) AS rnk
            FROM {schema}.fact_crime f
            JOIN {schema}.dim_area a ON f.area_key = a.area_key
            JOIN {schema}.dim_time t ON f.time_key = t.time_key
            JOIN {schema}.dim_status s ON f.status_key = s.status_key
            JOIN {schema}.dim_crime c ON f.crime_key = c.crime_key
            WHERE a.district IS NOT NULL AND a.district NOT IN ('UNKNOWN', '0')
            {where_sql}
            GROUP BY a.district, c.primary_type
        )
        SELECT district, primary_type FROM RankedCats WHERE rnk = 1;
    """
    df_top_cat = execute_query(sql_top_cat, params)
    top_cat_map = dict(zip(df_top_cat["district"].astype(str), df_top_cat["primary_type"].astype(str))) if not df_top_cat.empty else {}

    districts_dict = {}
    district_list = []

    for _, row in df.iterrows():
        raw_dist = str(row["district"]).strip()
        cnt = int(row["total_incidents"])
        arr_cnt = int(row["arrest_count"])
        dom_cnt = int(row["domestic_count"])
        ngt_cnt = int(row["night_count"])
        
        arr_pct = round((arr_cnt / cnt * 100), 1) if cnt > 0 else 0.0
        dom_pct = round((dom_cnt / cnt * 100), 1) if cnt > 0 else 0.0
        ngt_pct = round((ngt_cnt / cnt * 100), 1) if cnt > 0 else 0.0
        share_pct = round((cnt / total_incidents * 100), 2) if total_incidents > 0 else 0.0

        top_cat = top_cat_map.get(raw_dist, "THEFT")

        info = {
            "district": raw_dist,
            "district_label": f"District {raw_dist.zfill(3)}",
            "total_incidents": cnt,
            "dataset_share_pct": share_pct,
            "arrest_count": arr_cnt,
            "arrest_pct": arr_pct,
            "domestic_count": dom_cnt,
            "domestic_pct": dom_pct,
            "night_count": ngt_cnt,
            "night_pct": ngt_pct,
            "top_category": top_cat
        }
        district_list.append(info)
        # Store under both raw and zero-padded keys for resilient matching with GeoJSON
        districts_dict[raw_dist] = info
        districts_dict[raw_dist.zfill(3)] = info
        districts_dict[raw_dist.lstrip('0') or '0'] = info

    disclaimer = (
        "Incident volumes represent recorded sample rows in PostgreSQL warehouse. "
        "Do NOT interpret raw incident counts as crime rates or risk scores without population or exposure denominators."
    )

    result = {
        "dataset": dataset,
        "total_filtered_incidents": total_incidents,
        "min_district_incidents": min_count,
        "max_district_incidents": max_count,
        "avg_district_incidents": avg_count,
        "district_count": len(district_list),
        "districts_data": districts_dict,
        "district_list": district_list,
        "disclaimer": disclaimer
    }
    GLOBAL_CACHE.set("districts_summary", dataset, result, filters, ttl=300)
    return result


def get_geocoded_incidents(
    dataset: str = "real",
    filters: Optional[Dict[str, Any]] = None,
    limit: int = 2000,
    bounds: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Returns actual geocoded incidents from the PostgreSQL warehouse with
    coordinates, time attributes, crime classification, and privacy-preserving block redaction.
    """
    schema = get_schema_for_dataset(dataset)
    where_sql, params = build_area_where_clause(filters)

    bounds_sql = ""
    if bounds:
        bounds_sql = """
            AND l.latitude >= :min_lat AND l.latitude <= :max_lat
            AND l.longitude >= :min_lon AND l.longitude <= :max_lon
        """
        params.update({
            "min_lat": float(bounds.get("min_lat", 41.60)),
            "max_lat": float(bounds.get("max_lat", 42.10)),
            "min_lon": float(bounds.get("min_lon", -87.95)),
            "max_lon": float(bounds.get("max_lon", -87.50))
        })

    effective_limit = min(max(int(limit), 100), 5000)
    params["limit"] = effective_limit

    sql = f"""
        SELECT 
            f.crime_fact_key AS id,
            ROUND(l.latitude::numeric, 5) AS lat,
            ROUND(l.longitude::numeric, 5) AS lon,
            c.primary_type AS category,
            c.description AS description,
            t.full_date AS date,
            t.time_period AS time_period,
            t.hour AS hour,
            s.arrest AS arrest,
            s.domestic AS domestic,
            a.district AS district,
            COALESCE(l.block, 'CHICAGO URBAN BLOCK') AS block
        FROM {schema}.fact_crime f
        JOIN {schema}.dim_location l ON f.location_key = l.location_key
        JOIN {schema}.dim_crime c ON f.crime_key = c.crime_key
        JOIN {schema}.dim_status s ON f.status_key = s.status_key
        JOIN {schema}.dim_time t ON f.time_key = t.time_key
        JOIN {schema}.dim_area a ON f.area_key = a.area_key
        WHERE l.latitude IS NOT NULL AND l.longitude IS NOT NULL
          AND l.latitude BETWEEN 41.60 AND 42.10 
          AND l.longitude BETWEEN -87.95 AND -87.50
          {bounds_sql}
          {where_sql}
        ORDER BY f.crime_fact_key DESC
        LIMIT :limit;
    """

    df = execute_query(sql, params)
    incidents = []
    for _, row in df.iterrows():
        incidents.append({
            "id": int(row["id"]),
            "lat": float(row["lat"]),
            "lon": float(row["lon"]),
            "category": str(row["category"]),
            "description": str(row["description"]),
            "date": str(row["date"]),
            "time_period": str(row["time_period"]),
            "hour": int(row["hour"]),
            "arrest": bool(row["arrest"]),
            "domestic": bool(row["domestic"]),
            "district": str(row["district"]),
            "block": str(row["block"])
        })

    return {
        "dataset": dataset,
        "returned_count": len(incidents),
        "limit_applied": effective_limit,
        "incidents": incidents
    }


def get_density_heatmap_points(
    dataset: str = "real",
    filters: Optional[Dict[str, Any]] = None,
    limit: int = 5000
) -> Dict[str, Any]:
    """
    Returns lightweight [latitude, longitude, intensity] triplets for client-side density heatmap.
    """
    schema = get_schema_for_dataset(dataset)
    where_sql, params = build_area_where_clause(filters)
    effective_limit = min(max(int(limit), 100), 5000)
    params["limit"] = effective_limit

    sql = f"""
        SELECT 
            ROUND(l.latitude::numeric, 5) AS lat,
            ROUND(l.longitude::numeric, 5) AS lon
        FROM {schema}.fact_crime f
        JOIN {schema}.dim_location l ON f.location_key = l.location_key
        JOIN {schema}.dim_crime c ON f.crime_key = c.crime_key
        JOIN {schema}.dim_status s ON f.status_key = s.status_key
        JOIN {schema}.dim_time t ON f.time_key = t.time_key
        JOIN {schema}.dim_area a ON f.area_key = a.area_key
        WHERE l.latitude IS NOT NULL AND l.longitude IS NOT NULL
          AND l.latitude BETWEEN 41.60 AND 42.10 
          AND l.longitude BETWEEN -87.95 AND -87.50
          {where_sql}
        LIMIT :limit;
    """

    df = execute_query(sql, params)
    points = []
    for _, row in df.iterrows():
        points.append([float(row["lat"]), float(row["lon"]), 1.0])

    return {
        "dataset": dataset,
        "points_count": len(points),
        "points": points
    }


def get_district_tactical_profile(
    dataset: str = "real",
    district_id: str = "001",
    filters: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Returns tactical profile for a selected district, including crime breakdown,
    24-hour distribution, weekday patterns, and relevant DBSCAN hotspot clusters.
    """
    profile = get_area_profile(dataset=dataset, granularity="district", area_id=district_id, filters=filters)
    if profile.get("status") == "NOT_FOUND":
        return profile

    district_hotspots = []
    try:
        from services.hotspot_service import compute_dbscan_clusters
        ds_filters = dict(filters or {})
        ds_filters["district"] = district_id
        db_res = compute_dbscan_clusters(eps_meters=350, min_samples=15, filters=ds_filters, dataset=dataset)
        district_hotspots = db_res.get("clusters", [])[:5]
    except Exception as e:
        print(f"Hotspot fetch error for district {district_id}: {e}")

    profile["district_hotspots"] = district_hotspots
    return profile
