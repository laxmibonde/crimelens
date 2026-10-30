import pandas as pd
import numpy as np
from typing import Tuple, Dict, Any

def get_time_period(hour: int) -> str:
    if 5 <= hour <= 11:
        return 'Morning'
    elif 12 <= hour <= 16:
        return 'Afternoon'
    elif 17 <= hour <= 21:
        return 'Evening'
    else:
        return 'Night'

def transform_crime_data(df_raw: pd.DataFrame) -> Tuple[Dict[str, pd.DataFrame], Dict[str, Any]]:
    """
    Transforms raw crime DataFrame into cleaned, normalized Star Schema dimension
    and fact staging DataFrames. Implements deterministic deduplication and zero-loss missing handling.
    """
    df = df_raw.copy()
    initial_count = len(df)

    # 1. Deterministic Deduplication on source_crime_id
    duplicate_mask = df['id'].duplicated(keep='first')
    duplicate_ids = df.loc[duplicate_mask, 'id'].tolist() if 'id' in df.columns else []
    df = df.drop_duplicates(subset=['id'], keep='first').copy()
    unique_count = len(df)

    # 2. Field Normalization
    string_cols = ['primary_type', 'description', 'block', 'location_description', 
                   'iucr', 'fbi_code', 'district', 'beat', 'ward', 'community_area']
    for col in string_cols:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip().str.upper()
            df[col] = df[col].replace({'NAN': None, 'NONE': None, '': None})

    # Fill defaults for non-nullable dimension strings
    df['primary_type'] = df['primary_type'].fillna('UNKNOWN_CRIME')
    df['description'] = df['description'].fillna('UNKNOWN_DESCRIPTION')
    df['iucr'] = df['iucr'].fillna('0000')
    df['fbi_code'] = df['fbi_code'].fillna('UNKNOWN')
    
    df['district'] = df['district'].fillna('UNKNOWN')
    df['beat'] = df['beat'].fillna('UNKNOWN')
    df['ward'] = df['ward'].fillna('UNKNOWN')
    df['community_area'] = df['community_area'].fillna('UNKNOWN')
    
    df['location_description'] = df['location_description'].fillna('UNKNOWN_PREMISE')
    df['block'] = df['block'].fillna('UNKNOWN_BLOCK')

    # 3. Boolean Conversion
    for bool_col in ['arrest', 'domestic']:
        if bool_col in df.columns:
            df[bool_col] = df[bool_col].astype(str).str.upper().isin(['TRUE', '1', 'T', 'YES'])

    # 4. Temporal Derivation & Grain Handling
    df['parsed_date'] = pd.to_datetime(df['date'], errors='coerce')
    invalid_dates_count = int(df['parsed_date'].isna().sum())

    # Filter out unparseable date rows if any (0 found in Chicago dataset)
    if invalid_dates_count > 0:
        df = df.dropna(subset=['parsed_date']).copy()

    # Time dimension attributes
    df['full_date'] = df['parsed_date'].dt.date
    df['full_timestamp'] = df['parsed_date'].dt.strftime('%Y-%m-%d %H:%M:%S')
    df['year'] = df['parsed_date'].dt.year
    df['quarter'] = df['parsed_date'].dt.quarter
    df['month'] = df['parsed_date'].dt.month
    df['month_name'] = df['parsed_date'].dt.strftime('%B')
    df['day'] = df['parsed_date'].dt.day
    df['day_of_week'] = df['parsed_date'].dt.dayofweek + 1  # 1 = Monday, 7 = Sunday
    df['day_name'] = df['parsed_date'].dt.strftime('%A')
    df['hour'] = df['parsed_date'].dt.hour
    df['time_period'] = df['hour'].apply(get_time_period)
    df['is_weekend'] = df['day_of_week'].isin([6, 7])

    # time_key formatted as YYYYMMDDHH (Date-Hour Grain)
    df['time_key'] = (
        df['year'].astype(str) + 
        df['month'].astype(str).str.zfill(2) + 
        df['day'].astype(str).str.zfill(2) + 
        df['hour'].astype(str).str.zfill(2)
    ).astype(int)

    # 5. Geographic Coordinate Validation
    df['lat_numeric'] = pd.to_numeric(df['latitude'], errors='coerce')
    df['lon_numeric'] = pd.to_numeric(df['longitude'], errors='coerce')
    df['x_numeric'] = pd.to_numeric(df['x_coordinate'], errors='coerce')
    df['y_numeric'] = pd.to_numeric(df['y_coordinate'], errors='coerce')

    missing_coords_mask = df['lat_numeric'].isna() | df['lon_numeric'].isna()
    missing_coords_count = int(missing_coords_mask.sum())

    # 6. Construct Unique Dimension DataFrames

    # dim_time (Unique date-hour rows)
    dim_time_df = df[[
        'time_key', 'full_date', 'full_timestamp', 'year', 'quarter', 
        'month', 'month_name', 'day', 'day_of_week', 'day_name', 
        'hour', 'time_period', 'is_weekend'
    ]].drop_duplicates(subset=['time_key']).copy()

    # dim_area (Unique administrative area hierarchies)
    dim_area_df = df[['district', 'beat', 'ward', 'community_area']].drop_duplicates().copy()

    # dim_location (Unique block/coordinate locations, omitting missing coordinates for default row 0 mapping)
    loc_valid_df = df[~missing_coords_mask][['block', 'lat_numeric', 'lon_numeric', 'x_numeric', 'y_numeric']].copy()
    loc_valid_df.columns = ['block', 'latitude', 'longitude', 'x_coordinate', 'y_coordinate']
    dim_location_df = loc_valid_df.drop_duplicates(subset=['block', 'latitude', 'longitude']).copy()

    # dim_crime (Unique offense taxonomies)
    dim_crime_df = df[['primary_type', 'description', 'iucr', 'fbi_code']].drop_duplicates().copy()

    # dim_premise (Unique premise descriptions)
    dim_premise_df = df[['location_description']].drop_duplicates().copy()

    # dim_status (Unique arrest & domestic flags)
    dim_status_df = df[['arrest', 'domestic']].drop_duplicates().copy()

    dimension_dfs = {
        "dim_time": dim_time_df,
        "dim_area": dim_area_df,
        "dim_location": dim_location_df,
        "dim_crime": dim_crime_df,
        "dim_premise": dim_premise_df,
        "dim_status": dim_status_df,
        "fact_staging": df
    }

    transform_meta = {
        "initial_record_count": initial_count,
        "unique_record_count": unique_count,
        "duplicate_ids_removed": len(duplicate_ids),
        "duplicate_id_sample": duplicate_ids[:5],
        "missing_coordinates_count": missing_coords_count,
        "missing_coordinates_percentage": round((missing_coords_count / unique_count) * 100, 2),
        "invalid_dates_count": invalid_dates_count
    }

    return dimension_dfs, transform_meta
