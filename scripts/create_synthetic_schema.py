import sys
import os

sys.path.insert(0, r"c:\Users\suvar\Downloads\CrimeLens\backend")
from database import get_engine, execute_query
from sqlalchemy import text

def create_synthetic_schema():
    print("=" * 70)
    print("STEP 2 & 3: CREATING POSTGRESQL 'synthetic_data' SCHEMA & TABLES")
    print("=" * 70)

    engine = get_engine()

    ddl_sql = """
        -- 1. Create isolated schema for synthetic dataset
        CREATE SCHEMA IF NOT EXISTS synthetic_data;

        -- 2. Dimension Tables inside synthetic_data schema
        CREATE TABLE IF NOT EXISTS synthetic_data.dim_time (
            time_key SERIAL PRIMARY KEY,
            full_timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL,
            year INT NOT NULL,
            month INT NOT NULL,
            month_name VARCHAR(20) NOT NULL,
            day INT NOT NULL,
            day_of_week INT NOT NULL,
            day_name VARCHAR(20) NOT NULL,
            hour INT NOT NULL,
            quarter INT NOT NULL,
            is_weekend BOOLEAN NOT NULL,
            shift VARCHAR(20) NOT NULL
        );

        CREATE TABLE IF NOT EXISTS synthetic_data.dim_location (
            location_key SERIAL PRIMARY KEY,
            block VARCHAR(255) NOT NULL,
            location_description VARCHAR(255) NOT NULL,
            latitude NUMERIC(10, 6),
            longitude NUMERIC(10, 6),
            x_coordinate NUMERIC(12, 2),
            y_coordinate NUMERIC(12, 2)
        );

        CREATE TABLE IF NOT EXISTS synthetic_data.dim_crime (
            crime_key SERIAL PRIMARY KEY,
            iucr VARCHAR(10) NOT NULL,
            primary_type VARCHAR(100) NOT NULL,
            description VARCHAR(255) NOT NULL,
            fbi_code VARCHAR(10) NOT NULL
        );

        CREATE TABLE IF NOT EXISTS synthetic_data.dim_premise (
            premise_key SERIAL PRIMARY KEY,
            location_description VARCHAR(255) NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS synthetic_data.dim_status (
            status_key SERIAL PRIMARY KEY,
            arrest BOOLEAN NOT NULL,
            domestic BOOLEAN NOT NULL
        );

        CREATE TABLE IF NOT EXISTS synthetic_data.dim_area (
            area_key SERIAL PRIMARY KEY,
            beat VARCHAR(10) NOT NULL,
            district VARCHAR(10) NOT NULL,
            ward VARCHAR(10) NOT NULL,
            community_area VARCHAR(10) NOT NULL
        );

        -- 3. Fact Table inside synthetic_data schema
        CREATE TABLE IF NOT EXISTS synthetic_data.fact_crime (
            crime_fact_key BIGSERIAL PRIMARY KEY,
            crime_id VARCHAR(50) NOT NULL,
            case_number VARCHAR(50) NOT NULL,
            time_key INT NOT NULL REFERENCES synthetic_data.dim_time(time_key),
            location_key INT NOT NULL REFERENCES synthetic_data.dim_location(location_key),
            crime_key INT NOT NULL REFERENCES synthetic_data.dim_crime(crime_key),
            premise_key INT NOT NULL REFERENCES synthetic_data.dim_premise(premise_key),
            status_key INT NOT NULL REFERENCES synthetic_data.dim_status(status_key),
            area_key INT NOT NULL REFERENCES synthetic_data.dim_area(area_key),
            incident_count INT DEFAULT 1 NOT NULL
        );

        -- Indices for fast querying
        CREATE INDEX IF NOT EXISTS idx_syn_fact_time ON synthetic_data.fact_crime(time_key);
        CREATE INDEX IF NOT EXISTS idx_syn_fact_location ON synthetic_data.fact_crime(location_key);
        CREATE INDEX IF NOT EXISTS idx_syn_fact_crime ON synthetic_data.fact_crime(crime_key);
        CREATE INDEX IF NOT EXISTS idx_syn_fact_area ON synthetic_data.fact_crime(area_key);
        CREATE INDEX IF NOT EXISTS idx_syn_fact_status ON synthetic_data.fact_crime(status_key);

        -- UNKNOWN dimension rows
        INSERT INTO synthetic_data.dim_location (location_key, block, location_description, latitude, longitude)
        VALUES (-1, 'UNKNOWN BLOCK', 'UNKNOWN', NULL, NULL)
        ON CONFLICT (location_key) DO NOTHING;

        INSERT INTO synthetic_data.dim_area (area_key, beat, district, ward, community_area)
        VALUES (-1, 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN')
        ON CONFLICT (area_key) DO NOTHING;

        INSERT INTO synthetic_data.dim_premise (premise_key, location_description)
        VALUES (-1, 'UNKNOWN')
        ON CONFLICT (premise_key) DO NOTHING;

        INSERT INTO synthetic_data.dim_status (status_key, arrest, domestic)
        VALUES (-1, FALSE, FALSE)
        ON CONFLICT (status_key) DO NOTHING;

        INSERT INTO synthetic_data.dim_crime (crime_key, iucr, primary_type, description, fbi_code)
        VALUES (-1, 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN')
        ON CONFLICT (crime_key) DO NOTHING;
    """

    with engine.connect() as conn:
        conn.execute(text(ddl_sql))
        conn.commit()
    
    print("[SUCCESS] Schema 'synthetic_data' and all 7 star-schema tables created successfully.")

if __name__ == "__main__":
    create_synthetic_schema()
