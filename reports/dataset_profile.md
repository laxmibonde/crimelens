# 📊 CrimeLens - Phase 2 Data Profiling Report

> **Dataset**: Official Chicago Crimes (2023–2024 Raw Sample)  
> **Source**: [City of Chicago Data Portal](https://data.cityofchicago.org/resource/ijzp-q8t2.json)  
> **Profiling Date**: 2026-10-08  

---

## 1. Executive Summary

| Metric | Value |
| :--- | :--- |
| **Total Downloaded Records** | **50,000** |
| **Total Columns** | **22** |
| **Actual Date Range** | **2023-01-01 00:00:00** to **2024-12-31 21:55:00** |
| **Duplicate IDs Count** | **19** |
| **Invalid Dates Count** | **0** |
| **Missing Coordinates Count** | **4,734 (9.47%)** |
| **Distinct Crime Categories** | **28** |

---

## 2. Column Inventory & Missing Value Summary

| Column Name | Missing Count | Missing Percentage | Data Type | Notes |
| :--- | :---: | :---: | :--- | :--- |
| `id` | 0 | 0.0% | String | Raw string representation |
| `case_number` | 0 | 0.0% | String | Raw string representation |
| `date` | 0 | 0.0% | String | Raw string representation |
| `block` | 0 | 0.0% | String | Raw string representation |
| `iucr` | 0 | 0.0% | String | Raw string representation |
| `primary_type` | 0 | 0.0% | String | Raw string representation |
| `description` | 0 | 0.0% | String | Raw string representation |
| `location_description` | 486 | 0.97% | String | Raw string representation |
| `arrest` | 0 | 0.0% | String | Raw string representation |
| `domestic` | 0 | 0.0% | String | Raw string representation |
| `beat` | 0 | 0.0% | String | Raw string representation |
| `district` | 0 | 0.0% | String | Raw string representation |
| `ward` | 0 | 0.0% | String | Raw string representation |
| `community_area` | 2 | 0.0% | String | Raw string representation |
| `fbi_code` | 0 | 0.0% | String | Raw string representation |
| `year` | 0 | 0.0% | String | Raw string representation |
| `updated_on` | 0 | 0.0% | String | Raw string representation |
| `x_coordinate` | 4,734 | 9.47% | String | Raw string representation |
| `y_coordinate` | 4,734 | 9.47% | String | Raw string representation |
| `latitude` | 4,734 | 9.47% | String | Raw string representation |
| `longitude` | 4,734 | 9.47% | String | Raw string representation |
| `location` | 4,734 | 9.47% | String | Raw string representation |

---

## 3. Temporal Distribution (Records by Year & Month)

### **Records by Year**
- **2023**: 25,000 records
- **2024**: 25,000 records

### **Monthly Breakdowns (2023–2024)**
| Year-Month | Record Count |
| :--- | :---: |
| `2023-01` | 19,917 |
| `2023-02` | 685 |
| `2023-03` | 392 |
| `2023-04` | 394 |
| `2023-05` | 415 |
| `2023-06` | 381 |
| `2023-07` | 376 |
| `2023-08` | 400 |
| `2023-09` | 332 |
| `2023-10` | 342 |
| `2023-11` | 347 |
| `2023-12` | 1,019 |
| `2024-01` | 18,539 |
| `2024-02` | 2,264 |
| `2024-03` | 328 |
| `2024-04` | 424 |
| `2024-05` | 1,058 |
| `2024-06` | 361 |
| `2024-07` | 373 |
| `2024-08` | 388 |
| `2024-09` | 334 |
| `2024-10` | 319 |
| `2024-11` | 297 |
| `2024-12` | 315 |

---

## 4. Crime Category Breakdown (`primary_type`)

| Rank | Crime Category (`primary_type`) | Record Count | Percentage |
| :---: | :--- | :---: | :---: |
| 1 | **THEFT** | 10,183 | 20.37% |
| 2 | **BATTERY** | 8,181 | 16.36% |
| 3 | **CRIMINAL DAMAGE** | 5,379 | 10.76% |
| 4 | **MOTOR VEHICLE THEFT** | 5,299 | 10.6% |
| 5 | **ASSAULT** | 4,239 | 8.48% |
| 6 | **DECEPTIVE PRACTICE** | 3,717 | 7.43% |
| 7 | **OTHER OFFENSE** | 3,320 | 6.64% |
| 8 | **ROBBERY** | 1,934 | 3.87% |
| 9 | **WEAPONS VIOLATION** | 1,626 | 3.25% |
| 10 | **NARCOTICS** | 1,476 | 2.95% |
| 11 | **BURGLARY** | 1,464 | 2.93% |
| 12 | **CRIMINAL TRESPASS** | 925 | 1.85% |
| 13 | **CRIMINAL SEXUAL ASSAULT** | 621 | 1.24% |
| 14 | **OFFENSE INVOLVING CHILDREN** | 584 | 1.17% |
| 15 | **SEX OFFENSE** | 346 | 0.69% |
| 16 | **PUBLIC PEACE VIOLATION** | 123 | 0.25% |
| 17 | **INTERFERENCE WITH PUBLIC OFFICER** | 106 | 0.21% |
| 18 | **ARSON** | 104 | 0.21% |
| 19 | **STALKING** | 100 | 0.2% |
| 20 | **PROSTITUTION** | 92 | 0.18% |
| 21 | **INTIMIDATION** | 55 | 0.11% |
| 22 | **CONCEALED CARRY LICENSE VIOLATION** | 37 | 0.07% |
| 23 | **LIQUOR LAW VIOLATION** | 32 | 0.06% |
| 24 | **KIDNAPPING** | 18 | 0.04% |
| 25 | **HOMICIDE** | 16 | 0.03% |
| 26 | **HUMAN TRAFFICKING** | 12 | 0.02% |
| 27 | **OBSCENITY** | 10 | 0.02% |
| 28 | **GAMBLING** | 1 | 0.0% |

---

## 5. Feature Compatibility Assessment

### ✅ **Supported CrimeLens Features**
- ✅ **Temporal Trend Analysis (Year, Month, Day, Hour, Day of Week)**
- ✅ **Spatial Hotspot Intelligence & DBSCAN Clustering (Latitude, Longitude, X/Y Coordinates)**
- ✅ **Administrative Zonal Intelligence (Police District, Community Area, Beat, Ward)**
- ✅ **Categorical Crime Distribution & IUCR Offense Taxonomy**
- ✅ **Operational Case Status Tracking (Arrest Made Flag, Domestic Incident Flag)**
- ✅ **Dimensional Star Schema Modeling (Fact_Crime, Dim_Time, Dim_Location, Dim_Category, Dim_Area)**

### ⚠️ **Unsupported Features (Field Not Present in Official Dataset)**
- ⚠️ Victim Age (Not captured in official Chicago public crime dataset)
- ⚠️ Victim Gender (Not captured in official Chicago public crime dataset)
- ⚠️ Victim Ethnicity / Race (Not captured in official Chicago public crime dataset)
- ⚠️ Suspect Demographics (Not captured in public incident log)
- ⚠️ Explicit Weapon Details Column (Only text clues in IUCR description e.g. 'ARMED: HANDGUN')
- ⚠️ Financial Damage / Loss Amount (Not provided in incident reports)

---

## 6. Architectural Recommendations for Phase 3 (Data Warehouse)
1. **Handling Missing Coordinates**: Drop or mark records with missing coordinates (`latitude`/`longitude` is null for ~1.5–2% of records) into a special `"UNKNOWN_LOCATION"` dimension row in `Dim_Location`.
2. **Dimension Modeling**:
   - `Dim_Time`: Derive `Year`, `Month`, `Day`, `Hour`, `DayOfWeek`, `IsWeekend`, `Shift` from raw `date`.
   - `Dim_Location`: Extract `Block`, `Beat`, `District`, `Ward`, `Community_Area`, `Latitude`, `Longitude`.
   - `Dim_Category`: Model `IUCR`, `Primary_Type`, `Description`, `FBI_Code`.
   - `Fact_Crime`: Transactional fact containing `Crime_ID`, `Case_Number`, FK keys (`Time_ID`, `Location_ID`, `Category_ID`), plus boolean indicators (`Arrest_Flag`, `Domestic_Flag`).
