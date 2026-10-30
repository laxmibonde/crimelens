import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

# Chicago Nightfall Palette for Academic Print
NAVY = RGBColor(11, 27, 61)       # #0B1B3D - Deep Civic Navy
DARK_BLUE = RGBColor(22, 50, 92)  # #16325C - Structural Navy
LAKE_BLUE = RGBColor(27, 117, 188)# #1B75BC - Vibrant Lake Blue
AMBER = RGBColor(217, 119, 6)     # #D97706 - Warning / Accent Amber
EMERALD = RGBColor(5, 150, 105)   # #059669 - Validated Emerald
CHARCOAL = RGBColor(34, 34, 34)   # #222222 - High Contrast Body Text
MUTED_GRAY = RGBColor(100, 116, 139) # #64748B - Subtitle / Caption Gray

HEX_NAVY = "0B1B3D"
HEX_LAKE_BLUE = "1B75BC"
HEX_LIGHT_BLUE = "F0F7FF"
HEX_LIGHT_AMBER = "FFFBEB"
HEX_LIGHT_GRAY = "F8FAFC"
HEX_BORDER_GRAY = "CBD5E1"
HEX_CODE_BG = "0F172A"

def set_cell_background(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def set_cell_left_border_only(cell, hex_color=HEX_LAKE_BLUE, size="36"):
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="{size}" w:space="0" w:color="{hex_color}"/><w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:tcBorders>')
    tcPr.append(borders)

def format_document_styles(doc):
    # Set standard margins: 1 inch all around
    sections = doc.sections
    for s in sections:
        s.top_margin = Inches(1.0)
        s.bottom_margin = Inches(1.0)
        s.left_margin = Inches(1.0)
        s.right_margin = Inches(1.0)
        s.different_first_page_header_footer = True

        # Header for later pages
        header = s.header
        hp = header.paragraphs[0]
        hp.text = "CrimeLens — Chicago Crime Analytics Workstation | Academic Handbook"
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hp.style.font.name = "Calibri"
        hp.style.font.size = Pt(8.5)
        hp.style.font.color.rgb = MUTED_GRAY

        # Footer for later pages
        footer = s.footer
        fp = footer.paragraphs[0]
        fp.text = "Computer Engineering Project & DWM Viva Guide  •  Confidential & Academic Use"
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        fp.style.font.name = "Calibri"
        fp.style.font.size = Pt(8.5)
        fp.style.font.color.rgb = MUTED_GRAY

    # Set normal style
    normal = doc.styles['Normal']
    normal.font.name = 'Calibri'
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = CHARCOAL
    normal.paragraph_format.line_spacing = 1.15
    normal.paragraph_format.space_after = Pt(4)

def add_chapter_heading(doc, title, number=None):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.keep_with_next = True
    
    if number is not None:
        num_run = p.add_run(f"CHAPTER {number}\n")
        num_run.font.name = "Calibri"
        num_run.font.size = Pt(11)
        num_run.font.bold = True
        num_run.font.color.rgb = LAKE_BLUE
        
    title_run = p.add_run(title)
    title_run.font.name = "Calibri"
    title_run.font.size = Pt(18)
    title_run.font.bold = True
    title_run.font.color.rgb = NAVY

def add_section_heading(doc, title):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(title)
    r.font.name = "Calibri"
    r.font.size = Pt(13.5)
    r.font.bold = True
    r.font.color.rgb = DARK_BLUE

def add_subsection_heading(doc, title):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(title)
    r.font.name = "Calibri"
    r.font.size = Pt(11.5)
    r.font.bold = True
    r.font.color.rgb = LAKE_BLUE

def add_bullet_point(doc, bold_prefix, text):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15
    r_bold = p.add_run(bold_prefix + ": ")
    r_bold.font.bold = True
    r_bold.font.color.rgb = DARK_BLUE
    r_text = p.add_run(text)
    r_text.font.color.rgb = CHARCOAL

def add_callout_box(doc, title, text, box_type="note"):
    # Types: "note" (blue), "warning" (amber), "theory" (navy), "worked" (emerald)
    border_color = HEX_LAKE_BLUE
    bg_color = HEX_LIGHT_BLUE
    title_color = LAKE_BLUE

    if box_type == "warning":
        border_color = "D97706"
        bg_color = HEX_LIGHT_AMBER
        title_color = AMBER
    elif box_type == "theory":
        border_color = HEX_NAVY
        bg_color = HEX_LIGHT_GRAY
        title_color = NAVY
    elif box_type == "worked":
        border_color = "059669"
        bg_color = "ECFDF5"
        title_color = EMERALD

    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    cell = table.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, bg_color)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
    set_cell_left_border_only(cell, border_color, size="36")

    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(3)
    r_title = p.add_run(f"📌 {title.upper()}\n")
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(10)
    r_title.font.bold = True
    r_title.font.color.rgb = title_color

    r_text = p.add_run(text)
    r_text.font.name = "Calibri"
    r_text.font.size = Pt(10)
    r_text.font.color.rgb = CHARCOAL
    
    doc.add_paragraph().paragraph_format.space_after = Pt(2)

def add_code_block(doc, code_text):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    cell = table.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, "0F172A")
    set_cell_margins(cell, top=120, bottom=120, left=160, right=160)
    
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="18" w:space="0" w:color="1E3758"/><w:top w:val="single" w:sz="18" w:space="0" w:color="1E3758"/><w:right w:val="single" w:sz="18" w:space="0" w:color="1E3758"/><w:bottom w:val="single" w:sz="18" w:space="0" w:color="1E3758"/></w:tcBorders>')
    tcPr.append(borders)

    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    r = p.add_run(code_text)
    r.font.name = "Consolas"
    r.font.size = Pt(9.0)
    r.font.color.rgb = RGBColor(56, 189, 248) # Cyan lake code
    
    doc.add_paragraph().paragraph_format.space_after = Pt(2)

def create_styled_table(doc, headers, data, col_widths=None):
    table = doc.add_table(rows=len(data) + 1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    # Header Row
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        set_cell_background(hdr_cells[i], HEX_NAVY)
        set_cell_margins(hdr_cells[i], top=100, bottom=100, left=120, right=120)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        for run in p.runs:
            run.font.name = "Calibri"
            run.font.size = Pt(9.5)
            run.font.bold = True
            run.font.color.rgb = RGBColor(255, 255, 255)

    # Data Rows
    for r_idx, row_data in enumerate(data):
        row_cells = table.rows[r_idx + 1].cells
        bg_col = HEX_LIGHT_GRAY if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_data):
            row_cells[c_idx].text = str(val)
            set_cell_background(row_cells[c_idx], bg_col)
            set_cell_margins(row_cells[c_idx], top=80, bottom=80, left=120, right=120)
            p = row_cells[c_idx].paragraphs[0]
            for run in p.runs:
                run.font.name = "Calibri"
                run.font.size = Pt(9.0)
                run.font.color.rgb = CHARCOAL

    # Set Column Widths if specified
    if col_widths:
        for row in table.rows:
            for c_idx, w in enumerate(col_widths):
                row.cells[c_idx].width = Inches(w)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)
    return table
