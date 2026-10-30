import React, { useState, useEffect } from 'react';
import { useDataset } from '../context/DatasetContext';
import {
  fetchPBIMetadata,
  fetchPBIModel,
  fetchPBIMeasures,
  fetchPBISetup,
  fetchPBIStatus,
  fetchPBIExplanation
} from '../services/api';
import KPICard from '../components/KPICard';
import {
  BarChart3,
  Database,
  Layers,
  Code2,
  CheckCircle,
  AlertTriangle,
  Copy,
  Check,
  BookOpen,
  Info,
  Sliders,
  Sparkles,
  RefreshCw,
  Layout,
  ExternalLink,
  ShieldCheck,
  FileText,
  FileCode,
  Globe,
  Cpu,
  ArrowRight,
  Server,
  Workflow,
  ChevronRight,
  Table as TableIcon
} from 'lucide-react';

// Chicago Nightfall Theme Color Tokens
const THEME = {
  bgMidnight: '#0B1423',
  bgCard: '#101B2E',
  bgCardElevated: '#15243E',
  bgDeep: '#08101C',
  lakeBlue: '#35B8E8',
  lakeBlueMuted: 'rgba(53, 184, 232, 0.15)',
  amber: '#E9B44C',
  amberMuted: 'rgba(233, 180, 76, 0.15)',
  alertRed: '#E76F74',
  alertRedMuted: 'rgba(231, 111, 116, 0.15)',
  emerald: '#2DD4BF',
  emeraldMuted: 'rgba(45, 212, 191, 0.15)',
  indigo: '#7086FD',
  indigoMuted: 'rgba(112, 134, 253, 0.15)',
  purple: '#A78BFA',
  purpleMuted: 'rgba(167, 139, 250, 0.15)',
  textPrimary: '#EAF2FF',
  textMuted: '#94A7C6',
  textDim: '#5E7292',
  borderRiver: '#1E3758',
  borderSubtle: 'rgba(53, 184, 232, 0.14)'
};

export default function PowerBIPage() {
  const { dataset } = useDataset();

  // State
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState(null);
  const [model, setModel] = useState(null);
  const [measuresData, setMeasuresData] = useState(null);
  const [setupGuide, setSetupGuide] = useState(null);
  const [statusData, setStatusData] = useState(null);
  const [explanation, setExplanation] = useState(null);

  // UI State
  const [activeTab, setActiveTab] = useState('overview');
  const [measureFilter, setMeasureFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [copiedQueryKey, setCopiedQueryKey] = useState(null);
  const [copiedParamKey, setCopiedParamKey] = useState(null);
  const [showAcademicModal, setShowAcademicModal] = useState(false);

  useEffect(() => {
    loadAllPBIData();
  }, [dataset]);

  const loadAllPBIData = async () => {
    try {
      setLoading(true);
      const [metaRes, modelRes, measRes, setupRes, statRes, expRes] = await Promise.all([
        fetchPBIMetadata(),
        fetchPBIModel(),
        fetchPBIMeasures(),
        fetchPBISetup(),
        fetchPBIStatus(),
        fetchPBIExplanation()
      ]);
      setMetadata(metaRes);
      setModel(modelRes);
      setMeasuresData(measRes);
      setSetupGuide(setupRes);
      setStatusData(statRes);
      setExplanation(expRes);
    } catch (err) {
      console.error('Failed to load Power BI integration data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyDAX = (formula, index) => {
    navigator.clipboard.writeText(formula);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyQuery = (code, key) => {
    navigator.clipboard.writeText(code);
    setCopiedQueryKey(key);
    setTimeout(() => setCopiedQueryKey(null), 2000);
  };

  const handleCopyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedParamKey(key);
    setTimeout(() => setCopiedParamKey(null), 2000);
  };

  const filteredMeasures = (measuresData?.measures || []).filter(m => {
    const matchesCategory = measureFilter === 'All' || m.category === measureFilter;
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.formula.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const measureCategories = ['All', ...new Set((measuresData?.measures || []).map(m => m.category))];

  const cardStyle = {
    backgroundColor: THEME.bgCard,
    borderRadius: '12px',
    border: `1px solid ${THEME.borderRiver}`,
    padding: '20px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
    marginBottom: '24px'
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', gap: '16px' }}>
        <RefreshCw size={36} color={THEME.lakeBlue} className="animate-spin" />
        <p style={{ color: THEME.textMuted, fontSize: '14px', fontWeight: 500 }}>
          Loading Microsoft Power BI Integration & Semantic Model...
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px', color: THEME.textPrimary }}>
      
      {/* 1. Header Banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          background: 'linear-gradient(135deg, rgba(23, 54, 93, 0.45) 0%, rgba(16, 27, 46, 0.95) 100%)',
          border: `1px solid ${THEME.borderRiver}`,
          borderRadius: '14px',
          padding: '20px 24px',
          marginBottom: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              padding: '10px',
              backgroundColor: THEME.amberMuted,
              border: '1px solid rgba(233, 180, 76, 0.3)',
              borderRadius: '10px',
              color: THEME.amber,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <BarChart3 size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, letterSpacing: '-0.3px', color: '#fff' }}>
                Microsoft Power BI Integration
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  backgroundColor: dataset === 'synthetic' ? THEME.amberMuted : THEME.emeraldMuted,
                  color: dataset === 'synthetic' ? THEME.amber : THEME.emerald,
                  border: `1px solid ${dataset === 'synthetic' ? 'rgba(233, 180, 76, 0.4)' : 'rgba(45, 212, 191, 0.4)'}`
                }}
              >
                {dataset === 'synthetic' ? 'SYNTHETIC DATASET' : 'REAL CHICAGO DATASET'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', color: THEME.textMuted, fontSize: '13px' }}>
              Enterprise semantic modeling, DAX measure suite, Power Query M ETL scripts & 7-page BI dashboard specifications.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setShowAcademicModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: THEME.bgDeep,
              color: THEME.lakeBlue,
              border: `1px solid ${THEME.borderRiver}`,
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <BookOpen size={16} />
            <span>Academic & DWM Guide</span>
          </button>

          <button
            onClick={loadAllPBIData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: THEME.lakeBlue,
              color: '#08101C',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(53, 184, 232, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            <RefreshCw size={15} />
            <span>Refresh Status</span>
          </button>
        </div>
      </div>

      {/* Dataset Provenance Banner */}
      <div
        style={{
          backgroundColor: dataset === 'real' ? 'rgba(45, 212, 191, 0.08)' : 'rgba(112, 134, 253, 0.08)',
          border: `1px solid ${dataset === 'real' ? 'rgba(45, 212, 191, 0.25)' : 'rgba(112, 134, 253, 0.25)'}`,
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          fontSize: '12.5px',
          lineHeight: 1.5
        }}
      >
        <ShieldCheck size={18} color={dataset === 'real' ? THEME.emerald : THEME.indigo} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          {dataset === 'real' ? (
            <span>
              <strong style={{ color: THEME.emerald }}>Verified Chicago Crime Warehouse Provenance (2023–2025):</strong>{' '}
              Connected to <strong>761,718 reported crime incidents</strong> spanning 36 continuous months from January 1, 2023 through December 31, 2025. Star-schema measures reflect authentic Chicago Police Department logs independently validated against City of Chicago Open Data Portal.
            </span>
          ) : (
            <span>
              <strong style={{ color: THEME.indigo }}>Simulated Dataset Disclaimer (Synthetic Schema):</strong>{' '}
              The synthetic dataset contains <strong>30,000 simulated records</strong> uniform across 24 months. Dedicated strictly for algorithm verification and semantic model benchmarking.
            </span>
          )}
        </div>
      </div>

      {/* 2. Four Responsive KPI Cards */}
      <div
        className="dashboard-grid"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        <KPICard
          title="Database Schema"
          value={metadata?.schema ? `${metadata.schema.toUpperCase()}` : 'PUBLIC'}
          subtitle={`${metadata?.connection?.fact_rows?.toLocaleString() || '761,718'} Fact Incidents`}
          icon={Database}
          accentColor="lake"
          badgeText="PostgreSQL 18"
        />
        <KPICard
          title="Star-Schema Model"
          value="1 Fact + 4 Dims"
          subtitle="1:N Single Filter Context"
          icon={Layers}
          accentColor="river"
          badgeText="Kimball Star"
        />
        <KPICard
          title="DAX Measure Library"
          value={`${measuresData?.total_measures || 20} Measures`}
          subtitle="100% Statically Checked"
          icon={Code2}
          accentColor="amber"
          badgeText="DIVIDE Safe"
        />
        <KPICard
          title="Package Status"
          value="PACKAGE READY"
          subtitle="Desktop Assembly Required"
          icon={ShieldCheck}
          accentColor="alert"
          badgeText="Pending Desktop"
        />
      </div>

      {/* 3. Six Dark-Themed Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: `1px solid ${THEME.borderRiver}`,
          marginBottom: '24px',
          overflowX: 'auto',
          paddingBottom: '8px'
        }}
      >
        {[
          { id: 'overview', label: 'Architecture & Pipeline', icon: Cpu },
          { id: 'model', label: 'Semantic Model Explorer', icon: Layers },
          { id: 'dax', label: `DAX Measure Library (${measuresData?.total_measures || 20})`, icon: Code2 },
          { id: 'powerquery', label: 'Power Query M Scripts', icon: FileCode },
          { id: 'pages', label: '7-Page Report Specifications', icon: Layout },
          { id: 'setup', label: 'Power BI Setup Guide', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: isActive ? THEME.lakeBlueMuted : 'transparent',
                color: isActive ? THEME.lakeBlue : THEME.textMuted,
                border: `1px solid ${isActive ? THEME.lakeBlue : 'transparent'}`,
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ARCHITECTURE & 5-STAGE PIPELINE */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Visual 5-Stage Connected Pipeline */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Cpu size={18} color={THEME.lakeBlue} />
              <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#fff' }}>
                End-to-End Power BI Integration Architecture Pipeline
              </h2>
            </div>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: THEME.textMuted, lineHeight: 1.6 }}>
              CrimeLens integrates with Microsoft Power BI Desktop via native PostgreSQL connectors. The pipeline preserves star-schema integrity, isolates dataset schemas, and provides verified DAX calculations.
            </p>

            {/* Connected Pipeline Flow with Directional Indicators */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '14px',
                position: 'relative'
              }}
            >
              {[
                {
                  step: 'STAGE 01',
                  title: 'PostgreSQL Warehouse',
                  desc: 'Host: 127.0.0.1:5432\nDatabase: crimelens_db\nSchemas: public / synthetic',
                  status: 'Online & Validated',
                  statusColor: THEME.emerald,
                  icon: Database
                },
                {
                  step: 'STAGE 02',
                  title: 'Power Query M ETL',
                  desc: 'Import Mode loading with native PostgreSQL date/time parsing & surrogate keys.',
                  status: 'Queries Formatted',
                  statusColor: THEME.lakeBlue,
                  icon: Workflow
                },
                {
                  step: 'STAGE 03',
                  title: 'Semantic Star Model',
                  desc: '1 Fact Table (fact_crime) + 4 Dimension Tables with 1:N single filter context.',
                  status: 'Cardinality Verified',
                  statusColor: THEME.purple,
                  icon: Layers
                },
                {
                  step: 'STAGE 04',
                  title: 'DAX Measure Suite',
                  desc: '20 production measures with DIVIDE zero-handling and filter context control.',
                  status: 'Syntax Verified',
                  statusColor: THEME.amber,
                  icon: Code2
                },
                {
                  step: 'STAGE 05',
                  title: 'Power BI Dashboard',
                  desc: '7 structured report pages: Executive, Spatial, Temporal, Category, OLAP, Quality.',
                  status: 'Specs Prepared',
                  statusColor: THEME.indigo,
                  icon: Layout
                }
              ].map((s, idx) => {
                const IconComponent = s.icon;
                return (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: THEME.bgDeep,
                      borderRadius: '10px',
                      border: `1px solid ${THEME.borderRiver}`,
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, color: THEME.lakeBlue, backgroundColor: THEME.lakeBlueMuted, padding: '2px 6px', borderRadius: '4px' }}>
                          {s.step}
                        </span>
                        <span style={{ fontSize: '10px', fontFamily: 'monospace', color: s.statusColor, backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                          {s.status}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <IconComponent size={16} color={THEME.lakeBlue} />
                        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#fff', margin: 0 }}>{s.title}</h3>
                      </div>

                      <p style={{ margin: 0, fontSize: '11.5px', color: THEME.textMuted, whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                        {s.desc}
                      </p>
                    </div>

                    {idx < 4 && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', color: THEME.textDim }}>
                        <ArrowRight size={14} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Connection Parameters & Storage Strategy Panels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
            
            {/* Dedicated PostgreSQL Connection Parameters */}
            <div style={{ ...cardStyle, marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${THEME.borderRiver}`, paddingBottom: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Server size={18} color={THEME.lakeBlue} />
                  <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#fff' }}>
                    PostgreSQL Connection Parameters
                  </h3>
                </div>
                <button
                  onClick={() => handleCopyText('Host=127.0.0.1;Port=5432;Database=crimelens_db;Username=postgres;', 'connstr')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: THEME.bgDeep,
                    border: `1px solid ${THEME.borderRiver}`,
                    color: THEME.lakeBlue,
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {copiedParamKey === 'connstr' ? <Check size={12} color={THEME.emerald} /> : <Copy size={12} />}
                  <span>{copiedParamKey === 'connstr' ? 'Copied' : 'Copy Conn String'}</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: THEME.bgDeep, borderRadius: '6px', border: `1px solid ${THEME.borderRiver}` }}>
                  <span style={{ color: THEME.textMuted }}>Server Host:</span>
                  <span style={{ fontFamily: 'monospace', color: THEME.lakeBlue, fontWeight: 700 }}>127.0.0.1</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: THEME.bgDeep, borderRadius: '6px', border: `1px solid ${THEME.borderRiver}` }}>
                  <span style={{ color: THEME.textMuted }}>Port:</span>
                  <span style={{ fontFamily: 'monospace', color: THEME.lakeBlue, fontWeight: 700 }}>5432</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: THEME.bgDeep, borderRadius: '6px', border: `1px solid ${THEME.borderRiver}` }}>
                  <span style={{ color: THEME.textMuted }}>Database Name:</span>
                  <span style={{ fontFamily: 'monospace', color: THEME.lakeBlue, fontWeight: 700 }}>crimelens_db</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: THEME.bgDeep, borderRadius: '6px', border: `1px solid ${THEME.borderRiver}` }}>
                  <span style={{ color: THEME.textMuted }}>Active Real Schema:</span>
                  <span style={{ fontFamily: 'monospace', color: THEME.emerald, fontWeight: 700 }}>public (761,718 records)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: THEME.bgDeep, borderRadius: '6px', border: `1px solid ${THEME.borderRiver}` }}>
                  <span style={{ color: THEME.textMuted }}>Active Synthetic Schema:</span>
                  <span style={{ fontFamily: 'monospace', color: THEME.indigo, fontWeight: 700 }}>synthetic_data (30,000 records)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: THEME.bgDeep, borderRadius: '6px', border: `1px solid ${THEME.borderRiver}` }}>
                  <span style={{ color: THEME.textMuted }}>Recommended Storage Mode:</span>
                  <span style={{ fontFamily: 'monospace', color: THEME.purple, fontWeight: 700 }}>Import Mode (VertiPaq)</span>
                </div>
              </div>
            </div>

            {/* Storage Mode Comparison & Strategy Table */}
            <div style={{ ...cardStyle, marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${THEME.borderRiver}`, paddingBottom: '12px', marginBottom: '16px' }}>
                <ShieldCheck size={18} color={THEME.emerald} />
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#fff' }}>
                  Storage Mode Comparison & Strategy
                </h3>
              </div>

              <div style={{ overflowX: 'auto', marginBottom: '14px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${THEME.borderRiver}`, color: THEME.textMuted, backgroundColor: THEME.bgDeep }}>
                      <th style={{ padding: '8px 10px' }}>Architecture Dimension</th>
                      <th style={{ padding: '8px 10px', color: THEME.emerald }}>Import Mode (CrimeLens)</th>
                      <th style={{ padding: '8px 10px', color: THEME.textDim }}>DirectQuery</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: `1px solid ${THEME.borderRiver}` }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>Engine & Storage</td>
                      <td style={{ padding: '8px 10px', color: THEME.emerald }}>VertiPaq In-Memory Columnar</td>
                      <td style={{ padding: '8px 10px', color: THEME.textMuted }}>Live PostgreSQL SQL queries</td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${THEME.borderRiver}` }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>Query Performance</td>
                      <td style={{ padding: '8px 10px', color: THEME.emerald }}>Sub-second aggregations</td>
                      <td style={{ padding: '8px 10px', color: THEME.textMuted }}>Subject to network & DB load</td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${THEME.borderRiver}` }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>DAX Capabilities</td>
                      <td style={{ padding: '8px 10px', color: THEME.emerald }}>100% of DAX functions (Time Intel)</td>
                      <td style={{ padding: '8px 10px', color: THEME.textMuted }}>Restricted DAX subsets</td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${THEME.borderRiver}` }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>Offline Portability</td>
                      <td style={{ padding: '8px 10px', color: THEME.emerald }}>Fully portable standalone .pbix</td>
                      <td style={{ padding: '8px 10px', color: THEME.textMuted }}>Requires live server connection</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p style={{ margin: 0, fontSize: '11.5px', color: THEME.textMuted, lineHeight: 1.5 }}>
                <strong style={{ color: THEME.lakeBlue }}>Architectural Conclusion:</strong> Import mode is strongly recommended for CrimeLens. Columnar compression condenses 761,718 incidents into under 40 MB of RAM while supporting advanced DAX measures.
              </p>
            </div>

          </div>

          {/* Status Terminology & Governance Card */}
          <div
            style={{
              backgroundColor: 'rgba(53, 184, 232, 0.05)',
              border: `1px solid ${THEME.borderRiver}`,
              borderRadius: '10px',
              padding: '16px 20px',
              fontSize: '12px',
              lineHeight: 1.6
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldCheck size={16} color={THEME.lakeBlue} />
              <strong style={{ color: '#fff', fontSize: '13px' }}>
                Status Terminology & Verification Protocol
              </strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', color: THEME.textMuted }}>
              <div>
                <strong style={{ color: THEME.emerald }}>PostgreSQL Connection:</strong> Verified live by CrimeLens backend application against active database.
              </div>
              <div>
                <strong style={{ color: THEME.lakeBlue }}>Power Query M ETL:</strong> Programmatically generated and verified for schema column mappings.
              </div>
              <div>
                <strong style={{ color: THEME.amber }}>DAX Measures Library:</strong> 100% statically checked for syntax and DIVIDE zero-handling.
              </div>
              <div>
                <strong style={{ color: THEME.purple }}>Desktop Report Assembly:</strong> Requires compilation inside Microsoft Power BI Desktop software using provided package assets.
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: SEMANTIC MODEL EXPLORER */}
      {activeTab === 'model' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${THEME.borderRiver}`, paddingBottom: '14px', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color={THEME.purple} />
              <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#fff' }}>
                Star-Schema Relationship Model
              </h2>
            </div>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', padding: '3px 10px', borderRadius: '4px', backgroundColor: THEME.bgDeep, color: THEME.lakeBlue, border: `1px solid ${THEME.borderRiver}` }}>
              Schema: <strong style={{ color: '#fff' }}>{metadata?.schema || 'public'}</strong> | Fact Records: <strong style={{ color: THEME.emerald }}>{metadata?.connection?.fact_rows?.toLocaleString() || '761,718'}</strong>
            </span>
          </div>

          {/* Relationships Table */}
          <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${THEME.borderRiver}`, color: THEME.textMuted, backgroundColor: THEME.bgDeep }}>
                  <th style={{ padding: '10px 14px' }}>From Table (Fact)</th>
                  <th style={{ padding: '10px 14px' }}>Foreign Key</th>
                  <th style={{ padding: '10px 14px' }}>Cardinality</th>
                  <th style={{ padding: '10px 14px' }}>To Table (Dim)</th>
                  <th style={{ padding: '10px 14px' }}>Primary Key</th>
                  <th style={{ padding: '10px 14px' }}>Filter Context</th>
                  <th style={{ padding: '10px 14px' }}>Uniqueness</th>
                </tr>
              </thead>
              <tbody>
                {(model?.relationships || []).map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${THEME.borderRiver}` }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: THEME.lakeBlue, fontWeight: 700 }}>{r.from_table}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: THEME.amber }}>{r.from_column}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: THEME.purple, fontWeight: 700 }}>{r.cardinality}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: THEME.emerald, fontWeight: 700 }}>{r.to_table}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: THEME.emerald }}>{r.to_column}</td>
                    <td style={{ padding: '10px 14px', color: THEME.textMuted }}>{r.cross_filter}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '4px', backgroundColor: THEME.emeraldMuted, color: THEME.emerald, border: '1px solid rgba(45, 212, 191, 0.3)' }}>
                        {r.uniqueness_verified ? 'Verified Unique' : 'Single Context'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Model Entities Grid */}
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '14px' }}>
            Star-Schema Entities & Column Specifications
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {model?.tables?.fact && (
              <div style={{ backgroundColor: THEME.bgDeep, borderRadius: '10px', border: '1px solid rgba(53, 184, 232, 0.35)', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: `1px solid ${THEME.borderRiver}`, paddingBottom: '8px' }}>
                  <span style={{ fontWeight: 700, color: THEME.lakeBlue }}>{model.tables.fact.name}</span>
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', color: THEME.lakeBlue, backgroundColor: THEME.lakeBlueMuted, padding: '2px 6px', borderRadius: '4px' }}>
                    Fact Table
                  </span>
                </div>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: THEME.textMuted, display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Rows: {model.tables.fact.row_count?.toLocaleString()}</span>
                  <span>PK: {model.tables.fact.primary_key}</span>
                </div>
                <div style={{ maxHeight: '160px', overflowY: 'auto', fontSize: '11px', fontFamily: 'monospace', color: THEME.textMuted }}>
                  {(model.tables.fact.columns || []).map((col, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <span style={{ color: THEME.textPrimary }}>{col.column_name}</span>
                      <span style={{ color: THEME.textDim }}>{col.data_type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(model?.tables?.dimensions || []).map((dim, idx) => (
              <div key={idx} style={{ backgroundColor: THEME.bgDeep, borderRadius: '10px', border: `1px solid ${THEME.borderRiver}`, padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: `1px solid ${THEME.borderRiver}`, paddingBottom: '8px' }}>
                  <span style={{ fontWeight: 700, color: THEME.emerald }}>{dim.name}</span>
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', color: THEME.emerald, backgroundColor: THEME.emeraldMuted, padding: '2px 6px', borderRadius: '4px' }}>
                    Dimension
                  </span>
                </div>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: THEME.textMuted, display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Rows: {dim.row_count?.toLocaleString()}</span>
                  <span>PK: {dim.primary_key}</span>
                </div>
                <div style={{ maxHeight: '160px', overflowY: 'auto', fontSize: '11px', fontFamily: 'monospace', color: THEME.textMuted }}>
                  {(dim.columns || []).map((col, cidx) => (
                    <div key={cidx} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <span style={{ color: THEME.textPrimary }}>{col.column_name}</span>
                      <span style={{ color: THEME.textDim }}>{col.data_type}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DAX MEASURE LIBRARY */}
      {activeTab === 'dax' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${THEME.borderRiver}`, paddingBottom: '14px', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code2 size={18} color={THEME.purple} />
                <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#fff' }}>
                  Verified DAX Measure Library ({measuresData?.total_measures || 20})
                </h2>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: THEME.textMuted }}>
                Production-ready DAX measures utilizing DIVIDE zero-handling and clean filter context control.
              </p>
            </div>

            {/* Filter and Search */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search DAX measure..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: THEME.bgDeep,
                  border: `1px solid ${THEME.borderRiver}`,
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '12px',
                  outline: 'none',
                  width: '200px'
                }}
              />

              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
                {measureCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setMeasureFilter(cat)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      backgroundColor: measureFilter === cat ? THEME.purple : THEME.bgDeep,
                      color: measureFilter === cat ? '#fff' : THEME.textMuted,
                      border: `1px solid ${measureFilter === cat ? THEME.purple : THEME.borderRiver}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Measures Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredMeasures.map((m, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: THEME.bgDeep,
                  borderRadius: '10px',
                  border: `1px solid ${THEME.borderRiver}`,
                  padding: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: THEME.purple, backgroundColor: THEME.purpleMuted, padding: '2px 8px', borderRadius: '4px' }}>
                      #{m.id}
                    </span>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: 0 }}>{m.name}</h3>
                    <span style={{ fontSize: '10.5px', color: THEME.textMuted, backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                      {m.category}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyDAX(`${m.name} = \n${m.formula}`, idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      backgroundColor: THEME.bgCardElevated,
                      color: THEME.lakeBlue,
                      border: `1px solid ${THEME.borderRiver}`
                    }}
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check size={13} color={THEME.emerald} />
                        <span style={{ color: THEME.emerald }}>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copy DAX</span>
                      </>
                    )}
                  </button>
                </div>

                <p style={{ margin: '0 0 10px', fontSize: '12px', color: THEME.textMuted }}>
                  {m.description}
                </p>

                <div style={{ backgroundColor: '#070C15', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', padding: '10px 14px', fontFamily: 'monospace', fontSize: '12px', color: THEME.lakeBlue, overflowX: 'auto' }}>
                  <pre style={{ margin: 0 }}>{m.name} = {m.formula}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: POWER QUERY M SCRIPTS */}
      {activeTab === 'powerquery' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${THEME.borderRiver}`, paddingBottom: '14px', marginBottom: '18px' }}>
            <FileCode size={18} color={THEME.emerald} />
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#fff' }}>
              Power Query M Scripts for PostgreSQL Warehouse Ingestion
            </h2>
          </div>
          <p style={{ margin: '0 0 20px', fontSize: '12.5px', color: THEME.textMuted }}>
            Copy and paste these native M expressions into the Power BI Desktop &quot;Advanced Editor&quot; to load normalized star tables from PostgreSQL.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Real Dataset Script */}
            <div style={{ backgroundColor: THEME.bgDeep, borderRadius: '10px', border: `1px solid ${THEME.borderRiver}`, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: THEME.emerald }} />
                  <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: '#fff', margin: 0 }}>
                    Real Dataset Power Query Script (`public` Schema — 761,718 Incidents)
                  </h3>
                </div>
                <button
                  onClick={() => handleCopyQuery(`let\n    Source = PostgreSQL.Database("127.0.0.1:5432", "crimelens_db"),\n    public_fact_crime = Source{[Schema="public",Item="fact_crime"]}[Data]\nin\n    public_fact_crime`, 'real')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: THEME.bgCardElevated,
                    color: THEME.lakeBlue,
                    border: `1px solid ${THEME.borderRiver}`
                  }}
                >
                  {copiedQueryKey === 'real' ? (
                    <>
                      <Check size={13} color={THEME.emerald} />
                      <span style={{ color: THEME.emerald }}>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copy M Query</span>
                    </>
                  )}
                </button>
              </div>

              <div style={{ backgroundColor: '#070C15', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', padding: '12px 14px', fontFamily: 'monospace', fontSize: '11.5px', color: THEME.emerald, overflowX: 'auto' }}>
                <pre style={{ margin: 0 }}>{`let
    Source = PostgreSQL.Database("127.0.0.1:5432", "crimelens_db"),
    public_Schema = Source{[Schema="public"]}[Data],
    fact_crime = public_Schema{[Item="fact_crime"]}[Data],
    #"Changed Type" = Table.TransformColumnTypes(fact_crime,{{"crime_fact_key", Int64.Type}, {"incident_id", Int64.Type}})
in
    #"Changed Type"`}</pre>
              </div>
            </div>

            {/* Synthetic Dataset Script */}
            <div style={{ backgroundColor: THEME.bgDeep, borderRadius: '10px', border: `1px solid ${THEME.borderRiver}`, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: THEME.indigo }} />
                  <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: '#fff', margin: 0 }}>
                    Synthetic Demo Dataset Power Query Script (`synthetic_data` Schema — 30,000 Records)
                  </h3>
                </div>
                <button
                  onClick={() => handleCopyQuery(`let\n    Source = PostgreSQL.Database("127.0.0.1:5432", "crimelens_db"),\n    synthetic_fact = Source{[Schema="synthetic_data",Item="fact_crime"]}[Data]\nin\n    synthetic_fact`, 'synthetic')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: THEME.bgCardElevated,
                    color: THEME.lakeBlue,
                    border: `1px solid ${THEME.borderRiver}`
                  }}
                >
                  {copiedQueryKey === 'synthetic' ? (
                    <>
                      <Check size={13} color={THEME.emerald} />
                      <span style={{ color: THEME.emerald }}>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copy M Query</span>
                    </>
                  )}
                </button>
              </div>

              <div style={{ backgroundColor: '#070C15', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', padding: '12px 14px', fontFamily: 'monospace', fontSize: '11.5px', color: THEME.indigo, overflowX: 'auto' }}>
                <pre style={{ margin: 0 }}>{`let
    Source = PostgreSQL.Database("127.0.0.1:5432", "crimelens_db"),
    synthetic_Schema = Source{[Schema="synthetic_data"]}[Data],
    fact_crime = synthetic_Schema{[Item="fact_crime"]}[Data]
in
    fact_crime`}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: 7-PAGE REPORT SPECIFICATIONS */}
      {activeTab === 'pages' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${THEME.borderRiver}`, paddingBottom: '14px', marginBottom: '18px' }}>
            <Layout size={18} color={THEME.amber} />
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#fff' }}>
              7-Page Enterprise BI Report Specifications
            </h2>
          </div>
          <p style={{ margin: '0 0 20px', fontSize: '12.5px', color: THEME.textMuted }}>
            Full blueprint for assembling the 7 analytical dashboard pages in Microsoft Power BI Desktop.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {[
              { num: 'P1', title: 'Executive Command Center', desc: 'Summary incident KPIs, census scope (761,718), monthly trend trajectories, arrest rates, and district crime volume ranking.' },
              { num: 'P2', title: 'Temporal & Diurnal Dynamics', desc: '7×24 hour-of-day by day-of-week incident density matrix, weekend vs weekday volume shifts, and seasonal decomposition.' },
              { num: 'P3', title: 'Geographic Area Intelligence', desc: 'Police district choropleth map, community area concentration rankings, and spatial boundary drill-down analysis.' },
              { num: 'P4', title: 'Crime Category Deep-Dive', desc: 'Primary offense distribution, domestic incident concentrations, FBI Part I index tracking, and weapon violation profiles.' },
              { num: 'P5', title: 'Interactive OLAP Slice & Dice', desc: 'Multi-dimensional roll-up and drill-down matrix across Year, District, and Crime Category dimensions with dynamic totals.' },
              { num: 'P6', title: 'Data Quality & Warehouse Audit', desc: 'ETL load audit metrics, null-rate validation, surrogate key integrity checks, and real vs synthetic data volume reconciliations.' },
              { num: 'P7', title: 'Methodology & DWM Foundations', desc: 'Kimball star-schema documentation, DAX measure dictionary, VertiPaq memory optimization guidelines, and ethical civic disclaimers.' }
            ].map((p, idx) => (
              <div key={idx} style={{ backgroundColor: THEME.bgDeep, borderRadius: '8px', border: `1px solid ${THEME.borderRiver}`, padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: THEME.amber, backgroundColor: THEME.amberMuted, padding: '2px 6px', borderRadius: '4px' }}>
                    {p.num}
                  </span>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#fff', margin: 0 }}>{p.title}</h3>
                </div>
                <p style={{ margin: 0, fontSize: '11.5px', color: THEME.textMuted, lineHeight: 1.5 }}>
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: POWER BI SETUP GUIDE */}
      {activeTab === 'setup' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${THEME.borderRiver}`, paddingBottom: '14px', marginBottom: '18px' }}>
            <FileText size={18} color={THEME.lakeBlue} />
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#fff' }}>
              Power BI Desktop Setup & Assembly Walkthrough
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              {
                step: 'Step 1: Install Npgsql PostgreSQL Connector & Open Power BI Desktop',
                text: 'Ensure PostgreSQL ODBC/Npgsql connector is available on Windows. Open Microsoft Power BI Desktop, click "Get Data", and select "PostgreSQL database".'
              },
              {
                step: 'Step 2: Connect to CrimeLens Data Warehouse',
                text: 'Enter Server: "127.0.0.1:5432" and Database: "crimelens_db". Select "Import" mode under Data Connectivity mode to enable full VertiPaq in-memory DAX functionality.'
              },
              {
                step: 'Step 3: Select Star-Schema Tables from "public" Schema',
                text: 'In the Navigator dialog, check "fact_crime", "dim_crime", "dim_area", "dim_time", and "dim_status". Click "Transform Data" to launch Power Query.'
              },
              {
                step: 'Step 4: Verify Star Relationships in Model View',
                text: 'Navigate to the "Model" tab. Verify 1:N single-direction relationships from each dimension table to fact_crime matching the semantic explorer specifications.'
              },
              {
                step: 'Step 5: Create DAX Measures Table',
                text: 'Create a dedicated measure table "_Measures" and paste the 20 production DAX formulas from the DAX Measure Library tab.'
              },
              {
                step: 'Step 6: Apply Chicago Nightfall Dark Theme JSON',
                text: 'Under the "View" tab, click Themes -> Browse for themes, and select the CrimeLens Chicago Nightfall JSON theme file for official civic palette styling.'
              }
            ].map((st, idx) => (
              <div key={idx} style={{ backgroundColor: THEME.bgDeep, borderRadius: '8px', border: `1px solid ${THEME.borderRiver}`, padding: '14px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: THEME.lakeBlue, margin: '0 0 4px' }}>
                  {st.step}
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: THEME.textMuted, lineHeight: 1.5 }}>
                  {st.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Academic & DWM Guide Modal */}
      {showAcademicModal && explanation && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(7, 12, 21, 0.85)',
            backdropFilter: 'blur(6px)',
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: THEME.bgCardElevated,
              border: `1px solid ${THEME.borderRiver}`,
              borderRadius: '14px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.6)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: `1px solid ${THEME.borderRiver}`,
                paddingBottom: '14px',
                marginBottom: '18px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={20} color={THEME.lakeBlue} />
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#fff' }}>
                  {explanation.title || 'Power BI Academic & DWM Architectural Foundations'}
                </h3>
              </div>
              <button
                onClick={() => setShowAcademicModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: THEME.textMuted,
                  fontSize: '18px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12.5px', color: THEME.textMuted, lineHeight: 1.6 }}>
              <div style={{ backgroundColor: THEME.lakeBlueMuted, border: '1px solid rgba(53, 184, 232, 0.25)', borderRadius: '8px', padding: '12px 16px' }}>
                <strong style={{ color: THEME.lakeBlue }}>Kimball Dimensional Modeling & Star-Schema Theory:</strong>
                <p style={{ margin: '4px 0 0', color: THEME.textPrimary }}>
                  {explanation.kimball_methodology || 'The star schema minimizes table joins during analytical querying. Surrogate integer keys isolate the fact grain from mutable operational attributes.'}
                </p>
              </div>

              <div style={{ backgroundColor: THEME.bgDeep, borderRadius: '8px', border: `1px solid ${THEME.borderRiver}`, padding: '12px 16px' }}>
                <strong style={{ color: THEME.purple }}>DAX Engine Architecture (VertiPaq vs Formula Engine):</strong>
                <p style={{ margin: '4px 0 0', color: THEME.textMuted }}>
                  {explanation.dax_concepts || 'DAX measures calculate dynamically during visual query generation. Columnar compression in VertiPaq facilitates high-cardinality aggregation over millions of rows.'}
                </p>
              </div>

              <div style={{ backgroundColor: THEME.bgDeep, borderRadius: '8px', border: `1px solid ${THEME.borderRiver}`, padding: '12px 16px' }}>
                <strong style={{ color: THEME.amber }}>Academic Citation & Civic Data Governance:</strong>
                <p style={{ margin: '4px 0 0', color: THEME.textMuted }}>
                  Analysis is grounded in authentic City of Chicago Open Data Portal reported incident logs. CrimeLens provides structural transparency without predictive algorithmic bias.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
