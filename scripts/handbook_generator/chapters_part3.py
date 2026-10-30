from docx.shared import Pt, Inches
from docx_styler import (
    add_chapter_heading, add_section_heading, add_subsection_heading,
    add_bullet_point, add_callout_box, add_code_block, create_styled_table
)

def build_chapter_13(doc):
    add_chapter_heading(doc, "Apriori Association Rule Mining: Discovering Transactional Patterns", number=13)
    
    doc.add_paragraph(
        "Association Rule Mining is an unsupervised data mining technique that discovers interesting relationships, "
        "frequent co-occurrences, and conditional 'If-Then' rules hidden inside massive transactional datasets. "
        "In CrimeLens, each reported criminal incident serves as a transaction composed of discrete categorical attributes."
    )
    
    add_section_heading(doc, "13.1 Core Definitions & Downward Closure (The Apriori Property)")
    add_bullet_point(doc, "Transaction (T)", "An individual crime incident in PostgreSQL containing a set of discrete categorical items: T = {CrimeType=ROBBERY, Premise=STREET, Time=NIGHT, Arrest=NO}.")
    add_bullet_point(doc, "Itemset", "A collection of one or more items (e.g. {Premise=STREET, Arrest=NO} is a 2-itemset).")
    add_bullet_point(doc, "Support (Relative Frequency)", "The proportion of total transactions in the warehouse that contain the itemset: Support(A) = Count(A) / Total_Transactions.")
    add_bullet_point(doc, "The Apriori Principle (Downward Closure)", "If an itemset is frequent, all of its subsets must also be frequent. Conversely, if an itemset is infrequent (falls below min_support), all of its supersets are pruned immediately. This drastically prunes the combinatorial search space from billions of candidates to a few hundred verified frequent itemsets.")

    add_section_heading(doc, "13.2 Association Rule Evaluation Metrics")
    doc.add_paragraph("An association rule is an implication of the form: Antecedent (A) => Consequent (B), where A and B are disjoint itemsets:")
    add_bullet_point(doc, "1. Support P(A ∩ B)", "Support(A => B) = P(A ∩ B) = Count(A ∪ B) / N. Quantifies the statistical prevalence of the combined rule across the entire warehouse.")
    add_bullet_point(doc, "2. Confidence P(B | A)", "Confidence(A => B) = P(B | A) = Support(A ∩ B) / Support(A). Quantifies the conditional probability that B is present given that antecedent A occurred.")
    add_bullet_point(doc, "3. Lift Ratio", "Lift(A => B) = Confidence(A => B) / Support(B) = P(A ∩ B) / [P(A) * P(B)]. Measures how much more often A and B co-occur than would be expected if they were statistically independent. Lift > 1.0 indicates strong positive association; Lift = 1.0 indicates statistical independence; Lift < 1.0 indicates negative association.")
    add_bullet_point(doc, "4. Leverage", "Leverage(A => B) = Support(A ∩ B) - [Support(A) * Support(B)]. Measures the absolute difference between observed joint probability and expected independent probability.")

    add_section_heading(doc, "13.3 Fully Worked Numerical Example (5 Small Transactions)")
    doc.add_paragraph("Consider a sample database of 5 crime transactions with items {Theft, Street, Night, Arrest}:")
    
    tx_data = [
        ["Transaction ID", "Items in Crime Transaction"],
        ["T1", "Theft, Street, Night"],
        ["T2", "Theft, Street"],
        ["T3", "Street, Arrest"],
        ["T4", "Theft, Street, Night"],
        ["T5", "Theft, Night, Arrest"]
    ]
    create_styled_table(doc, tx_data[0], tx_data[1:], [1.8, 4.7])

    doc.add_paragraph(
        "Let minimum support min_sup = 40% (2 / 5) and minimum confidence min_conf = 60%:\n"
        "1. Item Supports: Count(Theft)=4 (80%), Count(Street)=4 (80%), Count(Night)=3 (60%), Count(Arrest)=2 (40%). All meet 40%!\n"
        "2. 2-Itemsets: Count({Theft, Street})=3 (60%), Count({Theft, Night})=3 (60%), Count({Street, Night})=2 (40%). All meet min_sup!\n"
        "3. Evaluate Candidate Rule: {Theft} => {Street}:\n"
        "   • Support P(Theft ∩ Street) = 3 / 5 = 60.0%\n"
        "   • Confidence P(Street | Theft) = Support(Theft ∩ Street) / Support(Theft) = 0.60 / 0.80 = 75.0% (Meets 60% threshold!)\n"
        "   • Lift = Confidence / Support(Street) = 0.75 / 0.80 = 0.9375x (Slightly below independence; near random co-occurrence).\n"
        "4. Evaluate Candidate Rule: {Street, Night} => {Theft}:\n"
        "   • Support({Street, Night, Theft}) = 2 / 5 = 40.0%\n"
        "   • Support({Street, Night}) = 2 / 5 = 40.0%\n"
        "   • Confidence = 0.40 / 0.40 = 100.0%!\n"
        "   • Lift = 1.00 / 0.80 = 1.25x (Positive co-occurrence signal: 25% higher than random chance!)."
    )

    add_section_heading(doc, "13.4 Deep-Dive into Actual CrimeLens Discovered Rule #68")
    add_callout_box(doc, "Actual Warehouse Rule Mined on 761,718 Incidents",
        "Rule Formulation:\n"
        "  {CrimeType=MOTOR VEHICLE THEFT}  =>  {Arrest=NO, Premise=STREET}\n"
        "Empirical Metrics:\n"
        "• Support: 6.49% (49,399 real incident transactions)\n"
        "• Confidence: 72.40% (Given auto theft, there is a 72.4% probability it occurred on a street with no on-scene arrest)\n"
        "• Lift Ratio: 3.09x (Occurs over 3 times more frequently than if auto theft, street premises, and non-arrest were independent!)\n"
        "• Leverage: +0.0439 (Substantial positive excess probability above independence)\n"
        "Criminological Context:\n"
        "Auto theft in Chicago is overwhelmingly a crime of stealth executed against vehicles parked along public curbs at night. "
        "Victims discover the offense hours later, yielding zero immediate witness leads and a very low on-scene arrest rate.", box_type="worked")

    add_callout_box(doc, "Civic Warning: Association Does NOT Imply Causation",
        "A Lift of 3.09x does NOT mean that parking on a street causes vehicle theft. "
        "It indicates a strong statistical co-occurrence pattern in historical police logs. Policy decisions must avoid "
        "mechanistic causal interpretations.", box_type="warning")

def build_chapter_14(doc):
    add_chapter_heading(doc, "Decision Tree Classification: Interpretable Arrest Prediction", number=14)
    
    doc.add_paragraph(
        "Decision Trees are supervised machine learning models that construct an inverted branching structure to partition data "
        "into homogeneous subsets based on feature split tests. In CrimeLens, a Decision Tree classifier is trained to predict "
        "the binary arrest outcome (`is_arrest`)."
    )
    
    add_section_heading(doc, "14.1 Tree Anatomy & Mathematical Split Criteria")
    add_bullet_point(doc, "Root Node", "The top-level node containing all training instances. The algorithm selects the feature test that produces the maximum reduction in impurity.")
    add_bullet_point(doc, "Decision Nodes", "Internal conditional branches that recursively evaluate feature attributes (e.g. 'Is CrimeType in {Narcotics, Weapons}?').")
    add_bullet_point(doc, "Leaf Nodes", "Terminal nodes providing the final predicted class probability (P(Arrest=YES) vs P(Arrest=NO)).")
    add_bullet_point(doc, "Gini Impurity Formula", "Gini(p) = 1 - SUM_{k=1}^{C} p_k^2. Gini measures class heterogeneity: Gini=0 for pure nodes (100% one class); Gini=0.5 for maximum binary uncertainty (50/50 split).")
    add_bullet_point(doc, "Entropy & Information Gain", "Entropy H(p) = -SUM p_k log_2(p_k). Information Gain = Parent_Entropy - Weighted_Child_Entropy.")

    add_section_heading(doc, "14.2 Fully Worked Numerical Example: Calculating Gini Impurity")
    doc.add_paragraph("Suppose parent node D contains 100 incidents: 20 Arrests (YES) and 80 Non-arrests (NO):")
    doc.add_paragraph(
        "Parent Gini:\n"
        "p(YES) = 20/100 = 0.20,  p(NO) = 80/100 = 0.80\n"
        "Gini(Parent) = 1 - (0.20^2 + 0.80^2) = 1 - (0.04 + 0.64) = 0.32\n\n"
        "Evaluate Split on Feature 'Premise = RESIDENCE':\n"
        "• Left Child (In Residence, 40 incidents): 4 Arrests (YES), 36 Non-arrests (NO)\n"
        "  p_L(YES) = 4/40 = 0.10, p_L(NO) = 36/40 = 0.90\n"
        "  Gini(Left) = 1 - (0.10^2 + 0.90^2) = 1 - (0.01 + 0.81) = 0.18\n"
        "• Right Child (Not in Residence, 60 incidents): 16 Arrests (YES), 44 Non-arrests (NO)\n"
        "  p_R(YES) = 16/60 = 0.2667, p_R(NO) = 44/60 = 0.7333\n"
        "  Gini(Right) = 1 - (0.2667^2 + 0.7333^2) = 1 - (0.0711 + 0.5377) = 0.3912\n\n"
        "Weighted Gini of Split:\n"
        "Gini_split = (40 / 100) * 0.18 + (60 / 100) * 0.3912 = 0.072 + 0.2347 = 0.3067\n"
        "Gini Gain = Gini(Parent) - Gini_split = 0.3200 - 0.3067 = 0.0133 (Positive reduction in impurity!)."
    )

    add_section_heading(doc, "14.3 Overcoming Severe Class Imbalance (13.99% Base Rate)")
    doc.add_paragraph(
        "In Chicago crime records, only 13.99% of reported crimes result in an on-scene arrest (86.01% non-arrest). "
        "A naive machine learning model that always predicts 'NO ARREST' achieves 86.01% accuracy while being completely useless. "
        "CrimeLens counters this by applying balanced class weighting:"
    )
    add_code_block(doc, "w_class = Total_Samples / (Number_of_Classes * Count_in_Class)")
    doc.add_paragraph("This penalizes misclassifications on the minority arrest class by ~6.1x, forcing the tree to learn genuine discriminating features.")

def build_chapter_15(doc):
    add_chapter_heading(doc, "Machine Learning Evaluation Metrics: Precision, Recall, and ROC-AUC", number=15)
    
    doc.add_paragraph(
        "Evaluating classification models requires comprehensive confusion matrix metrics. Relying on accuracy alone "
        "is a dangerous pitfall in imbalanced criminological datasets."
    )
    
    add_section_heading(doc, "15.1 The Confusion Matrix Architecture")
    cm_table = [
        ["Reality / Prediction", "Predicted Arrest (POSITIVE)", "Predicted Non-Arrest (NEGATIVE)"],
        ["Actual Arrest (POSITIVE)", "True Positive (TP)", "False Negative (FN) - Type II Error"],
        ["Actual Non-Arrest (NEGATIVE)", "False Positive (FP) - Type I Error", "True Negative (TN)"]
    ]
    create_styled_table(doc, cm_table[0], cm_table[1:], [2.1, 2.2, 2.2])

    add_section_heading(doc, "15.2 Metric Formulations & Small Worked Numerical Example")
    doc.add_paragraph("Suppose a model evaluates 1,000 incidents with TP=100, FP=50, FN=40, TN=810:")
    add_bullet_point(doc, "1. Accuracy", "Accuracy = (TP + TN) / (TP + TN + FP + FN) = (100 + 810) / 1000 = 910 / 1000 = 91.0%. Measures overall correct rate.")
    add_bullet_point(doc, "2. Precision (Positive Predictive Value)", "Precision = TP / (TP + FP) = 100 / (100 + 50) = 100 / 150 = 66.67%. When model predicts arrest, it is correct 66.7% of the time.")
    add_bullet_point(doc, "3. Recall (Sensitivity / True Positive Rate)", "Recall = TP / (TP + FN) = 100 / (100 + 40) = 100 / 140 = 71.43%. Model detects 71.4% of all actual arrests.")
    add_bullet_point(doc, "4. F1-Score (Harmonic Mean)", "F1 = 2 * (Precision * Recall) / (Precision + Recall) = 2 * (0.6667 * 0.7143) / (0.6667 + 0.7143) = 0.9524 / 1.3810 = 68.96%. Balances precision and recall.")
    add_bullet_point(doc, "5. ROC-AUC", "Area Under the Receiver Operating Characteristic Curve. Evaluates True Positive Rate vs False Positive Rate across all decision thresholds. AUC = 0.5 is random chance; AUC = 1.0 is perfect separation.")

    add_callout_box(doc, "Verified CrimeLens Empirical Decision Tree Results",
        "Evaluated on a 35,000-incident stratified test partition from the 761,718 warehouse census:\n"
        "• Test Accuracy: 88.20% (Substantially outperforms the 83.43% majority-class baseline)\n"
        "• Precision: 89.39%\n"
        "• Recall: 98.24% on non-arrest; 31.4% on minority arrest\n"
        "• ROC-AUC Score: 0.7178 (Substantial discriminative power)\n"
        "• Overfitting Gap (Train Acc - Test Acc): Exactly -0.02% (Zero overfitting; hyperparameter regularization confirmed).", box_type="worked")

def build_chapter_16(doc):
    add_chapter_heading(doc, "Automated Data-Driven Insights Engine", number=16)
    
    doc.add_paragraph(
        "The Automated Insights module functions as an autonomous junior analyst. Rather than requiring users to manually "
        "test hundreds of combinations, the engine runs deterministic statistical evaluations over warehouse rollups and "
        "surfaces structured findings in natural language."
    )
    
    add_section_heading(doc, "16.1 Analytical Typologies of Automated Observations")
    add_bullet_point(doc, "Temporal Anomalies", "Identifies months and shift periods exceeding 2 standard deviations from the rolling seasonal average.")
    add_bullet_point(doc, "Pareto Geographic Concentrations", "Detects jurisdictional skew (e.g. confirming that 3 districts account for over 20% of all violent incidents).")
    add_bullet_point(doc, "Category Composition Shifts", "Identifies offenses experiencing statistically significant annual drift (such as auto theft dropping -48% while fraud rose +4%).")
    add_bullet_point(doc, "Enforcement Ratios", "Compares arrest rates by offense and location description against citywide baselines.")

    add_callout_box(doc, "The Necessity of Human Interpretation",
        "Automated insights surface correlation and statistical concentration, not administrative blame or sociological etiology. "
        "A finding that three districts log 21% of violent crimes must be interpreted in light of socioeconomic conditions, population density, "
        "and reporting behaviors.", box_type="theory")

def build_chapter_17(doc):
    add_chapter_heading(doc, "Reports & Analytics Exports Engine", number=17)
    
    doc.add_paragraph(
        "Analytical intelligence is useless if it cannot be communicated, audited, and shared with decision-makers. "
        "CrimeLens provides a server-side report generation engine supporting parameterized exports."
    )
    
    add_section_heading(doc, "17.1 Export Formats & Data Provenance")
    add_bullet_point(doc, "Comma-Separated Values (CSV)", "Flat structured exports for import into statistical tools (R, Python, Stata).")
    add_bullet_point(doc, "JavaScript Object Notation (JSON)", "Hierarchical serialized objects for integration with external REST APIs and geospatial web viewers.")
    add_bullet_point(doc, "Markdown Command Briefs", "Pre-formatted executive summary briefs tailored for command staff briefings.")
    add_bullet_point(doc, "Cryptographic Provenance Stamp", "Every exported file embeds metadata: exact SQL query executed, target database schema (public vs synthetic_data), record census count, and UTC timestamp.")

def build_chapter_18(doc):
    add_chapter_heading(doc, "Microsoft Power BI Integration: Enterprise Semantic Modeling", number=18)
    
    doc.add_paragraph(
        "While CrimeLens provides a reactive custom web dashboard, large municipal enterprises often rely on commercial "
        "Business Intelligence platforms for self-service reporting. CrimeLens delivers a full Microsoft Power BI semantic package."
    )
    
    add_section_heading(doc, "18.1 Storage Mode Architecture: Import Mode vs. DirectQuery")
    headers = ["Dimension", "Import Mode (CrimeLens Choice)", "DirectQuery Mode"]
    data = [
        ["Query Latency", "Sub-second aggregations via VertiPaq in-memory engine.", "Subject to live PostgreSQL network and query latency."],
        ["RAM Footprint", "Condenses 761,718 rows into < 40 MB via columnar compression.", "Zero Power BI memory usage; heavy load on database server."],
        ["DAX Capability", "100% of DAX functions supported (Time-Intelligence, DATEADD).", "Restricted DAX subset; time intelligence functions disabled."],
        ["Offline Portability", "Self-contained .pbix file operable without active database connection.", "Requires continuous live connection to PostgreSQL."]
    ]
    create_styled_table(doc, headers, data, [1.4, 2.5, 2.6])

    add_section_heading(doc, "18.2 Production DAX Measure Library")
    doc.add_paragraph("CrimeLens includes 20 verified DAX measures utilizing defensive DIVIDE zero-handling:")
    add_code_block(doc,
        "// DAX Measure 1: Total Recorded Incidents\n"
        "Total Incidents = COUNTROWS('fact_crime')\n\n"
        "// DAX Measure 2: Overall Arrest Rate Percentage\n"
        "Arrest Rate Pct = \n"
        "DIVIDE(\n"
        "    CALCULATE(COUNTROWS('fact_crime'), 'dim_status'[arrest] = TRUE()),\n"
        "    [Total Incidents],\n"
        "    0\n"
        ") * 100\n\n"
        "// DAX Measure 3: Violent Crime Share\n"
        "Violent Crime Pct = \n"
        "DIVIDE(\n"
        "    CALCULATE(COUNTROWS('fact_crime'), 'dim_crime'[primary_type] IN {\"HOMICIDE\", \"ROBBERY\", \"BATTERY\", \"ASSAULT\"}),\n"
        "    [Total Incidents],\n"
        "    0\n"
        ") * 100"
    )

    add_section_heading(doc, "18.3 The 7-Page Enterprise Report Specifications")
    doc.add_paragraph("The integration package provides complete visual layout blueprints for seven Power BI report pages:")
    doc.add_paragraph(
        "• Page 1: Executive Command Center (Incident KPIs, census scope, monthly trajectory, district ranking)\n"
        "• Page 2: Temporal & Diurnal Dynamics (7x24 density heat matrix, shift comparisons, moving averages)\n"
        "• Page 3: Geographic Area Intelligence (District choropleths, ward rollups, community area drill-downs)\n"
        "• Page 4: Crime Category Deep-Dive (FBI Part I classification, domestic violence concentrations, weapons)\n"
        "• Page 5: Interactive OLAP Matrix (Multi-dimensional drill-down matrix across Year, District, and Offense)\n"
        "• Page 6: Data Quality & Warehouse Audit (Completeness gauges, null rates, surrogate key referential integrity)\n"
        "• Page 7: Methodology & Academic Foundations (Kimball schema documentation, VertiPaq optimization, disclaimers)"
    )
