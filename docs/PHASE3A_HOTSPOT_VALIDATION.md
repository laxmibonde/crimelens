# CrimeLens — Phase 3A: DBSCAN & Hotspot Evolution Validation Report

**Date of Execution**: October 28, 2026  
**Auditor**: Antigravity Spatial Intelligence & Data Architecture  
**Database**: PostgreSQL 18.4 (`crimelens_db`)  
**Backend**: FastAPI / Uvicorn (Port 8000)  
**Frontend**: React 18 + Vite (Port 5173)  
**Warehouse Scope**: 761,718 real Chicago crime incidents (2023–2025 census) + 30,000 synthetic benchmark records  

---

## 1. Executive Summary

Phase 3A was executed to audit, validate, and harden the existing **Hotspot Intelligence** (DBSCAN) and **Hotspot Evolution** modules without altering the underlying database or introducing new infrastructure (such as PostGIS). 

### Key Achievements:
1. **Mathematical Correctness Verified**: Validated conversion of geographic degrees to radians (`np.radians([[lat, lon]])`), correct `[lat, lon]` coordinate ordering for scikit-learn Haversine BallTree, exact Great-Circle distance formula, and Earth radius constant ($R = 6,371,008.8$m). A deterministic test with known synthetic clusters separated into exactly 2 clusters and 1 noise point.
2. **Unconstrained Memory Exhaustion Guardrail Implemented**: Identified the root cause of earlier timeouts: when no geographic or date filters were supplied, the service attempted a 7-table SQL join across hundreds of thousands of records and in-memory BallTree clustering. Implemented a 0.2-second PostgreSQL `COUNT(*)` pre-check with an explicit safety threshold (`MAX_SPATIAL_CLUSTER_LIMIT = 25,000`). If a query exceeds 25,000 incidents, the system returns `status: "SCOPE_EXCEEDED"` with user guidance, **guaranteeing zero silent truncation or sampling**.
3. **Hotspot Evolution Verified**: Validated Period A vs Period B bipartite Haversine matching. Tested District 001 comparing January 2024 vs January 2025: completed in **0.525s**, identifying 3 spatially matched clusters with an average displacement of 51.8 meters.
4. **Data Integrity & Build**: Verified that all **761,718 real incidents** and **30,000 synthetic incidents** remain intact in PostgreSQL. The frontend production build completed cleanly in **14.53 seconds**.

---

## 2. DBSCAN Mathematical Correctness Audit

### Formula & Parameter Conversions
- **Earth Radius Constant**: $R_{earth} = 6,371,008.8\text{ meters}$ (IUGG mean Earth radius standard).
- **Coordinate Conversion**: `coords_deg = df[['lat', 'lon']].values` $\to$ `coords_rad = np.radians(coords_deg)`.
  - Column 0 is strictly latitude ($\phi \in [-90^\circ, 90^\circ]$).
  - Column 1 is strictly longitude ($\lambda \in [-180^\circ, 180^\circ]$).
- **Epsilon Conversion**: $\varepsilon_{radians} = \frac{\varepsilon_{meters}}{R_{earth}}$.
- **Clustering Algorithm**:
  ```python
  db = DBSCAN(
      eps=eps_radians,
      min_samples=min_samples,
      metric='haversine',
      algorithm='ball_tree'
  )
  labels = db.fit_predict(coords_rad)
  ```
- **Sample Classification**:
  - `core`: Sample indices in `db.core_sample_indices_` ($\ge \text{min\_samples}$ neighbors within $\varepsilon$).
  - `border`: Non-core samples assigned to a cluster ($label \ge 0$).
  - `noise`: Samples with insufficient density ($label = -1$).
- **Missing Coordinates**: All 7,468 non-geocoded incidents (`location_key = 0`) are excluded from spatial distance calculations while preserved in the data warehouse.

### Deterministic Test Results (`scratch/verify_dbscan_math.py`)
- **Test 1 — Geodesic Distance Accuracy**: Chicago City Hall `(41.8832, -87.6324)` to Millennium Park `(41.8827, -87.6233)`. Calculated distance: **755.4m** (Expected: ~754m). **Result: PASS**.
- **Test 2 — Known Cluster Separation**:
  - Cluster 1: 5 synthetic points within 150m of Loop center `(41.8800, -87.6300)`.
  - Cluster 2: 4 synthetic points within 150m of River North `(41.8920, -87.6280)` (~1.3km north).
  - Noise: 1 point at Logan Square `(41.9280, -87.7050)` (>8km away).
  - Clustering parameters: $\varepsilon = 250.0\text{m}$, `min_samples = 4`.
  - Result: Exactly 2 clusters (sizes 5 and 4) and 1 noise point (`label = -1`). **Result: PASS**.

---

## 3. Performance Problem Root Cause & Prevention Guardrails

### Diagnosis of Previous Timeouts
1. In unconstrained queries (e.g. `year = 2024` with no district filter), 259,670 incidents were matched.
2. In-memory DBSCAN on $>50,000$ points with BallTree scales with high memory footprint ($O(N \log N)$ to $O(N^2)$), causing Python/PostgreSQL to exceed Windows memory commit pagefile limits.
3. Earlier versions attempted silent slicing or truncation, which violates academic transparency.

### Architecture Guardrail Implemented
1. **Pre-Flight Count Query**: Before extracting coordinates, `extract_spatial_incidents` executes an indexed count query:
   ```sql
   SELECT COUNT(f.crime_fact_key) AS total_cnt
   FROM {schema}.fact_crime f
   JOIN {schema}.dim_time t ON f.time_key = t.time_key
   JOIN {schema}.dim_area a ON f.area_key = a.area_key
   JOIN {schema}.dim_crime c ON f.crime_key = c.crime_key
   {where_sql};
   ```
2. **Explicit Safety Boundary**: `MAX_SPATIAL_CLUSTER_LIMIT = 25,000`.
3. **Structured Response (Zero Silent Truncation)**: If `total_cnt > 25,000`, the server responds in $<0.2$ seconds with:
   ```json
   {
       "status": "SCOPE_EXCEEDED",
       "total_matched": 259670,
       "max_allowed": 25000,
       "message": "Selected filter criteria matches 259,670 incidents, exceeding the maximum safe spatial clustering limit of 25,000. Please refine your selection by choosing a specific police district, smaller date range, or crime category to run DBSCAN density clustering without truncation."
   }
   ```
4. **UI Refinement Guidance**: `HotspotsPage.jsx` renders an explicit warning banner explaining the exact volume matched and recommending filter refinements.
5. **Safe Default**: Initial page state defaults `selectedDistrict` to `'001'` (District 1 - Central) and `selectedYear` to `'2024'` (~14,900 incidents), allowing instant rendering upon page visit in **1.03 seconds**.

---

## 4. Phase 3A Execution Evidence & Actual Test Results

Executed via automated verification harness `scratch/verify_phase3a.py`:

| Test Step | Description | Execution Time | Server Output / Evidence | Status |
|---|---|---|---|---|
| **Step 2** | DBSCAN Mathematical Verification | **0.42s** | Haversine: 755.4m; Cluster separation: 2 clusters, 1 noise point | **PASS** |
| **Step 3** | Bounded District 001 DBSCAN (`district: '001'`, `year: 2024`, $\varepsilon=150$m, `min_samples=20`) | **1.035s** | HTTP 200 \| `status: SUCCESS` \| `cluster_count: 6` \| `clustered_incidents: 14691` \| `noise_incidents: 142` | **PASS** |
| **Step 4** | Large-Workload Guardrail (`year: 2024`, no district $\approx 259\text{k}$ incidents) | **0.196s** | HTTP 200 \| `status: SCOPE_EXCEEDED` \| `total_matched: 259670` \| Zero silent truncation \| Helpful guidance message | **PASS** |
| **Step 5 & 6** | Bounded Hotspot Evolution Comparison (Period A: 2024-01 vs Period B: 2025-01, District 001, threshold 500m) | **0.525s** | HTTP 200 \| `matches_evaluated: 3` \| `spatially_matched: 3` \| Period A centroids matched to Period B centroids (displacement: 51.8m) | **PASS** |
| **Step 7** | Frontend Production Build (`npm run build`) | **14.53s** | `✓ 2354 modules transformed. Built in 14.53s` \| 0 syntax/chunk errors | **PASS** |
| **Step 8** | Database Warehouse Row Count Verification | **0.08s** | `public.fact_crime`: **761,718** \| `synthetic_data.fact_crime`: **30,000** | **PASS** |

---

## 5. Files Changed During Phase 3A

1. **`backend/services/hotspot_service.py`**:
   - Added `MAX_SPATIAL_CLUSTER_LIMIT = 25000` constant.
   - Added indexed `COUNT(*)` pre-check in `extract_spatial_incidents` to prevent memory exhaustion.
   - Added `status: "SCOPE_EXCEEDED"` payload with informative guidance in `compute_dbscan_clusters`.
   - Added caching for `trend_key` in `get_timeline_trends`.
2. **`frontend/src/pages/HotspotsPage.jsx`**:
   - Initialized default filter state to `selectedDistrict: '001'` and `selectedYear: '2024'` for immediate sub-second clustering.
   - Added alert banner when `clusterData?.status === 'SCOPE_EXCEEDED'`.
   - Added active filter summary indicator pills (Year, District, Offense Category, Diurnal Period) directly above the Leaflet map.
3. **`scratch/verify_dbscan_math.py`**:
   - Deterministic test script verifying Haversine math, coordinate ordering, and cluster counts.
4. **`scratch/verify_phase3a.py`**:
   - Automated verification script validating bounded clustering, guardrails, evolution comparison, and database integrity.

---

## 6. Unresolved Issues & Phase 3B Recommendations

1. **Citywide Unfiltered Clustering**: Because in-memory DBSCAN requires pairwise neighbor evaluation, citywide clustering ($>25,000$ points) currently triggers the `SCOPE_EXCEEDED` guardrail. In Phase 3B, a hierarchical spatial partitioning approach (e.g. clustering per district and merging overlapping border clusters) or PostGIS `ST_ClusterDBSCAN` should be designed.
2. **Evolution Polygon Overlap**: Current evolution matching compares cluster centroids via Haversine distance. In Phase 3B, convex hull polygon intersection-over-union (IoU) could complement centroid displacement metrics.

---

## 7. Completion Status

- **Phase 3A Status**: **COMPLETE & VERIFIED**
- **Database Safety**: 100% preserved (761,718 real facts, 30,000 synthetic facts, 0 deleted).
- **Backend Health**: HTTP 200 `healthy`.
- **Frontend Build**: Production build clean (14.53s).
