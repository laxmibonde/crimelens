import React, { useState, useEffect, useMemo } from 'react';
import {
  Map,
  Sliders,
  ArrowRightLeft,
  RotateCcw,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Info,
  Layers,
  Sparkles,
  HelpCircle,
  Target,
  BarChart2,
  Search,
  Grid,
  ShieldAlert,
  Flame,
  Filter,
  RefreshCw,
  X,
  Compass
} from 'lucide-react';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';

import ChicagoSkylineHeader from '../components/ChicagoSkylineHeader';
import ChicagoAreaMap from '../components/ChicagoAreaMap';
import DistrictDetailPanel from '../components/DistrictDetailPanel';

import {
  fetchAreaIntelligenceMetadata,
  fetchAreaIntelligenceList,
  fetchAreaIntelligenceCompare,
  fetchAreaIntelligenceExplanation,
  fetchDistrictBoundaries,
  fetchDistrictsChoroplethSummary,
  fetchGeocodedIncidents,
  fetchDensityHeatmap,
  fetchDistrictTacticalProfile,
  fetchAreaHotspotsOverlay,
  fetchDashboardFilters,
  getActiveDataset
} from '../services/api';

import { useDataset } from '../context/DatasetContext';

export default function AreaIntelligencePage() {
  const { dataset: activeDataset, isSynthetic } = useDataset();

  // Loading & Error States
  const [loadingMap, setLoadingMap] = useState(true);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [error, setError] = useState(null);

  // Filter Bar State
  const [filterOptions, setFilterOptions] = useState({
    years: [2023, 2024, 2025],
    months: [],
    districts: [],
    crime_types: []
  });
  const [filters, setFilters] = useState({
    year: '',
    month: '',
    category: '',
    district: '',
    arrest: 'all',
    domestic: 'all'
  });

  // Geospatial Data States
  const [boundaries, setBoundaries] = useState(null);
  const [districtsSummary, setDistrictsSummary] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [hotspots, setHotspots] = useState([]);

  // Selected District Inspector State
  const [selectedDistrictId, setSelectedDistrictId] = useState('001');
  const [selectedDistrictProfile, setSelectedDistrictProfile] = useState(null);

  // Side-by-Side Area Comparison State
  const [granularity, setGranularity] = useState('district');
  const [areaList, setAreaList] = useState([]);
  const [areaIdA, setAreaIdA] = useState('001');
  const [areaIdB, setAreaIdB] = useState('002');
  const [compareResult, setCompareResult] = useState(null);
  const [searchCategory, setSearchCategory] = useState('');

  // Educational Modal State
  const [showEduModal, setShowEduModal] = useState(false);
  const [explanationData, setExplanationData] = useState(null);

  // Load Filter Options & District Boundaries on initial mount
  useEffect(() => {
    fetchDashboardFilters(activeDataset)
      .then(setFilterOptions)
      .catch((err) => console.error('Filter options fetch failed:', err));

    fetchDistrictBoundaries()
      .then(setBoundaries)
      .catch((err) => console.error('District boundaries fetch failed:', err));

    fetchAreaIntelligenceExplanation()
      .then(setExplanationData)
      .catch(console.error);
  }, [activeDataset]);

  // Load Geospatial Layers when dataset or filters change
  useEffect(() => {
    let isCancelled = false;
    setLoadingMap(true);
    setError(null);

    const activeFilters = {};
    if (filters.year) activeFilters.year = filters.year;
    if (filters.month) activeFilters.month = filters.month;
    if (filters.category) activeFilters.category = filters.category;
    if (filters.district) activeFilters.district = filters.district;
    if (filters.arrest !== 'all') activeFilters.arrest = filters.arrest;
    if (filters.domestic !== 'all') activeFilters.domestic = filters.domestic;

    Promise.all([
      fetchDistrictsChoroplethSummary(activeFilters),
      fetchGeocodedIncidents(activeFilters, 2000),
      fetchDensityHeatmap(activeFilters, 5000),
      fetchAreaHotspotsOverlay(activeFilters, 350, 15)
    ])
      .then(([summaryRes, incidentsRes, heatRes, hotRes]) => {
        if (isCancelled) return;
        setDistrictsSummary(summaryRes);
        setIncidents(incidentsRes.incidents || []);
        setHeatmapPoints(heatRes.points || []);
        setHotspots(hotRes.clusters || []);
        setLoadingMap(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('Failed to load geospatial intelligence layers:', err);
        setError('Failed to query spatial layers from PostgreSQL warehouse.');
        setLoadingMap(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [activeDataset, filters]);

  // Load Selected District Tactical Profile when selected district or filters change
  useEffect(() => {
    if (!selectedDistrictId) {
      setSelectedDistrictProfile(null);
      return;
    }

    const activeFilters = {};
    if (filters.year) activeFilters.year = filters.year;
    if (filters.month) activeFilters.month = filters.month;
    if (filters.category) activeFilters.category = filters.category;
    if (filters.arrest !== 'all') activeFilters.arrest = filters.arrest;
    if (filters.domestic !== 'all') activeFilters.domestic = filters.domestic;

    fetchDistrictTacticalProfile(selectedDistrictId, activeFilters)
      .then((prof) => {
        if (prof.status === 'SUCCESS') {
          setSelectedDistrictProfile(prof);
        } else {
          setSelectedDistrictProfile(null);
        }
      })
      .catch((err) => {
        console.error(`District profile failed for ${selectedDistrictId}:`, err);
      });
  }, [activeDataset, selectedDistrictId, filters]);

  // Load Area List for comparison dropdowns
  const loadAreaList = async () => {
    try {
      const res = await fetchAreaIntelligenceList(granularity);
      if (res && res.areas && res.areas.length > 0) {
        setAreaList(res.areas);
        const first = res.areas[0].area_id;
        const second = res.areas.length > 1 ? res.areas[1].area_id : first;
        setAreaIdA(first);
        setAreaIdB(second);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAreaList();
  }, [activeDataset, granularity]);

  // Run Side-by-Side Comparison
  const runComparison = async (overrideA = areaIdA, overrideB = areaIdB) => {
    if (!overrideA || !overrideB) return;
    setLoadingCompare(true);
    try {
      const activeFilters = {};
      if (filters.year) activeFilters.year = filters.year;
      if (filters.month) activeFilters.month = filters.month;

      const payload = {
        granularity,
        area_id_a: overrideA,
        area_id_b: overrideB,
        filters: activeFilters
      };
      const res = await fetchAreaIntelligenceCompare(payload);
      setCompareResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCompare(false);
    }
  };

  useEffect(() => {
    if (areaIdA && areaIdB) {
      runComparison(areaIdA, areaIdB);
    }
  }, [areaIdA, areaIdB, activeDataset, granularity, filters.year, filters.month]);

  // Filter Bar Handlers
  const handleFilterChange = (key, val) => {
    setFilters((prev) => ({
      ...prev,
      [key]: val
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      year: '',
      month: '',
      category: '',
      district: '',
      arrest: 'all',
      domestic: 'all'
    });
  };

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== '' && v !== 'all'
  ).length;

  // Comparison Handlers
  const handleSwap = () => {
    const temp = areaIdA;
    setAreaIdA(areaIdB);
    setAreaIdB(temp);
  };

  // Filtered Category Comparison
  const filteredCategoryComparison = useMemo(() => {
    if (!compareResult || !compareResult.category_comparison) return [];
    if (!searchCategory.trim()) return compareResult.category_comparison;
    const q = searchCategory.toLowerCase();
    return compareResult.category_comparison.filter((c) =>
      c.category.toLowerCase().includes(q)
    );
  }, [compareResult, searchCategory]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Chicago Skyline Header */}
      <ChicagoSkylineHeader
        title="Area Intelligence & Geospatial Dashboard"
        subtitle="Tactical Chicago urban command center with official police district boundaries, choropleth, density heatmaps, and DBSCAN overlays"
        badgeText={isSynthetic ? "SYNTHETIC WAREHOUSE DEMO" : "CHICAGO HISTORICAL WAREHOUSE"}
      />

      {/* Global Filter Bar */}
      <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
        <div className="filter-bar-header">
          <Filter size={16} style={{ color: 'var(--lake-blue, #35B8E8)' }} />
          <span>Geospatial Filters</span>
          {activeFilterCount > 0 && (
            <span
              className="chart-badge"
              style={{
                backgroundColor: 'rgba(53, 184, 232, 0.18)',
                color: 'var(--lake-blue, #35B8E8)',
                border: '1px solid rgba(53, 184, 232, 0.35)',
                fontWeight: 600
              }}
            >
              {activeFilterCount} Active
            </span>
          )}
        </div>

        {/* Year Filter */}
        <div className="filter-group">
          <label className="filter-label">Year</label>
          <select
            className="filter-select"
            value={filters.year}
            onChange={(e) => handleFilterChange('year', e.target.value)}
          >
            <option value="">All Years</option>
            {filterOptions.years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Month Filter */}
        <div className="filter-group">
          <label className="filter-label">Month</label>
          <select
            className="filter-select"
            value={filters.month}
            onChange={(e) => handleFilterChange('month', e.target.value)}
          >
            <option value="">All Months</option>
            {filterOptions.months.map((m) => (
              <option key={m.month} value={m.month}>{m.month_name}</option>
            ))}
          </select>
        </div>

        {/* Crime Category Filter */}
        <div className="filter-group">
          <label className="filter-label">IUCR Category</label>
          <select
            className="filter-select"
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            <option value="">All Offenses</option>
            {filterOptions.crime_types.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Police District Filter */}
        <div className="filter-group">
          <label className="filter-label">Police District</label>
          <select
            className="filter-select"
            value={filters.district}
            onChange={(e) => {
              handleFilterChange('district', e.target.value);
              if (e.target.value) {
                setSelectedDistrictId(e.target.value);
              }
            }}
          >
            <option value="">All 22 Districts</option>
            {filterOptions.districts.map((d) => (
              <option key={d} value={d}>District {String(d).padStart(3, '0')}</option>
            ))}
          </select>
        </div>

        {/* Arrest Status Filter */}
        <div className="filter-group">
          <label className="filter-label">Arrest Status</label>
          <select
            className="filter-select"
            value={filters.arrest}
            onChange={(e) => handleFilterChange('arrest', e.target.value)}
          >
            <option value="all">All Outcomes</option>
            <option value="true">Arrest Made Only</option>
            <option value="false">No Arrest</option>
          </select>
        </div>

        {/* Domestic Status Filter */}
        <div className="filter-group">
          <label className="filter-label">Domestic Incident</label>
          <select
            className="filter-select"
            value={filters.domestic}
            onChange={(e) => handleFilterChange('domestic', e.target.value)}
          >
            <option value="all">All Cases</option>
            <option value="true">Domestic Only</option>
            <option value="false">Non-Domestic</option>
          </select>
        </div>

        {/* Reset Filter Button */}
        <button
          type="button"
          onClick={handleResetFilters}
          disabled={activeFilterCount === 0}
          style={{
            background: activeFilterCount > 0 ? 'rgba(53, 184, 232, 0.15)' : 'none',
            border: '1px solid var(--border-subtle, rgba(53, 184, 232, 0.25))',
            color: activeFilterCount > 0 ? 'var(--lake-blue, #35B8E8)' : 'var(--text-dim, #5D728F)',
            padding: '7px 12px',
            borderRadius: 'var(--radius-sm, 6px)',
            cursor: activeFilterCount > 0 ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            marginTop: 'auto'
          }}
        >
          <RotateCcw size={13} />
          <span>Reset Filters</span>
        </button>

        {/* Methodology Modal Trigger */}
        <button
          type="button"
          onClick={() => setShowEduModal(true)}
          style={{
            background: 'rgba(23, 54, 93, 0.5)',
            border: '1px solid rgba(53, 184, 232, 0.3)',
            color: 'var(--lake-blue, #35B8E8)',
            padding: '7px 12px',
            borderRadius: 'var(--radius-sm, 6px)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            marginTop: 'auto',
            marginLeft: 'auto'
          }}
        >
          <BookOpen size={13} />
          <span>Geographic Reference & Methodology</span>
        </button>
      </div>

      {/* Sampling Limitations Notice */}
      <div
        style={{
          backgroundColor: 'rgba(23, 54, 93, 0.45)',
          border: '1px solid rgba(53, 184, 232, 0.25)',
          borderRadius: 'var(--radius-sm, 6px)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '12.5px',
          color: 'var(--off-white, #EAF2FF)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)'
        }}
      >
        <Info size={16} style={{ color: 'var(--lake-blue, #35B8E8)', flexShrink: 0 }} />
        <span>
          <strong style={{ color: 'var(--lake-blue, #35B8E8)' }}>Geospatial Census & Exposure Limitation Notice:</strong> District choropleth colors and counts represent verified incidents recorded in the PostgreSQL data warehouse ({districtsSummary?.total_filtered_incidents?.toLocaleString() || 0} incidents under active filters across the 761,718 three-year census). Raw incident volumes must <strong>never</strong> be interpreted as neighborhood crime risk or crime rates without a population/exposure denominator. Block locations are anonymized to protect sensitive privacy.
        </span>
      </div>

      {/* Main Geospatial Intelligence Map & Inspector Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedDistrictProfile ? '1fr 380px' : '1fr',
        gap: '20px',
        alignItems: 'start'
      }}>
        {/* Interactive Chicago Leaflet Map */}
        <ChicagoAreaMap
          boundaries={boundaries}
          districtsSummary={districtsSummary}
          incidents={incidents}
          heatmapPoints={heatmapPoints}
          hotspots={hotspots}
          selectedDistrictId={selectedDistrictId}
          onSelectDistrict={(id) => setSelectedDistrictId(id)}
          areaIdA={areaIdA}
          areaIdB={areaIdB}
          loading={loadingMap}
        />

        {/* Selected District Tactical Inspector Panel */}
        {selectedDistrictProfile && (
          <DistrictDetailPanel
            profile={selectedDistrictProfile}
            onClose={() => setSelectedDistrictProfile(null)}
            onSetAreaA={() => setAreaIdA(selectedDistrictId)}
            onSetAreaB={() => setAreaIdB(selectedDistrictId)}
            isAreaA={String(areaIdA).trim() === String(selectedDistrictId).trim() || String(areaIdA).padStart(3, '0') === String(selectedDistrictId).trim()}
            isAreaB={String(areaIdB).trim() === String(selectedDistrictId).trim() || String(areaIdB).padStart(3, '0') === String(selectedDistrictId).trim()}
          />
        )}
      </div>

      {/* Side-by-Side Area Comparison Section */}
      <div style={{
        background: 'var(--bg-elevated, #101B2E)',
        border: '1px solid var(--border-subtle, rgba(53, 184, 232, 0.25))',
        borderRadius: 'var(--radius-md, 8px)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: 'var(--shadow-card)'
      }}>
        {/* Comparison Header & Selectors */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowRightLeft size={18} style={{ color: 'var(--lake-blue, #35B8E8)' }} />
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#EAF2FF' }}>
                Side-by-Side Area Intelligence Comparison
              </h2>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted, #7E92B0)' }}>
              Sample-normalized arithmetic comparisons (Percentage-Point Differences Δpp) between two administrative zones.
            </p>
          </div>

          {/* Granularity Switcher */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setGranularity('district')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                background: granularity === 'district' ? 'var(--river-blue, #17365D)' : 'transparent',
                color: granularity === 'district' ? 'var(--lake-blue, #35B8E8)' : 'var(--text-muted, #7E92B0)',
                border: `1px solid ${granularity === 'district' ? 'var(--lake-blue, #35B8E8)' : 'rgba(255,255,255,0.1)'}`
              }}
            >
              Police Districts
            </button>
            <button
              type="button"
              onClick={() => setGranularity('community_area')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                background: granularity === 'community_area' ? 'var(--river-blue, #17365D)' : 'transparent',
                color: granularity === 'community_area' ? 'var(--lake-blue, #35B8E8)' : 'var(--text-muted, #7E92B0)',
                border: `1px solid ${granularity === 'community_area' ? 'var(--lake-blue, #35B8E8)' : 'rgba(255,255,255,0.1)'}`
              }}
            >
              Community Areas
            </button>
          </div>
        </div>

        {/* Area A vs Area B Dropdowns & Swap Control */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'center' }}>
          {/* Area A Selector */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#818cf8', display: 'block', marginBottom: '6px' }}>
              Area A ({granularity === 'district' ? 'Police District' : 'Community Area'}):
            </label>
            <select
              value={areaIdA}
              onChange={(e) => setAreaIdA(e.target.value)}
              className="filter-select"
              style={{ width: '100%', borderColor: '#818cf8', color: '#EAF2FF' }}
            >
              {areaList.map((a) => (
                <option key={a.area_id} value={a.area_id}>
                  {a.label} ({a.total_incidents.toLocaleString()} incidents — {a.share_pct}%)
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <div style={{ paddingTop: '18px' }}>
            <button
              type="button"
              onClick={handleSwap}
              title="Swap Area A and Area B"
              style={{
                background: 'rgba(23, 54, 93, 0.5)',
                border: '1px solid rgba(53, 184, 232, 0.3)',
                color: 'var(--lake-blue, #35B8E8)',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 600
              }}
            >
              <ArrowRightLeft size={14} />
              <span>Swap</span>
            </button>
          </div>

          {/* Area B Selector */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--lake-blue, #35B8E8)', display: 'block', marginBottom: '6px' }}>
              Area B ({granularity === 'district' ? 'Police District' : 'Community Area'}):
            </label>
            <select
              value={areaIdB}
              onChange={(e) => setAreaIdB(e.target.value)}
              className="filter-select"
              style={{ width: '100%', borderColor: 'var(--lake-blue, #35B8E8)', color: '#EAF2FF' }}
            >
              {areaList.map((a) => (
                <option key={a.area_id} value={a.area_id}>
                  {a.label} ({a.total_incidents.toLocaleString()} incidents — {a.share_pct}%)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Side-by-Side Area Overview KPI Cards */}
        {compareResult && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {/* Area A KPI Card */}
            <div style={{
              background: 'rgba(23, 54, 93, 0.35)',
              border: '1px solid rgba(129, 140, 248, 0.4)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#818cf8' }} />
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>
                    {compareResult.area_a.area_label}
                  </h3>
                </div>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#818cf8', background: 'rgba(129, 140, 248, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                  {compareResult.area_a.kpi.dataset_share_pct}% of Census
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '11px' }}>
                <div style={{ background: 'rgba(11, 20, 35, 0.5)', padding: '8px', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted, #7E92B0)', display: 'block' }}>Incidents</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: '#FFFFFF' }}>
                    {compareResult.area_a.kpi.total_incidents.toLocaleString()}
                  </span>
                </div>
                <div style={{ background: 'rgba(11, 20, 35, 0.5)', padding: '8px', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted, #7E92B0)', display: 'block' }}>Arrest Rate</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: '#2EC4B6' }}>
                    {compareResult.area_a.kpi.arrest_pct}%
                  </span>
                </div>
                <div style={{ background: 'rgba(11, 20, 35, 0.5)', padding: '8px', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted, #7E92B0)', display: 'block' }}>Domestic</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: '#E76F74' }}>
                    {compareResult.area_a.kpi.domestic_pct}%
                  </span>
                </div>
                <div style={{ background: 'rgba(11, 20, 35, 0.5)', padding: '8px', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted, #7E92B0)', display: 'block' }}>Nighttime</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: '#35B8E8' }}>
                    {compareResult.area_a.kpi.night_pct}%
                  </span>
                </div>
              </div>

              {compareResult.area_a.kmeans_cluster && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #7E92B0)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Grid size={13} style={{ color: '#818cf8' }} />
                  <span>K-Means: <strong style={{ color: '#818cf8' }}>{compareResult.area_a.kmeans_cluster.cluster_label}</strong></span>
                </div>
              )}
            </div>

            {/* Area B KPI Card */}
            <div style={{
              background: 'rgba(23, 54, 93, 0.35)',
              border: '1px solid rgba(53, 184, 232, 0.4)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--lake-blue, #35B8E8)' }} />
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>
                    {compareResult.area_b.area_label}
                  </h3>
                </div>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--lake-blue, #35B8E8)', background: 'rgba(53, 184, 232, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                  {compareResult.area_b.kpi.dataset_share_pct}% of Census
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '11px' }}>
                <div style={{ background: 'rgba(11, 20, 35, 0.5)', padding: '8px', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted, #7E92B0)', display: 'block' }}>Incidents</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: '#FFFFFF' }}>
                    {compareResult.area_b.kpi.total_incidents.toLocaleString()}
                  </span>
                </div>
                <div style={{ background: 'rgba(11, 20, 35, 0.5)', padding: '8px', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted, #7E92B0)', display: 'block' }}>Arrest Rate</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: '#2EC4B6' }}>
                    {compareResult.area_b.kpi.arrest_pct}%
                  </span>
                </div>
                <div style={{ background: 'rgba(11, 20, 35, 0.5)', padding: '8px', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted, #7E92B0)', display: 'block' }}>Domestic</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: '#E76F74' }}>
                    {compareResult.area_b.kpi.domestic_pct}%
                  </span>
                </div>
                <div style={{ background: 'rgba(11, 20, 35, 0.5)', padding: '8px', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted, #7E92B0)', display: 'block' }}>Nighttime</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: '#35B8E8' }}>
                    {compareResult.area_b.kpi.night_pct}%
                  </span>
                </div>
              </div>

              {compareResult.area_b.kmeans_cluster && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #7E92B0)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Grid size={13} style={{ color: 'var(--lake-blue, #35B8E8)' }} />
                  <span>K-Means: <strong style={{ color: 'var(--lake-blue, #35B8E8)' }}>{compareResult.area_b.kmeans_cluster.cluster_label}</strong></span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Deterministic Scorecard Insights */}
        {compareResult && compareResult.insights && compareResult.insights.length > 0 && (
          <div style={{
            background: 'rgba(11, 20, 35, 0.6)',
            border: '1px solid rgba(53, 184, 232, 0.2)',
            borderRadius: '6px',
            padding: '14px'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--amber, #E9B44C)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Sparkles size={14} />
              <span>Evidence-Based Comparative Scorecard Insights</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
              {compareResult.insights.map((ins, i) => (
                <div key={i} style={{ fontSize: '11.5px', color: 'var(--off-white, #EAF2FF)', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <CheckCircle2 size={13} style={{ color: '#2EC4B6', flexShrink: 0, marginTop: '2px' }} />
                  <span>{ins}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts Grid: Category Composition & 24-Hr Hourly Distribution */}
        {compareResult && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
            {/* Category Composition Bar Chart */}
            <div className="chart-card">
              <div className="chart-header">
                <div className="chart-title">
                  <BarChart2 size={16} style={{ color: 'var(--lake-blue, #35B8E8)' }} />
                  <span>Crime Category Composition (% Share)</span>
                </div>
                <span className="chart-badge">Proportions</span>
              </div>
              <div style={{ height: '260px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compareResult.category_comparison.slice(0, 6)} margin={{ top: 10, right: 15, left: -10, bottom: 42 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="category" stroke="var(--text-dim, #5D728F)" fontSize={9} angle={-25} textAnchor="end" interval={0} height={40} />
                    <YAxis stroke="var(--text-dim, #5D728F)" fontSize={9} unit="%" />
                    <Tooltip
                      contentStyle={{ background: '#0B1423', borderColor: 'rgba(53, 184, 232, 0.3)', fontSize: '11px' }}
                      formatter={(val, name) => [`${val}%`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="pct_a" name={compareResult.area_a.area_label} fill="#818cf8" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="pct_b" name={compareResult.area_b.area_label} fill="#35B8E8" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 24-Hr Hourly Distribution Line Chart */}
            <div className="chart-card">
              <div className="chart-header">
                <div className="chart-title">
                  <TrendingUp size={16} style={{ color: 'var(--amber, #E9B44C)' }} />
                  <span>24-Hour Diurnal Distribution (% per Hour)</span>
                </div>
                <span className="chart-badge">Temporal Shift</span>
              </div>
              <div style={{ height: '260px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={compareResult.hourly_comparison} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="hour" stroke="var(--text-dim, #5D728F)" fontSize={9} formatter={(h) => `${h}h`} />
                    <YAxis stroke="var(--text-dim, #5D728F)" fontSize={9} unit="%" />
                    <Tooltip
                      contentStyle={{ background: '#0B1423', borderColor: 'rgba(53, 184, 232, 0.3)', fontSize: '11px' }}
                      labelFormatter={(h) => `Hour ${h}:00 - ${h}:59`}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey="pct_a" name={compareResult.area_a.area_label} stroke="#818cf8" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="pct_b" name={compareResult.area_b.area_label} stroke="#35B8E8" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Category Comparison Data Table */}
        {compareResult && (
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#EAF2FF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={14} style={{ color: 'var(--lake-blue, #35B8E8)' }} />
                <span>Full Offense Category Comparison Table</span>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted, #7E92B0)' }}>
                  ({filteredCategoryComparison.length} Categories)
                </span>
              </span>

              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={13} style={{ position: 'absolute', left: 9, top: 8, color: 'var(--text-dim, #5D728F)' }} />
                <input
                  type="text"
                  placeholder="Filter category..."
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '5px 10px 5px 28px',
                    fontSize: '11px',
                    background: 'rgba(11, 20, 35, 0.6)',
                    border: '1px solid rgba(53, 184, 232, 0.25)',
                    borderRadius: '6px',
                    color: '#EAF2FF'
                  }}
                />
              </div>
            </div>

            <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', minWidth: '180px' }}>Offense Category</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>{compareResult.area_a.area_label} Share (%)</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>{compareResult.area_b.area_label} Share (%)</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>Difference (Δpp)</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>Higher Share Area</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategoryComparison.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '8px 14px', fontWeight: 600, color: '#FFFFFF', minWidth: '180px' }}>{row.category}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#818cf8', whiteSpace: 'nowrap' }}>{row.pct_a}%</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--lake-blue, #35B8E8)', whiteSpace: 'nowrap' }}>{row.pct_b}%</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--amber, #E9B44C)', whiteSpace: 'nowrap' }}>
                        {row.diff_pp > 0 ? `+${row.diff_pp}` : row.diff_pp} pp
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 600,
                          background: row.dominant === 'Area A' ? 'rgba(129, 140, 248, 0.2)' : (row.dominant === 'Area B' ? 'rgba(53, 184, 232, 0.2)' : 'rgba(255,255,255,0.05)'),
                          color: row.dominant === 'Area A' ? '#818cf8' : (row.dominant === 'Area B' ? 'var(--lake-blue, #35B8E8)' : 'var(--text-muted, #7E92B0)')
                        }}>
                          {row.dominant === 'Area A' ? compareResult.area_a.area_label : (row.dominant === 'Area B' ? compareResult.area_b.area_label : 'Equal')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Educational & Geographic Methodology Modal */}
      {showEduModal && explanationData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(11, 20, 35, 0.85)',
          backdropFilter: 'blur(6px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-elevated, #101B2E)',
            border: '1px solid var(--border-subtle, rgba(53, 184, 232, 0.35))',
            borderRadius: '10px',
            maxWidth: '750px',
            width: '100%',
            maxHeight: '85vh',
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            color: '#EAF2FF'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={18} style={{ color: 'var(--lake-blue, #35B8E8)' }} />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#EAF2FF' }}>
                  {explanationData.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEduModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted, #7E92B0)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Geographic Source & CRS Documentation */}
            <div style={{ background: 'rgba(53, 184, 232, 0.1)', border: '1px solid rgba(53, 184, 232, 0.25)', borderRadius: '6px', padding: '12px', fontSize: '11.5px' }}>
              <div style={{ fontWeight: 700, color: 'var(--lake-blue, #35B8E8)', marginBottom: '4px' }}>
                Official Geographic Boundary Specification
              </div>
              <div><strong>Source:</strong> City of Chicago Open Data Portal (Dataset: Boundaries - Police Districts, ID: 4dt9-88ua)</div>
              <div><strong>Source Coordinate Reference System:</strong> NAD 1983 StatePlane Illinois East FIPS 1201 Feet (EPSG:3435)</div>
              <div><strong>Target Web CRS:</strong> WGS 84 (EPSG:4326) / Leaflet Web Mercator (EPSG:3857)</div>
              <div><strong>Polygon Geometry:</strong> 22 official active Chicago Police Department district sectors</div>
            </div>

            {/* Non-Causality & Denominator Warning */}
            <div style={{ background: 'rgba(231, 111, 116, 0.1)', border: '1px solid rgba(231, 111, 116, 0.25)', borderRadius: '6px', padding: '12px', fontSize: '11.5px' }}>
              <div style={{ fontWeight: 700, color: '#E76F74', marginBottom: '4px' }}>
                Statistical Limitations & Non-Causality Note
              </div>
              <p style={{ margin: 0, lineHeight: 1.5 }}>{explanationData.non_causality_note}</p>
            </div>

            {/* Theoretical Concepts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
              {explanationData.concepts.map((concept, idx) => (
                <div key={idx} style={{ background: 'rgba(23, 54, 93, 0.35)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '11.5px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--lake-blue, #35B8E8)', marginBottom: '4px' }}>
                    {concept.term}
                  </div>
                  {concept.formula && (
                    <div style={{ fontFamily: 'monospace', background: 'rgba(11, 20, 35, 0.6)', padding: '4px 6px', borderRadius: '4px', color: 'var(--amber, #E9B44C)', marginBottom: '4px' }}>
                      {concept.formula}
                    </div>
                  )}
                  <p style={{ margin: 0, color: 'var(--text-muted, #7E92B0)', lineHeight: 1.4 }}>
                    {concept.definition}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'right', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
              <button
                type="button"
                onClick={() => setShowEduModal(false)}
                style={{
                  background: 'var(--lake-blue, #35B8E8)',
                  color: '#0B1423',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close Documentation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}