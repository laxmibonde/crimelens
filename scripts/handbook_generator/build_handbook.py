import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

# Ensure handbook_generator directory is on sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from docx_styler import (
    NAVY, DARK_BLUE, LAKE_BLUE, AMBER, EMERALD, CHARCOAL, MUTED_GRAY,
    HEX_NAVY, HEX_LAKE_BLUE, HEX_LIGHT_BLUE, HEX_LIGHT_GRAY,
    format_document_styles, set_cell_background, set_cell_margins
)
import chapters_part1
import chapters_part2
import chapters_part3
import chapters_part4

def add_cover_page(doc):
    p_pre = doc.add_paragraph()
    p_pre.paragraph_format.space_before = Pt(36)
    p_pre.paragraph_format.space_after = Pt(12)
    p_pre.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_pre = p_pre.add_run("DEPARTMENT OF COMPUTER ENGINEERING\nDATA WAREHOUSING & DATA MINING (DWM) CAPSTONE PROJECT")
    r_pre.font.name = "Calibri"
    r_pre.font.size = Pt(11)
    r_pre.font.bold = True
    r_pre.font.color.rgb = LAKE_BLUE

    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(18)
    p_title.paragraph_format.space_after = Pt(8)
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_title = p_title.add_run("CRIMELENS")
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(34)
    r_title.font.bold = True
    r_title.font.color.rgb = NAVY

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(24)
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = p_sub.add_run("Chicago Crime Intelligence & Spatial-Temporal Analytics Workstation\nComprehensive Project Documentation, Algorithmic Foundations & Viva Defense Handbook")
    r_sub.font.name = "Calibri"
    r_sub.font.size = Pt(13)
    r_sub.font.color.rgb = DARK_BLUE

    # Decorative Badge Table
    table = doc.add_table(rows=1, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    badges = [
        ("OFFICIAL WAREHOUSE CENSUS", "761,718 Real Chicago Incidents\n(36 Months: 2023–2025)", LAKE_BLUE),
        ("ARCHITECTURAL MODEL", "Kimball Star Schema in PostgreSQL\n(1 Fact + 6 Conformed Dims)", EMERALD),
        ("DATA MINING ENGINES", "DBSCAN • K-Means • PCA\nApriori Rules • Decision Tree", AMBER)
    ]
    for idx, (title, val, col) in enumerate(badges):
        cell = table.cell(0, idx)
        cell.width = Inches(2.1)
        set_cell_background(cell, HEX_LIGHT_GRAY)
        set_cell_margins(cell, top=100, bottom=100, left=100, right=100)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        rt = p.add_run(title + "\n")
        rt.font.name = "Calibri"
        rt.font.size = Pt(8.5)
        rt.font.bold = True
        rt.font.color.rgb = col
        rv = p.add_run(val)
        rv.font.name = "Calibri"
        rv.font.size = Pt(9.5)
        rv.font.bold = True
        rv.font.color.rgb = CHARCOAL

    p_space = doc.add_paragraph()
    p_space.paragraph_format.space_before = Pt(72)

    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_meta.paragraph_format.line_spacing = 1.3
    r_meta = p_meta.add_run(
        "Academic Year: 2025–2026\n"
        "Course: Data Warehousing & Mining (DWM) / Advanced Software Engineering\n"
        "Technology Stack: PostgreSQL 18.4 • Python 3.13 • FastAPI • React 18 • Vite • Power BI\n"
        "Data Source: City of Chicago Open Data Portal (Official Police Department Census)\n"
        "Documentation Scope: Chapters 1 through 24 (Complete Technical Treatise & Viva Guide)"
    )
    r_meta.font.name = "Calibri"
    r_meta.font.size = Pt(10)
    r_meta.font.color.rgb = MUTED_GRAY

    doc.add_page_break()

def add_table_of_contents(doc):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(14)
    r = p.add_run("TABLE OF CONTENTS")
    r.font.name = "Calibri"
    r.font.size = Pt(18)
    r.font.bold = True
    r.font.color.rgb = NAVY

    toc_items = [
        ("CHAPTER 1", "Introduction to CrimeLens: Modern Crime Intelligence Engineering"),
        ("CHAPTER 2", "A Real-World Scenario: A Day in the Life of a Crime Analyst (15 Modules)"),
        ("CHAPTER 3", "Complete System Architecture & Engineering Stack"),
        ("CHAPTER 4", "Dataset Understanding & Provenance: The 761,718 Incident Census"),
        ("CHAPTER 5", "Data Warehousing Foundations: The CrimeLens Star Schema"),
        ("CHAPTER 6", "OLAP Operations: Multidimensional Slicing and Dicing"),
        ("CHAPTER 7", "ETL Pipeline Engineering & Warehouse Observability"),
        ("CHAPTER 8", "Descriptive & Temporal Analytics: KPIs and Moving Averages"),
        ("CHAPTER 9", "DBSCAN Spatial Clustering: Geographic Hotspot Mining"),
        ("CHAPTER 10", "Hotspot Evolution: Longitudinal Spatial Cluster Tracking"),
        ("CHAPTER 11", "K-Means Clustering: Jurisdictional Typology Segmentation"),
        ("CHAPTER 12", "Principal Component Analysis (PCA): Dimensionality Reduction"),
        ("CHAPTER 13", "Apriori Association Rule Mining: Discovering Transactional Patterns"),
        ("CHAPTER 14", "Decision Tree Classification: Interpretable Arrest Prediction"),
        ("CHAPTER 15", "Machine Learning Evaluation Metrics: Precision, Recall, and ROC-AUC"),
        ("CHAPTER 16", "Automated Data-Driven Insights Engine"),
        ("CHAPTER 17", "Reports & Analytics Exports Engine"),
        ("CHAPTER 18", "Microsoft Power BI Integration: Enterprise Semantic Modeling"),
        ("CHAPTER 19", "Complete End-to-End Data Flow & Lifecycle"),
        ("CHAPTER 20", "Project Testing, Quality Assurance & Empirical Verification"),
        ("CHAPTER 21", "Advantages, Limitations & Future Engineering Scope"),
        ("CHAPTER 22", "Comprehensive Professor Viva Preparation (60+ Q&A)"),
        ("CHAPTER 23", "Final Viva & Demonstration Presentation Scripts"),
        ("CHAPTER 24", "Glossary of Technical Terms (50+ Definitions)")
    ]

    table = doc.add_table(rows=len(toc_items), cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    for idx, (ch_num, ch_title) in enumerate(toc_items):
        row = table.rows[idx]
        cell_num = row.cells[0]
        cell_title = row.cells[1]
        
        cell_num.width = Inches(1.5)
        cell_title.width = Inches(5.0)
        
        set_cell_margins(cell_num, top=40, bottom=40, left=60, right=60)
        set_cell_margins(cell_title, top=40, bottom=40, left=60, right=60)
        
        p0 = cell_num.paragraphs[0]
        r0 = p0.add_run(ch_num)
        r0.font.name = "Calibri"
        r0.font.size = Pt(10)
        r0.font.bold = True
        r0.font.color.rgb = LAKE_BLUE

        p1 = cell_title.paragraphs[0]
        r1 = p1.add_run(ch_title)
        r1.font.name = "Calibri"
        r1.font.size = Pt(10)
        r1.font.color.rgb = CHARCOAL

    doc.add_page_break()

def generate_complete_handbook(output_docx_path):
    print(f"Creating complete documentation handbook at: {output_docx_path}")
    doc = docx.Document()
    format_document_styles(doc)

    print("Adding Cover Page...")
    add_cover_page(doc)

    print("Adding Table of Contents...")
    add_table_of_contents(doc)

    print("Building Chapters 1 to 6...")
    chapters_part1.build_chapter_1(doc)
    doc.add_page_break()
    chapters_part1.build_chapter_2(doc)
    doc.add_page_break()
    chapters_part1.build_chapter_3(doc)
    doc.add_page_break()
    chapters_part1.build_chapter_4(doc)
    doc.add_page_break()
    chapters_part1.build_chapter_5(doc)
    doc.add_page_break()
    chapters_part1.build_chapter_6(doc)
    doc.add_page_break()

    print("Building Chapters 7 to 12...")
    chapters_part2.build_chapter_7(doc)
    doc.add_page_break()
    chapters_part2.build_chapter_8(doc)
    doc.add_page_break()
    chapters_part2.build_chapter_9(doc)
    doc.add_page_break()
    chapters_part2.build_chapter_10(doc)
    doc.add_page_break()
    chapters_part2.build_chapter_11(doc)
    doc.add_page_break()
    chapters_part2.build_chapter_12(doc)
    doc.add_page_break()

    print("Building Chapters 13 to 18...")
    chapters_part3.build_chapter_13(doc)
    doc.add_page_break()
    chapters_part3.build_chapter_14(doc)
    doc.add_page_break()
    chapters_part3.build_chapter_15(doc)
    doc.add_page_break()
    chapters_part3.build_chapter_16(doc)
    doc.add_page_break()
    chapters_part3.build_chapter_17(doc)
    doc.add_page_break()
    chapters_part3.build_chapter_18(doc)
    doc.add_page_break()

    print("Building Chapters 19 to 24...")
    chapters_part4.build_chapter_19(doc)
    doc.add_page_break()
    chapters_part4.build_chapter_20(doc)
    doc.add_page_break()
    chapters_part4.build_chapter_21(doc)
    doc.add_page_break()
    chapters_part4.build_chapter_22(doc)
    doc.add_page_break()
    chapters_part4.build_chapter_23(doc)
    doc.add_page_break()
    chapters_part4.build_chapter_24(doc)

    doc.save(output_docx_path)
    print(f"Successfully generated DOCX handbook ({output_docx_path})!")

if __name__ == "__main__":
    out_path = os.path.abspath("CrimeLens_Complete_Project_Documentation.docx")
    generate_complete_handbook(out_path)
