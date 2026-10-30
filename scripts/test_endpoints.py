import sys
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE_DIR, "backend"))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

endpoints = [
    ("/api/health", {}),
    ("/api/dashboard/summary", {}),
    ("/api/dashboard/summary", {"year": 2023, "crime_type": "THEFT"}),
    ("/api/dashboard/trends", {"year": 2023}),
    ("/api/dashboard/categories", {"limit": 5}),
    ("/api/dashboard/areas", {"limit": 5}),
    ("/api/dashboard/time-analysis", {}),
    ("/api/dashboard/arrest-stats", {}),
    ("/api/dashboard/domestic-stats", {}),
    ("/api/dashboard/filters", {}),
    ("/api/dashboard/insights", {}),
]

print("=======================================================================")
print(" Testing CrimeLens Dashboard Analytics API Endpoints")
print("=======================================================================")

for path, params in endpoints:
    res = client.get(path, params=params)
    print(f"[{res.status_code}] GET {path} (Params: {params})")
    if res.status_code == 200:
        data = res.json()
        if isinstance(data, list):
            print(f"  --> Returns list of {len(data)} items. Sample item: {data[0] if data else 'Empty'}")
        elif isinstance(data, dict):
            keys = list(data.keys())
            print(f"  --> Returns dict with keys: {keys}")
    else:
        print(f"  --> ERROR: {res.text[:200]}")

print("=======================================================================\n")
