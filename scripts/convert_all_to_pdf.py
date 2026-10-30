import os
import sys
import time

try:
    import win32com.client
except ImportError:
    print("win32com.client is not installed in this Python environment.")
    sys.exit(1)

def convert_docs_to_pdf():
    files = [
        "CrimeLens_Complete_Project_Documentation",
        "CrimeLens_Viva_Quick_Revision"
    ]
    
    word = win32com.client.DispatchEx("Word.Application")
    word.Visible = False
    word.DisplayAlerts = 0
    
    try:
        for file_base in files:
            docx_path = os.path.abspath(f"{file_base}.docx")
            pdf_path = os.path.abspath(f"{file_base}.pdf")
            
            if not os.path.exists(docx_path):
                print(f"File not found: {docx_path}")
                continue
                
            print(f"Opening: {docx_path} ...")
            doc = word.Documents.Open(docx_path)
            
            # Update fields (e.g. TOC, page numbers if any)
            try:
                doc.Fields.Update()
            except Exception as fe:
                print(f"Notice during Fields.Update: {fe}")
                
            print(f"Saving to PDF: {pdf_path} ...")
            # 17 = wdFormatPDF
            doc.SaveAs(pdf_path, FileFormat=17)
            doc.Close(SaveChanges=0)
            print(f"Successfully converted: {pdf_path} (Size: {os.path.getsize(pdf_path)} bytes)")
    finally:
        word.Quit()
        print("Word application closed cleanly.")

if __name__ == "__main__":
    convert_docs_to_pdf()
