# Dual Dataset Integration Report: Real Chicago Data & Synthetic Demo Dataset

## 1. Executive Summary & Validation Results

CrimeLens has been upgraded to a **Dual-Dataset Intelligence System**. The application now supports dynamic switching between the official historical Chicago crime sample and a second 30,000-record synthetic crime dataset without record cross-contamination.

### Synthetic CSV Validation (`data/raw/crimelens_synthetic_30000_2023_2024.csv`)
- **Total Records**: 30,000 incidents (100% verified against raw file).
- **Columns**: 22 schema columns matching `chicago_crimes_raw.csv`.
- **Temporal Distribution**: Exactly 1,250 incidents per month across 24 consecutive months (Jan 2023 – Dec 2024).
- **Geographic Validity**: 27,644 incidents with valid coordinates located strictly inside the Chicago bounding box ($41.60 \le \text{lat} \le 42.10$, $-87.95 \le \text{lon} \le -87.50$). 2,356 records have missing coordinates ($0$ out-of-bounds outliers).
- **Unique Incident IDs**: 30,000 unique synthetic IDs (`SYN-2023-000001` to `SYN-2024-015000`). Zero ID overlap with original real records.

---

## 2. PostgreSQL Storage Architecture & Isolation

Data isolation is achieved at the PostgreSQL schema level in `crimelens_db`:

1. **`public` Schema (Official Real Data)**:
   - Contains **49,981** historical Chicago crime records.
   - Star Schema Tables: `public.fact_crime`, `public.dim_time`, `public.dim_area`, `public.dim_location`, `public.dim_crime`, `public.dim_premise`, `public.dim_status`.
   - Preserved 100% intact without schema migrations or row alterations.

2. **`synthetic_data` Schema (Synthetic Demo Dataset)**:
   - Contains **30,000** synthetic test incidents.
   - Isolated Star Schema Tables: `synthetic_data.fact_crime`, `synthetic_data.dim_time`, `synthetic_data.dim_area`, `synthetic_data.dim_location`, `synthetic_data.dim_crime`, `synthetic_data.dim_premise`, `synthetic_data.dim_status`.

```
crimelens_db (PostgreSQL 18)
├── public (Real Data)
│   └── fact_crime (49,981 facts) + 6 Dimension Tables
└── synthetic_data (Synthetic Demo)
    └── fact_crime (30,000 facts) + 6 Dimension Tables
```

---

## 3. ETL Pipeline Architecture

- **`scripts/create_synthetic_schema.py`**: Idempotent DDL script creating `synthetic_data` schema and 7 star schema tables.
- **`scripts/etl_synthetic.py`**: Loads raw synthetic CSV into `synthetic_data` schema using batch dimension lookups and bulk copy.
- **Fact Record Reconciliation**:
  - Real Dataset: 49,981 fact records
  - Synthetic Dataset: 30,000 fact records

---

## 4. Dataset Selection & Frontend UI/UX

1. **Global Selector in Header**:
   - `Real Chicago Data — 49,981 incidents` (Default)
   - `Synthetic Demo Data — 30,000 incidents`
2. **Persistence**: Active selection is persisted in `localStorage` (`crimelens_dataset`) across page reloads and navigation.
3. **Synthetic Demo Badge**: Whenever synthetic data is active, a glowing **`SYNTHETIC DEMO`** badge appears in the application header.
4. **Disclaimers**:
   - **Real Data**: *"Official Chicago historical crime sample. Uneven temporal sampling; not a complete citywide dataset."*
   - **Synthetic Data**: *"SIMULATED DATA — Generated incidents for algorithm testing and demonstration. Not actual police reports."*

---

## 5. Backend Dataset Routing & API Security

- **Whitelisted Dataset Mapping**: `get_schema_for_dataset(dataset)` in `backend/database.py` maps `"synthetic"` to `"synthetic_data"` and all other inputs to `"public"`.
- **SQL Injection Prevention**: Schema names are strictly whitelisted and never concatenated from unvalidated user strings.
- **Cache Isolation**: DBSCAN hotspot cache keys prepend dataset identity (e.g. `ds_synthetic_eps_300_min_15_...`).

---

## 6. Verification & Test Results

| Test Category | Test Case | Target | Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Database Integrity** | Real Fact Count | 49,981 | 49,981 | PASSED |
| **Database Integrity** | Synthetic Fact Count | 30,000 | 30,000 | PASSED |
| **Input Security** | Unsanitized Dataset Input | `public` fallback | `public` fallback | PASSED |
| **API Routing** | Summary KPI Routing | 49,981 (real) vs 30,000 (synthetic) | 49,981 vs 30,000 | PASSED |
| **OLAP Engine** | Rollup Aggregates | 49,981 (real) vs 30,000 (synthetic) | 49,981 vs 30,000 | PASSED |
| **DBSCAN Clustering** | Spatial Clusters | Isolated cluster count & coordinates | 63 (real) vs 7 (synthetic) | PASSED |
| **Frontend Build** | `npm run build` | Clean compilation | 2,332 modules transformed in 11.95s | PASSED |

---

## 7. Known Limitations & Recommendations

1. **Synthetic Data Uniformity**: Synthetic records have uniform monthly distributions (1,250 incidents/month), which differs from real historical sampling anomalies (e.g. high volume in Jan 2023).
2. **Cache Expiry**: Hotspot cache stores up to 100 entries per dataset.

---

## 8. How to Run the Application

### 1. Backend Server (FastAPI)
```powershell
# Ensure PostgreSQL 18 service postgresql-x64-18 is running
Get-Service postgresql-x64-18

# Launch FastAPI development server
uvicorn backend.main:app --reload --port 8000
```

### 2. Frontend Application (React + Vite)
```powershell
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.
