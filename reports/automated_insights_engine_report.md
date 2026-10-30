# CrimeLens — Phase 15 Report: Automated Data-Driven Insights & Intelligence Summary Engine

## 1. Objective
The objective of Phase 15 is to build a centralized, deterministic **Automated Data-Driven Insights & Intelligence Summary Engine** within CrimeLens (`backend/services/insights_service.py` and `backend/routers/insights.py`). The engine converts verified outputs from all nine Data Warehousing & Mining (DWM) modules—Dashboard Analytics, OLAP Cubes, DBSCAN Hotspots, Hotspot Evolution, K-Means Clustering, Apriori Association Rules, Decision Tree Classification, Area Intelligence, Trend Analysis, and What Changed?—into structured, evidence-based observations.

---

## 2. Architecture & Data Warehouse Integration
The engine acts as an analytical synthesis layer on top of PostgreSQL 18 star schemas (`public` for real data, `synthetic_data` for synthetic demo data).

```
               [Centralized Insights Engine]
                             │
     ┌───────────────────────┼───────────────────────┐
     ▼                       ▼                       ▼
┌──────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ OLAP & Trends│    │ Spatial Hotspots│    │ Machine Learning│
│  - Dashboard │    │  - DBSCAN       │    │  - K-Means      │
│  - OLAP Cubes│    │  - Evolution    │    │  - Apriori      │
│  - Trends    │    │  - What Changed?│    │  - Decision Tree│
└──────────────┘    └─────────────────┘    └─────────────────┘
     │                       │                       │
     └───────────────────────┼───────────────────────┘
                             ▼
              [Deduplication & Prioritization]
                             │
                             ▼
               [Structured Insight Payload]
               - Id, Title, Explanation
               - Metrics (Numerators/Denominators)
               - Score (1-100), Reliability Notes
               - Direct Source Module Link
```

---

## 3. Mathematical & Prioritization Methodology

### A. Deterministic Rule-Based Generation
Insights are generated using mathematical templates applied directly to backend service outputs without generative AI models or hallucinations:
$$\text{Insight} = f(\mathbf{X}_{\text{module}}, \text{Filter}, \text{Dataset})$$

### B. Analytical Prioritization Scoring Formula
Insights are assigned a transparent analytical relevance score $S \in [1, 100]$:
$$S = \min\left(100, \, \max\left(1, \, \text{round}\left(40 \cdot M + 35 \cdot L_N + 25 \cdot C - P_{\text{reliability}}\right)\right)\right)$$
where:
- $M = \text{min}(1.0, \text{max}(0.0, \text{Effect Magnitude}))$ (e.g. share percentage, lift factor, accuracy delta)
- $L_N = \text{min}\left(1.0, \frac{\log_{10}(\max(10, N))}{4.5}\right)$ (Normalized sample size contribution)
- $C = \text{Data Completeness Ratio} \in [0.0, 1.0]$
- $P_{\text{reliability}} = \text{Subtractive Reliability Penalty}$ (e.g. 15 points for historical sampling concentration or small sample sizes)

### C. Quality Filtering & Deduplication
- Minimum sample size threshold: $N \ge 10$ incidents.
- Minimum composition shift: $\Delta\text{pp} \ge 1.0$ percentage points.
- Minimum association rule metrics: $\text{support} \ge 0.05$, $\text{confidence} \ge 0.50$, $\text{lift} > 1.1$.
- Deduplication: Contradictory or redundant findings across modules are filtered out.
- Deterministic Ordering: Insights sorted by score $S$ descending.

---

## 4. Analytical Categories & Module Coverage

| Domain | Source Module | Example Insight | Target Route |
| :--- | :--- | :--- | :--- |
| **Crime Composition** | Dashboard Analytics | Dominant category shares & Shannon Entropy diversity | `/dashboard` |
| **Temporal Pattern** | Trend Analysis | Peak diurnal incident hours & nighttime shares | `/trend-analysis` |
| **Area Intelligence** | Area Intelligence | Highest volume Police Districts & district composition | `/area-intelligence` |
| **DBSCAN Spatial** | DBSCAN Hotspots | Density cluster counts & clustered vs noise shares | `/hotspots` |
| **Hotspot Evolution** | Hotspot Evolution | Persistent, newly emerged, and dissolved hotspots | `/evolution` |
| **K-Means Clustering** | K-Means Area Segment | Area segmentations & similar district profiles | `/kmeans` |
| **Apriori Association**| Association Mining | High-lift antecedent $\rightarrow$ consequent co-occurrences | `/apriori` |
| **Decision Tree** | Classification Tree | Arrest predictability, baseline accuracy & recall | `/decision-tree` |
| **Change Comparison** | What Changed? Engine | $Period_A$ vs $Period_B$ count deltas & $\Delta\text{pp}$ shifts | `/what-changed` |

---

## 5. Real vs. Synthetic Generated Insights Comparison

### Real Dataset (`public.fact_crime`, 49,981 incidents)
1. **[INS_DBSCAN_01] Spatial Hotspot Density (Score: 99/100)**:
   - *Explanation*: DBSCAN clustering (eps=300m, min_samples=15) identified 63 spatial density clusters, accounting for 36.37% (16,323) of spatially eligible incidents.
   - *Route*: `/hotspots`
2. **[INS_COMP_01] Dominant Crime Category: THEFT (Score: 88/100)**:
   - *Explanation*: THEFT accounts for 19.82% of dataset incidents (9,907 records out of 49,981 total).
   - *Route*: `/dashboard`
3. **[INS_DT_01] Arrest Predictability: 88.4% Accuracy (Score: 85/100)**:
   - *Explanation*: Decision Tree classifier achieved 88.4% accuracy predicting arrest status, outperforming majority baseline (87.2%).
   - *Route*: `/decision-tree`
4. **[INS_APRIORI_01] Strong Association Rule (Score: 78/100)**:
   - *Explanation*: When {Location=STREET, Time=NIGHT} occurs, {PrimaryType=THEFT} is present in 54.2% of transactions (Lift = 1.62).
   - *Route*: `/apriori`

### Synthetic Dataset (`synthetic_data.fact_crime`, 30,000 incidents)
- **Top Insight**: DBSCAN spatial density & uniform temporal distribution insights tagged with **SIMULATED DATASET** disclaimers.

---

## 6. RESTful API Endpoints Implemented

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/insights/metadata` | `GET` | Returns available filter bounds, categories, and supported domains. |
| `/api/insights/generate` | `POST` | Generates validated insight cards and executive summary. |
| `/api/insights/summary` | `POST` | Generates executive narrative paragraph and top 3 insights. |
| `/api/insights/by-category` | `POST` | Groups generated insights by analytical domain. |
| `/api/insights/explain` | `GET` | Returns academic explanations of rule-based generation and scoring. |

---

## 7. Automated Test Results
Running `scratch/test_insights_validation.py` passed **7/7 tests (100% success)**:

```
--- 1. DATABASE RECORD COUNT INTEGRITY ---
Public Schema (Real Data) Incident Count: 49981
Synthetic Schema (Synthetic Data) Incident Count: 30000
[OK] Warehouse record counts verified.

--- 2. METADATA RETRIEVAL ---
Insight Categories Supported: 9
[OK] Metadata retrieval verified.

--- 3. INSIGHT GENERATION & METRIC RECONCILIATION ---
Generated Insight Count: 9
Top Insight: [INS_DBSCAN_01] Spatial Hotspot Density: 63 Clusters Identified (Score: 99)
[OK] Insight metrics reconciliation verified.

--- 4. PRIORITIZATION SCORING FORMULA ---
High-Impact Score: 88/100 | Low-Impact Score: 4/100
[OK] Prioritization scoring formula verified.

--- 5. EXECUTIVE NARRATIVE SUMMARY ---
Narrative Preview:
AUTOMATED EVIDENCE SUMMARY: 
- Spatial Hotspot Density: 63 Clusters Identified: DBSCAN clustering...
[OK] Executive narrative generation verified.

--- 6. FASTAPI INSIGHTS ENDPOINTS ---
[OK] All 5 insights engine API endpoints returned HTTP 200.

--- 7. REGRESSION TESTING (PHASES 1 TO 14) ---
[OK] All prior phase endpoints function perfectly.
```

---

## 8. Frontend Build Status
- Production bundle compiled with `npm run build` in **22.13s** with **zero errors**.

---

## 9. Data Warehousing & Mining (DWM) Concepts Demonstrated
1. **Analytical Synthesis & Meta-Mining**: Synthesizing observations across multiple data mining outputs (clustering, association rules, decision trees, time series roll-ups) into a unified narrative.
2. **Evidence Traceability & Lineage**: Maintaining complete data lineage from data warehouse facts/dimensions to derived metrics, scoring algorithms, and user-facing UI routes.
3. **Deterministic Score Prioritization**: Ranking insights objectively using multi-factor analytical scoring rather than arbitrary heuristics.
4. **Association vs. Causation Guardrails**: Explicitly enforcing statistical limitations on association rules and machine learning predictions.

---

## 10. Viva Questions & Answers

**Q1: Why is a deterministic rule-based engine preferred over a generative LLM for CrimeLens insights?**
*Answer*: Deterministic rule-based templates guarantee 100% mathematical precision and reproducibility, eliminating LLM hallucinations, fabricated statistics, or unverified causal claims.

**Q2: How does the prioritization scoring formula rank insights?**
*Answer*: The formula scores insights on a 1–100 scale using effect magnitude (40%), log-sample size (35%), data completeness (25%), and subtractive penalties for historical sampling concentration or small sample sizes.

**Q3: What reliability note is attached to Apriori association insights?**
*Answer*: All Apriori insights explicitly state: *"ASSOCIATION DOES NOT IMPLY CAUSATION. The rule represents historical co-occurrence in dataset transactions."*

---

## 11. Audit Items Preserved for Phase 20
The following pre-existing audit items remain recorded for Phase 20 inspection:
1. Phase 9 K-Means silhouette & K recommendations.
2. Phase 10 Apriori itemset/rule counts.
3. Phase 11 Decision Tree confusion matrix & recall metrics.
4. Phase 12 Area Intelligence percentage/district counts.
5. Phase 13 exact synthetic monthly count documentation.
6. Phase 14 hotspot matching reconciliation.
