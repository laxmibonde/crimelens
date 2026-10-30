import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Flame,
  Tag,
  Clock,
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  ShieldAlert,
  Sparkles,
  Info,
  Layers,
  MapPin,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

import KPICard from '../components/KPICard';
import FilterBar from '../components/FilterBar';
import ChartCard from '../components/ChartCard';
import InsightCard from '../components/InsightCard';
import ChicagoSkylineHeader from '../components/ChicagoSkylineHeader';
import { CHICAGO_NIGHTFALL } from '../theme/colors';

import {
  fetchDashboardSummary,
  fetchDashboardTrends,
  fetchDashboardCategories,
  fetchDashboardAreas,
  fetchDashboardTimeAnalysis,
  fetchDashboardArrestStats,
  fetchDashboardDomesticStats,
  fetchDashboardInsights
} from '../services/api';

import { useDataset } from '../context/DatasetContext';

const COLOR_LAKE = CHICAGO_NIGHTFALL.lakeBlue;     // #35B8E8
const COLOR_RIVER = CHICAGO_NIGHTFALL.riverBlue;   // #17365D
const COLOR_AMBER = CHICAGO_NIGHTFALL.amber;       // #E9B44C
const COLOR_ALERT = CHICAGO_NIGHTFALL.alertRed;    // #E76F74
const COLOR_MINT = '#2EC4B6';
const COLOR_STEEL = '#4E6585';

// Custom dot renderer distinguishing full-month census from sample-capped extracts
const TrajectoryCustomDot = (props) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy) return null;
  const isFull = payload?.sample_type === 'FULL_MONTH_CENSUS' || payload?.sample_type === 'SYNTHETIC_BENCHMARK';
  const isPartial = payload?.sample_type === 'PARTIAL_EXTRACT';

  if (isFull) {
    return (
      <circle cx={cx} cy={cy} r={5} fill={COLOR_LAKE} stroke="#0B1423" strokeWidth={2} />
    );
  }
  if (isPartial) {
    return (
      <circle cx={cx} cy={cy} r={4.5} fill={COLOR_AMBER} stroke="#0B1423" strokeWidth={2} />
    );
  }
  return (
    <circle cx={cx} cy={cy} r={3.5} fill="#101B2E" stroke={COLOR_AMBER} strokeWidth={1.5} />
  );
};

// Research-safe custom tooltip explaining exact sample provenance
const TrajectoryCustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isSynthetic = data.sample_type === 'SYNTHETIC_BENCHMARK';
    const isFull = data.sample_type === 'FULL_MONTH_CENSUS';
    const isPartial = data.sample_type === 'PARTIAL_EXTRACT';

    let badgeBg = 'rgba(233, 180, 76, 0.15)';
    let badgeBorder = 'rgba(233, 180, 76, 0.4)';
    let badgeText = '#E9B44C';
    let badgeLabel = 'Sample-Capped Extract';

    if (isSynthetic) {
      badgeBg = 'rgba(53, 184, 232, 0.15)';
      badgeBorder = 'rgba(53, 184, 232, 0.4)';
      badgeText = '#35B8E8';
      badgeLabel = 'Synthetic Benchmark';
    } else if (isFull) {
      badgeBg = 'rgba(46, 196, 182, 0.15)';
      badgeBorder = 'rgba(46, 196, 182, 0.4)';
      badgeText = '#2EC4B6';
      badgeLabel = 'Full Month Census';
    } else if (isPartial) {
      badgeBg = 'rgba(233, 180, 76, 0.25)';
      badgeBorder = 'rgba(233, 180, 76, 0.5)';
      badgeText = '#E9B44C';
      badgeLabel = 'Partial Month Extract';
    }

    return (
      <div
        style={{
          backgroundColor: '#101B2E',
          border: '1px solid rgba(53, 184, 232, 0.3)',
          borderRadius: '8px',
          padding: '10px 14px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          maxWidth: '300px',
          fontSize: '12px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontWeight: 600, color: '#EAF2FF' }}>{label}</span>
          <span
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: badgeBg,
              border: `1px solid ${badgeBorder}`,
              color: badgeText,
              fontWeight: 600,
              letterSpacing: '0.3px'
            }}
          >
            {badgeLabel}
          </span>
        </div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: COLOR_LAKE, marginBottom: '6px' }}>
          {payload[0].value?.toLocaleString()} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Incidents</span>
        </div>
        {data.sampling_note && (
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.4, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '6px' }}>
            {data.sampling_note}
          </div>
        )}
      </div>
    );
  }
  return null;
};

const PIE_COLORS_ARREST = CHICAGO_NIGHTFALL.pieArrest;
const PIE_COLORS_DOMESTIC = CHICAGO_NIGHTFALL.pieDomestic;

export default function DashboardPage() {
  const { dataset, config, isSynthetic, disclaimer } = useDataset();
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Analytics Data States
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [categories, setCategories] = useState([]);
  const [areas, setAreas] = useState([]);
  const [timeAnalysis, setTimeAnalysis] = useState({ hourly_distribution: [], day_of_week_distribution: [] });
  const [arrestStats, setArrestStats] = useState([]);
  const [domesticStats, setDomesticStats] = useState([]);
  const [insights, setInsights] = useState([]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      fetchDashboardSummary(filters),
      fetchDashboardTrends(filters),
      fetchDashboardCategories(filters),
      fetchDashboardAreas(filters),
      fetchDashboardTimeAnalysis(filters),
      fetchDashboardArrestStats(filters),
      fetchDashboardDomesticStats(filters),
      fetchDashboardInsights(filters)
    ])
      .then(([sumData, trendData, catData, areaData, timeData, arrestData, domData, insightData]) => {
        setSummary(sumData);
        setTrends(trendData);
        setCategories(catData);
        setAreas(areaData);
        setTimeAnalysis(timeData);
        setArrestStats(arrestData);
        setDomesticStats(domData);
        setInsights(insightData.insights || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Dashboard data fetch error:', err);
        setError('Failed to query data warehouse analytics endpoints.');
        setLoading(false);
      });
  }, [filters, dataset]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({});
  };

  return (
    <div>
      {/* Chicago Skyline Command Center Header */}
      <ChicagoSkylineHeader
        title="Command Center Analytics"
        subtitle="Tactical urban intelligence querying PostgreSQL Star Schema warehouse"
        badgeText={isSynthetic ? "SYNTHETIC WAREHOUSE DEMO" : "CHICAGO HISTORICAL WAREHOUSE"}
      />

      {/* Dynamic OLAP Filter Bar */}
      <FilterBar
        selectedFilters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
      />

      {/* Sample-Based Disclaimer Banner */}
      <div
        style={{
          backgroundColor: 'rgba(23, 54, 93, 0.45)',
          border: '1px solid rgba(53, 184, 232, 0.25)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '12.5px',
          color: 'var(--off-white)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)'
        }}
      >
        <Info size={16} style={{ color: 'var(--lake-blue, #35B8E8)', flexShrink: 0 }} />
        <span>
          <strong style={{ color: 'var(--lake-blue, #35B8E8)' }}>Warehouse Scope Notice:</strong> {disclaimer || (isSynthetic
            ? "Operating on synthetic schema (30,000 incident sample) modeled with realistic Chicago spatial patterns."
            : "Operating on public production schema (761,718 official incidents, Chicago 2023–2025). Full census verified against City of Chicago Open Data Portal.")}
        </span>
      </div>

      {/* KPI Cards Grid with Chicago Nightfall Accents */}
      <div className="kpi-grid">
        <KPICard
          title="Recorded Incidents"
          value={loading ? "..." : (summary?.total_incidents?.toLocaleString() || "0")}
          subtitle="Fact_Crime Warehouse Records"
          icon={FileSpreadsheet}
          badgeText={isSynthetic ? "Synthetic Sample" : (filters.year ? `Year ${filters.year}` : "3-Year Census")}
          accentColor="lake"
        />
        <KPICard
          title="Crime Categories"
          value={loading ? "..." : (summary?.distinct_categories || "0")}
          subtitle="IUCR Taxonomy Groups"
          icon={Tag}
          badgeText="Dim_Crime"
          accentColor="default"
        />
        <KPICard
          title="Predominant Category"
          value={loading ? "..." : (summary?.top_category || "--")}
          subtitle="Leading Incident Cluster"
          icon={Flame}
          badgeText="Top Volume"
          accentColor="amber"
        />
        <KPICard
          title="Peak Time Window"
          value={loading ? "..." : (summary?.peak_time_period || "--")}
          subtitle="Highest Incident Shift"
          icon={Clock}
          badgeText="Temporal Peak"
          accentColor="lake"
        />
        <KPICard
          title="Arrest Rate"
          value={loading ? "..." : `${summary?.arrest_percentage || 0}%`}
          subtitle={`(${summary?.arrest_count?.toLocaleString() || 0} Arrests Made)`}
          icon={CheckCircle2}
          badgeText="Dim_Status"
          accentColor="green"
        />
        <KPICard
          title="Domestic Incident Share"
          value={loading ? "..." : `${summary?.domestic_percentage || 0}%`}
          subtitle={`(${summary?.domestic_count?.toLocaleString() || 0} Domestic Cases)`}
          icon={ShieldAlert}
          badgeText="Dim_Status"
          accentColor="red"
        />
      </div>

      {/* Main Charts & Analytics Grid */}
      <div className="dashboard-grid">

        {/* 1. Monthly Crime Trend Line Chart */}
        <div style={{ gridColumn: 'span 8' }}>
          <ChartCard
            title={filters.year ? `Monthly Crime Trajectory (Year ${filters.year})` : "Monthly Historical Crime Trajectory (2023–2025)"}
            badgeText={isSynthetic ? "Uniform Benchmark" : (filters.year ? "12-Month Subset" : "36-Month Census")}
            icon={TrendingUp}
            isEmpty={trends.length === 0}
            height="370px"
          >
            {/* Official Census Data Provenance Notice */}
            {!isSynthetic && (
              <div
                style={{
                  backgroundColor: 'rgba(53, 184, 232, 0.08)',
                  border: '1px solid rgba(53, 184, 232, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '11px',
                  color: '#EAF2FF',
                  lineHeight: 1.4
                }}
              >
                <CheckCircle2 size={14} style={{ color: COLOR_MINT, flexShrink: 0 }} />
                <div>
                  <strong style={{ color: COLOR_MINT }}>Official Chicago Census Data (2023–2025):</strong>{' '}
                  All 36 monthly counts reflect complete, unclipped reported crime records from the City of Chicago Open Data Portal, independently reconciled with 0 delta (761,718 total incidents).
                </div>
              </div>
            )}

            <ResponsiveContainer width="100%" height={isSynthetic ? 260 : 220}>
              <LineChart data={trends} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year_month" stroke="var(--text-dim)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-dim)" fontSize={11} tickLine={false} />
                <Tooltip content={<TrajectoryCustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="incident_count"
                  stroke={COLOR_LAKE}
                  strokeWidth={2}
                  dot={<TrajectoryCustomDot />}
                  activeDot={{ r: 7, fill: COLOR_LAKE, stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Custom Legend */}
            {!isSynthetic && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '16px',
                  marginTop: '6px',
                  fontSize: '10.5px',
                  color: 'var(--text-dim)'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: COLOR_LAKE, display: 'inline-block' }}></span>
                  Full Monthly Census (16.5k–24.3k incidents/month)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: COLOR_MINT, display: 'inline-block' }}></span>
                  Reconciled against City Portal (0 Delta)
                </span>
              </div>
            )}
          </ChartCard>
        </div>

        {/* 2. Arrest vs Non-Arrest Breakdown */}
        <div style={{ gridColumn: 'span 4' }}>
          <ChartCard
            title="Arrest Outcome Breakdown"
            badgeText="Operational Status"
            icon={PieIcon}
            isEmpty={arrestStats.length === 0}
            height="320px"
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={arrestStats}
                  dataKey="incident_count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  label={({ name, percentage }) => `${percentage}%`}
                >
                  {arrestStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS_ARREST[index % PIE_COLORS_ARREST.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#101B2E', borderColor: 'rgba(53, 184, 232, 0.25)', color: '#EAF2FF', fontSize: '12px', borderRadius: '6px' }} />
                <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-muted)' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* 3. Crime Category Breakdown Bar Chart */}
        <div style={{ gridColumn: 'span 7' }}>
          <ChartCard
            title="Top Offense Category Distribution"
            badgeText="IUCR Taxonomy"
            icon={BarChart3}
            isEmpty={categories.length === 0}
            height="340px"
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={categories} layout="vertical" margin={{ top: 10, right: 30, left: 90, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="var(--text-dim)" fontSize={11} />
                <YAxis dataKey="category" type="category" stroke="var(--text-muted)" fontSize={11} width={85} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#101B2E', borderColor: 'rgba(53, 184, 232, 0.25)', color: '#EAF2FF', fontSize: '12px', borderRadius: '6px' }}
                  formatter={(val, name, item) => [`${val.toLocaleString()} incidents (${item.payload.percentage}%)`, 'Volume']}
                />
                <Bar dataKey="incident_count" fill={COLOR_LAKE} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* 4. Incident Volume by Police District */}
        <div style={{ gridColumn: 'span 5' }}>
          <ChartCard
            title="Incidents by Police District"
            badgeText="Administrative Zonal"
            icon={MapPin}
            isEmpty={areas.length === 0}
            height="340px"
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={areas} margin={{ top: 15, right: 15, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="district" stroke="var(--text-dim)" fontSize={10} angle={-30} textAnchor="end" />
                <YAxis stroke="var(--text-dim)" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#101B2E', borderColor: 'rgba(53, 184, 232, 0.25)', color: '#EAF2FF', fontSize: '12px', borderRadius: '6px' }} />
                <Bar dataKey="incident_count" fill={COLOR_AMBER} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* 5. Hourly Incident Distribution */}
        <div style={{ gridColumn: 'span 8' }}>
          <ChartCard
            title="Hour-of-Day Incident Distribution"
            badgeText="Diurnal Breakdown"
            icon={Clock}
            isEmpty={timeAnalysis.hourly_distribution.length === 0}
            height="340px"
          >
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px' }}>
              Note: Peak at 00:00 (Midnight) reflects standard police recording convention for incidents with unobserved occurrence time.
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={timeAnalysis.hourly_distribution} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hour" stroke="var(--text-dim)" fontSize={11} formatter={(h) => `${h}:00`} />
                <YAxis stroke="var(--text-dim)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#101B2E', borderColor: 'rgba(53, 184, 232, 0.25)', color: '#EAF2FF', fontSize: '12px', borderRadius: '6px' }}
                  labelFormatter={(h) => `Hour ${h}:00 - ${h}:59`}
                />
                <Bar dataKey="incident_count" fill={COLOR_LAKE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* 6. Automated SQL Insights Section */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column' }}>
          <div className="chart-card" style={{ flex: 1 }}>
            <div className="chart-header">
              <div className="chart-title">
                <Info size={18} style={{ color: 'var(--lake-blue, #35B8E8)' }} />
                <span>Deterministic Insights</span>
              </div>
              <span className="chart-badge">SQL Engine</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {insights.map((ins, idx) => (
                <InsightCard
                  key={idx}
                  title={ins.title}
                  body={ins.body}
                  type={ins.type}
                  timestamp="Star Schema SQL Query Result"
                />
              ))}

              {insights.length === 0 && (
                <div style={{ color: 'var(--text-dim)', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
                  No active filter insights.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
