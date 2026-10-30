# CrimeLens — Phase 14 Report: What Changed? Multi-Dimensional Comparison Engine

## 1. Objective
The objective of Phase 14 is to build an interactive, production-grade **"What Changed?" Multi-Dimensional Comparison Engine** within CrimeLens. This module provides a unified workspace for comparing two user-selected historical time periods ($Period_A$ baseline vs. $Period_B$ target) across crime category compositions, police districts, community areas, diurnal temporal patterns, and spatial DBSCAN hotspots.

---

## 2. Architecture & Data Warehouse Integration
The architecture integrates directly with PostgreSQL 18 star schemas (`public` for real data, `synthetic_data` for synthetic demo data).

```
[User Selection: Period A vs Period B] 
          │
          ├──> Temporal Aggregation (Hour, Day, Month)
          ├──> Category & Geographic Dimension Shifts (Δpp)
          ├──> Spatial DBSCAN Hotspots + Haversine Centroid Distance Matching
          └──> Deterministic Change Attribution & Reliability Panel
```

---

## 3. Mathematical & Aggregation Methodology

### A. Incident Counts & Daily Rates
For baseline $Period_A$ ($start_A \dots end_A$) and target $Period_B$ ($start_B \dots end_B$), inclusive calendar days $D_A$ and $D_B$ are calculated as:
$$D = (end\_date - start\_date).\text{days} + 1$$
$$\text{Daily Incident Rate} = \frac{N}{D}$$

### B. Count Differences & Zero-Denominator Relative Change
$$\text{Absolute Count Difference} = N_B - N_A$$
$$\text{Relative Percentage Change (\%)} = \begin{cases} 
\left(\frac{N_B - N_A}{N_A}\right) \times 100\% & \text{if } N_A > 0 \\
\text{null} & \text{if } N_A = 0 
\end{cases}$$

### C. Sample Normalization & Percentage-Point Shift ($\Delta\text{pp}$)
To eliminate sample size distortion when comparing periods of different overall volume or length:
$$p_{c, A} = \frac{N_{c, A}}{N_A} \times 100\%, \quad p_{c, B} = \frac{N_{c, B}}{N_B} \times 100\%$$
$$\Delta\text{pp}_c = p_{c, B} - p_{c, A}$$

### D. Spatial DBSCAN Hotspot Matching (Haversine Centroid Distance)
DBSCAN clustering ($eps=300\text{m}$, $min\_samples=15$) is executed independently on Period A and Period B spatial coordinates. Clusters are matched via **Haversine centroid distance** $d(C_A, C_B)$:
$$d(C_A, C_B) = 2 R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos\phi_A \cos\phi_B \sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$

Matching Classification:
- **`SPATIALLY_MATCHED`**: $d(C_A, C_B) \le 500\text{m}$ (Persistent Hotspot with volume change & centroid drift).
- **`NEWLY_OBSERVED`**: Cluster present in Period B with no Period A match within threshold.
- **`NO_LONGER_OBSERVED`**: Cluster present in Period A with no Period B match within threshold.

---

## 4. Real vs. Synthetic Dataset Comparison

### Real Dataset Comparison (`public.fact_crime`, 49,981 incidents)
*Comparison: January 2023 (Period A) vs. January 2024 (Period B)*
- **Observed Days**: $D_A = 31$ days, $D_B = 31$ days
- **Incident Counts**: $N_A = 19,914$, $N_B = 18,524$
- **Absolute Count Difference**: **-1,390** incidents (**-6.98%** relative change)
- **Arrest Rate**: 17.65% (Jan 2023) vs 17.21% (Jan 2024) ($\Delta\text{pp} = -0.44\text{ pp}$)
- **Domestic Share**: 15.34% (Jan 2023) vs 15.82% (Jan 2024) ($\Delta\text{pp} = +0.48\text{ pp}$)
- **Top Category Shifts**:
  - `MOTOR VEHICLE THEFT`: 23.45% in Jan 2023 vs 18.89% in Jan 2024 ($\Delta\text{pp} = -4.56\text{ pp}$)
  - `THEFT`: 18.12% in Jan 2023 vs 19.85% in Jan 2024 ($\Delta\text{pp} = +1.73\text{ pp}$)
- **Spatial DBSCAN Hotspots**:
  - Period A Clusters: **110** | Period B Clusters: **113**
  - Persistent Hotspots: **50** ($d \le 500\text{m}$)
  - Newly Observed: **65** | Dissolved: **60**

### Synthetic Dataset Comparison (`synthetic_data.fact_crime`, 30,000 incidents)
*Comparison: January 2023 vs. January 2024*
- **Incident Counts**: $N_A = 1,245$, $N_B = 1,260$
- **Absolute Count Difference**: **+15** incidents (**+1.20%** relative change)
- **Disclaimer**: Tagged with **SIMULATED DATASET** disclaimer.

---

## 5. RESTful API Endpoints Implemented

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/changes/metadata` | `GET` | Returns available time bounds, categories, districts, community areas, and default periods. |
| `/api/changes/overview` | `POST` | Computes top-level KPI comparison ($N_A, N_B$, daily rates, arrest/domestic/night shifts). |
| `/api/changes/categories` | `POST` | Calculates category composition shares, $\Delta\text{pp}$, and top positive/negative movers. |
| `/api/changes/areas` | `POST` | Calculates district & community area composition shifts. |
| `/api/changes/temporal` | `POST` | Computes 24-hour diurnal overlay distribution and weekday/weekend shifts. |
| `/api/changes/hotspots` | `POST` | Performs DBSCAN clustering & Haversine spatial centroid matching across periods. |
| `/api/changes/insights` | `POST` | Generates deterministic evidence-based observations. |
| `/api/changes/explain` | `GET` | Returns academic explanations of multi-dimensional period comparison and spatial matching. |

---

## 6. Automated Test Results
Running `scratch/test_what_changed_validation.py` passed **7/7 tests (100% success)**:

```
--- 1. DATABASE RECORD COUNT INTEGRITY ---
Public Schema (Real Data) Incident Count: 49981
Synthetic Schema (Synthetic Data) Incident Count: 30000
[OK] Warehouse record counts verified.

--- 2. METADATA RETRIEVAL ---
Real Categories: 29 | Districts: 25
Synthetic Categories: 12 | Districts: 16
[OK] Metadata retrieval verified.

--- 3. PERIOD OVERVIEW & GROUND TRUTH RECONCILIATION ---
Jan 2023: 19914 | Jan 2024: 18524 | Diff: -1390 (-6.98%)
Zero Denominator Safety (Empty Period A): relative_pct_change = None
[OK] Period overview and zero-denominator safety verified.

--- 4. CATEGORY CHANGES RECONCILIATION ---
Category Sum A: 19914 | Category Sum B: 18524
Top Shift Category: MOTOR VEHICLE THEFT (Delta pp: -4.56 pp)
[OK] Category changes reconciliation verified.

--- 5. DBSCAN SPATIAL HOTSPOT MATCHING ---
Period A Clusters: 110 | Period B Clusters: 113
Persistent Hotspots: 50
Newly Observed: 65
Dissolved: 60
[OK] DBSCAN spatial centroid matching verified.

--- 6. FASTAPI CHANGE COMPARISON ENDPOINTS ---
[OK] All 8 change comparison API endpoints returned HTTP 200.

--- 7. REGRESSION TESTING (PHASES 1 TO 13) ---
[OK] All prior phase endpoints function perfectly.
```

---

## 7. Frontend Build Status
- Production bundle compiled with `npm run build` in **22.57s** with **zero errors**.

---

## 8. Data Warehousing & Mining (DWM) Concepts Demonstrated
1. **Multi-Dimensional Slice & Compare**: Slicing the data warehouse by custom date ranges and comparing measure distributions across dimensions (`dim_crime`, `dim_area`, `dim_time`).
2. **Spatial Cluster Continuity**: Establishing temporal continuity between spatial density clusters using centroid Haversine distance matching.
3. **Sample-Aware Comparison & $\Delta\text{pp}$ Normalization**: Normalizing counts into internal percentage shares to prevent duration and sample size imbalances from invalidating comparisons.
4. **Orthogonal Change Decomposition**: Decomposing aggregate record differences along orthogonal dimensions without double counting.

---

## 9. Viva Questions & Answers

**Q1: Why is matching DBSCAN cluster IDs across independent runs insufficient?**
*Answer*: DBSCAN assigns cluster IDs arbitrarily based on point processing order in each run. Cluster #1 in Period A does not correspond to Cluster #1 in Period B. Spatial continuity must be established by matching physical centroids using geographic distance (e.g. Haversine distance threshold).

**Q2: What is the distinction between percentage change (%) and percentage-point shift ($\Delta\text{pp}$)?**
*Answer*: Percentage change measures relative growth in raw counts ($[N_B - N_A] / N_A$). Percentage-point shift ($\Delta\text{pp} = p_B - p_A$) measures absolute difference between two proportion percentages, isolating compositional shifts from changes in sample size.

**Q3: How does the system handle comparisons when Period A has 0 recorded incidents?**
*Answer*: Relative percentage change evaluates to `null` to avoid division-by-zero errors. Comparisons rely on daily rates, total counts, and internal percentage shares.

---

## 10. Audit Items Preserved for Phase 20
The following pre-existing audit items remain recorded for Phase 20 inspection:
1. Phase 9 K-Means silhouette score & K recommendations.
2. Phase 10 Apriori itemset/rule count discrepancies.
3. Phase 11 Decision Tree confusion matrix & recall metrics.
4. Phase 12 Area Intelligence arrest/domestic percentage discrepancies.
5. Phase 13 exact synthetic monthly count documentation.
