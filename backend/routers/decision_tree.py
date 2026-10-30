"""
CrimeLens - Decision Tree Classification FastAPI Router
Exposes endpoints for decision tree training, evaluation, hyperparameter depth-tuning (overfitting analysis),
interactive single-incident classification inference, and algorithm explanations.
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

from services.decision_tree_service import (
    get_dataset_metadata,
    train_and_evaluate_tree,
    analyze_tree_depth_curve,
    classify_single_incident,
    get_decision_tree_explanation_metadata
)

router = APIRouter(prefix="/api/decision-tree", tags=["Decision Tree Classification"])


class DecisionTreeTrainRequest(BaseModel):
    dataset: str = Field(default="real", description="Dataset identifier: 'real' or 'synthetic'")
    max_depth: Optional[int] = Field(default=5, ge=1, le=20, description="Maximum tree depth (1 to 20)")
    min_samples_split: int = Field(default=20, ge=2, le=1000, description="Minimum samples to split an internal node")
    min_samples_leaf: int = Field(default=10, ge=1, le=500, description="Minimum samples required at a leaf node")
    criterion: str = Field(default="gini", description="Split quality criterion: 'gini' or 'entropy'")
    class_weight: Optional[str] = Field(default=None, description="Class weight mode: None or 'balanced'")
    test_size: float = Field(default=0.20, ge=0.10, le=0.50, description="Test split fraction (0.10 to 0.50)")
    filters: Optional[Dict[str, Any]] = Field(default=None, description="Optional filters")


class ClassifyExampleRequest(BaseModel):
    dataset: str = Field(default="real", description="Dataset identifier: 'real' or 'synthetic'")
    primary_type: str = Field(default="THEFT", description="Primary crime category")
    premise: str = Field(default="STREET", description="Premise description")
    district: str = Field(default="001", description="Police district")
    community_area: str = Field(default="32", description="Community area")
    hour: int = Field(default=14, ge=0, le=23, description="Incident hour (0 to 23)")
    day_of_week: str = Field(default="Friday", description="Day of week")
    month: int = Field(default=6, ge=1, le=12, description="Month (1 to 12)")
    is_weekend: bool = Field(default=False, description="Weekend flag")
    is_domestic: bool = Field(default=False, description="Domestic incident flag")
    max_depth: int = Field(default=5, ge=1, le=15, description="Tree max depth")


@router.get("/metadata")
def get_dt_metadata(dataset: str = Query(default="real")):
    """
    Returns dataset class distribution (Arrest YES/NO counts & %), available feature values, and parameter choices.
    """
    try:
        return get_dataset_metadata(dataset=dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch metadata: {str(e)}")


@router.post("/train")
def train_decision_tree(req: DecisionTreeTrainRequest):
    """
    Trains Decision Tree Classifier on PostgreSQL dataset.
    Returns performance metrics, confusion matrix, feature importances, and tree visualizer structure.
    """
    try:
        return train_and_evaluate_tree(
            dataset=req.dataset,
            max_depth=req.max_depth,
            min_samples_split=req.min_samples_split,
            min_samples_leaf=req.min_samples_leaf,
            criterion=req.criterion,
            class_weight=req.class_weight,
            test_size=req.test_size,
            filters=req.filters
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Decision Tree training failed: {str(e)}")


@router.post("/evaluate")
def evaluate_decision_tree(req: DecisionTreeTrainRequest):
    """
    Alias endpoint to evaluate decision tree performance under custom test split or parameters.
    """
    return train_decision_tree(req)


@router.post("/depth-analysis")
def get_depth_analysis(req: DecisionTreeTrainRequest):
    """
    Evaluates training vs. testing accuracy across max_depth values from 1 to 15 to analyze overfitting.
    """
    try:
        return analyze_tree_depth_curve(
            dataset=req.dataset,
            min_samples_split=req.min_samples_split,
            min_samples_leaf=req.min_samples_leaf,
            criterion=req.criterion,
            class_weight=req.class_weight,
            max_depth_limit=15
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Depth analysis failed: {str(e)}")


@router.post("/classify-example")
def classify_example_incident(req: ClassifyExampleRequest):
    """
    Performs interactive inference on a user-defined incident vector.
    Returns predicted Arrest class and class probabilities.
    """
    try:
        return classify_single_incident(
            dataset=req.dataset,
            primary_type=req.primary_type,
            premise=req.premise,
            district=req.district,
            community_area=req.community_area,
            hour=req.hour,
            day_of_week=req.day_of_week,
            month=req.month,
            is_weekend=req.is_weekend,
            is_domestic=req.is_domestic,
            max_depth=req.max_depth
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Single incident prediction failed: {str(e)}")


@router.get("/explain")
def get_decision_tree_explanation():
    """
    Returns educational theory documentation for Decision Tree Machine Learning.
    """
    return get_decision_tree_explanation_metadata()
