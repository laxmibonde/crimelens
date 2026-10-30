import React from 'react';
import { TrendingUp, Calendar, Clock, BarChart3 } from 'lucide-react';
import FilterBar from '../components/FilterBar';
import ChartCard from '../components/ChartCard';
import KPICard from '../components/KPICard';

export default function TrendsPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <TrendingUp size={24} style={{ color: 'var(--primary-cyan)' }} />
          Trend Intelligence & Forecasting
        </h1>
        <p className="page-description">
          Longitudinal time-series analysis, temporal seasonality, and predictive forecasting.
        </p>
      </div>

      <FilterBar />

      <div className="kpi-grid">
        <KPICard title="Year-over-Year Delta" value="--" subtitle="Comparative baseline pending" icon={TrendingUp} />
        <KPICard title="Peak Crime Month" value="--" subtitle="Seasonality model pending" icon={Calendar} />
        <KPICard title="High Risk Shift" value="--" subtitle="Diurnal breakdown pending" icon={Clock} />
        <KPICard title="Trend Direction" value="--" subtitle="Linear regression pending" icon={BarChart3} />
      </div>

      <div className="dashboard-grid">
        <div style={{ gridColumn: 'span 8' }}>
          <ChartCard
            title="Multi-Year Longitudinal Crime Progression"
            badgeText="Time-Series"
            icon={TrendingUp}
            isEmpty={true}
            emptyTitle="Longitudinal trend curves will populate after ETL processing."
            emptyDesc="Historical crime trajectory over months and years with moving average overlays will display here."
            height="360px"
          />
        </div>

        <div style={{ gridColumn: 'span 4' }}>
          <ChartCard
            title="Seasonal & Diurnal Heatmap"
            badgeText="Seasonality"
            icon={Clock}
            isEmpty={true}
            emptyTitle="Seasonality matrix will display after temporal loading."
            emptyDesc="Day-of-week vs. hour-of-day crime intensity matrix will render here."
            height="360px"
          />
        </div>
      </div>
    </div>
  );
}
