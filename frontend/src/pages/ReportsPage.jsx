import React, { useState, useEffect } from 'react';
import { useDataset } from '../context/DatasetContext';
import {
  fetchReportsMetadata,
  fetchReportPreview,
  downloadReportFile,
  fetchReportsExplanation
} from '../services/api';
import {
  FileText,
  Download,
  FileSpreadsheet,
  FileCode,
  BookOpen,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Sliders,
  Sparkles,
  Layers,
  MapPin,
  Grid,
  Network,
  GitBranch,
  TrendingUp,
  GitCompare,
  Zap,
  Activity,
  ShieldCheck,
  Database
} from 'lucide-react';

export default function ReportsPage() {
  const { dataset } = useDataset();

  // State
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('comprehensive');
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState(null);
  const [methodology, setMethodology] = useState(null);
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');

  // Initial Load
  const loadMeta = async () => {
    try {
      setLoading(true);
      const [metaRes, expRes] = await Promise.all([
        fetchReportsMetadata(),
        fetchReportsExplanation()
      ]);
      setMetadata(metaRes);
      setMethodology(expRes);
    } catch (err) {
      console.error("Error loading Report Center metadata:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, [dataset]);

  // Load Preview Data
  const runPreview = async (templateId, cat, dist) => {
    try {
      setPreviewLoading(true);
      const filters = {};
      if (cat) filters.category = cat;
      if (dist) filters.district = dist;

      const prev = await fetchReportPreview(templateId, filters);
      setPreviewData(prev);
    } catch (err) {
      console.error("Error running report preview:", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    runPreview(selectedTemplate, selectedCategory, selectedDistrict);
  }, [dataset, selectedTemplate, selectedCategory, selectedDistrict]);

  // Download Handler
  const handleDownload = async (format) => {
    try {
      setDownloadingFormat(format);
      const filters = {};
      if (selectedCategory) filters.category = selectedCategory;
      if (selectedDistrict) filters.district = selectedDistrict;

      await downloadReportFile(selectedTemplate, format, filters);
    } catch (err) {
      console.error(`Error downloading ${format} report:`, err);
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloadingFormat(null);
    }
  };

  if (loading && !metadata) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
        <RefreshCw size={32} className="animate-spin" style={{ marginBottom: '16px', color: '#38bdf8' }} />
        <div>Loading CrimeLens Central Report Center & Export Engine...</div>
      </div>
    );
  }

  // Helper template icon
  const getTemplateIcon = (id) => {
    switch (id) {
      case 'comprehensive': return Sparkles;
      case 'overview': return FileText;
      case 'olap': return Layers;
      case 'hotspots': return MapPin;
      case 'evolution': return MapPin;
      case 'kmeans': return Grid;
      case 'apriori': return Network;
      case 'decision_tree': return GitBranch;
      case 'area_intel': return MapPin;
      case 'trends': return TrendingUp;
      case 'what_changed': return GitCompare;
      case 'insights': return Zap;
      case 'etl_monitoring': return Activity;
      case 'data_quality': return ShieldCheck;
      default: return FileText;
    }
  };

  return (
    <div style={{ padding: '24px', color: '#f8fafc', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.8) 100%)',
        border: '1px solid rgba(56,189,248,0.2)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'rgba(56,189,248,0.15)',
            border: '1px solid rgba(56,189,248,0.3)',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileText size={32} style={{ color: '#38bdf8' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                CrimeLens Report Center & Analytics Exports
              </h1>
              <span style={{
                background: metadata?.is_synthetic ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.15)',
                color: metadata?.is_synthetic ? '#fde047' : '#4ade80',
                border: `1px solid ${metadata?.is_synthetic ? 'rgba(234,179,8,0.3)' : 'rgba(34,197,94,0.3)'}`,
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: 600
              }}>
                {metadata?.is_synthetic ? 'SYNTHETIC DEMO DATASET' : 'REAL CHICAGO WAREHOUSE'}
              </span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>
              Centralized professional report generation with downloadable PDF, Excel (XLSX), and CSV exports
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setMethodologyOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(30,41,59,0.8)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '10px 16px',
              color: '#e2e8f0',
              fontWeight: 500,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <BookOpen size={16} style={{ color: '#38bdf8' }} />
            Methodology & Disclaimers
          </button>
        </div>
      </div>

      {/* Featured Master Report Card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(2,132,199,0.2) 0%, rgba(15,23,42,0.8) 100%)',
        border: '1px solid rgba(56,189,248,0.4)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ maxWidth: '750px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 700, fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>
            <Sparkles size={16} /> FEATURED MASTER TEMPLATE
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '6px 0 6px 0', color: '#f8fafc' }}>
            Comprehensive CrimeLens Master Intelligence Report
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
            Generates an all-inclusive report synthesizing analytics across all 15 CrimeLens modules including OLAP cubes, DBSCAN hotspots, K-Means clustering, Apriori rules, Decision Trees, Trend analysis, and Data Quality audits.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => { setSelectedTemplate('comprehensive'); handleDownload('pdf'); }}
            disabled={downloadingFormat !== null}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#0284c7',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(2,132,199,0.3)'
            }}
          >
            <Download size={16} />
            {downloadingFormat === 'pdf' ? 'Generating PDF...' : 'Download PDF'}
          </button>

          <button
            onClick={() => { setSelectedTemplate('comprehensive'); handleDownload('excel'); }}
            disabled={downloadingFormat !== null}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#16a34a',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(22,163,74,0.3)'
            }}
          >
            <FileSpreadsheet size={16} />
            {downloadingFormat === 'excel' ? 'Generating XLSX...' : 'Download Excel'}
          </button>

          <button
            onClick={() => { setSelectedTemplate('comprehensive'); handleDownload('csv'); }}
            disabled={downloadingFormat !== null}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#334155',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '10px 18px',
              color: '#f8fafc',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <FileCode size={16} />
            {downloadingFormat === 'csv' ? 'Generating CSV...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px' }}>
        {/* Left Column: Template Gallery */}
        <div style={{
          background: 'rgba(15,23,42,0.7)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '20px',
          maxHeight: '850px',
          overflowY: 'auto'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', color: '#f8fafc' }}>
            Report Templates ({metadata?.templates?.length || 14})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {metadata?.templates?.map((tpl) => {
              const Icon = getTemplateIcon(tpl.id);
              const isSelected = selectedTemplate === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl.id)}
                  style={{
                    background: isSelected ? 'rgba(56,189,248,0.15)' : 'rgba(30,41,59,0.5)',
                    border: isSelected ? '1px solid rgba(56,189,248,0.5)' : '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '10px',
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon size={16} style={{ color: isSelected ? '#38bdf8' : '#94a3b8' }} />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#38bdf8' : '#f8fafc' }}>
                        {tpl.title}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                    {tpl.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Configuration & Live Report Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Controls & Export Toolbar */}
          <div style={{
            background: 'rgba(15,23,42,0.7)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Category Filter:</span>
              <input
                type="text"
                placeholder="Optional Category (e.g. THEFT)"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  background: 'rgba(30,41,59,0.8)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  outline: 'none',
                  width: '180px'
                }}
              />
            </div>

            {/* Export Format Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleDownload('pdf')}
                disabled={downloadingFormat !== null}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#0284c7',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                <Download size={14} /> PDF
              </button>

              <button
                onClick={() => handleDownload('excel')}
                disabled={downloadingFormat !== null}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#16a34a',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                <FileSpreadsheet size={14} /> Excel (XLSX)
              </button>

              <button
                onClick={() => handleDownload('csv')}
                disabled={downloadingFormat !== null}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#334155',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  color: '#f8fafc',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                <FileCode size={14} /> CSV
              </button>
            </div>
          </div>

          {/* Live Preview Panel */}
          <div style={{
            background: 'rgba(15,23,42,0.7)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                  Live Report Content Preview
                </h2>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Report ID: {previewData?.report_id || 'Generating...'} | Generated: {previewData?.generated_at}
                </span>
              </div>
              <span style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                {previewData?.schema} SCHEMA
              </span>
            </div>

            {previewLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <RefreshCw size={24} className="animate-spin" style={{ marginBottom: '12px', color: '#38bdf8' }} />
                <div>Assembling backend analytics for preview...</div>
              </div>
            ) : previewData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Data Provenance Notice */}
                <div style={{
                  background: 'rgba(234,179,8,0.1)',
                  border: '1px solid rgba(234,179,8,0.3)',
                  borderRadius: '8px',
                  padding: '14px',
                  color: '#fde047',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                  <div><strong>Data Provenance Notice:</strong> {previewData.data_provenance}</div>
                </div>

                {/* Summary KPIs Preview */}
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8', marginBottom: '10px' }}>Executive Summary Baseline</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    {previewData.summary_kpis?.map((k, i) => (
                      <div key={i} style={{ background: 'rgba(30,41,59,0.5)', padding: '12px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{k.label}</div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>{k.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview Tables */}
                {previewData.tables?.map((tbl, i) => (
                  <div key={i}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#c084fc', marginBottom: '10px' }}>{tbl.name}</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: 'rgba(30,41,59,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                            {tbl.headers?.map((h, j) => (
                              <th key={j} style={{ padding: '8px 12px', color: '#94a3b8' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tbl.rows?.map((row, rIdx) => (
                            <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              {row?.map((cell, cIdx) => (
                                <td key={cIdx} style={{ padding: '8px 12px', color: cIdx === 0 ? '#f8fafc' : '#cbd5e1' }}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                {/* Methodology Preview */}
                <div style={{ background: 'rgba(30,41,59,0.4)', padding: '14px', borderRadius: '8px', fontSize: '12px', color: '#94a3b8' }}>
                  <strong style={{ color: '#f8fafc' }}>Methodology Basis:</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px' }}>
                    {previewData.methodology?.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Methodology & Disclaimers Modal */}
      {methodologyOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '24px'
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '700px',
            maxHeight: '85vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={24} style={{ color: '#38bdf8' }} />
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                  {methodology?.title || 'Academic Methodology'}
                </h2>
              </div>
              <button
                onClick={() => setMethodologyOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {methodology?.concepts?.map((c, i) => (
                <div key={i} style={{ background: 'rgba(30,41,59,0.6)', padding: '14px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 700, color: '#38bdf8', fontSize: '14px' }}>{c.term}</div>
                  <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '4px', lineHeight: '1.5' }}>{c.definition}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <button
                onClick={() => setMethodologyOpen(false)}
                style={{
                  background: '#0284c7',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Close Methodology
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
