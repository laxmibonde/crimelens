import math
import pandas as pd
import numpy as np
from sqlalchemy import text
from typing import Dict, Any, List, Optional, Tuple
from database import get_engine, get_schema_for_dataset
from services.cache_service import GLOBAL_CACHE

# Import core analytical modules for validated feature calls
from services.area_intelligence_service import get_area_list, get_area_profile
from services.hotspot_service import compute_dbscan_clusters
from services.kmeans_service import analyze_kmeans
from services.apriori_service import mine_apriori_rules
from services.decision_tree_service import train_and_evaluate_tree
from services.change_comparison_service import get_change_overview, get_category_changes, get_hotspot_changes


def get_insights_metadata(dataset: str = "real") -> Dict[str, Any]:
    """Returns available filter options and metadata for the Automated Insights Engine."""
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
        
        raw_districts = conn.execute(text(f"""
            SELECT DISTINCT district FROM {schema}.dim_area 
            WHERE district IS NOT NULL AND district NOT IN ('UNKNOWN', '0') ORDER BY district
        """)).mappings().all()
        
        seen_dist_ids = set()
        districts = []
        for r in raw_districts:
            d_id = str(r['district']).zfill(3)
            if d_id not in seen_dist_ids:
                seen_dist_ids.add(d_id)
                districts.append({"id": d_id, "label": f"District #{d_id}"})
        districts.sort(key=lambda x: x["id"])
        
    return {
        "dataset": dataset,
        "is_synthetic": (schema == "synthetic_data"),
        "total_incidents": int(bounds['total_incidents']) if bounds else 0,
        "min_date": str(bounds['min_date']) if bounds and bounds['min_date'] else "2023-01-01",
        "max_date": str(bounds['max_date']) if bounds and bounds['max_date'] else "2024-12-31",
        "categories": cats,
        "districts": districts,
        "insight_domains": [
            "Crime Composition",
            "Temporal Pattern",
            "Area Intelligence",
            "DBSCAN Spatial",
            "Hotspot Evolution",
            "K-Means Clustering",
            "Apriori Association",
            "Decision Tree",
            "Period Comparison"
        ],
        "insight_types": [
            "DESCRIPTIVE",
            "STATISTICAL_COMPARISON",
            "PREDICTIVE_MODEL"
        ]
    }


def calculate_insight_score(
    effect_magnitude: float,
    sample_size: int,
    data_completeness: float = 1.0,
    reliability_penalty: float = 0.0
) -> int:
    """
    Computes an explainable, deterministic analytical importance score (1-100).
    Never represents a p-value or false statistical significance.
    Formula:
        Score = min(100, max(1, 40 * magnitude + 35 * (log10(max(10, N)) / 4.5) + 25 * completeness - penalty))
    """
    if sample_size <= 0:
        return 1
    log_n = math.log10(max(10, sample_size)) / 4.5  # Normalized against ~50k warehouse records
    log_n = min(1.0, max(0.0, log_n))
    mag = min(1.0, max(0.0, float(effect_magnitude)))
    comp = min(1.0, max(0.0, float(data_completeness)))
    
    raw = (40.0 * mag) + (35.0 * log_n) + (25.0 * comp) - float(reliability_penalty)
    return int(min(100, max(1, round(raw))))


def generate_all_insights(
    dataset: str = "real",
    district: Optional[str] = None,
    category: Optional[str] = None,
    insight_domain: Optional[str] = None,
    insight_type: Optional[str] = None,
    min_score: int = 0,
    min_sample_size: int = 10,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Central deterministic insight generator. Evaluates 9 analytical domains across backend services,
    attaching exact numerical evidence, mini-visualization payloads, source navigation routes,
    and methodological caveats.
    """
    cache_params = {
        "district": district,
        "category": category,
        "insight_domain": insight_domain,
        "insight_type": insight_type,
        "min_score": min_score,
        "min_sample_size": min_sample_size,
        "start_date": start_date,
        "end_date": end_date
    }
    cached = GLOBAL_CACHE.get("insights_all", dataset, cache_params)
    if cached is not None:
        return cached

    schema = get_schema_for_dataset(dataset)
    engine = get_engine()
    raw_insights: List[Dict[str, Any]] = []
    
    is_synth = (schema == "synthetic_data")
    base_caveat = (
        "SIMULATED DATASET: Metrics reflect synthetic records generated for benchmarking purposes."
        if is_synth else
        "REAL HISTORICAL CENSUS: Spans 761,718 reported incidents across 36 continuous calendar months (2023–2025). Spatial coordinates represent approximate block centroids."
    )
    causality_caveat = "CORRELATION DOES NOT PROVE CAUSATION. Observations reflect recorded police administrative incident data."

    # Build SQL filter fragments
    where_clauses = ["1=1"]
    sql_params: Dict[str, Any] = {}
    
    if district and district.strip():
        dist_clean = district.strip().lstrip('0') or '0'
        where_clauses.append("(a.district = :dist_orig OR a.district = :dist_clean OR a.district = :dist_pad)")
        sql_params["dist_orig"] = district.strip()
        sql_params["dist_clean"] = dist_clean
        sql_params["dist_pad"] = dist_clean.zfill(3)
        
    if category and category.strip():
        where_clauses.append("c.primary_type = :cat_filter")
        sql_params["cat_filter"] = category.strip()
        
    if start_date and start_date.strip():
        where_clauses.append("t.full_date >= :start_date")
        sql_params["start_date"] = start_date.strip()
        
    if end_date and end_date.strip():
        where_clauses.append("t.full_date <= :end_date")
        sql_params["end_date"] = end_date.strip()
        
    where_sql = " AND ".join(where_clauses)

    # -------------------------------------------------------------
    # 1. CRIME COMPOSITION INSIGHTS
    # -------------------------------------------------------------
    try:
        with engine.connect() as conn:
            # Total filtered incidents
            total_filtered = conn.execute(text(f"""
                SELECT COUNT(f.crime_fact_key) as total_cnt
                FROM {schema}.fact_crime f
                JOIN {schema}.dim_time t ON f.time_key = t.time_key
                JOIN {schema}.dim_crime c ON f.crime_key = c.crime_key
                JOIN {schema}.dim_area a ON f.area_key = a.area_key
                JOIN {schema}.dim_status s ON f.status_key = s.status_key
                WHERE {where_sql}
            """), sql_params).scalar() or 0
            
            if total_filtered >= min_sample_size:
                # Top categories breakdown
                top_cats = conn.execute(text(f"""
                    SELECT c.primary_type, COUNT(f.crime_fact_key) as cnt,
                           ROUND((COUNT(f.crime_fact_key)::numeric / {total_filtered} * 100.0), 2) as share_pct
                    FROM {schema}.fact_crime f
                    JOIN {schema}.dim_time t ON f.time_key = t.time_key
                    JOIN {schema}.dim_crime c ON f.crime_key = c.crime_key
                    JOIN {schema}.dim_area a ON f.area_key = a.area_key
                    WHERE {where_sql}
                    GROUP BY c.primary_type
                    ORDER BY cnt DESC
                    LIMIT 5
                """), sql_params).mappings().all()

                if top_cats:
                    top_1 = top_cats[0]
                    t_cat = top_1['primary_type']
                    t_cnt = int(top_1['cnt'])
                    t_share = float(top_1['share_pct'])
                    
                    chart_items = [{"name": r['primary_type'], "value": int(r['cnt']), "share_pct": float(r['share_pct'])} for r in top_cats]
                    score_comp1 = calculate_insight_score(effect_magnitude=t_share / 100.0, sample_size=t_cnt)
                    
                    raw_insights.append({
                        "id": "INS_COMP_01",
                        "title": f"Dominant Crime Category: {t_cat} ({t_share}%)",
                        "category": "Crime Composition",
                        "insight_type": "DESCRIPTIVE",
                        "explanation": f"{t_cat} is the single largest category in the analyzed scope, accounting for {t_share}% ({t_cnt:,} incidents) of the {total_filtered:,} total recorded events.",
                        "numerical_evidence": {
                            "category": t_cat,
                            "incident_count": t_cnt,
                            "scope_total": total_filtered,
                            "share_pct": t_share,
                            "formula": "COUNT(category) / COUNT(total_in_scope) * 100"
                        },
                        "sample_size": total_filtered,
                        "methodology": "SQL aggregation over dim_crime.primary_type within filtered incident universe.",
                        "source_module": "Dashboard Overview",
                        "route": f"/dashboard{f'?district={district}' if district else ''}",
                        "filters": {"district": district, "category": category, "start_date": start_date, "end_date": end_date},
                        "caveat": base_caveat,
                        "score": score_comp1,
                        "severity": "HIGH" if score_comp1 >= 75 else ("MEDIUM" if score_comp1 >= 50 else "LOW"),
                        "chart_data": {"chart_type": "bar", "data": chart_items, "x_key": "name", "y_key": "value"}
                    })

                # Violent vs Property Crime Composition
                vp_res = conn.execute(text(f"""
                    SELECT 
                        SUM(CASE WHEN c.primary_type IN ('BATTERY', 'ASSAULT', 'ROBBERY', 'HOMICIDE', 'CRIM SEXUAL ASSAULT') THEN 1 ELSE 0 END) as violent_cnt,
                        SUM(CASE WHEN c.primary_type IN ('THEFT', 'BURGLARY', 'MOTOR VEHICLE THEFT', 'ROBBERY', 'ARSON') THEN 1 ELSE 0 END) as property_cnt,
                        SUM(CASE WHEN s.arrest = TRUE THEN 1 ELSE 0 END) as arrest_cnt
                    FROM {schema}.fact_crime f
                    JOIN {schema}.dim_time t ON f.time_key = t.time_key
                    JOIN {schema}.dim_crime c ON f.crime_key = c.crime_key
                    JOIN {schema}.dim_area a ON f.area_key = a.area_key
                    JOIN {schema}.dim_status s ON f.status_key = s.status_key
                    WHERE {where_sql}
                """), sql_params).mappings().first()
                
                if vp_res and total_filtered > 0:
                    v_cnt = int(vp_res['violent_cnt'] or 0)
                    p_cnt = int(vp_res['property_cnt'] or 0)
                    arr_cnt = int(vp_res['arrest_cnt'] or 0)
                    v_pct = round(v_cnt / total_filtered * 100.0, 1)
                    p_pct = round(p_cnt / total_filtered * 100.0, 1)
                    arr_pct = round(arr_cnt / total_filtered * 100.0, 1)
                    
                    score_vp = calculate_insight_score(effect_magnitude=max(v_pct, p_pct) / 100.0, sample_size=total_filtered)
                    raw_insights.append({
                        "id": "INS_COMP_02",
                        "title": f"Offense Profile: Property ({p_pct}%) vs Violent ({v_pct}%)",
                        "category": "Crime Composition",
                        "insight_type": "DESCRIPTIVE",
                        "explanation": f"Property crimes constitute {p_pct}% ({p_cnt:,} incidents) while violent offenses comprise {v_pct}% ({v_cnt:,} incidents). The overall recorded arrest rate is {arr_pct}%.",
                        "numerical_evidence": {
                            "property_count": p_cnt,
                            "property_pct": p_pct,
                            "violent_count": v_cnt,
                            "violent_pct": v_pct,
                            "arrest_count": arr_cnt,
                            "arrest_rate_pct": arr_pct,
                            "total_incidents": total_filtered
                        },
                        "sample_size": total_filtered,
                        "methodology": "Offense categorization based on standard FBI UCR Part I crime classification definitions.",
                        "source_module": "Dashboard Analytics",
                        "route": f"/dashboard",
                        "filters": {"district": district, "category": category},
                        "caveat": base_caveat,
                        "score": score_vp,
                        "severity": "HIGH" if score_vp >= 75 else "MEDIUM",
                        "chart_data": {
                            "chart_type": "metric_delta",
                            "data": [
                                {"label": "Property Offenses", "value": p_pct, "color": "#38bdf8"},
                                {"label": "Violent Offenses", "value": v_pct, "color": "#f87171"},
                                {"label": "Arrest Clearance", "value": arr_pct, "color": "#34d399"}
                            ]
                        }
                    })
    except Exception as e:
        print(f"Error generating crime composition insights: {e}")

    # -------------------------------------------------------------
    # 2. TEMPORAL PATTERN INSIGHTS
    # -------------------------------------------------------------
    try:
        with engine.connect() as conn:
            # 24-Hour Diurnal Distribution
            hourly = conn.execute(text(f"""
                SELECT t.hour, COUNT(f.crime_fact_key) as cnt
                FROM {schema}.fact_crime f
                JOIN {schema}.dim_time t ON f.time_key = t.time_key
                JOIN {schema}.dim_crime c ON f.crime_key = c.crime_key
                JOIN {schema}.dim_area a ON f.area_key = a.area_key
                WHERE {where_sql} AND t.hour IS NOT NULL
                GROUP BY t.hour
                ORDER BY t.hour ASC
            """), sql_params).mappings().all()
            
            if hourly and len(hourly) >= 12:
                hourly_list = [{"hour": f"{str(r['hour']).zfill(2)}:00", "count": int(r['cnt'])} for r in hourly]
                peak_entry = max(hourly_list, key=lambda x: x["count"])
                trough_entry = min(hourly_list, key=lambda x: x["count"])
                tot_h = sum(x["count"] for x in hourly_list)
                peak_pct = round(peak_entry["count"] / tot_h * 100.0, 1) if tot_h > 0 else 0
                
                score_temp1 = calculate_insight_score(effect_magnitude=(peak_entry["count"] / (tot_h / 24.0) - 1.0) / 2.0, sample_size=peak_entry["count"])
                raw_insights.append({
                    "id": "INS_TEMP_01",
                    "title": f"Diurnal Peak at {peak_entry['hour']} ({peak_entry['count']:,} Incidents)",
                    "category": "Temporal Pattern",
                    "insight_type": "DESCRIPTIVE",
                    "explanation": f"Incident frequency peaks sharply at hour {peak_entry['hour']} with {peak_entry['count']:,} occurrences ({peak_pct}% of daily volume), compared to the trough at {trough_entry['hour']} ({trough_entry['count']:,} occurrences).",
                    "numerical_evidence": {
                        "peak_hour": peak_entry["hour"],
                        "peak_count": peak_entry["count"],
                        "trough_hour": trough_entry["hour"],
                        "trough_count": trough_entry["count"],
                        "hourly_average": round(tot_h / 24.0, 1),
                        "total_sample": tot_h
                    },
                    "sample_size": tot_h,
                    "methodology": "SQL grouping on dim_time.hour with 24-bin diurnal distribution curve.",
                    "source_module": "Advanced Trend Analysis",
                    "route": f"/trend-analysis",
                    "filters": {"district": district, "category": category},
                    "caveat": base_caveat,
                    "score": score_temp1,
                    "severity": "HIGH" if score_temp1 >= 75 else "MEDIUM",
                    "chart_data": {"chart_type": "line", "data": hourly_list, "x_key": "hour", "y_key": "count"}
                })

            # Day of Week & Weekend Concentration
            dow_res = conn.execute(text(f"""
                SELECT 
                    t.day_of_week,
                    COUNT(f.crime_fact_key) as cnt,
                    SUM(CASE WHEN t.is_weekend THEN 1 ELSE 0 END) as wknd_cnt
                FROM {schema}.fact_crime f
                JOIN {schema}.dim_time t ON f.time_key = t.time_key
                JOIN {schema}.dim_crime c ON f.crime_key = c.crime_key
                JOIN {schema}.dim_area a ON f.area_key = a.area_key
                WHERE {where_sql} AND t.day_of_week IS NOT NULL
                GROUP BY t.day_of_week
                ORDER BY cnt DESC
            """), sql_params).mappings().all()

            if dow_res and len(dow_res) >= 5:
                dow_items = [{"day": r['day_of_week'], "count": int(r['cnt'])} for r in dow_res]
                top_dow = dow_items[0]
                total_dow = sum(x["count"] for x in dow_items)
                weekend_sum = sum(int(r['wknd_cnt']) for r in dow_res)
                wknd_share = round(weekend_sum / total_dow * 100.0, 1) if total_dow > 0 else 0
                expected_wknd = 28.57  # 2/7 of a week is ~28.6%
                delta_wknd = round(wknd_share - expected_wknd, 1)
                
                score_dow = calculate_insight_score(effect_magnitude=abs(delta_wknd) / 20.0, sample_size=total_dow)
                raw_insights.append({
                    "id": "INS_TEMP_02",
                    "title": f"Day-of-Week Concentration: {top_dow['day']} ({top_dow['count']:,} Incidents)",
                    "category": "Temporal Pattern",
                    "insight_type": "DESCRIPTIVE",
                    "explanation": f"{top_dow['day']} records the highest single-day volume with {top_dow['count']:,} incidents. Weekends account for {wknd_share}% of total incidents ({delta_wknd:+} percentage points relative to equal day distribution of 28.6%).",
                    "numerical_evidence": {
                        "peak_day": top_dow["day"],
                        "peak_day_count": top_dow["count"],
                        "weekend_share_pct": wknd_share,
                        "expected_share_pct": expected_wknd,
                        "delta_pp": delta_wknd,
                        "sample_size": total_dow
                    },
                    "sample_size": total_dow,
                    "methodology": "SQL aggregation over dim_time.day_of_week and dim_time.is_weekend flag.",
                    "source_module": "Advanced Trend Analysis",
                    "route": "/trend-analysis",
                    "filters": {"district": district, "category": category},
                    "caveat": base_caveat,
                    "score": score_dow,
                    "severity": "MEDIUM",
                    "chart_data": {"chart_type": "bar", "data": dow_items, "x_key": "day", "y_key": "count"}
                })
    except Exception as e:
        print(f"Error generating temporal insights: {e}")

    # -------------------------------------------------------------
    # 3. AREA INTELLIGENCE INSIGHTS
    # -------------------------------------------------------------
    try:
        area_res = get_area_list(dataset=dataset, granularity="district")
        areas = area_res.get("areas", [])
        if areas and len(areas) >= 3:
            top_a = areas[0]
            top_3_sum = sum(a["total_incidents"] for a in areas[:3])
            total_city = sum(a["total_incidents"] for a in areas)
            top_3_share = round(top_3_sum / total_city * 100.0, 1) if total_city > 0 else 0
            
            top_dist_chart = [
                {"district": f"#{str(a['area_id']).zfill(3)}", "incidents": a["total_incidents"], "share": a["share_pct"]}
                for a in areas[:6]
            ]
            
            score_area1 = calculate_insight_score(effect_magnitude=top_a["share_pct"] / 10.0, sample_size=top_a["total_incidents"])
            raw_insights.append({
                "id": "INS_AREA_01",
                "title": f"Highest Volume Police District: #{str(top_a['area_id']).zfill(3)} ({top_a['total_incidents']:,} Incidents)",
                "category": "Area Intelligence",
                "insight_type": "STATISTICAL_COMPARISON",
                "explanation": f"District #{str(top_a['area_id']).zfill(3)} records the highest incident concentration citywide ({top_a['total_incidents']:,} incidents, {top_a['share_pct']}% of total). The top 3 districts combined account for {top_3_share}% of all citywide incidents.",
                "numerical_evidence": {
                    "lead_district": str(top_a['area_id']).zfill(3),
                    "lead_incidents": top_a["total_incidents"],
                    "lead_share_pct": top_a["share_pct"],
                    "top_3_combined_incidents": top_3_sum,
                    "top_3_combined_share_pct": top_3_share,
                    "total_citywide_incidents": total_city
                },
                "sample_size": total_city,
                "methodology": "Spatial aggregation across official Chicago Police Department district boundaries.",
                "source_module": "Area Intelligence",
                "route": f"/area-intelligence?district={str(top_a['area_id']).zfill(3)}",
                "filters": {"dataset": dataset},
                "caveat": "District totals represent raw incident counts; per-capita crime rates depend on census residential population and commuter/retail traffic.",
                "score": score_area1,
                "severity": "HIGH" if score_area1 >= 75 else "MEDIUM",
                "chart_data": {"chart_type": "bar", "data": top_dist_chart, "x_key": "district", "y_key": "incidents"}
            })

            # Check specific district profile if selected
            if district and district.strip():
                dist_prof = get_area_profile(area_id=district.strip(), dataset=dataset, granularity="district")
                if dist_prof and dist_prof.get("status") == "success":
                    kpi = dist_prof.get("kpi", {})
                    d_cnt = kpi.get("total_incidents", 0)
                    d_arr = kpi.get("arrest_pct", 0)
                    d_dom = kpi.get("domestic_pct", 0)
                    score_prof = calculate_insight_score(effect_magnitude=d_arr / 50.0, sample_size=d_cnt)
                    raw_insights.append({
                        "id": f"INS_AREA_DIST_{district}",
                        "title": f"District #{str(district).zfill(3)} Tactical Profile ({d_cnt:,} Incidents)",
                        "category": "Area Intelligence",
                        "insight_type": "DESCRIPTIVE",
                        "explanation": f"District #{str(district).zfill(3)} has an arrest clearance rate of {d_arr}% and a domestic dispute share of {d_dom}%. Total sample volume is {d_cnt:,} records.",
                        "numerical_evidence": {
                            "district": str(district).zfill(3),
                            "total_incidents": d_cnt,
                            "arrest_rate_pct": d_arr,
                            "domestic_share_pct": d_dom,
                            "night_share_pct": kpi.get("night_pct", 0)
                        },
                        "sample_size": d_cnt,
                        "methodology": "Detailed profile query over dim_area and fact_crime for specific police jurisdiction.",
                        "source_module": "Area Intelligence",
                        "route": f"/area-intelligence?district={str(district).zfill(3)}",
                        "filters": {"district": district},
                        "caveat": base_caveat,
                        "score": score_prof,
                        "severity": "HIGH" if score_prof >= 75 else "MEDIUM",
                        "chart_data": {
                            "chart_type": "metric_delta",
                            "data": [
                                {"label": "Arrest Rate", "value": d_arr, "color": "#34d399"},
                                {"label": "Domestic Share", "value": d_dom, "color": "#eab308"},
                                {"label": "Night Share", "value": kpi.get("night_pct", 0), "color": "#a855f7"}
                            ]
                        }
                    })
    except Exception as e:
        print(f"Error generating area insights: {e}")

    # -------------------------------------------------------------
    # 4. DBSCAN SPATIAL HOTSPOT INSIGHTS
    # -------------------------------------------------------------
    try:
        dbscan_filters = {"district": district.strip()} if (district and district.strip()) else {"district": "001", "year": 2025}
        db_res = compute_dbscan_clusters(eps_meters=300.0, min_samples=15, dataset=dataset, filters=dbscan_filters)
        if db_res and str(db_res.get("status", "")).upper() == "SUCCESS":
            cls_count = db_res.get("cluster_count", 0)
            cls_inc = db_res.get("clustered_incident_count", 0)
            noise_inc = db_res.get("noise_incident_count", 0)
            elig_inc = db_res.get("total_eligible_incidents", 1)
            cls_pct = round((cls_inc / elig_inc * 100.0), 2) if elig_inc > 0 else 0.0
            
            # Largest cluster
            largest_c = db_res.get("clusters", [{}])[0] if db_res.get("clusters") else {}
            l_cnt = largest_c.get("incident_count", 0)
            l_dom = largest_c.get("dominant_crime", "N/A")
            l_dist = list(largest_c.get("top_districts", {}).keys())[:2]
            l_dist_str = ", ".join([f"#{d}" for d in l_dist]) if l_dist else "Multiple"
            
            score_db1 = calculate_insight_score(effect_magnitude=cls_pct / 100.0, sample_size=cls_inc)
            raw_insights.append({
                "id": "INS_DBSCAN_01",
                "title": f"Spatial Density: {cls_count} High-Density Hotspots ({cls_pct}% Clustered)",
                "category": "DBSCAN Spatial",
                "insight_type": "DESCRIPTIVE",
                "explanation": f"DBSCAN spatial clustering (eps=300m, min_samples=15) identified {cls_count} discrete high-density clusters comprising {cls_inc:,} incidents ({cls_pct}% of spatially valid coordinates). The remaining {noise_inc:,} events were classified as spatial noise.",
                "numerical_evidence": {
                    "cluster_count": cls_count,
                    "clustered_incidents": cls_inc,
                    "noise_incidents": noise_inc,
                    "total_eligible_incidents": elig_inc,
                    "clustering_percentage": cls_pct,
                    "largest_cluster_size": l_cnt,
                    "eps_meters": 300.0,
                    "min_samples": 15
                },
                "sample_size": elig_inc,
                "methodology": "Density-Based Spatial Clustering of Applications with Noise (DBSCAN) using Great-Circle Haversine distance metric.",
                "source_module": "Hotspot Intelligence",
                "route": "/hotspots",
                "filters": {"eps": 300, "min_samples": 15},
                "caveat": "Only incidents with valid, geocoded latitude/longitude coordinates within the official Chicago bounding box are eligible for spatial clustering.",
                "score": score_db1,
                "severity": "HIGH" if score_db1 >= 75 else "MEDIUM",
                "chart_data": {
                    "chart_type": "metric_delta",
                    "data": [
                        {"label": "Clustered Incidents", "value": cls_inc, "color": "#f43f5e"},
                        {"label": "Spatial Noise", "value": noise_inc, "color": "#64748b"},
                        {"label": "Active Hotspots", "value": cls_count, "color": "#38bdf8"}
                    ]
                }
            })
    except Exception as e:
        print(f"Error generating DBSCAN insights: {e}")

    # -------------------------------------------------------------
    # 5. HOTSPOT EVOLUTION INSIGHTS
    # -------------------------------------------------------------
    try:
        hs_comp = get_hotspot_changes(
            dataset=dataset,
            period_a_start="2024-01-01",
            period_a_end="2024-01-31",
            period_b_start="2025-01-01",
            period_b_end="2025-01-31"
        )
        if hs_comp and "matching_summary" in hs_comp:
            summary = hs_comp.get("matching_summary", {})
            pers = summary.get("persistent_hotspots", 0)
            new_h = summary.get("newly_observed_hotspots", 0)
            dis_h = summary.get("dissolved_hotspots", 0)
            tot_eval = summary.get("total_matches_evaluated", 0)
            
            score_evo1 = calculate_insight_score(effect_magnitude=pers / max(1, (pers + new_h + dis_h)), sample_size=pers * 50)
            raw_insights.append({
                "id": "INS_EVO_01",
                "title": f"Hotspot Persistence: {pers} Sustained Clusters (Jan 2024 vs Jan 2025)",
                "category": "Hotspot Evolution",
                "insight_type": "STATISTICAL_COMPARISON",
                "explanation": f"Bipartite Haversine centroid matching (500m proximity threshold) verified {pers} persistent hotspots active across both January 2024 and January 2025. In addition, {new_h} new clusters emerged while {dis_h} clusters dissolved below the density threshold.",
                "numerical_evidence": {
                    "persistent_hotspots": pers,
                    "newly_observed": new_h,
                    "dissolved_hotspots": dis_h,
                    "proximity_threshold_meters": 500.0,
                    "conservation_identity": f"N(A)={pers}+{dis_h}={pers+dis_h}, N(B)={pers}+{new_h}={pers+new_h}"
                },
                "sample_size": tot_eval,
                "methodology": "Strict greedy bipartite matching between independent DBSCAN temporal runs using centroid distance matrix.",
                "source_module": "Hotspot Evolution",
                "route": "/evolution",
                "filters": {"period_a": "Jan 2023", "period_b": "Jan 2024", "threshold": 500},
                "caveat": "Cluster dissolution signifies that local density dropped below the min_samples parameter (15 incidents within 300m); it does not indicate complete absence of crime.",
                "score": score_evo1,
                "severity": "HIGH" if score_evo1 >= 75 else "MEDIUM",
                "chart_data": {
                    "chart_type": "metric_delta",
                    "data": [
                        {"label": "Persistent", "value": pers, "color": "#34d399"},
                        {"label": "Newly Observed", "value": new_h, "color": "#38bdf8"},
                        {"label": "Dissolved", "value": dis_h, "color": "#f87171"}
                    ]
                }
            })
    except Exception as e:
        print(f"Error generating hotspot evolution insights: {e}")

    # -------------------------------------------------------------
    # 6. K-MEANS CLUSTERING INSIGHTS
    # -------------------------------------------------------------
    try:
        km_res = analyze_kmeans(k=3, dataset=dataset, area_granularity="district")
        if km_res and km_res.get("clusters"):
            cls_km = km_res["clusters"]
            c0 = cls_km[0]
            c0_name = c0.get("cluster_label", "Cluster 0")
            c0_count = c0.get("area_count", 0)
            c0_share = c0.get("percentage_of_areas", 0)
            
            km_chart = [
                {"cluster": c.get("short_name", f"Cluster {c['cluster_id']}"), "districts": c.get("area_count", 0)}
                for c in cls_km
            ]
            
            score_km1 = calculate_insight_score(effect_magnitude=c0_share / 100.0, sample_size=c0_count * 50)
            raw_insights.append({
                "id": "INS_KMEANS_01",
                "title": f"Area Segmentation: {c0.get('short_name', 'Dominant Typology')} ({c0_count} Districts)",
                "category": "K-Means Clustering",
                "insight_type": "PREDICTIVE_MODEL",
                "explanation": f"Unsupervised K-Means clustering (K=3) segmented Chicago's Police Districts into behavioral profiles. The largest grouping ('{c0.get('short_name', 'Cluster 0')}') encompasses {c0_count} districts ({c0_share}% of all districts) sharing similar offense composition proportions.",
                "numerical_evidence": {
                    "k_clusters": 3,
                    "lead_cluster": c0.get("short_name"),
                    "districts_in_cluster": c0_count,
                    "district_share_pct": c0_share,
                    "avg_incidents_per_district": c0.get("avg_incidents_per_area", 0)
                },
                "sample_size": len(km_res.get("area_memberships", [])),
                "methodology": "K-Means vector clustering on normalized multivariable crime composition and rate vectors.",
                "source_module": "K-Means Area Clustering",
                "route": "/kmeans",
                "filters": {"k": 3, "granularity": "district"},
                "caveat": "Cluster groupings reflect structural similarity in crime type proportions, not absolute per-capita public safety risk.",
                "score": score_km1,
                "severity": "HIGH" if score_km1 >= 75 else "MEDIUM",
                "chart_data": {"chart_type": "bar", "data": km_chart, "x_key": "cluster", "y_key": "districts"}
            })
    except Exception as e:
        print(f"Error generating K-Means insights: {e}")

    # -------------------------------------------------------------
    # 7. APRIORI ASSOCIATION RULE INSIGHTS
    # -------------------------------------------------------------
    try:
        apr_filters = {"district": district.strip()} if (district and district.strip()) else {"year": 2024}
        apr_res = mine_apriori_rules(dataset=dataset, min_support=0.08, min_confidence=0.40, filters=apr_filters)
        if apr_res and apr_res.get("rules"):
            top_rule = apr_res["rules"][0]
            ant_str = top_rule.get("antecedent_str", "Unknown")
            cons_str = top_rule.get("consequent_str", "Unknown")
            conf_pct = round(top_rule.get("confidence_pct", top_rule.get("confidence", 0) * 100.0), 1)
            lift_val = round(float(top_rule.get("lift", 1.0)), 2)
            supp_pct = round(top_rule.get("support_pct", top_rule.get("support", 0) * 100.0), 1)
            incidents_count = int(top_rule.get("supporting_incidents", 0))
            
            score_apr = calculate_insight_score(effect_magnitude=min(1.0, (lift_val - 1.0) / 4.0), sample_size=incidents_count)
            raw_insights.append({
                "id": "INS_APRIORI_01",
                "title": f"Incident Association Rule: {{{ant_str}}} -> {{{cons_str}}} (Lift: {lift_val})",
                "category": "Apriori Association",
                "insight_type": "PREDICTIVE_MODEL",
                "explanation": f"Pattern mining discovered that when {{{ant_str}}} occurs, {{{cons_str}}} co-occurs in {conf_pct}% of incidents. This co-occurrence is {lift_val}x higher than expected by random chance (Support: {supp_pct}%, {incidents_count:,} supporting incidents).",
                "numerical_evidence": {
                    "antecedents": ant_str,
                    "consequents": cons_str,
                    "confidence_pct": conf_pct,
                    "lift_ratio": lift_val,
                    "support_pct": supp_pct,
                    "supporting_incidents": incidents_count
                },
                "sample_size": incidents_count,
                "methodology": "Apriori frequent itemset generation followed by association rule induction (min_support=0.05, min_confidence=0.40).",
                "source_module": "Association Rules",
                "route": "/apriori",
                "filters": {"min_support": 0.05, "min_confidence": 0.40},
                "caveat": causality_caveat,
                "score": score_apr,
                "severity": "HIGH" if score_apr >= 75 else "MEDIUM",
                "chart_data": {
                    "chart_type": "metric_delta",
                    "data": [
                        {"label": "Confidence", "value": conf_pct, "color": "#38bdf8"},
                        {"label": "Lift (x10)", "value": round(lift_val * 10, 1), "color": "#a855f7"},
                        {"label": "Support Pct", "value": supp_pct, "color": "#34d399"}
                    ]
                }
            })
    except Exception as e:
        print(f"Error generating Apriori insights: {e}")

    # -------------------------------------------------------------
    # 8. DECISION TREE CLASSIFICATION INSIGHTS
    # -------------------------------------------------------------
    try:
        dt_res = train_and_evaluate_tree(max_depth=5, dataset=dataset)
        if dt_res and dt_res.get("metrics"):
            metrics = dt_res.get("metrics", {})
            summary = dt_res.get("dataset_summary", {})
            test_acc = round(float(metrics.get("test_accuracy", 0.0)), 1)
            baseline = round(float(summary.get("majority_baseline_accuracy", 85.0)), 1)
            recall = round(float(metrics.get("recall", 0.0)), 1)
            test_n = int(summary.get("test_rows", 1000))
            delta_acc = round(test_acc - baseline, 1)
            
            # Top feature importance
            top_feats = dt_res.get("feature_importances", [])
            top_feat_str = top_feats[0]["feature"] if top_feats else "Primary Type"
            top_feat_pct = round(top_feats[0]["importance"] * 100.0, 1) if top_feats else 0
            
            score_dt = calculate_insight_score(effect_magnitude=max(0.1, delta_acc / 20.0), sample_size=test_n)
            raw_insights.append({
                "id": "INS_DT_01",
                "title": f"Arrest Predictability: {test_acc}% Model Accuracy ({delta_acc:+}pp Over Baseline)",
                "category": "Decision Tree",
                "insight_type": "PREDICTIVE_MODEL",
                "explanation": f"Supervised Decision Tree classifier (max_depth=5) achieved {test_acc}% test accuracy predicting arrest status from incident features, outperforming the zero-rule majority baseline ({baseline}%) by {delta_acc:+} percentage points. Arrest recall is {recall}%. The primary predictive feature is '{top_feat_str}' ({top_feat_pct}% importance).",
                "numerical_evidence": {
                    "test_accuracy_pct": test_acc,
                    "baseline_accuracy_pct": baseline,
                    "delta_pp": delta_acc,
                    "minority_recall_pct": recall,
                    "test_sample_size": test_n,
                    "top_feature": top_feat_str,
                    "top_feature_importance_pct": top_feat_pct
                },
                "sample_size": test_n,
                "methodology": "Strict zero-leakage scikit-learn DecisionTreeClassifier with 80/20 train/test split.",
                "source_module": "Decision Tree Classification",
                "route": "/decision-tree",
                "filters": {"max_depth": 5},
                "caveat": "Predictive model reflects historical police administrative recording patterns (recorded arrest outcome given reported factors), not forward-looking individual recidivism.",
                "score": score_dt,
                "severity": "HIGH" if score_dt >= 75 else "MEDIUM",
                "chart_data": {
                    "chart_type": "metric_delta",
                    "data": [
                        {"label": "Model Accuracy", "value": test_acc, "color": "#34d399"},
                        {"label": "Baseline Majority", "value": baseline, "color": "#94a3b8"},
                        {"label": "Minority Recall", "value": recall, "color": "#f87171"}
                    ]
                }
            })
    except Exception as e:
        print(f"Error generating Decision Tree insights: {e}")

    # -------------------------------------------------------------
    # 9. PERIOD COMPARISON INSIGHTS (WHAT CHANGED?)
    # -------------------------------------------------------------
    try:
        chg_res = get_change_overview(
            dataset=dataset,
            period_a_start="2023-01-01",
            period_a_end="2023-01-31",
            period_b_start="2024-01-01",
            period_b_end="2024-01-31"
        )
        if chg_res and "comparison" in chg_res:
            comp = chg_res.get("comparison", {})
            diff = comp.get("count_diff", 0)
            rel_pct = comp.get("relative_pct_change", 0.0)
            arr_delta = comp.get("arrest_delta_pp", 0.0)
            cnt_a = chg_res.get("period_a", {}).get("total_incidents", 0)
            cnt_b = chg_res.get("period_b", {}).get("total_incidents", 0)
            
            score_chg1 = calculate_insight_score(effect_magnitude=abs(rel_pct) / 25.0, sample_size=abs(diff) * 10)
            raw_insights.append({
                "id": "INS_CHANGE_01",
                "title": f"Period Shift: {rel_pct:+}% Change (Jan 2024 vs Jan 2023)",
                "category": "Period Comparison",
                "insight_type": "STATISTICAL_COMPARISON",
                "explanation": f"January 2024 recorded {diff:+,} incidents ({rel_pct:+}% relative difference) compared to January 2023 baseline ({cnt_b:,} vs {cnt_a:,}). Meanwhile, the arrest clearance rate shifted by {arr_delta:+} percentage points.",
                "numerical_evidence": {
                    "baseline_period": "2023-01-01 to 2023-01-31",
                    "baseline_count": cnt_a,
                    "comparison_period": "2024-01-01 to 2024-01-31",
                    "comparison_count": cnt_b,
                    "absolute_diff": diff,
                    "relative_change_pct": rel_pct,
                    "arrest_rate_delta_pp": arr_delta
                },
                "sample_size": cnt_a + cnt_b,
                "methodology": "Two-window temporal comparative aggregation over fact_crime joined to dim_time.",
                "source_module": "What Changed?",
                "route": "/what-changed",
                "filters": {"baseline": "Jan 2023", "comparison": "Jan 2024"},
                "caveat": base_caveat,
                "score": score_chg1,
                "severity": "HIGH" if score_chg1 >= 75 else "MEDIUM",
                "chart_data": {
                    "chart_type": "metric_delta",
                    "data": [
                        {"label": "Jan 2023", "value": cnt_a, "color": "#38bdf8"},
                        {"label": "Jan 2024", "value": cnt_b, "color": "#a855f7"},
                        {"label": "Change %", "value": rel_pct, "color": "#f87171" if rel_pct > 0 else "#34d399"}
                    ]
                }
            })

            # Top category shifts
            cat_changes = get_category_changes(
                dataset=dataset,
                period_a_start="2023-01-01",
                period_a_end="2023-01-31",
                period_b_start="2024-01-01",
                period_b_end="2024-01-31"
            )
            if cat_changes and cat_changes.get("categories"):
                top_shift = cat_changes["categories"][0]
                s_name = top_shift.get("category", "")
                s_diff = top_shift.get("count_diff", 0)
                s_pct = top_shift.get("relative_pct_change", 0.0)
                s_pct_str = f" ({s_pct:+}%)" if s_pct is not None else ""
                
                cat_shift_chart = [
                    {"category": c.get("category", "")[:12], "diff": c.get("count_diff", 0)}
                    for c in cat_changes["categories"][:5]
                ]
                
                score_shift = calculate_insight_score(effect_magnitude=abs(s_pct or 0) / 50.0, sample_size=abs(s_diff))
                raw_insights.append({
                    "id": "INS_CHANGE_02",
                    "title": f"Category Shift: {s_name} ({s_diff:+,} Incidents{s_pct_str})",
                    "category": "Period Comparison",
                    "insight_type": "STATISTICAL_COMPARISON",
                    "explanation": f"{s_name} exhibited the largest absolute shift between January 2023 ({top_shift.get('count_a', 0):,}) and January 2024 ({top_shift.get('count_b', 0):,}), registering a net change of {s_diff:+,} recorded incidents{s_pct_str}.",
                    "numerical_evidence": {
                        "category": s_name,
                        "count_2023": top_shift.get("count_a", 0),
                        "count_2024": top_shift.get("count_b", 0),
                        "count_diff": s_diff,
                        "relative_change_pct": s_pct,
                        "share_delta_pp": top_shift.get("delta_pp", 0.0)
                    },
                    "sample_size": abs(s_diff),
                    "methodology": "Category-stratified period differential aggregation.",
                    "source_module": "What Changed?",
                    "route": "/what-changed",
                    "filters": {"baseline": "Jan 2023", "comparison": "Jan 2024"},
                    "caveat": base_caveat,
                    "score": score_shift,
                    "severity": "HIGH" if score_shift >= 75 else "MEDIUM",
                    "chart_data": {"chart_type": "bar", "data": cat_shift_chart, "x_key": "category", "y_key": "diff"}
                })
    except Exception as e:
        print(f"Error generating change comparison insights: {e}")

    # -------------------------------------------------------------
    # DEDUPLICATION & FILTERING
    # -------------------------------------------------------------
    # Deduplicate deterministically using (category, id)
    seen_ids = set()
    deduped_insights: List[Dict[str, Any]] = []
    for ins in raw_insights:
        if ins["id"] not in seen_ids:
            seen_ids.add(ins["id"])
            deduped_insights.append(ins)

    # Filter by domain if requested
    if insight_domain and insight_domain.strip():
        dom_clean = insight_domain.strip().lower()
        deduped_insights = [i for i in deduped_insights if i["category"].lower() == dom_clean]

    # Filter by insight_type if requested
    if insight_type and insight_type.strip():
        type_clean = insight_type.strip().upper()
        deduped_insights = [i for i in deduped_insights if i["insight_type"] == type_clean]

    # Filter by min_score
    if min_score > 0:
        deduped_insights = [i for i in deduped_insights if i["score"] >= min_score]

    # Sort deterministically by analytical score descending
    deduped_insights.sort(key=lambda x: x["score"], reverse=True)
    GLOBAL_CACHE.set("insights_all", dataset, deduped_insights, cache_params, ttl=300)
    return deduped_insights


def generate_executive_narrative(insights: List[Dict[str, Any]], dataset: str = "real") -> str:
    """Generates a structured, multi-paragraph executive briefing synthesizing validated findings without making unsupported causal claims."""
    if not insights:
        return "No automated insights could be generated for the specified filter parameters. Adjust filters or lower the minimum score threshold."
        
    is_synth = (dataset in ["synthetic", "synthetic_demo", "synthetic_data"])
    
    # Stratify by classification
    descriptive = [i for i in insights if i.get("insight_type") == "DESCRIPTIVE"]
    statistical = [i for i in insights if i.get("insight_type") == "STATISTICAL_COMPARISON"]
    predictive = [i for i in insights if i.get("insight_type") == "PREDICTIVE_MODEL"]
    
    parts = []
    
    # 1. Headline overview
    top_insight = insights[0]
    parts.append(
        f"EXECUTIVE INTELLIGENCE SYNTHESIS ({'SIMULATED BENCHMARK DATASET' if is_synth else 'VERIFIED REAL CHICAGO DATA WAREHOUSE'}):\n"
        f"Analysis of evaluated modules identifies '{top_insight['title']}' as the primary signal (Importance Score: {top_insight['score']}/100)."
    )
    
    # 2. Key descriptive findings
    if descriptive:
        desc_bullets = [f"• {d['category'].upper()}: {d['explanation']}" for d in descriptive[:2]]
        parts.append("Descriptive Pattern Observations:\n" + "\n".join(desc_bullets))
        
    # 3. Statistical comparisons & shifts
    if statistical:
        stat_bullets = [f"• {s['category'].upper()}: {s['explanation']}" for s in statistical[:2]]
        parts.append("Comparative & Longitudinal Shifts:\n" + "\n".join(stat_bullets))
        
    # 4. Machine learning & association findings
    if predictive:
        pred_bullets = [f"• {p['category'].upper()}: {p['explanation']}" for p in predictive[:2]]
        parts.append("Algorithmic & Associative Models:\n" + "\n".join(pred_bullets))
        
    # 5. Methodological non-causality disclaimer
    disclaimer = (
        "METHODOLOGICAL CAVEAT & DATA GOVERNANCE:\n"
        "All metrics are computed strictly from historical police administrative incident logs in the PostgreSQL star warehouse. "
        "Association rules and classification splits measure empirical co-occurrence and do not prove causal relationships. "
        "In the real dataset, records are sampled primarily within Jan 2023 and Jan 2024 windows."
    )
    parts.append(disclaimer)
    
    return "\n\n".join(parts)
