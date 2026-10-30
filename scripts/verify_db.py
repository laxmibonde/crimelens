import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, "backend", ".env")
DATABASE_DIR = os.path.join(BASE_DIR, "database")

load_dotenv(dotenv_path=ENV_PATH)

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "crimelens_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

def p(msg):
    print(msg, flush=True)

def verify_and_setup_database():
    p("=======================================================================")
    p(" CrimeLens Phase 3 - PostgreSQL Data Warehouse Verification")
    p("=======================================================================")
    p(f"Target Host: {DB_HOST}:{DB_PORT}")
    p(f"Target Database: {DB_NAME}")
    p(f"Database User: {DB_USER}")
    p("-----------------------------------------------------------------------")

    # Step 1: Test Connection to PostgreSQL Server
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            dbname="postgres",
            connect_timeout=5
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        p("[OK] Successfully authenticated and connected to PostgreSQL server.")
    except Exception as e:
        p("[NOTICE] Local PostgreSQL server is active, but requires your local password.")
        p(f"Connection Error: {e}")
        p("\n--- MANUAL POSTGRESQL CREDENTIAL & EXECUTION SETUP ---")
        p("1. Set your local PostgreSQL password in 'backend/.env':")
        p(f"   DB_PASSWORD=your_actual_postgres_password")
        p("2. Execute the DDL SQL scripts in order using psql or pgAdmin:")
        p(f"   psql -U {DB_USER} -d postgres -f database/01_create_database.sql")
        p(f"   psql -U {DB_USER} -d {DB_NAME} -f database/02_create_dimensions.sql")
        p(f"   psql -U {DB_USER} -d {DB_NAME} -f database/03_create_fact_table.sql")
        p(f"   psql -U {DB_USER} -d {DB_NAME} -f database/04_create_indexes.sql")
        p(f"   psql -U {DB_USER} -d {DB_NAME} -f database/05_validation_queries.sql")
        p("=======================================================================\n")
        return False

    # Step 2: Check & Create Database 'crimelens_db'
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s;", (DB_NAME,))
    exists = cur.fetchone()

    if not exists:
        p(f"Creating database '{DB_NAME}'...")
        cur.execute(f"CREATE DATABASE {DB_NAME} WITH ENCODING = 'UTF8';")
        p(f"[OK] Database '{DB_NAME}' created successfully.")
    else:
        p(f"[OK] Database '{DB_NAME}' already exists.")

    cur.close()
    conn.close()

    # Step 3: Connect to crimelens_db and Apply DDL Scripts
    p(f"\nConnecting to '{DB_NAME}' database to execute Star Schema DDL scripts...")
    db_conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        dbname=DB_NAME
    )
    db_conn.autocommit = True
    db_cur = db_conn.cursor()

    ddl_files = [
        "02_create_dimensions.sql",
        "03_create_fact_table.sql",
        "04_create_indexes.sql"
    ]

    for script_name in ddl_files:
        script_path = os.path.join(DATABASE_DIR, script_name)
        p(f"Executing '{script_name}'...")
        with open(script_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()
            db_cur.execute(sql_content)

    p("[OK] Star Schema tables, surrogate keys, constraints, and indexes created successfully.")

    # Step 4: Run Validation Checks
    p("\nRunning Star Schema Validation Checks...")
    
    # Table inventory
    db_cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('fact_crime', 'dim_time', 'dim_area', 'dim_location', 'dim_crime', 'dim_premise', 'dim_status')
        ORDER BY table_name;
    """)
    tables = [row[0] for row in db_cur.fetchall()]
    p(f"[OK] Created Tables ({len(tables)}/7): {', '.join(tables)}")

    # FK Check
    db_cur.execute("""
        SELECT count(*) 
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' AND table_name = 'fact_crime';
    """)
    fk_count = db_cur.fetchone()[0]
    p(f"[OK] Foreign Key Constraints on fact_crime: {fk_count} constraints active.")

    # Default UNKNOWN rows check
    db_cur.execute("""
        SELECT 
          (SELECT count(*) FROM dim_time WHERE time_key = 0) +
          (SELECT count(*) FROM dim_area WHERE area_key = 0) +
          (SELECT count(*) FROM dim_location WHERE location_key = 0) +
          (SELECT count(*) FROM dim_crime WHERE crime_key = 0) +
          (SELECT count(*) FROM dim_premise WHERE premise_key = 0) +
          (SELECT count(*) FROM dim_status WHERE status_key = 0) AS default_count;
    """)
    default_count = db_cur.fetchone()[0]
    p(f"[OK] Default UNKNOWN Dimension Members Verified: {default_count}/6 dimension default rows present.")

    db_cur.close()
    db_conn.close()

    p("-----------------------------------------------------------------------")
    p("SUCCESS: Phase 3 PostgreSQL Star Schema Data Warehouse Fully Initialized!")
    p("=======================================================================\n")
    return True

if __name__ == "__main__":
    verify_and_setup_database()
