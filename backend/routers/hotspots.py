"""
CrimeLens - DBSCAN Hotspot Intelligence & Temporal Evolution Router
Exposes API endpoints for DBSCAN density clustering, cluster centroids, convex hulls,
spatial points, timeline animation frames, side-by-side period comparisons, and trend series.
"""

from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional, Dict, Any, List
from services.hotspot_service import (
    compute_dbscan_clusters,
    check_spatial_scope,
    get_cluster_points,
    get_single_cluster_details,
    extract_spatial_incidents,
    get_spatial_summary_metrics,
    get_dbscan_explanation,
    get_timeline_metadata,
    get_timeline_frame,
    get_timeline_batch_frames,
    compare_timeline_periods,
    get_timeline_trends
)

router = APIRouter(
    prefix="/api/hotspots",
    tags=["DBSCAN Hotspot Intelligence & Evolution"]
)

@router.get("/summary")
def get_spatial_summary(dataset: str = Query("real")):
    """
    Returns spatial coordinate eligibility and bounding box statistics from PostgreSQL.
    """
    try:
        return get_spatial_summary_metrics(dataset=dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch spatial summary: {str(e)}")


@router.post("/scope-check")
def check_scope_endpoint(payload: Dict[str, Any] = Body(...)):
    """
    Fast pre-check evaluating incident count against the 25,000 threshold.
    Returns matched count, eligibility flag, reduction required, and guidance status.
    """
    try:
        filters = dict(payload.get("filters") or {})
        for k in ["district", "primary_type", "year", "community_area"]:
            if k in payload and k not in filters:
                filters[k] = payload[k]
        dataset = str(payload.get("dataset", "real"))
        return check_spatial_scope(filters=filters, dataset=dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check spatial scope: {str(e)}")


@router.post("/clusters")
def get_hotspot_clusters(payload: Dict[str, Any] = Body(...)):
    """
    Executes DBSCAN clustering on PostgreSQL coordinates using Haversine distance.
    Accepts eps_meters, min_samples, dataset, and filter constraints.
    """
    try:
        eps_meters = float(payload.get("eps_meters", 300.0))
        min_samples = int(payload.get("min_samples", 15))
        filters = dict(payload.get("filters") or {})
        for k in ["district", "primary_type", "year", "community_area"]:
            if k in payload and k not in filters:
                filters[k] = payload[k]
        dataset = str(payload.get("dataset", "real"))

        result = compute_dbscan_clusters(
            eps_meters=eps_meters,
            min_samples=min_samples,
            filters=filters,
            dataset=dataset
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DBSCAN Hotspot clustering failed: {str(e)}")


@router.post("/points")
def get_hotspot_points(payload: Dict[str, Any] = Body(...)):
    """
    Returns spatial incident points for map visualization or specific cluster inspection.
    """
    try:
        cluster_id = payload.get("cluster_id")
        filters = payload.get("filters", {})
        eps_meters = float(payload.get("eps_meters", 300.0))
        min_samples = int(payload.get("min_samples", 15))
        limit = int(payload.get("limit", 1000))
        dataset = str(payload.get("dataset", "real"))

        result = get_cluster_points(
            cluster_id=cluster_id,
            filters=filters,
            eps_meters=eps_meters,
            min_samples=min_samples,
            limit=limit,
            dataset=dataset
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve hotspot points: {str(e)}")


@router.post("/cluster-details")
def get_cluster_details(payload: Dict[str, Any] = Body(...)):
    """
    Returns in-depth analytical profile for a specific cluster ID.
    """
    try:
        cluster_id = int(payload.get("cluster_id", 0))
        eps_meters = float(payload.get("eps_meters", 300.0))
        min_samples = int(payload.get("min_samples", 15))
        filters = dict(payload.get("filters") or {})
        for k in ["district", "primary_type", "year", "community_area"]:
            if k in payload and k not in filters:
                filters[k] = payload[k]
        dataset = str(payload.get("dataset", "real"))

        result = get_single_cluster_details(
            cluster_id=cluster_id,
            eps_meters=eps_meters,
            min_samples=min_samples,
            filters=filters,
            dataset=dataset
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch cluster details: {str(e)}")


@router.get("/explain")
def get_hotspot_explanation(
    eps_meters: float = Query(300.0),
    min_samples: int = Query(15),
    dataset: str = Query("real")
):
    """
    Returns educational concept explanation for DBSCAN parameters.
    """
    try:
        _, stats = extract_spatial_incidents(dataset=dataset)
        return get_dbscan_explanation(eps_meters, min_samples, stats, 0, 0, 0)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate explanation: {str(e)}")


# ============================================================================
# PHASE 8 TEMPORAL EVOLUTION & TIMELINE ENDPOINTS
# ============================================================================

@router.get("/timeline/metadata")
def get_timeline_metadata_endpoint(dataset: str = Query("real")):
    """
    Returns available monthly periods (Jan 2023 - Dec 2024), eligible counts, and metadata.
    """
    try:
        return get_timeline_metadata(dataset=dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch timeline metadata: {str(e)}")


@router.post("/timeline/frame")
def get_timeline_single_frame_endpoint(payload: Dict[str, Any] = Body(...)):
    """
    Returns a single monthly DBSCAN hotspot frame on demand for timeline playback.
    """
    try:
        year = int(payload.get("year", 2023))
        month = int(payload.get("month", 1))
        eps_meters = float(payload.get("eps_meters", 300.0))
        min_samples = int(payload.get("min_samples", 15))
        filters = dict(payload.get("filters") or {})
        for k in ["district", "primary_type", "year", "community_area"]:
            if k in payload and k not in filters:
                filters[k] = payload[k]
        dataset = str(payload.get("dataset", "real"))

        result = get_timeline_frame(
            year=year,
            month=month,
            eps_meters=eps_meters,
            min_samples=min_samples,
            filters=filters,
            dataset=dataset
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch single timeline frame: {str(e)}")


@router.post("/timeline/frames")
def get_timeline_frames_endpoint(payload: Dict[str, Any] = Body(...)):
    """
    Returns array of monthly DBSCAN hotspot frames for timeline animation playback.
    """
    try:
        start_year = int(payload.get("start_year", 2023))
        start_month = int(payload.get("start_month", 1))
        end_year = int(payload.get("end_year", 2025))
        end_month = int(payload.get("end_month", 12))
        eps_meters = float(payload.get("eps_meters", 300.0))
        min_samples = int(payload.get("min_samples", 15))
        filters = dict(payload.get("filters") or {})
        for k in ["district", "primary_type", "year", "community_area"]:
            if k in payload and k not in filters:
                filters[k] = payload[k]
        dataset = str(payload.get("dataset", "real"))

        result = get_timeline_batch_frames(
            start_year=start_year,
            start_month=start_month,
            end_year=end_year,
            end_month=end_month,
            eps_meters=eps_meters,
            min_samples=min_samples,
            filters=filters,
            dataset=dataset
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch timeline animation frames: {str(e)}")


@router.post("/timeline/compare")
def compare_timeline_periods_endpoint(payload: Dict[str, Any] = Body(...)):
    """
    Executes side-by-side comparison between Period A and Period B with spatial matching.
    """
    try:
        period_a = payload.get("period_a")
        if not period_a and "year" in payload and "month" in payload:
            period_a = {"year": int(payload["year"]), "month": int(payload["month"])}
        if not period_a:
            period_a = {"year": 2023, "month": 1}

        period_b = payload.get("period_b")
        if not period_b:
            period_b = {"year": 2024, "month": 1}
        eps_meters = float(payload.get("eps_meters", 300.0))
        min_samples = int(payload.get("min_samples", 15))
        filters = dict(payload.get("filters") or {})
        for k in ["district", "primary_type", "year", "community_area"]:
            if k in payload and k not in filters:
                filters[k] = payload[k]
        dataset = str(payload.get("dataset", "real"))

        result = compare_timeline_periods(
            period_a=period_a,
            period_b=period_b,
            eps_meters=eps_meters,
            min_samples=min_samples,
            filters=filters,
            dataset=dataset
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compare timeline periods: {str(e)}")


@router.post("/timeline/trends")
def get_timeline_trends_endpoint(payload: Dict[str, Any] = Body(...)):
    """
    Returns 24-month trend time-series for Recharts visualizations and rule-based insights.
    """
    try:
        eps_meters = float(payload.get("eps_meters", 300.0))
        min_samples = int(payload.get("min_samples", 15))
        filters = dict(payload.get("filters") or {})
        for k in ["district", "primary_type", "year", "community_area"]:
            if k in payload and k not in filters:
                filters[k] = payload[k]
        dataset = str(payload.get("dataset", "real"))

        result = get_timeline_trends(
            eps_meters=eps_meters,
            min_samples=min_samples,
            filters=filters,
            dataset=dataset
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch timeline trends: {str(e)}")

