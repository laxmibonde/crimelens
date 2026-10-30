# CRIMELENS — PHASE 9: K-MEANS AREA CLUSTERING & CRIME PATTERN SEGMENTATION REPORT

## 1. Executive Summary
**CrimeLens Phase 9** introduces an interactive **K-Means Area Clustering & Crime Pattern Segmentation** module. Distinct from Phase 7/8 spatial density clustering (DBSCAN), Phase 9 performs multi-dimensional pattern segmentation on aggregated geographic **AREAS** (Police Districts & Community Areas) using historical crime profiles.

The backend feature engine aggregates warehouse records from `public.fact_crime` (49,981 real incidents) and `synthetic_data.fact_crime` (30,000 synthetic incidents) into normalized multi-variate feature vectors per area, applies `scikit-learn` `StandardScaler`, performs deterministic `KMeans` clustering ($random\_state=42$), projects high-dimensional feature vectors into 2D visual space via **Principal Component Analysis (PCA)**, and provides automated **Elbow Method** and **Silhouette Score** optimization.

---

## 2. Scientific & Architectural Differentiation: K-Means vs. DBSCAN

| Metric / Dimension | Phase 7/8 DBSCAN Hotspots | Phase 9 K-Means Area Clustering |
| :--- | :--- | :--- |
| **Clustering Subject** | Individual spatial incident coordinates (Lat/Long) | Aggregated geographic **AREAS** (Police District / Community Area) |
| **Feature Space** | Geographic distance (Haversine meters) | Multi-variate crime characteristics (11 normalized proportions & entropy) |
| **Hotspot vs. Profile** | Identifies micro spatial density hotspots | Clusters areas with similar historical crime category/temporal profiles |
| **Noise Handling** | Marks sparse points as noise (-1) | Assigns *every* eligible area to exactly one cluster |
| **Parameters** | `eps` (meters), `min_samples` | $K$ (Number of clusters), feature selection, minimum incident threshold |
| **Visualization** | Leaflet maps, Convex Hulls, Circle Markers | Interactive 2D PCA Scatterplot, Cluster Radar Profiles, Silhouette/Elbow Charts |

---

## 3. Data Warehouse Schemas & Granularities

### Real Dataset (`public` schema)
- **Warehouse Fact Table**: `public.fact_crime` (49,981 records)
- **Area Granularities**:
  - **Police District**: 23 eligible districts (Districts 1–25, excluding inactive 13 & 21)
  - **Community Area**: 77 eligible community areas (Areas 1–77)

### Synthetic Dataset (`synthetic_data` schema)
- **Warehouse Fact Table**: `synthetic_data.fact_crime` (30,000 records)
- **Area Granularities**:
  - **Police District**: 16 eligible districts
  - **Community Area**: 15 eligible community areas

---

## 4. Feature Engineering Formulas

Each geographic area $i$ with total incidents $N_i \ge N_{min}$ is transformed into an 11-dimensional feature vector $\mathbf{x}_i$:

$$\mathbf{x}_i = \begin{bmatrix} p_{\text{theft}}, p_{\text{battery}}, p_{\text{assault}}, p_{\text{damage}}, p_{\text{vehicle\_theft}}, p_{\text{other}}, r_{\text{arrest}}, r_{\text{domestic}}, r_{\text{night}}, r_{\text{weekend}}, H_{\text{diversity}} \end{bmatrix}^T$$

### Crime Category Proportions (Area-Level Denominators)
$$p_c = \frac{\text{Incidents in Category } c \text{ for Area } i}{N_i} \quad \text{where } \sum_{c} p_c = 1.0$$

### Operational & Temporal Ratios
- **Arrest Rate ($r_{\text{arrest}}$)**: $\frac{\text{Count}(\text{is\_arrest} = \text{true})}{N_i}$
- **Domestic Incident Rate ($r_{\text{domestic}}$)**: $\frac{\text{Count}(\text{is\_domestic} = \text{true})}{N_i}$
- **Nighttime Share ($r_{\text{night}}$)**: $\frac{\text{Count}(\text{LOWER}(\text{time\_period}) = \text{'night'})}{N_i}$
- **Weekend Share ($r_{\text{weekend}}$)**: $\frac{\text{Count}(\text{is\_weekend} = \text{true})}{N_i}$

### Category Diversity / Entropy ($H_{\text{diversity}}$)
Measures crime concentration vs. dispersion using Shannon Entropy across categories:

$$H_{\text{diversity}} = -\sum_{c=1}^{C} p_c \ln(p_c) \quad \text{where } p_c > 0$$

- High Entropy: Area experiences a diverse mix of crime types.
- Low Entropy: Area crime is heavily dominated by a single crime category.

---

## 5. Preprocessing & Standardization

Raw proportions are standardized using `scikit-learn` `StandardScaler` to ensure zero mean ($\mu = 0$) and unit variance ($\sigma = 1$):

$$z_{i,j} = \frac{x_{i,j} - \mu_j}{\sigma_j}$$

- **Zero Variance Defense**: Any feature with variance $\sigma_j^2 < 10^{-6}$ across eligible areas is automatically filtered out before scaling to prevent division by zero.
- **Determinism**: `KMeans` is executed with `random_state=42` and `n_init=10` to guarantee reproducible cluster assignments.

---

## 6. Experimental Results & Optimal K Evaluation

### Real Dataset (`public` schema) — 23 Police Districts

| K | WCSS (Inertia) | Silhouette Score | Recommendation / Status |
| :---: | :---: | :---: | :---: |
| 2 | 107.41 | **0.6349** | ★ Recommended (Strong separation between high-domestic and theft-dominant districts) |
| 3 | 87.12 | 0.2842 | Moderate profile separation |
| 4 | 69.89 | 0.2524 | Default analysis setting |
| 5 | 58.33 | 0.1793 | Sub-segmentation |
| 6 | 49.12 | 0.1988 | Over-clustering |
| 7 | 42.05 | 0.2014 | Small cluster sizes |
| 8 | 35.80 | 0.1872 | Granular separation |

### Real Cluster Profile Examples ($K = 3$)
1. **Theft & Commercial Heavy Pattern**: Characterized by high theft proportion ($>45\%$) and low domestic rate ($<10\%$). Typical member: District 1 (Central/Loop), District 18 (Near North).
2. **High Domestic Incident Concentration**: Characterized by elevated domestic rates ($>22\%$) and battery/assault proportion ($>30\%$). Typical member: District 7 (Englewood), District 11 (Harrison).
3. **Balanced / Mixed Crime Profile**: Average distribution across theft, damage, and vehicle theft with moderate arrest rates ($18-22\%$).

---

## 7. Educational & Objective Cluster Labeling Rules

Labels are dynamically generated based on standard deviation offsets ($\Delta = \frac{\bar{x}_{\text{cluster}} - \bar{x}_{\text{global}}}{\sigma_{\text{global}}}$) to prevent hardcoded bias:
- **"Theft-Heavy Pattern"**: Cluster theft proportion $> +0.75 \sigma$ above global mean.
- **"High Domestic Incident Share"**: Cluster domestic rate $> +0.75 \sigma$ above global mean.
- **"Nighttime Incident Concentration"**: Cluster nighttime share $> +0.75 \sigma$ above global mean.
- **"High Arrest Efficiency Profile"**: Cluster arrest percentage $> +0.75 \sigma$ above global mean.
- **"Mixed Crime Profile"**: No single feature deviates beyond $\pm 0.75 \sigma$.

*Non-Judgmental Safety Note*: Labels never use subjective terms such as "Dangerous Area" or "Crime Hotspot", emphasizing descriptive sample segmentation.

---

## 8. User Interface Architecture (`frontend/src/pages/KMeansPage.jsx`)

The React UI provides an interactive analytics workstation with 9 main components:
1. **Header & Active Dataset Badge**: Real vs. Synthetic indicator.
2. **Interactive Configuration Panel**: $K$ slider (2–8), area granularity selector, minimum incident threshold slider, feature checkboxes, and Analyze button.
3. **KPI Cards**: Eligible Areas, Selected $K$, Silhouette Score, WCSS (Inertia), Excluded Areas.
4. **Interactive 2D PCA Scatterplot**: Recharts scatter plot with 1 point per eligible area, color-coded by cluster, with tooltip details (Area name, Cluster label, Incidents, PCA X/Y).
5. **Elbow Method & Silhouette Charts**: Dual line charts comparing WCSS and Silhouette Score across candidate $K$ values with recommended $K$ indicator.
6. **Cluster Radar Profile Chart**: Comparative radar visualization of feature means across clusters.
7. **Cluster Membership Table**: Filterable and searchable table listing Area Name, Cluster ID, Incident Count, Dominant Crime, Arrest %, Domestic %, and Night %.
8. **Cluster Detail Card**: Deep-dive into representative characteristics, member areas, and derived observations.
9. **Algorithm Educational Accordion**: Academic breakdown of K-Means math, PCA projection, Euclidean distance, Silhouette metrics, and DBSCAN comparisons.

---

## 9. Verification & Automated Test Results

The automated test suite (`scratch/test_kmeans_validation.py`) verified 100% compliance across 6 core criteria:

```text
================================================================================
CRIMELENS - PHASE 9 K-MEANS VALIDATION SUITE
================================================================================
✓ 1. Record Count Integrity: Real = 49,981 | Synthetic = 30,000
✓ 2. Area Feature Extraction: Real Police Districts = 23 eligible (0 excluded)
✓ 3. Clustering Determinism: 2 consecutive runs produced 100% identical cluster assignments
✓ 4. Silhouette & Elbow Evaluation: Evaluated K in [2..8], recommended K=2 (Silhouette = 0.6349)
✓ 5. Dataset Routing Isolation: Real K=4 Inertia (69.89) != Synthetic K=4 Inertia (105.79)
✓ 6. Regression Testing Across Phases 1-8:
     - Dashboard (/api/dashboard/kpis): PASSED
     - OLAP Explorer (/api/olap/summary): PASSED
     - DBSCAN Hotspots (/api/hotspots/detect): PASSED
     - Hotspot Evolution (/api/hotspots/evolution): PASSED
================================================================================
ALL PHASE 9 TESTS PASSED PERFECTLY!
```

- **Frontend Production Build**: `npm run build` completed cleanly in 6.00s with zero bundling errors.

---

## 10. Data Warehousing & Mining (DWM) Concepts Demonstrated

1. **Dimensional Aggregation & Roll-up**: Aggregating `fact_crime` to `dim_area` level using GROUP BY aggregation.
2. **Feature Space Normalization**: Standardizing heterogeneous scales (proportions vs. entropy) to prevent dominant feature scaling bias.
3. **Unsupervised Segmentation**: Partitioning area vectors using iterative centroid optimization.
4. **Dimensionality Reduction (PCA)**: Linear projection of 11-dimensional standardized space to 2D orthogonal axes ($PC1, PC2$) for visual representation.
5. **Cluster Quality Validation**: Measuring intra-cluster tightness vs. inter-cluster distance using Silhouette Coefficients ($s = \frac{b - a}{\max(a, b)}$).

---

## 11. Viva Questions & Short Answers

**Q1: Why cluster geographic areas instead of individual crime incident lat/long coordinates in K-Means?**  
*Answer*: Clustering raw lat/long coordinates with K-Means forces spatial points into spherical geometric partitions around arbitrary centroids without respect to spatial density or geographic boundaries. Segmenting aggregated *areas* based on their crime profiles identifies structural similarities in crime composition (e.g., theft-dominated vs. domestic-heavy areas) across administrative boundaries.

**Q2: What is the purpose of applying PCA before plotting the K-Means scatterplot?**  
*Answer*: K-Means operates in the full 11-dimensional feature space. Because human vision cannot perceive 11 dimensions, PCA projects the standardized 11D feature space onto the 2 principal axes ($PC1$ and $PC2$) that capture the maximum feature variance, allowing clear 2D visual inspection of area cluster groupings.

**Q3: How does Silhouette Score differ from Within-Cluster Sum of Squares (Inertia)?**  
*Answer*: Inertia measures only intra-cluster cohesion (sum of squared distances to centroids) and monotonically decreases as $K$ increases. Silhouette Score balances intra-cluster cohesion ($a$) against nearest-neighbor cluster separation ($b$), producing a bounded value between -1 and +1, where higher values indicate well-separated, distinct clusters.

---

## 12. Conclusion & Operational Status

Phase 9 is **fully complete, verified, and operational**. All API endpoints are live, dataset routing functions seamlessly between Real (49,981 records) and Synthetic (30,000 records) schemas, and the production frontend build is verified.

*Ready for Phase 10 upon user authorization.*
