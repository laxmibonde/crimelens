import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Grid,
  Sliders,
  CheckSquare,
  Square,
  RefreshCw,
  Sparkles,
  Info,
  HelpCircle,
  BarChart3,
  Layers,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  Database,
  Loader2,
  Tag
} from 'lucide-react';

import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip as RechartsTooltip,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  Legend
} from 'recharts';

import KPICard from '../components/KPICard';
import { useDataset } from '../context/DatasetContext';
import {
  fetchKMeansMetadata,
  fetchKMeansAnalyze,
  fetchKMeansEvaluateK,
  fetchKMeansExplanation
} from '../services/api';

const CLUSTER_COLORS = [
  '#38bdf8', // Cyan
  '#818cf8', // Indigo
  '#fbbf24', // Amber
  '#10b981', // Emerald
  '#f43f5e', // Rose
  '#c084fc', // Purple
  '#34d399', // Mint
  '#fb923c'  // Orange
];

const ALL_AVAILABLE_FEATURES = {
  theft_prop: 'Theft Proportion',
  battery_prop: 'Battery Proportion',
  assault_prop: 'Assault Proportion',
  damage_prop: 'Criminal Damage Proportion',
  vehicle_theft_prop: 'Motor Vehicle Theft Proportion',
  other_crime_prop: 'Other Crimes Proportion',
  arrest_pct: 'Arrest Percentage (%)',
  domestic_pct: 'Domestic Incident Share (%)',
  nighttime_pct: 'Nighttime Hours Share (%)',
  weekend_pct: 'Weekend Share (%)',
  crime_diversity: 'Crime Diversity (Entropy)'
};

// Safe formatting helper to prevent any NaN, NaN%, or blank output
function formatFeatureValue(val, key = '') {
  if (val === null || val === undefined || Number.isNaN(Number(val))) {
    return 'N/A';
  }
  const num = Number(val);
  if (key.includes('prop')) {
    return `${(num * 100).toFixed(1)}%`;
  }
  if (key.includes('pct')) {
    return `${num.toFixed(1)}%`;
  }
  if (key.includes('diversity') || key.includes('entropy')) {
    return num.toFixed(2);
  }
  return num.toFixed(2);
}

export default function KMeansPage() {
  const { dataset, config, isSynthetic, disclaimer } = useDataset();

  // Active Control State
  const [areaGranularity, setAreaGranularity] = useState('district'); // 'district' | 'community_area'
  const [k, setK] = useState(4);
  const [minIncidents, setMinIncidents] = useState(10);
  const [selectedFeatures, setSelectedFeatures] = useState([
    'theft_prop', 'battery_prop', 'assault_prop', 'damage_prop',
    'vehicle_theft_prop', 'other_crime_prop', 'arrest_pct',
    'domestic_pct', 'nighttime_pct', 'weekend_pct', 'crime_diversity'
  ]);

  // Applied parameters state (updated on Execute button click)
  const [appliedParams, setAppliedParams] = useState({
    areaGranularity: 'district',
    k: 4,
    minIncidents: 10,
    selectedFeatures: [
      'theft_prop', 'battery_prop', 'assault_prop', 'damage_prop',
      'vehicle_theft_prop', 'other_crime_prop', 'arrest_pct',
      'domestic_pct', 'nighttime_pct', 'weekend_pct', 'crime_diversity'
    ]
  });

  // Track if controls differ from currently executed model
  const isDirty = useMemo(() => {
    return (
      areaGranularity !== appliedParams.areaGranularity ||
      k !== appliedParams.k ||
      minIncidents !== appliedParams.minIncidents ||
      selectedFeatures.length !== appliedParams.selectedFeatures.length ||
      selectedFeatures.some(f => !appliedParams.selectedFeatures.includes(f))
    );
  }, [areaGranularity, k, minIncidents, selectedFeatures, appliedParams]);

  // Data States
  const [metadata, setMetadata] = useState(null);
  const [kmeansResult, setKmeansResult] = useState(null);
  const [evalResult, setEvalResult] = useState(null);
  const [explanation, setExplanation] = useState(null);

  // Loading & Progress States
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);
  const timerRef = useRef(null);

  // Table Search & Cluster Filter State
  const [tableSearch, setTableSearch] = useState('');
  const [tableClusterFilter, setTableClusterFilter] = useState('ALL');
  const [selectedClusterDetailId, setSelectedClusterDetailId] = useState(0);

  // Load Metadata & Explanations on Mount or Dataset change
  useEffect(() => {
    async function loadInitData() {
      try {
        const [metaData, expData] = await Promise.all([
          fetchKMeansMetadata(),
          fetchKMeansExplanation()
        ]);
        setMetadata(metaData);
        setExplanation(expData.dwm_concepts || null);
      } catch (err) {
        console.warn('Failed to initialize metadata:', err);
      }
    }
    loadInitData();
  }, [dataset]);

  // Execute Analysis with Non-Blanking UX & Request ID Protection
  const executeAnalysis = async (paramsToRun = appliedParams) => {
    const currentReqId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setElapsedSeconds(0);

    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Number(((Date.now() - startTime) / 1000).toFixed(1)));
    }, 100);

    try {
      const [analysisData, evalData] = await Promise.all([
        fetchKMeansAnalyze({
          dataset: dataset,
          area_granularity: paramsToRun.areaGranularity,
          k: paramsToRun.k,
          min_incidents: paramsToRun.minIncidents,
          selected_features: paramsToRun.selectedFeatures
        }),
        fetchKMeansEvaluateK({
          dataset: dataset,
          area_granularity: paramsToRun.areaGranularity,
          min_incidents: paramsToRun.minIncidents,
          selected_features: paramsToRun.selectedFeatures,
          k_min: 2,
          k_max: 8
        })
      ]);

      // Only apply if this is the newest request
      if (currentReqId === requestIdRef.current) {
        setKmeansResult(analysisData);
        setEvalResult(evalData);
        if (analysisData.clusters && analysisData.clusters.length > 0) {
          setSelectedClusterDetailId(analysisData.clusters[0].cluster_id);
        }
      }
    } catch (err) {
      if (currentReqId === requestIdRef.current) {
        console.error('K-Means execution error:', err);
        setError(err.message || 'K-Means analysis execution failed. Retaining previous results.');
      }
    } finally {
      if (currentReqId === requestIdRef.current) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setLoading(false);
      }
    }
  };

  // Run on initial mount or dataset switch
  useEffect(() => {
    executeAnalysis(appliedParams);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [dataset]);

  // Handle Apply Configuration (Explicit User Action)
  const handleApplyAnalysis = () => {
    const newParams = {
      areaGranularity,
      k,
      minIncidents,
      selectedFeatures: [...selectedFeatures]
    };
    setAppliedParams(newParams);
    executeAnalysis(newParams);
  };

  // Handle Reset Configuration
  const handleResetConfig = () => {
    const defaultFeatures = [
      'theft_prop', 'battery_prop', 'assault_prop', 'damage_prop',
      'vehicle_theft_prop', 'other_crime_prop', 'arrest_pct',
      'domestic_pct', 'nighttime_pct', 'weekend_pct', 'crime_diversity'
    ];
    setAreaGranularity('district');
    setK(4);
    setMinIncidents(10);
    setSelectedFeatures(defaultFeatures);

    const resetParams = {
      areaGranularity: 'district',
      k: 4,
      minIncidents: 10,
      selectedFeatures: defaultFeatures
    };
    setAppliedParams(resetParams);
    executeAnalysis(resetParams);
  };

  // Toggle Feature Selection
  const toggleFeature = (featKey) => {
    if (selectedFeatures.includes(featKey)) {
      if (selectedFeatures.length <= 2) return; // Maintain at least 2 features
      setSelectedFeatures(selectedFeatures.filter((f) => f !== featKey));
    } else {
      setSelectedFeatures([...selectedFeatures, featKey]);
    }
  };

  // Prepare PCA Scatterplot Data
  const pcaScatterData = useMemo(() => {
    if (!kmeansResult || !kmeansResult.area_memberships) return [];
    return kmeansResult.area_memberships.map((m) => ({
      area_id: m.area_id,
      area_name: m.area_name,
      cluster_id: m.cluster_id,
      cluster_label: m.cluster_label,
      cluster_color: m.cluster_color,
      total_incidents: m.total_incidents,
      dominant_crime: m.dominant_crime,
      arrest_pct: m.arrest_pct,
      domestic_pct: m.domestic_pct,
      x: m.pca_x,
      y: m.pca_y
    }));
  }, [kmeansResult]);

  // Filter Table Memberships
  const filteredTableMemberships = useMemo(() => {
    if (!kmeansResult || !kmeansResult.area_memberships) return [];
    return kmeansResult.area_memberships.filter((m) => {
      const matchSearch =
        m.area_name.toLowerCase().includes(tableSearch.toLowerCase()) ||
        m.area_id.toLowerCase().includes(tableSearch.toLowerCase()) ||
        m.dominant_crime.toLowerCase().includes(tableSearch.toLowerCase());
      const matchCluster =
        tableClusterFilter === 'ALL' || m.cluster_id === parseInt(tableClusterFilter, 10);
      return matchSearch && matchCluster;
    });
  }, [kmeansResult, tableSearch, tableClusterFilter]);

  const selectedClusterDetail = useMemo(() => {
    if (!kmeansResult || !kmeansResult.clusters) return null;
    return kmeansResult.clusters.find((c) => c.cluster_id === selectedClusterDetailId) || kmeansResult.clusters[0];
  }, [kmeansResult, selectedClusterDetailId]);

  return (
    <div className="kmeans-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. Page Header & Overview */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="page-title" style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>
              K-Means Area Clustering & Crime Pattern Segmentation
            </h1>
            <span className={`status-badge ${isSynthetic ? 'offline' : ''}`} style={{ fontWeight: 600 }}>
              {isSynthetic ? 'SYNTHETIC DEMO DATA' : 'OFFICIAL DATASET'}
            </span>
          </div>
          <p className="page-subtitle" style={{ color: 'var(--text-muted)', fontSize: '13.5px', marginTop: '4px' }}>
            Partitions geographic areas into homogenous behavioral segments based on historical crime proportions, enforcement rates, and category diversity using standardized $L_2$ Euclidean distance.
          </p>
        </div>
      </div>

      {/* Dataset Disclaimer Banner */}
      <div className={`dataset-banner-disclaimer ${isSynthetic ? 'synthetic-banner' : ''}`}>
        <Info size={16} />
        <span>{disclaimer}</span>
      </div>

      {/* 2. Interactive Parameter Configuration Panel */}
      <div className="chart-card" style={{ padding: '20px', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders size={18} style={{ color: 'var(--primary-cyan)' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>
              K-Means Feature Engineering & Algorithm Control Lab
            </h3>
          </div>
          {isDirty && !loading && (
            <span style={{ fontSize: '11.5px', color: 'var(--accent-amber)', backgroundColor: 'rgba(233, 180, 76, 0.15)', padding: '3px 10px', borderRadius: '4px', border: '1px solid rgba(233, 180, 76, 0.3)' }}>
              Parameters changed — click Execute to apply
            </span>
          )}
        </div>

        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          
          {/* Area Granularity Selector */}
          <div className="filter-group">
            <label className="filter-label">Area Granularity</label>
            <select
              className="filter-select"
              value={areaGranularity}
              disabled={loading}
              onChange={(e) => setAreaGranularity(e.target.value)}
              style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              <option value="district">Police Districts — 24 eligible (22 Patrol + 2 Specialized)</option>
              <option value="community_area">Community Areas (77 Municipal Areas)</option>
            </select>
          </div>

          {/* K Slider / Selector */}
          <div className="filter-group">
            <label className="filter-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Clusters (K): <strong style={{ color: 'var(--primary-cyan)' }}>{k}</strong></span>
              {evalResult?.recommended_k && (
                <span style={{ fontSize: '11px', color: 'var(--accent-emerald)' }}>
                  Advisory: K={evalResult.recommended_k}
                </span>
              )}
            </label>
            <input
              type="range"
              min="2"
              max="8"
              step="1"
              value={k}
              disabled={loading}
              onChange={(e) => setK(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: 'var(--primary-cyan)', marginTop: '6px', cursor: loading ? 'not-allowed' : 'pointer' }}
            />
          </div>

          {/* Min Incident Threshold */}
          <div className="filter-group">
            <label className="filter-label">Min Area Incidents</label>
            <input
              type="number"
              min="1"
              max="500"
              value={minIncidents}
              disabled={loading}
              onChange={(e) => setMinIncidents(parseInt(e.target.value, 10) || 1)}
              className="filter-select"
              style={{ cursor: loading ? 'not-allowed' : 'auto' }}
            />
          </div>

        </div>

        {/* Feature Checkboxes Section */}
        <div style={{ marginBottom: '16px' }}>
          <label className="filter-label" style={{ marginBottom: '8px', display: 'block' }}>
            Selected Clustering Features ({selectedFeatures.length}/{Object.keys(ALL_AVAILABLE_FEATURES).length}):
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.entries(ALL_AVAILABLE_FEATURES).map(([featKey, featLabel]) => {
              const isChecked = selectedFeatures.includes(featKey);
              return (
                <button
                  key={featKey}
                  type="button"
                  disabled={loading}
                  onClick={() => toggleFeature(featKey)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    background: isChecked ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-dark)',
                    border: `1px solid ${isChecked ? 'var(--primary-cyan)' : 'var(--border-color)'}`,
                    color: isChecked ? 'var(--primary-cyan)' : 'var(--text-muted)',
                    transition: 'all 0.2s ease',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {isChecked ? <CheckSquare size={13} /> : <Square size={13} />}
                  <span>{featLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={loading}
            onClick={handleApplyAnalysis}
            className="btn-primary"
            style={{
              padding: '9px 20px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--primary-cyan)',
              color: '#000',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
              boxShadow: '0 4px 14px rgba(53, 184, 232, 0.3)'
            }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Grid size={15} />}
            <span>{loading ? `Computing K-Means (${elapsedSeconds.toFixed(1)}s)...` : 'Execute K-Means Segmentation'}</span>
          </button>
          
          <button
            type="button"
            disabled={loading}
            onClick={handleResetConfig}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              borderRadius: 'var(--radius-sm)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            <RefreshCw size={13} /> Reset Controls
          </button>
        </div>
      </div>

      {/* Loading In-Progress Notification (Non-Blanking UX) */}
      {loading && kmeansResult && (
        <div style={{
          padding: '12px 18px',
          background: 'rgba(56, 189, 248, 0.1)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          color: 'var(--text-main)'
        }}>
          <Loader2 size={16} color="var(--primary-cyan)" className="animate-spin" />
          <span>
            Computing new K-Means segmentation ({elapsedSeconds.toFixed(1)}s)... Displaying previous results for <strong>K={appliedParams.k}</strong> ({kmeansResult.kpi?.eligible_areas} areas) until calculation completes.
          </span>
        </div>
      )}

      {/* Error Alert (Retaining Previous Results) */}
      {error && (
        <div className="chart-card" style={{ borderLeft: '4px solid var(--accent-rose)', padding: '16px', background: 'rgba(244, 63, 94, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-rose)' }}>
            <AlertCircle size={18} />
            <span style={{ fontWeight: 600 }}>K-Means Analysis Notice</span>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-main)' }}>{error}</p>
        </div>
      )}

      {/* 3. KPI Cards */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <KPICard
          title="Eligible Areas"
          value={kmeansResult?.kpi?.eligible_areas ?? '--'}
          subtitle={`Min ${appliedParams.minIncidents} incidents`}
          icon={MapPin}
          color="cyan"
        />
        <KPICard
          title="Selected Clusters (K)"
          value={kmeansResult?.kpi?.selected_k ?? appliedParams.k}
          subtitle={`User Choice: K = ${appliedParams.k}`}
          icon={Grid}
          color="indigo"
        />
        <KPICard
          title="Silhouette Score"
          value={kmeansResult?.kpi?.silhouette_score ?? '--'}
          subtitle={kmeansResult?.kpi?.silhouette_score > 0.2 ? 'Good Cohesion' : 'Moderate Overlap'}
          icon={Sparkles}
          color="emerald"
        />
        <KPICard
          title="WCSS (Inertia)"
          value={kmeansResult?.kpi?.wcss_inertia ? kmeansResult.kpi.wcss_inertia.toLocaleString() : '--'}
          subtitle="Within-Cluster Variance"
          icon={BarChart3}
          color="amber"
        />
        <KPICard
          title="Excluded Areas"
          value={kmeansResult?.kpi?.excluded_areas ?? 0}
          subtitle="Below Threshold"
          icon={ShieldAlert}
          color="rose"
        />
      </div>

      {/* Advisory Recommended K vs Selected K Banner */}
      {evalResult?.recommended_k && evalResult.recommended_k !== appliedParams.k && (
        <div style={{
          padding: '10px 16px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '12px'
        }}>
          <div>
            <strong style={{ color: 'var(--accent-emerald)' }}>Advisory Silhouette Peak: K = {evalResult.recommended_k}</strong>
            <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
              Silhouette analysis indicates maximum mathematical separation at K={evalResult.recommended_k} (score: {evalResult.peak_silhouette_score}). Your chosen configuration (K={appliedParams.k}) is actively rendered below for granular civic analysis.
            </span>
          </div>
        </div>
      )}

      {/* 4. Interactive 2D PCA Scatterplot */}
      <div className="chart-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>
              2D Principal Component Projection (PCA Area Scatterplot)
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Each marker represents a single <strong>Geographic Area</strong>. Plotted using 2 principal orthogonal axes from the standardized selected feature space ({appliedParams.selectedFeatures.length} features).
            </p>
          </div>
          {kmeansResult?.pca_metadata && (
            <span className="chart-badge" style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: 'var(--primary-cyan)' }}>
              Total PCA Variance: {kmeansResult.pca_metadata.total_explained_variance}%
            </span>
          )}
        </div>

        <div style={{ width: '100%', height: 380 }}>
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
              <XAxis
                type="number"
                dataKey="x"
                name="PCA-1"
                unit=""
                stroke="var(--text-muted)"
                tick={{ fontSize: 11 }}
                label={{ value: `PCA Dimension 1 (${kmeansResult?.pca_metadata?.explained_variance_ratio[0] || 0}% Var)`, position: 'bottom', offset: 0, fill: 'var(--text-muted)', fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="PCA-2"
                unit=""
                stroke="var(--text-muted)"
                tick={{ fontSize: 11 }}
                label={{ value: `PCA Dimension 2 (${kmeansResult?.pca_metadata?.explained_variance_ratio[1] || 0}% Var)`, angle: -90, position: 'left', fill: 'var(--text-muted)', fontSize: 11 }}
              />
              <ZAxis type="number" dataKey="total_incidents" range={[120, 600]} name="Incidents" />
              <RechartsTooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '12px' }}>
                        <div style={{ fontWeight: 700, color: data.cluster_color, marginBottom: '4px' }}>
                          {data.area_name}
                        </div>
                        <div style={{ color: 'var(--text-main)', marginBottom: '2px' }}>
                          Cluster: <strong>{data.cluster_label}</strong>
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          Total Incidents: <strong>{data.total_incidents.toLocaleString()}</strong>
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          Dominant Crime: <strong>{data.dominant_crime}</strong>
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          Arrest Rate: <strong>{data.arrest_pct}%</strong> | Domestic: <strong>{data.domestic_pct}%</strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter name="Areas" data={pcaScatterData}>
                {pcaScatterData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.cluster_color} stroke="#000" strokeWidth={1} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-muted)' }}>
          <strong>PCA Explanation:</strong> PCA (Principal Component Analysis) projects multi-dimensional feature space into 2 orthogonal dimensions for 2D visualization. K-Means clustering is fitted on the full standardized feature space.
        </div>
      </div>

      {/* 5. Elbow Method & Silhouette Evaluation Curve */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
        
        {/* Elbow Method Chart */}
        <div className="chart-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>
              Elbow Method (Within-Cluster Sum of Squares)
            </h3>
            <span className="chart-badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
              WCSS Curve
            </span>
          </div>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <LineChart data={evalResult?.k_evaluations || []} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="k" stroke="var(--text-muted)" tick={{ fontSize: 11 }} label={{ value: 'K (Clusters)', position: 'bottom', offset: -5, fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <RechartsTooltip contentStyle={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', borderRadius: '6px' }} />
                <Line type="monotone" dataKey="inertia" name="WCSS / Inertia" stroke="var(--accent-amber)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Silhouette Score Curve */}
        <div className="chart-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>
              Silhouette Score Curve (Optimal K Selection)
            </h3>
            {evalResult?.recommended_k && (
              <span className="chart-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                Advisory Recommended: K={evalResult.recommended_k}
              </span>
            )}
          </div>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={evalResult?.k_evaluations || []} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="k" stroke="var(--text-muted)" tick={{ fontSize: 11 }} label={{ value: 'K (Clusters)', position: 'bottom', offset: -5, fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} domain={[0, 1]} />
                <RechartsTooltip contentStyle={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', borderRadius: '6px' }} />
                <Bar dataKey="silhouette_score" name="Silhouette Score" radius={[4, 4, 0, 0]}>
                  {(evalResult?.k_evaluations || []).map((entry) => (
                    <Cell
                      key={`k-bar-${entry.k}`}
                      fill={entry.k === evalResult?.recommended_k ? 'var(--accent-emerald)' : entry.k === appliedParams.k ? 'var(--accent-amber)' : 'var(--primary-cyan)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'var(--text-dim)' }}>
            Green bar marks advisory peak silhouette (K={evalResult?.recommended_k || 2}). Amber bar marks your selected K={appliedParams.k}.
          </p>
        </div>

      </div>

      {/* 6. Cluster Detail & Feature Means Profile */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
        
        {/* Cluster List / Selector */}
        <div className="chart-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px', color: 'var(--text-main)' }}>
            Discovered Area Cluster Segments ({kmeansResult?.clusters?.length || 0})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {kmeansResult?.clusters?.map((c) => {
              const isSelected = c.cluster_id === selectedClusterDetailId;
              return (
                <div
                  key={c.cluster_id}
                  className="kmeans-cluster-card"
                  onClick={() => setSelectedClusterDetailId(c.cluster_id)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    borderTop: `1px solid ${isSelected ? c.color : 'var(--border-color)'}`,
                    borderRight: `1px solid ${isSelected ? c.color : 'var(--border-color)'}`,
                    borderBottom: `1px solid ${isSelected ? c.color : 'var(--border-color)'}`,
                    borderLeft: `4px solid ${c.color}`,
                    background: isSelected ? 'rgba(30, 41, 59, 0.9)' : 'var(--bg-dark)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '13.5px' }}>
                      {c.cluster_label}
                    </span>
                    <span className="chart-badge" style={{ background: 'rgba(255,255,255,0.06)', color: c.color }}>
                      {c.area_count} Areas ({c.percentage_of_areas}%)
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                    {c.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Cluster Deep-Dive */}
        {selectedClusterDetail && (
          <div className="chart-card" style={{ padding: '20px', borderLeft: `4px solid ${selectedClusterDetail.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: selectedClusterDetail.color }}>
                  {selectedClusterDetail.cluster_label}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  {selectedClusterDetail.description}
                </p>
              </div>
              <span className="chart-badge" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--text-main)' }}>
                Avg {selectedClusterDetail.avg_incidents_per_area.toLocaleString()} Inc/Area
              </span>
            </div>

            {/* Panel Section 1: Features Used for Clustering */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <CheckSquare size={14} color="var(--primary-cyan)" />
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--primary-cyan)' }}>
                  Features Used for Clustering ({appliedParams.selectedFeatures.length} Active Input Dimensions):
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', fontSize: '12px' }}>
                {appliedParams.selectedFeatures.map((featKey) => {
                  const featLabel = ALL_AVAILABLE_FEATURES[featKey] || featKey;
                  const rawVal = selectedClusterDetail.feature_means?.[featKey] ?? selectedClusterDetail.all_feature_means?.[featKey];
                  const formatted = formatFeatureValue(rawVal, featKey);
                  return (
                    <div key={featKey} style={{ background: 'var(--bg-dark)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '8px 10px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{featLabel}</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>{formatted}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Panel Section 2: Additional Descriptive Area Metrics */}
            {Object.keys(ALL_AVAILABLE_FEATURES).some(f => !appliedParams.selectedFeatures.includes(f)) && (
              <div style={{ marginBottom: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Tag size={13} color="var(--text-dim)" />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>
                    Additional Descriptive Area Metrics (Contextual — Not Used to Fit Cluster Model):
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', fontSize: '12px' }}>
                  {Object.keys(ALL_AVAILABLE_FEATURES)
                    .filter(f => !appliedParams.selectedFeatures.includes(f))
                    .map((featKey) => {
                      const featLabel = ALL_AVAILABLE_FEATURES[featKey] || featKey;
                      const rawVal = selectedClusterDetail.all_feature_means?.[featKey];
                      const formatted = formatFeatureValue(rawVal, featKey);
                      return (
                        <div key={featKey} style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border-color)', padding: '6px 10px', borderRadius: '4px' }}>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>{featLabel}</div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginTop: '2px' }}>{formatted}</div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Member Areas List */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Member Areas ({selectedClusterDetail.member_area_names.length}):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                {selectedClusterDetail.member_area_names.map((name) => (
                  <span key={name} style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', color: 'var(--text-main)' }}>
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 7. Cluster Membership Data Table */}
      <div className="chart-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>
              Geographic Area Membership & Features Table
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Showing {filteredTableMemberships.length} of {kmeansResult?.area_memberships?.length || 0} analyzed areas.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="Search area..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                style={{
                  padding: '6px 12px 6px 30px',
                  background: 'var(--bg-dark)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Cluster Filter Dropdown */}
            <select
              value={tableClusterFilter}
              onChange={(e) => setTableClusterFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                background: 'var(--bg-dark)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-main)',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Clusters</option>
              {kmeansResult?.clusters?.map((c) => (
                <option key={c.cluster_id} value={c.cluster_id}>{c.cluster_label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Scrollable Table */}
        <div style={{ overflowX: 'auto', maxHeight: '350px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', background: 'var(--bg-sidebar)' }}>
                <th style={{ padding: '10px' }}>Area Identifier</th>
                <th style={{ padding: '10px' }}>Assigned Cluster</th>
                <th style={{ padding: '10px' }}>Incidents</th>
                <th style={{ padding: '10px' }}>Dominant Category</th>
                <th style={{ padding: '10px' }}>Arrest Rate</th>
                <th style={{ padding: '10px' }}>Domestic Rate</th>
                <th style={{ padding: '10px' }}>PCA Coords (X, Y)</th>
              </tr>
            </thead>
            <tbody>
              {filteredTableMemberships.map((m) => (
                <tr key={m.area_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px', fontWeight: 600, color: 'var(--text-main)' }}>{m.area_name}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: m.cluster_color, fontWeight: 600 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.cluster_color }}></span>
                      {m.cluster_label}
                    </span>
                  </td>
                  <td style={{ padding: '10px', fontFamily: 'var(--font-mono)' }}>{m.total_incidents.toLocaleString()}</td>
                  <td style={{ padding: '10px' }}>{m.dominant_crime}</td>
                  <td style={{ padding: '10px', fontFamily: 'var(--font-mono)' }}>{m.arrest_pct}%</td>
                  <td style={{ padding: '10px', fontFamily: 'var(--font-mono)' }}>{m.domestic_pct}%</td>
                  <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                    ({m.pca_x}, {m.pca_y})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8. Educational DWM Concept Documentation */}
      {explanation && (
        <div className="chart-card" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(19, 28, 46, 0.95) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <HelpCircle size={18} style={{ color: 'var(--primary-cyan)' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>
              Data Warehousing & Mining (DWM) Theoretical Foundations
            </h3>
          </div>

          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <div>
              <strong style={{ color: 'var(--primary-cyan)' }}>Algorithm & Clustering Units:</strong>
              <p style={{ margin: '4px 0 0 0', lineHeight: 1.4 }}>
                K-Means partitions Chicago Police Districts and Municipal Community Areas based on multi-dimensional feature profiles (theft share, arrest rate, domestic ratio, night shift share).
              </p>
            </div>
            <div>
              <strong style={{ color: 'var(--primary-indigo)' }}>Standardization (Z-Score):</strong>
              <p style={{ margin: '4px 0 0 0', lineHeight: 1.4 }}>
                Features are standardized (mean=0, std=1) so high-magnitude incident counts do not dominate Euclidean distance calculations over percentage rates.
              </p>
            </div>
            <div>
              <strong style={{ color: 'var(--accent-amber)' }}>Evaluation (Silhouette & WCSS):</strong>
              <p style={{ margin: '4px 0 0 0', lineHeight: 1.4 }}>
                Evaluated via Elbow Inertia (WCSS) and Silhouette Score (cohesion vs separation). High scores indicate dense, well-separated district clusters.
              </p>
            </div>
            <div>
              <strong style={{ color: 'var(--accent-emerald)' }}>2D PCA Projection & Limitations:</strong>
              <p style={{ margin: '4px 0 0 0', lineHeight: 1.4 }}>
                Principal Component Analysis (PCA) projects multi-dimensional space onto 2 visual axes. Assumes convex spherical cluster shapes and equal cluster variance.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
