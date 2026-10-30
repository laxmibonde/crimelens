# CrimeLens Section 4: Trend Analysis Accuracy & Correctness Audit Report

**Audit Date:** October 29, 2026  
**Auditor:** CrimeLens System Integrity & Advanced Analytics Auditor  
**Module Audited:** Section 4 — Trend Analysis & Temporal Intelligence (`/trends`, `/trend-analysis`)  
**Warehouse Census Scope:** 761,718 recorded crime incidents across 36 calendar months (January 1, 2023 – December 31, 2025)  
**Status:** **PASSED** (100% mathematical precision verified against PostgreSQL 18.4)

---

## Executive Summary

A comprehensive accuracy audit and remediation was performed on **Section 4: Trend Analysis & Temporal Intelligence**. Prior to this audit, several components contained legacy assumptions from earlier 2-year (2023–2024) and 50k-sample iterations, rolling averages were incorrectly applied to non-sequential weekday categories, custom period comparisons failed to account for duration disparities, the 7×24 temporal matrix lacked an intuitive density legend, and peak midnight timestamps lacked criminological context regarding administrative default recording.

All mathematical queries, rolling window formulas, period comparison statistics, temporal matrix cells, and seasonality indicators have been audited directly against PostgreSQL 18.4 census data, verified in headless browser automation via Microsoft Edge (Playwright), and confirmed in production build compilation (`npm run build`).

---

## 1. SQL Ground-Truth Verification

Every claim, KPI card, and chart aggregation was validated against `public.fact_crime` and its star schema dimensions (`dim_time`, `dim_area`, `dim_crime`, `dim_status`):

| Metric / Aggregation Target | Expected Specification | PostgreSQL 18.4 Execution Result | Status |
| :--- | :--- | :--- | :--- |
| **All Districts, Monthly Trajectory** | 761,718 incidents across 36 months | `(761718, 36 distinct months: 2023-01 to 2025-12)` | **PASS** |
| **District 005, Quarterly Aggregation** | 30,100 incidents across 12 quarters | `(30100, 12 distinct quarters: 2023 Q1 to 2025 Q4)` | **PASS** |
| **District 008, Day-of-Week Aggregation** | 49,624 incidents across 7 weekdays | `(49624, 7 distinct days: Mon–Sun)` | **PASS** |
| **Peak Monthly Incident Count** | August 2023, 24,283 incidents | `2023-08: 24,283 incidents` (Followed by `2024-07: 24,151`) | **PASS** |
| **Weekday Share (District 005)** | 71.97% (21,663 / 30,100) | `71.97% weekday, 28.03% weekend (8,437 / 30,100)` | **PASS** |
| **Weekday Share (Full Census)** | 71.19% (542,293 / 761,718) | `71.19% weekday, 28.81% weekend (219,425 / 761,718)` | **PASS** |
| **Peak Diurnal Hour (Hour 00:00)** | 54,285 occurrences (Full Census) | `Hour 00:00: 54,285 incidents` | **PASS** |
| **Nighttime Concentration (22:00–06:00)** | 214,801 occurrences (Full Census) | `214,801 of 761,718 incidents (28.20%)` | **PASS** |
| **7×24 Temporal Matrix Cells** | 168 cells, sum = selected volume | `168 cells, Full Census Sum = 761,718; Dist 005 Sum = 30,100` | **PASS** |
| **Period Comparison Screenshot Values** | Period A = 841, Period B = 1,351, Diff = +510, Rel = +60.64% | Exact formula verified: `(1351 - 841) = +510; (510 / 841)*100 = +60.64%` | **PASS** |

---

## 2. Issue Resolutions & Code Enhancements

### Task 1 — Outdated Data Descriptions Corrected
* **Problem:** Backend docstrings, error notes, API explanations, and frontend text claimed the dataset spanned only 2023–2024 (2 years) with sampling concentration warnings from an obsolete 50k subset.
* **Resolution:** 
  - Updated all time metadata bounds to reflect the complete 3-year census (`2023-01-01` to `2025-12-31`, 36 months).
  - Expanded `month_comparison` in `get_seasonality_analysis` to include all three years (`year_2023`, `year_2024`, `year_2025`).
  - Replaced absolute statements claiming STL decomposition is impossible with nuanced academic guidance: explained that while 3 annual cycles provide preliminary recurring periodicity, classical statistical STL decomposition ideally benefits from 5+ annual cycles to isolate secular shifts from true recurring seasonality.

### Task 2 — Trend Aggregation Integrity
* **Problem:** Ensuring all temporal group-by rollups maintain chronological order and accurate averages.
* **Resolution:** Verified SQL expressions for `month` (`ORDER BY t.year, t.month`), `quarter` (`ORDER BY t.year, t.quarter`), `week` (`ORDER BY t.year, DATE_TRUNC('week', t.full_date)`), `year` (`ORDER BY t.year`), `day_of_week` (`ORDER BY t.day_of_week`), and `hour` (`ORDER BY t.hour`). All 36 months, 12 quarters, and 7 days are complete without missing intervals.

### Task 3 — Moving-Average Behavior & Continuous Series Validation
* **Problem:** Moving averages (MA-3, MA-6) were previously computed across categorical, non-sequential buckets (e.g., rolling means between Sunday and Monday, or connecting non-consecutive days of the week).
* **Resolution:**
  - Restructured `get_timeseries_analysis` so moving averages are **strictly calculated only for chronologically sequential series** (`week`, `month`, `quarter`, `year`).
  - For categorical groupings (`day_of_week`, `hour`), MA lines are suppressed (`ma3 = None`, `ma6 = None`).
  - Documented treatment of initial window periods: `min_periods=1` is utilized for initial timeline steps (periods 1–2 for MA-3, periods 1–5 for MA-6) to render partial-window expanding means rather than disruptive empty nulls.
  - In frontend `TrendAnalysisPage.jsx`, conditionally disabled the MA legend and SVG line rendering when granularity is `day_of_week` or `hour`, adding an informative subtitle.

### Task 4 — Custom Period Comparison & Daily Rate Velocity
* **Problem:** Comparing periods with different durations (e.g. 15 days vs. 31 days) produced misleading percentage changes (such as +60.64%) driven purely by calendar duration rather than actual crime rate changes.
* **Resolution:**
  - Enhanced `compare_periods` to calculate calendar days using Python `datetime`: `days = max(1, (end_date - start_date).days + 1)` (accurately handling leap years such as Feb 29, 2024).
  - Added daily incident velocity metrics: `daily_rate_a = total / days_a`, `daily_rate_b = total / days_b`, `daily_rate_diff`, and `daily_rate_pct_change`.
  - Added an automated **Duration Disparity Warning** banner when `days_a != days_b` advising users to inspect normalized daily velocity instead of raw count totals.
  - Displayed 6 clear metric cards distinguishing total count change from daily rate change.

### Task 5 — 7×24 Temporal Matrix & Density Legend
* **Problem:** Heatmap lacked a color legend explaining what colors represented.
* **Resolution:**
  - Validated all 168 cells in PostgreSQL (Monday–Sunday rows, hours 00–23 columns).
  - Added a compact 5-tier color scale legend at the bottom right of the matrix (`<20%` lowest, `20–40%`, `40–60%`, `60–80%`, and `>80%` peak).
  - Maintained interactive toggle between Raw Counts and Normalized Share (%).

### Task 6 — Seasonality, Diurnal Peak & Neutral Evidence Insights
* **Problem:** Insights lacked dynamic district filter awareness, and midnight peaks were previously presented without criminological reporting context.
* **Resolution:**
  - Updated `/api/trends/insights` and `generate_temporal_insights` to accept active `district` filtering.
  - Added explicit scope badges (`District #005` vs `Full Warehouse Census (761,718 incidents, 2023–2025)`).
  - Neutralized language: replaced subjective phrases like "highest crime risk" with evidence-based terms like "highest recorded frequency".
  - Documented municipal police reporting practice: noted that hour 00:00 (54,285 occurrences) commonly reflects administrative default timestamps for unobserved incident times alongside genuine nighttime events.
  - Added a 4th insight: Weekday vs Weekend operational load share (accounting for 71.19% weekday / 28.81% weekend citywide, and 71.97% / 28.03% in District 005).

---

## 3. Files Modified

1. **`backend/services/trend_analysis_service.py`**
   - Corrected fallback max date to `2025-12-31`.
   - Disabled rolling averages for non-continuous granularities (`day_of_week`, `hour`).
   - Implemented calendar day duration, daily rates, and duration disparity warnings in `compare_periods`.
   - Added `year_2025` extraction to `monthly_year_over_year` in `get_seasonality_analysis`.
   - Updated seasonality confidence notes to explain the 3-year (36-month) warehouse horizon.
   - Refactored `generate_temporal_insights` with district filtering, scope labels, responsible midnight reporting caveats, and weekday/weekend load insights.

2. **`backend/routers/trend_analysis.py`**
   - Extended `/api/trends/insights` to accept `district: Optional[int] = Query(None)`.
   - Updated academic explanation concepts in `/api/trends/explain` for 3-year census scope and daily velocity normalization.

3. **`frontend/src/services/api.js`**
   - Updated `fetchTrendsInsights` to accept and forward the active `district` parameter.

4. **`frontend/src/pages/TrendAnalysisPage.jsx`**
   - Wrapped independent trend analytics requests in `Promise.all` to eliminate sequential waterfall delays.
   - Conditionally hid MA-3 and MA-6 lines and updated subtitles for categorical time groupings.
   - Added compact color scale legend to the 7×24 Temporal Matrix.
   - Added 6 metric cards and duration disparity warning to Custom Period Comparison.
   - Added 36-month Year-over-Year monthly comparison chart (2023 vs 2024 vs 2025).
   - Displayed scope badges on automated insight cards.

---

## 4. Test & Verification Evidence

1. **PostgreSQL 18.4 Star Schema Direct Checks:**
   - Census total: 761,718 incidents across 36 months (100% complete).
   - District 005 quarterly rollup: 30,100 incidents across 12 quarters (100% complete).
   - District 008 day of week rollup: 49,624 incidents across 7 days (100% complete).
   - Seasonality weekday vs weekend: District 005 = 71.97% / 28.03%; Full Census = 71.19% / 28.81%.
   - Temporal matrix: 168 cells, sum exactly matches selected dataset volume.

2. **Frontend Production Build:**
   - Executed: `npm run build`
   - Result: `✓ built in 12.77s` with 0 errors.

3. **Automated Playwright Browser Suite (Microsoft Edge):**
   - Initial load: Verified 761,718 incidents across 36 months.
   - Granularity switch: Verified Day of Week mode hides rolling average lines.
   - District #008 Day of Week: Verified 49,624 incidents across 7 weekdays.
   - District #005 Quarterly: Verified 30,100 incidents across 12 quarters, 71.97% weekday, 28.03% weekend.
   - Custom Period Comparison: Verified duration disparity warning on unequal date selections.
   - Reset Filters: Restored initial full census view (761,718 incidents).
   - Console logs: **0 console errors**.

---

## 5. PASS / WARN / FAIL Audit Results

| Audit Criteria | Expected Standard | Audit Result | Status |
| :--- | :--- | :--- | :--- |
| **Data Scope Accuracy** | 2023–2025 (36 months, 761,718 incidents) | All endpoints and UI components reflect 3-year census | **PASS** |
| **Moving Average Correctness** | Computed only on continuous chronological series | Suppressed on categorical day-of-week and hour views | **PASS** |
| **Custom Period Comparison** | Calendar days, daily rates, unequal duration warning | Days and daily velocity displayed; warning triggered on duration disparity | **PASS** |
| **Temporal Matrix** | 168 cells, Mon–Sun order, color legend | Validated 168 cells in PostgreSQL; legend rendered | **PASS** |
| **Seasonality & Diurnal Insights** | Exact DB shares, scope transparency, neutral language | Scoped to District 005 (71.97%) or Full Census (71.19%), midnight caveat documented | **PASS** |
| **UI Polish & Theme Integrity** | Chicago Nightfall dark theme preserved | Contrast, responsive grids, and alignment preserved | **PASS** |
| **Console & Build Health** | 0 build errors, 0 runtime console errors | `npm run build` passed in 12.77s; 0 browser console errors | **PASS** |

---

## 6. Remaining Limitations & Boundaries

1. **Short Historical Horizon for STL Decomposition:** While the 3-year census (36 monthly points) allows solid empirical year-over-year observation, formal statistical Loess seasonal extraction (STL) generally requires 5+ years of continuous history to reliably decouple secular multi-year trends from genuine monthly seasonal coefficients.
2. **Midnight Reporting Artifacts:** In municipal incident data, unobserved crime discovery times (e.g. thefts and burglaries reported hours later) are frequently recorded at 00:00 by reporting officers, resulting in a spike that reflects administrative recording practices rather than immediate street-level peak occurrence.

---

**AUDIT CONCLUSION:** Section 4: Trend Analysis & Temporal Intelligence is fully verified, mathematically accurate, and aligned with all user requirements.

*(Audit completed. Stopping execution; Section 5 will not be touched without explicit user instruction.)*
