from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
import services.powerbi_service as powerbi_service

router = APIRouter(
    prefix="/api/powerbi",
    tags=["Microsoft Power BI Integration & Semantic Model"]
)


@router.get("/metadata")
def get_pbi_metadata(dataset: str = Query("real")):
    try:
        return powerbi_service.get_powerbi_metadata(dataset=dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model")
def get_pbi_model(dataset: str = Query("real")):
    try:
        return powerbi_service.get_powerbi_model(dataset=dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/measures")
def get_pbi_measures():
    try:
        return {
            "total_measures": len(powerbi_service.get_powerbi_measures()),
            "measures": powerbi_service.get_powerbi_measures()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/setup")
def get_pbi_setup():
    try:
        return powerbi_service.get_powerbi_setup_guide()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
def get_pbi_status(dataset: str = Query("real")):
    try:
        meta = powerbi_service.get_powerbi_metadata(dataset=dataset)
        return meta["artifact_status"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/explain")
def get_pbi_explain():
    return powerbi_service.get_powerbi_academic_explanation()
