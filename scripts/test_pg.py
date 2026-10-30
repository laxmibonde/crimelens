import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, "backend", ".env")
load_dotenv(dotenv_path=ENV_PATH)

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "crimelens_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

pg_url = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
print(f"Testing PostgreSQL connection string: postgresql+psycopg2://{DB_USER}:***@{DB_HOST}:{DB_PORT}/{DB_NAME}")

try:
    engine = create_engine(pg_url, pool_pre_ping=True, connect_args={"connect_timeout": 3})
    with engine.connect() as conn:
        res = conn.execute(text("SELECT count(*) FROM fact_crime;")).fetchone()
        print(f"SUCCESS: Connected to PostgreSQL database '{DB_NAME}' on {DB_HOST}:{DB_PORT}")
        print(f"Independent PostgreSQL fact_crime row count: {res[0]}")
except Exception as e:
    print(f"PostgreSQL connection failed: {e}")
