"""
CrimeLens - Apriori Association Rule Mining FastAPI Router
Exposes RESTful endpoints for transaction-based association rule mining,
frequent itemset evaluation, parameter validation, and algorithm explanations.
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

from services.apriori_service import (
    ALL_AVAILABLE_ATTRIBUTES,
    DEFAULT_MINING_ATTRIBUTES,
    mine_apriori_rules,
    get_apriori_explanation_metadata
)
from database import get_schema_for_dataset

router = APIRouter(prefix="/api/apriori", tags=["Apriori Association Rules"])


class AprioriAnalysisRequest(BaseModel):
    dataset: str = Field(default="real", description="Dataset identifier: 'real' or 'synthetic'")
    min_support: float = Field(default=0.05, ge=0.001, le=0.95, description="Minimum support threshold (0.001 to 0.95)")
    min_confidence: float = Field(default=0.30, ge=0.01, le=1.00, description="Minimum confidence threshold (0.01 to 1.00)")
    min_lift: float = Field(default=1.0, ge=0.1, le=100.0, description="Minimum lift threshold (0.1 to 100.0)")
    max_len: int = Field(default=3, ge=2, le=5, description="Maximum itemset length (2 to 5)")
    selected_attributes: Optional[List[str]] = Field(default=None, description="Selected attributes for mining")
    filters: Optional[Dict[str, Any]] = Field(default=None, description="Optional filters (year, month, district, primary_type)")


@router.get("/metadata")
def get_apriori_metadata(dataset: str = Query(default="real")):
    """
    Returns available mining attributes, default parameters, and dataset schema info.
    """
    schema = get_schema_for_dataset(dataset)
    return {
        "dataset": dataset,
        "schema": schema,
        "available_attributes": ALL_AVAILABLE_ATTRIBUTES,
        "default_attributes": DEFAULT_MINING_ATTRIBUTES,
        "param_defaults": {
            "min_support": 0.05,
            "min_confidence": 0.30,
            "min_lift": 1.0,
            "max_len": 3
        },
        "param_limits": {
            "min_support": {"min": 0.001, "max": 0.50},
            "min_confidence": {"min": 0.10, "max": 1.00},
            "min_lift": {"min": 0.1, "max": 10.0},
            "max_len": {"min": 2, "max": 5}
        }
    }


@router.post("/analyze")
def analyze_apriori_rules(req: AprioriAnalysisRequest):
    """
    Executes Apriori Association Rule Mining on PostgreSQL incident transactions.
    Returns frequent itemsets, association rules, KPI summaries, and scatter plot coordinates.
    """
    try:
        results = mine_apriori_rules(
            dataset=req.dataset,
            min_support=req.min_support,
            min_confidence=req.min_confidence,
            min_lift=req.min_lift,
            max_len=req.max_len,
            selected_attributes=req.selected_attributes,
            filters=req.filters
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Apriori rule mining failed: {str(e)}")


@router.post("/frequent-itemsets")
def get_frequent_itemsets(req: AprioriAnalysisRequest):
    """
    Executes Apriori algorithm to return frequent itemsets filtered by min_support.
    """
    try:
        results = mine_apriori_rules(
            dataset=req.dataset,
            min_support=req.min_support,
            min_confidence=0.01,  # Lower confidence threshold to capture itemsets
            min_lift=0.1,
            max_len=req.max_len,
            selected_attributes=req.selected_attributes,
            filters=req.filters
        )
        return {
            "dataset": req.dataset,
            "total_transactions": results["kpi"]["total_transactions"],
            "frequent_itemsets_count": results["kpi"]["frequent_itemsets_count"],
            "frequent_itemsets": results["frequent_itemsets"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Frequent itemsets computation failed: {str(e)}")


@router.get("/explain")
def get_apriori_explanation():
    """
    Returns educational documentation and formula definitions for Apriori Association Rule Mining.
    """
    return get_apriori_explanation_metadata()
