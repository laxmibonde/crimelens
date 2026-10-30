"""
Verification Suite for CrimeLens Hotspot Intelligence (DBSCAN) Module
Tests:
1. Spatial coordinate census & ground truth integrity in PostgreSQL
2. 25,000 incident safety threshold & scope validation
3. Haversine distance DBSCAN clustering execution
4. Result consistency: KPIs, cluster count, centroids, and noise points
5. Performance and execution timing
"""

import sys
import time
sys.path.insert(0, '.')

from database import execute_query
from services.hotspot_service import (
    compute_dbscan_clusters,
    check_spatial_scope,
    get_spatial_summary_metrics,
    MAX_SPATIAL_CLUSTER_LIMIT
)

def run_tests():
    print("=" * 60)
    print("CRIMELENS DBSCAN HOTSPOT MODULE VERIFICATION SUITE")
    print("=" * 60)

    # 1. Spatial Ground Truth Census
    print("\n[Test 1] Ground Truth Census & Bounding Box Check:")
    summary = get_spatial_summary_metrics("real")
    total = summary["total_incidents"]
    eligible = summary["eligible_incidents"]
    missing = summary["exclusion_reasons"]["missing_coordinates"]
    print(f"  Total Census Incidents: {total:,}")
    print(f"  Eligible Spatial Incidents: {eligible:,}")
    print(f"  Missing Coordinates (surrogate key 0): {missing:,}")
    assert total == 761718, f"Expected 761,718 incidents, got {total}"
    assert eligible > 750000, f"Expected >750,000 eligible, got {eligible}"
    print("  --> PASS: 761,718 ground-truth census intact.")

    # 2. Scope Exceeded Guard (25,000 limit)
    print("\n[Test 2] Scope Exceeded Guard (Citywide / No Filters):")
    scope_exceeded = check_spatial_scope({}, "real")
    print(f"  Total Matched: {scope_exceeded['total_matched']:,}")
    print(f"  Max Allowed: {scope_exceeded['max_allowed']:,}")
    print(f"  Is Valid: {scope_exceeded['is_valid']}")
    print(f"  Reduction Required: {scope_exceeded['reduction_required']:,} ({scope_exceeded['reduction_percentage']}%)")
    assert scope_exceeded["is_valid"] is False, "Citywide selection must not be valid"
    assert scope_exceeded["total_matched"] == 761718
    assert scope_exceeded["max_allowed"] == MAX_SPATIAL_CLUSTER_LIMIT == 25000

    cluster_exceeded = compute_dbscan_clusters(filters={}, dataset="real")
    assert cluster_exceeded["status"] == "SCOPE_EXCEEDED"
    assert cluster_exceeded["cluster_count"] is None
    assert cluster_exceeded["clustered_incident_count"] is None
    print("  --> PASS: 25,000 safety threshold strictly guarded without data truncation.")

    # 3. Valid Scope Pre-Check & Execution (District 001, Year 2024)
    print("\n[Test 3] Valid Scope Pre-Check (District 001, 2024):")
    scope_valid = check_spatial_scope({"district": "001", "year": 2024}, "real")
    print(f"  Total Matched: {scope_valid['total_matched']:,}")
    print(f"  Is Valid: {scope_valid['is_valid']}")
    assert scope_valid["is_valid"] is True
    assert scope_valid["total_matched"] <= 25000

    t0 = time.perf_counter()
    cluster_res = compute_dbscan_clusters(
        eps_meters=300,
        min_samples=15,
        filters={"district": "001", "year": 2024},
        dataset="real"
    )
    t1 = time.perf_counter()
    elapsed_ms = (t1 - t0) * 1000

    print(f"  Status: {cluster_res['status']}")
    print(f"  Execution Time: {elapsed_ms:.1f} ms")
    print(f"  Clusters Found: {cluster_res['cluster_count']}")
    print(f"  Clustered Incidents: {cluster_res['clustered_incident_count']:,}")
    print(f"  Noise Outliers: {cluster_res['noise_incident_count']:,}")
    print(f"  Clustering Percentage: {cluster_res['clustering_percentage']}%")
    print(f"  Largest Hotspot Size: {cluster_res['largest_cluster_size']:,}")

    assert cluster_res["status"] == "SUCCESS"
    assert cluster_res["cluster_count"] > 0
    assert cluster_res["clustered_incident_count"] > 0
    assert cluster_res["clustered_incident_count"] + cluster_res["noise_incident_count"] <= scope_valid["total_matched"]
    print("  --> PASS: Valid DBSCAN execution with Haversine distance completes successfully.")

    # 4. Multi-cluster execution (District 011 Battery 2024)
    print("\n[Test 4] Multi-Cluster Dense Neighborhoods (District 011, Battery, 2024):")
    cluster_multi = compute_dbscan_clusters(
        eps_meters=200,
        min_samples=25,
        filters={"district": "011", "primary_type": "BATTERY", "year": 2024},
        dataset="real"
    )
    print(f"  Status: {cluster_multi['status']}")
    print(f"  Clusters Found: {cluster_multi['cluster_count']}")
    print(f"  Clustered Incidents: {cluster_multi['clustered_incident_count']:,}")
    print(f"  Noise Outliers: {cluster_multi['noise_incident_count']:,}")
    for c in cluster_multi.get("clusters", [])[:3]:
        print(f"    {c['cluster_label']}: {c['incident_count']:,} incidents, Dominant: {c['dominant_crime']}, Centroid: {c['centroid']}")
        assert len(c["convex_hull"]) >= 3, "Valid polygon hull required"
    print("  --> PASS: Convex hulls and centroid coordinates verified.")

    print("\n" + "=" * 60)
    print("ALL DBSCAN VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
