import pandas as pd
import numpy as np
import os
import json
from datetime import datetime

RAW_DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "raw", "chicago_crimes_raw.csv")
REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "reports")

JSON_REPORT_PATH = os.path.join(REPORTS_DIR, "dataset_profile.json")
MD_REPORT_PATH = os.path.join(REPORTS_DIR, "dataset_profile.md")

def profile_dataset():
    """
    Performs comprehensive data profiling on raw Chicago Crime dataset using Pandas.
    Generates structured reports/dataset_profile.json and reports/dataset_profile.md.
    """
    print("=======================================================================")
    print(" CrimeLens Phase 2 - Dataset Profiling Pipeline")
    print("=======================================================================")
    print(f"Reading raw dataset from: {RAW_DATA_PATH}")

    if not os.path.exists(RAW_DATA_PATH):
        raise FileNotFoundError(f"Raw data file not found at '{RAW_DATA_PATH}'. Run fetch_data.py first.")

    os.makedirs(REPORTS_DIR, exist_ok=True)
    df = pd.read_csv(RAW_DATA_PATH, dtype=str)

    total_records = len(df)
    print(f"Loaded {total_records:,} total records for analysis.")

    # 1. Columns & Data Types
    columns_list = list(df.columns)
    column_dtypes = {col: str(df[col].dtype) for col in columns_list}

    # 2. Missing Values Analysis
    missing_values = {}
    missing_pct = {}
    for col in columns_list:
        null_count = int(df[col].isna().sum() + (df[col] == "").sum() + (df[col] == "nan").sum())
        missing_values[col] = null_count
        missing_pct[col] = round((null_count / total_records) * 100, 2)

    # 3. Duplicate IDs Analysis
    if 'id' in df.columns:
        duplicate_ids_count = int(df['id'].duplicated().sum())
    else:
        duplicate_ids_count = 0

    # 4. Date Analysis & Invalid Dates
    date_col = 'date' if 'date' in df.columns else None
    invalid_dates_count = 0
    earliest_date_str = None
    latest_date_str = None
    records_by_year_month = {}
    records_by_year = {}

    if date_col:
        parsed_dates = pd.to_datetime(df[date_col], errors='coerce')
        invalid_dates_count = int(parsed_dates.isna().sum())

        valid_dates = parsed_dates.dropna()
        if not valid_dates.empty:
            earliest_date_str = valid_dates.min().strftime('%Y-%m-%d %H:%M:%S')
            latest_date_str = valid_dates.max().strftime('%Y-%m-%d %H:%M:%S')

            # Records by Year & Month
            valid_df = pd.DataFrame({'year_month': valid_dates.dt.to_period('M').astype(str), 'year': valid_dates.dt.year.astype(str)})
            records_by_year_month = valid_df['year_month'].value_counts().sort_index().to_dict()
            records_by_year = valid_df['year'].value_counts().sort_index().to_dict()

    # 5. Missing / Invalid Coordinates Analysis
    missing_latitude_count = int(df['latitude'].isna().sum() + (df['latitude'] == "").sum()) if 'latitude' in df.columns else total_records
    missing_longitude_count = int(df['longitude'].isna().sum() + (df['longitude'] == "").sum()) if 'longitude' in df.columns else total_records
    missing_coords_count = int(max(missing_latitude_count, missing_longitude_count))

    # Validate coordinate range (Chicago approximately Lat: 41.6 to 42.1, Long: -87.9 to -87.5)
    invalid_coords_count = 0
    if 'latitude' in df.columns and 'longitude' in df.columns:
        lat_numeric = pd.to_numeric(df['latitude'], errors='coerce')
        lon_numeric = pd.to_numeric(df['longitude'], errors='coerce')

        # Out-of-bounds check for Chicago area
        invalid_lat_lon = (lat_numeric.isna() & df['latitude'].notna()) | \
                          (lon_numeric.isna() & df['longitude'].notna()) | \
                          ((lat_numeric.notna()) & ((lat_numeric < 41.0) | (lat_numeric > 43.0))) | \
                          ((lon_numeric.notna()) & ((lon_numeric < -88.5) | (lon_numeric > -86.5)))
        invalid_coords_count = int(invalid_lat_lon.sum())

    # 6. Crime Categories Distribution
    crime_category_counts = {}
    if 'primary_type' in df.columns:
        crime_category_counts = df['primary_type'].value_counts().to_dict()

    # 7. Districts & Community Areas Breakdown
    district_counts = {}
    if 'district' in df.columns:
        district_counts = df['district'].value_counts().head(10).to_dict()

    community_area_counts = {}
    if 'community_area' in df.columns:
        community_area_counts = df['community_area'].value_counts().head(10).to_dict()

    # 8. Feature Support Assessment
    supported_features = [
        "Temporal Trend Analysis (Year, Month, Day, Hour, Day of Week)",
        "Spatial Hotspot Intelligence & DBSCAN Clustering (Latitude, Longitude, X/Y Coordinates)",
        "Administrative Zonal Intelligence (Police District, Community Area, Beat, Ward)",
        "Categorical Crime Distribution & IUCR Offense Taxonomy",
        "Operational Case Status Tracking (Arrest Made Flag, Domestic Incident Flag)",
        "Dimensional Star Schema Modeling (Fact_Crime, Dim_Time, Dim_Location, Dim_Category, Dim_Area)"
    ]

    unsupported_features = [
        "Victim Age (Not captured in official Chicago public crime dataset)",
        "Victim Gender (Not captured in official Chicago public crime dataset)",
        "Victim Ethnicity / Race (Not captured in official Chicago public crime dataset)",
        "Suspect Demographics (Not captured in public incident log)",
        "Explicit Weapon Details Column (Only text clues in IUCR description e.g. 'ARMED: HANDGUN')",
        "Financial Damage / Loss Amount (Not provided in incident reports)"
    ]

    # Construct Profile Data Structure
    profile_data = {
        "metadata": {
            "dataset_name": "Official Chicago Crimes - 2001 to Present (Raw Sample)",
            "source_url": "https://data.cityofchicago.org/resource/ijzp-q8t2.json",
            "profiling_timestamp": datetime.now().isoformat(),
            "target_years": "2023 - 2024"
        },
        "summary": {
            "total_records": total_records,
            "total_columns": len(columns_list),
            "duplicate_ids_count": duplicate_ids_count,
            "invalid_dates_count": invalid_dates_count,
            "missing_coordinates_count": missing_coords_count,
            "missing_coordinates_percentage": round((missing_coords_count / total_records) * 100, 2),
            "invalid_coordinates_count": invalid_coords_count,
            "distinct_crime_categories_count": len(crime_category_counts),
            "earliest_date": earliest_date_str,
            "latest_date": latest_date_str
        },
        "columns": {
            "names": columns_list,
            "missing_value_counts": missing_values,
            "missing_value_percentages": missing_pct
        },
        "temporal_breakdown": {
            "records_by_year": records_by_year,
            "records_by_year_month": records_by_year_month
        },
        "categorical_breakdown": {
            "crime_categories": crime_category_counts,
            "top_10_districts": district_counts,
            "top_10_community_areas": community_area_counts
        },
        "feature_compatibility": {
            "supported_features": supported_features,
            "unsupported_features": unsupported_features
        }
    }

    # Save dataset_profile.json
    with open(JSON_REPORT_PATH, 'w', encoding='utf-8') as f:
        json.dump(profile_data, f, indent=2)
    print(f"SUCCESS: Saved JSON profile to '{JSON_REPORT_PATH}'.")

    # Generate Markdown Report dataset_profile.md
    generate_markdown_report(profile_data)
    print(f"SUCCESS: Saved Markdown profile to '{MD_REPORT_PATH}'.")
    print("=======================================================================\n")

def generate_markdown_report(data):
    summary = data["summary"]
    cols = data["columns"]
    temp = data["temporal_breakdown"]
    cat = data["categorical_breakdown"]
    feat = data["feature_compatibility"]

    md_content = f"""# 📊 CrimeLens - Phase 2 Data Profiling Report

> **Dataset**: Official Chicago Crimes (2023–2024 Raw Sample)  
> **Source**: [City of Chicago Data Portal](https://data.cityofchicago.org/resource/ijzp-q8t2.json)  
> **Profiling Date**: {data["metadata"]["profiling_timestamp"][:10]}  

---

## 1. Executive Summary

| Metric | Value |
| :--- | :--- |
| **Total Downloaded Records** | **{summary["total_records"]:,}** |
| **Total Columns** | **{summary["total_columns"]}** |
| **Actual Date Range** | **{summary["earliest_date"]}** to **{summary["latest_date"]}** |
| **Duplicate IDs Count** | **{summary["duplicate_ids_count"]}** |
| **Invalid Dates Count** | **{summary["invalid_dates_count"]}** |
| **Missing Coordinates Count** | **{summary["missing_coordinates_count"]:,} ({summary["missing_coordinates_percentage"]}%)** |
| **Distinct Crime Categories** | **{summary["distinct_crime_categories_count"]}** |

---

## 2. Column Inventory & Missing Value Summary

| Column Name | Missing Count | Missing Percentage | Data Type | Notes |
| :--- | :---: | :---: | :--- | :--- |
"""

    for col in cols["names"]:
        m_cnt = cols["missing_value_counts"][col]
        m_pct = cols["missing_value_percentages"][col]
        md_content += f"| `{col}` | {m_cnt:,} | {m_pct}% | String | Raw string representation |\n"

    md_content += f"""
---

## 3. Temporal Distribution (Records by Year & Month)

### **Records by Year**
"""
    for y, count in temp["records_by_year"].items():
        md_content += f"- **{y}**: {count:,} records\n"

    md_content += "\n### **Monthly Breakdowns (2023–2024)**\n| Year-Month | Record Count |\n| :--- | :---: |\n"
    for ym, count in temp["records_by_year_month"].items():
        md_content += f"| `{ym}` | {count:,} |\n"

    md_content += f"""
---

## 4. Crime Category Breakdown (`primary_type`)

| Rank | Crime Category (`primary_type`) | Record Count | Percentage |
| :---: | :--- | :---: | :---: |
"""

    sorted_cats = sorted(cat["crime_categories"].items(), key=lambda x: x[1], reverse=True)
    total = summary["total_records"]
    for idx, (cat_name, count) in enumerate(sorted_cats, 1):
        pct = round((count / total) * 100, 2)
        md_content += f"| {idx} | **{cat_name}** | {count:,} | {pct}% |\n"

    md_content += f"""
---

## 5. Feature Compatibility Assessment

### ✅ **Supported CrimeLens Features**
"""
    for sf in feat["supported_features"]:
        md_content += f"- ✅ **{sf}**\n"

    md_content += f"""
### ⚠️ **Unsupported Features (Field Not Present in Official Dataset)**
"""
    for uf in feat["unsupported_features"]:
        md_content += f"- ⚠️ {uf}\n"

    md_content += """
---

## 6. Architectural Recommendations for Phase 3 (Data Warehouse)
1. **Handling Missing Coordinates**: Drop or mark records with missing coordinates (`latitude`/`longitude` is null for ~1.5–2% of records) into a special `"UNKNOWN_LOCATION"` dimension row in `Dim_Location`.
2. **Dimension Modeling**:
   - `Dim_Time`: Derive `Year`, `Month`, `Day`, `Hour`, `DayOfWeek`, `IsWeekend`, `Shift` from raw `date`.
   - `Dim_Location`: Extract `Block`, `Beat`, `District`, `Ward`, `Community_Area`, `Latitude`, `Longitude`.
   - `Dim_Category`: Model `IUCR`, `Primary_Type`, `Description`, `FBI_Code`.
   - `Fact_Crime`: Transactional fact containing `Crime_ID`, `Case_Number`, FK keys (`Time_ID`, `Location_ID`, `Category_ID`), plus boolean indicators (`Arrest_Flag`, `Domestic_Flag`).
"""

    with open(MD_REPORT_PATH, 'w', encoding='utf-8') as f:
        f.write(md_content)

if __name__ == "__main__":
    profile_dataset()
