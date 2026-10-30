import urllib.request
import json
import time
import sys

BASE_URL = "http://127.0.0.1:8000"

BENCHMARKS = [
    {
        "name": "Command Center KPIs",
        "method": "GET",
        "endpoint": "/api/dashboard/summary?dataset=real",
        "payload": None,
        "input_desc": "761,718 real incidents (all-time)",
        "filters": {"dataset": "real"}
    },
    {
        "name": "OLAP Rollups",
        "method": "POST",
        "endpoint": "/api/olap/rollup",
        "payload": {"dimension": "month", "filters": {"year": 2024}, "limit": 50, "dataset": "real"},
        "input_desc": "2024 incidents (259,670 rows) rolled up by month",
        "filters": {"year": 2024, "dimension": "month"}
    },
    {
        "name": "Monthly Trend Analysis",
        "method": "POST",
        "endpoint": "/api/trends/timeseries",
        "payload": {"dataset": "real", "granularity": "monthly"},
        "input_desc": "761,718 incidents across 36 months",
        "filters": {"granularity": "monthly"}
    },
    {
        "name": "District Comparisons",
        "method": "POST",
        "endpoint": "/api/area-intelligence/districts-summary",
        "payload": {"dataset": "real", "filters": {}},
        "input_desc": "All 22 CPD districts aggregated",
        "filters": {"dataset": "real"}
    },
    {
        "name": "Automated Insights",
        "method": "POST",
        "endpoint": "/api/insights/summary",
        "payload": {"dataset": "real", "min_score": 0, "max_insights": 10},
        "input_desc": "Statistical distribution & anomalies on 761,718 incidents",
        "filters": {"min_score": 0, "max_insights": 10}
    },
    {
        "name": "Data Quality Summaries",
        "method": "GET",
        "endpoint": "/api/data-quality/overview?dataset=real",
        "payload": None,
        "input_desc": "14-rule data warehouse integrity validation",
        "filters": {"dataset": "real"}
    },
    {
        "name": "Bounded DBSCAN",
        "method": "POST",
        "endpoint": "/api/hotspots/clusters",
        "payload": {"eps_meters": 300, "min_samples": 15, "filters": {"district": "001", "year": 2024}, "dataset": "real"},
        "input_desc": "District 001, 2024 (bounded subset ~14k pts)",
        "filters": {"district": "001", "year": 2024, "eps": 300, "min_pts": 15}
    },
    {
        "name": "Bounded Hotspot Evolution",
        "method": "POST",
        "endpoint": "/api/hotspots/timeline/compare",
        "payload": {"period_a": {"year": 2023, "month": 1, "district": "001"}, "period_b": {"year": 2024, "month": 1, "district": "001"}, "eps_meters": 300, "min_samples": 15, "dataset": "real"},
        "input_desc": "District 001 (Jan 2023 vs Jan 2024)",
        "filters": {"district": "001", "pA": "2023-01", "pB": "2024-01"}
    },
    {
        "name": "K-Means Area Clustering",
        "method": "POST",
        "endpoint": "/api/kmeans/analyze",
        "payload": {"dataset": "real", "k": 4, "area_granularity": "district"},
        "input_desc": "22 CPD Districts feature matrix",
        "filters": {"k": 4, "granularity": "district"}
    },
    {
        "name": "Apriori Association Rules",
        "method": "POST",
        "endpoint": "/api/apriori/analyze",
        "payload": {"dataset": "real", "min_support": 0.05, "min_confidence": 0.3, "max_len": 3},
        "input_desc": "Transactions sample / representative rule mining",
        "filters": {"min_support": 0.05, "min_confidence": 0.3}
    },
    {
        "name": "Decision Tree Metadata",
        "method": "GET",
        "endpoint": "/api/decision-tree/metadata?dataset=real",
        "payload": None,
        "input_desc": "Decision tree model architecture & features",
        "filters": {"dataset": "real"}
    },
    {
        "name": "Report Generation Preview",
        "method": "POST",
        "endpoint": "/api/reports/preview",
        "payload": {"dataset": "real", "report_type": "executive_summary", "filters": {}},
        "input_desc": "Multi-table executive aggregation",
        "filters": {"report_type": "executive_summary"}
    }
]

def run_benchmark():
    results = []
    print("=" * 110)
    print(f"{'Workload Name':28} | {'Method':6} | {'Run 1 (Cold)':12} | {'Run 2 (Warm)':12} | {'Run 3 (Warm)':12} | {'Mean ms':9} | {'Size':9} | {'Status'}")
    print("=" * 110)

    for item in BENCHMARKS:
        times = []
        status = "FAIL"
        data_size = 0
        err_msg = ""

        for run_idx in range(3):
            url = BASE_URL + item["endpoint"]
            req = urllib.request.Request(url, method=item["method"])
            req.add_header("Content-Type", "application/json")
            req.add_header("Connection", "close")
            data_bytes = json.dumps(item["payload"]).encode("utf-8") if item["payload"] else None

            t0 = time.perf_counter()
            try:
                with urllib.request.urlopen(req, data=data_bytes, timeout=60) as response:
                    body = response.read()
                    elapsed = (time.perf_counter() - t0) * 1000
                    times.append(elapsed)
                    data_size = len(body)
                    status = "PASS"
            except Exception as e:
                elapsed = (time.perf_counter() - t0) * 1000
                times.append(elapsed)
                err_msg = str(e)
                status = f"ERR: {err_msg[:20]}"
            
            # Brief pause between iterations
            time.sleep(0.1)

        mean_ms = sum(times) / len(times) if times else 0
        r1_str = f"{times[0]:8.1f}ms" if len(times) > 0 else "N/A"
        r2_str = f"{times[1]:8.1f}ms" if len(times) > 1 else "N/A"
        r3_str = f"{times[2]:8.1f}ms" if len(times) > 2 else "N/A"
        mean_str = f"{mean_ms:7.1f}ms"

        print(f"{item['name']:28} | {item['method']:6} | {r1_str:12} | {r2_str:12} | {r3_str:12} | {mean_str:9} | {data_size:7} B | {status}")
        results.append({
            "name": item["name"],
            "endpoint": item["endpoint"],
            "method": item["method"],
            "filters": item["filters"],
            "input_desc": item["input_desc"],
            "run1_cold_ms": round(times[0], 1) if len(times) > 0 else 0,
            "run2_warm_ms": round(times[1], 1) if len(times) > 1 else 0,
            "run3_warm_ms": round(times[2], 1) if len(times) > 2 else 0,
            "mean_ms": round(mean_ms, 1),
            "size_bytes": data_size,
            "status": status
        })

    print("=" * 110)
    with open("benchmark_after_results.json", "w") as f:
        json.dump(results, f, indent=2)
    print("After benchmark results saved to backend/benchmark_after_results.json")

if __name__ == "__main__":
    run_benchmark()
