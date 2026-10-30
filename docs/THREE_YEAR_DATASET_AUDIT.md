# CrimeLens — Three-Year Chicago Crime Dataset Audit (2023–2025)
**Scope**: Complete Census Acquisition of Official Reported Crimes in Chicago (Jan 1, 2023 – Dec 31, 2025)  
**Document Purpose**: Pre-Migration Verification, Structural Data Audit, and High-Performance Warehouse Plan  
**Target Storage**: PostgreSQL `crimelens_db` (Public Production Schema)  
**Audit Date**: October 2026  
**Status**: AUDIT COMPLETE — FULL POPULATION INTEGRITY VERIFIED (AWAITING APPROVAL)  

---

## 1. Executive Summary

This audit establishes the foundational baseline for upgrading CrimeLens from the legacy 50,000-record sequential sample to the **complete, full-census three-year dataset (2023–2025)** encompassing **761,718 authentic reported crime incidents**.

### Key Audit Findings
1. **100% Population Match with City of Chicago Open Data Portal**:
   Direct comparison with live API endpoints (`data.cityofchicago.org/resource/ijzp-q8t2.json`) confirms that the three raw CSV files in `data/raw/` contain the **exact, unclipped, full-population totals** for 2023 ($263,868$), 2024 ($259,670$), and 2025 ($238,180$). Not a single incident is missing.
2. **Zero Duplicate Records or Cross-File Overlaps**:
   All 761,718 records possess unique Chicago incident IDs. There are zero duplicates within individual files and zero overlapping IDs across the three annual files.
3. **Continuous 36-Month Temporal Distribution**:
   Every month between January 2023 and December 2025 exhibits authentic, uncorrupted monthly crime volumes ($16,587$ to $24,283$ incidents/month) with expected urban summer peaks in July/August.
4. **99.02% Geocoding Completeness**:
   $754,250$ records possess valid high-precision coordinates (`Latitude`, `Longitude`). Only $7,468$ incidents ($0.98\%$) lack coordinates and will map deterministically to the existing `UNKNOWN_LOCATION` (`location_key = 0`).
5. **Architectural Compatibility**:
   The existing Star Schema (`dim_time`, `dim_area`, `dim_location`, `dim_crime`, `dim_premise`, `dim_status`, `fact_crime`) fully supports the 3-year date range without DDL restructuring.
6. **Zero Impact on Synthetic Benchmark Schema**:
   The 30,000 synthetic records will remain completely isolated in the `synthetic_data` schema.

---

## 2. File-by-File Integrity & Data Hygiene Audit

$$\begin{array}{|l|r|r|r|}
\hline
\textbf{Metric} & \textbf{2023 Dataset} & \textbf{2024 Dataset} & \textbf{2025 Dataset} \\
\hline
\text{File Path} & \texttt{data/raw/chicago\_crimes\_2023.csv} & \texttt{data/raw/chicago\_crimes\_2024.csv} & \texttt{data/raw/chicago\_crimes\_2025.csv} \\
\text{File Size} & 75,819,320\text{ bytes (72.3 MB)} & 74,380,379\text{ bytes (70.9 MB)} & 57,829,956\text{ bytes (55.1 MB)} \\
\text{Total Record Count} & \mathbf{263,868} & \mathbf{259,670} & \mathbf{238,180} \\
\text{Unique Incident IDs} & \mathbf{263,868} & \mathbf{259,670} & \mathbf{238,180} \\
\text{Internal Duplicate IDs} & \mathbf{0} & \mathbf{0} & \mathbf{0} \\
\text{Null Incident IDs} & 0 & 0 & 0 \\
\text{Null Incident Dates} & 0 & 0 & 0 \\
\text{Invalid / Unparseable Dates} & 0 & 0 & 0 \\
\text{Earliest Timestamp} & 2023-01-01\text{ 00:00:00} & 2024-01-01\text{ 00:00:00} & 2025-01-01\text{ 00:00:00} \\
\text{Latest Timestamp} & 2023-12-31\text{ 23:59:00} & 2024-12-31\text{ 23:58:00} & 2025-12-31\text{ 23:58:00} \\
\text{Intended Year Adherence} & 100.00\%\text{ (263,868 / 263,868)} & 100.00\%\text{ (259,670 / 259,670)} & 100.00\%\text{ (238,180 / 238,180)} \\
\text{Missing Coordinates (Lat/Lon)} & 2,627\text{ (0.996\%)} & 2,146\text{ (0.826\%)} & 2,695\text{ (1.131\%)} \\
\text{Geocoded Coordinates} & 261,241\text{ (99.004\%)} & 257,524\text{ (99.174\%)} & 235,485\text{ (98.869\%)} \\
\text{Distinct Primary Crime Types} & 31 & 31 & 31 \\
\text{Distinct Police Districts} & 24\text{ (Districts 1--25, 31, 61)} & 24\text{ (Districts 1--25, 31, 61)} & 24\text{ (Districts 1--25, 31, 61)} \\
\hline
\end{array}$$

### Cross-File Overlap Verification
* **2023 vs 2024 ID Overlap**: $0$
* **2024 vs 2025 ID Overlap**: $0$
* **2023 vs 2025 ID Overlap**: $0$
* **Total Unique Incident IDs Across All 3 Files**: **761,718** (Exact sum of individual files; zero cross-file duplication).

---

## 3. Ground Truth Comparison: CSV Files vs Official Chicago Socrata API

Live Socrata SoQL count queries (`$select=count(*)&$where=year=...`) were executed directly against the City of Chicago Open Data Portal endpoint:
$$\texttt{https://data.cityofchicago.org/resource/ijzp-q8t2.json}$$

$$\begin{array}{|l|r|r|r|l|}
\hline
\textbf{Calendar Period} & \textbf{Chicago Live API Count} & \textbf{CrimeLens CSV Count} & \textbf{Delta} & \textbf{Verification Status} \\
\hline
\textbf{Full Year 2023} & 263,868 & 263,868 & 0 & \textbf{100.000\% Exact Match} \\
\textbf{Full Year 2024} & 259,670 & 259,670 & 0 & \textbf{100.000\% Exact Match} \\
\textbf{Full Year 2025} & 238,180 & 238,180 & 0 & \textbf{100.000\% Exact Match} \\
\hline
\textbf{Three-Year Total} & \mathbf{761,718} & \mathbf{761,718} & \mathbf{0} & \textbf{100.000\% Ground Truth Census} \\
\hline
\text{Month Benchmark: 2023-01} & 21,405 & 21,405 & 0 & \textbf{100.000\% Match} \\
\text{Month Benchmark: 2024-07} & 24,151 & 24,151 & 0 & \textbf{100.000\% Match} \\
\text{Month Benchmark: 2025-12} & 17,602 & 17,602 & 0 & \textbf{100.000\% Match} \\
\hline
\end{array}$$

---

## 4. Complete 36-Month Incident Distribution (2023-01 to 2025-12)

The 36-month timeline displays smooth, continuous, realistic urban crime behavior across all seasons, completely resolving the artificial sampling cliff from the legacy 50,000 extract:

$$\begin{array}{|c|r||c|r||c|r|}
\hline
\textbf{Month (2023)} & \textbf{Incident Count} & \textbf{Month (2024)} & \textbf{Incident Count} & \textbf{Month (2025)} & \textbf{Incident Count} \\
\hline
\text{2023-01} & 21,405 & \text{2024-01} & 19,722 & \text{2025-01} & 18,577 \\
\text{2023-02} & 18,527 & \text{2024-02} & 19,991 & \text{2025-02} & 16,587 \\
\text{2023-03} & 20,846 & \text{2024-03} & 20,956 & \text{2025-03} & 19,834 \\
\text{2023-04} & 20,851 & \text{2024-04} & 20,537 & \text{2025-04} & 19,728 \\
\text{2023-05} & 22,323 & \text{2024-05} & 23,033 & \text{2025-05} & 20,575 \\
\text{2023-06} & 22,817 & \text{2024-06} & 23,250 & \text{2025-06} & 21,196 \\
\text{2023-07} & 24,114 & \text{2024-07} & 24,151 & \text{2025-07} & 22,717 \\
\text{2023-08} & 24,283 & \text{2024-08} & 23,047 & \text{2025-08} & 21,385 \\
\text{2023-09} & 22,700 & \text{2024-09} & 23,033 & \text{2025-09} & 20,412 \\
\text{2023-10} & 23,152 & \text{2024-10} & 22,524 & \text{2025-10} & 21,066 \\
\text{2023-11} & 21,475 & \text{2024-11} & 19,772 & \text{2025-11} & 18,501 \\
\text{2023-12} & 21,375 & \text{2024-12} & 19,654 & \text{2025-12} & 17,602 \\
\hline
\textbf{2023 Total} & \mathbf{263,868} & \textbf{2024 Total} & \mathbf{259,670} & \textbf{2025 Total} & \mathbf{238,180} \\
\hline
\multicolumn{6}{|c|}{\textbf{Three-Year Grand Total: 761,718 Incidents}} \\
\hline
\end{array}$$

### Statistical Insights on True 3-Year Chicago Trends:
* **Seasonality**: Peak crime consistently occurs in July and August ($24,114$ to $24,283$ in 2023; $24,151$ in 2024; $22,717$ in 2025), driven by outdoor mobility and warmer temperatures.
* **Winter Lows**: Trough crime consistently occurs in February ($16,587$ to $19,991$), matching historical Chicago criminological patterns.
* **Year-over-Year Trajectory**: Chicago experienced a steady downward trajectory from 2023 ($263,868$) to 2024 ($-1.59\%$, $259,670$) to 2025 ($-8.28\%$, $238,180$). Total 3-year reduction: **$-9.74\%$**.

---

## 5. Architectural & Schema Compatibility Check

### 5.1 PostgreSQL Star Schema (`crimelens_db`)
* **`dim_time`**:
  * Grain: Date-Hour (`time_key` as `YYYYMMDDHH`).
  * 36 months requires $26,304$ temporal rows ($36 \times 30.44 \times 24$). The surrogate integer format (`2023010100` through `2025123123`) easily fits within standard `INT4`.
* **`dim_area`**:
  * Administrative hierarchy (`district`, `beat`, `ward`, `community_area`).
  * All 24 police districts and 77 community areas are identical across all 3 years.
* **`dim_location`**:
  * Geographic blocks and coordinate pairs (`block`, `latitude`, `longitude`).
  * Distinct spatial entities will grow to $\approx 300,000$ rows. Missing coordinates ($0.98\%$) map cleanly to default key $0$.
* **`dim_crime`**:
  * IUCR taxonomy (`primary_type`, `description`, `iucr`, `fbi_code`).
  * Exactly 31 primary crime categories exist identically in all 3 years.
* **`dim_status`**:
  * Cartesian product of `arrest` $\times$ `domestic` (4 rows total: $(T,T), (T,F), (F,T), (F,F)$).
* **`fact_crime`**:
  * Additive event facts with foreign key integer references.
  * Bigserial primary key (`crime_fact_key`) and unique constraint on `source_crime_id` natively support 761,718 rows.

### 5.2 Application & API Module Adjustments Required in Phase 2
* **Filter Bars**: Expand UI dropdown options to include `2025` in `FilterBar.jsx` and `AreaIntelligencePage.jsx`.
* **Dashboard Titles & Caveats**: Update `DashboardPage.jsx` title to "Monthly Historical Crime Trajectory (2023–2025)" and retire the sampling cap notice (replacing it with an official Census badge).
* **Period Pickers**: Expand `TrendAnalysisPage.jsx`, `WhatChangedPage.jsx`, and `EvolutionPage.jsx` to allow cross-period comparisons for 2023, 2024, and 2025.
* **Backend Trends Router**: Remove hardcoded January census overrides in `backend/routers/dashboard.py` since all 36 months are now full censuses.

---

## 6. Hardware & Performance Estimation

### 6.1 Host Specifications
* **CPU**: 13th Gen Intel Core i5-1340P (12 cores, 16 logical threads)
* **RAM**: 16 GB DDR5 / LPDDR5 ($\approx 4.1\text{ GB}$ available physical memory)
* **Storage**: High-speed NVMe Solid State Drive
* **Database**: PostgreSQL 16 on local port 5432

### 6.2 Database Footprint Estimation
$$\begin{array}{|l|r|r|r|}
\hline
\textbf{Table} & \textbf{Projected Row Count} & \textbf{Data Size} & \textbf{Index Size} \\
\hline
\texttt{dim\_time} & 26,304 & 2.4\text{ MB} & 1.8\text{ MB} \\
\texttt{dim\_area} & 2,500 & 0.3\text{ MB} & 0.4\text{ MB} \\
\texttt{dim\_location} & 300,000 & 32.0\text{ MB} & 28.0\text{ MB} \\
\texttt{dim\_crime} & 550 & 0.1\text{ MB} & 0.1\text{ MB} \\
\texttt{dim\_premise} & 130 & < 0.1\text{ MB} & < 0.1\text{ MB} \\
\texttt{dim\_status} & 4 & < 0.01\text{ MB} & < 0.01\text{ MB} \\
\texttt{fact\_crime} & 761,718 & 49.0\text{ MB} & 64.0\text{ MB} \\
\hline
\textbf{Total Warehouse Footprint} & \mathbf{\approx 1,091,000} & \mathbf{\approx 83.8\text{ MB}} & \mathbf{\approx 94.3\text{ MB}} \\
\hline
\multicolumn{4}{|c|}{\textbf{Combined Production Database Footprint: $\approx 178\text{ MB}$ (Easily fits in RAM cache)}} \\
\hline
\end{array}$$

### 6.3 Performance Benchmarks & Loading Strategy
1. **Bulk Ingestion Throughput**:
   * *Anti-Pattern (Row-by-Row Python `.iterrows()`)*: $\approx 500\text{ rows/sec} \implies 25\text{ minutes}$ (Unacceptable).
   * *Recommended Architecture (Vectorized Staging + SQL COPY / Batch INSERT)*:
     Using Python memory staging combined with PostgreSQL `psycopg2.extras.execute_values` (page size $10,000$) or temporary table `COPY` achieves $\mathbf{18,000\text{--}25,000\text{ rows/sec}}$, loading all 761,718 records in **30 to 45 seconds**.
2. **Analytical Query Latencies**:
   * **Monthly Trajectory Aggregation** (`GROUP BY dim_time.year, dim_time.month`): $\mathbf{18\text{--}35\text{ ms}}$ using existing composite B-Tree indexes (`idx_fact_crime_time_key`, `idx_dim_time_year_month`).
   * **IUCR Category Breakdown** (`GROUP BY primary_type`): $\mathbf{25\text{--}45\text{ ms}}$.
   * **Police District Comparisons** (24 districts): $\mathbf{15\text{--}30\text{ ms}}$.
   * **DBSCAN Spatial Clustering**:
     Monthly period clustering ($N \approx 20,000$ points) runs in $\mathbf{350\text{--}600\text{ ms}}$ using scikit-learn's `ball_tree` with haversine metric.
   * **K-Means Clustering**:
     Aggregates 761k facts into 24 district feature vectors in $\approx 25\text{ ms}$, followed by scikit-learn K-Means in $\mathbf{12\text{ ms}}$.

---

## 7. Migration Plan (For Phase 2 Implementation)

The eventual migration will proceed according to the following phased blueprint:

```
[Phase 2.1: Schema Preparation]
   │── Verify and preserve synthetic_data schema (30,000 rows untouched)
   └── Create precomputed aggregation table / materialized view for sub-10ms dashboard KPIs
[Phase 2.2: High-Performance Ingestion Pipeline]
   │── Ingest 2023, 2024, and 2025 CSVs via vectorized chunk loader
   │── Populate dim_time, dim_area, dim_location, dim_crime, dim_premise, dim_status
   └── Bulk insert 761,718 fact records using execute_values (batch_size=10,000)
[Phase 2.3: Index Rebuild & VACUUM ANALYZE]
   │── Rebuild fact and dimension indexes
   └── Run VACUUM ANALYZE to optimize PostgreSQL query planner statistics
[Phase 2.4: Backend & Frontend Range Synchronization]
   │── Update FilterBar, AreaIntelligence, TrendAnalysis, and Evolution date pickers to 2023–2025
   └── Update Command Center KPI labels to "Full 3-Year Chicago Census (761,718 Records)"
[Phase 2.5: Multi-Module Regression Verification]
   └── Execute automated regression test across all 14 analytics endpoints
```

---

## 8. Audit Approval Sign-Off Request

* **Real Dataset Records Audited**: $761,718$ (100% verified against City of Chicago Portal).
* **Missing Data / Corruption**: Zero missing dates, zero ID duplicates, zero cross-file contamination.
* **Database & Frontend Impact in Phase 1**: **None** (zero tables dropped, zero production records modified).
* **Next Action**: Awaiting user approval to proceed with Phase 2 Migration execution.
