import math
from docx.shared import Pt, Inches
from docx_styler import (
    add_chapter_heading, add_section_heading, add_subsection_heading,
    add_bullet_point, add_callout_box, add_code_block, create_styled_table
)

def build_chapter_7(doc):
    add_chapter_heading(doc, "ETL Pipeline Engineering & Warehouse Observability", number=7)
    
    doc.add_paragraph(
        "Extract, Transform, Load (ETL) is the data engineering backbone of any enterprise warehouse. "
        "Raw municipal crime data is inherently dirty, containing missing timestamps, truncated block addresses, "
        "and unformatted coordinates. The CrimeLens ETL pipeline converts raw municipal feeds into pristine dimensional records."
    )
    
    add_section_heading(doc, "7.1 The Three Classical ETL Stages in CrimeLens")
    add_bullet_point(doc, "1. Extraction (E)", "Raw annual CSV files are streamed from data/raw/ using chunked readers. To prevent memory spikes on large census files (75 MB each), files are processed in 50,000-row transactional micro-batches.")
    add_bullet_point(doc, "2. Transformation (T)", "Data cleansing and dimensional standardization: timestamps are parsed to UTC local time; missing coordinates are flagged; primary crime types are normalized to standard Title Case; boolean strings ('true'/'false') are converted to native boolean bits; and surrogate foreign keys are resolved via cached dictionary lookups.")
    add_bullet_point(doc, "3. Loading (L)", "Normalized records are bulk-loaded into PostgreSQL using high-throughput COPY and multi-row INSERT statements. Foreign keys are loaded with referential integrity constraints enforced, and audit logs are recorded in etl_run_log.")

    add_section_heading(doc, "7.2 Data Quality Indicators & Deterministic Cleaning")
    headers = ["Quality Dimension", "Operational Rule in CrimeLens", "Warehouse Result"]
    data = [
        ["Completeness", "Incident ID and Timestamp cannot be null.", "100.00% complete (0 null IDs across 761,718 records)."],
        ["Uniqueness", "Primary incident IDs must be unique across all annual files.", "Zero internal duplicates; zero cross-year overlap."],
        ["Validity", "Coordinates must fall within Chicago municipal bounding box.", "754,250 valid geocodes (99.02%); 7,468 mapped to key 0."],
        ["Consistency", "District, Ward, and Community Area must be valid CPD units.", "100% matched to dim_area boundary master records."],
        ["Timeliness", "Timestamps must span Jan 1, 2023 00:00 to Dec 31, 2025 23:59.", "100% adherence to 36 continuous calendar months."]
    ]
    create_styled_table(doc, headers, data, [1.5, 2.5, 2.5])

def build_chapter_8(doc):
    add_chapter_heading(doc, "Descriptive & Temporal Analytics: KPIs and Moving Averages", number=8)
    
    doc.add_paragraph(
        "Descriptive analytics answers the question: 'What happened?' It calculates historical summaries, central tendencies, "
        "and time-series trajectories to expose structural patterns without guessing or speculating."
    )
    
    add_section_heading(doc, "8.1 Key Performance Indicators (KPIs) & Percentage Change")
    doc.add_paragraph("Percentage change measures relative growth or reduction between two time periods:")
    add_code_block(doc, "Percentage Change (%) = ((Value_Current - Value_Prior) / Value_Prior) * 100")
    
    add_callout_box(doc, "Worked Example: Annual Crime Decline (2024 to 2025)",
        "Given verified warehouse counts:\n"
        "• Value_2024 (Prior) = 259,670 incidents\n"
        "• Value_2025 (Current) = 238,180 incidents\n"
        "Calculation:\n"
        "Delta = 238,180 - 259,670 = -21,490 incidents\n"
        "Percentage Change = (-21,490 / 259,670) * 100 = -8.2759% ≈ -8.28%\n"
        "Conclusion: Citywide reported crime declined by exactly 8.28% between 2024 and 2025.", box_type="worked")

    add_section_heading(doc, "8.2 Moving Averages (MA-3 and MA-6) Formula & Walkthrough")
    doc.add_paragraph(
        "Monthly urban crime figures suffer from high-frequency noise caused by weather fluctuations and calendar length variations "
        "(e.g. 28 days in February vs 31 in January). A simple moving average (SMA) smoothes out this noise by calculating "
        "the arithmetic mean of the preceding N months:"
    )
    add_code_block(doc, "MA_N(t) = (1 / N) * SUM_{i=0}^{N-1} Count(t - i)")

    add_callout_box(doc, "Worked Example: 3-Month Moving Average (MA-3) for March 2023",
        "Given actual CrimeLens monthly counts for early 2023:\n"
        "• January 2023 (Month 1): 21,405 incidents\n"
        "• February 2023 (Month 2): 18,527 incidents\n"
        "• March 2023 (Month 3): 20,846 incidents\n"
        "Calculation:\n"
        "MA_3(March 2023) = (21,405 + 18,527 + 20,846) / 3 = 60,778 / 3 = 20,259.33 incidents\n"
        "Interpretation: While February experienced a sharp winter trough (18,527), the smoothed MA-3 line indicates an underlying quarterly baseline rate of ~20,259 incidents/month.", box_type="worked")

    add_section_heading(doc, "8.3 The 7x24 Diurnal-Weekly Temporal Matrix")
    doc.add_paragraph(
        "Crime is heavily structured by societal routine activities. In CrimeLens, the Trend Analysis module computes a "
        "7x24 matrix (168 discrete hourly cells) representing every hour of the week from Sunday 00:00 to Saturday 23:00. "
        "In Chicago, property crime peaks during weekday afternoon business hours (14:00–18:00), while violent offenses "
        "peak sharply on weekend nights between 21:00 and 03:00."
    )

def build_chapter_9(doc):
    add_chapter_heading(doc, "DBSCAN Spatial Clustering: Geographic Hotspot Mining", number=9)
    
    doc.add_paragraph(
        "Density-Based Spatial Clustering of Applications with Noise (DBSCAN) is an unsupervised clustering algorithm "
        "specifically designed to discover clusters of arbitrary geometric shape in spatial coordinates while robustly "
        "filtering out sparse noise points."
    )
    
    add_section_heading(doc, "9.1 Supervised vs. Unsupervised Learning")
    headers = ["Concept", "Supervised Learning", "Unsupervised Learning (DBSCAN)"]
    data = [
        ["Training Target", "Requires ground-truth labels (e.g. Arrest = YES/NO).", "No target labels; discovers natural groupings in data."],
        ["Objective", "Learn a function mapping features to targets.", "Discover geometric density patterns or latent clusters."],
        ["Evaluation", "Accuracy, Precision, Recall, Confusion Matrix.", "Silhouette score, cluster density, domain interpretability."]
    ]
    create_styled_table(doc, headers, data, [1.5, 2.5, 2.5])

    add_section_heading(doc, "9.2 Core Mathematical Concepts of DBSCAN")
    add_bullet_point(doc, "Epsilon (eps)", "The maximum radial distance threshold between two points to be considered spatial neighbors: N_eps(p) = {q in D | dist(p, q) <= eps}.")
    add_bullet_point(doc, "MinPoints (min_samples)", "The minimum number of incident points required within the Epsilon neighborhood to form a dense core: |N_eps(p)| >= MinPts.")
    add_bullet_point(doc, "Core Point", "A point that has at least MinPts within its Epsilon radius. Core points form the interior of crime hotspots.")
    add_bullet_point(doc, "Border Point", "A point that has fewer than MinPts within its Epsilon radius, but falls within the Epsilon neighborhood of a Core Point. Border points form the outer perimeter of a cluster.")
    add_bullet_point(doc, "Noise Point", "A point that is neither a Core Point nor reachable from any Core Point. Represent isolated, sporadic crimes that do not belong to any concentrated hotspot.")
    add_bullet_point(doc, "Density Reachability", "Point q is directly density-reachable from p if p is a Core Point and dist(p, q) <= eps. Density connectivity chains these reachable points into unified clusters.")

    add_section_heading(doc, "9.3 The Haversine Spherical Distance Formula")
    doc.add_paragraph(
        "Because the Earth is a sphere, Euclidean distance (sqrt(dx^2 + dy^2)) on raw latitude/longitude degrees introduces "
        "severe distortion (at Chicago's latitude of 41.88°N, one degree of longitude is only ~83 km, whereas one degree of "
        "latitude is ~111 km). CrimeLens uses the Haversine spherical distance formula:"
    )
    add_code_block(doc,
        "a = sin^2(d_lat / 2) + cos(lat1) * cos(lat2) * sin^2(d_lon / 2)\n"
        "c = 2 * atan2(sqrt(a), sqrt(1 - a))\n"
        "Distance (d) = R * c   (where R = 6,371,000 meters Earth radius)"
    )

    add_section_heading(doc, "9.4 Fully Worked DBSCAN Step-by-Step Example")
    doc.add_paragraph(
        "Consider 8 hypothetical incident locations in downtown Chicago. "
        "Let Epsilon = 300 meters and MinPts = 3:"
    )
    
    sample_pts = [
        ["Point", "Location / Description", "Nearby Points within 300m", "Neighbor Count", "DBSCAN Point Classification"],
        ["P1", "Michigan & Adams", "P1, P2, P3", "3", "CORE POINT (|N| >= 3)"],
        ["P2", "Michigan & Jackson", "P1, P2, P3, P4", "4", "CORE POINT (|N| >= 3)"],
        ["P3", "Wabash & Adams", "P1, P2, P3", "3", "CORE POINT (|N| >= 3)"],
        ["P4", "State & Van Buren", "P2, P4", "2", "BORDER POINT (in P2 neighborhood)"],
        ["P5", "Grand & State", "P5, P6, P7", "3", "CORE POINT (|N| >= 3)"],
        ["P6", "Grand & Wabash", "P5, P6, P7", "3", "CORE POINT (|N| >= 3)"],
        ["P7", "Ohio & State", "P5, P6, P7", "3", "CORE POINT (|N| >= 3)"],
        ["P8", "Navy Pier Outer Pier", "P8", "1", "NOISE POINT (isolated crime)"]
    ]
    create_styled_table(doc, sample_pts[0], sample_pts[1:], [0.8, 1.8, 1.4, 1.1, 1.4])

    doc.add_paragraph(
        "Execution Steps:\n"
        "1. P1, P2, and P3 are mutually reachable core points -> Form Cluster #1 (The Loop Hotspot).\n"
        "2. P4 is within 300m of core point P2 -> Absorbed into Cluster #1 as a Border Point.\n"
        "3. P5, P6, and P7 are mutually reachable core points > 1.2 km north -> Form Cluster #2 (River North Hotspot).\n"
        "4. P8 is over 2 km away with 0 neighbors -> Labeled Noise Point (-1).\n"
        "Result: Exactly 2 spatial hotspot clusters and 1 rejected noise incident."
    )

def build_chapter_10(doc):
    add_chapter_heading(doc, "Hotspot Evolution: Longitudinal Spatial Cluster Tracking", number=10)
    
    doc.add_paragraph(
        "Urban crime hotspots are dynamic; they expand, contract, shift across street blocks, or dissipate entirely "
        "under police intervention. The Hotspot Evolution module tracks how spatial clusters transition between time periods."
    )
    
    add_section_heading(doc, "10.1 Cluster Centroid Distance & Evolution Taxonomy")
    doc.add_paragraph(
        "Given cluster set C_A from Period A and cluster set C_B from Period B, CrimeLens computes the pairwise Haversine "
        "distance between their cluster centroids (lat_c, lon_c). Using a spatial displacement threshold T_dist (default 750 meters):"
    )
    add_bullet_point(doc, "Persistent / Shifted Cluster", "A cluster in Period B whose centroid is within T_dist (<= 750m) of a cluster in Period A. Indicates that the crime hotspot remained active, with displacement measuring spatial drift.")
    add_bullet_point(doc, "Emerging Hotspot", "A cluster in Period B that has no matching predecessor cluster within T_dist in Period A. Indicates a newly formed crime concentration.")
    add_bullet_point(doc, "Dissipated Cluster", "A cluster in Period A that has no matching successor cluster within T_dist in Period B. Indicates that an existing hotspot cooled down or disbanded.")

    add_callout_box(doc, "Criminological Warning: Correlation vs. Spatial Displacement",
        "A Persistent cluster whose centroid moved 200 meters does NOT prove that individual offenders physically walked two blocks away. "
        "It proves that the geographic center of reported incident concentration shifted. Criminologists refer to this as the difference "
        "between offender displacement and diffusion of benefits.", box_type="warning")

def build_chapter_11(doc):
    add_chapter_heading(doc, "K-Means Clustering: Jurisdictional Typology Segmentation", number=11)
    
    doc.add_paragraph(
        "K-Means is an unsupervised partition-based clustering algorithm. In CrimeLens, K-Means is used to segment "
        "Chicago's 24 eligible police administrative districts (or 77 community areas) into operational profiles based on "
        "multivariate crime characteristics."
    )
    
    add_section_heading(doc, "11.1 Feature Standardization (StandardScaler)")
    doc.add_paragraph(
        "Because features represent proportions (0.0 to 1.0) and percentages (0% to 100%), calculating raw Euclidean distance "
        "would allow large percentage values to overwhelm proportions. All 11 features are normalized using StandardScaler:"
    )
    add_code_block(doc, "z_i = (x_i - mean(x)) / std(x)")

    add_section_heading(doc, "11.2 Mathematical Formulation: WCSS and Centroid Updates")
    doc.add_paragraph("K-Means minimizes Within-Cluster Sum of Squares (WCSS / Inertia):")
    add_code_block(doc, "WCSS = SUM_{k=1}^{K} SUM_{x in C_k} ||x - mu_k||^2")
    doc.add_paragraph("In each iteration, cluster centroids mu_k are recomputed as the arithmetic mean of all assigned members:")
    add_code_block(doc, "mu_k = (1 / |C_k|) * SUM_{x in C_k} x")

    add_section_heading(doc, "11.3 Fully Worked Numerical Example (6 Points, 2 Clusters)")
    doc.add_paragraph("Consider 6 simplified police districts evaluated on two standardized features: Offense Severity (x1) and Arrest Rate (x2):")
    
    kmeans_data = [
        ["District", "x1 (Severity)", "x2 (Arrest Rate)", "Initial Assign", "Dist to Centroid C1", "Dist to Centroid C2", "Final Cluster"],
        ["D1", "1.0", "1.0", "C1 (Initial)", "0.00", "5.66", "Cluster 1"],
        ["D2", "1.5", "2.0", "C1", "1.12", "4.61", "Cluster 1"],
        ["D3", "2.0", "1.0", "C1", "1.00", "4.82", "Cluster 1"],
        ["D4", "5.0", "5.0", "C2 (Initial)", "5.66", "0.00", "Cluster 2"],
        ["D5", "6.0", "5.0", "C2", "6.40", "1.00", "Cluster 2"],
        ["D6", "5.5", "6.0", "C2", "6.73", "1.12", "Cluster 2"]
    ]
    create_styled_table(doc, kmeans_data[0], kmeans_data[1:], [0.9, 1.1, 1.1, 1.0, 1.2, 1.2, 1.0])

    doc.add_paragraph(
        "Iteration 1 Centroids:\n"
        "• mu_1 = ((1.0+1.5+2.0)/3, (1.0+2.0+1.0)/3) = (1.50, 1.33)\n"
        "• mu_2 = ((5.0+6.0+5.5)/3, (5.0+5.0+6.0)/3) = (5.50, 5.33)\n"
        "Iteration 2: All points D1–D3 remain closest to mu_1; D4–D6 remain closest to mu_2. Convergence reached in 2 iterations!\n"
        "Inertia = ||D1-mu1||^2 + ... + ||D6-mu2||^2 = 0.67 + 0.44 + 0.67 + 0.36 + 0.36 + 0.44 = 2.94."
    )

    add_section_heading(doc, "11.4 Recommended K vs. Selected K: Silhouette Analysis")
    doc.add_paragraph(
        "The Silhouette Coefficient s(i) measures how well an object fits its cluster versus neighboring clusters:"
    )
    add_code_block(doc, "s(i) = (b(i) - a(i)) / max(a(i), b(i))")
    doc.add_paragraph(
        "where a(i) is mean intra-cluster distance, and b(i) is mean nearest-cluster distance. "
        "In CrimeLens, silhouette score peaks at K=2 (0.441) and K=4 (0.391). CrimeLens explains that while "
        "Recommended K=2 yields the highest mathematical cohesion, the user has the analytical freedom to select K=4 "
        "to discover four nuanced operational typologies (Commercial Theft, Violent High-Enforcement, Residential Vehicle Theft, Balanced)."
    )

def build_chapter_12(doc):
    add_chapter_heading(doc, "Principal Component Analysis (PCA): Dimensionality Reduction", number=12)
    
    doc.add_paragraph(
        "Humans cannot visualize 11-dimensional feature spaces. Principal Component Analysis (PCA) is an orthogonal "
        "linear transformation that projects multi-dimensional data into a lower-dimensional coordinate system (e.g. 2D) "
        "while maximizing the retained variance."
    )
    
    add_section_heading(doc, "12.1 Mathematical Foundations of PCA")
    add_bullet_point(doc, "1. Covariance Matrix", "Measures pairwise linear relationships across standardized features: Sigma = (1 / (n - 1)) * X^T * X.")
    add_bullet_point(doc, "2. Eigenvalues and Eigenvectors", "Solve the characteristic equation: Sigma * v = lambda * v. Eigenvectors v define the principal component directions; eigenvalues lambda quantify the variance along each direction.")
    add_bullet_point(doc, "3. Explained Variance Ratio", "The proportion of total dataset variance captured by principal component k: EVR_k = lambda_k / SUM_{j=1}^{D} lambda_j.")

    add_callout_box(doc, "CrimeLens Actual PCA Evaluation Results",
        "On Chicago's 24 police districts across 11 features:\n"
        "• PC1 (Eigenvalue 5.11): Captures 46.45% of total variance (driven by violent offense vs property theft axis).\n"
        "• PC2 (Eigenvalue 2.85): Captures 25.94% of total variance (driven by nighttime concentration and entropy).\n"
        "• Cumulative 2D Variance: 46.45% + 25.94% = 72.39%.\n"
        "Conclusion: The 2D PCA scatterplot successfully preserves nearly three-quarters of all mathematical variance across the 11 original dimensions.", box_type="worked")
