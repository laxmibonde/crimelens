import React, { useState, useEffect } from 'react';
import { Filter, RefreshCw, X } from 'lucide-react';
import { fetchDashboardFilters } from '../services/api';
import { useDataset } from '../context/DatasetContext';

export default function FilterBar({ selectedFilters = {}, onFilterChange, onResetFilters }) {
  const { dataset } = useDataset();
  const [filterOptions, setFilterOptions] = useState({
    years: [2023, 2024, 2025],
    months: [],
    districts: [],
    crime_types: [],
    days_of_week: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    time_periods: ["Morning", "Afternoon", "Evening", "Night"]
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchDashboardFilters(dataset)
      .then((data) => {
        setFilterOptions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Filter options fetch failed:', err);
        setLoading(false);
      });
  }, [dataset]);

  const handleChange = (key, value) => {
    onFilterChange({
      ...selectedFilters,
      [key]: value === '' ? undefined : value
    });
  };

  const activeFilterCount = Object.values(selectedFilters).filter(
    (v) => v !== undefined && v !== ''
  ).length;

  return (
    <div className="filter-bar">
      <div className="filter-bar-header">
        <Filter size={16} style={{ color: 'var(--lake-blue, #35B8E8)' }} />
        <span>OLAP Filters</span>
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
          name="filter-year"
          data-testid="filter-year"
          className="filter-select"
          style={{ cursor: 'pointer', color: selectedFilters.year ? 'var(--primary-cyan)' : 'var(--text-main)' }}
          value={selectedFilters.year || ''}
          onChange={(e) => handleChange('year', e.target.value)}
          disabled={loading}
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
          name="filter-month"
          data-testid="filter-month"
          className="filter-select"
          style={{ cursor: 'pointer', color: selectedFilters.month ? 'var(--primary-cyan)' : 'var(--text-main)' }}
          value={selectedFilters.month || ''}
          onChange={(e) => handleChange('month', e.target.value)}
          disabled={loading}
        >
          <option value="">All Months</option>
          {filterOptions.months.map((m) => (
            <option key={m.month} value={m.month}>{m.month_name}</option>
          ))}
        </select>
      </div>

      {/* District Filter */}
      <div className="filter-group">
        <label className="filter-label">District</label>
        <select
          name="filter-district"
          data-testid="filter-district"
          className="filter-select"
          style={{ cursor: 'pointer', color: selectedFilters.district ? 'var(--primary-cyan)' : 'var(--text-main)' }}
          value={selectedFilters.district || ''}
          onChange={(e) => handleChange('district', e.target.value)}
          disabled={loading}
        >
          <option value="">All Districts</option>
          {filterOptions.districts.map((d) => (
            <option key={d} value={d}>District {d}</option>
          ))}
        </select>
      </div>

      {/* Crime Category Filter */}
      <div className="filter-group">
        <label className="filter-label">Crime Category</label>
        <select
          name="filter-crime-type"
          data-testid="filter-crime-type"
          className="filter-select"
          style={{ cursor: 'pointer', color: selectedFilters.crime_type ? 'var(--primary-cyan)' : 'var(--text-main)' }}
          value={selectedFilters.crime_type || ''}
          onChange={(e) => handleChange('crime_type', e.target.value)}
          disabled={loading}
        >
          <option value="">All Categories</option>
          {filterOptions.crime_types.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Day of Week Filter */}
      <div className="filter-group">
        <label className="filter-label">Day of Week</label>
        <select
          name="filter-day-of-week"
          data-testid="filter-day-of-week"
          className="filter-select"
          style={{ cursor: 'pointer', color: selectedFilters.day_of_week ? 'var(--primary-cyan)' : 'var(--text-main)' }}
          value={selectedFilters.day_of_week || ''}
          onChange={(e) => handleChange('day_of_week', e.target.value)}
          disabled={loading}
        >
          <option value="">All Days</option>
          {filterOptions.days_of_week.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Time Period Filter */}
      <div className="filter-group">
        <label className="filter-label">Time Period</label>
        <select
          name="filter-time-period"
          data-testid="filter-time-period"
          className="filter-select"
          style={{ cursor: 'pointer', color: selectedFilters.time_period ? 'var(--primary-cyan)' : 'var(--text-main)' }}
          value={selectedFilters.time_period || ''}
          onChange={(e) => handleChange('time_period', e.target.value)}
          disabled={loading}
        >
          <option value="">All Shifts</option>
          {filterOptions.time_periods.map((tp) => (
            <option key={tp} value={tp}>{tp}</option>
          ))}
        </select>
      </div>

      {/* Reset Button */}
      <button
        type="button"
        onClick={onResetFilters}
        style={{
          background: activeFilterCount > 0 ? 'rgba(56, 189, 248, 0.15)' : 'none',
          border: '1px solid var(--border-color)',
          color: activeFilterCount > 0 ? 'var(--primary-cyan)' : 'var(--text-dim)',
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          cursor: activeFilterCount > 0 ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          marginTop: 'auto',
          transition: 'all 0.2s ease'
        }}
        disabled={activeFilterCount === 0}
      >
        <RefreshCw size={13} />
        <span>Reset Filters</span>
      </button>
    </div>
  );
}
