"""
CrimeLens - K-Means Area Clustering FastAPI Router
Exposes API endpoints for K-Means area segmentation, feature extraction, 
optimal K evaluation (Elbow & Silhouette), PCA visualization coordinates, and cluster profiles.
Supports dual-dataset isolation (real vs synthetic).
"""

from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional, Dict, Any, List

from services.kmeans_service import (
    analyze_kmeans,
    evaluate_k_range,
    extract_area_features,
    get_kmeans_explanation,
    ALL_AVAILABLE_FEATURES,
    DEFAULT_CLUSTERING_FEATURES
)

router = APIRouter(
    prefix="/api/kmeans",
    tags=["K-Means Area Clustering & Segmentation"]
)


@router.get("/metadata")
def get_kmeans_metadata(dataset: str = Query("real")):
    """
    Returns available area granularities, feature list, and default K-Means configuration parameters.
    """
    try:
        return {
            "dataset_selected": dataset,
            "granularities": [
                {"key": "district", "label": "Police District", "description": "24 eligible Chicago police administrative districts (22 active patrol + 2 specialized detail units)"},
                {"key": "community_area", "label": "Community Area", "description": "77 official Chicago municipal community areas"}
            ],
            "available_features": [
                {"key": k, "label": v, "default_selected": True}
                for k, v in ALL_AVAILABLE_FEATURES.items()
            ],
            "defaults": {
                "k": 4,
                "min_incidents": 10,
                "area_granularity": "district",
                "k_min": 2,
                "k_max": 8
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch K-Means metadata: {str(e)}")


@router.post("/analyze")
def run_kmeans_analysis(payload: Dict[str, Any] = Body(...)):
    """
    Executes K-Means area clustering with standardized feature scaling and 2D PCA projection.
    """
    try:
        dataset = str(payload.get("dataset", "real"))
        area_granularity = str(payload.get("area_granularity", "district"))
        k = int(payload.get("k", 4))
        min_incidents = int(payload.get("min_incidents", 10))
        selected_features = payload.get("selected_features", DEFAULT_CLUSTERING_FEATURES)
        filters = payload.get("filters", {})

        result = analyze_kmeans(
            dataset=dataset,
            area_granularity=area_granularity,
            k=k,
            min_incidents=min_incidents,
            selected_features=selected_features,
            filters=filters
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"K-Means area clustering analysis failed: {str(e)}")


@router.post("/evaluate-k")
def evaluate_optimal_k(payload: Dict[str, Any] = Body(...)):
    """
    Evaluates K-Means performance across a range of K values using WCSS (Inertia) and Silhouette Scores.
    """
    try:
        dataset = str(payload.get("dataset", "real"))
        area_granularity = str(payload.get("area_granularity", "district"))
        min_incidents = int(payload.get("min_incidents", 10))
        selected_features = payload.get("selected_features", DEFAULT_CLUSTERING_FEATURES)
        filters = payload.get("filters", {})
        k_min = int(payload.get("k_min", 2))
        k_max = int(payload.get("k_max", 8))

        result = evaluate_k_range(
            dataset=dataset,
            area_granularity=area_granularity,
            min_incidents=min_incidents,
            selected_features=selected_features,
            filters=filters,
            k_min=k_min,
            k_max=k_max
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to evaluate K range: {str(e)}")


@router.get("/area-profile")
def get_area_profile(
    area_id: str = Query(...),
    area_granularity: str = Query("district"),
    dataset: str = Query("real")
):
    """
    Returns specific area profile and feature metrics.
    """
    try:
        df, _ = extract_area_features(dataset=dataset, area_granularity=area_granularity, min_incidents=1)
        if df.empty:
            raise HTTPException(status_code=404, detail="Area data not found")

        matched = df[df["area_id_str"] == str(area_id)]
        if matched.empty:
            raise HTTPException(status_code=404, detail=f"Area #{area_id} not found")

        row = matched.iloc[0]
        return {
            "area_id": str(row["area_id"]),
            "area_name": str(row["area_name"]),
            "dataset": dataset,
            "total_incidents": int(row["total_incidents"]),
            "dominant_crime": str(row["dominant_crime"]),
            "arrest_pct": float(row["arrest_pct"]),
            "domestic_pct": float(row["domestic_pct"]),
            "nighttime_pct": float(row["nighttime_pct"]),
            "weekend_pct": float(row["weekend_pct"]),
            "crime_diversity": float(row["crime_diversity"]),
            "proportions": {
                "theft": float(row["theft_prop"]),
                "battery": float(row["battery_prop"]),
                "assault": float(row["assault_prop"]),
                "damage": float(row["damage_prop"]),
                "vehicle_theft": float(row["vehicle_theft_prop"]),
                "other": float(row["other_crime_prop"])
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch area profile: {str(e)}")


@router.get("/explain")
def get_kmeans_explanation_endpoint():
    """
    Returns educational DWM concept explanations for K-Means area segmentation.
    """
    try:
        return get_kmeans_explanation()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch explanation: {str(e)}")
