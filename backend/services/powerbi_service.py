import os
import sys
from typing import Dict, Any, List, Optional
from database import get_schema_for_dataset, get_engine
from sqlalchemy import text

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def get_powerbi_metadata(dataset: str = "real") -> Dict[str, Any]:
    schema = get_schema_for_dataset(dataset)
    is_synth = (schema == "synthetic_data")

    return {
        "dataset": dataset,
        "schema": schema,
        "is_synthetic": is_synth,
        "connection": {
            "server": "127.0.0.1:5432",
            "database": "crimelens_db",
            "schema": schema,
            "recommended_mode": "Import Mode"
        },
        "artifact_status": {
            "pbi_desktop_installed": False,
            "status_code": "PACKAGE_READY",
            "status_label": "MODEL PACKAGE READY (ASSEMBLY IN POWER BI DESKTOP REQUIRED)",
            "message": "Power Query M scripts, 20+ DAX measures, JSON dark theme, and model specifications are fully generated. Assembly and final report rendering require Power BI Desktop."
        }
    }


def get_powerbi_model(dataset: str = "real") -> Dict[str, Any]:
    schema = get_schema_for_dataset(dataset)
    engine = get_engine()

    tables = []
    with engine.connect() as conn:
        for tbl in ["fact_crime", "dim_time", "dim_area", "dim_location", "dim_crime", "dim_premise", "dim_status"]:
            tbl_name = f"{schema}.{tbl}"
            cnt = int(conn.execute(text(f"SELECT COUNT(*) FROM {tbl_name}")).scalar() or 0)
            
            pk = "crime_fact_key" if tbl == "fact_crime" else f"{tbl.replace('dim_', '')}_key"
            fks = ["time_key", "area_key", "location_key", "crime_key", "premise_key", "status_key"] if tbl == "fact_crime" else []

            tables.append({
                "table_name": tbl,
                "schema": schema,
                "role": "FACT" if tbl == "fact_crime" else "DIMENSION",
                "row_count": cnt,
                "primary_key": pk,
                "foreign_keys": fks
            })

    relationships = [
        {"from_table": "fact_crime", "from_key": "time_key", "to_table": "dim_time", "to_key": "time_key", "cardinality": "Many-to-One (1:*)", "direction": "Single"},
        {"from_table": "fact_crime", "from_key": "area_key", "to_table": "dim_area", "to_key": "area_key", "cardinality": "Many-to-One (1:*)", "direction": "Single"},
        {"from_table": "fact_crime", "from_key": "location_key", "to_table": "dim_location", "to_key": "location_key", "cardinality": "Many-to-One (1:*)", "direction": "Single"},
        {"from_table": "fact_crime", "from_key": "crime_key", "to_table": "dim_crime", "to_key": "crime_key", "cardinality": "Many-to-One (1:*)", "direction": "Single"},
        {"from_table": "fact_crime", "from_key": "premise_key", "to_table": "dim_premise", "to_key": "premise_key", "cardinality": "Many-to-One (1:*)", "direction": "Single"},
        {"from_table": "fact_crime", "from_key": "status_key", "to_table": "dim_status", "to_key": "status_key", "cardinality": "Many-to-One (1:*)", "direction": "Single"}
    ]

    return {
        "dataset": dataset,
        "schema": schema,
        "tables": tables,
        "relationships": relationships
    }


def get_powerbi_measures() -> List[Dict[str, Any]]:
    return [
        {
            "id": 1,
            "name": "Total Recorded Incidents",
            "category": "Baseline Aggregations",
            "dax": "Total Recorded Incidents = COUNTROWS(fact_crime)",
            "description": "Calculates total fact rows loaded into the fact_crime table."
        },
        {
            "id": 2,
            "name": "Arrested Incidents",
            "category": "Operational Status",
            "dax": "Arrested Incidents = CALCULATE([Total Recorded Incidents], dim_status[arrest] = TRUE())",
            "description": "Filters total incidents where arrest flag is TRUE."
        },
        {
            "id": 3,
            "name": "Arrest Percentage",
            "category": "Operational Status",
            "dax": "Arrest Percentage = DIVIDE([Arrested Incidents], [Total Recorded Incidents], 0)",
            "description": "Safe division of arrest count over total incidents."
        },
        {
            "id": 4,
            "name": "Domestic Incidents",
            "category": "Operational Status",
            "dax": "Domestic Incidents = CALCULATE([Total Recorded Incidents], dim_status[domestic] = TRUE())",
            "description": "Filters total incidents where domestic flag is TRUE."
        },
        {
            "id": 5,
            "name": "Domestic Percentage",
            "category": "Operational Status",
            "dax": "Domestic Percentage = DIVIDE([Domestic Incidents], [Total Recorded Incidents], 0)",
            "description": "Safe division of domestic incident count over total incidents."
        },
        {
            "id": 6,
            "name": "Unique Crime Categories",
            "category": "Taxonomy",
            "dax": "Unique Crime Categories = DISTINCTCOUNT(dim_crime[primary_type])",
            "description": "Counts distinct primary crime categories in dim_crime."
        },
        {
            "id": 7,
            "name": "Active Districts",
            "category": "Geospatial",
            "dax": "Active Districts = DISTINCTCOUNT(dim_area[district])",
            "description": "Counts distinct police districts in dim_area."
        },
        {
            "id": 8,
            "name": "Nighttime Incidents",
            "category": "Temporal",
            "dax": "Nighttime Incidents = CALCULATE([Total Recorded Incidents], dim_time[time_period] = \"Night\")",
            "description": "Incidents occurring during Night time period."
        },
        {
            "id": 9,
            "name": "Nighttime Percentage",
            "category": "Temporal",
            "dax": "Nighttime Percentage = DIVIDE([Nighttime Incidents], [Total Recorded Incidents], 0)",
            "description": "Percentage of total incidents occurring at night."
        },
        {
            "id": 10,
            "name": "Weekend Incidents",
            "category": "Temporal",
            "dax": "Weekend Incidents = CALCULATE([Total Recorded Incidents], dim_time[is_weekend] = TRUE())",
            "description": "Incidents occurring on Saturday or Sunday."
        },
        {
            "id": 11,
            "name": "Weekend Percentage",
            "category": "Temporal",
            "dax": "Weekend Percentage = DIVIDE([Weekend Incidents], [Total Recorded Incidents], 0)",
            "description": "Percentage of total incidents occurring on weekends."
        },
        {
            "id": 12,
            "name": "Incidents With Valid Coordinates",
            "category": "Spatial Quality",
            "dax": "Incidents With Valid Coordinates = CALCULATE([Total Recorded Incidents], NOT(ISBLANK(dim_location[latitude])), NOT(ISBLANK(dim_location[longitude])), dim_location[latitude] <> 0, dim_location[longitude] <> 0)",
            "description": "Count of incidents with valid non-null geospatial coordinates."
        },
        {
            "id": 13,
            "name": "Spatial Eligibility Percentage",
            "category": "Spatial Quality",
            "dax": "Spatial Eligibility Percentage = DIVIDE([Incidents With Valid Coordinates], [Total Recorded Incidents], 0)",
            "description": "Percentage of incidents eligible for spatial DBSCAN clustering."
        },
        {
            "id": 14,
            "name": "Selected Period Incidents",
            "category": "Time Intelligence",
            "dax": "Selected Period Incidents = [Total Recorded Incidents]",
            "description": "Incident count within current slicer evaluation context."
        },
        {
            "id": 15,
            "name": "Previous Period Incidents",
            "category": "Time Intelligence",
            "dax": "Previous Period Incidents = CALCULATE([Total Recorded Incidents], DATEADD(dim_time[full_date], -1, MONTH))",
            "description": "Incident count in previous month."
        },
        {
            "id": 16,
            "name": "Absolute Period Difference",
            "category": "Time Intelligence",
            "dax": "Absolute Period Difference = [Selected Period Incidents] - [Previous Period Incidents]",
            "description": "Difference between current and previous month incidents."
        },
        {
            "id": 17,
            "name": "Relative Period Difference",
            "category": "Time Intelligence",
            "dax": "Relative Period Difference = DIVIDE([Absolute Period Difference], [Previous Period Incidents], 0)",
            "description": "Percentage growth/decline rate relative to previous month."
        },
        {
            "id": 18,
            "name": "Category Share",
            "category": "Ratios & Shares",
            "dax": "Category Share = DIVIDE([Total Recorded Incidents], CALCULATE([Total Recorded Incidents], ALL(dim_crime[primary_type])), 0)",
            "description": "Category incident count divided by total across all categories."
        },
        {
            "id": 19,
            "name": "District Share",
            "category": "Ratios & Shares",
            "dax": "District Share = DIVIDE([Total Recorded Incidents], CALCULATE([Total Recorded Incidents], ALL(dim_area[district])), 0)",
            "description": "District incident count divided by total across all districts."
        },
        {
            "id": 20,
            "name": "Selected Date Range Incident Count",
            "category": "Time Intelligence",
            "dax": "Selected Date Range Incident Count = CALCULATE([Total Recorded Incidents], ALLSELECTED(dim_time))",
            "description": "Incident count across all user-selected dates."
        }
    ]


def get_powerbi_setup_guide() -> Dict[str, Any]:
    return {
        "connection_steps": [
            "1. Open Power BI Desktop -> Get Data -> PostgreSQL database.",
            "2. Enter Server: 127.0.0.1:5432 and Database: crimelens_db.",
            "3. Select Data Connectivity mode: Import.",
            "4. Expand public (or synthetic_data) schema and select all 7 tables.",
            "5. Click Transform Data to open Power Query Editor."
        ],
        "relationship_steps": [
            "1. Navigate to Model View in Power BI Desktop.",
            "2. Drag time_key from dim_time to fact_crime.time_key (1:* Single).",
            "3. Drag area_key from dim_area to fact_crime.area_key (1:* Single).",
            "4. Drag location_key from dim_location to fact_crime.location_key (1:* Single).",
            "5. Drag crime_key from dim_crime to fact_crime.crime_key (1:* Single).",
            "6. Drag premise_key from dim_premise to fact_crime.premise_key (1:* Single).",
            "7. Drag status_key from dim_status to fact_crime.status_key (1:* Single)."
        ],
        "theme_steps": [
            "1. Go to View tab -> Themes dropdown -> Browse for themes.",
            "2. Select powerbi/theme/crimelens_theme.json."
        ]
    }


def get_powerbi_academic_explanation() -> Dict[str, Any]:
    return {
        "title": "Academic Methodology: Microsoft Power BI Semantic Modeling & Integration",
        "concepts": [
            {
                "term": "Semantic Data Model",
                "definition": "A semantic model abstracts relational data into business-ready entities, dimensions, hierarchies, and DAX measures for self-service reporting."
            },
            {
                "term": "DAX Filter Context",
                "definition": "Data Analysis Expressions (DAX) evaluate measures dynamically based on report visual slicers, matrix row/column headers, and explicit CALCULATE filter overrides."
            },
            {
                "term": "Import Mode vs. DirectQuery",
                "definition": "Import Mode caches dataset snapshots into Power BI's in-memory VertiPaq engine for maximum DAX performance and time-intelligence function support."
            },
            {
                "term": "Historical Census Coverage Disclosures",
                "definition": "Reports built on the real Chicago census feature prominent disclaimers noting that the dataset spans 761,718 incidents across all 36 continuous months from January 2023 through December 2025."
            }
        ],
        "viva_questions": [
            {
                "question": "Why is Import mode preferred for the CrimeLens Power BI model?",
                "answer": "Import mode loads data into Power BI's high-speed VertiPaq engine, enabling complex DAX time-intelligence functions (DATEADD, SAMEPERIODLASTYEAR) and fast interactive visuals."
            },
            {
                "question": "How does Power BI prevent cross-dataset mixing?",
                "answer": "Real (public) and Synthetic (synthetic_data) tables are loaded via separate Power Query queries pointing to distinct PostgreSQL schemas."
            }
        ]
    }
