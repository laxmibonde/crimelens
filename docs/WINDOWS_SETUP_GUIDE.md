# CRIMELENS — WINDOWS SETUP & REPRODUCIBILITY GUIDE

**Target Operating System:** Windows 10 / Windows 11 (64-bit)  
**Shell Environment:** Windows PowerShell  
**Prerequisites:**
1. **Python 3.12 or 3.13** (Verify *"Add Python to PATH"* was selected during installation)
2. **Node.js v20+ LTS & npm** ([Download Node.js LTS](https://nodejs.org/))
3. **PostgreSQL 16, 17, or 18** ([Download PostgreSQL for Windows](https://www.postgresql.org/download/windows/))
4. **Git for Windows** (Optional)

---

## 1. Critical Architecture Notice: Data vs Code

> [!IMPORTANT]
> ### SOURCE CODE DOES NOT CONTAIN THE 761,718 REAL INCIDENTS
> The CrimeLens source code repository contains the application source code (FastAPI backend, React frontend, ETL pipeline scripts, and SQL star-schema DDL scripts).  
> **Source code alone DOES NOT include the 761,718 real Chicago crime records** (~450 MB raw data).  
> The database records reside in the local PostgreSQL instance under the database name `crimelens_db`.
> 
> Furthermore, the repository file `data/backup/crimelens_pre_migration_backup.dump` is **5.17 MB** and dates from Phase 2 (prior to the 3-year migration). **DO NOT RESTORE THAT FILE**, as it contains only ~33,000 legacy records and will overwrite your database.

---

## 2. Choose Your Setup Scenario

Select the section that matches your deployment:
- **[SCENARIO 1: Current Laptop (Existing Database)](#scenario-1-starting-crimelens-on-the-current-laptop)**: Quick start for the existing machine where PostgreSQL already has `crimelens_db` loaded with 761,718 real incidents and 30,000 synthetic records.
- **[SCENARIO 2: New Laptop (Database Does Not Yet Exist)](#scenario-2-setting-up-crimelens-on-a-new-laptop)**: Complete walkthrough for a brand-new computer, including code cloning, dependency installation, and warehouse migration/restoration.

---

## SCENARIO 1: Starting CrimeLens on the Current Laptop

*Use this scenario on the machine where PostgreSQL is already running with `crimelens_db`.*

### Step 1: Open PowerShell and Navigate to the Project
```powershell
cd c:\Users\<YourUsername>\Downloads\CrimeLens
```

### Step 2: Verify PostgreSQL Database Census
Run a quick 3-second check to confirm both schemas are intact:
```powershell
cd backend
.\venv\Scripts\python.exe -c "
import psycopg2, os
from dotenv import load_dotenv
load_dotenv('.env')
conn = psycopg2.connect(
    dbname=os.getenv('DB_NAME','crimelens_db'),
    user=os.getenv('DB_USER','postgres'),
    password=os.getenv('DB_PASSWORD','postgres'),
    host=os.getenv('DB_HOST','127.0.0.1'),
    port=int(os.getenv('DB_PORT',5432))
)
cur = conn.cursor()
cur.execute('SELECT COUNT(*) FROM fact_crime;')
real_cnt = cur.fetchone()[0]
cur.execute('SELECT COUNT(*) FROM synthetic_data.fact_crime;')
synth_cnt = cur.fetchone()[0]
print(f'=== DATABASE CENSUS CHECK ===')
print(f'Real Incidents (2023-2025): {real_cnt:,}')
print(f'Synthetic Records:          {synth_cnt:,}')
conn.close()
"
```
*Expected Output:*
```
=== DATABASE CENSUS CHECK ===
Real Incidents (2023-2025): 761,718
Synthetic Records:          30,000
```

### Step 3: Launch FastAPI Backend (Terminal 1)
```powershell
# From the backend/ folder:
.\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```
*Expected log:*
```
INFO:     Started server process [PID]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

### Step 4: Launch React Frontend (Terminal 2)
Open a second PowerShell window:
```powershell
cd c:\Users\<YourUsername>\Downloads\CrimeLens\frontend
npm run dev
```
*Expected log:*
```
  VITE v5.4.21  ready in 350 ms

  ➜  Local:   http://127.0.0.1:5173/
```

### Step 5: Verify Health & Open Dashboard
1. Verify API: Open browser to `http://127.0.0.1:8000/api/health`. Expected: `{"status":"healthy", ...}`.
2. Open Dashboard: Navigate to `http://127.0.0.1:5173` and press `F11` for full-screen mode.

---

## SCENARIO 2: Setting up CrimeLens on a New Laptop

*Use this scenario when setting up CrimeLens on a new or separate Windows laptop.*

### Step 1: Copy Project Files to the New Laptop
Copy the `CrimeLens` project folder to the new laptop (e.g. `C:\Users\<NewUser>\Downloads\CrimeLens`).

### Step 2: Create Python Virtual Environment & Install Dependencies
Open PowerShell:
```powershell
cd C:\Users\<NewUser>\Downloads\CrimeLens\backend

# 1. Create clean virtual environment
python -m venv venv

# 2. Upgrade pip
.\venv\Scripts\python.exe -m pip install --upgrade pip

# 3. Install Python dependencies (UTF-8 format)
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

### Step 3: Configure Environment File
```powershell
# Copy template configuration
Copy-Item .env.example .env

# Open in Notepad to set your local PostgreSQL password
notepad .env
```
Update `DB_PASSWORD` to your local PostgreSQL superuser password. Save and close.

### Step 4: Install Node.js Frontend Dependencies
```powershell
cd ..\frontend
npm install
```

### Step 5: Transfer the Complete 761k Warehouse to the New Laptop

Because the source code alone does not include the 761,718 records, use the official `pg_dump` and `pg_restore` procedure below to transfer both the `public` and `synthetic_data` schemas cleanly.

> [!NOTE]
> This command requires explicit user action. Do not run without approval.

#### On the Source Laptop (Exporting):
Run from PowerShell (ensure PostgreSQL `bin` is in your PATH or specify full path like `& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"`):
```powershell
# Creates a compressed custom-format archive containing all tables, indexes, and both schemas:
pg_dump -U postgres -h 127.0.0.1 -p 5432 -F c -b -v -n public -n synthetic_data -f "C:\Users\<SourceUser>\Downloads\CrimeLens\crimelens_complete_warehouse.dump" crimelens_db
```
*(The generated dump file is ~95 MB compressed and contains the full 761,718 real incidents and 30,000 synthetic records).*

#### On the New Laptop (Importing):
1. Copy `crimelens_complete_warehouse.dump` to the new laptop.
2. In PowerShell, create the database and restore:
```powershell
# Create the empty target database
psql -U postgres -h 127.0.0.1 -p 5432 -c "CREATE DATABASE crimelens_db;"

# Restore both schemas and all records cleanly
pg_restore -U postgres -h 127.0.0.1 -p 5432 -d crimelens_db -v "C:\Users\<NewUser>\Downloads\CrimeLens\crimelens_complete_warehouse.dump"
```

3. Verify row counts on the new laptop:
```powershell
cd C:\Users\<NewUser>\Downloads\CrimeLens\backend
.\venv\Scripts\python.exe -c "
import psycopg2, os
from dotenv import load_dotenv
load_dotenv('.env')
conn = psycopg2.connect(dbname='crimelens_db', user='postgres', password=os.getenv('DB_PASSWORD'), host='127.0.0.1', port=5432)
cur = conn.cursor()
cur.execute('SELECT COUNT(*) FROM fact_crime;')
print('Real Incidents:', cur.fetchone()[0])
cur.execute('SELECT COUNT(*) FROM synthetic_data.fact_crime;')
print('Synthetic Records:', cur.fetchone()[0])
conn.close()
"
```
*Expected Output:*
```
Real Incidents: 761718
Synthetic Records: 30000
```

### Step 6: Start the Application on the New Laptop
Follow Steps 3, 4, and 5 from **Scenario 1** above to start FastAPI and Vite.

---

## 3. Alternative: Recreating Warehouse from Scratch Without Dump (ETL Pipeline)

If you cannot transfer the ~95 MB binary dump file, you can recreate the entire warehouse from scratch on the new laptop using the automated ETL scripts:

```powershell
cd C:\Users\<NewUser>\Downloads\CrimeLens

# 1. Create empty database and star-schema DDL:
psql -U postgres -h 127.0.0.1 -p 5432 -f database\01_create_database.sql
psql -U postgres -h 127.0.0.1 -p 5432 -d crimelens_db -f database\02_create_dimensions.sql
psql -U postgres -h 127.0.0.1 -p 5432 -d crimelens_db -f database\03_create_fact_table.sql
psql -U postgres -h 127.0.0.1 -p 5432 -d crimelens_db -f database\04_create_indexes.sql
psql -U postgres -h 127.0.0.1 -p 5432 -d crimelens_db -f database\06_create_etl_run_log.sql

# 2. Build the synthetic benchmark dataset (30,000 records in synthetic_data schema):
.\backend\venv\Scripts\python.exe scripts\create_synthetic_schema.py
.\backend\venv\Scripts\python.exe scripts\etl_synthetic.py

# 3. Ingest the full 3-year official Chicago Police census (2023–2025):
.\backend\venv\Scripts\python.exe scripts\migrate_three_year_warehouse.py
```
*(Option 3 requires an active internet connection to download and transform historical Socrata records, which takes approximately 15–25 minutes).*

---

## 4. Connection Pooling & Resource Disposal

CrimeLens incorporates connection pool management:
- **FastAPI Lifespan Management:** On server shutdown (`Ctrl + C`), FastAPI triggers `dispose_engine()`, terminating all pooled PostgreSQL connections and preventing orphaned connection leaks on Windows.
- **Client Session Scope:** Every SQL query executed through `database.py` utilizes scoped context managers (`with engine.connect() as conn:`), releasing connections immediately back to the pool.

---

## 5. Troubleshooting & Port Conflict Resolution

| Symptom | Probable Cause | One-Line PowerShell Fix |
| :--- | :--- | :--- |
| **Port 8000 Conflict** | Lingering uvicorn or python process | `Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess \| Stop-Process -Force` |
| **Port 5173 Conflict** | Lingering Vite node process | `Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess \| Stop-Process -Force` |
| **PostgreSQL 28P01** | `DB_PASSWORD` in `.env` is incorrect | Edit `backend/.env` with Notepad, verify password with `.\backend\venv\Scripts\python.exe scripts\test_pg.py` |
| **CORS Blocked in Browser** | Non-whitelisted frontend port | Add your origin to `CORS_ORIGINS` in `backend/.env` and restart FastAPI |
| **Synthetic/Real Data Mixed** | Cache cross-contamination | Clear cache by restarting FastAPI (Phase 6 cache partitions strictly by `ds_prefix`) |
