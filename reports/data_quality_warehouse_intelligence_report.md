# CrimeLens — Phase 17: Data Quality Intelligence & Warehouse Visualization Technical Report

## 1. Executive Summary & Objective
Phase 17 delivers a comprehensive **Data Quality Intelligence & Warehouse Visualization Dashboard** for the CrimeLens system. It extends the Phase 16 ETL monitoring capabilities by providing 7-dimension data quality profiling, structured validation rules, mathematical quality scoring, statistical column profiling, star-schema table exploration, and actionable downstream algorithm impact recommendations.

---

## 2. Technical Architecture

### Backend Stack
- `backend/services/data_quality_service.py`: Core profiling service executing read-only SQL aggregation queries across `public` and `synthetic_data` schemas.
- `backend/routers/data_quality.py`: RESTful FastAPI router with parameter whitelisting to prevent SQL injection.
- `backend/main.py`: Registered router under `/api/data-quality`.

### Frontend Stack
- `frontend/src/services/api.js`: Client API integrations.
- `frontend/src/pages/DataQualityPage.jsx`: Dark-themed interactive workspace built with Recharts and Lucide icons.
- `frontend/src/App.jsx` & `frontend/src/components/Sidebar.jsx`: Registered route `/data-quality` and navigation item "Data Quality".

---

## 3. Data Quality Dimensions & Scoring Methodology

### Quality Dimensions
1. **Completeness**: Non-null field percentages and empty string handling across critical business keys.
2. **Uniqueness**: Fact primary key uniqueness (`crime_fact_key`) and source crime business ID deduplication.
3. **Validity**: Timestamp bounds (2023–2024), 24-hour clock domain bounds, Chicago geospatial boundary checks (Lat 41.6–42.1, Lon -87.9 to -87.5).
4. **Consistency**: Source-to-warehouse reconciliation and fact/dimension attribute consistency.
5. **Referential Integrity**: Zero-orphan foreign key audits across all 6 dimension relationships (`dim_time`, `dim_area`, `dim_location`, `dim_crime`, `dim_premise`, `dim_status`).
6. **Temporal Coverage**: 24-month distribution and sampling concentration imbalance tracking.
7. **Spatial Coverage**: Valid coordinate population and DBSCAN algorithm eligibility.

### Dimension Scoring Formula
\[
\text{Score}_{\text{dim}} = 100 - \sum \left( \text{Weight}_i \times \text{Penalty}_i \right)
\]
- Evaluated exclusively over valid, non-NA checks.
- Rules returning `NOT_AVAILABLE` (such as external real-world victimization survey benchmarks) are excluded from scoring denominators without penalizing internal technical scores.

---

## 4. Empirical Warehouse Findings

### Real Chicago Dataset (`public` schema)
- **Warehouse Fact Count**: **49,981 incidents** (reconciled from 50,000 raw source rows minus 19 deduplicated IDs).
- **Referential Integrity**: **0 orphan foreign keys** across all 6 dimension tables (**100% intact**).
- **Critical Field Completeness**: `source_crime_id`, `case_number`, `time_key`, `crime_key` contain **0 null values** (100% complete).
- **Geospatial Coordinates**: 31,154 location records in `dim_location`; 1 NULL coordinate, 15 out-of-bounds locations (**99.95% spatial eligibility** for DBSCAN).
- **Temporal Concentration Imbalance**: **38,438 out of 49,981 records (76.9%)** are concentrated in **January 2023 (19,914)** and **January 2024 (18,524)**. Most other months contain ~300–400 incidents.

### Synthetic Dataset (`synthetic_data` schema)
- **Warehouse Fact Count**: **30,000 incidents** (0 duplicate source IDs).
- **Referential Integrity**: **0 orphan foreign keys** (**100% intact**).
- **Monthly Distribution Verification**: Verified directly from PostgreSQL database — **exactly 1,250 incidents per month** across all 24 months ($1,250 \times 24 = 30,000$).
- **Discrepancy Note**: The Phase 14 text mention of 1,245 / 1,260 is documented as a minor report reporting discrepancy; the actual database ground truth is strictly 1,250 per month.

---

## 5. Downstream Algorithm Impact Recommendations

| Issue / Finding | Affected Module | Downstream Algorithm Impact | Recommended Read-Only Mitigation |
| :--- | :--- | :--- | :--- |
| **76.9% January Concentration** | Trend Analysis & Seasonality | Distorts unweighted month-over-month trend slopes and seasonal decomposition. | Normalize monthly incident counts per total days observed or apply monthly rate weighting. |
| **Out-of-bounds / Null Coordinates** | DBSCAN Hotspot Clustering | Excluded as spatial noise or omitted from coordinate matrices. | Filter out invalid locations prior to distance matrix construction. |
| **Missing Category Details** | Apriori & Decision Tree | Distorts itemset support thresholds and branch splits. | Group sparse or missing sub-categories into canonical taxonomy buckets. |

---

## 6. API Endpoints

- `GET /api/data-quality/metadata`: Returns dataset profiling metadata.
- `GET /api/data-quality/overview`: High-level quality dimension scores and rule counts.
- `GET /api/data-quality/validation`: Evaluated rule engine results (supports `status_filter`).
- `GET /api/data-quality/completeness`: Column-by-column missing value metrics.
- `GET /api/data-quality/coverage`: Monthly temporal distribution and spatial coordinate breakdown.
- `GET /api/data-quality/schema`: Star-schema table cardinalities, PKs, FKs, and relationship rules.
- `GET /api/data-quality/profile` / `POST /api/data-quality/profile`: Statistical column profiler with parameter whitelisting.
- `GET /api/data-quality/comparison`: Side-by-side Real vs Synthetic quality metrics comparison.
- `GET /api/data-quality/issues`: Actionable quality warnings with algorithm impact recommendations.
- `GET /api/data-quality/explain`: Academic concepts and Viva Q&A.

---

## 7. Viva Questions & Answers

**Q1: What is the fundamental difference between technical data quality and real-world data truth?**
*Answer*: Technical data quality measures database constraint compliance (referential integrity, non-null fields, valid ranges). Real-world data truth accounts for unobserved or unreported crimes (victimization underreporting), which cannot be measured without external survey benchmarks.

**Q2: Why does CrimeLens report `NOT_AVAILABLE` for external representativeness rules?**
*Answer*: To maintain academic rigor and avoid fabricating claims about real-world crime incidence when external benchmark datasets are absent.

---

## 8. Preservation of Phase 20 Audit Checklist

1. K-Means silhouette score vs recommended K discrepancies.
2. Apriori rule counts, support, and confidence thresholds.
3. Decision Tree confusion matrix metrics.
4. Area Intelligence percentage calculations.
5. Synthetic monthly count verification (confirmed 1,250/mo in DB).
6. Hotspot matching reconciliation.
7. Automated Insights source consistency.
8. Frontend bundle optimization.
