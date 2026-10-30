from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import services.trend_analysis_service as trend_service

router = APIRouter(
    prefix="/api/trends",
    tags=["Advanced Crime Trend Analysis & Temporal Intelligence"]
)

# Request Models
class TimeseriesRequest(BaseModel):
    dataset: str = Field("real", description="Dataset selector ('real' or 'synthetic')")
    granularity: str = Field("month", description="Time granularity ('hour', 'day_of_week', 'week', 'month', 'quarter', 'year')")
    categories: Optional[List[str]] = Field(None, description="Optional filter by crime primary types")
    district: Optional[int] = Field(None, description="Optional filter by Police District number")
    community_area: Optional[int] = Field(None, description="Optional filter by Community Area number")
    start_date: Optional[str] = Field(None, description="Start date filter (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date filter (YYYY-MM-DD)")

class ComparePeriodsRequest(BaseModel):
    dataset: str = Field("real", description="Dataset selector ('real' or 'synthetic')")
    period_a_start: str = Field("2023-01-01", description="Period A start date (YYYY-MM-DD)")
    period_a_end: str = Field("2023-01-31", description="Period A end date (YYYY-MM-DD)")
    period_b_start: str = Field("2024-01-01", description="Period B start date (YYYY-MM-DD)")
    period_b_end: str = Field("2024-01-31", description="Period B end date (YYYY-MM-DD)")
    district: Optional[int] = Field(None, description="Optional Police District filter")
    community_area: Optional[int] = Field(None, description="Optional Community Area filter")

class HeatmapRequest(BaseModel):
    dataset: str = Field("real", description="Dataset selector ('real' or 'synthetic')")
    categories: Optional[List[str]] = Field(None, description="Optional filter by crime categories")
    district: Optional[int] = Field(None, description="Optional Police District filter")
    community_area: Optional[int] = Field(None, description="Optional Community Area filter")
    normalize: bool = Field(False, description="Toggle between raw incident count and normalized sample share percentage")

class CategoryTrendsRequest(BaseModel):
    dataset: str = Field("real", description="Dataset selector ('real' or 'synthetic')")
    categories: Optional[List[str]] = Field(None, description="List of crime categories to compare")
    district: Optional[int] = Field(None, description="Optional Police District filter")

class SeasonalityRequest(BaseModel):
    dataset: str = Field("real", description="Dataset selector ('real' or 'synthetic')")
    district: Optional[int] = Field(None, description="Optional Police District filter")


@router.get("/metadata")
def get_trends_metadata(dataset: str = Query("real")):
    try:
        return trend_service.get_trends_metadata(dataset=dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/timeseries")
def get_timeseries(req: TimeseriesRequest):
    try:
        return trend_service.get_timeseries_analysis(
            dataset=req.dataset,
            granularity=req.granularity,
            categories=req.categories,
            district=req.district,
            community_area=req.community_area,
            start_date=req.start_date,
            end_date=req.end_date
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compare-periods")
def compare_periods(req: ComparePeriodsRequest):
    try:
        return trend_service.compare_periods(
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


@router.post("/heatmap")
def get_day_hour_heatmap(req: HeatmapRequest):
    try:
        return trend_service.get_day_hour_heatmap(
            dataset=req.dataset,
            categories=req.categories,
            district=req.district,
            community_area=req.community_area,
            normalize=req.normalize
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/category-trends")
def get_category_trends(req: CategoryTrendsRequest):
    try:
        return trend_service.get_category_trends(
            dataset=req.dataset,
            categories=req.categories,
            district=req.district
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/seasonality")
def get_seasonality(req: SeasonalityRequest):
    try:
        return trend_service.get_seasonality_analysis(
            dataset=req.dataset,
            district=req.district
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/insights")
def get_temporal_insights(dataset: str = Query("real"), district: Optional[int] = Query(None)):
    try:
        return {
            "dataset": dataset,
            "district": district,
            "insights": trend_service.generate_temporal_insights(dataset=dataset, district=str(district) if district else None)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/explain")
def get_academic_explanation():
    return {
        "title": "Academic Methodology & Concepts: Advanced Crime Trend Analysis",
        "concepts": [
            {
                "term": "Temporal Aggregation & OLAP Roll-Up",
                "definition": "Group-by operations along the time hierarchy (Hour -> Day -> Week -> Month -> Quarter -> Year) to analyze crime patterns at multiple granularities across the 36-month warehouse census."
            },
            {
                "term": "Moving Averages (MA-3, MA-6) & Sequential Continuity",
                "definition": "Smoothed time series values computed over rolling window periods (3 and 6 intervals) with expanding window min_periods=1 for initial history. Moving averages are strictly restricted to sequential chronologically continuous series (Week, Month, Quarter, Year) and disabled for non-sequential categorical cycles (Day of Week, Hour of Day)."
            },
            {
                "term": "Period-Over-Period Comparison & Daily Velocity Normalization",
                "definition": "Comparative analysis between custom periods calculating absolute differences, relative percentage changes, and category composition shifts in percentage points (pp). Incorporates calendar day durations and daily incident velocity (incidents/day) to prevent duration disparity distortions when comparing intervals of unequal length."
            },
            {
                "term": "Zero-Denominator Protection",
                "definition": "Preventing division-by-zero errors when calculating relative percentage changes for periods with zero baseline incidents by setting undefined ratios to null."
            },
            {
                "term": "Exploratory Seasonality vs. Multi-Cycle STL Decomposition",
                "definition": "The warehouse covers 3 full calendar years (2023-2025, 36 months). While 3 annual cycles provide preliminary recurring periodicity, classical statistical STL decomposition ideally requires 5+ cycles to robustly isolate stationary seasonal factors from macro secular trends and policy interventions. Observations represent empirical patterns across the 36-month warehouse census."
            },
            {
                "term": "Warehouse Census Scope & Administrative Reporting Artifacts",
                "definition": "The real warehouse contains 761,718 recorded crime incidents from January 1, 2023 through December 31, 2025. Diurnal analysis accounts for reporting practices where midnight (00:00) commonly serves as an administrative default timestamp for unobserved incident times, documenting recorded database frequency rather than assuming elevated real-time risk."
            }
        ]
    }
