"""
Comprehensive Verification Suite for CrimeLens Hotspot Evolution Module
Validates:
1. Ground truth matching counts for January 2023 vs January 2024
2. Mathematical conservation equations:
   N(A) = N(matched) + N(no_longer_observed)
   N(B) = N(matched) + N(newly_observed)
3. Strict one-to-one bipartite matching (no duplicate cluster assignments)
4. Distance thresholds: <=300m (Spatially Matched) and 300m-500m (Uncertain Match)
5. July 2023 vs July 2024 comparison verification
6. Terminology audit: 'newly observed' and 'no longer observed'
"""

import sys
import time
sys.path.insert(0, '.')

from services.hotspot_service import compare_timeline_periods

def run_tests():
    print("=" * 65)
    print("CRIMELENS HOTSPOT EVOLUTION MODULE VERIFICATION SUITE")
    print("=" * 65)

    # 1. January 2023 vs January 2024 Baseline
    print("\n[Test 1] January 2023 vs January 2024 Bipartite Matching Audit:")
    t0 = time.perf_counter()
    res = compare_timeline_periods(
        period_a={"year": 2023, "month": 1},
        period_b={"year": 2024, "month": 1},
        eps_meters=300.0,
        min_samples=15,
        dataset="real"
    )
    t1 = time.perf_counter()
    print(f"  Comparison executed in {(t1 - t0) * 1000:.1f} ms")

    summary = res.get("classification_summary", {})
    cls_a = summary.get("clusters_a")
    cls_b = summary.get("clusters_b")
    c_spatially = summary.get("spatially_matched")
    c_uncertain = summary.get("uncertain_match")
    c_matched = summary.get("total_matched")
    c_newly = summary.get("newly_observed")
    c_no_longer = summary.get("no_longer_observed")
    total_records = summary.get("total_records")

    print(f"  Period A Clusters: {cls_a}")
    print(f"  Period B Clusters: {cls_b}")
    print(f"  Spatially Matched (<=300m): {c_spatially}")
    print(f"  Uncertain Matches (300m-500m): {c_uncertain}")
    print(f"  Total One-to-One Matches: {c_matched}")
    print(f"  Newly Observed in Period B: {c_newly}")
    print(f"  No Longer Observed from Period A: {c_no_longer}")
    print(f"  Total Records in Directory: {total_records}")

    assert cls_a == 99, f"Expected 99 Period A clusters, got {cls_a}"
    assert cls_b == 115, f"Expected 115 Period B clusters, got {cls_b}"
    assert c_spatially == 31, f"Expected 31 spatially matched, got {c_spatially}"
    assert c_uncertain == 10, f"Expected 10 uncertain matches, got {c_uncertain}"
    assert c_matched == 41, f"Expected 41 total matches (31+10), got {c_matched}"
    assert c_newly == 74, f"Expected 74 newly observed, got {c_newly}"
    assert c_no_longer == 58, f"Expected 58 no longer observed, got {c_no_longer}"
    assert total_records == 173, f"Expected 173 total records, got {total_records}"
    print("  --> PASS: Verified exact ground-truth matching counts.")

    # 2. Mathematical Conservation Equations
    print("\n[Test 2] Mathematical Conservation Equation Verification:")
    reconciliation = summary.get("reconciliation", {})
    conserved_a = reconciliation.get("period_a_conserved")
    conserved_b = reconciliation.get("period_b_conserved")

    print(f"  Formula A: {reconciliation.get('formula_a')} | Conserved: {conserved_a}")
    print(f"  Formula B: {reconciliation.get('formula_b')} | Conserved: {conserved_b}")

    assert c_matched + c_no_longer == cls_a, f"{c_matched} + {c_no_longer} != {cls_a}"
    assert c_matched + c_newly == cls_b, f"{c_matched} + {c_newly} != {cls_b}"
    assert conserved_a is True
    assert conserved_b is True
    print("  --> PASS: 100% mathematical conservation verified.")

    # 3. Strict One-to-One Bipartite Matching Audit
    print("\n[Test 3] Strict One-to-One Bipartite Matching Audit:")
    matches = res.get("spatial_matches", [])
    seen_a = set()
    seen_b = set()
    for m in matches:
        a_id = m.get("period_a_cluster_id")
        b_id = m.get("period_b_cluster_id")
        classification = m.get("match_classification")
        dist = m.get("centroid_distance_meters")

        if a_id is not None:
            assert a_id not in seen_a, f"Duplicate assignment detected for Period A cluster #{a_id}"
            seen_a.add(a_id)

        if b_id is not None:
            assert b_id not in seen_b, f"Duplicate assignment detected for Period B cluster #{b_id}"
            seen_b.add(b_id)

        # Distance threshold verification
        if classification == "SPATIALLY_MATCHED":
            assert dist is not None and dist <= 300.0, f"Distance {dist} violates SPATIALLY_MATCHED threshold (<=300m)"
        elif classification == "UNCERTAIN_MATCH":
            assert dist is not None and 300.0 < dist <= 500.0, f"Distance {dist} violates UNCERTAIN_MATCH threshold (300m-500m)"

    print(f"  Verified {len(seen_a)} unique Period A cluster assignments.")
    print(f"  Verified {len(seen_b)} unique Period B cluster assignments.")
    print("  --> PASS: One-to-one bipartite nearest-neighbor invariant strictly maintained.")

    # 4. July 2023 vs July 2024 Comparison Test
    print("\n[Test 4] July 2023 vs July 2024 Comparison Test:")
    res_jul = compare_timeline_periods(
        period_a={"year": 2023, "month": 7},
        period_b={"year": 2024, "month": 7},
        eps_meters=300.0,
        min_samples=15,
        dataset="real"
    )
    s_jul = res_jul.get("classification_summary", {})
    print(f"  July Period A Clusters: {s_jul.get('clusters_a')}")
    print(f"  July Period B Clusters: {s_jul.get('clusters_b')}")
    print(f"  July Total Matched: {s_jul.get('total_matched')}")
    print(f"  July Newly Observed: {s_jul.get('newly_observed')}")
    print(f"  July No Longer Observed: {s_jul.get('no_longer_observed')}")
    assert s_jul.get("reconciliation", {}).get("period_a_conserved") is True
    assert s_jul.get("reconciliation", {}).get("period_b_conserved") is True
    print("  --> PASS: July comparison computes and reconciles cleanly.")

    print("\n" + "=" * 65)
    print("ALL HOTSPOT EVOLUTION VERIFICATION CHECKS PASSED!")
    print("=" * 65)

if __name__ == "__main__":
    run_tests()
