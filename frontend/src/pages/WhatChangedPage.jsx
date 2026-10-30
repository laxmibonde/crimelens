import React, { useState, useEffect } from 'react';
import { useDataset } from '../context/DatasetContext';
import {
  fetchChangesMetadata,
  fetchChangesOverview,
  fetchChangesCategories,
  fetchChangesAreas,
  fetchChangesTemporal,
  fetchChangesHotspots,
  fetchChangesInsights,
  fetchChangesExplanation
} from '../services/api';
import {
  GitCompare,
  Calendar,
  Layers,
  MapPin,
  Clock,
  AlertTriangle,
  Info,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Zap,
  CheckCircle,
  XCircle,
  HelpCircle,
  Sliders
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell
} from 'recharts';

export default function WhatChangedPage() {
  const { dataset } = useDataset();

  // State Variables
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState(null);
  const [periodAStart, setPeriodAStart] = useState('2023-01-01');
  const [periodAEnd, setPeriodAEnd] = useState('2023-01-31');
  const [periodBStart, setPeriodBStart] = useState('2024-01-01');
  const [periodBEnd, setPeriodBEnd] = useState('2024-01-31');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [minSampleSize, setMinSampleSize] = useState(10);
  const [areaGranularity, setAreaGranularity] = useState('district');

  // Comparison Results
  const [overviewData, setOverviewData] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [areaData, setAreaData] = useState(null);
  const [temporalData, setTemporalData] = useState(null);
  const [hotspotData, setHotspotData] = useState(null);
  const [insightsData, setInsightsData] = useState([]);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [methodology, setMethodology] = useState(null);

  // Search / Filter
  const [categorySearch, setCategorySearch] = useState('');

  // Initial Metadata Fetch
  useEffect(() => {
    async function loadMeta() {
      try {
        setLoading(true);
        const meta = await fetchChangesMetadata();
        setMetadata(meta);
        const exp = await fetchChangesExplanation();
        setMethodology(exp);
      } catch (err) {
        console.error("Error loading comparison metadata:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMeta();
  }, [dataset]);

  // Main Comparison Execution
  const runComparison = async () => {
    try {
      setLoading(true);
      const payload = {
        period_a_start: periodAStart,
        period_a_end: periodAEnd,
        period_b_start: periodBStart,
        period_b_end: periodBEnd,
        district: selectedDistrict || null
      };

      // 1. Overview
      const ov = await fetchChangesOverview(payload);
      setOverviewData(ov);

      // 2. Categories
      const cat = await fetchChangesCategories(payload);
      setCategoryData(cat);

      // 3. Areas
      const ar = await fetchChangesAreas({ ...payload, granularity: areaGranularity, min_sample_size: minSampleSize });
      setAreaData(ar);

      // 4. Temporal
      const temp = await fetchChangesTemporal(payload);
      setTemporalData(temp);

      // 5. Hotspots
      const hs = await fetchChangesHotspots({ ...payload, match_threshold_meters: 500.0 });
      setHotspotData(hs);

      // 6. Insights
      const ins = await fetchChangesInsights();
      setInsightsData(ins.insights || []);

    } catch (err) {
      console.error("Error executing comparison:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runComparison();
  }, [dataset, areaGranularity]);

  const swapPeriods = () => {
    setPeriodAStart(periodBStart);
    setPeriodAEnd(periodBEnd);
    setPeriodBStart(periodAStart);
    setPeriodBEnd(periodAEnd);
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
            <GitCompare size={26} color="#38bdf8" />
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>
              What Changed? Multi-Dimensional Comparison Engine
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
            Compare baseline vs. comparison periods across crime categories, police districts, diurnal patterns, and DBSCAN spatial hotspots.
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

      {/* Comparison Configuration Controls */}
      <div style={{
        backgroundColor: '#1e293b',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '20px', alignItems: 'center', marginBottom: '16px' }}>
          {/* Period A Baseline */}
          <div style={{ backgroundColor: '#0f172a', padding: '14px', borderRadius: '8px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#38bdf8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={16} /> Period A Baseline
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="date" value={periodAStart} onChange={(e) => setPeriodAStart(e.target.value)} style={inputStyle} />
              <input type="date" value={periodAEnd} onChange={(e) => setPeriodAEnd(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Swap Button */}
          <button
            onClick={swapPeriods}
            title="Swap Period A and Period B"
            style={{
              backgroundColor: '#0f172a',
              color: '#38bdf8',
              border: '1px solid #334155',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <GitCompare size={18} />
          </button>

          {/* Period B Target */}
          <div style={{ backgroundColor: '#0f172a', padding: '14px', borderRadius: '8px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#a78bfa', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={16} /> Period B Target
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="date" value={periodBStart} onChange={(e) => setPeriodBStart(e.target.value)} style={inputStyle} />
              <input type="date" value={periodBEnd} onChange={(e) => setPeriodBEnd(e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          {/* Police District */}
          <div>
            <label style={labelStyle}>Police District</label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              style={selectStyle}
            >
              <option value="">All Districts (Entire City)</option>
              {metadata?.districts?.map(d => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Min Sample Size */}
          <div>
            <label style={labelStyle}>Min Sample Threshold</label>
            <input
              type="number"
              min="1"
              max="500"
              value={minSampleSize}
              onChange={(e) => setMinSampleSize(parseInt(e.target.value) || 1)}
              style={{ ...inputStyle, width: '100px' }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
            <button
              onClick={runComparison}
              style={{
                backgroundColor: '#38bdf8',
                color: '#0f172a',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 18px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Execute Comparison
            </button>

            <button
              onClick={() => {
                setPeriodAStart('2023-01-01');
                setPeriodAEnd('2023-01-31');
                setPeriodBStart('2024-01-01');
                setPeriodBEnd('2024-01-31');
                setSelectedDistrict('');
                setMinSampleSize(10);
              }}
              style={{
                backgroundColor: 'transparent',
                color: '#94a3b8',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '8px 14px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Warnings & Coverage Banner */}
      {overviewData?.warnings?.map((w, idx) => (
        <div key={idx} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: w.flag === 'HISTORICAL_SAMPLING_BIAS' || w.flag === 'UNEQUAL_PERIOD_DURATIONS' ? 'rgba(234,179,8,0.1)' : 'rgba(56,189,248,0.1)',
          border: `1px solid ${w.flag === 'HISTORICAL_SAMPLING_BIAS' || w.flag === 'UNEQUAL_PERIOD_DURATIONS' ? 'rgba(234,179,8,0.4)' : 'rgba(56,189,248,0.4)'}`,
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: '20px'
        }}>
          <AlertTriangle size={18} color={w.flag === 'HISTORICAL_SAMPLING_BIAS' || w.flag === 'UNEQUAL_PERIOD_DURATIONS' ? '#fde047' : '#38bdf8'} />
          <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
            <span style={{ fontWeight: 700, color: '#fde047', marginRight: '6px' }}>[{w.flag}]:</span>
            {w.message}
          </div>
        </div>
      ))}

      {/* Top Overview KPI Cards */}
      {overviewData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={cardStyle}>
            <div style={cardLabel}>Period A Baseline Incidents</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#38bdf8' }}>
              {overviewData.period_a.total_incidents.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              {overviewData.period_a.daily_rate} inc/day ({overviewData.period_a.days} days)
            </div>
          </div>

          <div style={cardStyle}>
            <div style={cardLabel}>Period B Target Incidents</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#a78bfa' }}>
              {overviewData.period_b.total_incidents.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              {overviewData.period_b.daily_rate} inc/day ({overviewData.period_b.days} days)
            </div>
          </div>

          <div style={cardStyle}>
            <div style={cardLabel}>Absolute Difference</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: overviewData.comparison.count_diff >= 0 ? '#34d399' : '#fb7185' }}>
              {overviewData.comparison.count_diff >= 0 ? `+${overviewData.comparison.count_diff}` : overviewData.comparison.count_diff}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Incident count delta</div>
          </div>

          <div style={cardStyle}>
            <div style={cardLabel}>Relative Change (%)</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: overviewData.comparison.relative_pct_change >= 0 ? '#34d399' : '#fb7185' }}>
              {overviewData.comparison.relative_pct_change !== null ? `${overviewData.comparison.relative_pct_change}%` : 'N/A'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Zero denominator protected</div>
          </div>

          <div style={cardStyle}>
            <div style={cardLabel}>Arrest Rate Shift</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: overviewData.comparison.arrest_delta_pp >= 0 ? '#38bdf8' : '#fb7185' }}>
              {overviewData.comparison.arrest_delta_pp >= 0 ? `+${overviewData.comparison.arrest_delta_pp}` : overviewData.comparison.arrest_delta_pp} pp
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              {overviewData.period_a.arrest_pct}% &rarr; {overviewData.period_b.arrest_pct}%
            </div>
          </div>
        </div>
      )}

      {/* Category Composition Shifts */}
      <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
            Crime Category Composition Shifts (Delta pp & Contribution)
          </h2>
          <input
            type="text"
            placeholder="Search categories..."
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            style={{ ...inputStyle, width: '220px' }}
          />
        </div>

        {/* Recharts Composition Shift Chart */}
        <div style={{ width: '100%', height: 280, marginBottom: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData?.top_shifts || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} unit=" pp" />
              <YAxis type="category" dataKey="category" stroke="#94a3b8" fontSize={11} width={160} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
              <Bar dataKey="delta_pp" name="Share Shift (Δ pp)" fill="#38bdf8">
                {categoryData?.top_shifts?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.delta_pp >= 0 ? '#38bdf8' : '#fb7185'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Category</th>
                <th style={{ padding: '8px' }}>Period A Count</th>
                <th style={{ padding: '8px' }}>Period A Share</th>
                <th style={{ padding: '8px' }}>Period B Count</th>
                <th style={{ padding: '8px' }}>Period B Share</th>
                <th style={{ padding: '8px' }}>Count Diff</th>
                <th style={{ padding: '8px' }}>Shift (Δ pp)</th>
              </tr>
            </thead>
            <tbody>
              {categoryData?.categories?.filter(c => c.category.toLowerCase().includes(categorySearch.toLowerCase())).slice(0, 10).map(c => (
                <tr key={c.category} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px', fontWeight: 600, color: '#f8fafc' }}>{c.category}</td>
                  <td style={{ padding: '8px' }}>{c.count_a}</td>
                  <td style={{ padding: '8px' }}>{c.share_a}%</td>
                  <td style={{ padding: '8px' }}>{c.count_b}</td>
                  <td style={{ padding: '8px' }}>{c.share_b}%</td>
                  <td style={{ padding: '8px', fontWeight: 600, color: c.count_diff >= 0 ? '#34d399' : '#fb7185' }}>
                    {c.count_diff >= 0 ? `+${c.count_diff}` : c.count_diff}
                  </td>
                  <td style={{ padding: '8px', fontWeight: 700, color: c.delta_pp >= 0 ? '#38bdf8' : '#fb7185' }}>
                    {c.delta_pp >= 0 ? `+${c.delta_pp} pp` : `${c.delta_pp} pp`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Spatial DBSCAN Hotspot Comparison */}
      <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <MapPin size={20} color="#fde047" />
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
            Spatial Hotspot Continuity & Centroid Shift (DBSCAN + Haversine Matching)
          </h2>
        </div>

        {/* Hotspot Matching Summary Scorecards */}
        {hotspotData && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div style={cardStyle}>
              <div style={cardLabel}>Period A Clusters</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#38bdf8' }}>{hotspotData.period_a.clusters_count}</div>
            </div>
            <div style={cardStyle}>
              <div style={cardLabel}>Period B Clusters</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#a78bfa' }}>{hotspotData.period_b.clusters_count}</div>
            </div>
            <div style={cardStyle}>
              <div style={cardLabel}>Persistent Hotspots</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#34d399' }}>{hotspotData.matching_summary.persistent_hotspots}</div>
            </div>
            <div style={cardStyle}>
              <div style={cardLabel}>Newly Observed</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#fde047' }}>{hotspotData.matching_summary.newly_observed_hotspots}</div>
            </div>
            <div style={cardStyle}>
              <div style={cardLabel}>Dissolved / Unobserved</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#fb7185' }}>{hotspotData.matching_summary.dissolved_hotspots}</div>
            </div>
          </div>
        )}

        {/* Matched Clusters List */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {hotspotData?.matches?.map((m, idx) => (
            <div key={idx} style={{ backgroundColor: '#0f172a', padding: '14px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: m.match_classification === 'SPATIALLY_MATCHED' ? 'rgba(52,211,153,0.2)' : m.match_classification === 'NEWLY_OBSERVED' ? 'rgba(253,224,71,0.2)' : 'rgba(251,113,133,0.2)',
                  color: m.match_classification === 'SPATIALLY_MATCHED' ? '#34d399' : m.match_classification === 'NEWLY_OBSERVED' ? '#fde047' : '#fb7185'
                }}>
                  {m.match_classification}
                </span>
                {m.centroid_distance_meters !== null && (
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Drift: {m.centroid_distance_meters}m
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12.5px', color: '#cbd5e1', lineHeight: '1.4' }}>
                {m.explanation}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deterministic Evidence Insights */}
      <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Zap size={20} color="#34d399" />
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
            Automated Evidence-Based Change Observations
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {insightsData.map(ins => (
            <div key={ins.id} style={{ backgroundColor: '#0f172a', padding: '14px 16px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#38bdf8' }}>{ins.title}</div>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#1e293b', color: '#94a3b8' }}>
                  {ins.category}
                </span>
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

// Styles
const labelStyle = {
  fontSize: '11px',
  color: '#94a3b8',
  display: 'block',
  marginBottom: '4px',
  textTransform: 'uppercase',
  fontWeight: 600
};

const inputStyle = {
  backgroundColor: '#0f172a',
  color: '#f8fafc',
  border: '1px solid #334155',
  borderRadius: '6px',
  padding: '6px 10px',
  fontSize: '12px',
  width: '100%'
};

const selectStyle = {
  backgroundColor: '#0f172a',
  color: '#f8fafc',
  border: '1px solid #334155',
  borderRadius: '6px',
  padding: '6px 12px',
  fontSize: '13px'
};

const cardStyle = {
  backgroundColor: '#0f172a',
  padding: '14px 16px',
  borderRadius: '8px',
  border: '1px solid #334155'
};

const cardLabel = {
  fontSize: '11px',
  color: '#94a3b8',
  marginBottom: '2px'
};
