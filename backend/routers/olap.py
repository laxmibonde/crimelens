"""
CrimeLens - Advanced Interactive OLAP Router
Exposes endpoints for Roll-Up, Drill-Down, Slice, Dice, and Pivot operations
backed by the PostgreSQL Data Warehouse.
"""

from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional, Dict, Any, List
from services.olap_service import (
    get_rollup_drilldown,
    get_pivot_matrix,
    get_olap_metadata
)

router = APIRouter(
    prefix="/api/olap",
    tags=["OLAP Data Cube Operations"]
)

@router.get("/metadata")
def read_olap_metadata(dataset: Optional[str] = Query("real")):
    """
    Returns available dimensions, hierarchy levels, and dynamic filter choices from PostgreSQL.
    """
    try:
        return get_olap_metadata(dataset=dataset or "real")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch OLAP metadata: {str(e)}")


@router.post("/rollup")
def execute_rollup_drilldown(payload: Dict[str, Any] = Body(...)):
    """
    Executes Roll-Up or Drill-Down operation on specified dimension hierarchy level.
    """
    try:
        dimension = payload.get("dimension", "month")
        filters = payload.get("filters", {})
        limit = payload.get("limit", 100)
        dataset = payload.get("dataset", "real")

        result = get_rollup_drilldown(dimension=dimension, filters=filters, limit=limit, dataset=dataset)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OLAP Roll-Up/Drill-Down failed: {str(e)}")


@router.post("/slice-dice")
def execute_slice_dice_endpoint(payload: Dict[str, Any] = Body(...)):
    """
    Executes Slice or Dice multi-dimensional filtering.
    """
    try:
        dimension = payload.get("dimension", "primary_type")
        filters = payload.get("filters", {})
        limit = payload.get("limit", 100)
        dataset = payload.get("dataset", "real")

        result = get_rollup_drilldown(dimension=dimension, filters=filters, limit=limit, dataset=dataset)
        result["operation_type"] = "DICE" if (len(filters) > 1) else "SLICE"
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OLAP Slice/Dice failed: {str(e)}")


@router.post("/pivot")
def execute_pivot_endpoint(payload: Dict[str, Any] = Body(...)):
    """
    Executes OLAP Pivot cross-tabulation operation.
    """
    try:
        row_dim = payload.get("row_dim", "district")
        col_dim = payload.get("col_dim", "primary_type")
        filters = payload.get("filters", {})
        limit = payload.get("limit", 25)
        dataset = payload.get("dataset", "real")

        if row_dim == col_dim:
            raise HTTPException(status_code=400, detail="Row dimension and Column dimension must be different.")

        result = get_pivot_matrix(row_dim=row_dim, col_dim=col_dim, filters=filters, limit=limit, dataset=dataset)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OLAP Pivot failed: {str(e)}")
