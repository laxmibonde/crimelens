import os
import sys
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
backend_dir = os.path.join(BASE_DIR, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

ENV_PATH = os.path.join(backend_dir, ".env")
load_dotenv(dotenv_path=ENV_PATH)

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "crimelens_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

# Singleton Database Engine with proper connection pool management
_ENGINE = None

def get_engine():
    """
    Returns the singleton SQLAlchemy database engine connected exclusively to the PostgreSQL Data Warehouse.
    Reuses connection pool to prevent connection exhaustion.
    """
    global _ENGINE
    if _ENGINE is None:
        pg_url = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        _ENGINE = create_engine(
            pg_url,
            pool_size=10,
            max_overflow=20,
            pool_timeout=10,
            pool_recycle=1800,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 5}
        )
    return _ENGINE

def dispose_engine():
    """
    Disposes of the singleton SQLAlchemy connection pool, closing all open database sessions.
    Called during application shutdown.
    """
    global _ENGINE
    if _ENGINE is not None:
        _ENGINE.dispose()
        _ENGINE = None

def get_schema_for_dataset(dataset: str = "real") -> str:
    """
    Returns sanitized PostgreSQL schema name based on dataset identifier.
    Guarantees strict schema isolation and prevents SQL injection.
    """
    if not dataset:
        return "public"
    ds_clean = str(dataset).lower().strip()
    if ds_clean in ["synthetic", "synthetic_demo", "synthetic_data", "demo"]:
        return "synthetic_data"
    return "public"


def execute_query(sql_str, params=None):
    """
    Executes a SQL query against the PostgreSQL Data Warehouse engine and returns a pandas DataFrame.
    """
    engine = get_engine()
    with engine.connect() as conn:
        df = pd.read_sql(text(sql_str), conn, params=params or {})
    return df
