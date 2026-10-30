import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataset } from '../context/DatasetContext';
import {
  fetchInsightsMetadata,
  fetchGeneratedInsights,
  fetchInsightsExplanation
} from '../services/api';
import { CHICAGO_NIGHTFALL } from '../theme/colors';
import {
  Zap,
  Filter,
  RefreshCw,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  Sliders,
  CheckCircle,
  FileText,
  Search,
  ExternalLink,
  Info,
  TrendingUp,
  Layers,
  MapPin,
  GitBranch,
  BarChart2,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

// Custom Tooltip for Mini Recharts
const MiniTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: CHICAGO_NIGHTFALL.midnightNavy,
        border: `1px solid ${CHICAGO_NIGHTFALL.borderRiver}`,
        padding: '6px 10px',
        borderRadius: '6px',
        fontSize: '11px',
        color: CHICAGO_NIGHTFALL.textPrimary,
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
      }}>
        <div style={{ fontWeight: 600, color: CHICAGO_NIGHTFALL.lakeBlue, marginBottom: '2px' }}>
          {label}
        </div>
        <div>
          {payload[0].name || 'Value'}: <strong style={{ color: '#fff' }}>{payload[0].value?.toLocaleString()}</strong>
        </div>
      </div>
    );
  }
  return null;
};

// Mini-Visualization Component inside Insight Cards
function MiniInsightChart({ chartData }) {
  if (!chartData || !chartData.data || chartData.data.length === 0) {
    return null;
  }

  const { chart_type, data, x_key = 'name', y_key = 'value' } = chartData;

  if (chart_type === 'bar') {
    return (
      <div style={{
        marginTop: '12px',
        marginBottom: '12px',
        backgroundColor: 'rgba(7, 12, 21, 0.6)',
        borderRadius: '8px',
        padding: '10px 10px 4px 10px',
        border: `1px solid ${CHICAGO_NIGHTFALL.borderSubtle}`
      }}>
        <div style={{ fontSize: '10px', color: CHICAGO_NIGHTFALL.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Distribution Breakdown
        </div>
        <div style={{ width: '100%', height: 110 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey={x_key}
                tick={{ fill: CHICAGO_NIGHTFALL.textDim, fontSize: 10 }}
                axisLine={{ stroke: CHICAGO_NIGHTFALL.borderRiver }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: CHICAGO_NIGHTFALL.textDim, fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<MiniTooltip />} />
              <Bar dataKey={y_key} fill={CHICAGO_NIGHTFALL.lakeBlue} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (chart_type === 'line') {
    return (
      <div style={{
        marginTop: '12px',
        marginBottom: '12px',
        backgroundColor: 'rgba(7, 12, 21, 0.6)',
        borderRadius: '8px',
        padding: '10px 10px 4px 10px',
        border: `1px solid ${CHICAGO_NIGHTFALL.borderSubtle}`
      }}>
        <div style={{ fontSize: '10px', color: CHICAGO_NIGHTFALL.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Diurnal Hourly Curve (24 Hours)
        </div>
        <div style={{ width: '100%', height: 110 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey={x_key}
                tick={{ fill: CHICAGO_NIGHTFALL.textDim, fontSize: 9 }}
                axisLine={{ stroke: CHICAGO_NIGHTFALL.borderRiver }}
                tickLine={false}
                interval={3}
              />
              <YAxis
                tick={{ fill: CHICAGO_NIGHTFALL.textDim, fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<MiniTooltip />} />
              <Line
                type="monotone"
                dataKey={y_key}
                stroke={CHICAGO_NIGHTFALL.lakeBlue}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: CHICAGO_NIGHTFALL.amber }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (chart_type === 'metric_delta') {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(data.length, 3)}, 1fr)`,
        gap: '8px',
        marginTop: '12px',
        marginBottom: '12px'
      }}>
        {data.map((item, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: 'rgba(7, 12, 21, 0.6)',
              borderRadius: '8px',
              padding: '8px 10px',
              border: `1px solid ${CHICAGO_NIGHTFALL.borderSubtle}`,
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '10px', color: CHICAGO_NIGHTFALL.textMuted, marginBottom: '2px', textTransform: 'uppercase' }}>
              {item.label}
            </div>
            <div style={{
              fontSize: '16px',
              fontWeight: 700,
              color: item.color || CHICAGO_NIGHTFALL.lakeBlue
            }}>
              {typeof item.value === 'number' && item.value % 1 !== 0
                ? item.value.toFixed(1)
                : item.value?.toLocaleString()}
              {item.unit || ''}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

export default function InsightsPage() {
  const { dataset } = useDataset();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [minSampleSize, setMinSampleSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  // Results
  const [insightsData, setInsightsData] = useState([]);
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [totalEvaluated, setTotalEvaluated] = useState(0);
  const [selectedInsight, setSelectedInsight] = useState(null);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [methodology, setMethodology] = useState(null);

  // Initial Fetch Metadata
  useEffect(() => {
    async function loadMeta() {
      try {
        setLoading(true);
        const meta = await fetchInsightsMetadata();
        setMetadata(meta);
        const exp = await fetchInsightsExplanation();
        setMethodology(exp);
      } catch (err) {
        console.error("Error loading insights metadata:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMeta();
  }, [dataset]);

  // Main Insight Generation
  const runGeneration = async () => {
    try {
      setLoading(true);
      const res = await fetchGeneratedInsights({
        district: selectedDistrict || null,
        insight_domain: selectedDomain || null,
        insight_type: selectedType || null,
        min_score: minScore,
        min_sample_size: minSampleSize,
        max_insights: 30
      });
      setInsightsData(res.insights || []);
      setExecutiveSummary(res.executive_summary || '');
      setTotalEvaluated(res.total_generated || 0);
    } catch (err) {
      console.error("Error generating automated insights:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runGeneration();
  }, [dataset, selectedDomain, selectedType, minScore]);

  // Filtered insights by client search
  const filteredInsights = insightsData.filter(i => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      i.title.toLowerCase().includes(q) ||
      i.explanation.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q)
    );
  });

  const getDomainIcon = (cat) => {
    switch (cat) {
      case 'Temporal Pattern': return <TrendingUp size={14} />;
      case 'Area Intelligence': return <MapPin size={14} />;
      case 'DBSCAN Spatial': return <Layers size={14} />;
      case 'Hotspot Evolution': return <GitBranch size={14} />;
      case 'K-Means Clustering': return <BarChart2 size={14} />;
      case 'Decision Tree': return <GitBranch size={14} />;
      case 'Period Comparison': return <Calendar size={14} />;
      default: return <Zap size={14} />;
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'STATISTICAL_COMPARISON':
        return {
          label: 'Statistical Comparison',
          bg: 'rgba(233, 180, 76, 0.15)',
          color: CHICAGO_NIGHTFALL.amber,
          border: 'rgba(233, 180, 76, 0.3)'
        };
      case 'PREDICTIVE_MODEL':
        return {
          label: 'Predictive Model',
          bg: 'rgba(167, 139, 250, 0.15)',
          color: '#a78bfa',
          border: 'rgba(167, 139, 250, 0.3)'
        };
      case 'DESCRIPTIVE':
      default:
        return {
          label: 'Descriptive Observation',
          bg: 'rgba(53, 184, 232, 0.15)',
          color: CHICAGO_NIGHTFALL.lakeBlue,
          border: 'rgba(53, 184, 232, 0.3)'
        };
    }
  };

  const getScoreColor = (score) => {
    if (score >= 75) return { bg: 'rgba(52, 211, 153, 0.2)', color: '#34d399', text: 'HIGH PRIORITY' };
    if (score >= 50) return { bg: 'rgba(233, 180, 76, 0.2)', color: CHICAGO_NIGHTFALL.amber, text: 'MEDIUM' };
    return { bg: 'rgba(148, 163, 184, 0.2)', color: '#94a3b8', text: 'LOW' };
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: CHICAGO_NIGHTFALL.midnightNavy,
      padding: '24px',
      color: CHICAGO_NIGHTFALL.textPrimary,
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header Banner */}
      <div style={{
        position: 'relative',
        background: `linear-gradient(135deg, ${CHICAGO_NIGHTFALL.bgCardElevated} 0%, ${CHICAGO_NIGHTFALL.midnightNavy} 100%)`,
        border: `1px solid ${CHICAGO_NIGHTFALL.borderRiver}`,
        borderRadius: '12px',
        padding: '24px 28px',
        marginBottom: '24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        overflow: 'hidden'
      }}>
        {/* Subtle Chicago Skyline SVG Silhouette Background */}
        <div style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: '380px',
          height: '110px',
          opacity: 0.12,
          pointerEvents: 'none'
        }}>
          <svg viewBox="0 0 400 120" fill="currentColor" color={CHICAGO_NIGHTFALL.lakeBlue} width="100%" height="100%">
            <path d="M 10 120 L 10 70 L 30 70 L 30 120 M 40 120 L 40 50 L 70 50 L 70 120 M 80 120 L 80 80 L 105 80 L 105 120 M 115 120 L 115 20 L 120 10 L 125 20 L 125 120 M 135 120 L 135 60 L 160 60 L 160 120 M 170 120 L 170 35 L 205 35 L 205 120 M 215 120 L 215 75 L 240 75 L 240 120 M 250 120 L 250 15 L 260 0 L 270 15 L 270 120 M 280 120 L 280 65 L 310 65 L 310 120 M 320 120 L 320 45 L 350 45 L 350 120 M 360 120 L 360 85 L 390 85 L 390 120 Z" />
          </svg>
        </div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{
                backgroundColor: CHICAGO_NIGHTFALL.lakeBlueMuted,
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${CHICAGO_NIGHTFALL.borderLake}`
              }}>
                <Zap size={22} color={CHICAGO_NIGHTFALL.lakeBlue} />
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
                Automated Analytical Intelligence Engine
              </h1>
              <span style={{
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '20px',
                fontWeight: 700,
                letterSpacing: '0.4px',
                backgroundColor: dataset === 'synthetic' ? CHICAGO_NIGHTFALL.amberMuted : CHICAGO_NIGHTFALL.lakeBlueMuted,
                color: dataset === 'synthetic' ? CHICAGO_NIGHTFALL.amber : CHICAGO_NIGHTFALL.lakeBlue,
                border: `1px solid ${dataset === 'synthetic' ? CHICAGO_NIGHTFALL.borderAmber : CHICAGO_NIGHTFALL.borderLake}`
              }}>
                {dataset === 'synthetic' ? 'SIMULATED DATASET' : 'REAL WAREHOUSE DATA'}
              </span>
            </div>
            <p style={{ margin: 0, color: CHICAGO_NIGHTFALL.textMuted, fontSize: '13.5px', maxWidth: '850px', lineHeight: '1.5' }}>
              Cross-domain intelligence engine evaluating crime composition, diurnal curves, police district comparisons, spatial clustering (DBSCAN), hotspot evolution, unsupervised K-Means profiles, Apriori association rules, decision trees, and longitudinal period-over-period shifts.
            </p>
          </div>

          <button
            onClick={() => setMethodologyOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: CHICAGO_NIGHTFALL.riverBlue,
              color: CHICAGO_NIGHTFALL.lakeBlue,
              border: `1px solid ${CHICAGO_NIGHTFALL.borderLake}`,
              borderRadius: '8px',
              padding: '10px 18px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px',
              transition: 'all 0.15s ease'
            }}
          >
            <BookOpen size={16} />
            Academic Methodology
          </button>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div style={{
        backgroundColor: CHICAGO_NIGHTFALL.bgCard,
        border: `1px solid ${CHICAGO_NIGHTFALL.borderRiver}`,
        borderRadius: '12px',
        padding: '18px 20px',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
      }}>
        {/* Domain Filter */}
        <div>
          <label style={labelStyle}>Analytical Domain</label>
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            style={selectStyle}
          >
            <option value="">All Domains (Complete Portfolio)</option>
            {metadata?.insight_domains?.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Insight Type Filter */}
        <div>
          <label style={labelStyle}>Insight Classification</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={selectStyle}
          >
            <option value="">All Classifications</option>
            <option value="DESCRIPTIVE">Descriptive Observations</option>
            <option value="STATISTICAL_COMPARISON">Statistical Comparisons</option>
            <option value="PREDICTIVE_MODEL">Predictive & Associative Models</option>
          </select>
        </div>

        {/* District Filter */}
        <div>
          <label style={labelStyle}>Police District Focus</label>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            style={selectStyle}
          >
            <option value="">All Police Districts</option>
            {metadata?.districts?.map((d, idx) => (
              <option key={`${d.id}-${idx}`} value={d.id}>{d.label}</option>
            ))}
          </select>
        </div>

        {/* Min Score Threshold */}
        <div>
          <label style={labelStyle}>Min Importance Score ({minScore})</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="range"
              min="0"
              max="90"
              step="5"
              value={minScore}
              onChange={(e) => setMinScore(parseInt(e.target.value))}
              style={{ width: '100px', accentColor: CHICAGO_NIGHTFALL.lakeBlue }}
            />
            <span style={{ fontSize: '12px', color: CHICAGO_NIGHTFALL.textPrimary, fontWeight: 700 }}>
              {minScore}
            </span>
          </div>
        </div>

        {/* Search Input */}
        <div>
          <label style={labelStyle}>Search Findings</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Keywords, crime type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, width: '180px', paddingLeft: '28px' }}
            />
            <Search size={14} color={CHICAGO_NIGHTFALL.textDim} style={{ position: 'absolute', left: '8px', top: '9px' }} />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
          <button
            onClick={runGeneration}
            disabled={loading}
            style={{
              backgroundColor: CHICAGO_NIGHTFALL.lakeBlue,
              color: CHICAGO_NIGHTFALL.midnightNavy,
              border: 'none',
              borderRadius: '8px',
              padding: '8px 18px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            {loading ? 'Evaluating...' : 'Re-Evaluate'}
          </button>

          <button
            onClick={() => {
              setSelectedDomain('');
              setSelectedType('');
              setSelectedDistrict('');
              setMinScore(0);
              setMinSampleSize(10);
              setSearchQuery('');
            }}
            title="Reset Filters"
            style={{
              backgroundColor: 'transparent',
              color: CHICAGO_NIGHTFALL.textMuted,
              border: `1px solid ${CHICAGO_NIGHTFALL.borderRiver}`,
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={cardStyle}>
          <div style={cardLabel}>Evaluated Observations</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: CHICAGO_NIGHTFALL.lakeBlue }}>
            {totalEvaluated}
          </div>
          <div style={{ fontSize: '11px', color: CHICAGO_NIGHTFALL.textDim, marginTop: '2px' }}>
            Cross-module analytical rules tested
          </div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabel}>High-Relevance Insights</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#34d399' }}>
            {insightsData.filter(i => i.score >= 75).length}
          </div>
          <div style={{ fontSize: '11px', color: CHICAGO_NIGHTFALL.textDim, marginTop: '2px' }}>
            Importance score &ge; 75 / 100
          </div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabel}>Domains Represented</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#a78bfa' }}>
            {new Set(insightsData.map(i => i.category)).size} / 9
          </div>
          <div style={{ fontSize: '11px', color: CHICAGO_NIGHTFALL.textDim, marginTop: '2px' }}>
            Active analytical engines
          </div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabel}>Peak Importance Score</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: CHICAGO_NIGHTFALL.amber }}>
            {insightsData.length > 0 ? Math.max(...insightsData.map(i => i.score)) : 0} / 100
          </div>
          <div style={{ fontSize: '11px', color: CHICAGO_NIGHTFALL.textDim, marginTop: '2px' }}>
            Reproducible scoring formula
          </div>
        </div>
      </div>

      {/* Executive Intelligence Briefing */}
      {executiveSummary && (
        <div style={{
          backgroundColor: CHICAGO_NIGHTFALL.bgCardElevated,
          border: `1px solid ${CHICAGO_NIGHTFALL.borderRiver}`,
          borderRadius: '12px',
          padding: '22px 26px',
          marginBottom: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <FileText size={20} color={CHICAGO_NIGHTFALL.lakeBlue} />
            <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: CHICAGO_NIGHTFALL.lakeBlue, letterSpacing: '-0.3px' }}>
              Executive Intelligence Briefing
            </h2>
            <span style={{ fontSize: '11px', color: CHICAGO_NIGHTFALL.textDim, marginLeft: 'auto' }}>
              Automated Synthesis • Non-Causal Grounding
            </span>
          </div>
          <div style={{
            fontSize: '13.5px',
            color: CHICAGO_NIGHTFALL.textPrimary,
            lineHeight: '1.65',
            whiteSpace: 'pre-line'
          }}>
            {executiveSummary}
          </div>
        </div>
      )}

      {/* Domain Quick Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '22px' }}>
        <button
          onClick={() => setSelectedDomain('')}
          style={{
            backgroundColor: selectedDomain === '' ? CHICAGO_NIGHTFALL.lakeBlue : CHICAGO_NIGHTFALL.bgCard,
            color: selectedDomain === '' ? CHICAGO_NIGHTFALL.midnightNavy : CHICAGO_NIGHTFALL.textMuted,
            border: `1px solid ${selectedDomain === '' ? CHICAGO_NIGHTFALL.lakeBlue : CHICAGO_NIGHTFALL.borderRiver}`,
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          All Domains ({insightsData.length})
        </button>

        {metadata?.insight_domains?.map(dom => {
          const count = insightsData.filter(i => i.category === dom).length;
          const isSelected = selectedDomain === dom;
          return (
            <button
              key={dom}
              onClick={() => setSelectedDomain(dom)}
              style={{
                backgroundColor: isSelected ? CHICAGO_NIGHTFALL.lakeBlue : CHICAGO_NIGHTFALL.bgCard,
                color: isSelected ? CHICAGO_NIGHTFALL.midnightNavy : CHICAGO_NIGHTFALL.textMuted,
                border: `1px solid ${isSelected ? CHICAGO_NIGHTFALL.lakeBlue : CHICAGO_NIGHTFALL.borderRiver}`,
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {getDomainIcon(dom)}
              {dom} ({count})
            </button>
          );
        })}
      </div>

      {/* Featured Insights Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '20px',
        marginBottom: '28px'
      }}>
        {filteredInsights.map(ins => {
          const typeBadge = getTypeBadge(ins.insight_type);
          const scoreColor = getScoreColor(ins.score);

          return (
            <div
              key={ins.id}
              style={{
                backgroundColor: CHICAGO_NIGHTFALL.bgCard,
                border: `1px solid ${CHICAGO_NIGHTFALL.borderRiver}`,
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                transition: 'border-color 0.2s ease, transform 0.2s ease'
              }}
            >
              <div>
                {/* Header: Domain Badge, Type Chip & Score Pill */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(53, 184, 232, 0.12)',
                      color: CHICAGO_NIGHTFALL.lakeBlue,
                      border: `1px solid ${CHICAGO_NIGHTFALL.borderSubtle}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {getDomainIcon(ins.category)}
                      {ins.category}
                    </span>

                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: typeBadge.bg,
                      color: typeBadge.color,
                      border: `1px solid ${typeBadge.border}`
                    }}>
                      {typeBadge.label}
                    </span>
                  </div>

                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: '16px',
                    backgroundColor: scoreColor.bg,
                    color: scoreColor.color,
                    letterSpacing: '0.3px'
                  }}>
                    {ins.score}/100
                  </span>
                </div>

                {/* Title & Narrative Explanation */}
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: CHICAGO_NIGHTFALL.textPrimary,
                  margin: '0 0 8px 0',
                  lineHeight: '1.35',
                  letterSpacing: '-0.2px'
                }}>
                  {ins.title}
                </h3>

                <p style={{
                  fontSize: '13px',
                  color: CHICAGO_NIGHTFALL.textMuted,
                  lineHeight: '1.5',
                  margin: '0 0 10px 0'
                }}>
                  {ins.explanation}
                </p>

                {/* Inline Mini-Visualization if present */}
                <MiniInsightChart chartData={ins.chart_data} />

                {/* Key Metrics Summary Chips */}
                {ins.numerical_evidence && (
                  <div style={{
                    backgroundColor: 'rgba(7, 12, 21, 0.5)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    color: CHICAGO_NIGHTFALL.textDim,
                    marginBottom: '12px',
                    border: `1px solid ${CHICAGO_NIGHTFALL.borderSubtle}`
                  }}>
                    <strong style={{ color: CHICAGO_NIGHTFALL.textMuted, marginRight: '8px' }}>EVIDENCE:</strong>
                    {Object.entries(ins.numerical_evidence).slice(0, 3).map(([k, v]) => (
                      <span key={k} style={{ marginRight: '12px', display: 'inline-block' }}>
                        <span style={{ color: CHICAGO_NIGHTFALL.textDim }}>{k.replace(/_/g, ' ')}:</span>{' '}
                        <strong style={{ color: CHICAGO_NIGHTFALL.textPrimary }}>{String(v)}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div style={{
                borderTop: `1px solid ${CHICAGO_NIGHTFALL.borderRiver}`,
                paddingTop: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <button
                  onClick={() => setSelectedInsight(ins)}
                  style={{
                    backgroundColor: 'transparent',
                    color: CHICAGO_NIGHTFALL.lakeBlue,
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Info size={14} /> Evidence Lineage
                </button>

                <button
                  onClick={() => navigate(ins.route)}
                  style={{
                    backgroundColor: 'rgba(53, 184, 232, 0.1)',
                    color: CHICAGO_NIGHTFALL.lakeBlue,
                    border: `1px solid ${CHICAGO_NIGHTFALL.borderLake}`,
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  Source: {ins.source_module} <ExternalLink size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredInsights.length === 0 && !loading && (
        <div style={{
          backgroundColor: CHICAGO_NIGHTFALL.bgCard,
          border: `1px solid ${CHICAGO_NIGHTFALL.borderRiver}`,
          borderRadius: '12px',
          padding: '48px 24px',
          textAlign: 'center',
          color: CHICAGO_NIGHTFALL.textMuted
        }}>
          <AlertTriangle size={36} color={CHICAGO_NIGHTFALL.amber} style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: CHICAGO_NIGHTFALL.textPrimary, margin: '0 0 6px 0' }}>
            No Automated Insights Match Active Filters
          </h3>
          <p style={{ fontSize: '13px', margin: 0 }}>
            Try clearing the domain filter, lowering the minimum score threshold, or widening the scope.
          </p>
        </div>
      )}

      {/* Evidence Inspector Modal */}
      {selectedInsight && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(7, 12, 21, 0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: CHICAGO_NIGHTFALL.bgCardElevated,
            border: `1px solid ${CHICAGO_NIGHTFALL.borderRiver}`,
            borderRadius: '12px',
            padding: '28px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '85vh',
            overflowY: 'auto',
            color: CHICAGO_NIGHTFALL.textPrimary,
            boxShadow: '0 12px 48px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', color: CHICAGO_NIGHTFALL.lakeBlue, fontWeight: 800, textTransform: 'uppercase' }}>
                    {selectedInsight.category} • ID: {selectedInsight.id}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: getTypeBadge(selectedInsight.insight_type).bg,
                    color: getTypeBadge(selectedInsight.insight_type).color
                  }}>
                    {selectedInsight.insight_type}
                  </span>
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
                  {selectedInsight.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedInsight(null)}
                style={{
                  backgroundColor: 'transparent',
                  color: CHICAGO_NIGHTFALL.textMuted,
                  border: 'none',
                  fontSize: '22px',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '20px', fontSize: '14px', color: CHICAGO_NIGHTFALL.textPrimary, lineHeight: '1.6' }}>
              {selectedInsight.explanation}
            </div>

            {/* Supporting Numerical Evidence Table */}
            <div style={{
              backgroundColor: 'rgba(7, 12, 21, 0.7)',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '18px',
              border: `1px solid ${CHICAGO_NIGHTFALL.borderSubtle}`
            }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: CHICAGO_NIGHTFALL.lakeBlue, marginBottom: '10px', textTransform: 'uppercase' }}>
                Supporting Numerical Evidence & Formulas
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <tbody>
                  {selectedInsight.numerical_evidence && Object.entries(selectedInsight.numerical_evidence).map(([k, v]) => (
                    <tr key={k} style={{ borderBottom: `1px solid ${CHICAGO_NIGHTFALL.borderRiver}` }}>
                      <td style={{ padding: '8px 4px', color: CHICAGO_NIGHTFALL.textMuted, fontWeight: 600 }}>
                        {k.replace(/_/g, ' ')}
                      </td>
                      <td style={{ padding: '8px 4px', color: CHICAGO_NIGHTFALL.textPrimary, fontWeight: 700, textAlign: 'right' }}>
                        {String(v)}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderBottom: `1px solid ${CHICAGO_NIGHTFALL.borderRiver}` }}>
                    <td style={{ padding: '8px 4px', color: CHICAGO_NIGHTFALL.textMuted, fontWeight: 600 }}>Sample Size (N)</td>
                    <td style={{ padding: '8px 4px', color: CHICAGO_NIGHTFALL.amber, fontWeight: 700, textAlign: 'right' }}>
                      {selectedInsight.sample_size?.toLocaleString()} records
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 4px', color: CHICAGO_NIGHTFALL.textMuted, fontWeight: 600 }}>Importance Score</td>
                    <td style={{ padding: '8px 4px', color: '#34d399', fontWeight: 800, textAlign: 'right' }}>
                      {selectedInsight.score} / 100
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Methodology & Lineage */}
            <div style={{
              fontSize: '12.5px',
              color: CHICAGO_NIGHTFALL.textMuted,
              display: 'grid',
              gap: '10px',
              marginBottom: '20px'
            }}>
              <div>
                <strong style={{ color: CHICAGO_NIGHTFALL.textPrimary }}>Source Module:</strong>{' '}
                {selectedInsight.source_module} (<code>{selectedInsight.route}</code>)
              </div>
              <div>
                <strong style={{ color: CHICAGO_NIGHTFALL.textPrimary }}>Analytical Method:</strong>{' '}
                {selectedInsight.methodology}
              </div>
              <div>
                <strong style={{ color: CHICAGO_NIGHTFALL.amber }}>Reliability & Data Caveat:</strong>{' '}
                {selectedInsight.caveat}
              </div>
            </div>

            {/* Navigate Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => {
                  const r = selectedInsight.route;
                  setSelectedInsight(null);
                  navigate(r);
                }}
                style={{
                  backgroundColor: CHICAGO_NIGHTFALL.lakeBlue,
                  color: CHICAGO_NIGHTFALL.midnightNavy,
                  border: 'none',
                  borderRadius: '6px',
                  padding: '9px 18px',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                Inspect Source Module ({selectedInsight.source_module}) <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Academic Methodology Drawer / Modal */}
      {methodologyOpen && methodology && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(7, 12, 21, 0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: CHICAGO_NIGHTFALL.bgCardElevated,
            border: `1px solid ${CHICAGO_NIGHTFALL.borderRiver}`,
            borderRadius: '12px',
            padding: '28px',
            maxWidth: '680px',
            maxHeight: '80vh',
            overflowY: 'auto',
            color: CHICAGO_NIGHTFALL.textPrimary,
            boxShadow: '0 12px 48px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: CHICAGO_NIGHTFALL.lakeBlue }}>
                {methodology.title}
              </h2>
              <button
                onClick={() => setMethodologyOpen(false)}
                style={{ backgroundColor: 'transparent', color: CHICAGO_NIGHTFALL.textMuted, border: 'none', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {methodology.concepts.map((c, i) => (
              <div key={i} style={{ marginBottom: '16px', paddingBottom: '14px', borderBottom: `1px solid ${CHICAGO_NIGHTFALL.borderRiver}` }}>
                <div style={{ fontWeight: 700, color: CHICAGO_NIGHTFALL.lakeBlue, fontSize: '14px', marginBottom: '4px' }}>
                  {c.term}
                </div>
                <div style={{ fontSize: '13px', color: CHICAGO_NIGHTFALL.textMuted, lineHeight: '1.5' }}>
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

// Helpers & Styles
const labelStyle = {
  fontSize: '11px',
  color: CHICAGO_NIGHTFALL.textMuted,
  display: 'block',
  marginBottom: '4px',
  textTransform: 'uppercase',
  fontWeight: 700,
  letterSpacing: '0.4px'
};

const inputStyle = {
  backgroundColor: CHICAGO_NIGHTFALL.navyDark,
  color: CHICAGO_NIGHTFALL.textPrimary,
  border: `1px solid ${CHICAGO_NIGHTFALL.borderRiver}`,
  borderRadius: '6px',
  padding: '6px 10px',
  fontSize: '12px',
  outline: 'none'
};

const selectStyle = {
  backgroundColor: CHICAGO_NIGHTFALL.navyDark,
  color: CHICAGO_NIGHTFALL.textPrimary,
  border: `1px solid ${CHICAGO_NIGHTFALL.borderRiver}`,
  borderRadius: '6px',
  padding: '6px 12px',
  fontSize: '13px',
  outline: 'none'
};

const cardStyle = {
  backgroundColor: CHICAGO_NIGHTFALL.bgCard,
  padding: '16px 20px',
  borderRadius: '10px',
  border: `1px solid ${CHICAGO_NIGHTFALL.borderRiver}`,
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
};

const cardLabel = {
  fontSize: '11px',
  color: CHICAGO_NIGHTFALL.textMuted,
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontWeight: 700
};
