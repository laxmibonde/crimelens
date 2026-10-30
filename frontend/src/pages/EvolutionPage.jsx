import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  History,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Sliders,
  Filter,
  MapPin,
  Flame,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Info,
  HelpCircle,
  Clock,
  Sparkles,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Compass,
  BookOpen
} from 'lucide-react';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend
} from 'recharts';

import ChicagoSkylineHeader from '../components/ChicagoSkylineHeader';
import SynchronizedDualMap, { getClassificationColor } from '../components/SynchronizedDualMap';
import EvolutionSummaryCards from '../components/EvolutionSummaryCards';
import EvolutionDetailDrawer from '../components/EvolutionDetailDrawer';
import EvolutionCharts from '../components/EvolutionCharts';

import {
  fetchTimelineMetadata,
  fetchTimelineSingleFrame,
  fetchTimelineFrames,
  fetchTimelineCompare,
  fetchTimelineTrends,
  fetchDashboardFilters
} from '../services/api';

import { useDataset } from '../context/DatasetContext';

export const MONTH_OPTIONS = [
  { month: 1, name: 'January' },
  { month: 2, name: 'February' },
  { month: 3, name: 'March' },
  { month: 4, name: 'April' },
  { month: 5, name: 'May' },
  { month: 6, name: 'June' },
  { month: 7, name: 'July' },
  { month: 8, name: 'August' },
  { month: 9, name: 'September' },
  { month: 10, name: 'October' },
  { month: 11, name: 'November' },
  { month: 12, name: 'December' }
];

export const TIMELINE_PERIODS = [];
for (let y = 2023; y <= 2025; y++) {
  for (let m = 1; m <= 12; m++) {
    const monthName = MONTH_OPTIONS[m - 1].name;
    TIMELINE_PERIODS.push({
      year: y,
      month: m,
      month_name: monthName,
      year_month: `${y}-${String(m).padStart(2, '0')}`,
      label: `${monthName} ${y}`
    });
  }
}

export default function EvolutionPage() {
  const { dataset, isSynthetic } = useDataset();

  // Navigation Tabs: 'comparison' (Default) | 'animation' | 'trends'
  const [activeTab, setActiveTab] = useState('comparison');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Metadata & Filters
  const [meta, setMeta] = useState(null);
  const [filterOptions, setFilterOptions] = useState(null);

  // DBSCAN Parameter Lab (Selected UI State)
  const [epsMeters, setEpsMeters] = useState(300);
  const [minSamples, setMinSamples] = useState(15);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Spatial Comparison Selected UI State
  const [selectedPeriodA, setSelectedPeriodA] = useState({ year: 2023, month: 1 });
  const [selectedPeriodB, setSelectedPeriodB] = useState({ year: 2024, month: 1 });

  // Applied Parameters (Strictly tracks the parameters of the currently displayed analysis)
  const [appliedPeriodA, setAppliedPeriodA] = useState({ year: 2023, month: 1 });
  const [appliedPeriodB, setAppliedPeriodB] = useState({ year: 2024, month: 1 });
  const [appliedEps, setAppliedEps] = useState(300);
  const [appliedMinSamples, setAppliedMinSamples] = useState(15);
  const [appliedDistrict, setAppliedDistrict] = useState('');
  const [appliedCategory, setAppliedCategory] = useState('');

  const [compareData, setCompareData] = useState(null);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  // Initial mount ref to run comparison once on mount
  const initialMountRef = useRef(false);

  // Check if user has changed UI controls without executing/applying
  const hasUnappliedChanges = useMemo(() => {
    return (
      selectedPeriodA.year !== appliedPeriodA.year ||
      selectedPeriodA.month !== appliedPeriodA.month ||
      selectedPeriodB.year !== appliedPeriodB.year ||
      selectedPeriodB.month !== appliedPeriodB.month ||
      epsMeters !== appliedEps ||
      minSamples !== appliedMinSamples ||
      selectedDistrict !== appliedDistrict ||
      selectedCategory !== appliedCategory
    );
  }, [
    selectedPeriodA, appliedPeriodA,
    selectedPeriodB, appliedPeriodB,
    epsMeters, appliedEps,
    minSamples, appliedMinSamples,
    selectedDistrict, appliedDistrict,
    selectedCategory, appliedCategory
  ]);

  // Table Filtering, Sorting & Pagination State
  const [tableSearch, setTableSearch] = useState('');
  const [filterClassification, setFilterClassification] = useState('ALL');
  const [filterMinVolume, setFilterMinVolume] = useState(0);
  const [filterMaxDistance, setFilterMaxDistance] = useState('ALL');
  const [sortField, setSortField] = useState('displacement'); // 'displacement' | 'volume_change' | 'count_a' | 'count_b'
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Animation State - Incremental Single Frame Loading & Cache
  const [framesCache, setFramesCache] = useState({});
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const [loadingFrame, setLoadingFrame] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const timerRef = useRef(null);
  const fetchingRef = useRef({});

  // Trends State - High Speed 36-Month SQL Date Aggregation
  const [trendData, setTrendData] = useState(null);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [trendElapsedMs, setTrendElapsedMs] = useState(null);
  const [trendError, setTrendError] = useState(null);

  // Methodology Modal State
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Load Metadata & Filter options
  useEffect(() => {
    async function init() {
      try {
        const [metaRes, filtersRes] = await Promise.all([
          fetchTimelineMetadata(),
          fetchDashboardFilters(dataset)
        ]);
        setMeta(metaRes);
        setFilterOptions(filtersRes);
      } catch (err) {
        console.error('Metadata init failed:', err);
      }
    }
    init();
  }, [dataset]);

  // Load Comparison Data with explicit parameters
  const loadComparison = async (
    pA = selectedPeriodA,
    pB = selectedPeriodB,
    eps = epsMeters,
    minSamp = minSamples,
    district = selectedDistrict,
    category = selectedCategory
  ) => {
    setLoadingCompare(true);
    setError(null);
    try {
      const activeFilters = {};
      if (district) activeFilters.district = district;
      if (category) activeFilters.primary_type = category;

      const res = await fetchTimelineCompare({
        period_a: pA,
        period_b: pB,
        eps_meters: eps,
        min_samples: minSamp,
        filters: activeFilters,
        dataset
      });
      setCompareData(res);
      setAppliedPeriodA({ ...pA });
      setAppliedPeriodB({ ...pB });
      setAppliedEps(eps);
      setAppliedMinSamples(minSamp);
      setAppliedDistrict(district);
      setAppliedCategory(category);

      if (res.spatial_matches && res.spatial_matches.length > 0) {
        setSelectedMatch(res.spatial_matches[0]);
      } else {
        setSelectedMatch(null);
      }
    } catch (err) {
      console.error('Comparison fetch failed:', err);
      setError('Failed to compute spatial cluster matching.');
    } finally {
      setLoadingCompare(false);
      setLoading(false);
    }
  };

  // Run comparison on initial mount or when switching dataset
  useEffect(() => {
    loadComparison(
      { year: 2023, month: 1 },
      { year: 2024, month: 1 },
      300,
      15,
      '',
      ''
    );
  }, [dataset]);

  const handleApplyParameters = () => {
    loadComparison(
      selectedPeriodA,
      selectedPeriodB,
      epsMeters,
      minSamples,
      selectedDistrict,
      selectedCategory
    );
  };

  // On-demand single frame loader with memoized cache
  const loadSingleFrame = async (idx) => {
    if (idx < 0 || idx >= TIMELINE_PERIODS.length) return;
    const period = TIMELINE_PERIODS[idx];
    const cacheKey = `${dataset}_${appliedEps}_${appliedMinSamples}_${selectedDistrict}_${selectedCategory}_${period.year_month}`;

    if (framesCache[cacheKey]) {
      return framesCache[cacheKey];
    }
    if (fetchingRef.current[cacheKey]) {
      return fetchingRef.current[cacheKey];
    }

    const activeFilters = {};
    if (selectedDistrict) activeFilters.district = selectedDistrict;
    if (selectedCategory) activeFilters.primary_type = selectedCategory;

    setLoadingFrame(true);
    const promise = fetchTimelineSingleFrame({
      year: period.year,
      month: period.month,
      eps_meters: appliedEps,
      min_samples: appliedMinSamples,
      filters: activeFilters,
      dataset
    })
      .then((frame) => {
        setFramesCache((prev) => ({ ...prev, [cacheKey]: frame }));
        return frame;
      })
      .catch((err) => {
        console.error('Single frame fetch error for', period.year_month, err);
        return null;
      })
      .finally(() => {
        setLoadingFrame(false);
        delete fetchingRef.current[cacheKey];
      });

    fetchingRef.current[cacheKey] = promise;
    return promise;
  };

  // Load active frame when timeline index changes or animation tab opened
  useEffect(() => {
    if (activeTab === 'animation') {
      loadSingleFrame(currentFrameIdx);
    }
  }, [activeTab, currentFrameIdx, dataset, appliedEps, appliedMinSamples, selectedDistrict, selectedCategory]);

  // Progressive background preloader for adjacent frames
  useEffect(() => {
    if (activeTab === 'animation' && !loadingFrame) {
      const nextIdx = currentFrameIdx + 1;
      if (nextIdx < TIMELINE_PERIODS.length) {
        const nextPeriod = TIMELINE_PERIODS[nextIdx];
        const nextKey = `${dataset}_${appliedEps}_${appliedMinSamples}_${selectedDistrict}_${selectedCategory}_${nextPeriod.year_month}`;
        if (!framesCache[nextKey] && !fetchingRef.current[nextKey]) {
          const activeFilters = {};
          if (selectedDistrict) activeFilters.district = selectedDistrict;
          if (selectedCategory) activeFilters.primary_type = selectedCategory;
          const p = fetchTimelineSingleFrame({
            year: nextPeriod.year,
            month: nextPeriod.month,
            eps_meters: appliedEps,
            min_samples: appliedMinSamples,
            filters: activeFilters,
            dataset
          }).then((frame) => {
            if (frame) setFramesCache((prev) => ({ ...prev, [nextKey]: frame }));
          }).catch(() => {}).finally(() => {
            delete fetchingRef.current[nextKey];
          });
          fetchingRef.current[nextKey] = p;
        }
      }
    }
  }, [activeTab, currentFrameIdx, loadingFrame, framesCache]);

  // Load Trends via Fast SQL Date Aggregation
  const loadTrends = async () => {
    setLoadingTrends(true);
    setTrendError(null);
    const t0 = performance.now();
    try {
      const activeFilters = {};
      if (selectedDistrict) activeFilters.district = selectedDistrict;
      if (selectedCategory) activeFilters.primary_type = selectedCategory;

      const res = await fetchTimelineTrends(appliedEps, appliedMinSamples, activeFilters);
      setTrendData(res);
      setTrendElapsedMs(Math.round(performance.now() - t0));
    } catch (err) {
      console.error(err);
      setTrendError('Failed to load 36-month temporal trends from database.');
    } finally {
      setLoadingTrends(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'trends') {
      loadTrends();
    }
  }, [activeTab, dataset, appliedEps, appliedMinSamples, selectedDistrict, selectedCategory]);

  // Animation playback loop
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(400, 1500 / playbackSpeed);
      timerRef.current = setInterval(() => {
        setCurrentFrameIdx((prev) => {
          if (prev >= TIMELINE_PERIODS.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  // Filtered & Sorted Table Rows
  const filteredMatches = useMemo(() => {
    if (!compareData || !compareData.spatial_matches) return [];

    let list = [...compareData.spatial_matches];

    // Classification filter
    if (filterClassification !== 'ALL') {
      list = list.filter((m) => m.match_classification === filterClassification);
    }

    // Min volume filter
    if (filterMinVolume > 0) {
      list = list.filter((m) => (m.period_a_count || 0) >= filterMinVolume || (m.period_b_count || 0) >= filterMinVolume);
    }

    // Max distance filter
    if (filterMaxDistance !== 'ALL') {
      const maxDist = parseFloat(filterMaxDistance);
      list = list.filter((m) => m.centroid_distance_meters !== null && m.centroid_distance_meters <= maxDist);
    }

    // Text search
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      list = list.filter((m) =>
        (m.period_a_label && m.period_a_label.toLowerCase().includes(q)) ||
        (m.period_b_label && m.period_b_label.toLowerCase().includes(q)) ||
        (m.explanation && m.explanation.toLowerCase().includes(q)) ||
        (m.period_a_dominant_crime && m.period_a_dominant_crime.toLowerCase().includes(q)) ||
        (m.period_b_dominant_crime && m.period_b_dominant_crime.toLowerCase().includes(q))
      );
    }

    // Sorting
    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortField === 'displacement') {
        valA = a.centroid_distance_meters !== null ? a.centroid_distance_meters : 999999;
        valB = b.centroid_distance_meters !== null ? b.centroid_distance_meters : 999999;
      } else if (sortField === 'volume_change') {
        valA = a.volume_change || 0;
        valB = b.volume_change || 0;
      } else if (sortField === 'count_a') {
        valA = a.period_a_count || 0;
        valB = b.period_a_count || 0;
      } else if (sortField === 'count_b') {
        valA = a.period_b_count || 0;
        valB = b.period_b_count || 0;
      }

      return sortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [compareData, filterClassification, filterMinVolume, filterMaxDistance, tableSearch, sortField, sortAsc]);

  // Paginated Rows
  const totalPages = Math.ceil(filteredMatches.length / pageSize) || 1;
  const paginatedMatches = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredMatches.slice(start, start + pageSize);
  }, [filteredMatches, page, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const monthNames = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const selectedPeriodALabel = `${monthNames[selectedPeriodA.month] || selectedPeriodA.month} ${selectedPeriodA.year}`;
  const selectedPeriodBLabel = `${monthNames[selectedPeriodB.month] || selectedPeriodB.month} ${selectedPeriodB.year}`;

  const periodALabel = compareData?.period_a?.label || `${monthNames[appliedPeriodA.month] || appliedPeriodA.month} ${appliedPeriodA.year}`;
  const periodBLabel = compareData?.period_b?.label || `${monthNames[appliedPeriodB.month] || appliedPeriodB.month} ${appliedPeriodB.year}`;

  const currentPeriod = TIMELINE_PERIODS[currentFrameIdx] || TIMELINE_PERIODS[0];
  const currentCacheKey = `${dataset}_${appliedEps}_${appliedMinSamples}_${selectedDistrict}_${selectedCategory}_${currentPeriod.year_month}`;
  const currentFrame = framesCache[currentCacheKey] || null;
  const cachedFramesCount = Object.keys(framesCache).filter(k => k.startsWith(`${dataset}_${appliedEps}_${appliedMinSamples}_`)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Chicago Skyline Header */}
      <ChicagoSkylineHeader
        title="Hotspot Evolution & Spatial Comparison Workstation"
        subtitle="Dual-period synchronized geospatial DBSCAN analysis and bipartite centroid matching"
        badgeText={isSynthetic ? "SYNTHETIC WAREHOUSE DEMO" : "CHICAGO HISTORICAL WAREHOUSE"}
      />

      {/* Main Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('comparison')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'comparison' ? 'var(--river-blue, #17365D)' : 'transparent',
            color: activeTab === 'comparison' ? 'var(--lake-blue, #35B8E8)' : 'var(--text-muted, #7E92B0)',
            border: `1px solid ${activeTab === 'comparison' ? 'var(--lake-blue, #35B8E8)' : 'rgba(255,255,255,0.1)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <ArrowRightLeft size={14} />
          <span>Spatial Comparison Workstation</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('animation')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'animation' ? 'var(--river-blue, #17365D)' : 'transparent',
            color: activeTab === 'animation' ? 'var(--lake-blue, #35B8E8)' : 'var(--text-muted, #7E92B0)',
            border: `1px solid ${activeTab === 'animation' ? 'var(--lake-blue, #35B8E8)' : 'rgba(255,255,255,0.1)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Play size={14} />
          <span>Timeline Animation Player</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('trends')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'trends' ? 'var(--river-blue, #17365D)' : 'transparent',
            color: activeTab === 'trends' ? 'var(--lake-blue, #35B8E8)' : 'var(--text-muted, #7E92B0)',
            border: `1px solid ${activeTab === 'trends' ? 'var(--lake-blue, #35B8E8)' : 'rgba(255,255,255,0.1)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <TrendingUp size={14} />
          <span>36-Month Temporal Trends (2023–2025)</span>
        </button>

        {/* Audit & Methodology Modal Button */}
        <button
          type="button"
          onClick={() => setShowAuditModal(true)}
          style={{
            padding: '8px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            background: 'rgba(23, 54, 93, 0.4)',
            color: 'var(--amber, #E9B44C)',
            border: '1px solid rgba(233, 180, 76, 0.3)',
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <BookOpen size={14} />
          <span>Matching Methodology & Audit</span>
        </button>
      </div>

      {/* Global Filter & DBSCAN Parameter Lab Bar */}
      <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
        <div className="filter-bar-header">
          <Sliders size={16} style={{ color: 'var(--lake-blue, #35B8E8)' }} />
          <span>DBSCAN & Period Controls</span>
        </div>

        {/* Period A Selectors */}
        <div className="filter-group">
          <label className="filter-label" style={{ color: '#818cf8' }}>Period A (Baseline)</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            <select
              className="filter-select"
              value={selectedPeriodA.year}
              onChange={(e) => setSelectedPeriodA({ ...selectedPeriodA, year: parseInt(e.target.value, 10) })}
            >
              <option value={2023}>2023</option>
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
            </select>
            <select
              className="filter-select"
              value={selectedPeriodA.month}
              onChange={(e) => setSelectedPeriodA({ ...selectedPeriodA, month: parseInt(e.target.value, 10) })}
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.month} value={m.month}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Period B Selectors */}
        <div className="filter-group">
          <label className="filter-label" style={{ color: 'var(--lake-blue, #35B8E8)' }}>Period B (Comparison)</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            <select
              className="filter-select"
              value={selectedPeriodB.year}
              onChange={(e) => setSelectedPeriodB({ ...selectedPeriodB, year: parseInt(e.target.value, 10) })}
            >
              <option value={2023}>2023</option>
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
            </select>
            <select
              className="filter-select"
              value={selectedPeriodB.month}
              onChange={(e) => setSelectedPeriodB({ ...selectedPeriodB, month: parseInt(e.target.value, 10) })}
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.month} value={m.month}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* DBSCAN Eps Threshold */}
        <div className="filter-group">
          <label className="filter-label">Eps Radius (m): {epsMeters}m</label>
          <input
            type="range"
            min="100"
            max="1000"
            step="50"
            value={epsMeters}
            onChange={(e) => setEpsMeters(parseInt(e.target.value, 10))}
            style={{ accentColor: 'var(--lake-blue, #35B8E8)', width: '130px' }}
          />
        </div>

        {/* DBSCAN MinSamples */}
        <div className="filter-group">
          <label className="filter-label">Min Core Samples: {minSamples}</label>
          <input
            type="range"
            min="3"
            max="30"
            step="1"
            value={minSamples}
            onChange={(e) => setMinSamples(parseInt(e.target.value, 10))}
            style={{ accentColor: 'var(--amber, #E9B44C)', width: '110px' }}
          />
        </div>

        {/* Filter by Police District */}
        <div className="filter-group">
          <label className="filter-label">Police District</label>
          <select
            className="filter-select"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
          >
            <option value="">All Districts</option>
            {filterOptions?.districts?.map((d) => (
              <option key={d} value={d}>District {String(d).padStart(3, '0')}</option>
            ))}
          </select>
        </div>

        {/* Filter by Crime Category */}
        <div className="filter-group">
          <label className="filter-label">IUCR Offense</label>
          <select
            className="filter-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {filterOptions?.crime_types?.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Execute / Apply Comparison Action Button */}
        <button
          type="button"
          onClick={handleApplyParameters}
          disabled={loadingCompare}
          style={{
            background: hasUnappliedChanges ? 'var(--amber, #E9B44C)' : 'var(--lake-blue, #35B8E8)',
            color: '#0B1423',
            border: 'none',
            padding: '7px 16px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: loadingCompare ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: 'auto',
            boxShadow: hasUnappliedChanges ? '0 0 12px rgba(233, 180, 76, 0.4)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          {loadingCompare ? (
            <RotateCcw size={13} className="spin" />
          ) : (
            <Play size={13} />
          )}
          <span>{hasUnappliedChanges ? 'Execute / Apply Comparison' : 'Re-run Comparison'}</span>
        </button>

        {/* Preset Shortcuts */}
        <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
          <button
            type="button"
            onClick={() => {
              const pA = { year: 2023, month: 1 };
              const pB = { year: 2024, month: 1 };
              setSelectedPeriodA(pA);
              setSelectedPeriodB(pB);
              setEpsMeters(300);
              setMinSamples(15);
              setSelectedDistrict('');
              setSelectedCategory('');
              loadComparison(pA, pB, 300, 15, '', '');
            }}
            style={{
              background: 'rgba(23, 54, 93, 0.5)',
              color: '#34d399',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              padding: '7px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 600
            }}
            title="Baseline: Jan 2023 vs Jan 2024, eps=300m, min_samples=15"
          >
            ⚡ Baseline (Jan 23 vs 24)
          </button>

          <button
            type="button"
            onClick={() => {
              const pA = { year: 2023, month: 7 };
              const pB = { year: 2024, month: 7 };
              setSelectedPeriodA(pA);
              setSelectedPeriodB(pB);
              setEpsMeters(300);
              setMinSamples(15);
              setSelectedDistrict('');
              setSelectedCategory('');
              loadComparison(pA, pB, 300, 15, '', '');
            }}
            style={{
              background: 'rgba(23, 54, 93, 0.5)',
              color: 'var(--lake-blue, #35B8E8)',
              border: '1px solid rgba(53, 184, 232, 0.3)',
              padding: '7px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 600
            }}
            title="Summer: Jul 2023 vs Jul 2024, eps=300m, min_samples=15"
          >
            ⚡ Summer (Jul 23 vs 24)
          </button>
        </div>
      </div>

      {/* Unapplied Changes Alert Banner */}
      {hasUnappliedChanges && (
        <div style={{
          backgroundColor: 'rgba(234, 179, 8, 0.1)',
          border: '1px solid rgba(234, 179, 8, 0.4)',
          borderRadius: '8px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          color: '#fbbf24',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} style={{ color: '#fbbf24', flexShrink: 0 }} />
            <div>
              <strong style={{ color: '#fef08a' }}>Changes not applied:</strong> You modified selection parameters ({selectedPeriodALabel} vs {selectedPeriodBLabel}, &epsilon;={epsMeters}m, MinPts={minSamples}).
              Currently displaying analysis for <strong style={{ color: '#fff' }}>{periodALabel} vs {periodBLabel}</strong>.
            </div>
          </div>
          <button
            type="button"
            onClick={handleApplyParameters}
            disabled={loadingCompare}
            style={{
              background: '#eab308',
              color: '#08101c',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Play size={13} />
            <span>Execute Analysis</span>
          </button>
        </div>
      )}

      {/* Sampling Limitation Caveat Requirement 9 */}
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
          <strong style={{ color: 'var(--lake-blue, #35B8E8)' }}>Essential Spatial Matching Distinction:</strong> The matching pipeline identifies geographic centroid proximity between statistical DBSCAN clusters (&le; 300m for matched, 300m - 500m for uncertain). Proximity reflects localized recurrence in recorded warehouse incidents and does <strong>not</strong> prove that the same individual actors, criminal network, or specific ongoing criminal enterprise persisted across time.
        </span>
      </div>

      {/* TAB 1: VISUAL SPATIAL COMPARISON WORKSTATION */}
      {activeTab === 'comparison' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Summary Cards */}
          <EvolutionSummaryCards
            summary={compareData?.classification_summary}
            comparisonMetrics={compareData?.comparison_metrics}
            periodALabel={periodALabel}
            periodBLabel={periodBLabel}
          />

          {/* Synchronized Dual Chicago Maps */}
          <SynchronizedDualMap
            periodALabel={periodALabel}
            periodBLabel={periodBLabel}
            clustersA={compareData?.frame_a?.clusters || []}
            clustersB={compareData?.frame_b?.clusters || []}
            spatialMatches={compareData?.spatial_matches || []}
            selectedMatch={selectedMatch}
            onSelectMatch={(m) => setSelectedMatch(m)}
          />

          {/* Cluster Size & Displacement Visual Charts */}
          <EvolutionCharts
            matches={compareData?.spatial_matches || []}
            periodALabel={periodALabel}
            periodBLabel={periodBLabel}
          />

          {/* Searchable, Sortable, Paginated Results Table */}
          <div style={{
            background: 'var(--bg-elevated, #101B2E)',
            border: '1px solid var(--border-subtle, rgba(53, 184, 232, 0.25))',
            borderRadius: '8px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'var(--shadow-card)'
          }}>
            {/* Table Controls Header */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              paddingBottom: '14px'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#EAF2FF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} style={{ color: 'var(--amber, #E9B44C)' }} />
                  <span>Bipartite Cluster Matching & Trajectory Results</span>
                </h3>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted, #7E92B0)' }}>
                  Showing {filteredMatches.length} cluster comparisons (1-to-1 optimal nearest neighbor)
                </span>
              </div>

              {/* Table Filters */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                {/* Search Text Box */}
                <div style={{ position: 'relative', width: '200px' }}>
                  <Search size={13} style={{ position: 'absolute', left: 8, top: 8, color: 'var(--text-dim, #5D728F)' }} />
                  <input
                    type="text"
                    placeholder="Search cluster or crime..."
                    value={tableSearch}
                    onChange={(e) => { setTableSearch(e.target.value); setPage(1); }}
                    style={{
                      width: '100%',
                      padding: '5px 8px 5px 26px',
                      fontSize: '11px',
                      background: 'rgba(11, 20, 35, 0.6)',
                      border: '1px solid rgba(53, 184, 232, 0.25)',
                      borderRadius: '6px',
                      color: '#EAF2FF'
                    }}
                  />
                </div>

                {/* Classification Filter */}
                <select
                  value={filterClassification}
                  onChange={(e) => { setFilterClassification(e.target.value); setPage(1); }}
                  className="filter-select"
                  style={{ fontSize: '11px', padding: '5px 8px' }}
                >
                  <option value="ALL">All Classifications</option>
                  <option value="SPATIALLY_MATCHED">Spatially Matched (≤300m)</option>
                  <option value="UNCERTAIN_MATCH">Uncertain Match (300-500m)</option>
                  <option value="NEWLY_OBSERVED">Newly Observed (Period B)</option>
                  <option value="NO_LONGER_OBSERVED">No Longer Observed (Period A)</option>
                </select>

                {/* Max Displacement Filter */}
                <select
                  value={filterMaxDistance}
                  onChange={(e) => { setFilterMaxDistance(e.target.value); setPage(1); }}
                  className="filter-select"
                  style={{ fontSize: '11px', padding: '5px 8px' }}
                >
                  <option value="ALL">All Displacements</option>
                  <option value="100">&lt; 100m Displacement</option>
                  <option value="300">&lt; 300m Displacement</option>
                  <option value="500">&lt; 500m Displacement</option>
                </select>

                {/* Page Size */}
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}
                  className="filter-select"
                  style={{ fontSize: '11px', padding: '5px 8px' }}
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
            </div>

            {/* Results Table */}
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Match ID</th>
                    <th onClick={() => handleSort('count_a')} style={{ cursor: 'pointer' }}>
                      Period A ({periodALabel}) {sortField === 'count_a' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th onClick={() => handleSort('count_b')} style={{ cursor: 'pointer' }}>
                      Period B ({periodBLabel}) {sortField === 'count_b' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th onClick={() => handleSort('displacement')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                      Displacement (m) {sortField === 'displacement' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th style={{ textAlign: 'center' }}>Match Classification</th>
                    <th onClick={() => handleSort('volume_change')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                      Volume Delta {sortField === 'volume_change' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th>Dominant Crime Types</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMatches.map((m, idx) => {
                    const color = getClassificationColor(m.match_classification);
                    const isSelected = selectedMatch && (
                      (selectedMatch.period_a_cluster_id !== null && selectedMatch.period_a_cluster_id === m.period_a_cluster_id) ||
                      (selectedMatch.period_b_cluster_id !== null && selectedMatch.period_b_cluster_id === m.period_b_cluster_id)
                    );

                    return (
                      <tr
                        key={m.match_id || idx}
                        style={{
                          background: isSelected ? 'rgba(53, 184, 232, 0.12)' : 'transparent',
                          cursor: 'pointer'
                        }}
                        onClick={() => setSelectedMatch(m)}
                      >
                        <td style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted, #7E92B0)' }}>
                          #{idx + 1 + (page - 1) * pageSize}
                        </td>
                        <td style={{ fontWeight: 600, color: '#818cf8' }}>
                          {m.period_a_cluster_id !== null ? (
                            <span>{m.period_a_label} <span style={{ fontFamily: 'monospace', color: '#EAF2FF' }}>({m.period_a_count})</span></span>
                          ) : (
                            <span style={{ color: 'var(--text-dim, #5D728F)' }}>None</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--lake-blue, #35B8E8)' }}>
                          {m.period_b_cluster_id !== null ? (
                            <span>{m.period_b_label} <span style={{ fontFamily: 'monospace', color: '#EAF2FF' }}>({m.period_b_count})</span></span>
                          ) : (
                            <span style={{ color: 'var(--text-dim, #5D728F)' }}>None</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--amber, #E9B44C)' }}>
                          {m.centroid_distance_meters !== null ? `${m.centroid_distance_meters}m` : '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '10px',
                            background: `${color}20`,
                            color: color,
                            border: `1px solid ${color}50`
                          }}>
                            {m.match_classification}
                          </span>
                        </td>
                        <td style={{
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: m.volume_change >= 0 ? 'var(--alert-red, #E76F74)' : '#2EC4B6'
                        }}>
                          {m.volume_change > 0 ? `+${m.volume_change}` : m.volume_change}
                          {m.volume_change_pct !== null && ` (${m.volume_change_pct > 0 ? `+${m.volume_change_pct}` : m.volume_change_pct}%)`}
                        </td>
                        <td style={{ fontSize: '11px', color: 'var(--text-muted, #7E92B0)' }}>
                          {m.period_a_dominant_crime !== 'N/A' && m.period_b_dominant_crime !== 'N/A'
                            ? `${m.period_a_dominant_crime} ➔ ${m.period_b_dominant_crime}`
                            : (m.period_a_dominant_crime !== 'N/A' ? m.period_a_dominant_crime : m.period_b_dominant_crime)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMatch(m);
                            }}
                            style={{
                              background: 'rgba(53, 184, 232, 0.2)',
                              border: '1px solid rgba(53, 184, 232, 0.4)',
                              color: 'var(--lake-blue, #35B8E8)',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {paginatedMatches.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim, #5D728F)' }}>
                        No cluster match records matching current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted, #7E92B0)' }}>
              <span>
                Page {page} of {totalPages} ({filteredMatches.length} total entries)
              </span>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: page <= 1 ? 'var(--text-dim, #5D728F)' : '#EAF2FF',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <ChevronLeft size={14} />
                  <span>Prev</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: page >= totalPages ? 'var(--text-dim, #5D728F)' : '#EAF2FF',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Slide-over Detail Drawer */}
          {selectedMatch && (
            <EvolutionDetailDrawer
              match={selectedMatch}
              periodALabel={periodALabel}
              periodBLabel={periodBLabel}
              onClose={() => setSelectedMatch(null)}
            />
          )}
        </div>
      )}

      {/* TAB 2: TIMELINE ANIMATION PLAYER */}
      {activeTab === 'animation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: isPlaying ? 'rgba(233, 180, 76, 0.2)' : 'var(--amber, #E9B44C)',
                    color: isPlaying ? 'var(--amber, #E9B44C)' : '#0B1423',
                    border: '1px solid var(--amber, #E9B44C)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  {isPlaying ? 'Pause' : 'Play Timeline'}
                </button>

                <button
                  type="button"
                  onClick={() => { setIsPlaying(false); setCurrentFrameIdx((prev) => Math.max(0, prev - 1)); }}
                  className="filter-button"
                  title="Previous Month"
                >
                  <SkipBack size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => { setIsPlaying(false); setCurrentFrameIdx((prev) => Math.min(TIMELINE_PERIODS.length - 1, prev + 1)); }}
                  className="filter-button"
                  title="Next Month"
                >
                  <SkipForward size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => { setIsPlaying(false); setCurrentFrameIdx(0); }}
                  className="filter-button"
                  title="Restart Animation"
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} style={{ color: 'var(--amber, #E9B44C)' }} />
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                  {currentFrame ? currentFrame.period.label : currentPeriod.label}
                </span>
                {loadingFrame ? (
                  <span style={{ fontSize: '0.8rem', padding: '3px 8px', borderRadius: '12px', backgroundColor: 'rgba(233, 180, 76, 0.15)', color: 'var(--amber, #E9B44C)', fontWeight: 600 }}>
                    Computing DBSCAN...
                  </span>
                ) : currentFrame ? (
                  <span style={{ fontSize: '0.8rem', padding: '3px 8px', borderRadius: '12px', backgroundColor: 'rgba(53, 184, 232, 0.15)', color: 'var(--lake-blue, #35B8E8)', fontWeight: 600 }}>
                    {currentFrame.eligible_incidents?.toLocaleString() || 0} incidents | {currentFrame.cluster_count} clusters
                  </span>
                ) : null}
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #7E92B0)' }}>
                  Cached: <strong style={{ color: '#EAF2FF' }}>{cachedFramesCount}</strong> / 36
                </span>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #7E92B0)', marginRight: '4px' }}>Speed:</span>
                  {[0.5, 1.0, 2.0, 4.0].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      className={`filter-button ${playbackSpeed === spd ? 'active' : ''}`}
                      onClick={() => setPlaybackSpeed(spd)}
                      style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <input
                type="range"
                min="0"
                max={TIMELINE_PERIODS.length - 1}
                value={currentFrameIdx}
                onChange={(e) => { setIsPlaying(false); setCurrentFrameIdx(parseInt(e.target.value, 10)); }}
                style={{ width: '100%', accentColor: 'var(--amber, #E9B44C)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted, #7E92B0)', marginTop: '4px' }}>
                <span>Jan 2023 (Frame 1)</span>
                <span>Dec 2023 (Frame 12)</span>
                <span>Dec 2024 (Frame 24)</span>
                <span>Dec 2025 (Frame 36)</span>
              </div>
            </div>
          </div>

          {/* Frame Analytical Details */}
          {currentFrame && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Frame Metric KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted, #7E92B0)', fontWeight: 600 }}>Active Period</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--lake-blue, #35B8E8)' }}>{currentFrame.period.label}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim, #5D728F)' }}>Frame {currentFrameIdx + 1} of {TIMELINE_PERIODS.length}</span>
                </div>
                <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted, #7E92B0)', fontWeight: 600 }}>Eligible Incidents</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#EAF2FF' }}>{currentFrame.eligible_incidents?.toLocaleString() || 0}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim, #5D728F)' }}>{currentFrame.excluded_incidents} excluded out-of-bounds</span>
                </div>
                <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted, #7E92B0)', fontWeight: 600 }}>DBSCAN Clusters</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--amber, #E9B44C)' }}>{currentFrame.cluster_count}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim, #5D728F)' }}>Eps={appliedEps}m, MinPts={appliedMinSamples}</span>
                </div>
                <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted, #7E92B0)', fontWeight: 600 }}>Clustered / Noise</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#2EC4B6' }}>{currentFrame.clustering_percentage}%</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim, #5D728F)' }}>{currentFrame.clustered_incident_count?.toLocaleString()} clustered, {currentFrame.noise_incident_count?.toLocaleString()} noise</span>
                </div>
                <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted, #7E92B0)', fontWeight: 600 }}>Largest Cluster</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--alert-red, #E76F74)' }}>{currentFrame.largest_cluster_size?.toLocaleString()}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim, #5D728F)' }}>Dense core concentration</span>
                </div>
              </div>

              {/* Top Discovered Clusters Grid */}
              <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#EAF2FF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Flame size={16} style={{ color: 'var(--amber, #E9B44C)' }} />
                    Discovered Hotspot Clusters for {currentFrame.period.label} ({currentFrame.clusters?.length || 0})
                  </h4>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted, #7E92B0)' }}>
                    Ranked by incident volume
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
                  {(currentFrame.clusters || []).slice(0, 15).map((cl) => (
                    <div
                      key={cl.cluster_id}
                      style={{
                        backgroundColor: 'rgba(23, 54, 93, 0.25)',
                        border: '1px solid rgba(53, 184, 232, 0.2)',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: 'var(--lake-blue, #35B8E8)', fontSize: '13px' }}>
                          {cl.cluster_label || `Cluster #${cl.cluster_id + 1}`}
                        </span>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--amber, #E9B44C)', background: 'rgba(233,180,76,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                          {cl.incident_count} incidents
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted, #7E92B0)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Centroid: {cl.centroid?.lat?.toFixed(4)}, {cl.centroid?.lon?.toFixed(4)}</span>
                        <span>{cl.dominant_crime || 'Mixed Crime'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: 36-MONTH TEMPORAL TRENDS */}
      {activeTab === 'trends' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loadingTrends ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: 'rgba(30, 41, 59, 0.4)', borderRadius: '12px', border: '1px solid rgba(53, 184, 232, 0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', border: '3px solid rgba(53, 184, 232, 0.2)', borderTop: '3px solid var(--lake-blue, #35B8E8)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span style={{ color: '#EAF2FF', fontSize: '14px', fontWeight: 600 }}>Aggregating 36-Month Warehouse Temporal Trends...</span>
              <span style={{ color: 'var(--text-muted, #7E92B0)', fontSize: '12px' }}>Executing high-speed SQL date aggregation across PostgreSQL star schema</span>
            </div>
          ) : trendError ? (
            <div style={{ padding: '30px', textAlign: 'center', backgroundColor: 'rgba(231, 111, 116, 0.1)', borderRadius: '12px', border: '1px solid rgba(231, 111, 116, 0.3)', color: 'var(--alert-red, #E76F74)' }}>
              {trendError}
            </div>
          ) : trendData?.trend_series ? (
            <>
              <div className="chart-card">
                <div className="chart-header">
                  <div className="chart-title">
                    <TrendingUp size={16} style={{ color: 'var(--lake-blue, #35B8E8)' }} />
                    <span>36-Month Recorded Incident, Enforcement & Clustered Trend (2023–2025)</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {trendElapsedMs && (
                      <span style={{ fontSize: '11px', color: '#2EC4B6', background: 'rgba(46, 196, 182, 0.15)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(46, 196, 182, 0.3)' }}>
                        SQL Aggregation: {trendElapsedMs} ms
                      </span>
                    )}
                    <span className="chart-badge">Time Series (36 Months)</span>
                  </div>
                </div>
                <div style={{ width: '100%', height: 360 }}>
                  <ResponsiveContainer>
                    <LineChart data={trendData.trend_series} margin={{ top: 10, right: 30, left: 10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="short_label" stroke="var(--text-dim, #5D728F)" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                      <YAxis stroke="var(--text-dim, #5D728F)" tick={{ fontSize: 11 }} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0B1423', borderColor: 'var(--lake-blue, #35B8E8)', borderRadius: '8px' }} />
                      <Legend />
                      <Line type="monotone" dataKey="incident_count" name="Total Recorded Incidents" stroke="#35B8E8" strokeWidth={3} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="clustered_count" name="DBSCAN Clustered Incidents" stroke="#E76F74" strokeWidth={2} />
                      <Line type="monotone" dataKey="arrest_count" name="Police Arrest Enforcement" stroke="#2EC4B6" strokeWidth={2} />
                      <Line type="monotone" dataKey="domestic_count" name="Domestic Incidents" stroke="#E9B44C" strokeWidth={2} strokeDasharray="4 4" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Trend Insights Cards */}
              {trendData.insights && trendData.insights.length > 0 && (
                <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--lake-blue, #35B8E8)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={15} style={{ color: 'var(--amber, #E9B44C)' }} />
                    Automated Longitudinal Warehouse Insights
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: 'var(--text-muted, #7E92B0)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {trendData.insights.map((ins, idx) => (
                      <li key={idx} style={{ color: '#EAF2FF' }}>{ins}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Methodology & Mathematical Audit Modal Requirement 10 */}
      {showAuditModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(11, 20, 35, 0.85)',
          backdropFilter: 'blur(6px)',
          zIndex: 3000,
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
                <ShieldCheck size={20} style={{ color: '#2EC4B6' }} />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#EAF2FF' }}>
                  Hotspot Evolution Matching Methodology & Data Audit
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted, #7E92B0)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', lineHeight: 1.5 }}>
              <div style={{ background: 'rgba(23, 54, 93, 0.35)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(53, 184, 232, 0.2)' }}>
                <strong style={{ color: 'var(--lake-blue, #35B8E8)' }}>1. Strict One-to-One Bipartite Matching:</strong>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted, #7E92B0)' }}>
                  Candidate pairs between Period A and Period B clusters are ordered by Haversine Great-Circle distance. Matches are greedily committed to the nearest unassigned counterpart, preventing collision errors where two clusters in Period A falsely share the same cluster in Period B.
                </p>
              </div>

              <div style={{ background: 'rgba(23, 54, 93, 0.35)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(53, 184, 232, 0.2)' }}>
                <strong style={{ color: 'var(--amber, #E9B44C)' }}>2. Mathematical Conservation Equation:</strong>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted, #7E92B0)' }}>
                  Total clusters in Period A are conserved as <code>N(A) = N(matched) + N(no longer observed)</code>. Total clusters in Period B are conserved as <code>N(B) = N(matched) + N(newly observed)</code>. Classification totals are verified on every query.
                </p>
              </div>

              <div style={{ background: 'rgba(231, 111, 116, 0.1)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(231, 111, 116, 0.3)' }}>
                <strong style={{ color: 'var(--alert-red, #E76F74)' }}>3. Non-Causality & Real-World Continuity Caveat:</strong>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted, #7E92B0)' }}>
                  Centroid matching is a spatial proximity metric, not proof of individual or criminal enterprise continuity. A cluster that persists spatially in nearby coordinates may be composed of entirely different incidents, crime types, or actors.
                </p>
              </div>

              <div style={{ background: 'rgba(23, 54, 93, 0.35)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(53, 184, 232, 0.2)' }}>
                <strong style={{ color: '#2EC4B6' }}>4. Distance Metric & Threshold Specifications:</strong>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted, #7E92B0)' }}>
                  Distances are computed on the WGS 84 ellipsoid using Great-Circle Haversine distance with mean Earth radius R = 6,371,008.8 meters. Matches with distance &le; 300m are classified as <code>SPATIALLY_MATCHED</code>; matches with 300m &lt; distance &le; 500m are classified as <code>UNCERTAIN_MATCH</code>.
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'right', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
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
                Close Audit Documentation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}