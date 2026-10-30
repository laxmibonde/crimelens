# CRIMELENS — PHASE 4: BUSINESS INTELLIGENCE, DATA GOVERNANCE & REPORTING VALIDATION REPORT

**Audit Date:** October 29, 2026  
**Audited Modules:**  
1. Phase 3B Metric & District Reconciliation  
2. Automated Insights (`/insights`)  
3. ETL Observability & Pipeline Lineage (`/etl-monitoring`)  
4. Data Quality Intelligence (`/data-quality`)  
5. Reports & Analytics Exports (`/reports`)  
6. Microsoft Power BI Integration (`/power-bi`)  
**Target Environments:**  
- **PostgreSQL 18.4 Data Warehouse:** `public` schema (761,718 real Chicago crime records, 2023–2025) & `synthetic_data` schema (30,000 demonstration records)  
- **FastAPI Python Backend:** `http://127.0.0.1:8000` (uvicorn)  
- **React 18 + Vite Frontend:** Port 5173 / Production Build  
**Validation Status:** **PASSED ALL ARCHITECTURAL, RECONCILIATION, AND INTEGRATION CRITERIA**

---

## SECTION A: EXECUTIVE SUMMARY

Phase 4 completes the verification, correction, and hardening of CrimeLens's business intelligence, data governance, and reporting infrastructure, while preserving all previously validated spatial and data mining algorithms (DBSCAN, Hotspot Evolution, K-Means, Apriori, and Decision Tree).

### Major Findings & Corrections Executed

1. **Phase 3B Decision Tree Metric & Baseline Reconciliation:**
   - *Discovery:* Clarified why the sample baseline (83.43%) differed from the census baseline (86.01%). Stratified sampling was applied to the most recent 35,000 warehouse records (late 2025), where the arrest rate was 16.57% (No-Arrest baseline = 83.43%), whereas the 3-year aggregate arrest rate is 13.99% (No-Arrest baseline = 86.01%). Model accuracy (88.20%) and baseline (83.43%) were evaluated on the identical 7,000-sample test fold.
   - *Class Labeling:* Verified that the reported 89.39% precision explicitly measures **Class 1 (Arrest = YES)** with only 45 false positives ($TP=379, FP=45$).
2. **Police District Count Parity:**
   - *Resolution:* CPD operates **22 active geographic patrol districts**. The warehouse contains **24 distinct operational district codes** with recorded incidents (22 standard patrol districts + specialized transit/marine units `031` and `061`). Exactly 24 qualify for K-Means area clustering ($N \ge 10$).
3. **ETL Observability Reconciliation:**
   - *Correction:* Updated `etl_monitoring_service.py` from legacy 50k single-file assumptions (`chicago_crimes_raw.csv`) to the three verified census files (`chicago_crimes_2023.csv`, `2024.csv`, `2025.csv`). Verified **100% source-to-warehouse reconciliation** (761,718 raw rows, 0 duplicate IDs, 761,718 loaded fact rows).
4. **Data Quality Rule Hardening:**
   - *Correction:* Fixed Rule `DQ-07` (temporal scope) to cover 2023, 2024, and 2025 (resolving a false failure), updated Rule `DQ-09` (monthly balance), and updated Rule `DQ-14` (reconciliation against 761,718 source records). Data Quality validation now records **9 PASS, 2 WARN, 0 FAIL, 1 NOT_AVAILABLE**.
5. **Report Filtering & Multi-Format Exports:**
   - *Correction:* Connected analytical filters (`year`, `district`, `category`) to `generate_report_data()` queries, ensuring filtered reports reflect exact subset metrics. Verified working exports in **PDF, Excel (XLSX), and CSV** with formula injection sanitization.
6. **Power BI Semantic Model:**
   - *Audit:* Verified star schema consistency (1:* Single relationships across 6 dimensions), 20 validated DAX measures with safe `DIVIDE` division, dark theme JSON specifications, and explicit disclosures that report rendering requires Power BI Desktop.

---

## SECTION B: PHASE 3B METRIC & DISTRICT RECONCILIATION

### B.1 Decision Tree Baseline Consistency Analysis
- **Full Warehouse Census ($N = 761,718$):**
  - $\text{Arrest = YES: } 106,572 \text{ incidents } (13.99\%)$
  - $\text{Arrest = NO: } 655,146 \text{ incidents } (86.01\%)$
  - $\text{Census Majority Baseline: } \mathbf{86.01\%}$ (predicting No Arrest for all 761k incidents).
- **Evaluation Sample ($N = 35,000$, Train: 28,000, Test: 7,000):**
  - Evaluated on the most recent 35,000 incidents (`ORDER BY f.crime_fact_key DESC`).
  - In this recent slice, arrest volume is $16.57\%$ (Arrest YES: 1,160 in test set; Arrest NO: 5,840 in test set).
  - $\text{Sample Test Baseline: } \frac{5,840}{7,000} = \mathbf{83.43\%}$.
- **Stratification Verification:**
  - Verified: `train_test_split(..., test_size=0.20, random_state=42, stratify=y)`.
  - Both training and testing sets preserve the exact $16.57\%$ positive rate.
- **Identical Test Set Evaluation:**
  - Both Model Accuracy ($88.20\%$, 6,174 correct out of 7,000) and Majority Baseline ($83.43\%$, 5,840 correct out of 7,000) were evaluated on the **exact same 7,000 test observations**. The model beats the naive baseline by **+4.77 percentage points**.
- **Precision Target Class:**
  - Scikit-learn computes `precision_score` for `pos_label=1` (Arrest Made).
  - True Positives ($TP$) = 379, False Positives ($FP$) = 45.
  - $\text{Precision} = \frac{379}{379 + 45} = \frac{379}{424} = \mathbf{89.39\%}$.
  - When the model predicts an arrest, it is correct **89.39% of the time**.
- **ROC-AUC Calculation:**
  - Computed via `dt.predict_proba(X_test)[:, 1]` ($\mathbf{0.7178}$), representing genuine continuous probability discrimination, not discrete binary step scores.

### B.2 Police District Count Reconciliation
- **Active CPD Patrol Districts (22):** Districts 001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 011, 012, 014, 015, 016, 017, 018, 019, 020, 022, 024, 025. (Districts 013, 021, and 023 were historically merged by CPD).
- **Specialized Units with Incidents in Warehouse (2):**
  - `031`: CPD Special Functions / Transit detail / Marine Unit (49 incidents in 2023–2025).
  - `061`: CPD Public Transportation Section (1,023 incidents in 2023–2025).
- **Reconciliation Verdict:**
  - When analyzing standard city patrol geography: **22 districts**.
  - When querying unique CPD operational units in `fact_crime`: **24 districts** ($22 + 2$).
  - Both `031` and `061` exceed the $N \ge 10$ threshold, explaining why K-Means area clustering evaluates exactly **24 distinct district entities**.

---

## SECTION C: AUTOMATED INSIGHTS SCIENTIFIC AUDIT

### C.1 Insight Generation Methodology
- **Architectural Classification:** The Automated Insights Engine is a **deterministic statistical and rule-based analytical engine**, **NOT** generative AI.
- **Process:** Queries PostgreSQL star schema tables directly via SQLAlchemy, applies statistical aggregations (proportions, year-over-year relative differences, Shannon diversity, and spatial cluster metrics), and formats findings into structured cards with exact numerical evidence.
- **Analytical Importance Score:** Calculated via explainable, bounded formula:
  $$\text{Score} = \min(100, \max(1, 40 \times \text{magnitude} + 35 \times \frac{\log_{10}(\max(10, N))}{4.5} + 25 \times \text{completeness} - \text{penalty}))$$

### C.2 Numerical Recalculation & SQL Parity Checks

| Insight ID | Displayed Title | Displayed Metric | Independent SQL Recalculation | Parity Result |
| :--- | :--- | :--- | :--- | :---: |
| `INS_COMP_01` | Dominant Category: THEFT | 173,293 inc (22.75%) | `SELECT count(*) FROM fact WHERE primary_type='THEFT'` $\to$ 173,293 / 761,718 = 22.75% | **EXACT MATCH** |
| `INS_AREA_01` | Lead District: #008 | 49,624 inc (6.51%) | `SELECT count(*) FROM fact WHERE district='008'` $\to$ 49,624 / 761,718 = 6.51% | **EXACT MATCH** |
| `INS_COMP_02` | Offense Profile: Property vs Violent | Prop: 38.7%, Viol: 30.0%, Arr: 14.0% | Prop: 294,558 (38.67%), Viol: 228,564 (30.01%), Arr: 106,572 (13.99%) | **EXACT MATCH** |
| `INS_CHANGE_01`| Period Shift: Jan 2024 vs Jan 2023 | -1,683 inc (-7.86%) | Jan 2023: 21,405; Jan 2024: 19,722; Diff: -1,683 (-7.8626%) | **EXACT MATCH** |

### C.3 Tone & Criminological Guardrails
Every insight card explicitly includes:
- **Mandatory Caveat:** "CORRELATION DOES NOT PROVE CAUSATION. Observations reflect recorded police administrative incident data."
- **Coordinate Privacy Disclosure:** Spatial coordinates represent approximate public block centroids, not exact crime scenes.
- **Historical Scope:** Strictly avoids predictive claims (e.g., "crime will drop next month"), presenting only historical retrospective patterns.

---

## SECTION D: ETL OBSERVABILITY & PIPELINE RECONCILIATION

### D.1 Source Attribution & Reconciliation
- **Historical vs. Live Clarification:** The ETL monitoring module provides **historical execution audit and observability** of the completed offline warehouse migration. It does not perform unverified continuous background streaming.
- **Source Verification:**
  - Source File 1: `chicago_crimes_2023.csv` $\to$ **263,868 rows**
  - Source File 2: `chicago_crimes_2024.csv` $\to$ **259,670 rows**
  - Source File 3: `chicago_crimes_2025.csv` $\to$ **238,180 rows**
  - **Total Raw Source Rows:** **761,718**
  - **Total Unique Incident IDs:** **761,718**
  - **Duplicate IDs Removed:** **0**
  - **Loaded Fact Table Rows (`public.fact_crime`):** **761,718**
  - **Discrepancy:** **0 rows (100.0% Exact Lossless Reconciliation)**

### D.2 Star Schema Health Check
- **Surrogate Key Uniqueness:** 761,718 / 761,718 (0 duplicate surrogate keys).
- **Referential Integrity:**
  - `orphan_time_keys`: **0**
  - `orphan_area_keys`: **0**
  - `orphan_location_keys`: **0**
  - `orphan_crime_keys`: **0**
  - `orphan_premise_keys`: **0**
  - `orphan_status_keys`: **0**
  - **Total Orphan Foreign Keys:** **0**
- **Warehouse Health Score:** **100 / 100 (HEALTHY)**.

---

## SECTION E: DATA QUALITY INTELLIGENCE AUDIT

### E.1 Rule Evaluation Summary (12 Total Rules Evaluated)

| Rule ID | Quality Dimension | Tested Scope | Observed Value | Threshold | Status |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **DQ-01** | Uniqueness | `fact_crime.crime_fact_key` | 761,718 / 761,718 unique | 100% | **PASS** |
| **DQ-02** | Uniqueness | `fact_crime.source_crime_id` | 0 duplicate business IDs | 0 dupes | **PASS** |
| **DQ-03** | Referential Integrity | All 6 Star Schema Foreign Keys | 0 orphan foreign keys | 0 orphans | **PASS** |
| **DQ-04** | Completeness | Critical keys & case numbers | 0 null values | 0 nulls | **PASS** |
| **DQ-05** | Validity | Chicago coordinate bounds | 90 out-of-bounds locations (0.03%) | 0 invalid | **WARN** |
| **DQ-06** | Spatial Coverage | Coordinate completeness | 1 sentinel location row missing coords | 0 missing | **WARN** |
| **DQ-07** | Validity | Temporal scope (2023–2025) | 0 out-of-scope incident years | 0 invalid | **PASS** |
| **DQ-08** | Validity | Hour of day (0–23) | 0 invalid hour values | 0 invalid | **PASS** |
| **DQ-09** | Temporal Coverage | Monthly distribution balance | 59,704 (7.8%) in January (3-yr aggregate) | < 25% | **PASS** |
| **DQ-10** | Validity | Crime primary taxonomy | 0 blank primary types | 0 blank | **PASS** |
| **DQ-14** | Consistency | Source-to-Warehouse Reconciliation | Raw: 761,718, Dupes: 0, Fact: 761,718 | Exact Match | **PASS** |
| **DQ-15** | External Audit | Real-world crime underreporting | External survey dataset unlinked | Audit | **NOT_AVAILABLE** |

*Overall Evaluation:* **9 PASS, 2 WARN, 0 FAIL, 1 NOT_AVAILABLE**.

### E.2 Geocoding Completeness & Analytics Inclusivity
- **Geocoded Incidents:** **754,250 incidents (99.02%)** possess valid coordinates eligible for spatial DBSCAN clustering.
- **Non-Geocoded Incidents:** **7,468 incidents (0.98%)** lack valid coordinates due to privacy masking or reporting gaps.
- **Governance Inclusivity:** All 7,468 non-geocoded incidents **remain 100% included** in non-spatial analytical modules (K-Means area clustering, Apriori association mining, Decision Tree classification, OLAP cube aggregations, and Reports).

---

## SECTION F: REPORTS & EXPORTS VALIDATION

### F.1 Supported Formats & Verification
- **Supported Formats:** PDF (`.pdf`), Excel Workbook (`.xlsx`), CSV (`.csv`).
- **Export Test Results:**
  - **CSV Export:** HTTP 200, 528.1ms, valid RFC 4180 CSV with headers, summary metrics, and formula injection sanitization.
  - **Excel Export:** HTTP 200, 580.3ms, valid openpyxl `.xlsx` workbook featuring dark blue headers, formatted currency/percentages, auto-fitted columns, and formula injection protection (`'`).
  - **PDF Export:** HTTP 200, 1,729.7ms, valid ReportLab A4 multi-page document with dynamic running headers/footers (`NumberedCanvas`), embedded Matplotlib charts, executive KPI grid, data tables, and provenance disclosures.

### F.2 Analytical Filter Handling
Verified that passing analytical filters dynamically recalculates report totals:
- **Year 2025 Filter:** Total incidents profiled = **238,180** (exact match with 2025 warehouse count), Arrest rate = **16.1%**, Domestic rate = **19.0%**, Top category = `THEFT (55,204, 23.2%)`.
- **District 001 in 2024 Filter:** Correctly subsets metrics to District 001 incidents recorded in 2024.

---

## SECTION G: MICROSOFT POWER BI INTEGRATION

### G.1 Architectural Scope & Implementation
- **Integration Classification:** **Package & Semantic Model Ready**. CrimeLens provides fully generated PostgreSQL connection specifications, star schema entity definitions, 20 copy-ready DAX measures, and a custom JSON dark theme. Assembly and final dashboard rendering require Power BI Desktop.
- **Connection Configuration:**
  - Host: `127.0.0.1:5432`
  - Database: `crimelens_db`
  - Schema: `public` (real) or `synthetic_data` (synthetic)
  - Connectivity Mode: **Import Mode** (enables high-speed VertiPaq compression and advanced DAX time-intelligence).

### G.2 Star Schema Model Cardinality

| Fact Table | Dimension Table | Foreign Key $\to$ Primary Key | Cardinality | Cross-Filter Direction |
| :--- | :--- | :--- | :---: | :---: |
| `fact_crime` | `dim_time` | `time_key` $\to$ `time_key` | Many-to-One ($*:1$) | Single |
| `fact_crime` | `dim_area` | `area_key` $\to$ `area_key` | Many-to-One ($*:1$) | Single |
| `fact_crime` | `dim_location` | `location_key` $\to$ `location_key` | Many-to-One ($*:1$) | Single |
| `fact_crime` | `dim_crime` | `crime_key` $\to$ `crime_key` | Many-to-One ($*:1$) | Single |
| `fact_crime` | `dim_premise` | `premise_key` $\to$ `premise_key` | Many-to-One ($*:1$) | Single |
| `fact_crime` | `dim_status` | `status_key` $\to$ `status_key` | Many-to-One ($*:1$) | Single |

### G.3 Static DAX Measure Verification
Representative verified measures from the 20 generated definitions:
- **Base Volume:** `Total Recorded Incidents = COUNTROWS(fact_crime)`
- **Safe Ratio:** `Arrest Percentage = DIVIDE([Arrested Incidents], [Total Recorded Incidents], 0)`
- **Time Intelligence:** `Previous Period Incidents = CALCULATE([Total Recorded Incidents], DATEADD(dim_time[full_date], -1, MONTH))`
- **Category Share:** `Category Share = DIVIDE([Total Recorded Incidents], CALCULATE([Total Recorded Incidents], ALL(dim_crime[primary_type])), 0)`
*Verification:* All measures utilize valid schema table and column identifiers, enforce zero-division guards via `DIVIDE(..., 0)`, and separate filter contexts cleanly.

---

## SECTION H: TESTING & VERIFICATION SUMMARY

| Module | Verification Level | Evidence & Actual Test Outcome | Status |
| :--- | :---: | :--- | :---: |
| **Phase 3B Reconciliation** | Full Reconciliation | Census baseline: 86.01%, Sample baseline: 83.43% (due to 16.57% arrest rate in recent 35k). Model accuracy (88.20%) beats sample baseline. 22 patrol districts vs 24 CPD units reconciled. | **VERIFIED** |
| **Automated Insights** | Full End-to-End | 12 insights generated across 9 domains; 100% SQL numerical recalculation match; scores 55–97; explicit non-causal warnings. | **VERIFIED** |
| **ETL Observability** | Full End-to-End | 3 annual source CSVs verified (761,718 rows); 0 duplicate IDs; 0 orphan keys; 100% warehouse health score; lineage graph verified. | **VERIFIED** |
| **Data Quality** | Full End-to-End | 9 PASS, 2 WARN, 0 FAIL, 1 NOT_AVAILABLE; 99.02% geocoded; 7,468 non-geocoded incidents preserved in all non-spatial analytics. | **VERIFIED** |
| **Reports & Exports** | Full End-to-End | Dynamic filtering verified (2025 = 238,180 inc); PDF (ReportLab), Excel (openpyxl), and CSV exports generate valid binaries with sanitization. | **VERIFIED** |
| **Power BI Integration** | Static Specification Verified | Star schema 1:* relationships, 20 DAX measures verified against schema; setup instructions and dark theme verified; assembly requires PBI Desktop. | **VERIFIED** |

---

## SECTION I: SOURCE FILES MODIFIED

1. `backend/services/etl_monitoring_service.py`:
   - Updated source file resolution from legacy 50k `chicago_crimes_raw.csv` to the three official annual census CSVs (`chicago_crimes_2023.csv`, `2024.csv`, `2025.csv`).
   - Dynamic case-insensitive header lookup (`ID` vs `id`) for robust multi-CSV reading.
   - Updated pipeline stage descriptions and lineage graph to reflect 761,718 incidents.
2. `frontend/src/pages/ETLMonitoringPage.jsx`:
   - Updated header badge from `REAL WAREHOUSE (50k)` to `REAL WAREHOUSE (761,718)`.
3. `backend/services/data_quality_service.py`:
   - Updated Rule `DQ-07` to cover 2023, 2024, and 2025, evaluating against `fact_crime` to verify 0 out-of-scope incident years.
   - Updated Rule `DQ-09` to evaluate the 36-month aggregate monthly distribution balance (7.8% January).
   - Updated Rule `DQ-14` to reconcile against the 761,718 raw census rows.
   - Updated `key_findings` to reflect 761,718 records and 36 continuous months.
4. `frontend/src/pages/DataQualityPage.jsx`:
   - Updated header badge from `REAL WAREHOUSE (50k)` to `REAL WAREHOUSE (761,718)`.
5. `backend/services/report_generation_service.py`:
   - Added SQL WHERE clause generation for applied analytical filters (`year`, `district`, `category`).
   - Updated report provenance disclaimer to cite 761,718 real Chicago crime incidents across 36 continuous calendar months.
6. `backend/services/powerbi_service.py`:
   - Updated academic explanation to reflect the 761,718 census.

---

## SECTION J: REMAINING ISSUES & LIMITATIONS

### Critical Issues
- **None.** All 5 audited modules operate without errors, database row counts remain 100% intact, and frontend production builds cleanly.

### Moderate Limitations
- **Power BI Runtime Rendering:** As designed, CrimeLens provides the complete semantic model package, Power Query steps, DAX measures, and JSON dark theme. Interactive rendering of `.pbix` dashboards requires Microsoft Power BI Desktop on the user's host machine.
- **External Real-World Reporting Audit (DQ-15):** The database warehouse exhibits 100% technical referential and structural integrity. However, police administrative records cannot measure unreported crimes without linkage to external victimization surveys (e.g., NCVS).

### Minor Observations
- **Metropolitan Bounding Box Outliers (DQ-05):** 90 location dimension rows (0.03% of locations) fall slightly outside the strict Chicago bounding box, reflecting transit police or joint-taskforce administrative filings outside municipal limits.
- **Unmapped Sentinel Coordinates (DQ-06):** Exactly 1 location record represents the sentinel unmapped coordinate record (`location_key=0`), representing incidents with missing street coordinates.

---

## CONCLUSION & VERIFICATION SIGN-OFF

Phase 4 has successfully validated, reconciled, and hardened:
1. **Decision Tree & District Reconciliation:** Clarified baseline differences ($83.43\%$ in recent 35k vs $86.01\%$ census) and reconciled 22 patrol districts with 24 CPD operational units.
2. **Automated Insights:** Deterministic rule-based statistical comparisons matching PostgreSQL down to the decimal point with mandatory non-causal warnings.
3. **ETL Observability:** Exact 100% lossless reconciliation across 761,718 raw census records with 0 orphan keys and a 100/100 health score.
4. **Data Quality Intelligence:** 9 passing rules with transparent spatial coverage disclosures (99.02% geocoded).
5. **Reports & Exports:** Filter-aware report generation with verified PDF, Excel, and CSV downloads.
6. **Power BI Semantic Modeling:** Verified star-schema relationships and 20 DAX measures.

**Phase 4 is formally complete.** All systems, databases, backend APIs, and frontend interfaces remain verified, operational, and synchronized.
