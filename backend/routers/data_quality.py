from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import services.data_quality_service as data_quality_service

router = APIRouter(
    prefix="/api/data-quality",
    tags=["Data Quality Intelligence & Warehouse Visualization"]
)

class ColumnProfileRequest(BaseModel):
    dataset: str = Field("real", description="Dataset selector ('real' or 'synthetic')")
    table_name: str = Field("fact_crime", description="Table name to profile")
    column_name: str = Field("source_crime_id", description="Column name to profile")


@router.get("/metadata")
def get_dq_metadata(dataset: str = Query("real")):
    try:
        return data_quality_service.get_data_quality_metadata(dataset=dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/overview")
def get_dq_overview(dataset: str = Query("real")):
    try:
        return data_quality_service.get_data_quality_overview(dataset=dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/validation")
def get_dq_validation(dataset: str = Query("real"), status_filter: Optional[str] = Query(None)):
    try:
        rules = data_quality_service.evaluate_validation_rules(dataset=dataset)
        if status_filter:
            sf_upper = status_filter.upper().strip()
            rules = [r for r in rules if r["status"] == sf_upper]
        
        scoring = data_quality_service.calculate_data_quality_scores(rules)
        return {
            "dataset": dataset,
            "total_rules": len(rules),
            "rule_counts": scoring["counts"],
            "rules": rules
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/completeness")
def get_dq_completeness(dataset: str = Query("real")):
    try:
        return data_quality_service.get_completeness_profile(dataset=dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/coverage")
def get_dq_coverage(dataset: str = Query("real")):
    try:
        return data_quality_service.get_coverage_profile(dataset=dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/schema")
def get_dq_schema(dataset: str = Query("real")):
    try:
        return data_quality_service.get_schema_explorer(dataset=dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/profile")
def get_column_profile(
    dataset: str = Query("real"),
    table_name: str = Query("fact_crime"),
    column_name: str = Query("source_crime_id")
):
    try:
        return data_quality_service.profile_column(
            dataset=dataset,
            table_name=table_name,
            column_name=column_name
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/profile")
def post_column_profile(req: ColumnProfileRequest):
    try:
        return data_quality_service.profile_column(
            dataset=req.dataset,
            table_name=req.table_name,
            column_name=req.column_name
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/comparison")
def get_dq_comparison():
    try:
        return data_quality_service.get_comparison_profile()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/issues")
def get_dq_issues(dataset: str = Query("real")):
    try:
        return data_quality_service.get_quality_issues(dataset=dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/explain")
def get_dq_explanation():
    return data_quality_service.get_academic_explanation()
