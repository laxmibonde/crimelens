from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import services.etl_monitoring_service as etl_monitoring_service

router = APIRouter(
    prefix="/api/etl",
    tags=["ETL Monitoring, Pipeline Observability & Data Lineage"]
)

# Request Models
class ETLHealthRequest(BaseModel):
    dataset: str = Field("real", description="Dataset selector ('real' or 'synthetic')")


class ETLReconciliationRequest(BaseModel):
    dataset: str = Field("real", description="Dataset selector ('real' or 'synthetic')")


@router.get("/metadata")
def get_etl_metadata(dataset: str = Query("real")):
    try:
        return etl_monitoring_service.get_etl_metadata(dataset=dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pipeline-stages")
def get_pipeline_stages(dataset: str = Query("real")):
    try:
        return {
            "dataset": dataset,
            "stages": etl_monitoring_service.get_pipeline_stages(dataset=dataset)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health-check")
def get_warehouse_health(dataset: str = Query("real")):
    try:
        return etl_monitoring_service.inspect_warehouse_health(dataset=dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/health-check")
def post_warehouse_health(req: ETLHealthRequest):
    try:
        return etl_monitoring_service.inspect_warehouse_health(dataset=req.dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reconciliation")
def get_reconciliation(dataset: str = Query("real")):
    try:
        return etl_monitoring_service.reconcile_source_to_warehouse(dataset=dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reconciliation")
def post_reconciliation(req: ETLReconciliationRequest):
    try:
        return etl_monitoring_service.reconcile_source_to_warehouse(dataset=req.dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lineage")
def get_data_lineage(dataset: str = Query("real")):
    try:
        return etl_monitoring_service.get_data_lineage_graph(dataset=dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/explain")
def get_academic_explanation():
    return {
        "title": "Academic Methodology: ETL Observability & Warehouse Integrity",
        "concepts": [
            {
                "term": "Zero-Fabrication Data Observability",
                "definition": "Pipeline monitoring reflects true empirical database states and raw CSV source metrics. No historical execution logs or timestamps are synthesized."
            },
            {
                "term": "Star Schema Referential Integrity Audit",
                "definition": "Fact table foreign keys are evaluated via SQL LEFT JOINs against all dimension tables to confirm zero orphan keys."
            },
            {
                "term": "Source-to-Warehouse Reconciliation",
                "definition": "Raw CSV line counts and unique business key profiling are compared against loaded fact table records to verify lossless canonical ingestion."
            },
            {
                "term": "End-to-End Data Lineage Graphing",
                "definition": "Traces the complete data journey from raw CSV extraction through staging, dimensional transformation, fact loading, and final DWM analytical exploitation."
            }
        ]
    }
