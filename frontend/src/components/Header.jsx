import React, { useState, useEffect } from 'react';
import {
  Clock,
  Database,
  Sparkles,
  Menu,
  Activity,
  Cpu,
  Layers,
  MapPin
} from 'lucide-react';
import { useDataset, DATASETS } from '../context/DatasetContext';
import { useSidebar } from '../context/SidebarContext';

export default function Header() {
  const [apiStatus, setApiStatus] = useState('checking');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const { dataset, setDataset, isSynthetic } = useDataset();
  const { isCollapsed, toggleSidebar } = useSidebar();

  useEffect(() => {
    // Live clock ticker
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    // Health check ping to FastAPI backend
    fetch('/api/health')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('API request failed');
      })
      .then((data) => {
        if (data.status === 'healthy') {
          setApiStatus('online');
        } else {
          setApiStatus('error');
        }
      })
      .catch(() => {
        setApiStatus('offline');
      });

    return () => clearInterval(timer);
  }, []);

  return (
    <>
    <header className="header-container" role="banner">
      {/* Left: Mobile Toggle & System Brand Context */}
      <div className="header-left">
        <button
          type="button"
          onClick={toggleSidebar}
          className="header-menu-btn"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label="Toggle navigation sidebar"
        >
          <Menu size={18} />
        </button>

        <div className="header-title-section">
          <div className="header-title-text">
            <span>CrimeLens Intelligence Workstation</span>
            {isSynthetic ? (
              <span className="synthetic-glow-badge">
                <Sparkles size={11} /> SYNTHETIC DEMO
              </span>
            ) : (
              <span className="real-data-badge">
                <MapPin size={11} /> CHICAGO WAREHOUSE
              </span>
            )}
          </div>
          <span className="header-subtitle">
            PostgreSQL 18 Star Schema • Haversine Hotspots • Pattern Mining
          </span>
        </div>
      </div>

      {/* Right: Global Dataset Selector, Health Status & Live Time */}
      <div className="header-right">
        {/* Global Dataset Selector */}
        <div className="dataset-selector-wrapper">
          <Database size={14} className="selector-icon" />
          <select
            value={dataset}
            onChange={(e) => setDataset(e.target.value)}
            className={`dataset-dropdown ${isSynthetic ? 'dropdown-synthetic' : 'dropdown-real'}`}
            title="Global Dataset Isolation Selector (PostgreSQL Schemas)"
            aria-label="Select active dataset warehouse schema"
          >
            <option value={DATASETS.REAL}>Real Chicago Census (761,718 incidents)</option>
            <option value={DATASETS.SYNTHETIC}>Synthetic Uniform Demo (30,000 incidents)</option>
          </select>
        </div>

        {/* Backend API Health Status Indicator */}
        <div
          className={`status-badge status-${apiStatus}`}
          title="Backend FastAPI Connection Status"
          aria-live="polite"
        >
          <span className="status-dot"></span>
          <span className="status-label">
            {apiStatus === 'online' && 'API: Online'}
            {apiStatus === 'checking' && 'API: Connecting...'}
            {apiStatus === 'offline' && 'API: Offline'}
            {apiStatus === 'error' && 'API: Error'}
          </span>
        </div>

        {/* Live Monospace Clock */}
        <div className="user-badge clock-badge">
          <Clock size={13} className="clock-icon" />
          <span>{currentTime}</span>
        </div>

        {/* Analyst Workstation Label */}
        <div className="user-badge workstation-badge">
          <Cpu size={13} className="workstation-icon" />
          <span>Analyst Station</span>
        </div>
      </div>
    </header>
    {isSynthetic && (
      <aside 
        className="dataset-banner-disclaimer synthetic-banner" 
        style={{ margin: '12px 24px 0 24px', justifyContent: 'space-between', display: 'flex' }}
        role="alert"
        aria-label="Simulation dataset active"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={16} style={{ color: 'var(--chicago-amber, #E9B44C)', flexShrink: 0 }} />
          <span>
            <strong>SIMULATION MODE ACTIVE:</strong> Viewing isolated synthetic benchmark dataset (30,000 uniform simulated records across 2023–2024). Not real police reports.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDataset(DATASETS.REAL)}
          style={{
            padding: '4px 12px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: 'rgba(53, 184, 232, 0.15)',
            border: '1px solid #35B8E8',
            borderRadius: '6px',
            color: '#35B8E8',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          Switch to Official Census (761,718)
        </button>
      </aside>
    )}
    </>
  );
}
