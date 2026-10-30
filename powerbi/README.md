# CrimeLens — Microsoft Power BI Integration & Setup Guide

This package provides a complete, production-ready Microsoft Power BI integration package for the **CrimeLens Data Warehouse** hosted on PostgreSQL 18.

---

## 1. Connection Parameters
- **Host / Server**: `127.0.0.1:5432`
- **Database**: `crimelens_db`
- **Target Schemas**:
  - `public` (Real Chicago Crime Dataset — 49,981 fact records)
  - `synthetic_data` (Synthetic Demo Dataset — 30,000 fact records)
- **Data Load Mode**: **Import Mode** (Recommended for full DAX time-intelligence & dimensional modeling support).

---

## 2. Power Query M Script Import Instructions
1. Open **Microsoft Power BI Desktop**.
2. Click **Get Data** -> **Blank Query** -> **Advanced Editor**.
3. Copy and paste the corresponding M query from `powerbi/power_query/real_dataset_queries.m` (or `synthetic_dataset_queries.m`).
4. Repeat for all 7 star-schema tables:
   - `fact_crime`
   - `dim_time`
   - `dim_area`
   - `dim_location`
   - `dim_crime`
   - `dim_premise`
   - `dim_status`
5. Click **Close & Apply**.

---

## 3. Star-Schema Relationship Configuration
In the **Model View** of Power BI Desktop, establish the following 6 **1-to-many (1:*)** single-direction relationships:

| Primary Dimension (1) | Key Column | Central Fact Table (*) | Key Column | Cross-Filter Direction |
| :--- | :--- | :--- | :--- | :--- |
| `dim_time` | `time_key` | `fact_crime` | `time_key` | Single |
| `dim_area` | `area_key` | `fact_crime` | `area_key` | Single |
| `dim_location` | `location_key` | `fact_crime` | `location_key` | Single |
| `dim_crime` | `crime_key` | `fact_crime` | `crime_key` | Single |
| `dim_premise` | `premise_key` | `fact_crime` | `premise_key` | Single |
| `dim_status` | `status_key` | `fact_crime` | `status_key` | Single |

---

## 4. DAX Measure Library Installation
1. In Power BI Desktop, navigate to the **Report View** or **Data View**.
2. Select `fact_crime` in the Data pane and click **New Measure**.
3. Copy and paste measures from `powerbi/dax/crimelens_measures.dax` (e.g. `Total Recorded Incidents`, `Arrest Percentage`, `Domestic Percentage`).

---

## 5. Visual Theme Application
1. Go to the **View** tab -> **Themes** -> **Browse for themes**.
2. Select `powerbi/theme/crimelens_theme.json`.

---

## 6. Multi-Page Dashboard Specifications (7 Pages)
- **Page 1: Executive Overview**: KPI Scorecards (`Total Incidents`, `Arrest %`, `Domestic %`), Top Categories Bar Chart, Monthly Sample Distribution.
- **Page 2: Temporal Analysis**: Monthly trend line, hour-of-day heatmap, day-of-week distribution. Includes **76.9% January Sampling Imbalance Disclaimer**.
- **Page 3: Geographic Analysis**: District & Community Area map and bar charts. Includes **Spatial Coordinate Completeness** callout.
- **Page 4: Crime Category Intelligence**: Primary type taxonomy breakdown, premise location distribution, arrest ratio by category.
- **Page 5: OLAP Explorer**: Matrix visualization with drill-down hierarchy (`Year -> Quarter -> Month` and `District -> Community Area`).
- **Page 6: Data Quality & Warehouse**: Source-to-warehouse reconciliation metrics, zero-orphan key verification, null key audit.
- **Page 7: Real vs Synthetic Methodology**: Side-by-side comparison of Real (49,981 rows) vs Synthetic (30,000 rows, 1,250/mo uniform) dataset characteristics.

---

## 7. Data Provenance & Sampling Disclaimers
- **Real Dataset**: 76.9% of records are concentrated in January 2023 & January 2024. Does **not** represent total citywide crime rates.
- **Synthetic Dataset**: 30,000 simulated records uniformly distributed (1,250/mo). Labeled **SIMULATED DATA FOR TESTING**.
