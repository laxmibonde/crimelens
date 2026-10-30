import re
from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import services.report_generation_service as report_service

router = APIRouter(
    prefix="/api/reports",
    tags=["Report Generation, Analytics Exports & Report Center"]
)

def get_safe_filename(report_type: str, dataset: str, report_id: Any, ext: str) -> str:
    """Sanitizes export filename to prevent CRLF header injection and directory traversal."""
    clean_type = re.sub(r'[^a-zA-Z0-9_-]', '_', str(report_type))[:32]
    clean_ds = re.sub(r'[^a-zA-Z0-9_-]', '_', str(dataset))[:16]
    clean_id = re.sub(r'[^a-zA-Z0-9_-]', '_', str(report_id))[:36]
    return f"CrimeLens_{clean_type}_{clean_ds}_{clean_id}.{ext}"

class ReportGenerateRequest(BaseModel):
    dataset: str = Field("real", description="Dataset selector ('real' or 'synthetic')")
    report_type: str = Field("comprehensive", description="Report template ID")
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Optional analytical filters")


@router.get("/metadata")
def get_reports_metadata(dataset: str = Query("real")):
    try:
        return report_service.get_reports_metadata(dataset=dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/preview")
def preview_report(req: ReportGenerateRequest):
    try:
        data = report_service.generate_report_data(
            dataset=req.dataset,
            report_type=req.report_type,
            filters=req.filters
        )
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate")
def generate_report(req: ReportGenerateRequest):
    try:
        data = report_service.generate_report_data(
            dataset=req.dataset,
            report_type=req.report_type,
            filters=req.filters
        )
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export/pdf")
def export_pdf(req: ReportGenerateRequest):
    try:
        data = report_service.generate_report_data(
            dataset=req.dataset,
            report_type=req.report_type,
            filters=req.filters
        )
        pdf_bytes = report_service.generate_pdf_report(data)
        filename = get_safe_filename(req.report_type, req.dataset, data.get('report_id', '0'), "pdf")

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export/excel")
def export_excel(req: ReportGenerateRequest):
    try:
        data = report_service.generate_report_data(
            dataset=req.dataset,
            report_type=req.report_type,
            filters=req.filters
        )
        excel_bytes = report_service.generate_excel_report(data)
        filename = get_safe_filename(req.report_type, req.dataset, data.get('report_id', '0'), "xlsx")

        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export/csv")
def export_csv(req: ReportGenerateRequest):
    try:
        data = report_service.generate_report_data(
            dataset=req.dataset,
            report_type=req.report_type,
            filters=req.filters
        )
        csv_bytes = report_service.generate_csv_report(data)
        filename = get_safe_filename(req.report_type, req.dataset, data.get('report_id', '0'), "csv")

        return Response(
            content=csv_bytes,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/explain")
def get_reports_explanation():
    return {
        "title": "Academic Methodology: Professional Report Generation & Analytics Exports",
        "concepts": [
            {
                "term": "Zero-Fabrication Data Reporting",
                "definition": "All PDF, Excel, and CSV report metrics are calculated directly from live PostgreSQL star-schema tables. No statistics, charts, or samples are hardcoded or fake."
            },
            {
                "term": "Spreadsheet Formula Injection Sanitization",
                "definition": "Prevents formula execution vulnerabilities in Excel and CSV files by neutralizing leading '=', '+', '-', and '@' characters in exported string fields."
            },
            {
                "term": "Mandatory Data Provenance Disclaimers",
                "definition": "Reports prominently feature dataset isolation disclaimers (e.g. 76.9% January sampling concentration for real data vs 1,250/mo uniform simulation for synthetic data)."
            },
            {
                "term": "Reproducible Analysis & Configuration Audit",
                "definition": "Every exported report records the exact dataset, timestamp, applied filters, algorithm parameters, and calculation methodology for full academic auditability."
            }
        ]
    }
