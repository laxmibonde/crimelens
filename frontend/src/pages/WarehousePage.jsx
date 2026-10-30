import React from 'react';
import { Database, Server, HardDrive, RefreshCw, Table } from 'lucide-react';
import ChartCard from '../components/ChartCard';
import KPICard from '../components/KPICard';

export default function WarehousePage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <Database size={24} style={{ color: 'var(--primary-indigo)' }} />
          Data Warehouse & ETL Architecture
        </h1>
        <p className="page-description">
          PostgreSQL Star Schema dimensional models, fact/dimension inventory, and ETL execution logs.
        </p>
      </div>

      <div className="kpi-grid">
        <KPICard title="DW Database Engine" value="PostgreSQL" subtitle="Planned relational target" icon={Database} badgeText="Relational" />
        <KPICard title="ETL Pipeline Status" value="Standing By" subtitle="Script initialization pending" icon={RefreshCw} badgeText="Pandas / Python" />
        <KPICard title="Fact Tables" value="Fact_Crime" subtitle="Core transactional fact schema" icon={Table} badgeText="1 Schema" />
        <KPICard title="Dimension Tables" value="4 Tables" subtitle="Dim_Time, Dim_Location, Dim_Category, Dim_Area" icon={Server} badgeText="Dimensions" />
      </div>

      <div className="dashboard-grid">
        <div style={{ gridColumn: 'span 12' }}>
          <ChartCard
            title="Dimensional Modeling & Star Schema Layout"
            badgeText="Star Schema"
            icon={HardDrive}
            isEmpty={true}
            emptyTitle="Data warehouse connections and table metrics will appear after ETL execution."
            emptyDesc="The central Fact_Crime table linked to Dim_Time, Dim_Location, Dim_Category, and Dim_Area will display record counts and index statuses once loaded into PostgreSQL."
            height="380px"
          />
        </div>
      </div>
    </div>
  );
}
