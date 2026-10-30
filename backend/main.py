import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from datetime import datetime
from sqlalchemy import text
from database import get_engine, dispose_engine

# Adjust sys.path for clean imports
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from routers.dashboard import router as dashboard_router
from routers.olap import router as olap_router
from routers.hotspots import router as hotspots_router
from routers.kmeans import router as kmeans_router
from routers.apriori import router as apriori_router
from routers.decision_tree import router as decision_tree_router
from routers.area_intelligence import router as area_intelligence_router
from routers.trend_analysis import router as trend_analysis_router
from routers.change_comparison import router as change_comparison_router
from routers.insights import router as insights_router
from routers.etl_monitoring import router as etl_monitoring_router
from routers.data_quality import router as data_quality_router
from routers.reports import router as reports_router
from routers.powerbi import router as powerbi_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages application lifespan events:
    - Pre-warms singleton SQLAlchemy connection pool on startup
    - Disposes of connection pool and closes all active DB sessions on shutdown
    """
    try:
        get_engine()
    except Exception:
        pass
    yield
    dispose_engine()

app = FastAPI(
    title="CrimeLens API",
    description="Backend API for CrimeLens - Crime Pattern & Hotspot Intelligence System",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for React frontend communication (strict origins for security compliance)
cors_env = os.getenv("CORS_ORIGINS", "")
custom_origins = [o.strip() for o in cors_env.split(",") if o.strip()]
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]
origins = list(set(default_origins + custom_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include Dashboard Analytics Router
app.include_router(dashboard_router)
# Include OLAP Data Cube Router
app.include_router(olap_router)
# Include DBSCAN Hotspots Router
app.include_router(hotspots_router)
# Include K-Means Area Clustering Router
app.include_router(kmeans_router)
# Include Apriori Association Rules Router
app.include_router(apriori_router)
# Include Decision Tree Classification Router
app.include_router(decision_tree_router)
# Include Area Intelligence & Comparison Router
app.include_router(area_intelligence_router)
# Include Advanced Crime Trend Analysis Router
app.include_router(trend_analysis_router)
# Include What Changed? Multi-Dimensional Comparison Router
app.include_router(change_comparison_router)
# Include Automated Data-Driven Insights Router
app.include_router(insights_router)
# Include ETL Monitoring & Observability Router
app.include_router(etl_monitoring_router)
# Include Data Quality Intelligence Router
app.include_router(data_quality_router)
# Include Report Generation & Exports Router
app.include_router(reports_router)
# Include Power BI Integration & Semantic Model Router
app.include_router(powerbi_router)




@app.get("/")
def read_root():
    return {
        "system": "CrimeLens Intelligence System API",
        "status": "online",
        "health_check": "/api/health"
    }

@app.get("/api/health")
def get_health():
    """
    Comprehensive system and database health check endpoint.
    Verifies FastAPI server readiness and active PostgreSQL 18 Data Warehouse connectivity.
    """
    db_details = {
        "connected": False,
        "database_type": "PostgreSQL 18",
        "schemas": {
            "real_warehouse": {"status": "unverified", "row_count": 0},
            "synthetic_warehouse": {"status": "unverified", "row_count": 0}
        }
    }
    
    try:
        engine = get_engine()
        with engine.connect() as conn:
            real_count = conn.execute(text("SELECT COUNT(*) FROM public.fact_crime")).scalar() or 0
            synth_count = conn.execute(text("SELECT COUNT(*) FROM synthetic_data.fact_crime")).scalar() or 0
            
            db_details["connected"] = True
            db_details["schemas"]["real_warehouse"] = {
                "status": "healthy",
                "table": "public.fact_crime",
                "row_count": int(real_count)
            }
            db_details["schemas"]["synthetic_warehouse"] = {
                "status": "healthy",
                "table": "synthetic_data.fact_crime",
                "row_count": int(synth_count)
            }
            
        return {
            "status": "healthy",
            "system": "CrimeLens - Crime Pattern & Hotspot Intelligence System",
            "version": "1.0.0",
            "message": "CrimeLens API and PostgreSQL Data Warehouse are running successfully",
            "database": db_details,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        db_details["error"] = str(e)
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "system": "CrimeLens - Crime Pattern & Hotspot Intelligence System",
                "version": "1.0.0",
                "message": f"Database health check failed: {str(e)}",
                "database": db_details,
                "timestamp": datetime.now().isoformat()
            }
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
