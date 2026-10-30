import os
import pandas as pd
from typing import Tuple, Dict, Any

REQUIRED_COLUMNS = [
    'id', 'case_number', 'date', 'block', 'iucr', 'primary_type',
    'description', 'location_description', 'arrest', 'domestic',
    'beat', 'district', 'ward', 'community_area', 'fbi_code',
    'year', 'updated_on', 'x_coordinate', 'y_coordinate', 'latitude', 'longitude'
]

def extract_raw_data(raw_csv_path: str) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Extracts raw Chicago crime data from CSV, validates required schema,
    and returns raw DataFrame alongside extraction diagnostic metrics.
    """
    if not os.path.exists(raw_csv_path):
        raise FileNotFoundError(f"Raw CSV dataset not found at '{raw_csv_path}'.")

    # Read raw dataset with string dtype to prevent premature conversion side effects
    df_raw = pd.read_csv(raw_csv_path, dtype=str)
    raw_count = len(df_raw)

    # Validate required columns
    missing_req = [col for col in REQUIRED_COLUMNS if col not in df_raw.columns]
    if missing_req:
        raise ValueError(f"Raw CSV missing required columns: {missing_req}")

    # Extract diagnostic metadata
    duplicate_ids_count = int(df_raw['id'].duplicated().sum()) if 'id' in df_raw.columns else 0
    missing_coords_count = int(df_raw['latitude'].isna().sum() + (df_raw['latitude'] == "").sum()) if 'latitude' in df_raw.columns else raw_count
    
    missing_summary = {col: int(df_raw[col].isna().sum() + (df_raw[col] == "").sum()) for col in df_raw.columns}

    extraction_meta = {
        "source_file": raw_csv_path,
        "extracted_count": raw_count,
        "duplicate_source_ids_count": duplicate_ids_count,
        "missing_coordinates_count": missing_coords_count,
        "missing_summary": missing_summary
    }

    return df_raw, extraction_meta
