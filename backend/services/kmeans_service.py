"""
CrimeLens - K-Means Area Clustering & Crime Pattern Segmentation Service
Performs feature engineering, standardization, K-Means clustering, PCA 2D projection,
and silhouette-based optimal K evaluation on PostgreSQL geographic area aggregations.
Supports both 'real' (public schema) and 'synthetic' (synthetic_data schema) datasets.
"""

import os
import sys
import json
import math
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.decomposition import PCA

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from database import execute_query, get_schema_for_dataset

# Global In-Memory Caches for K-Means Results & Feature Tables
KMEANS_CACHE: Dict[str, Any] = {}
AREA_FEATURES_CACHE: Dict[str, Tuple[pd.DataFrame, Dict[str, Any]]] = {}
K_EVAL_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_MAX_SIZE = 100

ALL_AVAILABLE_FEATURES = {
    "theft_prop": "Theft Proportion",
    "battery_prop": "Battery Proportion",
    "assault_prop": "Assault Proportion",
    "damage_prop": "Criminal Damage Proportion",
    "vehicle_theft_prop": "Vehicle Theft Proportion",
    "other_crime_prop": "Other Crime Proportion",
    "arrest_pct": "Arrest Rate (%)",
    "domestic_pct": "Domestic Incident Rate (%)",
    "nighttime_pct": "Nighttime Share (%)",
    "weekend_pct": "Weekend Share (%)",
    "crime_diversity": "Category Entropy (Diversity)"
}

DEFAULT_CLUSTERING_FEATURES = list(ALL_AVAILABLE_FEATURES.keys())

def build_kmeans_where_clause(filters: Optional[Dict[str, Any]]) -> Tuple[str, Dict[str, Any]]:
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

        elif key == "month":
            if isinstance(val, list):
                where_parts.append(f"t.month IN ({','.join([f':month_{i}' for i in range(len(val))])})")
                for i, v in enumerate(val):
                    params[f"month_{i}"] = int(v)
            else:
                where_parts.append("t.month = :month")
                params["month"] = int(val)

        elif key == "district":
            if isinstance(val, list):
                where_parts.append(f"a.district IN ({','.join([f':district_{i}' for i in range(len(val))])})")
                for i, v in enumerate(val):
                    params[f"district_{i}"] = str(v)
            else:
                where_parts.append("a.district = :district")
                params["district"] = str(val)

        elif key == "primary_type":
            if isinstance(val, list):
                where_parts.append(f"c.primary_type IN ({','.join([f':primary_type_{i}' for i in range(len(val))])})")
                for i, v in enumerate(val):
                    params[f"primary_type_{i}"] = str(v)
            else:
                where_parts.append("c.primary_type = :primary_type")
                params["primary_type"] = str(val)

    where_sql = (" AND " + " AND ".join(where_parts)) if where_parts else ""
    return where_sql, params


def extract_area_features(
    dataset: str = "real",
    area_granularity: str = "district",
    min_incidents: int = 10,
    filters: Optional[Dict[str, Any]] = None
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Extracts aggregated crime features per geographic area from PostgreSQL.
    Computes proportions, arrest/domestic rates, temporal distributions, and Shannon entropy.
    Uses in-memory caching to eliminate duplicate database aggregation across concurrent analysis endpoints.
    """
    filter_key = json.dumps(filters or {}, sort_keys=True)
    feat_cache_key = f"feat_{dataset}_{area_granularity}_{min_incidents}_{filter_key}"

    if feat_cache_key in AREA_FEATURES_CACHE:
        df_cached, stats_cached = AREA_FEATURES_CACHE[feat_cache_key]
        return df_cached.copy(), dict(stats_cached)

    schema = get_schema_for_dataset(dataset)
    area_col = "a.district" if area_granularity == "district" else "a.community_area"
    area_label_prefix = "Police District" if area_granularity == "district" else "Community Area"

    where_sql, params = build_kmeans_where_clause(filters)
    params["min_incidents"] = max(1, int(min_incidents))

    # Main Area Features SQL
    sql_main = f"""
        SELECT 
            {area_col} AS area_id,
            COUNT(f.crime_fact_key) AS total_incidents,
            SUM(CASE WHEN c.primary_type = 'THEFT' THEN 1 ELSE 0 END) AS theft_count,
            SUM(CASE WHEN c.primary_type = 'BATTERY' THEN 1 ELSE 0 END) AS battery_count,
            SUM(CASE WHEN c.primary_type = 'ASSAULT' THEN 1 ELSE 0 END) AS assault_count,
            SUM(CASE WHEN c.primary_type = 'CRIMINAL DAMAGE' THEN 1 ELSE 0 END) AS damage_count,
            SUM(CASE WHEN c.primary_type = 'MOTOR VEHICLE THEFT' THEN 1 ELSE 0 END) AS vehicle_theft_count,
            SUM(CASE WHEN s.arrest = TRUE THEN 1 ELSE 0 END) AS arrest_count,
            SUM(CASE WHEN s.domestic = TRUE THEN 1 ELSE 0 END) AS domestic_count,
            SUM(CASE WHEN LOWER(t.time_period) = 'night' THEN 1 ELSE 0 END) AS night_count,
            SUM(CASE WHEN t.is_weekend = TRUE THEN 1 ELSE 0 END) AS weekend_count
        FROM {schema}.fact_crime f
        JOIN {schema}.dim_area a ON f.area_key = a.area_key
        JOIN {schema}.dim_time t ON f.time_key = t.time_key
        JOIN {schema}.dim_crime c ON f.crime_key = c.crime_key
        JOIN {schema}.dim_status s ON f.status_key = s.status_key
        WHERE {area_col} IS NOT NULL AND {area_col} != 'UNKNOWN' AND {area_col} != '0' {where_sql}
        GROUP BY {area_col};
    """

    df_raw = execute_query(sql_main, params)
    total_areas_found = len(df_raw)

    if total_areas_found == 0:
        stats = {
            "total_areas_found": 0,
            "eligible_areas_count": 0,
            "excluded_areas_count": 0,
            "min_incidents_threshold": min_incidents,
            "area_granularity": area_granularity
        }
        return pd.DataFrame(), stats

    # Category Breakdown for Entropy Calculation
    sql_cat = f"""
        SELECT 
            {area_col} AS area_id,
            c.primary_type,
            COUNT(f.crime_fact_key) AS cnt
        FROM {schema}.fact_crime f
        JOIN {schema}.dim_area a ON f.area_key = a.area_key
        JOIN {schema}.dim_time t ON f.time_key = t.time_key
        JOIN {schema}.dim_crime c ON f.crime_key = c.crime_key
        JOIN {schema}.dim_status s ON f.status_key = s.status_key
        WHERE {area_col} IS NOT NULL AND {area_col} != 'UNKNOWN' AND {area_col} != '0' {where_sql}
        GROUP BY {area_col}, c.primary_type;
    """
    df_cat = execute_query(sql_cat, params)

    entropy_map = {}
    dominant_crime_map = {}
    if not df_cat.empty:
        for area_id, group in df_cat.groupby('area_id'):
            counts = group['cnt'].values
            probs = counts / counts.sum()
            entropy = -np.sum(probs * np.log(probs + 1e-12))
            entropy_map[str(area_id)] = round(float(entropy), 4)

            top_crime = group.sort_values(by='cnt', ascending=False).iloc[0]['primary_type']
            dominant_crime_map[str(area_id)] = str(top_crime)

    # Filter Areas by Minimum Incident Count Threshold
    df_eligible = df_raw[df_raw['total_incidents'] >= min_incidents].copy()
    eligible_count = len(df_eligible)
    excluded_count = total_areas_found - eligible_count

    stats = {
        "total_areas_found": total_areas_found,
        "eligible_areas_count": eligible_count,
        "excluded_areas_count": excluded_count,
        "min_incidents_threshold": min_incidents,
        "area_granularity": area_granularity,
        "dataset_used": dataset
    }

    if eligible_count == 0:
        return pd.DataFrame(), stats

    df = df_eligible.copy()
    tot = df['total_incidents']

    # Normalize Feature Proportions & Rates
    df['theft_prop'] = (df['theft_count'] / tot).round(4)
    df['battery_prop'] = (df['battery_count'] / tot).round(4)
    df['assault_prop'] = (df['assault_count'] / tot).round(4)
    df['damage_prop'] = (df['damage_count'] / tot).round(4)
    df['vehicle_theft_prop'] = (df['vehicle_theft_count'] / tot).round(4)

    top_5_sum = df['theft_prop'] + df['battery_prop'] + df['assault_prop'] + df['damage_prop'] + df['vehicle_theft_prop']
    df['other_crime_prop'] = (1.0 - top_5_sum).clip(lower=0.0).round(4)

    df['arrest_pct'] = (df['arrest_count'] / tot * 100).round(2)
    df['domestic_pct'] = (df['domestic_count'] / tot * 100).round(2)
    df['nighttime_pct'] = (df['night_count'] / tot * 100).round(2)
    df['weekend_pct'] = (df['weekend_count'] / tot * 100).round(2)

    df['area_id_str'] = df['area_id'].astype(str)
    df['area_name'] = df['area_id_str'].apply(lambda x: f"{area_label_prefix} #{x}")
    df['crime_diversity'] = df['area_id_str'].map(entropy_map).fillna(0.0)
    df['dominant_crime'] = df['area_id_str'].map(dominant_crime_map).fillna("UNKNOWN")

    if len(AREA_FEATURES_CACHE) >= CACHE_MAX_SIZE:
        AREA_FEATURES_CACHE.pop(next(iter(AREA_FEATURES_CACHE)))
    AREA_FEATURES_CACHE[feat_cache_key] = (df.copy(), dict(stats))

    return df, stats


def generate_cluster_label(
    mean_series: pd.Series, 
    global_mean_series: pd.Series,
    global_std_series: pd.Series
) -> Tuple[str, str]:
    """
    Generates an objective, non-judgmental label and summary description for a cluster
    based on standardized Z-score deviations from the dataset mean.
    Properly standardizes using each individual feature's standard deviation across areas.
    """
    z_scores = {}
    for col in mean_series.index:
        g_val = float(global_mean_series.get(col, 0.0))
        c_val = float(mean_series.get(col, 0.0))
        std_val = float(global_std_series.get(col, 1.0))
        if std_val < 1e-9:
            std_val = 1.0
        z_scores[col] = (c_val - g_val) / std_val

    sorted_z = sorted(z_scores.items(), key=lambda x: x[1], reverse=True)
    top_pos_feat, top_pos_z = sorted_z[0]
    second_pos_feat, second_pos_z = sorted_z[1] if len(sorted_z) > 1 else (None, 0.0)
    top_neg_feat, top_neg_z = sorted_z[-1]

    feature_descriptors = {
        "theft_prop": "Commercial Theft",
        "battery_prop": "Physical Battery",
        "assault_prop": "Assault Incidents",
        "damage_prop": "Property Damage",
        "vehicle_theft_prop": "Motor Vehicle Theft",
        "other_crime_prop": "Specialized & Other Offenses",
        "arrest_pct": "Enforcement & Arrests",
        "domestic_pct": "Domestic-Related Incidents",
        "nighttime_pct": "Nighttime Offenses",
        "weekend_pct": "Weekend Activity",
        "crime_diversity": "High Crime Diversity"
    }

    if abs(top_pos_z) < 0.40 and abs(top_neg_z) < 0.40:
        return "Balanced Baseline Profile", "Exhibits feature distributions closely tracking the citywide average with balanced offense proportions."

    primary_name = feature_descriptors.get(top_pos_feat, top_pos_feat.replace('_', ' ').title())

    if second_pos_z > 0.50 and second_pos_feat:
        second_name = feature_descriptors.get(second_pos_feat, second_pos_feat.replace('_', ' ').title())
        title = f"{primary_name} & {second_name} Pattern"
    elif top_neg_z < -0.80:
        neg_name = feature_descriptors.get(top_neg_feat, top_neg_feat.replace('_', ' ').title())
        title = f"{primary_name} Concentration (Low {neg_name})"
    else:
        title = f"High {primary_name} Profile"

    desc = f"Elevated {primary_name.lower()} (+{top_pos_z:.1f}σ)"
    if second_pos_feat and second_pos_z > 0.3:
        second_desc = feature_descriptors.get(second_pos_feat, second_pos_feat)
        desc += f" and {second_desc.lower()} (+{second_pos_z:.1f}σ)"
    if top_neg_z < -0.6:
        neg_desc = feature_descriptors.get(top_neg_feat, top_neg_feat)
        desc += f", with below-average {neg_desc.lower()} ({top_neg_z:.1f}σ)"
    desc += " relative to analyzed areas."

    return title, desc


def analyze_kmeans(
    dataset: str = "real",
    area_granularity: str = "district",
    k: int = 4,
    min_incidents: int = 10,
    selected_features: Optional[List[str]] = None,
    filters: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Main K-Means clustering pipeline:
    Extracts features, scales matrix, runs KMeans, computes silhouette & PCA coordinates,
    and returns cluster profiles, area memberships, and educational metadata.
    """
    # Parameter Guardrails
    schema = get_schema_for_dataset(dataset)
    k = max(2, min(int(k), 10))
    min_incidents = max(1, int(min_incidents))
    active_features = selected_features or DEFAULT_CLUSTERING_FEATURES
    active_features = [f for f in active_features if f in ALL_AVAILABLE_FEATURES]
    if not active_features:
        active_features = DEFAULT_CLUSTERING_FEATURES

    import json
    filter_str = json.dumps(filters or {}, sort_keys=True)
    feat_str = ",".join(sorted(active_features))
    cache_key = f"ds_{dataset}_gran_{area_granularity}_k_{k}_min_{min_incidents}_flt_{filter_str}_feats_{feat_str}"

    if cache_key in KMEANS_CACHE:
        return KMEANS_CACHE[cache_key]

    df, extraction_stats = extract_area_features(dataset, area_granularity, min_incidents, filters)
    eligible_count = extraction_stats["eligible_areas_count"]

    if df.empty or eligible_count < 2:
        return {
            "status": "INSUFFICIENT_DATA",
            "extraction_stats": extraction_stats,
            "message": f"Only {eligible_count} eligible areas found with min_incidents >= {min_incidents}. At least 2 areas required for K-Means.",
            "k_used": k,
            "clusters": [],
            "area_memberships": []
        }

    # Constrain K if eligible areas < K
    actual_k = min(k, eligible_count)

    # 2. Extract Feature Matrix
    X_raw = df[active_features].values
    
    # Check for zero variance
    std_devs = np.std(X_raw, axis=0)
    valid_mask = std_devs > 1e-6
    if not np.any(valid_mask):
        valid_mask = np.ones(X_raw.shape[1], dtype=bool)

    X_valid = X_raw[:, valid_mask]
    used_features = [active_features[i] for i in range(len(active_features)) if valid_mask[i]]

    # 3. Standardize Features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_valid)

    # 4. Fit KMeans
    kmeans = KMeans(n_clusters=actual_k, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(X_scaled)
    df["cluster_id"] = cluster_labels

    # 5. Compute WCSS & Silhouette Score
    wcss = float(kmeans.inertia_)
    sil_score = float(silhouette_score(X_scaled, cluster_labels)) if (eligible_count > actual_k > 1) else 0.0

    # 6. PCA 2D Visualization Projection
    pca = PCA(n_components=min(2, X_scaled.shape[1]), random_state=42)
    pca_coords = pca.fit_transform(X_scaled)

    df["pca_x"] = pca_coords[:, 0].round(4) if pca_coords.shape[1] >= 1 else 0.0
    df["pca_y"] = pca_coords[:, 1].round(4) if pca_coords.shape[1] >= 2 else 0.0

    var_explained = [round(float(v * 100), 2) for v in pca.explained_variance_ratio_]

    # Global Mean and Std for Relative Comparison
    global_means = df[used_features].mean()
    global_stds = df[used_features].std()

    # 7. Construct Cluster Summaries & Profiles
    clusters_list = []
    cluster_colors = ["#38bdf8", "#818cf8", "#fbbf24", "#10b981", "#f43f5e", "#c084fc", "#34d399", "#fb923c"]

    for c_id in range(actual_k):
        c_df = df[df["cluster_id"] == c_id]
        c_size = len(c_df)
        c_pct = round((c_size / eligible_count * 100), 2) if eligible_count > 0 else 0.0

        if c_size > 0:
            c_means = c_df[used_features].mean()
            label, desc = generate_cluster_label(c_means, global_means, global_stds)
            mean_dict = {f: round(float(c_means[f]), 4) for f in used_features}
            all_mean_dict = {f: round(float(c_df[f].mean()), 4) if f in c_df else 0.0 for f in DEFAULT_CLUSTERING_FEATURES}
            centroid_scaled = [round(float(val), 4) for val in kmeans.cluster_centers_[c_id]]
            member_areas = c_df["area_name"].tolist()
            avg_incidents = round(float(c_df["total_incidents"].mean()), 1)
        else:
            label, desc = "Empty Cluster", "No areas assigned."
            mean_dict = {f: 0.0 for f in used_features}
            all_mean_dict = {f: 0.0 for f in DEFAULT_CLUSTERING_FEATURES}
            centroid_scaled = []
            member_areas = []
            avg_incidents = 0.0

        clusters_list.append({
            "cluster_id": c_id,
            "cluster_label": f"Cluster #{c_id + 1}: {label}",
            "short_name": label,
            "description": desc,
            "area_count": c_size,
            "percentage_of_areas": c_pct,
            "avg_incidents_per_area": avg_incidents,
            "feature_means": mean_dict,
            "all_feature_means": all_mean_dict,
            "clustering_features": used_features,
            "descriptive_features": [f for f in DEFAULT_CLUSTERING_FEATURES if f not in used_features],
            "centroid_scaled": centroid_scaled,
            "color": cluster_colors[c_id % len(cluster_colors)],
            "member_area_names": member_areas
        })

    # Sort Clusters by Area Count Descending
    clusters_list.sort(key=lambda x: x["area_count"], reverse=True)

    # 8. Construct Area Memberships List
    area_memberships = []
    for _, row in df.iterrows():
        c_info = next(c for c in clusters_list if c["cluster_id"] == int(row["cluster_id"]))
        area_memberships.append({
            "area_id": str(row["area_id"]),
            "area_name": str(row["area_name"]),
            "cluster_id": int(row["cluster_id"]),
            "cluster_label": c_info["cluster_label"],
            "cluster_color": c_info["color"],
            "total_incidents": int(row["total_incidents"]),
            "dominant_crime": str(row["dominant_crime"]),
            "arrest_pct": float(row["arrest_pct"]),
            "domestic_pct": float(row["domestic_pct"]),
            "pca_x": float(row["pca_x"]),
            "pca_y": float(row["pca_y"]),
            "features": {f: float(row[f]) for f in used_features}
        })

    result = {
        "status": "SUCCESS",
        "dataset": dataset,
        "area_granularity": area_granularity,
        "extraction_stats": extraction_stats,
        "parameters": {
            "requested_k": k,
            "actual_k": actual_k,
            "min_incidents": min_incidents,
            "features_used": used_features,
            "random_state": 42
        },
        "kpi": {
            "eligible_areas": eligible_count,
            "selected_k": actual_k,
            "silhouette_score": round(sil_score, 4),
            "wcss_inertia": round(wcss, 2),
            "excluded_areas": extraction_stats["excluded_areas_count"]
        },
        "clusters": clusters_list,
        "area_memberships": area_memberships,
        "pca_metadata": {
            "explained_variance_ratio": var_explained,
            "total_explained_variance": round(sum(var_explained), 2),
            "note": "PCA projects standardized multi-dimensional features onto 2D axes for visual display. K-Means is fitted on full standardized feature space."
        },
        "disclaimer": (
            "SIMULATED DATA — Generated incidents for algorithm testing and demonstration." if schema == "synthetic_data"
            else "Historical Chicago crime sample. Segmented by historical incident features; does not represent predictive public safety forecasts."
        )
    }

    if len(KMEANS_CACHE) >= CACHE_MAX_SIZE:
        KMEANS_CACHE.pop(next(iter(KMEANS_CACHE)))
    KMEANS_CACHE[cache_key] = result

    return result


def evaluate_k_range(
    dataset: str = "real",
    area_granularity: str = "district",
    min_incidents: int = 10,
    selected_features: Optional[List[str]] = None,
    filters: Optional[Dict[str, Any]] = None,
    k_min: int = 2,
    k_max: int = 8
) -> Dict[str, Any]:
    """
    Evaluates K-Means clustering across K = 2 to K = 8 (Elbow Method & Silhouette Curve).
    Identifies recommended K with peak Silhouette score.
    Uses in-memory caching to prevent duplicate evaluations.
    """
    filter_key = json.dumps(filters or {}, sort_keys=True)
    active_features = selected_features or DEFAULT_CLUSTERING_FEATURES
    active_features = [f for f in active_features if f in ALL_AVAILABLE_FEATURES] or DEFAULT_CLUSTERING_FEATURES
    feat_str = ",".join(sorted(active_features))
    eval_cache_key = f"eval_{dataset}_{area_granularity}_{min_incidents}_{filter_key}_{feat_str}_{k_min}_{k_max}"

    if eval_cache_key in K_EVAL_CACHE:
        return K_EVAL_CACHE[eval_cache_key]

    df, stats = extract_area_features(dataset, area_granularity, min_incidents, filters)
    eligible_count = stats["eligible_areas_count"]

    if df.empty or eligible_count < 3:
        return {
            "status": "INSUFFICIENT_DATA",
            "message": "Not enough eligible areas to evaluate K range.",
            "k_evaluations": []
        }

    X_raw = df[active_features].values
    std_devs = np.std(X_raw, axis=0)
    valid_mask = std_devs > 1e-6
    X_valid = X_raw[:, valid_mask] if np.any(valid_mask) else X_raw

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_valid)

    max_k_possible = min(k_max, eligible_count - 1)
    k_evaluations = []
    best_k = k_min
    best_sil = -1.0

    for test_k in range(k_min, max_k_possible + 1):
        km = KMeans(n_clusters=test_k, random_state=42, n_init=10)
        lbls = km.fit_predict(X_scaled)
        inertia = float(km.inertia_)
        sil = float(silhouette_score(X_scaled, lbls)) if (eligible_count > test_k > 1) else 0.0

        if sil > best_sil:
            best_sil = sil
            best_k = test_k

        k_evaluations.append({
            "k": test_k,
            "inertia": round(inertia, 2),
            "wcss": round(inertia, 2),
            "silhouette_score": round(sil, 4)
        })

    eval_result = {
        "status": "SUCCESS",
        "dataset": dataset,
        "area_granularity": area_granularity,
        "eligible_areas_count": eligible_count,
        "recommended_k": best_k,
        "peak_silhouette_score": round(best_sil, 4),
        "k_evaluations": k_evaluations,
        "advisory_note": (
            f"Advisory: Silhouette analysis identifies K={best_k} as the global mathematical peak cohesion ({best_sil:.4f}). "
            "Selecting a higher K (such as K=4 or K=5) is valid for operational civic planning."
        ),
        "explanation": f"Recommended K={best_k} achieves the highest silhouette score ({best_sil:.4f}) on standardized area features."
    }

    if len(K_EVAL_CACHE) >= CACHE_MAX_SIZE:
        K_EVAL_CACHE.pop(next(iter(K_EVAL_CACHE)))
    K_EVAL_CACHE[eval_cache_key] = eval_result

    return eval_result


def get_kmeans_explanation() -> Dict[str, Any]:
    """
    Returns educational DWM concept documentation for K-Means Area Clustering.
    """
    return {
        "algorithm": "K-Means Partitioning Area Clustering",
        "distance_metric": "Standardized Euclidean Distance ($L_2$ Norm)",
        "preprocessing": "StandardScaler ($z = \\frac{x - \\mu}{\\sigma}$)",
        "dwm_concepts": {
            "area_segmentation": (
                "Unlike DBSCAN (which identifies high-density spatial point clusters), K-Means groups geographic areas "
                "based on their aggregated multi-dimensional crime characteristics (e.g. Theft proportion, Domestic rate, Nighttime share)."
            ),
            "standardization": (
                "Features are standardized to zero mean and unit variance so that high-magnitude metrics "
                "(such as incident counts or percentages) do not artificially dominate feature distance metrics."
            ),
            "elbow_method": (
                "Measures Within-Cluster Sum of Squares (WCSS / Inertia) across K values. The 'elbow' indicates "
                "the point of diminishing returns in error reduction."
            ),
            "silhouette_score": (
                "Quantifies cluster cohesion versus separation on a scale from -1 to +1. High positive scores "
                "indicate well-separated, dense area clusters."
            ),
            "pca_visualization": (
                "Principal Component Analysis (PCA) projects multi-dimensional feature space onto 2 principal orthogonal axes (PCA-1, PCA-2) "
                "for visual scatterplot display. K-Means clustering is fitted on full standardized feature space."
            )
        }
    }
