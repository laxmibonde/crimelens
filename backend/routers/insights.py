from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import services.insights_service as insights_service

router = APIRouter(
    prefix="/api/insights",
    tags=["Automated Data-Driven Insights & Intelligence Summary Engine"]
)

# Request Models
class GenerateInsightsRequest(BaseModel):
    dataset: str = Field("real", description="Dataset selector ('real' or 'synthetic')")
    district: Optional[str] = Field(None, description="Optional Police District filter")
    category: Optional[str] = Field(None, description="Optional Crime Category filter")
    insight_category: Optional[str] = Field(None, description="Optional filter by Insight Domain / Category")
    insight_domain: Optional[str] = Field(None, description="Optional filter by Insight Domain name")
    insight_type: Optional[str] = Field(None, description="Optional filter by Insight Type (DESCRIPTIVE, STATISTICAL_COMPARISON, PREDICTIVE_MODEL)")
    min_score: int = Field(0, description="Minimum analytical importance score threshold (0-100)")
    min_sample_size: int = Field(10, description="Minimum incident count threshold")
    max_insights: int = Field(30, description="Maximum number of insights to return")
    start_date: Optional[str] = Field(None, description="Optional start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="Optional end date (YYYY-MM-DD)")


@router.get("/metadata")
def get_insights_metadata(dataset: str = Query("real")):
    try:
        return insights_service.get_insights_metadata(dataset=dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate")
def generate_insights(req: GenerateInsightsRequest):
    try:
        target_domain = req.insight_domain or req.insight_category
        all_insights = insights_service.generate_all_insights(
            dataset=req.dataset,
            district=req.district,
            category=req.category,
            insight_domain=target_domain,
            insight_type=req.insight_type,
            min_score=req.min_score,
            min_sample_size=req.min_sample_size,
            start_date=req.start_date,
            end_date=req.end_date
        )
        sliced_insights = all_insights[:req.max_insights]
        narrative = insights_service.generate_executive_narrative(sliced_insights, dataset=req.dataset)
        
        return {
            "dataset": req.dataset,
            "total_generated": len(all_insights),
            "returned_count": len(sliced_insights),
            "insights": sliced_insights,
            "executive_summary": narrative
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summary")
def get_executive_summary(req: GenerateInsightsRequest):
    try:
        target_domain = req.insight_domain or req.insight_category
        all_insights = insights_service.generate_all_insights(
            dataset=req.dataset,
            district=req.district,
            category=req.category,
            insight_domain=target_domain,
            insight_type=req.insight_type,
            min_score=req.min_score,
            min_sample_size=req.min_sample_size,
            start_date=req.start_date,
            end_date=req.end_date
        )
        narrative = insights_service.generate_executive_narrative(all_insights, dataset=req.dataset)
        
        return {
            "dataset": req.dataset,
            "total_insights_evaluated": len(all_insights),
            "executive_summary": narrative,
            "top_insights": all_insights[:3]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/by-category")
def get_insights_by_category(req: GenerateInsightsRequest):
    try:
        all_insights = insights_service.generate_all_insights(
            dataset=req.dataset,
            district=req.district,
            category=req.category,
            min_score=req.min_score,
            min_sample_size=req.min_sample_size,
            start_date=req.start_date,
            end_date=req.end_date
        )
        grouped: Dict[str, List[Dict[str, Any]]] = {}
        for ins in all_insights:
            cat_name = ins["category"]
            if cat_name not in grouped:
                grouped[cat_name] = []
            grouped[cat_name].append(ins)
            
        return {
            "dataset": req.dataset,
            "total_insights": len(all_insights),
            "grouped_insights": grouped
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/explain")
def get_academic_explanation():
    return {
        "title": "Academic Methodology: Automated Data-Driven Insights Engine",
        "concepts": [
            {
                "term": "Deterministic Rule-Based Insight Generation",
                "definition": "Insights are constructed using validated mathematical templates applied directly to backend module outputs (DBSCAN, K-Means, Apriori, Decision Tree, Area Intelligence, Trend Analysis, What Changed?). No generative AI or LLM hallucination is used."
            },
            {
                "term": "Transparent Prioritization Scoring Formula",
                "definition": "Insights are scored on a 1-100 scale using effect magnitude (40%), log-sample size (35%), data completeness (25%), and subtractive reliability penalties for small samples or sampling bias. It never masquerades as a p-value or false statistical significance."
            },
            {
                "term": "Evidence Traceability & Lineage",
                "definition": "Every insight provides exact numerators, denominators, rates, mathematical formulas, and a direct navigation link to its originating source module."
            },
            {
                "term": "Classification Triad: Descriptive vs. Statistical vs. Predictive",
                "definition": "Insights are explicitly labeled as DESCRIPTIVE (univariate distributions, raw totals), STATISTICAL_COMPARISON (period differentials, district variations), or PREDICTIVE_MODEL (unsupervised cluster centers, decision trees, association lift ratios)."
            },
            {
                "term": "Association vs. Causation Guardrails",
                "definition": "Statistical relationships (e.g. Apriori rules, Decision Tree splits, area segmentations) are strictly labeled as historical co-occurrence or correlation, prohibiting unsupported causal or predictive crime-risk claims."
            }
        ]
    }
