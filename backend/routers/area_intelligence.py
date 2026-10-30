"""
CrimeLens - Area Intelligence & Comparison FastAPI Router
Exposes endpoints for multi-granularity area profiling, sample-normalized side-by-side area comparisons,
K-Means cluster integration, and educational algorithm breakdowns.
Supports both 'real' (public schema) and 'synthetic' (synthetic_data schema) datasets.
"""

import os
import sys
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from services.area_intelligence_service import (
    get_area_list,
    get_area_profile,
    compare_two_areas,
    get_area_explanation_metadata,
    get_district_boundaries_geojson,
    get_districts_choropleth_summary,
    get_geocoded_incidents,
    get_density_heatmap_points,
    get_district_tactical_profile
)
from services.hotspot_service import compute_dbscan_clusters
from database import get_schema_for_dataset

router = APIRouter(prefix="/api/area-intelligence", tags=["Area Intelligence & Comparison"])


class AreaProfileRequest(BaseModel):
    dataset: str = Field(default="real", description="Dataset identifier: 'real' or 'synthetic'")
    granularity: str = Field(default="district", description="Area granularity: 'district' or 'community_area'")
    area_id: str = Field(default="001", description="Area identifier (e.g. '001', '32')")
    filters: Optional[Dict[str, Any]] = Field(default=None, description="Optional filters")


class AreaCompareRequest(BaseModel):
    dataset: str = Field(default="real", description="Dataset identifier: 'real' or 'synthetic'")
    granularity: str = Field(default="district", description="Area granularity: 'district' or 'community_area'")
    area_id_a: str = Field(default="001", description="Area A identifier")
    area_id_b: str = Field(default="002", description="Area B identifier")
    filters: Optional[Dict[str, Any]] = Field(default=None, description="Optional filters")


class DistrictsSummaryRequest(BaseModel):
    dataset: str = Field(default="real", description="Dataset identifier: 'real' or 'synthetic'")
    filters: Optional[Dict[str, Any]] = Field(default=None, description="Optional filters")


class GeocodedIncidentsRequest(BaseModel):
    dataset: str = Field(default="real", description="Dataset identifier: 'real' or 'synthetic'")
    filters: Optional[Dict[str, Any]] = Field(default=None, description="Optional filters")
    limit: int = Field(default=2000, description="Max incidents to return")
    bounds: Optional[Dict[str, float]] = Field(default=None, description="Bounding box")


class HeatmapRequest(BaseModel):
    dataset: str = Field(default="real", description="Dataset identifier: 'real' or 'synthetic'")
    filters: Optional[Dict[str, Any]] = Field(default=None, description="Optional filters")
    limit: int = Field(default=5000, description="Max points to return")


class DistrictTacticalRequest(BaseModel):
    dataset: str = Field(default="real", description="Dataset identifier: 'real' or 'synthetic'")
    district_id: str = Field(default="001", description="District identifier (e.g. '001')")
    filters: Optional[Dict[str, Any]] = Field(default=None, description="Optional filters")


class HotspotsOverlayRequest(BaseModel):
    dataset: str = Field(default="real", description="Dataset identifier: 'real' or 'synthetic'")
    filters: Optional[Dict[str, Any]] = Field(default=None, description="Optional filters")
    eps_meters: float = Field(default=350.0, description="DBSCAN epsilon radius in meters")
    min_samples: int = Field(default=15, description="DBSCAN min core samples")


@router.get("/metadata")
def get_area_intel_metadata(dataset: str = Query(default="real")):
    """
    Returns available granularities, default settings, and dataset schema info.
    """
    schema = get_schema_for_dataset(dataset)
    return {
        "dataset": dataset,
        "schema": schema,
        "granularities": [
            {"id": "district", "name": "Police District"},
            {"id": "community_area", "name": "Community Area"}
        ],
        "default_granularity": "district",
        "default_area_a": "001" if dataset == "real" else "1",
        "default_area_b": "002" if dataset == "real" else "19"
    }


@router.get("/areas")
def get_areas_list(
    dataset: str = Query(default="real"),
    granularity: str = Query(default="district")
):
    """
    Returns selectable areas for dropdown menus for the given dataset and granularity.
    """
    try:
        return get_area_list(dataset=dataset, granularity=granularity)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch area list: {str(e)}")


@router.post("/profile")
def get_single_area_profile(req: AreaProfileRequest):
    """
    Returns comprehensive 15-metric profile for a single geographic area.
    """
    try:
        return get_area_profile(
            dataset=req.dataset,
            granularity=req.granularity,
            area_id=req.area_id,
            filters=req.filters
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch area profile: {str(e)}")


@router.post("/compare")
def compare_areas(req: AreaCompareRequest):
    """
    Executes sample-normalized side-by-side comparison between Area A and Area B.
    Returns delta metrics (Δpp), category comparisons, hourly distributions, and deterministic insights.
    """
    try:
        return compare_two_areas(
            dataset=req.dataset,
            granularity=req.granularity,
            area_id_a=req.area_id_a,
            area_id_b=req.area_id_b,
            filters=req.filters
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Area comparison failed: {str(e)}")


@router.post("/similar-areas")
def get_similar_areas_endpoint(req: AreaProfileRequest):
    """
    Returns structurally similar areas belonging to the same K-Means cluster.
    """
    try:
        prof = get_area_profile(dataset=req.dataset, granularity=req.granularity, area_id=req.area_id, filters=req.filters)
        if prof.get("status") == "SUCCESS":
            km_info = prof.get("kmeans_cluster", {})
            return {
                "area_id": req.area_id,
                "granularity": req.granularity,
                "cluster_id": km_info.get("cluster_id"),
                "cluster_label": km_info.get("cluster_label"),
                "similar_areas": km_info.get("similar_areas", [])
            }
        return {"similar_areas": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch similar areas: {str(e)}")


@router.get("/explain")
def get_area_intel_explanation():
    """
    Returns educational documentation and formula definitions for Area Intelligence & Comparison.
    """
    return get_area_explanation_metadata()


@router.get("/boundaries/districts")
def get_police_district_boundaries():
    """
    Returns verified official Chicago Police District boundary GeoJSON
    with source metadata, CRS documentation, and district properties.
    """
    try:
        return get_district_boundaries_geojson()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load district boundaries: {str(e)}")


@router.post("/districts-summary")
def get_districts_choropleth_data(req: DistrictsSummaryRequest):
    """
    Calculates district-level crime summary, arrest share, and dominant categories
    for interactive Choropleth visualization.
    """
    try:
        return get_districts_choropleth_summary(dataset=req.dataset, filters=req.filters)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Choropleth calculation failed: {str(e)}")


@router.post("/incidents")
def get_geocoded_incidents_endpoint(req: GeocodedIncidentsRequest):
    """
    Returns actual geocoded incidents from the PostgreSQL warehouse with
    coordinates, time attributes, crime classification, and privacy-preserving block redaction.
    """
    try:
        return get_geocoded_incidents(
            dataset=req.dataset,
            filters=req.filters,
            limit=req.limit,
            bounds=req.bounds
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Incident points query failed: {str(e)}")


@router.post("/heatmap")
def get_density_heatmap_endpoint(req: HeatmapRequest):
    """
    Returns coordinate triplets for client-side crime density heatmap layer.
    """
    try:
        return get_density_heatmap_points(
            dataset=req.dataset,
            filters=req.filters,
            limit=req.limit
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Heatmap data query failed: {str(e)}")


@router.post("/district-tactical")
def get_district_tactical_endpoint(req: DistrictTacticalRequest):
    """
    Returns tactical profile for a selected district, including crime composition,
    24-hour diurnal distribution, weekday breakdown, and top DBSCAN hotspots.
    """
    try:
        return get_district_tactical_profile(
            dataset=req.dataset,
            district_id=req.district_id,
            filters=req.filters
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"District tactical query failed: {str(e)}")


@router.post("/hotspots-overlay")
def get_hotspots_overlay_endpoint(req: HotspotsOverlayRequest):
    """
    Computes DBSCAN hotspot clusters, centroids, and convex hulls for the selected filters.
    """
    try:
        return compute_dbscan_clusters(
            eps_meters=req.eps_meters,
            min_samples=req.min_samples,
            filters=req.filters or {},
            dataset=req.dataset
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hotspots overlay computation failed: {str(e)}")
