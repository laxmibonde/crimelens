import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from docx_styler import (
    NAVY, DARK_BLUE, LAKE_BLUE, AMBER, EMERALD, CHARCOAL, MUTED_GRAY,
    HEX_NAVY, HEX_LAKE_BLUE, HEX_LIGHT_BLUE, HEX_LIGHT_GRAY,
    format_document_styles, set_cell_background, set_cell_margins,
    add_callout_box, add_code_block, create_styled_table, add_bullet_point
)

def generate_quick_revision(output_docx_path):
    print(f"Creating Quick Revision handbook at: {output_docx_path}")
    doc = docx.Document()
    format_document_styles(doc)

    # Document Title
    p_pre = doc.add_paragraph()
    p_pre.paragraph_format.space_before = Pt(12)
    p_pre.paragraph_format.space_after = Pt(2)
    r_pre = p_pre.add_run("CRIMELENS • VIVA QUICK REVISION & MASTER CHEAT SHEET")
    r_pre.font.name = "Calibri"
    r_pre.font.size = Pt(11)
    r_pre.font.bold = True
    r_pre.font.color.rgb = LAKE_BLUE

    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(6)
    r_title = p_title.add_run("CrimeLens High-Yield Viva Defense Guide")
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(22)
    r_title.font.bold = True
    r_title.font.color.rgb = NAVY

    doc.add_paragraph(
        "A high-density technical summary of core architectures, mathematical formulas, algorithms, empirical results, "
        "and anticipated professor viva defense questions for the CrimeLens Computer Engineering capstone project."
    )

    # 1. Executive Snapshot Card
    add_callout_box(doc, "Project Executive Snapshot",
        "• Project Name: CrimeLens — Chicago Crime Analytics Workstation\n"
        "• Core Domain: Data Warehousing and Data Mining (DWM) / Geospatial Analytics\n"
        "• Dataset Census: 761,718 authentic reported incidents (2023: 263,868; 2024: 259,670; 2025: 238,180)\n"
        "• Geocoding Quality: 754,250 valid coordinates (99.02%); 7,468 mapped to surrogate key 0\n"
        "• Stack: PostgreSQL 18.4 (Star Schema) • Python 3.13 / FastAPI • React 18 / Vite • Power BI\n"
        "• Algorithms: DBSCAN Spatial Clustering • K-Means Profile Segmentation • PCA 2D Projection • Apriori Rule Mining • Decision Tree Classification",
        box_type="worked"
    )

    # 2. Kimball Star Schema Architecture
    p_sec1 = doc.add_paragraph()
    p_sec1.paragraph_format.space_before = Pt(12)
    r_s1 = p_sec1.add_run("1. The Kimball Star Schema Architecture")
    r_s1.font.bold = True
    r_s1.font.size = Pt(13)
    r_s1.font.color.rgb = DARK_BLUE

    headers = ["Table Name", "Type", "Row Count", "Surrogate PK", "Key Dimensional Role"]
    schema_data = [
        ["fact_crime", "Fact Table", "761,718", "crime_fact_key (bigint)", "Central fact table storing individual reported criminal complaints."],
        ["dim_time", "Dimension", "26,305", "time_key (YYYYMMDDHH)", "13 temporal attributes: year, quarter, month, day, hour, is_weekend."],
        ["dim_area", "Dimension", "1,004", "area_key (int)", "Administrative boundary hierarchy: district (24), beat (277), ward, area."],
        ["dim_crime", "Dimension", "360", "crime_key (int)", "Statutory classification: primary_type (31 types), description, IUCR, FBI code."],
        ["dim_location", "Dimension", "279,869", "location_key (int)", "Spatial coordinates: block address, latitude, longitude (key 0 for unknown)."],
        ["dim_premise", "Dimension", "143", "premise_key (int)", "Environmental location description (e.g. STREET, APARTMENT, SIDEWALK)."],
        ["dim_status", "Junk Dim", "4", "status_key (int)", "Combines binary flags: arrest (True/False) and domestic (True/False)."]
    ]
    create_styled_table(doc, headers, schema_data, [1.1, 0.9, 0.9, 1.4, 2.2])

    # 3. Master Algorithm & Formula Cheat Sheet
    p_sec2 = doc.add_paragraph()
    p_sec2.paragraph_format.space_before = Pt(12)
    r_s2 = p_sec2.add_run("2. Master Data Mining Algorithm & Formula Cheat Sheet")
    r_s2.font.bold = True
    r_s2.font.size = Pt(13)
    r_s2.font.color.rgb = DARK_BLUE

    algo_headers = ["Algorithm", "Discipline & Task", "Key Mathematical Formulas", "Empirical CrimeLens Result"]
    algo_data = [
        [
            "DBSCAN",
            "Unsupervised Spatial Clustering (Micro-level)",
            "Haversine Spherical Distance:\na = sin^2(dlat/2) + cos*cos*sin^2(dlon/2)\nd = 2 * R * atan2(sqrt(a), sqrt(1-a))\nParams: eps = 500m, MinPts = 30",
            "14 high-density street corridor hotspots; 35% sparse incidents rejected as noise."
        ],
        [
            "K-Means",
            "Unsupervised Profile Segmentation (Macro-level)",
            "StandardScaler: z = (x - mu) / sigma\nInertia = SUM ||x - mu_k||^2\nSilhouette: s = (b - a) / max(a, b)",
            "24 Districts clustered across 11 features ($K=4$, Inertia: 57.73, Silhouette: 0.3914)."
        ],
        [
            "PCA",
            "Dimensionality Reduction & Visualization",
            "Eigen decomposition: Sigma * v = lambda * v\nExplained Variance: EVR = lambda_k / SUM(lambda)",
            "2D scatterplot captures 72.39% of total variance across 11 features (PC1: 46.5%, PC2: 25.9%)."
        ],
        [
            "Apriori",
            "Unsupervised Transaction Rule Mining",
            "Support: P(A ∩ B) = Count(A ∪ B) / N\nConfidence: P(B | A) = Sup(A ∩ B) / Sup(A)\nLift = Conf(A => B) / Sup(B)",
            "Rule #68: {Motor Vehicle Theft} => {Arrest=NO, Street} (Sup: 6.49%, Conf: 72.4%, Lift: 3.09x)."
        ],
        [
            "Decision Tree",
            "Supervised Classification (Arrest Outcome)",
            "Gini Impurity: Gini = 1 - SUM(p_k^2)\nClass Weight: w = N / (C * N_c)\nROC-AUC = Area Under TPR vs FPR Curve",
            "Test Accuracy: 88.20% (beats 83.43% majority baseline); ROC-AUC: 0.7178; Overfitting Gap: -0.02%."
        ]
    ]
    create_styled_table(doc, algo_headers, algo_data, [0.9, 1.5, 2.2, 1.9])

    # 4. Evaluation Metrics Cheat Sheet
    p_sec3 = doc.add_paragraph()
    p_sec3.paragraph_format.space_before = Pt(12)
    r_s3 = p_sec3.add_run("3. Confusion Matrix & Machine Learning Evaluation Metrics")
    r_s3.font.bold = True
    r_s3.font.size = Pt(13)
    r_s3.font.color.rgb = DARK_BLUE

    doc.add_paragraph(
        "• Accuracy = (TP + TN) / (TP + TN + FP + FN) — Dangerous alone in imbalanced datasets!\n"
        "• Precision = TP / (TP + FP) — 'When model predicts arrest, how often is it right?' (CrimeLens: 89.39%)\n"
        "• Recall = TP / (TP + FN) — 'Of all actual arrests, how many did the model catch?' (CrimeLens: 31.4% on minority arrest)\n"
        "• F1-Score = 2 * (Precision * Recall) / (Precision + Recall) — Harmonic mean balancing FP and FN.\n"
        "• ROC-AUC = Area under ROC curve across all thresholds (CrimeLens: 0.7178)."
    )

    # 5. Top 20 Rapid-Fire Viva Questions & Defenses
    p_sec4 = doc.add_paragraph()
    p_sec4.paragraph_format.space_before = Pt(12)
    r_s4 = p_sec4.add_run("4. Top 20 Rapid-Fire Viva Questions & Winning Examiner Defenses")
    r_s4.font.bold = True
    r_s4.font.size = Pt(13)
    r_s4.font.color.rgb = DARK_BLUE

    viva_cheat = [
        ("Q1: Why did you use PostgreSQL instead of MongoDB?",
         "A: Data warehousing relies on dimensional star schemas, relational integrity, integer surrogate key joins, and SQL OLAP aggregations. MongoDB lacks ACID multi-table join performance for analytical aggregation over 760k rows."),
        ("Q2: Why a Star Schema instead of 3NF relational normalization?",
         "A: 3NF requires dozens of complex table joins to eliminate redundancy, slowing down analytical read queries. A Star Schema denormalizes dimensions around a central fact table, allowing fast 1-hop star-joins."),
        ("Q3: Why DBSCAN instead of K-Means for crime hotspots?",
         "A: K-Means forces every incident into K spherical clusters and cannot handle noise. DBSCAN discovers arbitrary geometric shapes (like crime along curved streets) and filters out sparse background crime as noise."),
        ("Q4: Why K-Means for district segmentation if DBSCAN is better for hotspots?",
         "A: Different tasks! DBSCAN clusters granular micro-coordinates (lat, lon). K-Means segments aggregated municipal jurisdictions (24 police districts) across 11 standardized multivariate feature dimensions."),
        ("Q5: What is the significance of the 2D PCA variance of 72.39%?",
         "A: It proves that our 2-dimensional scatterplot successfully captures nearly three-quarters of all mathematical information and variance present across the original 11 feature dimensions without severe distortion."),
        ("Q6: Why can Silhouette recommend K=2 while you select K=4 in K-Means?",
         "A: Silhouette evaluates purely mathematical cluster tightness (where K=2 yields two broad groups: commercial vs residential). K=4 provides four nuanced operational typologies needed by law enforcement commanders."),
        ("Q7: What does Lift > 1.0 mean in Apriori association rules?",
         "A: Lift measures how much more frequently antecedent A and consequent B co-occur than expected if they were statistically independent. Lift = 3.09x means they appear together over three times more often than random chance."),
        ("Q8: Does an association rule prove that parking on a street causes auto theft?",
         "A: Absolutely not! Association does NOT imply causation. It proves an environmental vulnerability and statistical co-occurrence pattern in historical police logs."),
        ("Q9: Why is 88.20% accuracy in your Decision Tree actually meaningful?",
         "A: Because our majority-class baseline is 83.43% (non-arrests). An accuracy of 88.20% with balanced class weighting beats the baseline and achieves an ROC-AUC of 0.7178 with zero overfitting (-0.02% gap)."),
        ("Q10: Why did you choose Import Mode instead of DirectQuery in Power BI?",
         "A: Import Mode loads data into the columnar VertiPaq engine, providing sub-second aggregations, full DAX time-intelligence function support (SAMEPERIODLASTYEAR), and offline report portability."),
        ("Q11: What is the Modifiable Areal Unit Problem (MAUP)?",
         "A: Statistical distortion occurring when point data (crimes) is aggregated into arbitrary administrative boundaries. Clustering 24 districts yields different patterns than clustering 77 community areas."),
        ("Q12: What is the Ecological Fallacy?",
         "A: The logical fallacy of assuming that characteristics of an aggregate district cluster apply to individual residents living within that district."),
        ("Q13: How do you know your 761,718 dataset is authentic?",
         "A: Direct live API reconciliation queries against the official City of Chicago Open Data Portal endpoint (data.cityofchicago.org/resource/ijzp-q8t2.json) confirmed a delta of exactly 0 across all three years."),
        ("Q14: What is the purpose of dim_status as a Junk Dimension?",
         "A: It combines the low-cardinality flags arrest (T/F) and domestic (T/F) into a single 4-row dimension, avoiding wide, sparse boolean columns in the fact table."),
        ("Q15: What is the difference between Slicing and Dicing?",
         "A: Slicing filters along exactly 1 dimension (creating a 2D slice); Dicing filters across 2 or more dimensions simultaneously (extracting a sub-cube)."),
        ("Q16: How do you handle division by zero in DAX?",
         "A: We use the native DIVIDE() function with a safe third parameter: DIVIDE(Numerator, Denominator, 0)."),
        ("Q17: What does WCSS stand for in K-Means?",
         "A: Within-Cluster Sum of Squares (Inertia). It measures the sum of squared Euclidean distances between points and their assigned centroids."),
        ("Q18: What is the Downward Closure Property in Apriori?",
         "A: If an itemset is frequent, all of its subsets must be frequent. If an itemset is infrequent, all of its supersets are pruned immediately."),
        ("Q19: What is the primary split in your Decision Tree?",
         "A: Primary crime classification: proactive enforcement crimes (narcotics, weapons) split toward arrest; stealth property crimes (theft, auto theft) split toward non-arrest."),
        ("Q20: What is the biggest limitation of CrimeLens?",
         "A: It analyzes closed historical census data (2023–2025) rather than streaming live 911 dispatch radio feeds.")
    ]

    for q, a in viva_cheat:
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(2)
        rq = p.add_run(q + "  ")
        rq.font.bold = True
        rq.font.color.rgb = DARK_BLUE
        ra = p.add_run(a)
        ra.font.color.rgb = CHARCOAL

    doc.save(output_docx_path)
    print(f"Successfully generated Quick Revision DOCX ({output_docx_path})!")

if __name__ == "__main__":
    out_path = os.path.abspath("CrimeLens_Viva_Quick_Revision.docx")
    generate_quick_revision(out_path)
