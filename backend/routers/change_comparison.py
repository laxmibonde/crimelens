from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import services.change_comparison_service as change_service

router = APIRouter(
    prefix="/api/changes",
    tags=["What Changed? Multi-Dimensional Comparison Engine"]
)

# Request Models
class ChangeRequestBase(BaseModel):
    dataset: str = Field("real", description="Dataset selector ('real' or 'synthetic')")
    period_a_start: str = Field("2023-01-01", description="Period A start date (YYYY-MM-DD)")
    period_a_end: str = Field("2023-01-31", description="Period A end date (YYYY-MM-DD)")
    period_b_start: str = Field("2024-01-01", description="Period B start date (YYYY-MM-DD)")
    period_b_end: str = Field("2024-01-31", description="Period B end date (YYYY-MM-DD)")
    categories: Optional[List[str]] = Field(None, description="Optional filter by crime categories")
    district: Optional[str] = Field(None, description="Optional Police District filter")
    community_area: Optional[str] = Field(None, description="Optional Community Area filter")

class AreaChangeRequest(ChangeRequestBase):
    granularity: str = Field("district", description="Area granularity ('district' or 'community_area')")
    min_sample_size: int = Field(10, description="Minimum incidents threshold per period")

class HotspotChangeRequest(ChangeRequestBase):
    eps_meters: float = Field(300.0, description="DBSCAN epsilon radius in meters")
    min_samples: int = Field(15, description="DBSCAN minimum core samples")
    match_threshold_meters: float = Field(500.0, description="Spatial centroid distance matching threshold in meters")


@router.get("/metadata")
def get_change_metadata(dataset: str = Query("real")):
    try:
        return change_service.get_change_metadata(dataset=dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/overview")
def get_change_overview(req: ChangeRequestBase):
    try:
        return change_service.get_change_overview(
            dataset=req.dataset,
            period_a_start=req.period_a_start,
            period_a_end=req.period_a_end,
            period_b_start=req.period_b_start,
            period_b_end=req.period_b_end,
            categories=req.categories,
            district=req.district,
            community_area=req.community_area
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/categories")
def get_category_changes(req: ChangeRequestBase):
    try:
        return change_service.get_category_changes(
            dataset=req.dataset,
            period_a_start=req.period_a_start,
            period_a_end=req.period_a_end,
            period_b_start=req.period_b_start,
            period_b_end=req.period_b_end,
            district=req.district,
            community_area=req.community_area
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/areas")
def get_area_changes(req: AreaChangeRequest):
    try:
        return change_service.get_area_changes(
            dataset=req.dataset,
            period_a_start=req.period_a_start,
            period_a_end=req.period_a_end,
            period_b_start=req.period_b_start,
            period_b_end=req.period_b_end,
            granularity=req.granularity,
            min_sample_size=req.min_sample_size
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/temporal")
def get_temporal_changes(req: ChangeRequestBase):
    try:
        return change_service.get_temporal_changes(
            dataset=req.dataset,
            period_a_start=req.period_a_start,
            period_a_end=req.period_a_end,
            period_b_start=req.period_b_start,
            period_b_end=req.period_b_end
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/hotspots")
def get_hotspot_changes(req: HotspotChangeRequest):
    try:
        return change_service.get_hotspot_changes(
            dataset=req.dataset,
            period_a_start=req.period_a_start,
            period_a_end=req.period_a_end,
            period_b_start=req.period_b_start,
            period_b_end=req.period_b_end,
            eps_meters=req.eps_meters,
            min_samples=req.min_samples,
            match_threshold_meters=req.match_threshold_meters
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/insights")
def get_change_insights(dataset: str = Query("real")):
    try:
        return {
            "dataset": dataset,
            "insights": change_service.generate_change_insights(dataset=dataset)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/explain")
def get_academic_explanation():
    return {
        "title": "Academic Methodology: Multi-Dimensional Period Comparison & Spatial Hotspot Matching",
        "concepts": [
            {
                "term": "Sample Normalization & Percentage-Point Shifts (Δpp)",
                "definition": "Comparing internal category and area percentage shares (p_i = count_i / total * 100) across periods to eliminate distortions caused by variable sample sizes or differing date range lengths."
            },
            {
                "term": "Zero-Denominator Protection",
                "definition": "Calculating relative percentage change (N_B - N_A)/N_A * 100 only when N_A > 0. If N_A = 0, the change is evaluated as null to prevent division-by-zero errors."
            },
            {
                "term": "Spatial Hotspot Matching via Haversine Centroid Distance",
                "definition": "Independent DBSCAN runs generate arbitrary cluster IDs. Hotspot spatial continuity is established by matching cluster centroids (lat, lon) within a Haversine distance threshold (500m), classifying clusters into persistent, newly emerged, and dissolved hotspots."
            },
            {
                "term": "Orthogonal Change Attribution",
                "definition": "Decomposing overall count differences along independent dimension axes (Category vs District) separately to explain composition shifts without double-counting records."
            },
            {
                "term": "Sampling Bias vs. Citywide Trend Inference",
                "definition": "Real Chicago dataset exhibits heavy historical sampling concentration in Jan 2023 & Jan 2024. Differences reflect sample availability bounds, not established citywide crime rate shifts."
            }
        ]
    }
