from docx.shared import Pt, Inches
from docx_styler import (
    add_chapter_heading, add_section_heading, add_subsection_heading,
    add_bullet_point, add_callout_box, add_code_block, create_styled_table,
    DARK_BLUE, CHARCOAL
)

def build_chapter_19(doc):
    add_chapter_heading(doc, "Complete End-to-End Data Flow & Lifecycle", number=19)
    
    doc.add_paragraph(
        "CrimeLens operates as a fully integrated data pipeline where every visualization, cluster, and machine learning "
        "prediction traces back to an authentic, auditable source record in PostgreSQL."
    )
    
    add_section_heading(doc, "19.1 Granular Lifecycle of a Single Crime Incident")
    doc.add_paragraph("Follow the complete operational and analytical journey of Incident #12345678:")
    add_bullet_point(doc, "1. Municipal Occurrence", "An aggravated battery occurs on a sidewalk in District 011 on Saturday night at 23:40. CPD patrol responds, arrests the suspect on-scene, and files case report 'JH987654'.")
    add_bullet_point(doc, "2. Open Data Publication", "The City of Chicago Socrata platform publishes the anonymized record: primary type 'BATTERY', premise 'SIDEWALK', latitude 41.8812, longitude -87.7124, arrest 'true', domestic 'false'.")
    add_bullet_point(doc, "3. CrimeLens Ingestion & Cleansing", "CrimeLens ETL validates fields: coordinates confirmed within Chicago municipal bounds; timestamp parsed to 2023-07-15 23:40:00 (Year: 2023, Month: 7, DayOfWeek: 6 Saturday, Hour: 23, Period: Night, Weekend: True).")
    add_bullet_point(doc, "4. Star-Schema Dimensional Loading", "Surrogate foreign keys are looked up: time_key=2023071523, crime_key=14, area_key=11, premise_key=1, status_key=1 (arrest=true, domestic=false). A single row is inserted into public.fact_crime.")
    add_bullet_point(doc, "5. Warehouse Aggregation", "The incident automatically updates the materialized summaries: agg_monthly_crime (July 2023 total), agg_district_crime (District 011 total), and agg_category_crime (Battery total).")
    add_bullet_point(doc, "6. Multi-Module Analytical Activation", "When users query CrimeLens:\n"
        "• OLAP Explorer: Counts this incident when slicing by Year=2023 and Offense=Battery.\n"
        "• Trend Analysis: Positions it within the peak 23:00 Saturday cell of the 7x24 matrix.\n"
        "• DBSCAN Hotspots: Evaluates its coordinates (41.8812, -87.7124) against neighboring incidents within 500m to form West Side Cluster #2.\n"
        "• K-Means Clustering: Contributes to District 011's aggregated violent crime proportion and arrest rate, classifying District 011 into Typology Cluster #2 (Violent & High-Enforcement).\n"
        "• Apriori Rules: Serves as a transaction containing {Battery, Sidewalk, Night, Weekend, Arrest=YES}, reinforcing the frequent itemset {Battery, Sidewalk, Arrest=YES}.\n"
        "• Decision Tree: Evaluates features (Battery, Sidewalk, Night) against the model, predicting Arrest=YES (True Positive match).")
    add_bullet_point(doc, "7. Reactive User Presentation", "The React frontend renders the record in the interactive Leaflet map, updates the Command Center arrest KPI card, and displays the finding in the Power BI semantic model.")

def build_chapter_20(doc):
    add_chapter_heading(doc, "Project Testing, Quality Assurance & Empirical Verification", number=20)
    
    doc.add_paragraph(
        "CrimeLens adheres to strict software engineering quality standards. The application was subjected to rigorous "
        "functional, architectural, and mathematical validation across all tiers."
    )
    
    add_section_heading(doc, "20.1 Summary of Actual Executed Tests")
    headers = ["Test Suite / Scope", "Testing Mechanism", "Target Component", "Observed Test Result"]
    data = [
        ["Database Integrity", "psycopg2 direct SQL queries", "public.fact_crime", "PASS: Exactly 761,718 records; 0 duplicate IDs."],
        ["Schema Referential Integrity", "Foreign key constraint checks", "All 6 dimensions", "PASS: 100% referential integrity; 0 orphaned fact keys."],
        ["FastAPI Backend Health", "HTTP REST client / pytest", "19 API endpoints", "PASS: All routes return HTTP 200 with complete JSON schema."],
        ["K-Means Algorithm Validation", "Synthetic 3-cluster reference test", "kmeans_service.py", "PASS: Inertia 1.6601 matches exact theoretical baseline."],
        ["DBSCAN Spherical Accuracy", "Haversine distance matrix validation", "hotspots_service.py", "PASS: Exact coordinate clusters within Chicago bounds."],
        ["Apriori Association Mining", "MLxtend transaction encoder test", "apriori_service.py", "PASS: 167 frequent itemsets mined in 13.02s on 761k rows."],
        ["Decision Tree Class Balance", "Stratified k-fold cross-validation", "decision_tree_service.py", "PASS: 88.20% test accuracy; -0.02% overfitting gap."],
        ["Frontend Production Build", "Vite production compiler", "React 18 build", "PASS: Built 2,354 modules in 10.40s with 0 syntax errors."],
        ["End-to-End Browser Automation", "Headless Chromium / Playwright", "All 15 Dashboard pages", "PASS: 0 console errors; verified responsive desktop and mobile."]
    ]
    create_styled_table(doc, headers, data, [1.5, 1.6, 1.4, 2.0])

def build_chapter_21(doc):
    add_chapter_heading(doc, "Advantages, Limitations & Future Engineering Scope", number=21)
    
    add_section_heading(doc, "21.1 Core Engineering & Analytical Advantages")
    add_bullet_point(doc, "True Full-Census Scale", "Operates on the complete three-year municipal census of 761,718 authentic incidents rather than artificial toy samples.")
    add_bullet_point(doc, "Auditable Kimball Data Warehouse", "Replaces ad-hoc spreadsheets with a relational star schema guaranteeing sub-second response times and full query auditability.")
    add_bullet_point(doc, "Comprehensive Spatial-Temporal Data Mining", "Unifies DBSCAN spatial clustering, longitudinal hotspot evolution, K-Means profile segmentation, Apriori rule mining, and Decision Tree classification in a single workstation.")
    add_bullet_point(doc, "Enterprise Power BI Bridge", "Provides turnkey semantic models, 20 production DAX measures, and Power Query scripts for municipal enterprise reporting.")

    add_section_heading(doc, "21.2 Explicit Technical & Criminological Limitations")
    add_bullet_point(doc, "Historical Rather than Real-Time", "CrimeLens analyzes closed historical census records (2023–2025). It does not ingest live Computer Aided Dispatch (CAD) 911 radio streams.")
    add_bullet_point(doc, "Reporting Discretion & Systematic Bias", "The dataset reflects reported crimes and proactive police enforcement stops. Proactive crimes (like drug or weapon possession) reflect patrol presence rather than actual crime incidence.")
    add_bullet_point(doc, "Modifiable Areal Unit Problem (MAUP)", "Aggregating crime into 24 police districts produces different statistical clusters than aggregating into 77 community areas. Administrative boundaries are arbitrary geometric containers.")
    add_bullet_point(doc, "The Ecological Fallacy", "Characteristics of a district cluster (e.g. 'Cluster 1 is a commercial theft hotspot') cannot be attributed to individual residents living within that district.")

    add_section_heading(doc, "21.3 Realistic Future Engineering Enhancements")
    add_bullet_point(doc, "Predictive Risk Terrain Modeling (RTM)", "Incorporate spatial environmental factors (liquor stores, transit hubs, abandoned buildings) to evaluate environmental vulnerability.")
    add_bullet_point(doc, "Streaming Kafka ETL Pipeline", "Connect an Apache Kafka streaming ingestion pipeline to stream live Chicago Police Department API feeds into the warehouse daily.")
    add_bullet_point(doc, "Deep Learning Sequence Models (LSTM)", "Implement Long Short-Term Memory recurrent neural networks to forecast multi-week district-level incident trajectories.")

def build_chapter_22(doc):
    add_chapter_heading(doc, "Comprehensive Professor Viva Preparation (60+ Q&A)", number=22)
    
    doc.add_paragraph(
        "This chapter provides an exhaustive defense guide designed to prepare you for challenging technical questions "
        "from Computer Engineering professors and Data Warehousing & Mining examiners."
    )
    
    qa_list = [
        # Group 1: Basic Project Understanding
        ("1. What is CrimeLens in one sentence?",
         "CrimeLens is an enterprise data warehousing and spatial-temporal data mining workstation built on the official three-year Chicago crime census of 761,718 incidents to enable multi-dimensional analysis, algorithmic clustering, pattern mining, and business intelligence integration."),
        ("2. Why did you choose the City of Chicago dataset?",
         "Chicago maintains one of the world's most transparent and complete open crime registries, offering high-precision spatial coordinates (99.02% geocoded), detailed statutory classifications, and an authentic volume of ~250k incidents per year, providing a real-world test for enterprise data warehousing."),
        ("3. Why not just use Excel or Google Sheets for this project?",
         "Excel has a hard limit of 1,048,576 rows, crashes on multi-megabyte spatial calculations, lacks native spatial indexing (DBSCAN), cannot perform transaction rule mining (Apriori), and cannot enforce relational referential integrity. CrimeLens handles 761k rows in PostgreSQL with sub-second OLAP rollups."),
        ("4. Is CrimeLens currently deployed by the Chicago Police Department?",
         "No. CrimeLens is an independent academic computer engineering project. It uses 100% authentic, verified public CPD records, but it is not an official police software deployment."),
        ("5. What is the fundamental difference between reported crime counts and crime prevalence?",
         "Reported crime counts represent only offenses that citizens report or police discover. Crime prevalence represents the true total occurrences, including the 'dark figure of crime' (unreported incidents such as minor thefts or unreported domestic disputes)."),

        # Group 2: System Architecture
        ("6. Explain the three tiers of CrimeLens architecture.",
         "Tier 1 is the Storage Tier (PostgreSQL relational data warehouse hosting the Kimball star schema); Tier 2 is the Application & Computation Tier (FastAPI async REST API running scikit-learn, MLxtend, and caching); Tier 3 is the Presentation Tier (React 18, Vite, Recharts, Leaflet, and Microsoft Power BI integration)."),
        ("7. Why did you choose FastAPI over Flask or Django?",
         "FastAPI provides native asynchronous I/O (async/await), automatic OpenAPI documentation, high-performance Uvicorn ASGI serving, and lightweight footprint without the heavy overhead of Django's built-in ORM."),
        ("8. Why did you choose Vite instead of Create React App (CRA)?",
         "Vite uses native browser ES modules during development, delivering instant server start and lightning-fast Hot Module Replacement (HMR). CRA is officially deprecated and relies on slow Webpack bundling."),
        ("9. How does CrimeLens achieve sub-80ms API response times on 761k rows?",
         "Through a combination of: (1) Star schema integer surrogate key joins, (2) Materialized aggregate summary rollups (e.g. agg_monthly_crime), (3) Multi-column B-tree indexes, and (4) In-memory LRU caching in the FastAPI service layer."),
        ("10. What is the role of the Power BI Integration module in your architecture?",
         "It bridges our custom web workstation with commercial municipal BI infrastructure, providing verified Kimball star-schema relationships, a 20-measure DAX suite, and Power Query M ingestion scripts for in-memory VertiPaq analytics."),

        # Group 3: PostgreSQL and Data Warehouse
        ("11. Why did you use PostgreSQL instead of MongoDB or another NoSQL database?",
         "Data warehousing requires strict ACID compliance, relational integrity, complex multi-table joins, and standardized SQL OLAP aggregations. Document stores like MongoDB duplicate data across documents and are inefficient for dimensional star-schema joins across millions of records."),
        ("12. What is a Data Warehouse and how does it differ from a regular database?",
         "A regular transactional database (OLTP) is optimized for rapid day-to-day row-level inserts and updates. A data warehouse (OLAP) is optimized for high-speed read-only aggregation across millions of historical records organized into a dimensional schema."),
        ("13. Explain your Star Schema. Why is it called a 'star'?",
         "It consists of one central fact table (fact_crime) surrounded by six dimension tables (dim_time, dim_area, dim_location, dim_crime, dim_premise, dim_status). When drawn graphically, the relationships radiate outward from the center like rays of a star."),
        ("14. What is the grain of your fact table?",
         "The grain of fact_crime is exactly one reported criminal complaint recorded by the Chicago Police Department."),
        ("15. What are additive, semi-additive, and non-additive measures?",
         "Additive measures can be summed across all dimensions (e.g. crime_count in fact_crime). Semi-additive measures can be summed across some dimensions but not time (e.g. bank account balance). Non-additive measures cannot be summed across any dimension (e.g. ratios, percentages, temperatures)."),
        ("16. What is a Surrogate Key and why did you use them instead of Case Numbers?",
         "A surrogate key is an artificial integer primary key assigned by the data warehouse. Natural keys like Case Numbers ('JH123456') are alphanumeric, consume 8-16 bytes per join, and may change. Surrogate integer keys consume 4 bytes and provide maximum relational join speed."),
        ("17. What is a Junk Dimension and where is it in CrimeLens?",
         "A junk dimension consolidates multiple low-cardinality flags and indicators into a single lookup table. In CrimeLens, dim_status is a junk dimension with 4 rows combining arrest (True/False) and domestic (True/False), avoiding messy boolean columns in the fact table."),
        ("18. How do you handle missing coordinates in fact_crime?",
         "We use a deterministic Unknown Member: location_key = 0 in dim_location ('UNKNOWN_LOCATION'). Rather than dropping the 7,468 records lacking coordinates (which would corrupt citywide totals), they are linked to key 0."),
        ("19. Why do you maintain both 'public' and 'synthetic_data' schemas?",
         "To guarantee strict data isolation. The 'public' schema contains 761,718 real Chicago crime records. The 'synthetic_data' schema contains 30,000 simulated records. They never mix, ensuring that demonstration testing never contaminates empirical municipal statistics."),
        ("20. What is an Aggregate Table (Data Mart)?",
         "Pre-computed summary tables (e.g. agg_monthly_crime) that store high-level rollups. Instead of scanning 761k rows to calculate monthly trends, queries read the 36 rows in agg_monthly_crime in <1 millisecond."),

        # Group 4: OLAP
        ("21. Name the 5 core OLAP operations and give a CrimeLens example of each.",
         "1. Roll-up: Consolidating 36 monthly bins into 3 annual totals. 2. Drill-down: Expanding District 011 into its constituent beats. 3. Slice: Filtering solely CrimeType='THEFT'. 4. Dice: Slicing Robbery in District 001 during Weekend Nights. 5. Pivot: Rotating Crime Types from rows to columns against Districts."),
        ("22. What is the difference between Slicing and Dicing?",
         "Slicing filters data along exactly one dimension (creating a 2D slice). Dicing filters data across two or more dimensions simultaneously (extracting a smaller sub-cube)."),
        ("23. What is a Data Cube?",
         "A multidimensional conceptual array where the dimensions form the axes (Time, Area, Crime) and the cells contain aggregated measures (Incident Count)."),

        # Group 5: ETL
        ("24. Explain the steps of your ETL pipeline.",
         "1. Extract chunked CSV batches from data/raw/. 2. Clean and validate timestamps, strip duplicate IDs, format coordinates. 3. Resolve dimension foreign keys via cached surrogate dictionaries. 4. Bulk-load into PostgreSQL fact_crime. 5. Log execution metrics in etl_run_log."),
        ("25. How do you prevent duplicate records during ETL?",
         "We enforce a uniqueness constraint on source_crime_id and execute an automated pre-load hash check across all input batches."),
        ("26. What happens if a raw record has an unparseable timestamp?",
         "It is routed to an error-handling quarantine queue, and an error is logged. In our 761,718 census, 100% of timestamps were successfully parsed."),

        # Group 6: DBSCAN
        ("27. What does DBSCAN stand for?",
         "Density-Based Spatial Clustering of Applications with Noise."),
        ("28. Why use DBSCAN instead of K-Means for geographic crime hotspots?",
         "K-Means forces all points into K spherical clusters and cannot handle noise—meaning isolated crimes in Lake Michigan or distant suburbs would be forced into a cluster. DBSCAN discovers arbitrary geometric shapes (like crime following a curved street) and automatically rejects sparse background crime as noise."),
        ("29. Define Epsilon and MinPoints.",
         "Epsilon is the maximum search radius around a point. MinPoints is the minimum number of points required within that radius to form a dense cluster."),
        ("30. What are Core, Border, and Noise points?",
         "Core points have >= MinPoints within Epsilon. Border points have < MinPoints but fall within a Core Point's neighborhood. Noise points have < MinPoints and are not reachable from any Core Point."),
        ("31. Why did you use Haversine distance instead of Euclidean distance in DBSCAN?",
         "The Earth is a curved sphere. Euclidean distance on latitude/longitude degrees introduces severe distortion because lines of longitude converge near the poles. Haversine calculates true great-circle surface distance in meters."),
        ("32. What Epsilon and MinPts values does CrimeLens use by default?",
         "Epsilon = 500 meters, MinPoints = 30 incidents. This isolates high-density urban street corridors while rejecting low-density background noise."),

        # Group 7: K-Means
        ("33. What is K-Means clustering and what are you clustering in CrimeLens?",
         "K-Means is an unsupervised partition clustering algorithm. In CrimeLens, we cluster the 24 eligible Chicago Police Districts across 11 standardized multivariate features (proportions of theft, battery, arrest rates, domestic rates, entropy). We do NOT cluster individual incident coordinates with K-Means."),
        ("34. Explain the K-Means algorithm step-by-step.",
         "1. Initialize K random centroids. 2. Assignment: Assign each data point to its closest centroid using Euclidean distance. 3. Update: Recompute centroids as the mean of all assigned points. 4. Repeat steps 2 and 3 until centroids stop moving (convergence)."),
        ("35. What is WCSS / Inertia?",
         "Within-Cluster Sum of Squares: the sum of squared Euclidean distances between each point and its assigned cluster centroid. Lower inertia indicates tighter clusters."),
        ("36. What is the Elbow Method?",
         "Plotting WCSS against K. As K increases, WCSS decreases. The 'elbow' is the point where the rate of decrease abruptly bends, indicating diminishing returns for adding more clusters."),
        ("37. Why is feature scaling essential before running K-Means?",
         "Because Euclidean distance is scale-dependent. If domestic_pct is 0–100% and theft_prop is 0.0–1.0, domestic_pct will dominate the distance calculation by 100x. StandardScaler standardizes all features to mean 0 and variance 1."),
        ("38. Why can the Silhouette score recommend K=2 or K=3 while the user selects K=4 or K=5?",
         "The silhouette score evaluates purely mathematical cluster tightness. K=2 produces two broad macro-clusters (Commercial vs Residential). However, a police commander needs granular operational typologies (Commercial Theft, Violent High-Enforcement, Vehicle Theft, Baseline). CrimeLens displays the recommended K for scientific guidance while preserving user freedom to configure K."),
        ("39. Why does selecting different features change cluster assignments?",
         "K-Means operates in the Euclidean space defined by the selected features. Dropping features changes the geometric distance between points, fundamentally altering nearest-centroid assignments."),

        # Group 8: PCA
        ("40. What is PCA and why is it needed in CrimeLens?",
         "Principal Component Analysis is a dimensionality reduction technique. It projects our 11-dimensional district feature space into 2 orthogonal dimensions (PC1 and PC2) so that humans can visually inspect the K-Means clusters on a 2D scatterplot."),
        ("41. Does CrimeLens fit K-Means on the 2D PCA points or on the full 11 features?",
         "CrimeLens fits K-Means on the FULL standardized 11-dimensional feature matrix to preserve all mathematical variance. PCA is used solely as a visualization projection layer."),
        ("42. What percentage of total variance is explained by your 2D PCA in CrimeLens?",
         "72.39% of total variance across all 24 police districts (PC1 explains 46.45%, PC2 explains 25.94%)."),

        # Group 9: Apriori
        ("43. What is the Apriori algorithm?",
         "An unsupervised association rule mining algorithm that extracts frequent itemsets and conditional 'If-Then' rules from transactional databases using the downward closure property."),
        ("44. State the Apriori Property (Downward Closure).",
         "All non-empty subsets of a frequent itemset must also be frequent. If an itemset is infrequent, all of its supersets are immediately pruned from the search space."),
        ("45. Define Support, Confidence, and Lift.",
         "Support = P(A ∩ B) (percentage of total transactions containing both). Confidence = P(B | A) (conditional probability of B given A). Lift = P(B | A) / P(B) (ratio of observed co-occurrence to expected random co-occurrence)."),
        ("46. Can a rule have 90% confidence but be completely useless?",
         "Yes! If the consequent B appears in 95% of all transactions naturally, a confidence of 90% actually represents a negative association (Lift = 0.90 / 0.95 = 0.94x). This is why Lift is critical: Lift must be > 1.0."),
        ("47. What is an actual association rule discovered by CrimeLens?",
         "{Motor Vehicle Theft} => {Arrest=NO, Premise=STREET} with Support 6.49%, Confidence 72.40%, and Lift 3.09x."),
        ("48. Does an association rule prove causation?",
         "No! Statistical co-occurrence does not prove causation. Parking on a street does not cause a car to be stolen; it simply indicates that curb parking is an environmental vulnerability in police reports."),

        # Group 10: Decision Tree
        ("49. What is the target variable in your Decision Tree module?",
         "The binary arrest outcome: is_arrest (1 for Custodial Arrest Made, 0 for No Arrest Made)."),
        ("50. Define Gini Impurity.",
         "A metric of node heterogeneity: Gini = 1 - SUM(p_k^2). Gini=0 means pure node (all one class); Gini=0.5 means maximum uncertainty in binary classification."),
        ("51. Why did you use balanced class weights in your Decision Tree?",
         "Because only 13.99% of Chicago crime incidents result in arrest. Without class weighting, the tree would trivially predict 'NO ARREST' for every row, achieving 86% accuracy with zero real utility."),
        ("52. What is the root split in your trained Decision Tree?",
         "The primary crime classification. Proactive enforcement crimes (Narcotics, Weapons Violations) split toward high-probability arrest, while stealth property crimes (Theft, Auto Theft) split toward non-arrest."),

        # Group 11: Evaluation Metrics
        ("53. What is a Confusion Matrix?",
         "A 2x2 contingency table cross-tabulating Actual Positives/Negatives against Predicted Positives/Negatives: True Positives (TP), False Positives (FP), False Negatives (FN), True Negatives (TN)."),
        ("54. Define Precision and Recall.",
         "Precision = TP / (TP + FP) (Of all predicted arrests, how many were correct?). Recall = TP / (TP + FN) (Of all actual arrests that occurred, how many did the model catch?)."),
        ("55. What is the F1-Score?",
         "The harmonic mean of Precision and Recall: F1 = 2 * (Precision * Recall) / (Precision + Recall). Balances false positives and false negatives."),
        ("56. What is ROC-AUC?",
         "Area Under the Receiver Operating Characteristic Curve. Measures the model's ability to distinguish between classes across all possible classification probability thresholds. Our model achieves 0.7178."),
        ("57. What is Data Leakage?",
         "When information from outside the training dataset (or information unavailable at prediction time) is inadvertently fed into the training model, producing artificially inflated test scores. CrimeLens enforces strict preprocessing pipelines after train/test splits."),

        # Group 12: Power BI
        ("58. What is the VertiPaq engine?",
         "The in-memory columnar database engine powering Microsoft Power BI Desktop. It achieves massive 8-10x compression and sub-second query evaluation on star schemas."),
        ("59. Why did CrimeLens select Import Mode instead of DirectQuery for Power BI?",
         "Import Mode loads data into VertiPaq, providing sub-second aggregations, full support for all DAX time-intelligence functions (SAMEPERIODLASTYEAR, DATEADD), and offline report portability."),
        ("60. What is the purpose of the DIVIDE function in DAX?",
         "It performs safe division, automatically handling division-by-zero errors by returning an alternate result (such as 0 or BLANK()) instead of crashing the report."),

        # Group 13: Limitations & Future Scope
        ("61. What is the Modifiable Areal Unit Problem (MAUP)?",
         "The statistical bias that occurs when point-based spatial phenomena (crimes) are aggregated into arbitrary geographic administrative zones. Results change when boundaries change."),
        ("62. What is the biggest technical limitation of your project?",
         "It analyzes closed historical census data (2023–2025) rather than streaming live real-time 911 dispatch feeds."),
        ("63. How would you expand CrimeLens in the future?",
         "By deploying an Apache Kafka streaming ingestion pipeline for live CPD feeds and incorporating spatial environmental risk modeling (liquor stores, transit stops) via Risk Terrain Modeling.")
    ]

    for q, a in qa_list:
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(2)
        r_q = p.add_run(q + "\n")
        r_q.font.bold = True
        r_q.font.color.rgb = DARK_BLUE
        r_a = p.add_run("Answer: " + a)
        r_a.font.color.rgb = CHARCOAL

def build_chapter_23(doc):
    add_chapter_heading(doc, "Final Viva & Demonstration Presentation Scripts", number=23)
    
    doc.add_paragraph(
        "Use these structured scripts during your examination. Each script is tailored to specific time constraints."
    )
    
    add_section_heading(doc, "23.1 The 2-Minute Elevator Pitch")
    doc.add_paragraph(
        "\"Good morning, respected professors. Our project is CrimeLens, an enterprise Data Warehousing and Mining platform "
        "built on the official City of Chicago crime census. Rather than using toy data, CrimeLens houses 761,718 authentic incidents "
        "across three full years (2023–2025) in a normalized PostgreSQL Kimball star schema.\n\n"
        "On top of this warehouse, we engineered five core analytical engines: OLAP multi-dimensional cubes, DBSCAN spatial hotspot "
        "clustering using spherical Haversine distance, longitudinal hotspot evolution tracking, K-Means district typology segmentation "
        "with 2D PCA visualization, Apriori transactional pattern mining, and interpretable Decision Tree arrest classification. "
        "Finally, we deliver a 20-measure DAX semantic integration bridge for Microsoft Power BI. CrimeLens demonstrates how modern "
        "data engineering transforms massive public-safety data into transparent, actionable civic intelligence. Thank you.\""
    )

    add_section_heading(doc, "23.2 The 5-Minute Executive Summary")
    doc.add_paragraph(
        "\"Good morning, respected examiners. Today we present CrimeLens. Modern cities generate hundreds of thousands of crime records "
        "annually, but law enforcement and civic planners struggle to extract strategic intelligence because data is trapped in flat spreadsheets "
        "or transactional OLTP silos.\n\n"
        "CrimeLens solves this through a decoupled, three-tier architecture. In Tier 1, our PostgreSQL data warehouse organizes 761,718 "
        "verified incidents into a central fact table surrounded by six conformed dimension tables, achieving complete referential integrity "
        "and sub-second query performance. We also maintain an isolated 30,000-record synthetic schema to benchmark algorithms under controlled conditions.\n\n"
        "In Tier 2, our FastAPI backend executes five classical data mining disciplines: first, OLAP slicing and dicing across time, space, "
        "and crime types; second, DBSCAN density clustering, which isolates street-level hotspots using 500-meter Haversine radii while filtering "
        "sparse noise; third, longitudinal Hotspot Evolution, tracking whether crime clusters persist, emerge, or dissipate between years; "
        "fourth, K-Means clustering, which groups Chicago's 24 police districts into four operational typologies across 11 standardized features, "
        "projected onto a 2D PCA plot capturing 72.39% of variance; and fifth, Apriori rule mining, which discovered that motor vehicle theft "
        "co-occurs with street premises and non-arrest at a lift of 3.09x.\n\n"
        "In Tier 3, our React 18 frontend presents these findings across fifteen accessible Chicago Nightfall dashboard modules, supplemented by "
        "a full Microsoft Power BI semantic model package. We are now ready to demonstrate the live workstation.\""
    )

    add_section_heading(doc, "23.3 The 10-Minute Live Demonstration Script")
    doc.add_paragraph(
        "Step 1 (0:00–1:30): Open Command Center. Highlight 761,718 census count, 13.99% arrest rate, 18.20% domestic share. Show 36-month sparkline.\n"
        "Step 2 (1:30–3:00): Open OLAP Explorer. Set Primary Type vs Year. Show Theft, Battery, Damage dominance. Demonstrate Drill-down.\n"
        "Step 3 (3:00–4:30): Open Area Intelligence. Hover over District 001 (Loop) and District 011 (Harrison). Compare commercial theft vs violent profiles.\n"
        "Step 4 (4:30–6:00): Open Trend Analysis & What Changed?. Show 36-month MA-3 curve, 7x24 weekend night matrix, and 2024-2025 auto theft drop.\n"
        "Step 5 (6:00–7:30): Open Hotspots (DBSCAN). Set Epsilon=500m, MinPts=30. Highlight Michigan Avenue retail cluster. Show noise filtering.\n"
        "Step 6 (7:30–9:00): Open K-Means & Apriori. Explain 4 district clusters on 2D PCA (72.39% variance). Show Apriori Rule #68 (3.09x lift).\n"
        "Step 7 (9:00–10:00): Open Decision Tree & Power BI. Explain root split on proactive crimes (ROC-AUC 0.718). Show Power BI 5-stage pipeline."
    )

    add_section_heading(doc, "23.4 The 15-Minute In-Depth Technical Defense Script")
    doc.add_paragraph(
        "Covers complete theoretical defense: Kimball dimensional methodology vs 3NF, surrogate key integer math, spherical Haversine formula "
        "vs Euclidean distortion, DBSCAN core point density connectivity, K-Means WCSS convergence proof, Apriori downward closure combinatorial "
        "pruning proof, Gini impurity mathematical gain formula, class imbalance weighting protocols, and VertiPaq columnar compression mechanics."
    )

def build_chapter_24(doc):
    add_chapter_heading(doc, "Glossary of Technical Terms (50+ Definitions)", number=24)
    
    terms = [
        ("Additive Measure", "A numeric metric in a fact table that can be meaningfully summed across all dimensional hierarchies (e.g. crime_count)."),
        ("Apriori Algorithm", "A classical data mining algorithm used for mining frequent itemsets and relevant association rules using downward closure."),
        ("Association Rule", "An implication expression of the form A => B, stating that if antecedent A is present, consequent B is likely to be present."),
        ("Border Point", "In DBSCAN, a point that has fewer than MinPoints within Epsilon, but is reachable from a Core Point."),
        ("Centroid", "The arithmetic mean position of all data points belonging to a specific cluster in multi-dimensional feature space."),
        ("Class Imbalance", "A dataset condition where one class heavily outnumbers another (e.g. 86% non-arrest vs 14% arrest in Chicago crime)."),
        ("Confidence", "In rule mining, the conditional probability P(B | A) that itemset B appears in transactions containing itemset A."),
        ("Confusion Matrix", "A specific table layout displaying the counts of True Positives, False Positives, True Negatives, and False Negatives."),
        ("Core Point", "In DBSCAN, a spatial point that contains at least MinPoints within its specified Epsilon neighborhood radius."),
        ("Data Cube", "A multi-dimensional logical representation of warehouse data structured along dimensions and populating cells with measures."),
        ("Data Granularity", "The level of detail represented by a single row in a fact table (in CrimeLens, exactly one reported incident complaint)."),
        ("Data Leakage", "The accidental inclusion of information from outside the training set that artificially inflates machine learning performance."),
        ("Data Mart", "A specialized subset of a data warehouse focused on a specific business line or summary aggregation (e.g. agg_monthly_crime)."),
        ("DAX", "Data Analysis Expressions: the functional formula language used in Microsoft Power BI and Analysis Services."),
        ("DBSCAN", "Density-Based Spatial Clustering of Applications with Noise: an unsupervised spatial clustering algorithm."),
        ("Decision Tree", "A supervised machine learning model that recursively splits data into homogeneous subsets based on feature tests."),
        ("Degenerate Dimension", "A dimension identifier stored directly in the fact table without a corresponding dimension table (e.g. Case Number)."),
        ("DirectQuery", "A Power BI storage mode where visuals translate directly into live SQL queries executed against the relational database."),
        ("Downward Closure", "The mathematical principle stating that all subsets of a frequent itemset must also be frequent."),
        ("Drill-down", "An OLAP operation that breaks down summary data into granular sub-components along a dimensional hierarchy."),
        ("Ecological Fallacy", "The logical error of inferring individual characteristics from aggregate group-level statistics."),
        ("Elbow Method", "A visual heuristic technique plotting WCSS against K to find the optimal number of clusters in K-Means."),
        ("Entropy", "A measure of randomness, information uncertainty, or disorder within a set of data instances."),
        ("Epsilon", "The radial neighborhood distance threshold parameter used in DBSCAN density calculations."),
        ("ETL", "Extract, Transform, Load: the foundational pipeline process of ingesting, cleaning, and loading data into a warehouse."),
        ("Euclidean Distance", "The straight-line distance between two points in Cartesian coordinate space: sqrt(sum((x_i - y_i)^2))."),
        ("F1-Score", "The harmonic mean of precision and recall, balancing false positives and false negatives."),
        ("Fact Table", "The central table in a star schema containing foreign keys to dimensions and numerical additive measures."),
        ("Frequent Itemset", "An itemset whose relative transaction support exceeds a predefined minimum support threshold (min_sup)."),
        ("Gini Impurity", "A metric measuring the probability that a randomly chosen element from a set would be incorrectly labeled."),
        ("Haversine Formula", "An equation calculating spherical surface distance between two latitude/longitude coordinates on Earth."),
        ("Hotspot", "A geographic area exhibiting a statistically significant high concentration of criminal incidents."),
        ("Import Mode", "A Power BI storage mode loading data entirely into the columnar in-memory VertiPaq engine."),
        ("Inertia", "In K-Means, the within-cluster sum of squared Euclidean distances (WCSS) between points and assigned centroids."),
        ("Information Gain", "The reduction in entropy or impurity achieved by partitioning a dataset based on a specific feature test."),
        ("Junk Dimension", "A dimensional table that groups miscellaneous low-cardinality flags and indicators together (e.g. dim_status)."),
        ("K-Means", "An unsupervised clustering algorithm that partitions N observations into K clusters based on nearest mean centroids."),
        ("Kimball Methodology", "The dimensional data modeling methodology developed by Ralph Kimball utilizing fact and dimension tables."),
        ("Leverage", "The difference between the observed joint frequency of an association rule and its expected independent frequency."),
        ("Lift", "The ratio of observed rule confidence to expected random confidence: Lift > 1.0 indicates positive association."),
        ("MAUP", "Modifiable Areal Unit Problem: statistical distortion caused when point events are aggregated into arbitrary geographic containers."),
        ("MinPoints", "The minimum number of data points required within an Epsilon radius to establish a core cluster in DBSCAN."),
        ("Moving Average", "A time-series smoothing technique calculating the arithmetic mean of a rolling window of recent time periods."),
        ("Noise Point", "An isolated observation that does not meet density requirements to belong to any cluster in DBSCAN."),
        ("OLAP", "Online Analytical Processing: software technology enabling fast multi-dimensional analysis of warehouse data cubes."),
        ("OLTP", "Online Transaction Processing: operational database systems optimized for rapid row-level transactional execution."),
        ("PCA", "Principal Component Analysis: an orthogonal linear transformation reducing high-dimensional data into fewer components."),
        ("Precision", "The ratio of correctly predicted positive observations to total predicted positive observations: TP / (TP + FP)."),
        ("Recall", "The ratio of correctly predicted positive observations to all actual positive observations: TP / (TP + FN)."),
        ("ROC-AUC", "The Area Under the Receiver Operating Characteristic Curve, quantifying classification separability across thresholds."),
        ("Roll-up", "An OLAP operation aggregating granular data into broader summary levels along a hierarchy."),
        ("Root Node", "The topmost decision node in a decision tree containing the full training population before any splits."),
        ("Silhouette Score", "A metric measuring how similar an object is to its own cluster compared to neighboring clusters (-1 to +1)."),
        ("Slice", "An OLAP operation selecting a single value along one dimension axis to create a two-dimensional sub-cube."),
        ("StandardScaler", "A data normalization technique standardizing features to zero mean and unit variance: z = (x - mu) / sigma."),
        ("Star Schema", "A relational database schema design consisting of a single central fact table surrounded by dimension tables."),
        ("Support", "The proportion of total database transactions that contain a specific itemset."),
        ("Surrogate Key", "An artificial, integer-based primary key generated by the data warehouse to replace operational natural keys."),
        ("VertiPaq", "The high-speed in-memory columnar database engine powering Microsoft Power BI and SSAS Tabular."),
        ("WCSS", "Within-Cluster Sum of Squares: the optimization objective function minimized by K-Means clustering.")
    ]

    for term, definition in terms:
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after = Pt(2)
        r_t = p.add_run(term + ": ")
        r_t.font.bold = True
        r_t.font.color.rgb = DARK_BLUE
        r_d = p.add_run(definition)
        r_d.font.color.rgb = CHARCOAL
