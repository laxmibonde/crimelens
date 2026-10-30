# CrimeLens – Crime Pattern & Hotspot Intelligence System

> **College Data Warehousing & Mining (DWM) Project Foundation & UI Architecture**

---

## 📌 Project Overview

**CrimeLens** is a modern, high-density analytical crime intelligence platform designed for law enforcement analysts, public safety researchers, and urban planners. It leverages **Data Warehousing & Mining (DWM)** methodologies to transform raw transactional crime logs into actionable spatial, temporal, and pattern intelligence.

### **Core Objectives**
- **Spatial Hotspot Identification**: Detect geographic clusters and high-density crime zones using density-based spatial clustering.
- **Multi-Dimensional OLAP Exploration**: Slice, dice, roll-up, drill-down, and pivot transactional crime data across temporal, spatial, and categorical dimensions.
- **Pattern & Co-occurrence Mining**: Discover hidden relationships and crime co-occurrences using association rule mining and classification trees.
- **Temporal Trend Forecasting**: Analyze longitudinal patterns, diurnal shifts, and seasonal spikes to support preventive policing strategies.

---

## 🛠 Tech Stack

### **Frontend (Current Architecture)**
- **Framework & Build**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language**: JavaScript (ES6+)
- **Routing**: [React Router v6](https://reactrouter.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Visualizations**: [Recharts](https://recharts.org/) & [Leaflet / React-Leaflet](https://react-leaflet.js.org/) (ready for map & chart rendering)
- **Styling**: Custom responsive CSS design system (dark analytics theme with CSS variables)

### **Backend (Current Architecture)**
- **Language**: Python 3.13+
- **API Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **ASGI Server**: [Uvicorn](https://www.uvicorn.org/)
- **Middleware**: CORS (Cross-Origin Resource Sharing enabled for React frontend)

### **Future Database & Mining Pipeline**
- **Data Warehouse Target**: [PostgreSQL](https://www.postgresql.org/) (Dimensional Star Schema)
- **Data Mining & Analytics**: [Pandas](https://pandas.pydata.org/), [NumPy](https://numpy.org/), [scikit-learn](https://scikit-learn.org/), [mlxtend](https://rasbt.github.io/mlxtend/)

---

## 📁 Project Structure

```
CrimeLens/
├── backend/                  # FastAPI Python backend application
│   ├── main.py               # API endpoints & health check service
│   ├── requirements.txt       # Python dependencies
│   └── venv/                 # Virtual environment
├── data/                     # Data storage directories
│   ├── raw/                  # Raw crime dataset files (CSV, JSON, GeoJSON)
│   └── processed/            # Cleaned & transformed ETL output
├── database/                 # PostgreSQL schema scripts & DDL models
├── frontend/                 # React Vite frontend application
│   ├── public/               # Static assets & SVG icons
│   ├── src/
│   │   ├── components/       # Reusable UI components (Sidebar, Header, KPICard, ChartCard, FilterBar, EmptyState, InsightCard)
│   │   ├── pages/            # Page components (/dashboard, /hotspots, /olap, /patterns, /areas, /trends, /warehouse, /reports)
│   │   ├── App.jsx           # Master layout & route definitions
│   │   ├── index.css         # Analytics design system stylesheet
│   │   └── main.jsx          # React DOM entry point
│   ├── index.html            # Application HTML template
│   ├── package.json          # Node.js dependencies
│   └── vite.config.js        # Vite build & proxy settings
├── notebooks/                # Jupyter Notebooks for exploratory data analysis (EDA)
├── reports/                  # Generated analytical reports & documentation
└── README.md                 # Project documentation
```

---

## 🚀 Navigation & UI Modules

CrimeLens features 8 primary analytical modules accessible via the responsive sidebar navigation:

| Route | Module Name | Description & DWM Purpose |
| :--- | :--- | :--- |
| `/dashboard` | **Command Center** | Operational overview displaying KPI metrics, crime trend charts, distribution plots, spatial hotspots, and analytical insights. |
| `/hotspots` | **Hotspot Intelligence** | DBSCAN spatial clustering and geographic crime density heatmaps. |
| `/olap` | **OLAP Explorer** | Interactive multi-dimensional data cube operations (Roll-up, Drill-down, Slice, Dice, Pivot). |
| `/patterns` | **Pattern Mining** | Frequent itemset co-occurrence discovery via Apriori & Decision Tree classification rules. |
| `/areas` | **Area Intelligence** | Zonal precinct breakdowns, risk ranking tables, and administrative safety scores. |
| `/trends` | **Trend Intelligence** | Longitudinal time-series trajectory, seasonal decomposition, and diurnal intensity matrices. |
| `/warehouse` | **Data Warehouse** | PostgreSQL Star Schema schema diagram, Fact & Dimension table inventories, and ETL logs. |
| `/reports` | **Reports** | Automated executive report generator with parameter filters and export preview. |

> **Note on Data State**: In adherence to strict project standards, Phase 1 displays non-fabricated metrics (`"--"` / `"Awaiting data"`) and explicit empty state notices (`"Crime data will appear after the warehouse is loaded."`) until the real warehouse and ETL pipelines are connected.

---

## 🔬 Planned Data Warehousing & Mining Concepts (Future Phases)

In subsequent implementation phases, the project will incorporate the following DWM core concepts:

1. **Data Cleaning & Preprocessing**: Missing value imputation, coordinate validation, outlier filtering, and temporal normalization.
2. **ETL Pipeline**: Automated extraction from raw crime datasets, dimensional transformation, and loading into PostgreSQL.
3. **Data Warehouse & Dimensional Modeling**:
   - **Star Schema Design**:
     - `Fact_Crime`: Transactional fact table storing offense counts, response delays, and severity weights.
     - `Dim_Time`: Granular temporal hierarchy (Year, Quarter, Month, Day, Hour, Shift, IsWeekend).
     - `Dim_Location`: Spatial hierarchy (Precinct, District, Ward, Lat/Long, Zip).
     - `Dim_Category`: Offense taxonomy (Primary Type, Secondary Code, Severity Level).
     - `Dim_Area`: Administrative area demographics and geographic boundary metadata.
4. **OLAP Cube Operations**:
   - **Roll-up**: Aggregating from daily/precinct level to monthly/citywide totals.
   - **Drill-down**: Decomposing high-level figures into hourly/location-specific incidents.
   - **Slice**: Isolating a single dimension value (e.g., Year = 2024).
   - **Dice**: Subsetting multiple dimensions simultaneously (e.g., Year = 2024 AND Category = Robbery AND District = North).
   - **Pivot**: Reorienting dimension axes for tabular cross-analysis.
5. **Data Mining Algorithms**:
   - **DBSCAN**: Unsupervised spatial density clustering to discover non-linear hotspot boundaries without specifying initial cluster counts.
   - **K-Means**: Centroid partitioning for spatial precinct segmentations.
   - **Apriori Algorithm**: Extracting high-confidence association rules between temporal shifts, location types, and crime categories.
   - **Decision Tree Classifier**: Building predictive decision nodes for crime risk categorization based on environmental features.
6. **Time-Series Trend Analysis**: Moving averages, trend decomposition, and diurnal pattern profiling.

---

## ⚡ Quickstart & Setup Guide

### **Prerequisites**
- **Python** 3.10+
- **Node.js** v18+ & **npm**

### **1. Launch FastAPI Backend**
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend API Health Check Endpoint*: `http://127.0.0.1:8000/api/health`

### **2. Launch React Frontend**
```bash
cd frontend
npm install
npm run dev
```
*Frontend URL*: `http://localhost:5173/`

---

## 📑 License & Project Status

Developed for the **Data Warehousing and Mining Mini-Project**.  
**Current Phase**: Phase 1 – System Foundation & UI Architecture Complete.
