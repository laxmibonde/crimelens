import React, { useState, useEffect } from 'react';
import {
  Layers,
  ArrowUpDown,
  SlidersHorizontal,
  Table as TableIcon,
  RotateCcw,
  BarChart3,
  LineChart as LineIcon,
  ChevronRight,
  Info,
  RefreshCw,
  Filter,
  Grid,
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell
} from 'recharts';

import {
  fetchOLAPMetadata,
  fetchOLAPRollup,
  fetchOLAPSliceDice,
  fetchOLAPPivot
} from '../services/api';

import { useDataset } from '../context/DatasetContext';

const COLORS = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#34d399', '#fbbf24', '#f87171'];

export default function OLAPPage() {
  const { dataset, disclaimer, isSynthetic, config } = useDataset();
  const [mode, setMode] = useState('rollup'); // 'rollup' | 'slicedice' | 'pivot'
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Rollup & Drilldown State
  const [dimension, setDimension] = useState('year');
  const [drillPath, setDrillPath] = useState([]);
  const [filters, setFilters] = useState({});

  // Pivot State
  const [pivotRowDim, setPivotRowDim] = useState('district');
  const [pivotColDim, setPivotColDim] = useState('primary_type');

  // Display State
  const [viewType, setViewType] = useState('bar'); // 'bar' | 'line' | 'table' | 'pivot'
  const [olapResult, setOlapResult] = useState(null);
  const [pivotResult, setPivotResult] = useState(null);

  // Load Metadata on Mount or Dataset change
  useEffect(() => {
    async function loadMetadata() {
      try {
        const data = await fetchOLAPMetadata();
        setMeta(data);
      } catch (err) {
        setError(err.message || 'Failed to initialize OLAP metadata');
      }
    }
    loadMetadata();
  }, [dataset]);

  // Fetch OLAP Query whenever Mode, Dimension, Filters, Pivot Dims, or Dataset change
  useEffect(() => {
    async function executeOLAPQuery() {
      setLoading(true);
      setError(null);
      try {
        if (mode === 'pivot') {
          const res = await fetchOLAPPivot({
            row_dim: pivotRowDim,
            col_dim: pivotColDim,
            filters: filters,
            limit: 25
          });
          setPivotResult(res);
          setViewType('pivot');
        } else if (mode === 'slicedice') {
          const res = await fetchOLAPSliceDice({
            dimension: dimension,
            filters: filters,
            limit: 100
          });
          setOlapResult(res);
          if (viewType === 'pivot') setViewType('bar');
        } else {
          // Roll-up / Drill-down
          const res = await fetchOLAPRollup({
            dimension: dimension,
            filters: filters,
            limit: 100
          });
          setOlapResult(res);
          if (viewType === 'pivot') setViewType('bar');
        }
      } catch (err) {
        setError(err.message || 'OLAP Query Execution Failed');
      } finally {
        setLoading(false);
      }
    }

    executeOLAPQuery();
  }, [mode, dimension, filters, pivotRowDim, pivotColDim, dataset]);

  // Handle Interactive Table Row Click (Drill-Down Trigger)
  const handleRowDrillDown = (rowValue) => {
    if (!olapResult || !olapResult.child_dimension) return;

    const childDim = olapResult.child_dimension;
    const stepLabel = `${olapResult.dimension_label}: ${rowValue}`;

    // Add filter for current dimension
    let filterVal = rowValue;
    if (dimension === 'year' || dimension === 'month' || dimension === 'day' || dimension === 'hour') {
      const parsed = parseInt(rowValue, 10);
      if (!isNaN(parsed)) filterVal = parsed;
    }

    const newFilters = { ...filters, [dimension]: filterVal };
    const newPath = [...drillPath, { dimension, value: filterVal, label: stepLabel }];

    setDrillPath(newPath);
    setFilters(newFilters);
    setDimension(childDim);
  };

  // Handle Breadcrumb Jump
  const handleBreadcrumbClick = (index) => {
    if (index === -1) {
      // Reset to top level
      setDrillPath([]);
      setFilters({});
      setDimension('year');
      return;
    }

    const slicedPath = drillPath.slice(0, index + 1);
    const newFilters = {};
    slicedPath.forEach((step) => {
      newFilters[step.dimension] = step.value;
    });

    const lastStep = slicedPath[slicedPath.length - 1];
    // Next child dimension
    const nextDim = meta?.hierarchies?.time?.includes(lastStep.dimension)
      ? meta.hierarchies.time[meta.hierarchies.time.indexOf(lastStep.dimension) + 1] || lastStep.dimension
      : 'primary_type';

    setDrillPath(slicedPath);
    setFilters(newFilters);
    setDimension(nextDim);
  };

  // Handle Reset All
  const handleReset = () => {
    setDrillPath([]);
    setFilters({});
    setDimension('year');
    setPivotRowDim('district');
    setPivotColDim('primary_type');
    setMode('rollup');
    setViewType('bar');
  };

  // Swap Pivot Dimensions
  const handleSwapPivot = () => {
    const temp = pivotRowDim;
    setPivotRowDim(pivotColDim);
    setPivotColDim(temp);
  };

  // Safe filter change ensuring unselected keys are removed rather than remaining undefined
  const handleFilterChange = (key, rawValue) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (!rawValue || rawValue === '' || rawValue === 'All') {
        delete next[key];
      } else {
        next[key] = (key === 'year' || key === 'month' || key === 'quarter' || key === 'day' || key === 'hour')
          ? parseInt(rawValue, 10)
          : rawValue;
      }
      return next;
    });
  };

  // Active filter count - counts truly active predicates
  const activeFilters = Object.entries(filters).filter(([_, val]) =>
    val !== undefined && val !== null && val !== '' && val !== 'All' && (!Array.isArray(val) || val.length > 0)
  );
  const activeFilterCount = activeFilters.length;

  const isCategoryOrDesc = dimension === 'primary_type' || dimension === 'description' || dimension === 'location_description';

  const formatXAxisLabel = (value) => {
    if (typeof value !== 'string') return value;
    if (value.length > 15) {
      return value.substring(0, 13) + '…';
    }
    return value;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">
          <Layers size={26} style={{ color: 'var(--primary-cyan)' }} />
          Interactive OLAP Data Cube Explorer
        </h1>
        <p className="page-description">
          Execute multi-dimensional Data Warehousing operations (Roll-Up, Drill-Down, Slice, Dice, Pivot)
          backed by the {isSynthetic ? '30,000' : '761,718'} Chicago Crime PostgreSQL Star Schema.
        </p>
      </div>

      {/* Mode Navigation & Toolbar */}
      <div
        className="filter-bar"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          borderColor: 'rgba(56, 189, 248, 0.3)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <SlidersHorizontal size={15} /> OLAP Mode:
          </span>
          <button
            className={`filter-button ${mode === 'rollup' ? 'active' : ''}`}
            onClick={() => { setMode('rollup'); setViewType('bar'); }}
            style={{ borderRadius: '6px' }}
          >
            <ArrowUpDown size={14} />
            Roll-Up / Drill-Down
          </button>
          <button
            className={`filter-button ${mode === 'slicedice' ? 'active' : ''}`}
            onClick={() => { setMode('slicedice'); setViewType('bar'); }}
            style={{ borderRadius: '6px' }}
          >
            <Filter size={14} />
            Slice & Dice
          </button>
          <button
            className={`filter-button ${mode === 'pivot' ? 'active' : ''}`}
            onClick={() => { setMode('pivot'); setViewType('pivot'); }}
            style={{ borderRadius: '6px' }}
          >
            <Grid size={14} />
            Pivot Matrix
          </button>
        </div>

        <button
          onClick={handleReset}
          className="filter-button"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
        >
          <RotateCcw size={14} />
          Reset Cube Controls
        </button>
      </div>

      {/* Breadcrumb Navigation Trail */}
      {mode !== 'pivot' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: 'rgba(30, 41, 59, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            fontSize: '0.88rem',
            overflowX: 'auto'
          }}
        >
          <span style={{ color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={14} style={{ color: 'var(--primary-cyan)' }} /> Drill Path:
          </span>
          <button
            onClick={() => handleBreadcrumbClick(-1)}
            style={{
              background: 'none',
              border: 'none',
              color: drillPath.length === 0 ? 'var(--primary-cyan)' : '#94a3b8',
              fontWeight: drillPath.length === 0 ? 700 : 400,
              cursor: 'pointer',
              textDecoration: drillPath.length === 0 ? 'underline' : 'none'
            }}
          >
            All Warehouse Records ({config?.recordCount ? config.recordCount.toLocaleString() : (isSynthetic ? '30,000' : '761,718')})
          </button>
          {drillPath.map((step, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight size={14} style={{ color: '#64748b' }} />
              <button
                onClick={() => handleBreadcrumbClick(idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: idx === drillPath.length - 1 ? 'var(--primary-cyan)' : '#94a3b8',
                  fontWeight: idx === drillPath.length - 1 ? 700 : 400,
                  cursor: 'pointer',
                  textDecoration: idx === drillPath.length - 1 ? 'underline' : 'none'
                }}
              >
                {step.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Control Panel by Mode */}
      <div
        className="filter-bar"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          alignItems: 'end',
          backgroundColor: 'rgba(15, 23, 42, 0.5)'
        }}
      >
        {mode !== 'pivot' ? (
          <>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Aggregation Dimension
              </label>
              <select
                className="filter-select"
                value={dimension}
                onChange={(e) => setDimension(e.target.value)}
                style={{ width: '100%' }}
              >
                <optgroup label="Time Hierarchy">
                  <option value="year">Year</option>
                  <option value="quarter">Quarter</option>
                  <option value="month">Month</option>
                  <option value="month_name">Month Name</option>
                  <option value="day">Day of Month</option>
                  <option value="day_name">Day of Week</option>
                  <option value="hour">Hour of Day</option>
                  <option value="time_period">Time Period</option>
                </optgroup>
                <optgroup label="Area Hierarchy">
                  <option value="district">Police District</option>
                  <option value="ward">Ward</option>
                  <option value="community_area">Community Area</option>
                </optgroup>
                <optgroup label="Offense & Setting">
                  <option value="primary_type">Crime Category</option>
                  <option value="description">Offense Description</option>
                  <option value="location_description">Premise Type</option>
                  <option value="arrest">Arrest Status</option>
                  <option value="domestic">Domestic Status</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Filter Year (Slice/Dice)
              </label>
              <select
                className="filter-select"
                value={filters.year || ''}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">All Years (2023–2025)</option>
                {meta?.filter_options?.years?.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Filter District (Slice/Dice)
              </label>
              <select
                className="filter-select"
                value={filters.district || ''}
                onChange={(e) => handleFilterChange('district', e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">All Police Districts</option>
                {meta?.filter_options?.districts?.map((d) => (
                  <option key={d} value={d}>District {d}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Filter Offense Category
              </label>
              <select
                className="filter-select"
                value={filters.primary_type || ''}
                onChange={(e) => handleFilterChange('primary_type', e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">All Offense Types</option>
                {meta?.filter_options?.categories?.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Pivot Row Axis Dimension
              </label>
              <select
                className="filter-select"
                value={pivotRowDim}
                onChange={(e) => setPivotRowDim(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="district">Police District</option>
                <option value="year">Year</option>
                <option value="month_name">Month Name</option>
                <option value="time_period">Time Period</option>
                <option value="primary_type">Crime Category</option>
                <option value="location_description">Premise Type</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Pivot Column Axis Dimension
              </label>
              <select
                className="filter-select"
                value={pivotColDim}
                onChange={(e) => setPivotColDim(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="primary_type">Crime Category</option>
                <option value="district">Police District</option>
                <option value="year">Year</option>
                <option value="time_period">Time Period</option>
                <option value="day_name">Day of Week</option>
                <option value="arrest">Arrest Status</option>
                <option value="domestic">Domestic Status</option>
              </select>
            </div>

            <div>
              <button
                className="filter-button"
                onClick={handleSwapPivot}
                style={{ width: '100%', justifyContent: 'center', backgroundColor: 'rgba(56, 189, 248, 0.15)' }}
              >
                <RotateCcw size={14} /> Swap Row & Column Axes
              </button>
            </div>
          </>
        )}

        {/* View Type Switcher */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {mode !== 'pivot' && (
            <>
              <button
                className={`filter-button ${viewType === 'bar' ? 'active' : ''}`}
                onClick={() => setViewType('bar')}
                title="Bar Chart View"
              >
                <BarChart3 size={14} />
              </button>
              <button
                className={`filter-button ${viewType === 'line' ? 'active' : ''}`}
                onClick={() => setViewType('line')}
                title="Line Chart View"
              >
                <LineIcon size={14} />
              </button>
            </>
          )}
          <button
            className={`filter-button ${viewType === 'table' ? 'active' : ''}`}
            onClick={() => setViewType('table')}
            title="Summary Table View"
          >
            <TableIcon size={14} />
          </button>
        </div>
      </div>

      {/* KPI Metric Summary */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Active Selection Volume</span>
            <div className="kpi-icon-wrapper cyan">
              <Layers size={18} />
            </div>
          </div>
          <div className="kpi-value">
            {mode === 'pivot'
              ? (pivotResult?.grand_total?.toLocaleString() || '0')
              : (olapResult?.total_incidents?.toLocaleString() || '0')}
          </div>
          <div className="kpi-subtitle">Fact records matching active OLAP query</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Active Aggregation Level</span>
            <div className="kpi-icon-wrapper purple">
              <ArrowUpDown size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ textTransform: 'capitalize', fontSize: '1.4rem' }}>
            {mode === 'pivot'
              ? `${pivotResult?.row_label || pivotRowDim} × ${pivotResult?.col_label || pivotColDim}`
              : (olapResult?.dimension_label || dimension)}
          </div>
          <div className="kpi-subtitle">
            {mode === 'pivot' ? 'Matrix Cross-Tabulation' : `Child: ${olapResult?.child_dimension || 'None'}`}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Filter Constraints</span>
            <div className="kpi-icon-wrapper yellow">
              <Filter size={18} />
            </div>
          </div>
          <div className="kpi-value">
            {activeFilterCount} Active
          </div>
          <div className="kpi-subtitle">
            {activeFilterCount === 0 ? 'Full Warehouse Scope' : `${activeFilterCount} SQL WHERE clause${activeFilterCount > 1 ? 's' : ''} applied`}
          </div>
        </div>
      </div>

      {/* Loading / Error States */}
      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'rgba(30, 41, 59, 0.4)', borderRadius: '12px' }}>
          <RefreshCw className="spin" size={32} style={{ color: 'var(--primary-cyan)', marginBottom: '12px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Executing PostgreSQL Star Schema OLAP Query...</p>
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '20px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', color: '#f87171' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>OLAP Query Exception</h3>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>{error}</p>
        </div>
      )}

      {/* Visual Data Content Panel */}
      {!loading && !error && (
        <div className="card" style={{ padding: '20px' }}>
          {/* Day-of-Month Aggregation Context Note */}
          {dimension === 'day' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              marginBottom: '16px',
              backgroundColor: 'rgba(53, 184, 232, 0.08)',
              border: '1px solid rgba(53, 184, 232, 0.25)',
              borderRadius: '8px',
              fontSize: '0.84rem',
              color: 'var(--text-muted)'
            }}>
              <Info size={16} style={{ color: 'var(--primary-cyan)', flexShrink: 0 }} />
              <span>
                <strong style={{ color: 'var(--off-white)' }}>Day-of-Month Aggregation:</strong> Days 1–31 aggregate incident frequencies on each calendar day across all months in the selected scope. Days 29, 30, and 31 reflect only months containing those days (including leap day Feb 29, 2024). All day counts strictly reconcile to the Active Selection Volume.
              </span>
            </div>
          )}

          {/* Chart Views */}
          {mode !== 'pivot' && viewType === 'bar' && olapResult?.records && (
            <div style={{ width: '100%', height: isCategoryOrDesc ? 430 : 380 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={olapResult.records} margin={{ top: 10, right: 30, left: 10, bottom: isCategoryOrDesc ? 85 : 45 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="dimension_value"
                    stroke="#94a3b8"
                    tick={{ fontSize: 10 }}
                    interval={0}
                    angle={-38}
                    textAnchor="end"
                    height={isCategoryOrDesc ? 80 : 45}
                    tickFormatter={formatXAxisLabel}
                  />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#38bdf8', borderRadius: '8px', color: '#f8fafc' }}
                    formatter={(val) => [val.toLocaleString(), 'Incidents']}
                    labelFormatter={(label) => `${olapResult.dimension_label || 'Dimension'}: ${label}`}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '8px', color: '#94a3b8' }}
                  />
                  <Bar dataKey="incident_count" name="Crime Incident Count" fill="#38bdf8" radius={[4, 4, 0, 0]}>
                    {olapResult.records.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {mode !== 'pivot' && viewType === 'line' && olapResult?.records && (
            <div style={{ width: '100%', height: isCategoryOrDesc ? 430 : 380 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={olapResult.records} margin={{ top: 10, right: 30, left: 10, bottom: isCategoryOrDesc ? 85 : 45 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="dimension_value"
                    stroke="#94a3b8"
                    tick={{ fontSize: 10 }}
                    angle={-38}
                    textAnchor="end"
                    height={isCategoryOrDesc ? 80 : 45}
                    tickFormatter={formatXAxisLabel}
                  />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#38bdf8', borderRadius: '8px', color: '#f8fafc' }}
                    labelFormatter={(label) => `${olapResult.dimension_label || 'Dimension'}: ${label}`}
                  />
                  <Legend wrapperStyle={{ paddingTop: '8px', color: '#94a3b8' }} />
                  <Line type="monotone" dataKey="incident_count" name="Incident Volume" stroke="#38bdf8" strokeWidth={3} dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="arrest_count" name="Arrests Made" stroke="#34d399" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Interactive Summary Table (Rollup / Drilldown / Slice / Dice) */}
          {(viewType === 'table' || (mode !== 'pivot' && viewType === 'table')) && olapResult?.records && (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px' }}>{olapResult.dimension_label}</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Incident Count</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Proportion (%)</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Arrest Rate (%)</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Domestic Rate (%)</th>
                    {olapResult.child_dimension && <th style={{ padding: '12px', textAlign: 'center' }}>Drill Down</th>}
                  </tr>
                </thead>
                <tbody>
                  {olapResult.records.map((r, idx) => (
                    <tr
                      key={idx}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {r.dimension_value}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--primary-cyan)' }}>
                        {r.incident_count.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{r.percentage}%</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#34d399' }}>{r.arrest_rate}%</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#f472b6' }}>{r.domestic_rate}%</td>
                      {olapResult.child_dimension && (
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleRowDrillDown(r.dimension_value)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(56, 189, 248, 0.15)',
                              color: 'var(--primary-cyan)',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            Drill <ArrowRight size={12} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pivot Grid Matrix View */}
          {(mode === 'pivot' || viewType === 'pivot') && pivotResult?.matrix && (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ marginBottom: '12px', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Row Axis: <strong>{pivotResult.row_label}</strong></span>
                <span>Column Axis: <strong>{pivotResult.col_label}</strong></span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', color: 'var(--primary-cyan)' }}>
                    <th style={{ padding: '10px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                      {pivotResult.row_label} \ {pivotResult.col_label}
                    </th>
                    {pivotResult.columns.map((col, cIdx) => (
                      <th key={cIdx} style={{ padding: '10px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {col}
                      </th>
                    ))}
                    <th style={{ padding: '10px', border: '1px solid rgba(56, 189, 248, 0.4)', textAlign: 'right', backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#fff' }}>
                      Row Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pivotResult.rows.map((rowVal, rIdx) => (
                    <tr key={rIdx}>
                      <td style={{ padding: '10px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, backgroundColor: 'rgba(30, 41, 59, 0.4)' }}>
                        {rowVal}
                      </td>
                      {pivotResult.columns.map((colVal, cIdx) => {
                        const cellVal = pivotResult.matrix[rowVal]?.[colVal] || 0;
                        const opacity = pivotResult.grand_total > 0 ? Math.min(0.8, (cellVal / (pivotResult.row_totals[rowVal] || 1))) : 0;
                        return (
                          <td
                            key={cIdx}
                            style={{
                              padding: '10px',
                              border: '1px solid rgba(255,255,255,0.05)',
                              textAlign: 'right',
                              backgroundColor: cellVal > 0 ? `rgba(56, 189, 248, ${Math.max(0.05, opacity)})` : 'transparent',
                              color: cellVal > 0 ? '#f8fafc' : '#64748b'
                            }}
                          >
                            {cellVal > 0 ? cellVal.toLocaleString() : '-'}
                          </td>
                        );
                      })}
                      <td style={{ padding: '10px', border: '1px solid rgba(56, 189, 248, 0.3)', textAlign: 'right', fontWeight: 700, color: 'var(--primary-cyan)', backgroundColor: 'rgba(30, 41, 59, 0.6)' }}>
                        {(pivotResult.row_totals[rowVal] || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {/* Column Totals Row */}
                  <tr style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', fontWeight: 700 }}>
                    <td style={{ padding: '10px', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#fff' }}>
                      Column Total
                    </td>
                    {pivotResult.columns.map((colVal, cIdx) => (
                      <td key={cIdx} style={{ padding: '10px', border: '1px solid rgba(56, 189, 248, 0.3)', textAlign: 'right', color: 'var(--primary-cyan)' }}>
                        {(pivotResult.col_totals[colVal] || 0).toLocaleString()}
                      </td>
                    ))}
                    <td style={{ padding: '10px', border: '1px solid rgba(56, 189, 248, 0.5)', textAlign: 'right', backgroundColor: 'var(--primary-cyan)', color: '#0f172a', fontWeight: 800, fontSize: '0.95rem' }}>
                      {pivotResult.grand_total.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
