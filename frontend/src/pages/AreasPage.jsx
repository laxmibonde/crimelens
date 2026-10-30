import React from 'react';
import { Map, ShieldAlert, Building2, BarChart2 } from 'lucide-react';
import FilterBar from '../components/FilterBar';
import ChartCard from '../components/ChartCard';
import KPICard from '../components/KPICard';

export default function AreasPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <Map size={24} style={{ color: 'var(--accent-amber)' }} />
          Area & Precinct Intelligence
        </h1>
        <p className="page-description">
          Zonal profiling, precinct risk ranking, and administrative boundary analytics.
        </p>
      </div>

      <FilterBar />

      <div className="kpi-grid">
        <KPICard title="Total Monitoring Precincts" value="--" subtitle="Boundary dataset pending" icon={Building2} />
        <KPICard title="High Risk Zones" value="--" subtitle="Zonal classification pending" icon={ShieldAlert} />
        <KPICard title="Safest Identified Area" value="--" subtitle="Comparative analytics pending" icon={Map} />
        <KPICard title="Average Zone Crime Rate" value="--" subtitle="Per-capita normalization pending" icon={BarChart2} />
      </div>

      <div className="dashboard-grid">
        <div style={{ gridColumn: 'span 12' }}>
          <ChartCard
            title="Precinct Risk Ranking & Zonal Breakdown"
            badgeText="Zonal Analytics"
            icon={Map}
            isEmpty={true}
            emptyTitle="Precinct intelligence table will load after dimensional data integration."
            emptyDesc="Comparative precinct metrics, safety indices, and localized crime volume rankings will be shown here."
            height="400px"
          />
        </div>
      </div>
    </div>
  );
}
