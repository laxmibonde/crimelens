# CrimeLens — Phase 18: Professional Report Generation, Analytics Exports & Report Center Technical Report

## 1. Executive Summary & Objective
Phase 18 delivers a centralized **Report Center & Analytics Export Engine** for CrimeLens. It enables users to configure, preview, and download structured **PDF**, **Excel (XLSX)**, and **CSV** reports across 14 analytical templates. The system guarantees 100% numerical reproducibility by directly consuming backend calculations from existing CrimeLens modules while embedding mandatory data provenance disclaimers and formula-injection protections.

---

## 2. Technical Architecture

### Backend Stack
- `backend/services/report_generation_service.py`: Core report generation engine.
  - **PDF Generation**: Uses `reportlab-5.0.1` (`SimpleDocTemplate`, custom `NumberedCanvas` for "Page X of Y" page numbering, styled tables, and embedded Matplotlib summary charts).
  - **Excel Generation**: Uses `openpyxl-3.1.5` (multiple worksheets, styled navy headers, numeric cell formatting, autofilters, frozen panes, formula-injection sanitization).
  - **CSV Generation**: Sanitized UTF-8 CSV exports.
- `backend/routers/reports.py`: FastAPI endpoints for metadata, live preview, data generation, and file streaming.
- `backend/main.py`: Registered router under `/api/reports`.

### Frontend Stack
- `frontend/src/services/api.js`: Client API bindings for previewing and downloading report files.
- `frontend/src/pages/ReportsPage.jsx`: Dark-themed Report Center featuring a gallery of 14 templates, featured Comprehensive Master Report banner, live preview panel, filter inputs, and one-click PDF/Excel/CSV download controls.
- `frontend/src/App.jsx` & `frontend/src/components/Sidebar.jsx`: Registered route `/reports` and sidebar navigation item "Reports & Exports".

---

## 3. Supported Report Categories (14 Templates)

1. **Comprehensive Master Intelligence Report**: Unified executive overview across all 15 CrimeLens analytical modules.
2. **Crime Pattern & Category Overview Report**: Incident volumes, category distribution, arrest & domestic ratios.
3. **OLAP Data Cube Multi-Dimensional Report**: Dimensional roll-up, drill-down, and slice/dice matrix.
4. **DBSCAN Spatial Hotspot Clustering Report**: Density clusters, noise points, and high-risk spatial nodes.
5. **Spatial Hotspot Evolution Report**: Multi-period hotspot emergence, persistence, and dissipation dynamics.
6. **K-Means Area Segmentation Report**: District & community area behavioral clustering.
7. **Apriori Association Rules Mining Report**: Co-occurrence itemsets, confidence, and lift association rules.
8. **Decision Tree Classification Report**: Arrest prediction model performance, feature importance, and confusion metrics.
9. **Area Intelligence & Comparative Report**: Zonal crime composition, district rankings, and similarity matching.
10. **Advanced Crime Trend & Seasonality Report**: Time-series decomposition, hourly heatmaps, moving averages.
11. **What Changed? Period Comparison Report**: Period A vs B delta analysis across categories and areas.
12. **Automated Data-Driven Insights Report**: Prioritized evidence-backed analytical observations.
13. **ETL Observability & Data Lineage Report**: 8-stage pipeline status, source reconciliation, star-schema health.
14. **Data Quality & Warehouse Integrity Report**: 7-dimension quality profiling, rule evaluations, and sampling warnings.

---

## 4. Security & Data Provenance Controls

### Formula Injection Sanitization
To protect spreadsheet users, all string fields exported to XLSX and CSV are passed through `sanitize_formula_injection()`, which neutralizes leading `=`, `+`, `-`, or `@` characters with a leading single quote `'`.

### Mandatory Data Provenance Disclaimers
- **Real Chicago Dataset**:
  > "REAL DATA DISCLAIMER: Based on 49,981 historical Chicago crime incidents. 76.9% of records are concentrated in Jan 2023 & Jan 2024. Does NOT represent total citywide crime."
- **Synthetic Dataset**:
  > "SIMULATED DATA DISCLAIMER: Based on 30,000 synthetic records uniformly generated across 2023-2024 (1,250/mo). Intended strictly for pipeline testing."

---

## 5. API Endpoints

- `GET /api/reports/metadata`: Returns available report templates, formats, and parameter options.
- `POST /api/reports/preview`: Returns live JSON structure of report contents.
- `POST /api/reports/generate`: Generates report data dictionary.
- `POST /api/reports/export/pdf`: Streams downloadable PDF file (`application/pdf`).
- `POST /api/reports/export/excel`: Streams downloadable Excel workbook (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).
- `POST /api/reports/export/csv`: Streams downloadable CSV file (`text/csv; charset=utf-8`).
- `GET /api/reports/explain`: Returns report methodology and concepts.

---

## 6. Viva Questions & Answers

**Q1: How does CrimeLens guarantee zero fabrication in exported PDF and Excel reports?**
*Answer*: Reports do not hardcode sample statistics or render static dashboard screenshots. All numerical values, percentages, and table rows are calculated live from PostgreSQL 18 star-schema tables by calling backend analytical services.

**Q2: How are spreadsheet formula injection attacks prevented in Excel and CSV exports?**
*Answer*: Text cells are sanitized prior to export to strip or escape leading `=`, `+`, `-`, or `@` characters, preventing hostile formula execution when opened in Microsoft Excel or Google Sheets.

---

## 7. Preservation of Phase 20 Audit Checklist

1. K-Means silhouette score vs recommended K discrepancies.
2. Apriori itemset/rule count discrepancies.
3. Decision Tree evaluation inconsistencies.
4. Area Intelligence percentage calculations.
5. Phase 14 hotspot matching reconciliation.
6. Automated Insights source consistency.
7. Spatial coverage denominator clarity.
8. Frontend JavaScript bundle-size warning.
9. Full browser testing.
10. Export formatting and downloadable-file validation.
