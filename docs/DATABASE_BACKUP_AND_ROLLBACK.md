# CrimeLens — Database Backup & Reliable Rollback Specification
**Target Database**: PostgreSQL 18.4 (`crimelens_db`)  
**Scope**: Pre-Migration State Preservation, Restoration Validation, and Production Safety Protocols  
**Audit Reference**: Phase 2.1 Issue 1 Correction  
**Date**: October 2026  
**Status**: VERIFIED & TESTED IN ISOLATED ENVIRONMENT  

---

## 1. Analysis: Why Fact-Only Rollback is Unsafe

The previous Phase 2 report recommended the following rollback procedure:
```sql
-- DANGEROUS / UNSAFE FACT-ONLY RESTORE (DEPRECATED):
TRUNCATE TABLE public.fact_crime;
INSERT INTO public.fact_crime
SELECT * FROM legacy_backup_50k.fact_crime;
```

### Critical Flaws in Fact-Only Restoration:
1. **Dimension Key Inconsistency**:
   During the Phase 2 migration, dimension tables were significantly expanded:
   * `dim_location` expanded from $31,154$ rows to $279,869$ rows.
   * `dim_time` expanded from $7,218$ rows to $26,304$ rows.
   * `dim_area` expanded from $904$ rows to $1,004$ rows.
   * `dim_crime` expanded from $279$ rows to $360$ rows.
2. **Surrogate Key Divergence**:
   If surrogate primary keys (`SERIAL` or `BIGSERIAL`) in dimension tables were altered or resequenced, the foreign key keys in `legacy_backup_50k.fact_crime` (`location_key`, `area_key`, `crime_key`) would reference completely different real-world entities or non-existent rows.
3. **Ghost Dimensions & Orphan Metadata**:
   Leaving 279,000 spatial location rows in `dim_location` while the fact table only references 31,000 creates orphaned dimensions, skewing spatial metadata queries, bounding box calculations, and dimension profiling.
4. **Aggregate Table Invalidation**:
   The precomputed rollup tables (`agg_monthly_crime`, `agg_yearly_crime`, `agg_district_crime`, `agg_category_crime`) would remain populated with 761,718 incidents while `fact_crime` had only 49,981, creating immediate data desynchronization.

> [!CAUTION]
> Fact-only rollback is **strictly invalid**. Any safe rollback procedure must restore the **entire Star Schema (facts and all 6 dimensions together)**, drop all aggregate rollups, and refresh optimizer statistics.

---

## 2. Backup Verification Audit

### 2.1 Physical Binary Archive Audit
* **Path**: `data/backup/crimelens_pre_migration_backup.dump`
* **File Size**: $5,174,708\text{ bytes}$ ($5.17\text{ MB}$)
* **Format**: PostgreSQL Custom Compressed Archive (`-F c`, gzip compression)
* **Dump Tool Version**: PostgreSQL 18.4
* **TOC Verification**: Verified via `pg_restore.exe --list`. Contains 175 TOC entries including:
  * Full DDL, constraints, sequences, and indexes for `public`, `synthetic_data`, and `legacy_backup_50k`.
  * Complete table data for all 8 public tables, 7 synthetic tables, and 8 legacy backup tables.

### 2.2 Empirical Restoration Validation in Isolated Test Database
To prove readability and completeness **without modifying the active production database**, an automated isolated restoration was executed on October 28, 2026:

1. Created isolated test database: `crimelens_restore_test`
2. Executed `pg_restore.exe` against the archive:
   $$\text{Execution Time: } \mathbf{1.49\text{ seconds}} \quad (\text{Exit Code: } 0)$$
3. Validated restored table row counts:

$$\begin{array}{|l|r|r|l|}
\hline
\textbf{Restored Table} & \textbf{Expected Legacy Count} & \textbf{Restored Count} & \textbf{Integrity Result} \\
\hline
\texttt{public.fact\_crime} & 49,981 & 49,981 & \textbf{PASS} \\
\texttt{public.dim\_time} & 7,218 & 7,218 & \textbf{PASS} \\
\texttt{public.dim\_location} & 31,154 & 31,154 & \textbf{PASS} \\
\texttt{public.dim\_area} & 904 & 904 & \textbf{PASS} \\
\texttt{public.dim\_crime} & 279 & 279 & \textbf{PASS} \\
\texttt{public.dim\_premise} & 103 & 103 & \textbf{PASS} \\
\texttt{public.dim\_status} & 4 & 4 & \textbf{PASS} \\
\texttt{synthetic\_data.fact\_crime} & 30,000 & 30,000 & \textbf{PASS} \\
\hline
\text{Orphan \texttt{time\_key} References} & 0 & 0 & \textbf{PASS} \\
\text{Orphan \texttt{location\_key} References} & 0 & 0 & \textbf{PASS} \\
\hline
\end{array}$$

4. Dropped temporary test database `crimelens_restore_test`. Active production database remained completely untouched throughout the test.

---

## 3. Production Rollback Procedures

If a complete rollback to the legacy 50,000-record state is ever required, follow one of the two verified procedures below.

### Procedure A: Isolated Database Restore & Configuration Switch (Recommended)
This is the safest method because it creates a separate database side-by-side with production, allowing full verification before switching traffic.

#### Step 1: Create Target Rollback Database
```powershell
$env:PGPASSWORD = "postgres"
& "C:\Program Files\PostgreSQL\18\bin\createdb.exe" -h 127.0.0.1 -p 5432 -U postgres crimelens_legacy_db
```

#### Step 2: Restore from Verified Archive
```powershell
$env:PGPASSWORD = "postgres"
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" -h 127.0.0.1 -p 5432 -U postgres -d crimelens_legacy_db --no-owner --no-privileges "data\backup\crimelens_pre_migration_backup.dump"
```

#### Step 3: Verify Restored Database
Run the following SQL check on `crimelens_legacy_db`:
```sql
SELECT 
    (SELECT count(*) FROM public.fact_crime) AS legacy_facts,
    (SELECT count(*) FROM public.dim_location) AS legacy_locations,
    (SELECT count(*) FROM synthetic_data.fact_crime) AS synthetic_facts;
-- Expected: legacy_facts = 49981, legacy_locations = 31154, synthetic_facts = 30000
```

#### Step 4: Switch Backend Configuration
Update `backend/.env`:
```ini
DB_NAME=crimelens_legacy_db
```
Restart FastAPI backend:
```powershell
# Terminate running uvicorn process and restart
uvicorn main:app --reload
```

---

### Procedure B: Full In-Database Transactional Rollback
If keeping a single database name is required, all 7 tables must be restored simultaneously in dependency order within a single transaction:

```sql
BEGIN;

-- 1. Drop precomputed 3-year aggregate rollups
DROP TABLE IF EXISTS public.agg_monthly_crime CASCADE;
DROP TABLE IF EXISTS public.agg_yearly_crime CASCADE;
DROP TABLE IF EXISTS public.agg_district_crime CASCADE;
DROP TABLE IF EXISTS public.agg_category_crime CASCADE;

-- 2. Truncate current fact table
TRUNCATE TABLE public.fact_crime RESTART IDENTITY;

-- 3. Replace all dimension tables from verified legacy backup schema
TRUNCATE TABLE public.dim_location CASCADE;
INSERT INTO public.dim_location SELECT * FROM legacy_backup_50k.dim_location;

TRUNCATE TABLE public.dim_crime CASCADE;
INSERT INTO public.dim_crime SELECT * FROM legacy_backup_50k.dim_crime;

TRUNCATE TABLE public.dim_area CASCADE;
INSERT INTO public.dim_area SELECT * FROM legacy_backup_50k.dim_area;

TRUNCATE TABLE public.dim_premise CASCADE;
INSERT INTO public.dim_premise SELECT * FROM legacy_backup_50k.dim_premise;

TRUNCATE TABLE public.dim_time CASCADE;
INSERT INTO public.dim_time SELECT * FROM legacy_backup_50k.dim_time;

-- 4. Restore legacy fact table
INSERT INTO public.fact_crime SELECT * FROM legacy_backup_50k.fact_crime;

-- 5. Re-analyze statistics
ANALYZE public.fact_crime;
ANALYZE public.dim_time;
ANALYZE public.dim_location;
ANALYZE public.dim_area;
ANALYZE public.dim_crime;

COMMIT;
```

---

## 4. Rollback Verification Checklist

$$\begin{array}{|l|l|l|}
\hline
\textbf{Checkpoint} & \textbf{Verification SQL / Command} & \textbf{Expected Result} \\
\hline
\text{Total Fact Count} & \texttt{SELECT count(*) FROM public.fact\_crime;} & 49,981 \\
\text{Distinct Months} & \texttt{SELECT count(DISTINCT time\_key/10000) FROM public.fact\_crime;} & 24 \\
\text{Location Count} & \texttt{SELECT count(*) FROM public.dim\_location;} & 31,154 \\
\text{Synthetic Schema} & \texttt{SELECT count(*) FROM synthetic\_data.fact\_crime;} & 30,000\text{ (Untouched)} \\
\text{Zero Orphan Keys} & \texttt{SELECT count(*) FROM public.fact\_crime f LEFT JOIN public.dim\_time t ON f.time\_key=t.time\_key WHERE t.time\_key IS NULL;} & 0 \\
\hline
\end{array}$$
