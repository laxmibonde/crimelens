import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Flame,
  MapPin,
  Sliders,
  Filter,
  Info,
  Layers,
  Sparkles,
  RotateCcw,
  X,
  Clock,
  ShieldAlert,
  HelpCircle,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Play,
  Crosshair,
  ExternalLink,
  ChevronRight,
  Database
} from 'lucide-react';

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polygon,
  Popup,
  Tooltip,
  useMap
} from 'react-leaflet';

import 'leaflet/dist/leaflet.css';

import {
  fetchHotspotsSummary,
  fetchHotspotClusters,
  fetchClusterDetails,
  fetchDashboardFilters,
  checkHotspotScope
} from '../services/api';

import { useDataset } from '../context/DatasetContext';

// Maximum safe incident threshold for in-memory pairwise DBSCAN execution
const MAX_SAFE_SCOPE = 25000;

// Chicago Downtown Default Coordinates
const CHICAGO_CENTER = [41.8781, -87.6298];
const CHICAGO_ZOOM = 11;

// Map Recenter Helper Component
function RecenterMap({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

export default function HotspotsPage() {
  const { dataset } = useDataset();

  // Filters State
  const [filterOptions, setFilterOptions] = useState(null);
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedDistrict, setSelectedDistrict] = useState('001');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('');

  // DBSCAN Parameter Lab State
  const [epsMeters, setEpsMeters] = useState(300);
  const [minSamples, setMinSamples] = useState(15);
  const [appliedEps, setAppliedEps] = useState(300);
  const [appliedMinSamples, setAppliedMinSamples] = useState(15);

  // Basemap Selection: 'esri_dark' (default dark gray canvas) or 'osm_dark' (OSM with nightfall filter)
  const [basemapMode, setBasemapMode] = useState('esri_dark');
  const [tileError, setTileError] = useState(false);

  // Scope Verification State
  const [scopeLoading, setScopeLoading] = useState(false);
  const [scopeInfo, setScopeInfo] = useState({
    totalMatched: null,
    maxAllowed: MAX_SAFE_SCOPE,
    isValid: true,
    reductionRequired: 0,
    reductionPercentage: 0,
    status: 'PENDING'
  });

  // Clustering Execution State
  const [clusterData, setClusterData] = useState(null);
  const [hasExecuted, setHasExecuted] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executionTimeMs, setExecutionTimeMs] = useState(null);
  const [executionError, setExecutionError] = useState(null);

  // Selected Cluster Detail State
  const [selectedClusterId, setSelectedClusterId] = useState(null);
  const [clusterDetailData, setClusterDetailData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Map View State
  const [mapCenter, setMapCenter] = useState(CHICAGO_CENTER);
  const [mapZoom, setMapZoom] = useState(CHICAGO_ZOOM);

  // Ref to prevent initial duplicate executions
  const initialRanRef = useRef(false);

  // Active Filters Memo
  const activeFilters = useMemo(() => {
    const flt = {};
    if (selectedYear) flt.year = parseInt(selectedYear, 10);
    if (selectedDistrict) flt.district = selectedDistrict;
    if (selectedCategory) flt.primary_type = selectedCategory;
    if (selectedTimePeriod) flt.time_period = selectedTimePeriod;
    return flt;
  }, [selectedYear, selectedDistrict, selectedCategory, selectedTimePeriod]);

  // Load Filter Choices on Mount or Dataset change
  useEffect(() => {
    async function loadFilters() {
      try {
        const data = await fetchDashboardFilters(dataset);
        setFilterOptions(data);
      } catch (err) {
        console.warn('Could not load filter choices:', err);
      }
    }
    loadFilters();
  }, [dataset]);

  // Core DBSCAN Execution Function
  const runDBSCAN = useCallback(async (filtersToUse, epsToUse, minSamplesToUse) => {
    setExecuting(true);
    setExecutionError(null);
    const startTime = performance.now();
    try {
      const res = await fetchHotspotClusters({
        eps_meters: epsToUse,
        min_samples: minSamplesToUse,
        filters: filtersToUse,
        dataset
      });

      const elapsed = Math.round(performance.now() - startTime);
      setExecutionTimeMs(elapsed);
      setAppliedEps(epsToUse);
      setAppliedMinSamples(minSamplesToUse);

      if (res.status === 'SCOPE_EXCEEDED') {
        // Backend caught scope exceeded
        setClusterData(null);
        setHasExecuted(false);
        setScopeInfo({
          totalMatched: res.total_matched,
          maxAllowed: res.max_allowed,
          isValid: false,
          reductionRequired: res.reduction_required || (res.total_matched - res.max_allowed),
          reductionPercentage: res.reduction_percentage || Math.round(((res.total_matched - res.max_allowed) / res.total_matched) * 100),
          status: 'SCOPE_EXCEEDED'
        });
      } else {
        setClusterData(res);
        setHasExecuted(true);
      }
    } catch (err) {
      console.error('DBSCAN execution failed:', err);
      setExecutionError(err.message || 'Failed to calculate DBSCAN hotspots');
      setClusterData(null);
      setHasExecuted(false);
    } finally {
      setExecuting(false);
    }
  }, [dataset]);

  // Scope Verification & Invalidation when Filters Change
  useEffect(() => {
    let isCancelled = false;

    async function evaluateScope() {
      setScopeLoading(true);
      // Invalidate stale results so previous cluster markers do not linger with new filters
      setClusterData(null);
      setHasExecuted(false);
      setSelectedClusterId(null);
      setExecutionError(null);

      try {
        const scopeRes = await checkHotspotScope({ filters: activeFilters, dataset });
        if (isCancelled) return;

        setScopeInfo({
          totalMatched: scopeRes.total_matched,
          maxAllowed: scopeRes.max_allowed,
          isValid: scopeRes.is_valid,
          reductionRequired: scopeRes.reduction_required,
          reductionPercentage: scopeRes.reduction_percentage,
          status: scopeRes.status,
          message: scopeRes.message
        });

        // On initial mount with valid default filters (Year 2024, District 001 ~14.9K), auto-execute once
        if (!initialRanRef.current && scopeRes.is_valid) {
          initialRanRef.current = true;
          runDBSCAN(activeFilters, epsMeters, minSamples);
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Scope check failed, falling back to manual validation:', err);
          setScopeInfo((prev) => ({ ...prev, status: 'ERROR', isValid: true }));
        }
      } finally {
        if (!isCancelled) setScopeLoading(false);
      }
    }

    evaluateScope();

    return () => {
      isCancelled = true;
    };
  }, [activeFilters, dataset, runDBSCAN]);

  // Trigger Execution on "Execute DBSCAN Clustering" Button Click
  const handleExecute = () => {
    if (!scopeInfo.isValid || executing) return;
    runDBSCAN(activeFilters, epsMeters, minSamples);
  };

  // Reset to Safe Eligible Defaults (District 001, Year 2024)
  const handleResetDefaults = () => {
    setSelectedYear('2024');
    setSelectedDistrict('001');
    setSelectedCategory('');
    setSelectedTimePeriod('');
    setEpsMeters(300);
    setMinSamples(15);
    setSelectedClusterId(null);
    setMapCenter(CHICAGO_CENTER);
    setMapZoom(CHICAGO_ZOOM);
  };

  // Preset Filters Quick Applicator
  const applyPreset = (preset) => {
    if (preset.year !== undefined) setSelectedYear(preset.year);
    if (preset.district !== undefined) setSelectedDistrict(preset.district);
    if (preset.category !== undefined) setSelectedCategory(preset.category);
    if (preset.timePeriod !== undefined) setSelectedTimePeriod(preset.timePeriod);
  };

  // Focus Map on Selected Cluster
  const handleFocusCluster = (cluster) => {
    if (cluster && cluster.centroid && typeof cluster.centroid.lat === 'number' && typeof cluster.centroid.lon === 'number') {
      setMapCenter([cluster.centroid.lat, cluster.centroid.lon]);
      setMapZoom(13);
      setSelectedClusterId(cluster.cluster_id);
    }
  };

  // Fetch Cluster In-Depth Profile when Selected
  useEffect(() => {
    if (selectedClusterId === null || !hasExecuted) {
      setClusterDetailData(null);
      return;
    }
    let isSubscribed = true;
    async function loadDetail() {
      setLoadingDetail(true);
      try {
        const res = await fetchClusterDetails({
          cluster_id: selectedClusterId,
          eps_meters: appliedEps,
          min_samples: appliedMinSamples,
          filters: activeFilters,
          dataset
        });
        if (isSubscribed) setClusterDetailData(res);
      } catch (err) {
        console.error('Failed to load cluster details:', err);
      } finally {
        if (isSubscribed) setLoadingDetail(false);
      }
    }
    loadDetail();
    return () => {
      isSubscribed = false;
    };
  }, [selectedClusterId, appliedEps, appliedMinSamples, activeFilters, dataset, hasExecuted]);

  // Helper to determine noise percentage
  const noisePercentage = useMemo(() => {
    if (!clusterData || !hasExecuted) return null;
    const clPct = parseFloat(clusterData.clustering_percentage || 0);
    return Math.max(0, (100 - clPct)).toFixed(1);
  }, [clusterData, hasExecuted]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="page-title">
              <Flame size={26} style={{ color: 'var(--accent-rose, #f43f5e)' }} />
              DBSCAN Crime Hotspot Intelligence & Spatial Analytics
            </h1>
            <p className="page-description">
              Geospatial density-based clustering (DBSCAN) using Great-Circle Haversine distance
              on real PostgreSQL Chicago Crime coordinates (2023–2025).
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: 'var(--primary-cyan, #38bdf8)',
              fontSize: '0.8rem',
              fontWeight: 600
            }}>
              <Database size={14} /> Ground Truth Census: 761,718 Incidents
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        className="filter-bar"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          alignItems: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          borderColor: 'rgba(244, 63, 94, 0.3)',
          padding: '16px',
          borderRadius: '10px',
          border: '1px solid var(--border-color)'
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
            Filter Year
          </label>
          <select
            className="filter-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="">All Historical Years (2023–2025)</option>
            {filterOptions?.years?.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
            Police District
          </label>
          <select
            className="filter-select"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="">All Police Districts (Citywide)</option>
            {filterOptions?.districts?.map((d) => (
              <option key={d} value={d}>District {d}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
            Offense Category
          </label>
          <select
            className="filter-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="">All Crime Categories</option>
            {filterOptions?.crime_types?.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
            Diurnal Time Period
          </label>
          <select
            className="filter-select"
            value={selectedTimePeriod}
            onChange={(e) => setSelectedTimePeriod(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="">All Time Periods</option>
            {filterOptions?.time_periods?.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Scope Status / Guidance Banner */}
      {!scopeInfo.isValid && scopeInfo.totalMatched > MAX_SAFE_SCOPE && (
        <div style={{
          padding: '16px 20px',
          backgroundColor: 'rgba(234, 179, 8, 0.08)',
          border: '1px solid rgba(234, 179, 8, 0.4)',
          borderRadius: '10px',
          color: '#fbbf24',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={24} style={{ color: '#fbbf24', flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: '1rem', color: '#fef08a' }}>
                  Refine Your Filters to Run DBSCAN Density Clustering
                </strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.84rem', color: '#cbd5e1' }}>
                  Current selection exceeds the 25,000-incident safety limit required for responsive pairwise Haversine clustering.
                </p>
              </div>
            </div>
            <span style={{
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              fontSize: '0.78rem',
              fontWeight: 700
            }}>
              Scope Exceeded: {scopeInfo.totalMatched?.toLocaleString()} &gt; 25,000 Limit
            </span>
          </div>

          {/* Metric Reduction Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '10px',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Matched Incidents</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f87171' }}>
                {scopeInfo.totalMatched?.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Maximum Safe Limit</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>
                {MAX_SAFE_SCOPE.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Remaining Reduction Required</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fbbf24' }}>
                -{scopeInfo.reductionRequired?.toLocaleString()} ({scopeInfo.reductionPercentage}% reduction)
              </div>
            </div>
          </div>

          {/* Guidance & Quick Preset Filters */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
            <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
              💡 <strong>Quick Presets:</strong> Narrow your scope to an eligible police district or offense:
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => applyPreset({ district: '001', year: '2024', category: '', timePeriod: '' })}
                className="filter-button"
                style={{ fontSize: '0.75rem', padding: '4px 10px', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
              >
                District 001 (Central, ~14.9K)
              </button>
              <button
                onClick={() => applyPreset({ district: '018', year: '2024', category: '', timePeriod: '' })}
                className="filter-button"
                style={{ fontSize: '0.75rem', padding: '4px 10px', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
              >
                District 018 (Near North, ~15.2K)
              </button>
              <button
                onClick={() => applyPreset({ district: '011', year: '2024', category: 'BATTERY', timePeriod: '' })}
                className="filter-button"
                style={{ fontSize: '0.75rem', padding: '4px 10px', borderColor: 'rgba(244, 63, 94, 0.4)', color: '#f43f5e' }}
              >
                District 011 + Battery (~4.8K)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scope Valid State Readiness Bar */}
      {scopeInfo.isValid && !scopeLoading && (
        <div style={{
          padding: '10px 16px',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#a7f3d0' }}>
            <CheckCircle2 size={18} style={{ color: '#10b981', flexShrink: 0 }} />
            <span>
              <strong>Spatial Scope Eligible:</strong> {scopeInfo.totalMatched?.toLocaleString()} incidents matched
              (within the safe {MAX_SAFE_SCOPE.toLocaleString()} limit). Ready for density clustering.
            </span>
          </div>
          {hasExecuted && executionTimeMs !== null && (
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Last executed in <strong style={{ color: '#38bdf8' }}>{executionTimeMs} ms</strong>
            </span>
          )}
        </div>
      )}

      {/* Execution Error Banner */}
      {executionError && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '8px',
          color: '#f87171',
          fontSize: '0.86rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <span><strong>Execution Error:</strong> {executionError}</span>
          <button
            onClick={handleExecute}
            style={{
              padding: '4px 10px',
              backgroundColor: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600
            }}
          >
            Retry Execution
          </button>
        </div>
      )}

      {/* DBSCAN Parameter Control Lab & Execution Action */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          backgroundColor: 'rgba(30, 41, 59, 0.6)',
          borderColor: 'rgba(244, 63, 94, 0.25)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} style={{ color: 'var(--accent-rose, #f43f5e)' }} />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>DBSCAN Parameter Calibration & Execution</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(244, 63, 94, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
              Haversine Spatial Metric
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Execute DBSCAN Button */}
            <button
              onClick={handleExecute}
              disabled={!scopeInfo.isValid || executing || scopeLoading}
              className={`filter-button ${scopeInfo.isValid ? 'active' : ''}`}
              style={{
                backgroundColor: scopeInfo.isValid ? 'var(--accent-rose, #f43f5e)' : 'rgba(100, 116, 139, 0.3)',
                borderColor: scopeInfo.isValid ? 'var(--accent-rose, #f43f5e)' : 'rgba(100, 116, 139, 0.3)',
                color: scopeInfo.isValid ? '#fff' : '#64748b',
                cursor: scopeInfo.isValid && !executing ? 'pointer' : 'not-allowed',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                fontSize: '0.85rem'
              }}
              title={!scopeInfo.isValid ? `Scope must be ≤ ${MAX_SAFE_SCOPE.toLocaleString()} incidents to execute` : 'Execute DBSCAN Clustering'}
            >
              {executing ? (
                <>
                  <RotateCcw size={15} className="spin" />
                  Clustering Haversine Coords...
                </>
              ) : (
                <>
                  <Flame size={15} />
                  Execute DBSCAN Clustering
                  {scopeInfo.isValid && scopeInfo.totalMatched ? ` (${scopeInfo.totalMatched.toLocaleString()})` : ''}
                </>
              )}
            </button>

            {/* Reset Defaults Button */}
            <button
              onClick={handleResetDefaults}
              className="filter-button"
              style={{ fontSize: '0.82rem', padding: '8px 12px' }}
            >
              <RotateCcw size={14} /> Reset Defaults
            </button>
          </div>
        </div>

        {/* Sliders Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Eps (Spatial Search Radius &epsilon;):</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-rose, #f43f5e)' }}>{epsMeters} meters</span>
            </div>
            <input
              type="range"
              min="100"
              max="1500"
              step="50"
              value={epsMeters}
              onChange={(e) => setEpsMeters(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: 'var(--accent-rose, #f43f5e)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span>100m (Dense Local)</span>
              <span>300m (Recommended)</span>
              <span>1500m (Broad Zonal)</span>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>MinSamples (Core Density Threshold):</span>
              <span style={{ fontWeight: 700, color: 'var(--primary-cyan, #38bdf8)' }}>{minSamples} incidents</span>
            </div>
            <input
              type="range"
              min="5"
              max="80"
              step="5"
              value={minSamples}
              onChange={(e) => setMinSamples(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: 'var(--primary-cyan, #38bdf8)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span>5 (Permissive)</span>
              <span>15 (Recommended)</span>
              <span>80 (High Core Density)</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Overview Grid - Shows "Not analyzed" when scope is invalid or before clustering execution */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Discovered Hotspot Clusters</span>
            <div className="kpi-icon-wrapper rose">
              <Flame size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: hasExecuted ? '#fff' : 'var(--text-muted)' }}>
            {hasExecuted && clusterData ? clusterData.cluster_count : 'Not analyzed'}
          </div>
          <div className="kpi-subtitle">
            {hasExecuted ? 'Dense spatial concentrations' : (scopeInfo.isValid ? 'Awaiting execution' : 'Scope refinement required')}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Clustered Incidents</span>
            <div className="kpi-icon-wrapper cyan">
              <MapPin size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: hasExecuted ? '#fff' : 'var(--text-muted)' }}>
            {hasExecuted && clusterData?.clustered_incident_count !== undefined && clusterData?.clustered_incident_count !== null
              ? clusterData.clustered_incident_count.toLocaleString()
              : 'Not analyzed'}
          </div>
          <div className="kpi-subtitle">
            {hasExecuted && clusterData
              ? `${clusterData.clustering_percentage || 0}% of spatial warehouse scope`
              : (scopeInfo.isValid ? 'Awaiting execution' : 'Scope refinement required')}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Spatial Noise Points</span>
            <div className="kpi-icon-wrapper amber">
              <Info size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: hasExecuted ? '#fff' : 'var(--text-muted)' }}>
            {hasExecuted && clusterData?.noise_incident_count !== undefined && clusterData?.noise_incident_count !== null
              ? clusterData.noise_incident_count.toLocaleString()
              : 'Not analyzed'}
          </div>
          <div className="kpi-subtitle">
            {hasExecuted && noisePercentage !== null
              ? `${noisePercentage}% isolated outlier incidents`
              : (scopeInfo.isValid ? 'Awaiting execution' : 'Scope refinement required')}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Largest Hotspot Volume</span>
            <div className="kpi-icon-wrapper purple">
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: hasExecuted ? '#fff' : 'var(--text-muted)' }}>
            {hasExecuted && clusterData?.largest_cluster_size !== undefined && clusterData?.largest_cluster_size !== null
              ? clusterData.largest_cluster_size.toLocaleString()
              : 'Not analyzed'}
          </div>
          <div className="kpi-subtitle">
            {hasExecuted ? 'Rank #1 cluster incident count' : (scopeInfo.isValid ? 'Awaiting execution' : 'Scope refinement required')}
          </div>
        </div>
      </div>

      {/* Main Interactive Map & Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedClusterId !== null ? '1fr 380px' : '1fr', gap: '20px' }}>
        {/* Leaflet Map Card */}
        <div className="card" style={{ padding: '16px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={18} style={{ color: 'var(--accent-rose, #f43f5e)' }} />
              Chicago Crime DBSCAN Geospatial Density Map
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Basemap Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(15, 23, 42, 0.7)', padding: '2px 6px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Layers size={13} style={{ color: 'var(--text-muted)' }} />
                <button
                  onClick={() => setBasemapMode('esri_dark')}
                  style={{
                    background: basemapMode === 'esri_dark' ? 'rgba(56, 189, 248, 0.2)' : 'none',
                    border: 'none',
                    color: basemapMode === 'esri_dark' ? '#38bdf8' : '#94a3b8',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '2px 6px',
                    cursor: 'pointer'
                  }}
                  title="Esri World Dark Gray Canvas (Default)"
                >
                  Dark Canvas
                </button>
                <button
                  onClick={() => setBasemapMode('osm_dark')}
                  style={{
                    background: basemapMode === 'osm_dark' ? 'rgba(56, 189, 248, 0.2)' : 'none',
                    border: 'none',
                    color: basemapMode === 'osm_dark' ? '#38bdf8' : '#94a3b8',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '2px 6px',
                    cursor: 'pointer'
                  }}
                  title="OpenStreetMap Standard with Chicago Nightfall Theme"
                >
                  OSM Nightfall
                </button>
              </div>

              {/* Reset Map View Button */}
              <button
                onClick={() => { setMapCenter(CHICAGO_CENTER); setMapZoom(CHICAGO_ZOOM); setSelectedClusterId(null); }}
                className="filter-button"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              >
                <RotateCcw size={12} /> Reset View
              </button>
            </div>
          </div>

          {/* Active Filter Badges */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px', fontSize: '0.78rem' }}>
            <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
              Year: <strong style={{ color: '#fff' }}>{selectedYear || 'All (2023–2025)'}</strong>
            </span>
            <span style={{ padding: '3px 8px', borderRadius: '4px', background: selectedDistrict ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.06)', color: selectedDistrict ? '#38bdf8' : '#94a3b8' }}>
              District: <strong style={{ color: selectedDistrict ? '#38bdf8' : '#fff' }}>{selectedDistrict ? `District ${selectedDistrict}` : 'All Districts'}</strong>
            </span>
            <span style={{ padding: '3px 8px', borderRadius: '4px', background: selectedCategory ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.06)', color: selectedCategory ? '#f43f5e' : '#94a3b8' }}>
              Offense: <strong style={{ color: selectedCategory ? '#f43f5e' : '#fff' }}>{selectedCategory || 'All Offenses'}</strong>
            </span>
            <span style={{ padding: '3px 8px', borderRadius: '4px', background: selectedTimePeriod ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.06)', color: selectedTimePeriod ? '#fbbf24' : '#94a3b8' }}>
              Diurnal: <strong style={{ color: selectedTimePeriod ? '#fbbf24' : '#fff' }}>{selectedTimePeriod || 'All Periods'}</strong>
            </span>
            {hasExecuted && (
              <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
                Parameters: <strong style={{ color: '#34d399' }}>&epsilon;={appliedEps}m, MinPts={appliedMinSamples}</strong>
              </span>
            )}
          </div>

          {/* Map Container */}
          <div style={{ height: '520px', width: '100%', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%', backgroundColor: '#08101C' }}
            >
              <RecenterMap center={mapCenter} zoom={mapZoom} />

              {/* Supported Basemap Layers (No API key required) */}
              {basemapMode === 'esri_dark' && !tileError ? (
                <>
                  {/* Esri World Dark Gray Canvas Base Tiles */}
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                    attribution='&copy; <a href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a>, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
                    maxNativeZoom={16}
                    maxZoom={18}
                    eventHandlers={{
                      tileerror: () => setTileError(true)
                    }}
                  />
                  {/* Esri Reference Overlay (Roads & Context Labels) */}
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                    attribution=""
                    maxNativeZoom={16}
                    maxZoom={18}
                    opacity={0.85}
                  />
                </>
              ) : (
                /* OpenStreetMap Standard with Chicago Nightfall Theme CSS Filter */
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
                  className="nightfall-osm-tiles"
                  maxZoom={19}
                />
              )}

              {/* Cluster Boundary Convex Hulls (Only shown for completed clustering run) */}
              {hasExecuted && clusterData?.clusters?.map((cluster) => {
                if (!cluster.convex_hull || cluster.convex_hull.length < 3) return null;
                const isSelected = selectedClusterId === cluster.cluster_id;
                return (
                  <Polygon
                    key={`hull-${cluster.cluster_id}`}
                    positions={cluster.convex_hull}
                    pathOptions={{
                      color: cluster.color,
                      fillColor: cluster.color,
                      fillOpacity: isSelected ? 0.40 : 0.18,
                      weight: isSelected ? 3 : 1.5,
                      dashArray: isSelected ? '4,4' : undefined
                    }}
                    eventHandlers={{
                      click: () => handleFocusCluster(cluster)
                    }}
                  />
                );
              })}

              {/* Cluster Centroid Markers (Only shown for completed clustering run) */}
              {hasExecuted && clusterData?.clusters?.map((cluster) => {
                const isSelected = selectedClusterId === cluster.cluster_id;
                const radius = Math.max(10, Math.min(32, Math.sqrt(cluster.incident_count) * 0.45));

                return (
                  <CircleMarker
                    key={`marker-${cluster.cluster_id}`}
                    center={[cluster.centroid.lat, cluster.centroid.lon]}
                    radius={radius}
                    pathOptions={{
                      fillColor: cluster.color,
                      color: isSelected ? '#ffffff' : cluster.color,
                      weight: isSelected ? 3 : 2,
                      fillOpacity: isSelected ? 0.95 : 0.75
                    }}
                    eventHandlers={{
                      click: () => handleFocusCluster(cluster)
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.82rem' }}>
                        {cluster.cluster_label}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                        Incidents: {cluster.incident_count.toLocaleString()}
                      </div>
                      <div style={{ color: 'var(--primary-cyan, #38bdf8)', fontSize: '0.72rem', fontWeight: 600 }}>
                        Top Offense: {cluster.dominant_crime}
                      </div>
                    </Tooltip>
                    <Popup>
                      <div style={{ color: '#eaf2ff', padding: '4px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#fff' }}>{cluster.cluster_label}</h4>
                        <p style={{ margin: '0 0 4px 0', fontSize: '0.78rem' }}>
                          <strong>Total Incidents:</strong> {cluster.incident_count.toLocaleString()}
                        </p>
                        <p style={{ margin: '0 0 6px 0', fontSize: '0.78rem' }}>
                          <strong>Dominant Category:</strong> {cluster.dominant_crime}
                        </p>
                        <button
                          onClick={() => setSelectedClusterId(cluster.cluster_id)}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: 'var(--primary-cyan, #38bdf8)',
                            color: '#08101c',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}
                        >
                          Inspect Cluster Profile
                        </button>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>

            {/* Over-Map Non-blocking Informative State Overlays */}
            {!scopeInfo.isValid && (
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                backgroundColor: 'rgba(15, 23, 42, 0.92)',
                border: '1px solid rgba(234, 179, 8, 0.5)',
                borderRadius: '8px',
                padding: '8px 16px',
                color: '#fbbf24',
                fontSize: '0.82rem',
                fontWeight: 600,
                boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backdropFilter: 'blur(6px)'
              }}>
                <AlertTriangle size={16} />
                Awaiting valid filter scope (&le; 25,000 incidents) to execute DBSCAN density clustering.
              </div>
            )}

            {scopeInfo.isValid && !hasExecuted && !executing && (
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                backgroundColor: 'rgba(15, 23, 42, 0.92)',
                border: '1px solid rgba(56, 189, 248, 0.5)',
                borderRadius: '8px',
                padding: '8px 16px',
                color: '#38bdf8',
                fontSize: '0.82rem',
                fontWeight: 600,
                boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backdropFilter: 'blur(6px)'
              }}>
                <Play size={14} />
                Scope is ready ({scopeInfo.totalMatched?.toLocaleString()} incidents). Click "Execute DBSCAN Clustering" to analyze.
              </div>
            )}

            {executing && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 1000,
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid var(--accent-rose, #f43f5e)',
                borderRadius: '12px',
                padding: '18px 26px',
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: 600,
                boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                backdropFilter: 'blur(8px)'
              }}>
                <RotateCcw size={26} className="spin" style={{ color: 'var(--accent-rose, #f43f5e)' }} />
                <span>Fitting DBSCAN on Haversine coordinates...</span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Evaluating {scopeInfo.totalMatched?.toLocaleString()} spatial points (&epsilon;={epsMeters}m, MinPts={minSamples})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Selected Cluster Detail Drawer */}
        {selectedClusterId !== null && (
          <div
            className="card"
            style={{
              padding: '16px',
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              borderColor: 'rgba(56, 189, 248, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              maxHeight: '575px',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-cyan, #38bdf8)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} /> Hotspot #{selectedClusterId + 1} Profile
              </h3>
              <button
                onClick={() => setSelectedClusterId(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {loadingDetail ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading cluster analytics...</div>
            ) : clusterDetailData ? (
              <>
                <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '6px', fontSize: '0.82rem' }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>CLUSTER CENTROID</div>
                  <div style={{ fontWeight: 700, color: '#fff' }}>
                    Lat: {clusterDetailData.centroid?.lat}, Lon: {clusterDetailData.centroid?.lon}
                  </div>
                  <div style={{ color: 'var(--primary-cyan, #38bdf8)', marginTop: '4px', fontWeight: 600 }}>
                    Incident Volume: {clusterDetailData.incident_count?.toLocaleString()}
                  </div>
                </div>

                {/* Crime Categories Breakdown */}
                <div>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Top Crime Categories in Cluster
                  </h4>
                  {Object.entries(clusterDetailData.crime_categories || {}).map(([cat, cnt], idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                      <span style={{ color: '#cbd5e1' }}>{cat}</span>
                      <span style={{ fontWeight: 700, color: 'var(--primary-cyan, #38bdf8)' }}>{cnt.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                {/* Police District Distribution */}
                <div>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Police District Composition
                  </h4>
                  {Object.entries(clusterDetailData.district_distribution || {}).map(([dist, cnt], idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                      <span style={{ color: '#cbd5e1' }}>District {dist}</span>
                      <span style={{ fontWeight: 700, color: '#34d399' }}>{cnt.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Select a cluster to view details.</div>
            )}
          </div>
        )}
      </div>

      {/* Ranked Hotspots Summary Table */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={18} style={{ color: 'var(--primary-cyan, #38bdf8)' }} />
          Ranked Crime Hotspot Density Directory
        </h3>

        {!hasExecuted ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '30px 20px', backgroundColor: 'rgba(15, 23, 42, 0.4)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            {!scopeInfo.isValid ? (
              <>
                <AlertTriangle size={24} style={{ color: '#fbbf24', margin: '0 auto 8px auto', display: 'block' }} />
                <div style={{ fontWeight: 600, color: '#fef08a' }}>
                  DBSCAN clustering has not been executed for the current filter scope.
                </div>
                <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                  Current selection matches <strong>{scopeInfo.totalMatched?.toLocaleString()} incidents</strong>, exceeding the {MAX_SAFE_SCOPE.toLocaleString()} safety limit.
                  Please refine filters to run clustering.
                </div>
              </>
            ) : (
              <>
                <Play size={24} style={{ color: 'var(--primary-cyan, #38bdf8)', margin: '0 auto 8px auto', display: 'block' }} />
                <div style={{ fontWeight: 600, color: '#fff' }}>
                  Ready to execute DBSCAN density clustering on {scopeInfo.totalMatched?.toLocaleString()} incidents.
                </div>
                <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                  Click the <strong>"Execute DBSCAN Clustering"</strong> button above to fit spatial clusters and rank high-density zones.
                </div>
              </>
            )}
          </div>
        ) : clusterData?.clusters && clusterData.clusters.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px' }}>Rank</th>
                  <th style={{ padding: '10px' }}>Cluster Label</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Incident Count</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>% of Clustered</th>
                  <th style={{ padding: '10px' }}>Centroid Coords</th>
                  <th style={{ padding: '10px' }}>Dominant Category</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Map Action</th>
                </tr>
              </thead>
              <tbody>
                {clusterData.clusters.map((c, idx) => (
                  <tr
                    key={c.cluster_id}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      backgroundColor: selectedClusterId === c.cluster_id ? 'rgba(56, 189, 248, 0.1)' : 'transparent'
                    }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>#{idx + 1}</td>
                    <td style={{ padding: '10px', fontWeight: 600, color: '#fff' }}>
                      <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: c.color, marginRight: '8px' }}></span>
                      {c.cluster_label}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-rose, #f43f5e)' }}>
                      {c.incident_count.toLocaleString()}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>{c.percentage_of_clustered}%</td>
                    <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '0.78rem', color: '#94a3b8' }}>
                      {c.centroid.lat}, {c.centroid.lon}
                    </td>
                    <td style={{ padding: '10px', color: 'var(--primary-cyan, #38bdf8)', fontWeight: 600 }}>{c.dominant_crime}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleFocusCluster(c)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(56, 189, 248, 0.15)',
                          color: 'var(--primary-cyan, #38bdf8)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Locate on Map
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '20px' }}>
            No dense clusters found with active filters and parameters. Try lowering MinSamples or increasing the Eps search radius.
          </div>
        )}
      </div>

      {/* Explainable Data Mining Panel ("How DBSCAN Detects Hotspots") */}
      <div
        className="card"
        style={{
          padding: '20px',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          borderColor: 'rgba(244, 63, 94, 0.3)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-rose, #f43f5e)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={20} />
            Explainable Data Mining: How DBSCAN Detects Hotspots
          </h3>
          <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', backgroundColor: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose, #f43f5e)', fontWeight: 600 }}>
            DWM Algorithm Transparency
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', padding: '12px 14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>ALGORITHM & PURPOSE</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>DBSCAN Density Clustering</div>
            <p style={{ fontSize: '0.80rem', color: '#94a3b8', marginTop: '6px', margin: 0, lineHeight: 1.4 }}>
              Discovers arbitrarily shaped spatial crime clusters and isolates non-clustered noise without forcing incidents into predefined geometric shapes.
            </p>
          </div>

          <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', padding: '12px 14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>EPSILON SEARCH RADIUS (&epsilon;)</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-rose, #f43f5e)' }}>{appliedEps} meters (Great-Circle)</div>
            <p style={{ fontSize: '0.80rem', color: '#94a3b8', marginTop: '6px', margin: 0, lineHeight: 1.4 }}>
              Maximum Haversine spherical distance radius searched around each incident coordinate to identify neighborhood density.
            </p>
          </div>

          <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', padding: '12px 14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>CORE DENSITY (MinSamples)</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary-cyan, #38bdf8)' }}>{appliedMinSamples} incidents</div>
            <p style={{ fontSize: '0.80rem', color: '#94a3b8', marginTop: '6px', margin: 0, lineHeight: 1.4 }}>
              Minimum incident volume required within the search radius (&epsilon;) for a coordinate to seed an active core hotspot cluster.
            </p>
          </div>

          <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', padding: '12px 14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>OUTPUT & EVALUATION</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-emerald, #10B981)' }}>Clusters vs Noise Outliers</div>
            <p style={{ fontSize: '0.80rem', color: '#94a3b8', marginTop: '6px', margin: 0, lineHeight: 1.4 }}>
              Evaluated via Cluster Count, Noise Ratio (isolated incidents), and Incident Density Coverage across CPD patrol boundaries.
            </p>
          </div>
        </div>

        {/* Scientific Ground Truth & Administrative Disclaimer */}
        <div style={{ padding: '12px 14px', backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', fontSize: '0.80rem', color: '#fbbf24', lineHeight: 1.45 }}>
          <strong>Geospatial Analysis & Ground Truth Disclaimer:</strong> Public Chicago crime coordinates are published at approximate block-level centroids (e.g., <code>041XX W MADISON ST</code>) for privacy preservation, rather than exact building or incident addresses. DBSCAN density clusters reflect administrative police logging patterns across the municipal grid (2023–2025), not continuous crime probability surfaces or victimization hazard rates.
        </div>
      </div>
    </div>
  );
}
