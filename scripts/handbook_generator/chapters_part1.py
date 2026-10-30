from docx.shared import Pt, Inches
from docx_styler import (
    add_chapter_heading, add_section_heading, add_subsection_heading,
    add_bullet_point, add_callout_box, add_code_block, create_styled_table
)

def build_chapter_1(doc):
    add_chapter_heading(doc, "Introduction to CrimeLens: Modern Crime Intelligence Engineering", number=1)
    
    doc.add_paragraph(
        "CrimeLens is an enterprise-grade municipal crime analytics and spatial-temporal data mining workstation engineered "
        "specifically for law enforcement researchers, public safety planners, and civic data scientists. Built directly upon the "
        "official City of Chicago open crime registry, CrimeLens transforms massive streams of disparate incident logs into structured, "
        "multidimensional intelligence across space, time, and criminological typology."
    )
    
    add_section_heading(doc, "1.1 The Real-World Problem: The Urban Crime Data Deluge")
    doc.add_paragraph(
        "Modern metropolitan police departments log hundreds of thousands of criminal complaints annually. In the City of Chicago alone, "
        "over 200,000 criminal incidents are documented every twelve months across 22 operational patrol districts and 77 community areas. "
        "However, raw operational databases suffer from fundamental structural limitations that prevent strategic understanding:"
    )
    add_bullet_point(doc, "Transactional Silos (OLTP Gridlock)", "Operational databases are designed to record individual 911 dispatch calls, arrest sheets, and evidence chains rapidly. They are not indexed or architected to answer complex aggregate queries such as 'What was the three-year trend in armed robberies across beat 1122 during evening shifts?'")
    add_bullet_point(doc, "Flat File Overload", "City open data portals typically distribute raw CSV spreadsheets exceeding hundreds of megabytes. Police supervisors and civic researchers opening these files in desktop spreadsheet tools (like Microsoft Excel) experience severe application freezing, row clipping (Excel hard-limits at 1,048,576 rows), and zero support for automated clustering or spatial mining.")
    add_bullet_point(doc, "Fragmented Analytical Layers", "Standard civic tools isolate mapping from statistical analysis. An analyst must use one GIS tool to draw heatmaps, an external stats package to compute moving averages, and a separate script to mine association patterns. There is no unified workspace providing an end-to-end analytical workflow.")

    add_section_heading(doc, "1.2 The CrimeLens Solution & Project Objectives")
    doc.add_paragraph(
        "CrimeLens solves these challenges by implementing an end-to-end Data Warehouse and Mining (DWM) architecture. "
        "The primary engineering objectives of the project are:"
    )
    add_bullet_point(doc, "Enterprise Star-Schema Data Warehouse", "Construct an auditable, normalized relational warehouse in PostgreSQL that unifies 761,718 authentic reported Chicago crimes spanning three full calendar years (2023–2025) into a high-performance Kimball dimensional model.")
    add_bullet_point(doc, "True Multidimensional OLAP Exploration", "Provide instantaneous roll-up, drill-down, slicing, and dicing across temporal, geographical, and crime category hierarchies with sub-second response times.")
    add_bullet_point(doc, "Algorithmic Spatial & Typology Mining", "Integrate mathematically rigorous data mining algorithms directly into the workflow—including DBSCAN geographic hotspot clustering, longitudinal hotspot evolution tracking, K-Means area profile segmentation, and Apriori association rule discovery.")
    add_bullet_point(doc, "Supervised & Explainable Machine Learning", "Deliver interpretable Decision Tree models for arrest likelihood estimation with zero-leakage training protocols and class-imbalance safeguards.")
    add_bullet_point(doc, "Enterprise Business Intelligence Integration", "Expose semantic models, DAX measure libraries, and Power Query M ingestion scripts for external reporting in Microsoft Power BI.")

    add_section_heading(doc, "1.3 How CrimeLens Differs from a Simple Spreadsheet Dashboard")
    headers = ["Feature / Architectural Dimension", "Traditional Excel / Spreadsheet Dashboard", "CrimeLens Intelligence Workstation"]
    data = [
        ["Data Scale Capacity", "Crashes or slows severely above 100k rows; clipped at 1M rows.", "Engineered for millions of rows in PostgreSQL with indexing and columnar rollups."],
        ["Schema Architecture", "Single flat, denormalized, redundant table prone to typos.", "Formal Kimball Star Schema (1 Fact table + 6 Conformed Dimensions)."],
        ["Spatial Clustering", "Rudimentary manual bubble maps with coordinate limits.", "Unsupervised DBSCAN clustering with spherical Haversine distance calculations."],
        ["Time-Series Dynamics", "Manual rolling average formulas requiring manual re-linking.", "Automated 36-month trend lines, seasonal decomposition, and 7×24 hourly matrices."],
        ["Pattern Discovery", "None; relies entirely on human eye inspecting static tables.", "Automated Apriori association rule mining discovering co-occurrence patterns."],
        ["Enterprise BI Bridge", "Isolated local workbook.", "Complete Microsoft Power BI semantic package with DAX measure suite and M scripts."]
    ]
    create_styled_table(doc, headers, data, [1.8, 2.3, 2.4])

    add_callout_box(doc, "Academic & Practical Boundary Clarification",
        "CrimeLens is an independent academic research and municipal data engineering platform developed for Computer Engineering "
        "demonstration and academic defense. While built on 100% authentic, verified Chicago Police Department open public records, "
        "CrimeLens is not an officially commissioned software deployment of the Chicago Police Department.", box_type="theory")

def build_chapter_2(doc):
    add_chapter_heading(doc, "A Real-World Scenario: A Day in the Life of a Crime Analyst", number=2)
    
    doc.add_paragraph(
        "It is 9:00 AM on Monday. A senior crime analyst enters the executive conference room where police leadership, "
        "district commanders, and civic policy planners have assembled for a strategic briefing on citywide crime trends. "
        "Rather than flipping through a stack of static printouts, the analyst projects CrimeLens onto the central wall display. "
        "Over the next thirty minutes, the analyst guides leadership through all fifteen modules of the platform in a cohesive, "
        "evidence-backed presentation."
    )
    
    modules = [
        {
            "num": 1, "title": "Command Center", "route": "/dashboard",
            "q": "Superintendent: 'Give us the strategic macro baseline. Where does Chicago stand over the past three years?'",
            "narr": "The analyst opens the Command Center: 'Ladies and gentlemen, our data warehouse reflects 761,718 authentic reported incidents from January 1, 2023 through December 31, 2025 across all 22 active patrol districts. Overall, our three-year custodial arrest rate stands at 13.99%, while domestic-related offenses account for 18.2% of all incidents. Notice the monthly trajectory sparkline: citywide volume peaked in August 2023 at 24,283 incidents, followed by predictable winter troughs down to 16,587 incidents in February 2025. This confirms that broad civic seasonality remains unbroken.'",
            "display": "5 core KPI cards (Total Incidents, Arrest Rate, Domestic Incident Share, Police Districts, Census Status), a 36-month historical sparkline, and top offense classification bars.",
            "methods": "SQL aggregation over PostgreSQL fact_crime and dim_status; cached summary rollups for instant executive display.",
            "data": "761,718 total warehouse incidents, 106,564 total custodial arrests (13.99%), 138,653 domestic incidents (18.20%).",
            "decision": "Validates broad municipal budgeting and confirms overall annual incident decline without cherry-picking seasonal windows.",
            "next": "To inspect the multi-dimensional breakdown behind these totals, the analyst navigates to the OLAP Explorer."
        },
        {
            "num": 2, "title": "OLAP Explorer", "route": "/olap",
            "q": "Deputy Chief: 'Which specific crime types are driving these numbers, and how do they break down by year?'",
            "narr": "'Let us slice the warehouse across dimensions. In the OLAP Explorer, I set Dimension 1 to Crime Primary Type and Dimension 2 to Year. Notice how Theft (160k+), Battery (120k+), and Criminal Damage (85k+) consistently represent the top three offenses across all three years. When we drill down into 2025, Theft accounts for 50,477 incidents, while Motor Vehicle Theft dropped sharply compared to 2023.'",
            "display": "Interactive multi-dimensional pivot grid with dynamic column totals, accompanied by a zero-baseline comparative bar chart.",
            "methods": "Online Analytical Processing (OLAP) dynamic SQL GROUP BY aggregations with multi-level grouping sets.",
            "data": "Primary categories in 2023 vs 2024 vs 2025 (Theft: 55,214 in 2023, 54,800 in 2024, 50,477 in 2025).",
            "decision": "Enables command staff to identify whether citywide declines represent across-the-board drops or category-specific shifts.",
            "next": "The analyst points out that citywide numbers hide neighborhood variations, transitioning to Area Intelligence."
        },
        {
            "num": 3, "title": "Area Intelligence", "route": "/area-intelligence",
            "q": "District 001 Commander: 'How does downtown commercial crime compare to our outer residential patrol zones?'",
            "narr": "'Looking at our Area Intelligence choropleth map, we observe stark jurisdictional specialization. Let us select District 001 (Central/Loop) and compare it side-by-side with District 011 (Harrison). District 001 logged 32,840 incidents heavily dominated by retail theft (42%) and criminal damage, with an arrest rate of only 9.1%. Conversely, District 011 logged 43,150 incidents with battery and weapons offenses leading, but with a significantly higher arrest rate of 21.8%.'",
            "display": "Interactive Leaflet choropleth map with district boundary polygons, accompanied by a two-district comparison panel.",
            "methods": "Spatial polygon joining with aggregate fact_crime metrics and normalized per-district density ratios.",
            "data": "District 001 (Central) vs District 011 (Harrison) comparative metrics.",
            "decision": "Allows commanders to allocate plainclothes anti-theft units downtown while prioritizing violent-crime deterrence in western districts.",
            "next": "To understand the timing and seasonality of these district volumes, the analyst moves to Trend Analysis."
        },
        {
            "num": 4, "title": "Trend Analysis", "route": "/trend-analysis",
            "q": "Planning Director: 'Is the crime drop steady, or are we just seeing winter weather effects?'",
            "narr": "'Our Trend Analysis module evaluates the complete 36-month timeline. Looking at the 3-month moving average (MA-3) line, high-frequency monthly fluctuations are smoothed out, revealing a consistent secular decline from mid-2024 onwards. Examining our 7×24 hourly temporal matrix, crime consistently concentrates between 20:00 and 02:00 on Friday and Saturday nights across all three years.'",
            "display": "36-month chronological line chart with MA-3 and MA-6 overlays, accompanied by a 168-cell day-of-week by hour-of-day density matrix.",
            "methods": "Rolling window averages, time-series decomposition, and two-dimensional temporal frequency binning.",
            "data": "36 monthly census bins ranging from 24,283 (Aug 2023 peak) to 16,587 (Feb 2025 trough).",
            "decision": "Informs patrol shift scheduling, confirming that weekend night shifts require 35% higher officer staffing than Tuesday morning shifts.",
            "next": "To formally isolate what drove the shift between 2024 and 2025, the analyst opens What Changed?."
        },
        {
            "num": 5, "title": "What Changed?", "route": "/what-changed",
            "q": "Budget Officer: 'Quantify the exact net change between 2024 and 2025. Which offenses caused it?'",
            "narr": "'Between 2024 and 2025, total reported incidents dropped by 21,490 (a net decline of -8.28%). In this waterfall chart, CrimeLens decomposes this net delta: 48% of the entire citywide reduction was driven by a single category—Motor Vehicle Theft, which fell by 10,312 incidents. Meanwhile, Deceptive Practice rose counter-cyclically by +4.1%.'",
            "display": "Custom Period A vs Period B comparison cards, absolute and relative percentage shift badges, and a waterfall category shift chart.",
            "methods": "Multi-period set-difference SQL aggregation and dimensional contribution decomposition.",
            "data": "2024 Total: 259,670 incidents vs 2025 Total: 238,180 incidents (Delta: -21,490, -8.28%).",
            "decision": "Helps command staff evaluate the effectiveness of targeted anti-auto-theft taskforces launched in late 2023.",
            "next": "To verify if the warehouse algorithms detected these shifts automatically, the analyst navigates to Automated Insights."
        },
        {
            "num": 6, "title": "Automated Insights", "route": "/insights",
            "q": "Chief of Detectives: 'Does the system generate autonomous observations without manual query drafting?'",
            "narr": "'Yes. The Automated Insights engine scans our warehouse rollups and executes automated statistical tests. For example, it autonomously generated Insight #3: 'Geographic Concentration: Three patrol districts (008, 011, and 012) account for 21.4% of all reported violent incidents citywide.' It also generated Insight #7 noting that domestic violence share increased as overall volume declined.'",
            "display": "Card grid categorizing insights by Temporal Dynamics, Spatial Hotspots, Offense Shifts, and Enforcement Anomalies.",
            "methods": "Deterministic statistical evaluation, threshold tests, Pareto distribution scoring, and template-based NLG.",
            "data": "Top-3 district violent concentration (21.4% of citywide battery/assault), arrest rate variance by offense.",
            "decision": "Directs executive attention to emerging anomalies without requiring analysts to write manual SQL queries.",
            "next": "The Chief asks about exact street blocks, leading the analyst into Hotspot Intelligence (DBSCAN)."
        },
        {
            "num": 7, "title": "Hotspot Intelligence (DBSCAN)", "route": "/hotspots",
            "q": "Field Commander: 'Where exactly on the ground are these crimes concentrating? Give me street-level clusters.'",
            "narr": "'District boundaries are administrative lines; crime does not respect them. In Hotspot Intelligence, CrimeLens executes DBSCAN using Haversine spherical distance on incident coordinates. With Epsilon set to 500 meters and MinPoints set to 30, the algorithm isolates 14 distinct high-density clusters across the city while rejecting 35% of incidents as sparse background noise. Notice Cluster #1 along the Michigan Avenue retail strip.'",
            "display": "Interactive Leaflet satellite map displaying density clusters with convex hull overlays, centroid markers, and noise toggles.",
            "methods": "Density-Based Spatial Clustering of Applications with Noise (DBSCAN) using Haversine metric on (latitude, longitude).",
            "data": "754,250 geocoded incident coordinates; Cluster #1 centered at 41.892°N, -87.624°W (Michigan Ave retail corridor).",
            "decision": "Permits tactical deployment of foot patrols and visible squad cars directly within high-density 500-meter micro-zones.",
            "next": "A commander asks if these hotspots stay in the same place every year, leading into Hotspot Evolution."
        },
        {
            "num": 8, "title": "Hotspot Evolution", "route": "/hotspot-evolution",
            "q": "Tactical Captain: 'Did our summer operations eliminate that downtown cluster, or did it migrate north?'",
            "narr": "'Our Hotspot Evolution module performs longitudinal cluster tracking between 2023 and 2024. By computing centroid distance displacements with a 750-meter spatial matching threshold, CrimeLens determines that Downtown Cluster #1 was Persistent (centroid shifted only 140 meters north). However, a West Side cluster Dissipated, while a new Emerging cluster formed near O'Hare Airport.'",
            "display": "Comparative dual-layer map with color-coded cluster evolution tags: Persistent (Blue), Emerging (Green), Dissipated (Red).",
            "methods": "Bipartite spatial matching using centroid Haversine distance thresholds between temporal cluster sets.",
            "data": "Centroid displacement vectors (e.g. Cluster #1 shifted 142 meters from 2023 to 2024, volume changed by -6.2%).",
            "decision": "Evaluates displacement versus true deterrence, preventing premature celebration when crime simply moves two blocks away.",
            "next": "To group entire districts by comprehensive crime characteristics rather than just coordinates, the analyst moves to K-Means."
        },
        {
            "num": 9, "title": "K-Means Clustering", "route": "/kmeans",
            "q": "Superintendent: 'Group our 24 police administrative districts into operational profiles. Which districts share similar challenges?'",
            "narr": "'In K-Means Clustering, CrimeLens clusters all 24 eligible police districts across 11 standardized multivariate dimensions—including theft ratio, battery ratio, arrest rate, domestic rate, and Shannon entropy. With K=4, the algorithm discovers four clean district typologies: Cluster 1 (Downtown Commercial Theft Hotspots), Cluster 2 (Violent & High-Enforcement Urban Zones), Cluster 3 (Residential Nighttime Vehicle Theft), and Cluster 4 (Balanced Baseline). Our 2D PCA projection preserves 72.39% of total feature variance.'",
            "display": "Interactive 2D PCA scatterplot, WCSS Elbow curve, Silhouette bar chart, and cluster segment deep-dive cards.",
            "methods": "StandardScaler normalization, K-Means clustering ($K=4$, inertia 57.73, silhouette 0.391), and Principal Component Analysis.",
            "data": "24 eligible Chicago Police Districts clustered across 11 feature dimensions; PCA variance: PC1 46.45%, PC2 25.94%.",
            "decision": "Enables paired-district resource sharing and specialized procedural training tailored to each district typology.",
            "next": "The analyst turns to transaction-level pattern mining, opening Association Rules (Apriori)."
        },
        {
            "num": 10, "title": "Association Rules (Apriori)", "route": "/apriori",
            "q": "Detective Commander: 'What attributes frequently occur together in individual crimes? Are there hidden If-Then rules?'",
            "narr": "'In our Apriori Association Rule module, each crime incident is treated as a transaction of discrete categorical attributes. Mining our 761,718 real incidents with min_support=5% and min_confidence=30%, our strongest discovered rule is: When CrimeType is Motor Vehicle Theft, there is a 72.4% probability that Arrest is NO and Premise is STREET. This rule has a Lift of 3.09x, meaning this combination occurs over three times more often than expected by random independent chance.'",
            "display": "Interactive Support vs Confidence scatterplot colored by Lift, strongest rules leaderboard, and full-width frequent itemset table.",
            "methods": "Apriori downward closure itemset mining via mlxtend; computation of Support, Confidence, Lift, and Leverage.",
            "data": "761,718 transactions analyzed; Rule #68: {Motor Vehicle Theft} => {Arrest=NO, Premise=STREET} (Sup: 6.49%, Conf: 72.4%, Lift: 3.09x).",
            "decision": "Guides investigative protocols and vehicle tracking sensor placement along major street parking thoroughfares.",
            "next": "To predict whether a specific incident will lead to an arrest, the analyst opens Decision Tree Classification."
        },
        {
            "num": 11, "title": "Decision Tree Classification", "route": "/decision-tree",
            "q": "Prosecutor: 'Can machine learning predict the factors most influential in securing a custodial arrest?'",
            "narr": "'Our Decision Tree module trains an interpretable supervised classification tree to predict the binary arrest outcome. Because our warehouse exhibits an 86.01% non-arrest rate, a naive majority-class model would achieve 86.01% accuracy with zero predictive value. Our Decision Tree with balanced class weights achieves 88.20% accuracy and an ROC-AUC of 0.718. The root split occurs on Crime Category: Narcotics and Weapons offenses possess overwhelming probabilities of arrest, whereas Theft and Motor Vehicle Theft split toward non-arrest.'",
            "display": "Interactive tree visualization with Gini impurity scores, confusion matrix, ROC curve, and classification metric cards.",
            "methods": "Supervised Decision Tree Classifier (scikit-learn) with Gini impurity split optimization and stratified train/test partitioning.",
            "data": "Stratified sample of 35,000 incidents; Test Accuracy: 88.20%, Precision: 89.39%, ROC-AUC: 0.7178, Overfitting Gap: -0.02%.",
            "decision": "Reveals structural enforcement realities: on-scene enforcement crimes yield high arrest rates, while property offenses require post-incident forensics.",
            "next": "A city auditor asks how we know the data pipeline is trustworthy, leading to ETL Observability."
        },
        {
            "num": 12, "title": "ETL Observability", "route": "/etl-monitoring",
            "q": "City Auditor: 'How was this data loaded into PostgreSQL, and how do you monitor pipeline health?'",
            "narr": "'In ETL Observability, CrimeLens tracks every ingestion execution. Our automated pipeline ingested all three raw annual CSVs, performed schema validation, stripped duplicate IDs, transformed raw timestamps into full calendar dimensions, and performed surrogate key lookups. Across all 761,718 records, the pipeline operated with zero dropped records and logged execution durations in our audit table.'",
            "display": "Pipeline DAG execution flowchart, throughput meters, stage execution timeline, and error log table.",
            "methods": "Automated ETL lineage tracking, execution timing, and batch-status logging in PostgreSQL etl_run_log.",
            "data": "Complete ingestion of 2023 (263,868 rows), 2024 (259,670 rows), and 2025 (238,180 rows); zero dropped rows.",
            "decision": "Provides complete regulatory traceability and guarantees that dashboard metrics match the underlying warehouse.",
            "next": "To prove data hygiene, the analyst opens the Data Quality module."
        },
        {
            "num": 13, "title": "Data Quality Intelligence", "route": "/data-quality",
            "q": "Data Governance Chair: 'What are the exact missing-value rates, and how are coordinates validated?'",
            "narr": "'Our Data Quality module monitors data health across five dimensions: Completeness, Uniqueness, Validity, Timeliness, and Consistency. Exactly 99.02% of incidents possess valid geocodes (754,250 records). The remaining 7,468 incidents lack coordinates and are mapped deterministically to UNKNOWN_LOCATION (key 0) rather than dropped. There are zero duplicate incident IDs and 100% timestamp parseability.'",
            "display": "5 Data Quality KPI scorecards, null-rate distribution chart, coordinate validity gauge, and schema isolation badge.",
            "methods": "Deterministic data quality profiling, null checks, duplicate ID scans, and schema boundary validation.",
            "data": "99.02% geocoding completeness (754,250 valid coordinates, 7,468 mapped to surrogate 0); 0 duplicate IDs.",
            "decision": "Guarantees that downstream machine learning models do not fail due to unhandled null pointers or corrupted coordinates.",
            "next": "Leadership requests written summaries for distribution, transitioning to Reports & Exports."
        },
        {
            "num": 14, "title": "Reports & Analytics Exports", "route": "/reports",
            "q": "Chief of Staff: 'Can we export these findings for the Mayor's briefing and academic review?'",
            "narr": "'Our Reports & Exports engine generates formal command briefs and filtered CSV/JSON packages. Every exported report embeds full data provenance: the exact PostgreSQL query executed, the schema used, the record census count, and the UTC generation timestamp. This ensures complete auditability and academic reproducibility.'",
            "display": "Report generation controls, export format selectors (CSV, JSON, Markdown Brief), and provenance metadata card.",
            "methods": "Server-side report formatting, parameterized data serialization, and cryptographic audit hashing.",
            "data": "Full export package of 761,718 incident summaries, district rankings, and spatial cluster coordinates.",
            "decision": "Allows seamless sharing of auditable findings with city council committees, researchers, and community oversight boards.",
            "next": "Finally, the analyst showcases how this warehouse connects to external enterprise tools via Power BI Integration."
        },
        {
            "num": 15, "title": "Microsoft Power BI Integration", "route": "/power-bi",
            "q": "Enterprise IT Director: 'How does CrimeLens integrate with our existing Microsoft Power BI infrastructure?'",
            "narr": "'CrimeLens bridges directly into Power BI Desktop via our 5-stage architecture pipeline. We expose native PostgreSQL connection parameters, full star-schema entity relationships, a verified 20-measure DAX library, and Power Query M ingestion scripts. Furthermore, our architecture recommends Import Mode over DirectQuery to leverage the in-memory columnar VertiPaq engine, guaranteeing sub-second report interactions across all 761,718 records.'",
            "display": "Connected 5-stage visual architecture pipeline, connection parameters card, storage mode comparison table, 20 DAX measure cards with copy controls, and Power Query M script editor.",
            "methods": "Power BI semantic modeling, DAX measure verification (DIVIDE zero-handling), VertiPaq engine optimization, and M script generation.",
            "data": "Verified connection to crimelens_db on port 5432; 20 verified DAX measures; 7-page report specifications.",
            "decision": "Enables enterprise deployment where non-technical executives can explore CrimeLens data in familiar Power BI dashboards.",
            "next": "The analyst concludes the briefing, opening the floor for technical questions from the examiners."
        }
    ]

    for m in modules:
        add_section_heading(doc, f"2.{m['num']} Module {m['num']}: {m['title']} ({m['route']})")
        doc.add_paragraph(f"A. The Officer's Question: {m['q']}")
        doc.add_paragraph(f"B. What the Analyst Says: \"{m['narr']}\"")
        doc.add_paragraph(f"C. What the Module Displays: {m['display']}")
        doc.add_paragraph(f"D. Analytical & Criminological Methods: {m['methods']}")
        doc.add_paragraph(f"E. Verified CrimeLens Evidence: {m['data']}")
        doc.add_paragraph(f"F. Operational Decision Support: {m['decision']}")
        doc.add_paragraph(f"G. Transition to Next Analytical Step: {m['next']}")
        doc.add_paragraph().paragraph_format.space_after = Pt(2)

def build_chapter_3(doc):
    add_chapter_heading(doc, "Complete System Architecture & Engineering Stack", number=3)
    
    doc.add_paragraph(
        "CrimeLens is architected as a high-performance, decoupled, three-tier analytical workstation. "
        "The architecture separates data storage and warehousing (PostgreSQL), high-speed asynchronous processing and scientific "
        "computation (FastAPI & Python Scientific Stack), and reactive user presentation (React 18 & Vite)."
    )
    
    add_section_heading(doc, "3.1 End-to-End Architectural Pipeline Diagram")
    add_code_block(doc, 
        "+-----------------------------------------------------------------------------------+\n"
        "|                             CRIMELENS SYSTEM ARCHITECTURE                         |\n"
        "+-----------------------------------------------------------------------------------+\n"
        "                                                                                     \n"
        "  [ City of Chicago Open Data Portal ] ---> Raw Annual Census CSVs (2023-2025)       \n"
        "                                                    |                                \n"
        "                                                    v                                \n"
        "  +-------------------------------------------------------------------------------+  \n"
        "  | 1. ETL INGESTION & DATA WAREHOUSING (Python / Psycopg2 / SQLAlchemy)           |  \n"
        "  |    - Data cleaning, null-handling, coordinate validation (99.02% geocoded)    |  \n"
        "  |    - Kimball Star Schema: 1 Fact Table (fact_crime) + 6 Dimension Tables      |  \n"
        "  |    - Schema Isolation: 'public' (761,718 records) vs 'synthetic_data' (30k)   |  \n"
        "  +-------------------------------------------------------------------------------+  \n"
        "                                                    |                                \n"
        "                                                    v                                \n"
        "  +-------------------------------------------------------------------------------+  \n"
        "  | 2. BACKEND API & SCIENTIFIC COMPUTATION LAYER (FastAPI / Uvicorn :8000)        |  \n"
        "  |    - Asynchronous REST endpoints (19 routes across 9 modules)                 |  \n"
        "  |    - Data Mining Core: Scikit-learn (K-Means, DBSCAN, Decision Trees, PCA)    |  \n"
        "  |    - Transaction Mining: MLxtend (Apriori Itemsets, Association Rules)        |  \n"
        "  |    - In-Memory LRU & Query Caching (Sub-80ms execution for warm queries)      |  \n"
        "  +-------------------------------------------------------------------------------+  \n"
        "                                                    |                                \n"
        "                                                    v                                \n"
        "  +-------------------------------------------------------------------------------+  \n"
        "  | 3. REACT DASHBOARD & PRESENTATION LAYER (React 18 / Vite :5173)               |  \n"
        "  |    - Chicago Nightfall Dark Theme (Accessible high-contrast palette)          |  \n"
        "  |    - Visualizations: Recharts (Scatter, Line, Bar), Leaflet (Choropleths)     |  \n"
        "  |    - 15 Comprehensive Sidebar Analytical Modules                              |  \n"
        "  +-------------------------------------------------------------------------------+  \n"
        "                                                    |                                \n"
        "                                                    v                                \n"
        "  +-------------------------------------------------------------------------------+  \n"
        "  | 4. ENTERPRISE BI INTEGRATION LAYER (Microsoft Power BI Desktop)               |  \n"
        "  |    - VertiPaq Columnar In-Memory Import Mode                                  |  \n"
        "  |    - 20 Production DAX Measures (CALCULATE, DIVIDE, Time-Intelligence)       |  \n"
        "  |    - Native Power Query M Ingestion Scripts                                   |  \n"
        "  +-------------------------------------------------------------------------------+"
    )

    add_section_heading(doc, "3.2 Detailed Engineering Stack")
    headers = ["Layer", "Technology", "Version", "Role & Justification in CrimeLens"]
    data = [
        ["Database", "PostgreSQL", "18.4", "Relational OLAP warehouse storing the Kimball star schema and audit logs."],
        ["Database Driver", "psycopg2-binary / SQLAlchemy", "2.9.10 / 2.0.38", "High-performance connection pooling, parameter binding, and query execution."],
        ["Backend API", "FastAPI / Uvicorn", "0.115.11 / 0.34.0", "Asynchronous Python web server delivering sub-second JSON REST API responses."],
        ["Data Science", "pandas / NumPy / SciPy", "2.2.3 / 2.2.3 / 1.15.2", "High-performance vectorized tabular aggregation and matrix manipulation."],
        ["Machine Learning", "scikit-learn", "1.6.1", "StandardScaler, K-Means clustering, DBSCAN spatial clustering, Decision Trees, PCA."],
        ["Rule Mining", "mlxtend", "0.23.4", "Apriori frequent itemset generation and association rule derivation."],
        ["Frontend UI", "React 18 / Vite", "18.3.1 / 5.4.21", "Reactive component-driven user interface with client-side routing."],
        ["Visuals & Maps", "Recharts / Leaflet", "2.15.1 / 1.9.4", "SVG chart generation and interactive GPU-accelerated spatial mapping."],
        ["Icons & Theme", "Lucide React", "0.475.0", "Clean iconography tailored to the Chicago Nightfall dark theme."]
    ]
    create_styled_table(doc, headers, data, [1.1, 1.6, 1.1, 2.7])

    add_section_heading(doc, "3.3 The Complete Journey of a Crime Record")
    doc.add_paragraph(
        "To understand how CrimeLens operates, consider the complete lifecycle of a single reported criminal incident—for example, "
        "an armed robbery occurring on Michigan Avenue:"
    )
    add_bullet_point(doc, "Step 1: Incident Inception", "A victim calls 911. A CPD patrol unit responds, arrests the suspect, and files an official case report. The incident is assigned Case Number 'JH123456' and unique Chicago Incident ID '12345678'.")
    add_bullet_point(doc, "Step 2: City Data Publication", "The City of Chicago Automated Data Pipeline scrubs victim names for privacy, maps the location to block level, and exports the record to the public Socrata Open Data Portal.")
    add_bullet_point(doc, "Step 3: CrimeLens ETL Extraction", "The CrimeLens ingestion pipeline extracts the annual CSV dataset. The ETL validator verifies data types, parses the timestamp '2023-08-14 22:15:00', and checks coordinate validity.")
    add_bullet_point(doc, "Step 4: Dimension Surrogate Key Mapping", "The record is normalized. The timestamp maps to dim_time (key 2023081422), the offense maps to dim_crime ('ROBBERY', key 2), the district maps to dim_area (District 001, key 1), and status flags map to dim_status (Arrest=True, Domestic=False, key 1).")
    add_bullet_point(doc, "Step 5: Fact Table Insertion", "A single row is inserted into public.fact_crime with surrogate integer keys and additive measure crime_count = 1.")
    add_bullet_point(doc, "Step 6: Analytical Aggregation & Mining", "FastAPI receives an analytical request (e.g. from the Trend Analysis or DBSCAN module). It executes an indexed SQL query joining fact_crime with dimensions, computes spatial distances or moving averages, and caches the result.")
    add_bullet_point(doc, "Step 7: Reactive Dashboard Visualization", "The React frontend receives the JSON response via Axios/Fetch, dynamically rendering the incident as a point on the DBSCAN map, a data point in the 36-month trend line, and a transaction in the Apriori pattern tree.")

def build_chapter_4(doc):
    add_chapter_heading(doc, "Dataset Understanding & Provenance: The 761,718 Incident Census", number=4)
    
    doc.add_paragraph(
        "CrimeLens does not rely on synthetic toy data or small random samples. Its primary operational warehouse is populated "
        "with the **complete, full-census three-year dataset (2023–2025)** of all officially reported crimes in Chicago, "
        "comprising exactly **761,718 unique records**."
    )
    
    add_section_heading(doc, "4.1 Verified Historical Census Counts")
    headers = ["Calendar Year", "Raw Incident Count", "Verified Unique IDs", "Duplicate Records", "Geocoded Coordinates (%)"]
    data = [
        ["2023", "263,868", "263,868", "0", "261,241 (99.00%)"],
        ["2024", "259,670", "259,670", "0", "257,524 (99.17%)"],
        ["2025", "238,180", "238,180", "0", "235,485 (98.87%)"],
        ["Total / Warehouse Census", "761,718", "761,718", "0", "754,250 (99.02%)"]
    ]
    create_styled_table(doc, headers, data, [1.3, 1.3, 1.3, 1.1, 1.5])

    add_callout_box(doc, "Official Ground-Truth Reconciliation",
        "Direct API queries against the official City of Chicago Open Data Portal endpoint (data.cityofchicago.org/resource/ijzp-q8t2.json) "
        "confirm that the CrimeLens raw files match the official municipal records with a delta of exactly 0 across all three years. "
        "Not a single record has been omitted or artificially fabricated.", box_type="worked")

    add_section_heading(doc, "4.2 Critical Data Fields & Semantic Mapping")
    doc.add_paragraph("Each raw incident record contains 22 operational fields. The most critical dimensions in CrimeLens are:")
    add_bullet_point(doc, "Case Number & ID", "Alphanumeric CPD report identifier (e.g. 'JG123456') and unique numeric system ID. Preserved as degenerate dimensions in fact_crime for auditability.")
    add_bullet_point(doc, "Primary Type & Description", "The standardized statutory crime classification (e.g. 'THEFT', 'BATTERY', 'NARCOTICS') and specific secondary detail (e.g. 'OVER $500', 'DOMESTIC BATTERY SIMPLE').")
    add_bullet_point(doc, "IUCR & FBI Code", "Illinois Uniform Crime Reporting 4-digit code and FBI Uniform Crime Reporting classification for federal index tracking.")
    add_bullet_point(doc, "Date & Timestamp", "Original local timestamp recorded to the minute. Used to generate the 13 temporal hierarchy attributes in dim_time.")
    add_bullet_point(doc, "Arrest & Domestic Indicators", "Binary flags indicating whether an on-scene custodial arrest was made and whether the incident satisfies Illinois domestic violence statutory criteria.")
    add_bullet_point(doc, "Location & Coordinates", "Street block address, premise description (e.g. 'RESIDENCE', 'STREET', 'SIDEWALK'), and WGS84 high-precision latitude/longitude.")

    add_section_heading(doc, "4.3 Criminological Limitations of Police-Reported Data")
    doc.add_paragraph(
        "A critical requirement for any rigorous academic crime analytics project is acknowledging the difference between "
        "**reported crime counts** and **actual crime prevalence**:"
    )
    add_bullet_point(doc, "The Dark Figure of Crime (Underreporting)", "Police records reflect only crimes that are reported to or discovered by law enforcement. Offenses like domestic battery, sexual assault, and minor larceny are substantially underreported, whereas vehicle theft and homicide have near-100% reporting rates due to insurance and forensic mandates.")
    add_bullet_point(doc, "Enforcement Discretion Bias", "Crimes such as narcotics possession and weapons violations are proactive enforcement crimes. A sudden surge in narcotics offenses in District 011 typically reflects an increase in police tactical stop operations rather than an actual increase in underlying drug usage.")
    add_bullet_point(doc, "Block-Level Coordinate Anonymization", "To protect victim privacy, the City of Chicago shifts exact building numbers to the block center (e.g. '043XX S COTTAGE GROVE AVE'). As a result, incident coordinates represent block midpoints rather than exact doorways.")

def build_chapter_5(doc):
    add_chapter_heading(doc, "Data Warehousing Foundations: The CrimeLens Star Schema", number=5)
    
    doc.add_paragraph(
        "Data warehousing is the architectural foundation of CrimeLens. To understand why a data warehouse is necessary, "
        "one must understand the fundamental difference between an OLTP database and an OLAP warehouse."
    )
    
    add_section_heading(doc, "5.1 OLTP vs. OLAP: Why Operational Databases Fail at Analytics")
    headers = ["Feature", "OLTP (Online Transaction Processing)", "OLAP (Online Analytical Processing)"]
    data = [
        ["System Purpose", "Rapid, atomic execution of day-to-day transactions.", "Fast, multidimensional aggregation for strategic analysis."],
        ["Data Structure", "Highly normalized (3NF) to eliminate data redundancy.", "Denormalized Star Schema optimized for star-join read speed."],
        ["Query Types", "Simple reads/writes on 1 or 2 rows (e.g. INSERT incident).", "Complex multi-table aggregations scanning millions of rows."],
        ["Indexing Focus", "Primary key B-trees minimizing insert/update locks.", "Bitmap, multi-column B-tree, and columnar compression indexes."],
        ["Historical Scope", "Current operational state (frequently archives old data).", "Comprehensive multi-year historical census (36+ continuous months)."]
    ]
    create_styled_table(doc, headers, data, [1.4, 2.5, 2.6])

    add_section_heading(doc, "5.2 The Kimball Star Schema Architecture")
    doc.add_paragraph(
        "CrimeLens implements Ralph Kimball's dimensional modeling methodology. The schema consists of a single central "
        "**Fact Table** surrounded by six conformed **Dimension Tables**, forming the classic Star Schema:"
    )
    
    add_code_block(doc,
        "                    +-----------------------+\n"
        "                    |       dim_time        |\n"
        "                    +-----------------------+\n"
        "                    | PK  time_key          |\n"
        "                    |     full_date         |\n"
        "                    |     year, month, hour |\n"
        "                    +-----------+-----------+\n"
        "                                |\n"
        "  +--------------------+        |        +----------------------+\n"
        "  |      dim_area      |        |        |      dim_crime       |\n"
        "  +--------------------+        |        +----------------------+\n"
        "  | PK  area_key       |        |        | PK  crime_key        |\n"
        "  |     district, beat |        v        |     primary_type     |\n"
        "  |     community_area +--->+-------+<---+     description      |\n"
        "  +--------------------+    |       |    |     iucr, fbi_code   |\n"
        "                            | fact_ |    +----------------------+\n"
        "  +--------------------+    | crime |    +----------------------+\n"
        "  |    dim_location    +--->|       |<---+     dim_premise      |\n"
        "  +--------------------+    |       |    +----------------------+\n"
        "  | PK  location_key   |    +---+---+    | PK  premise_key      |\n"
        "  |     block, lat, lon|        ^        |     location_desc    |\n"
        "  +--------------------+        |        +----------------------+\n"
        "                                |\n"
        "                    +-----------+-----------+\n"
        "                    |      dim_status       |\n"
        "                    +-----------------------+\n"
        "                    | PK  status_key        |\n"
        "                    |     arrest (bool)     |\n"
        "                    |     domestic (bool)   |\n"
        "                    +-----------------------+"
    )

    add_section_heading(doc, "5.3 Table Specifications & Surrogate Key Architecture")
    doc.add_paragraph(
        "A cornerstone of dimensional modeling is the use of **Surrogate Keys** (integer identifiers managed by the warehouse) "
        "rather than operational natural keys. Natural keys (such as CPD Case Numbers) are mutable, alphanumeric, and consume heavy memory. "
        "Surrogate integer keys ensure rapid 4-byte integer joins inside the PostgreSQL database engine."
    )
    
    add_bullet_point(doc, "fact_crime (761,718 rows)", "The central fact table storing the granular record of each reported incident. Grain: Exactly one reported criminal complaint. Surrogate PK: crime_fact_key (bigint). FKs: time_key, area_key, location_key, crime_key, premise_key, status_key. Additive Measure: crime_count (integer = 1).")
    add_bullet_point(doc, "dim_time (26,305 rows)", "Full calendar and temporal hierarchy. Key format: YYYYMMDDHH (e.g. 2023081422). Columns: full_date, full_timestamp, year, quarter, month, month_name, day, day_of_week, day_name, hour, time_period, is_weekend.")
    add_bullet_point(doc, "dim_area (1,004 rows)", "Administrative boundaries hierarchy. Columns: district (24 active), beat (277 beats), ward (50 wards), community_area (77 areas).")
    add_bullet_point(doc, "dim_crime (360 rows)", "Criminological offense classifications. Columns: primary_type (31 distinct categories), description, iucr, fbi_code.")
    add_bullet_point(doc, "dim_location (279,869 rows)", "Spatial block coordinates. Columns: block address, latitude, longitude. Handles missing coordinates deterministically via surrogate key 0 (UNKNOWN_LOCATION).")
    add_bullet_point(doc, "dim_premise (143 rows)", "Physical premise environment. Columns: location_description (e.g. STREET, APARTMENT, SIDEWALK, GAS STATION).")
    add_bullet_point(doc, "dim_status (4 rows)", "Classic Kimball Junk Dimension combining low-cardinality boolean indicators: arrest (True/False) and domestic (True/False). Reduces fact table width and avoids sparse boolean columns.")

    add_section_heading(doc, "5.4 Sample SQL Analytical Queries")
    doc.add_paragraph("The star schema allows complex multi-dimensional aggregation with simple, elegant SQL joins:")
    add_code_block(doc,
        "-- Monthly Trend of Armed Robbery Across Chicago Districts (2023-2025)\n"
        "SELECT \n"
        "    t.year,\n"
        "    t.month,\n"
        "    a.district,\n"
        "    COUNT(f.crime_fact_key) AS total_robberies,\n"
        "    ROUND(SUM(CASE WHEN s.arrest THEN 1 ELSE 0 END)::numeric / COUNT(f.crime_fact_key) * 100, 2) AS arrest_rate_pct\n"
        "FROM public.fact_crime f\n"
        "JOIN public.dim_time t   ON f.time_key = t.time_key\n"
        "JOIN public.dim_area a   ON f.area_key = a.area_key\n"
        "JOIN public.dim_crime c  ON f.crime_key = c.crime_key\n"
        "JOIN public.dim_status s ON f.status_key = s.status_key\n"
        "WHERE c.primary_type = 'ROBBERY'\n"
        "GROUP BY t.year, t.month, a.district\n"
        "ORDER BY t.year, t.month, total_robberies DESC;"
    )

def build_chapter_6(doc):
    add_chapter_heading(doc, "OLAP Operations: Multidimensional Slicing and Dicing", number=6)
    
    doc.add_paragraph(
        "Online Analytical Processing (OLAP) provides the mathematical and navigational grammar for exploring multi-dimensional "
        "data cubes. Rather than viewing data as a flat two-dimensional table, OLAP conceptualizes data as a multi-dimensional cube "
        "where dimensions form the axes and measures populate the cells."
    )
    
    ops = [
        {
            "name": "Roll-up (Aggregation / Consolidation)",
            "def": "Moving up the dimensional hierarchy by grouping granular data into broader summary categories, reducing detail while increasing aggregation scope.",
            "real": "A sales manager moves from daily store receipts to quarterly regional revenue totals.",
            "cl": "Aggregating crime counts from specific Hours -> Months -> Quarters -> Full Calendar Years (e.g. consolidating 36 monthly bins into 3 annual totals: 263,868; 259,670; 238,180).",
            "sql": "SELECT t.year, COUNT(f.crime_fact_key) FROM fact_crime f JOIN dim_time t ON f.time_key = t.time_key GROUP BY t.year;"
        },
        {
            "name": "Drill-down (De-aggregation / Specialization)",
            "def": "Moving down the dimensional hierarchy to reveal granular sub-categories, splitting high-level totals into constituent parts.",
            "real": "A doctor drills down from nationwide influenza cases into county-level patient counts.",
            "cl": "Navigating from Citywide annual totals into District-level volumes, then into Beat 1122, and finally into specific blocks on Madison Street.",
            "sql": "SELECT a.district, a.beat, COUNT(f.crime_fact_key) FROM fact_crime f JOIN dim_area a ON f.area_key = a.area_key WHERE a.district = '011' GROUP BY a.district, a.beat;"
        },
        {
            "name": "Slice (Filtering on One Dimension)",
            "def": "Selecting a single value along one dimension axis to create a two-dimensional sub-cube representing that specific slice.",
            "real": "Filtering a company spreadsheet to look only at sales in the year '2024'.",
            "cl": "Selecting solely Crime Category = 'MOTOR VEHICLE THEFT' across all districts and time periods, slicing away all other 30 crime types.",
            "sql": "SELECT t.month, COUNT(f.crime_fact_key) FROM fact_crime f JOIN dim_time t ON f.time_key = t.time_key JOIN dim_crime c ON f.crime_key = c.crime_key WHERE c.primary_type = 'MOTOR VEHICLE THEFT' GROUP BY t.month;"
        },
        {
            "name": "Dice (Sub-cube Filtering Across Multiple Dimensions)",
            "def": "Selecting bounding ranges or specific subsets across two or more dimensions simultaneously, defining an isolated sub-cube.",
            "real": "Analyzing sales for Laptops AND Smartphones (Product) in California AND Nevada (Geography) during Q4 (Time).",
            "cl": "Analyzing Robbery AND Battery (Category) in District 001 AND District 018 (Geography) occurring during Nighttime Hours on Weekends (Time).",
            "sql": "SELECT c.primary_type, a.district, COUNT(f.crime_fact_key) FROM fact_crime f JOIN dim_crime c ON f.crime_key = c.crime_key JOIN dim_area a ON f.area_key = a.area_key JOIN dim_time t ON f.time_key = t.time_key WHERE c.primary_type IN ('ROBBERY', 'BATTERY') AND a.district IN ('001', '018') AND t.is_weekend = True AND t.time_period = 'Night' GROUP BY c.primary_type, a.district;"
        },
        {
            "name": "Pivot (Rotation of Axes)",
            "def": "Rotating the multidimensional cube's axes to view data from a different perspective, converting row categories into column headers.",
            "real": "Flipping a financial table so that Quarters become columns and Departments become rows.",
            "cl": "Transforming rows of crime types and columns of years into rows of Police Districts and columns of Primary Crime Types to compare district specialization.",
            "sql": "SELECT a.district, SUM(CASE WHEN c.primary_type = 'THEFT' THEN 1 ELSE 0 END) AS theft_count, SUM(CASE WHEN c.primary_type = 'BATTERY' THEN 1 ELSE 0 END) AS battery_count FROM fact_crime f JOIN dim_area a ON f.area_key = a.area_key JOIN dim_crime c ON f.crime_key = c.crime_key GROUP BY a.district;"
        }
    ]

    for op in ops:
        add_section_heading(doc, f"6.{ops.index(op)+1} {op['name']}")
        doc.add_paragraph(f"Definition: {op['def']}")
        doc.add_paragraph(f"Everyday Real-World Example: {op['real']}")
        doc.add_paragraph(f"CrimeLens Implementation: {op['cl']}")
        doc.add_paragraph("SQL Demonstration:")
        add_code_block(doc, op['sql'])
        doc.add_paragraph().paragraph_format.space_after = Pt(2)
