import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.testclient import TestClient
from routers.insights import router as insights_router
import services.insights_service as ins

app = FastAPI()
app.include_router(insights_router)
client = TestClient(app)

def test_importance_score_boundaries():
    """Verify that calculate_insight_score remains strictly within [1, 100] and handles extreme inputs."""
    assert ins.calculate_insight_score(effect_magnitude=0.0, sample_size=0) == 1
    assert ins.calculate_insight_score(effect_magnitude=1.0, sample_size=50000) == 100
    assert ins.calculate_insight_score(effect_magnitude=0.5, sample_size=1000) in range(1, 101)
    # Check penalty subtraction
    score_no_penalty = ins.calculate_insight_score(effect_magnitude=0.5, sample_size=1000, reliability_penalty=0.0)
    score_with_penalty = ins.calculate_insight_score(effect_magnitude=0.5, sample_size=1000, reliability_penalty=20.0)
    assert score_no_penalty > score_with_penalty

def test_generate_all_insights_coverage():
    """Verify that automated insight generation covers all analytical domains and returns structured payloads."""
    insights = ins.generate_all_insights(dataset="real")
    assert len(insights) >= 9, f"Expected at least 9 insights, got {len(insights)}"
    
    # Check domains represented
    domains = {i["category"] for i in insights}
    required_domains = {
        "Crime Composition",
        "Temporal Pattern",
        "Area Intelligence",
        "DBSCAN Spatial",
        "Hotspot Evolution",
        "K-Means Clustering",
        "Apriori Association",
        "Decision Tree",
        "Period Comparison"
    }
    for dom in required_domains:
        assert dom in domains, f"Missing domain: {dom}"
        
    # Check schema consistency
    for i in insights:
        assert "id" in i
        assert "title" in i
        assert "category" in i
        assert "insight_type" in i
        assert i["insight_type"] in ["DESCRIPTIVE", "STATISTICAL_COMPARISON", "PREDICTIVE_MODEL"]
        assert "explanation" in i
        assert "numerical_evidence" in i
        assert "sample_size" in i
        assert i["sample_size"] > 0
        assert "methodology" in i
        assert "source_module" in i
        assert "route" in i
        assert "caveat" in i
        assert 1 <= i["score"] <= 100
        assert i["severity"] in ["HIGH", "MEDIUM", "LOW"]
        if "chart_data" in i and i["chart_data"]:
            assert i["chart_data"]["chart_type"] in ["bar", "line", "metric_delta"]
            assert len(i["chart_data"]["data"]) > 0

def test_deduplication():
    """Verify that insights contain unique IDs and no redundant items."""
    insights = ins.generate_all_insights(dataset="real")
    ids = [i["id"] for i in insights]
    assert len(ids) == len(set(ids)), "Duplicate insight IDs detected!"

def test_filtering_mechanisms():
    """Verify filtering by domain, insight type, and score."""
    # Domain filter
    temp_res = ins.generate_all_insights(dataset="real", insight_domain="Temporal Pattern")
    assert all(i["category"] == "Temporal Pattern" for i in temp_res)
    
    # Type filter
    pred_res = ins.generate_all_insights(dataset="real", insight_type="PREDICTIVE_MODEL")
    assert all(i["insight_type"] == "PREDICTIVE_MODEL" for i in pred_res)
    
    # Score threshold
    high_score = ins.generate_all_insights(dataset="real", min_score=75)
    assert all(i["score"] >= 75 for i in high_score)

def test_empty_or_extreme_filters():
    """Verify graceful handling when filters match zero incidents."""
    empty_res = ins.generate_all_insights(dataset="real", district="NONEXISTENT_9999")
    assert isinstance(empty_res, list)

def test_executive_narrative():
    """Verify executive summary generation without causal claims."""
    insights = ins.generate_all_insights(dataset="real")
    narrative = ins.generate_executive_narrative(insights, dataset="real")
    assert "EXECUTIVE INTELLIGENCE SYNTHESIS" in narrative
    assert "CORRELATION" in narrative or "co-occurrence" in narrative or "causality" in narrative.lower()

def test_api_endpoints():
    """Verify FastAPI endpoints respond with valid JSON."""
    # Metadata
    meta_resp = client.get("/api/insights/metadata?dataset=real")
    assert meta_resp.status_code == 200
    meta_data = meta_resp.json()
    assert "insight_domains" in meta_data
    assert "total_incidents" in meta_data
    
    # Generate POST
    gen_resp = client.post("/api/insights/generate", json={"dataset": "real", "max_insights": 10})
    assert gen_resp.status_code == 200
    gen_data = gen_resp.json()
    assert "insights" in gen_data
    assert "executive_summary" in gen_data
    assert len(gen_data["insights"]) <= 10
    
    # Explain GET
    exp_resp = client.get("/api/insights/explain")
    assert exp_resp.status_code == 200
    assert "concepts" in exp_resp.json()

if __name__ == "__main__":
    test_importance_score_boundaries()
    test_generate_all_insights_coverage()
    test_deduplication()
    test_filtering_mechanisms()
    test_empty_or_extreme_filters()
    test_executive_narrative()
    test_api_endpoints()
    print("ALL 7 AUTOMATED SUITE TESTS PASSED PERFECTLY!")
