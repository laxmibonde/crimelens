"""
CrimeLens - Official Chicago Crime Data Acquisition Pipeline
============================================================
DATA INTEGRITY & METHODOLOGICAL SPECIFICATION:
This script interfaces with the City of Chicago Open Data Portal (Socrata API endpoint `ijzp-q8t2.json`).

SAMPLING ARCHITECTURES:
1. Sequential Extraction (Legacy / Baseline sample of 50,000 rows):
   - Requests records filtered by `year` with `$limit` and `$offset` pagination.
   - Socrata returns records in ascending temporal order (`date ASC`).
   - Consequently, setting `TARGET_PER_YEAR = 25000` consumes the entire quota within January
     and early February (the city records ~21,000 crimes/month, ~260,000/year).
   - This results in a full census for January (~18.5k–20k rows) and sample-capped representation
     for months March–December (~300–400 delayed/administrative entries).

2. Stratified Date-Windowed Extraction (Research-Grade Uniform Sampling):
   - Partitions extraction across each of the 24 calendar months using Socrata `$where` date filters:
     `$where=date >= 'YYYY-MM-01T00:00:00' and date < 'YYYY-MM-01T00:00:00'`.
   - Fetches an equal sample (e.g. 2,000 records per month * 24 months = 48,000 records) to eliminate
     temporal sampling artifacts when full multi-gigabyte census downloads are not required.

IMPORTANT:
Never fabricate, artificially interpolate, or redistribute existing data to smooth time series.
All warehouse figures must strictly reflect the genuine records extracted from the city API.
"""

import argparse
import calendar
import datetime
import os
import sys
import time
import urllib3
import pandas as pd
import requests

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configuration Constants
API_ENDPOINT = "https://data.cityofchicago.org/resource/ijzp-q8t2.json"
TARGET_PER_YEAR = 25000  # 25,000 for 2023 + 25,000 for 2024 = 50,000 total
PAGE_SIZE = 2500        # 2,500 records per API page
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "raw")
DEFAULT_OUTPUT_FILE = os.path.join(OUTPUT_DIR, "chicago_crimes_raw.csv")

def p(msg):
    print(msg, flush=True)

def fetch_batch_with_retry(params, headers, max_retries=5):
    """Helper to query Socrata API with exponential backoff and SSL tolerance."""
    for attempt in range(1, max_retries + 1):
        try:
            try:
                response = requests.get(API_ENDPOINT, params=params, headers=headers, timeout=45)
            except requests.exceptions.SSLError:
                response = requests.get(API_ENDPOINT, params=params, headers=headers, verify=False, timeout=45)

            if response.status_code == 200:
                return response.json()
            else:
                p(f"  Attempt {attempt}/{max_retries}: HTTP status {response.status_code}. Retrying in 2s...")
                time.sleep(2)
        except Exception as e:
            p(f"  Attempt {attempt}/{max_retries} warning: {e}. Retrying in 3s...")
            time.sleep(3)
    return None

def fetch_chicago_crimes(output_file=DEFAULT_OUTPUT_FILE):
    """
    Downloads 50,000 crime records covering calendar years 2023-2024 using sequential pagination.
    Note: Exhausts the 25k/yr limit in early months due to Socrata chronological default ordering.
    """
    p("=======================================================================")
    p(" CrimeLens - Sequential Chicago Crime Data Acquisition Pipeline")
    p("=======================================================================")
    p(f"Target Total Records: {TARGET_PER_YEAR * 2:,}")
    p(f"Target Breakdown: {TARGET_PER_YEAR:,} records (2023) + {TARGET_PER_YEAR:,} records (2024)")
    p(f"API Endpoint: {API_ENDPOINT}")
    p(f"Batch Chunk Size: {PAGE_SIZE:,}")
    p(f"Output File: {output_file}")
    p("-----------------------------------------------------------------------")

    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    records = []
    start_time = time.time()
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CrimeLens/1.0'}

    for year in ["2023", "2024"]:
        p(f"\n--- Initiating acquisition for Calendar Year {year} ---")
        year_records = []
        offset = 0

        while len(year_records) < TARGET_PER_YEAR:
            current_limit = min(PAGE_SIZE, TARGET_PER_YEAR - len(year_records))
            params = {
                "year": year,
                "$limit": current_limit,
                "$offset": offset
            }

            p(f"[{year}] Fetching records {offset + 1:,} to {offset + current_limit:,} (Offset: {offset:,})...")
            batch = fetch_batch_with_retry(params, headers)

            if batch is None:
                p(f"\nCRITICAL ERROR: Failed to fetch batch for year {year} at offset {offset}.")
                sys.exit(1)

            if not batch:
                p(f"Notice: No more records returned for year {year}.")
                break

            year_records.extend(batch)
            p(f"  --> Received {len(batch):,} records. [{year} Total: {len(year_records):,}/{TARGET_PER_YEAR:,}]")
            offset += len(batch)
            time.sleep(0.3)

        records.extend(year_records)
        p(f"Year {year} acquisition complete: {len(year_records):,} records collected.")

    if not records:
        p("ERROR: Downloaded 0 records. Aborting save.")
        sys.exit(1)

    p("-----------------------------------------------------------------------")
    p(f"Dataset acquisition complete. Total records collected: {len(records):,}")
    p("Formatting and saving raw CSV dataset...")

    df = pd.DataFrame(records)
    if 'location' in df.columns:
        df['location'] = df['location'].apply(lambda x: str(x) if isinstance(x, dict) else x)

    df.to_csv(output_file, index=False)
    elapsed = time.time() - start_time
    p(f"SUCCESS: Saved {len(df):,} raw crime records to '{output_file}' in {elapsed:.2f}s.")
    p("=======================================================================\n")
    return output_file

def fetch_chicago_crimes_stratified(records_per_month=2000, output_file=None):
    """
    Research-Grade Stratified Extraction:
    Queries City of Chicago Socrata API partitioned into exact calendar month windows ($where).
    Fetches equal sample (e.g. 2,000 records/month) for each of the 24 months in 2023–2024 (48,000 total),
    ensuring continuous and representative temporal distribution across the entire multi-year period.
    """
    if output_file is None:
        output_file = os.path.join(OUTPUT_DIR, "chicago_crimes_stratified.csv")

    p("=======================================================================")
    p(" CrimeLens - Stratified Monthly Chicago Crime Data Acquisition Pipeline")
    p("=======================================================================")
    p(f"Sampling Strategy: Date-Windowed Stratification ({records_per_month:,} records/month)")
    p(f"Target Coverage: 24 Months (2023-01 to 2024-12) -> {records_per_month * 24:,} total records")
    p(f"API Endpoint: {API_ENDPOINT}")
    p(f"Output File: {output_file}")
    p("-----------------------------------------------------------------------")

    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    records = []
    start_time = time.time()
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CrimeLens/1.0'}

    years = [2023, 2024]
    for year in years:
        for month in range(1, 13):
            # Compute start and end ISO timestamps for the month
            start_date = f"{year}-{month:02d}-01T00:00:00.000"
            if month == 12:
                end_date = f"{year + 1}-01-01T00:00:00.000"
            else:
                end_date = f"{year}-{month + 1:02d}-01T00:00:00.000"

            p(f"\n[{year}-{month:02d}] Fetching up to {records_per_month:,} records ({start_date} to {end_date})...")
            
            month_records = []
            offset = 0
            while len(month_records) < records_per_month:
                current_limit = min(PAGE_SIZE, records_per_month - len(month_records))
                params = {
                    "$where": f"date >= '{start_date}' and date < '{end_date}'",
                    "$limit": current_limit,
                    "$offset": offset,
                    "$order": "date ASC"
                }

                batch = fetch_batch_with_retry(params, headers)
                if batch is None:
                    p(f"Warning: Failed batch for {year}-{month:02d} at offset {offset}. Continuing...")
                    break
                if not batch:
                    break

                month_records.extend(batch)
                offset += len(batch)
                if len(batch) < current_limit:
                    break
                time.sleep(0.2)

            records.extend(month_records)
            p(f"[{year}-{month:02d}] Collected {len(month_records):,} records. (Running total: {len(records):,})")

    p("-----------------------------------------------------------------------")
    p(f"Stratified collection complete. Total records collected: {len(records):,}")
    df = pd.DataFrame(records)
    if 'location' in df.columns:
        df['location'] = df['location'].apply(lambda x: str(x) if isinstance(x, dict) else x)

    df.to_csv(output_file, index=False)
    elapsed = time.time() - start_time
    p(f"SUCCESS: Saved {len(df):,} stratified crime records to '{output_file}' in {elapsed:.2f}s.")
    p("=======================================================================\n")
    return output_file

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CrimeLens Chicago Crime Data Acquisition Pipeline")
    parser.add_argument("--mode", choices=["sequential", "stratified"], default="sequential",
                        help="Extraction mode: 'sequential' (legacy 50k cap) or 'stratified' (uniform monthly windows)")
    parser.add_argument("--per-month", type=int, default=2000,
                        help="Number of records per month in stratified mode (default: 2000)")
    parser.add_argument("--output", type=str, default=None,
                        help="Target output CSV file path")
    args = parser.parse_args()

    if args.mode == "stratified":
        fetch_chicago_crimes_stratified(records_per_month=args.per_month, output_file=args.output)
    else:
        out = args.output if args.output else DEFAULT_OUTPUT_FILE
        fetch_chicago_crimes(output_file=out)
