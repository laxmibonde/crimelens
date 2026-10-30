import React, { useState, useEffect } from 'react';
import { useDataset } from '../context/DatasetContext';
import {
  fetchTrendsMetadata,
  fetchTrendsTimeseries,
  fetchTrendsHeatmap,
  fetchCategoryTrends,
  fetchTrendsSeasonality,
  fetchTrendsInsights,
  fetchTrendsExplanation
} from '../services/api';
import {
  TrendingUp,
  Clock,
  Calendar,
  Layers,
  AlertTriangle,
  Info,
  Filter,
  BarChart2,
  Zap,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Sliders,
  Sun,
  Moon
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

export default function TrendAnalysisPage() {
  const { dataset } = useDataset();
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState(null);
  const [granularity, setGranularity] = useState('month');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Endpoint Data States
  const [timeseriesData, setTimeseriesData] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [heatmapNormalize, setHeatmapNormalize] = useState(false);
  const [seasonalityData, setSeasonalityData] = useState(null);
  const [insightsData, setInsightsData] = useState([]);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [methodology, setMethodology] = useState(null);

  // Initial metadata fetch
  useEffect(() => {
    async function loadMeta() {
      try {
        setLoading(true);
        const meta = await fetchTrendsMetadata();
        setMetadata(meta);
        const exp = await fetchTrendsExplanation();
        setMethodology(exp);
      } catch (err) {
        console.error("Error loading trend metadata:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMeta();
  }, [dataset]);

  // Main data fetch on filter change
  useEffect(() => {
    async function loadAnalysis() {
      try {
        setLoading(true);
        const distVal = selectedDistrict !== '' ? parseInt(selectedDistrict) : null;
        
        const [ts, hm, sea, ins] = await Promise.all([
          fetchTrendsTimeseries({
            granularity,
            categories: selectedCategories.length > 0 ? selectedCategories : null,
            district: distVal,
            start_date: startDate || null,
            end_date: endDate || null
          }),
          fetchTrendsHeatmap({
            categories: selectedCategories.length > 0 ? selectedCategories : null,
            district: distVal,
            normalize: heatmapNormalize
          }),
          fetchTrendsSeasonality({ district: distVal }),
          fetchTrendsInsights({ district: distVal })
        ]);

        setTimeseriesData(ts);
        setHeatmapData(hm);
        setSeasonalityData(sea);
        setInsightsData(ins.insights || []);

      } catch (err) {
        console.error("Error running trend analysis:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalysis();
  }, [dataset, granularity, selectedCategories, selectedDistrict, startDate, endDate, heatmapNormalize]);

  // Color generator for heatmap intensity
  const getHeatColor = (count, maxCount) => {
    if (!maxCount || count === 0) return 'rgba(30, 41, 59, 0.4)';
    const ratio = count / maxCount;
    if (ratio < 0.2) return 'rgba(59, 130, 246, 0.3)';
    if (ratio < 0.4) return 'rgba(14, 165, 233, 0.5)';
    if (ratio < 0.6) return 'rgba(234, 179, 8, 0.6)';
    if (ratio < 0.8) return 'rgba(249, 115, 22, 0.8)';
    return 'rgba(239, 68, 68, 0.9)';
  };

  return (
    <div style={{ padding: '24px', color: 'var(--text-main, #f8fafc)' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.9) 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <TrendingUp size={26} color="#38bdf8" />
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>
              Advanced Crime Trend Analysis & Temporal Intelligence
            </h1>
            <span style={{
              fontSize: '11px',
              padding: '3px 10px',
              borderRadius: '20px',
              fontWeight: 600,
              backgroundColor: dataset === 'synthetic' ? 'rgba(234,179,8,0.2)' : 'rgba(56,189,248,0.2)',
              color: dataset === 'synthetic' ? '#fde047' : '#38bdf8',
              border: `1px solid ${dataset === 'synthetic' ? 'rgba(234,179,8,0.4)' : 'rgba(56,189,248,0.4)'}`
            }}>
              {dataset === 'synthetic' ? 'SIMULATED DATASET' : 'REAL WAREHOUSE DATA'}
            </span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-dim, #94a3b8)', fontSize: '13px' }}>
            Analyze multi-granularity time series trajectories, moving averages, 7x24 day-hour heatmaps, and period-over-period composition shifts.
          </p>
        </div>
        <button
          onClick={() => setMethodologyOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(56,189,248,0.15)',
            color: '#38bdf8',
            border: '1px solid rgba(56,189,248,0.4)',
            borderRadius: '8px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px'
          }}
        >
          <BookOpen size={16} />
          Methodology
        </button>
      </div>

      {/* Dataset Sampling Coverage Banner */}
      {timeseriesData?.coverage_warning && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          backgroundColor: timeseriesData.coverage_warning.severity === 'WARNING' ? 'rgba(234,179,8,0.1)' : 'rgba(56,189,248,0.1)',
          border: `1px solid ${timeseriesData.coverage_warning.severity === 'WARNING' ? 'rgba(234,179,8,0.4)' : 'rgba(56,189,248,0.4)'}`,
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '24px'
        }}>
          <AlertTriangle size={20} color={timeseriesData.coverage_warning.severity === 'WARNING' ? '#fde047' : '#38bdf8'} style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: timeseriesData.coverage_warning.severity === 'WARNING' ? '#fde047' : '#38bdf8', marginBottom: '2px' }}>
              {timeseriesData.coverage_warning.flag.replace(/_/g, ' ')}
            </div>
            <div style={{ fontSize: '12.5px', color: '#cbd5e1', lineHeight: '1.4' }}>
              {timeseriesData.coverage_warning.message}
            </div>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div style={{
        backgroundColor: '#1e293b',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center'
      }}>
        {/* Time Granularity */}
        <div>
          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
            Granularity
          </label>
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value)}
            style={{
              backgroundColor: '#0f172a',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '13px'
            }}
          >
            {metadata?.granularities?.map(g => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </select>
        </div>

        {/* Police District */}
        <div>
          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
            Police District
          </label>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            style={{
              backgroundColor: '#0f172a',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '13px'
            }}
          >
            <option value="">All Districts (Entire Dataset)</option>
            {metadata?.districts?.map(d => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </div>

        {/* Reset Filters */}
        <button
          onClick={() => {
            setGranularity('month');
            setSelectedCategories([]);
            setSelectedDistrict('');
            setStartDate('');
            setEndDate('');
          }}
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'transparent',
            color: '#94a3b8',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '6px 14px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} />
          Reset Filters
        </button>
      </div>

      {/* Main Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#1e293b', padding: '16px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Selected Incidents</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#38bdf8' }}>
            {timeseriesData?.total_selected_incidents?.toLocaleString() || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Across selected parameters</div>
        </div>

        <div style={{ backgroundColor: '#1e293b', padding: '16px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Observed Periods</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#a78bfa' }}>
            {timeseriesData?.series?.length || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{granularity.toUpperCase()} intervals</div>
        </div>

        <div style={{ backgroundColor: '#1e293b', padding: '16px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Average / Period</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#34d399' }}>
            {timeseriesData?.series?.length ? Math.round(timeseriesData.total_selected_incidents / timeseriesData.series.length) : 0}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Mean count per slice</div>
        </div>

        <div style={{ backgroundColor: '#1e293b', padding: '16px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Peak Period Volume</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#fb7185' }}>
            {timeseriesData?.series?.length ? Math.max(...timeseriesData.series.map(s => s.count)).toLocaleString() : 0}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Maximum observed count</div>
        </div>
      </div>

      {/* Main Time-Series Chart */}
      <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
            Incident Trajectory & Moving Averages ({granularity.toUpperCase()})
          </h2>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            {['week', 'month', 'quarter', 'year'].includes(granularity)
              ? 'MA-3 = 3-Period Rolling Avg | MA-6 = 6-Period Rolling Avg (Partial-window mean used for initial periods 1-2 & 1-5)'
              : 'Categorical grouping — chronological rolling averages disabled'}
          </div>
        </div>

        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeseriesData?.series || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }} />
              <Legend />
              <Line type="monotone" dataKey="count" name="Observed Count" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
              {['week', 'month', 'quarter', 'year'].includes(granularity) && (
                <>
                  <Line type="monotone" dataKey="ma3" name="3-Period Moving Avg" stroke="#fde047" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="ma6" name="6-Period Moving Avg" stroke="#a78bfa" strokeWidth={2} strokeDasharray="2 2" dot={false} />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 7x24 Day-Hour Heatmap */}
      <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
              7 × 24 Temporal Matrix (Day of Week vs. Hour of Day)
            </h2>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              Diurnal incident concentration map across 168 weekly hour slots
            </div>
          </div>

          <button
            onClick={() => setHeatmapNormalize(!heatmapNormalize)}
            style={{
              backgroundColor: heatmapNormalize ? 'rgba(56,189,248,0.2)' : '#0f172a',
              color: heatmapNormalize ? '#38bdf8' : '#94a3b8',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            {heatmapNormalize ? 'Normalized Share (%)' : 'Raw Incident Counts'}
          </button>
        </div>

        {/* Heatmap Grid */}
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '90px repeat(24, 1fr)', gap: '4px', minWidth: '700px' }}>
            {/* Header row: hours */}
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Day \ Hour</div>
            {Array.from({ length: 24 }).map((_, h) => (
              <div key={h} style={{ fontSize: '10px', textAlign: 'center', color: '#94a3b8' }}>
                {strPad(h)}
              </div>
            ))}

            {/* Days rows */}
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
              const dayCells = heatmapData?.cells?.filter(c => c.day === day) || [];
              return (
                <React.Fragment key={day}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                    {day}
                  </div>
                  {Array.from({ length: 24 }).map((_, h) => {
                    const cell = dayCells.find(c => c.hour === h) || { count: 0, share_pct: 0, value: 0 };
                    const color = getHeatColor(cell.count, heatmapData?.max_cell_count || 1);
                    return (
                      <div
                        key={h}
                        title={`${day} ${strPad(h)}:00 -> ${cell.count} incidents (${cell.share_pct}% of selection)`}
                        style={{
                          backgroundColor: color,
                          height: '32px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          color: '#ffffff',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                      >
                        {heatmapNormalize ? `${cell.share_pct}%` : cell.count}
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Compact Color Scale Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: '14px', marginTop: '16px', fontSize: '11px', color: '#94a3b8' }}>
          <span style={{ fontWeight: 600, color: '#cbd5e1' }}>Incident Density Legend:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '3px', backgroundColor: 'rgba(59, 130, 246, 0.3)', border: '1px solid rgba(59, 130, 246, 0.5)' }}></span>
            <span>&lt;20% (Lowest)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '3px', backgroundColor: 'rgba(14, 165, 233, 0.5)', border: '1px solid rgba(14, 165, 233, 0.7)' }}></span>
            <span>20–40%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '3px', backgroundColor: 'rgba(234, 179, 8, 0.6)', border: '1px solid rgba(234, 179, 8, 0.8)' }}></span>
            <span>40–60%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '3px', backgroundColor: 'rgba(249, 115, 22, 0.8)', border: '1px solid rgba(249, 115, 22, 1.0)' }}></span>
            <span>60–80%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '3px', backgroundColor: 'rgba(239, 68, 68, 0.9)', border: '1px solid #ef4444' }}></span>
            <span>&gt;80% (Peak)</span>
          </div>
        </div>
      </div>

      {/* Exploratory Seasonality Section */}
      <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Sun size={20} color="#fde047" />
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
            Exploratory Temporal & Diurnal Seasonality
          </h2>
        </div>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 16px 0', lineHeight: '1.4' }}>
          {seasonalityData?.confidence_note}
        </p>

        {/* Seasonality Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Weekday vs Weekend */}
          <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '12px' }}>
              Weekday vs. Weekend Distribution
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', height: '140px' }}>
              <div style={{ flex: 1, backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Weekday Incidents</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#38bdf8', margin: '4px 0' }}>
                  {seasonalityData?.weekday_vs_weekend?.weekday_pct}%
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {seasonalityData?.weekday_vs_weekend?.weekday_count?.toLocaleString()} incidents
                </div>
              </div>

              <div style={{ flex: 1, backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Weekend Incidents</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#fde047', margin: '4px 0' }}>
                  {seasonalityData?.weekday_vs_weekend?.weekend_pct}%
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {seasonalityData?.weekday_vs_weekend?.weekend_count?.toLocaleString()} incidents
                </div>
              </div>
            </div>
          </div>

          {/* Diurnal Curve */}
          <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '12px' }}>
              24-Hour Diurnal Curve (00:00 – 23:00)
            </div>
            <div style={{ width: '100%', height: '140px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={seasonalityData?.hourly_distribution || []}>
                  <XAxis dataKey="hour" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                  <Line type="monotone" dataKey="count" stroke="#fde047" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 36-Month Year-Over-Year Monthly Comparison */}
        {seasonalityData?.monthly_year_over_year && seasonalityData.monthly_year_over_year.length > 0 && (
          <div style={{ marginTop: '20px', backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1' }}>
                Monthly Year-Over-Year Census Comparison (2023 vs. 2024 vs. 2025)
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Comparing 36 calendar months across all 3 warehouse years
              </div>
            </div>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seasonalityData.monthly_year_over_year}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month_name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }} />
                  <Legend />
                  <Bar dataKey="year_2023" name="Year 2023" fill="#38bdf8" />
                  <Bar dataKey="year_2024" name="Year 2024" fill="#a78bfa" />
                  {seasonalityData.monthly_year_over_year.some(m => m.year_2025 > 0) && (
                    <Bar dataKey="year_2025" name="Year 2025" fill="#34d399" />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Deterministic Temporal Insights */}
      <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Zap size={20} color="#34d399" />
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
            Automated Evidence-Based Insights
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {insightsData.map(ins => (
            <div key={ins.id} style={{ backgroundColor: '#0f172a', padding: '14px 16px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#38bdf8' }}>{ins.title}</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {ins.scope && (
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' }}>
                      {ins.scope}
                    </span>
                  )}
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#1e293b', color: '#94a3b8' }}>
                    {ins.category}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '12.5px', color: '#cbd5e1', lineHeight: '1.4' }}>
                {ins.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Methodology Drawer / Modal */}
      {methodologyOpen && methodology && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '650px',
            maxHeight: '80vh',
            overflowY: 'auto',
            color: '#f8fafc'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>{methodology.title}</h2>
              <button
                onClick={() => setMethodologyOpen(false)}
                style={{ backgroundColor: 'transparent', color: '#94a3b8', border: 'none', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {methodology.concepts.map((c, i) => (
              <div key={i} style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #1e293b' }}>
                <div style={{ fontWeight: 600, color: '#38bdf8', fontSize: '14px', marginBottom: '4px' }}>
                  {c.term}
                </div>
                <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.4' }}>
                  {c.definition}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers
function strPad(n) {
  return String(n).padStart(2, '0');
}
