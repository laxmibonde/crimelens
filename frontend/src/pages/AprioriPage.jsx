import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Network,
  Sliders,
  Play,
  RotateCcw,
  Zap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Search,
  Filter,
  BookOpen,
  Info,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  ShieldAlert,
  Loader2,
  ArrowRight,
  Database,
  Table as TableIcon
} from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid
} from 'recharts';
import KPICard from '../components/KPICard';
import {
  fetchAprioriMetadata,
  fetchAprioriAnalyze,
  fetchAprioriFrequentItemsets,
  fetchAprioriExplanation,
  getActiveDataset
} from '../services/api';
import { useDataset } from '../context/DatasetContext';

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
  textPrimary: '#EAF2FF',
  textMuted: '#94A7C6',
  textDim: '#5E7292',
  borderRiver: '#1E3758',
  borderSubtle: 'rgba(53, 184, 232, 0.18)'
};

// Clean string helper to replace any encoding artifacts or raw LaTeX tokens
function cleanRuleLabel(label) {
  if (!label) return '';
  return label
    .replace(/\$\$/g, '')
    .replace(/\$/g, '')
    .replace(/\\cap/g, '∩')
    .replace(/\\cup/g, '∪')
    .replace(/\\Rightarrow/g, '⇒')
    .replace(/\\to/g, '⇒')
    .replace(/\?\?/g, '⇒')
    .replace(/->/g, '⇒');
}

export default function AprioriPage() {
  const datasetContext = useDataset();
  const currentDataset = datasetContext?.dataset || getActiveDataset();

  // Mining Hyperparameters
  const [minSupport, setMinSupport] = useState(0.05);
  const [minConfidence, setMinConfidence] = useState(0.30);
  const [minLift, setMinLift] = useState(1.0);
  const [maxLen, setMaxLen] = useState(3);
  const [selectedAttributes, setSelectedAttributes] = useState([
    'crime_type', 'premise', 'time_period', 'weekend', 'arrest', 'domestic'
  ]);

  // Execution & Loading States
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  // Result States
  const [analysisResult, setAnalysisResult] = useState(null);
  const [frequentItemsets, setFrequentItemsets] = useState([]);
  const [explanationData, setExplanationData] = useState(null);
  const [selectedRule, setSelectedRule] = useState(null);

  // Table Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsetSearch, setItemsetSearch] = useState('');
  const [ruleSortField, setRuleSortField] = useState('lift');
  const [itemsetSortField, setItemsetSortField] = useState('frequency');
  const [showEduModal, setShowEduModal] = useState(false);

  // Available Mining Attributes
  const availableAttrMap = {
    crime_type: 'Crime Category',
    premise: 'Premise Location',
    time_period: 'Time of Day',
    weekend: 'Weekend Flag',
    arrest: 'Arrest Flag',
    domestic: 'Domestic Flag',
    district: 'Police District'
  };

  // Run Apriori Pipeline
  const runAnalysis = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setElapsedSeconds(0);

    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Number(((Date.now() - startTime) / 1000).toFixed(1)));
    }, 100);

    try {
      const payload = {
        dataset: currentDataset,
        min_support: parseFloat(minSupport),
        min_confidence: parseFloat(minConfidence),
        min_lift: parseFloat(minLift),
        max_len: parseInt(maxLen, 10),
        selected_attributes: selectedAttributes
      };

      const [resAnalyze, resItemsets] = await Promise.all([
        fetchAprioriAnalyze(payload),
        fetchAprioriFrequentItemsets(payload)
      ]);

      setAnalysisResult(resAnalyze);
      setFrequentItemsets(resItemsets.frequent_itemsets || []);

      if (resAnalyze.rules && resAnalyze.rules.length > 0) {
        setSelectedRule(resAnalyze.rules[0]);
      } else {
        setSelectedRule(null);
      }
    } catch (err) {
      console.error('Apriori execution error:', err);
      setError(err.message || 'Failed to execute Apriori association rule mining.');
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setLoading(false);
    }
  };

  // Initial Load on mount or dataset switch
  useEffect(() => {
    runAnalysis();
    fetchAprioriExplanation().then(setExplanationData).catch(console.error);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentDataset]);

  // Reset Defaults Handler
  const handleReset = () => {
    setMinSupport(0.05);
    setMinConfidence(0.30);
    setMinLift(1.0);
    setMaxLen(3);
    setSelectedAttributes(['crime_type', 'premise', 'time_period', 'weekend', 'arrest', 'domestic']);
  };

  // Toggle attribute selection
  const toggleAttribute = (attrKey) => {
    if (selectedAttributes.includes(attrKey)) {
      if (selectedAttributes.length > 1) {
        setSelectedAttributes(selectedAttributes.filter(a => a !== attrKey));
      }
    } else {
      setSelectedAttributes([...selectedAttributes, attrKey]);
    }
  };

  // Filtered & Sorted Rules
  const filteredRules = useMemo(() => {
    if (!analysisResult || !analysisResult.rules) return [];
    let rules = [...analysisResult.rules];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rules = rules.filter(r =>
        r.antecedent_str.toLowerCase().includes(q) ||
        r.consequent_str.toLowerCase().includes(q) ||
        r.explanation.toLowerCase().includes(q)
      );
    }
    rules.sort((a, b) => {
      if (ruleSortField === 'lift') return b.lift - a.lift;
      if (ruleSortField === 'confidence') return b.confidence - a.confidence;
      if (ruleSortField === 'support') return b.support - a.support;
      if (ruleSortField === 'leverage') return b.leverage - a.leverage;
      return 0;
    });
    return rules;
  }, [analysisResult, searchQuery, ruleSortField]);

  // Filtered & Sorted Frequent Itemsets
  const filteredItemsets = useMemo(() => {
    if (!frequentItemsets || frequentItemsets.length === 0) return [];
    let itemsets = [...frequentItemsets];
    if (itemsetSearch.trim()) {
      const q = itemsetSearch.toLowerCase();
      itemsets = itemsets.filter(item =>
        item.itemset_str.toLowerCase().includes(q)
      );
    }
    itemsets.sort((a, b) => {
      if (itemsetSortField === 'frequency') return b.frequency - a.frequency;
      if (itemsetSortField === 'support') return b.support_pct - a.support_pct;
      if (itemsetSortField === 'size') return b.size - a.size;
      return 0;
    });
    return itemsets;
  }, [frequentItemsets, itemsetSearch, itemsetSortField]);

  // Scatter Plot Color Encoding for Lift
  const getLiftColor = (lift) => {
    if (lift >= 2.5) return THEME.emerald;  // Emerald green (Very strong signal)
    if (lift >= 1.5) return THEME.lakeBlue; // Lake blue (Strong association)
    if (lift >= 1.1) return THEME.amber;    // Amber (Moderate positive association)
    return THEME.indigo;                    // Indigo (Baseline co-occurrence)
  };

  // Shared Card Container Style
  const cardStyle = {
    backgroundColor: THEME.bgCard,
    borderRadius: '12px',
    border: `1px solid ${THEME.borderRiver}`,
    padding: '20px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
    marginBottom: '24px'
  };

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
              backgroundColor: THEME.lakeBlueMuted,
              border: '1px solid rgba(53, 184, 232, 0.3)',
              borderRadius: '10px',
              color: THEME.lakeBlue,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Network size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, letterSpacing: '-0.3px', color: '#fff' }}>
                Apriori Association Rule Mining
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  backgroundColor: currentDataset === 'synthetic' ? THEME.amberMuted : THEME.emeraldMuted,
                  color: currentDataset === 'synthetic' ? THEME.amber : THEME.emerald,
                  border: `1px solid ${currentDataset === 'synthetic' ? 'rgba(233, 180, 76, 0.4)' : 'rgba(45, 212, 191, 0.4)'}`
                }}
              >
                {currentDataset === 'synthetic' ? 'SYNTHETIC DATASET' : 'REAL CHICAGO DATASET'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', color: THEME.textMuted, fontSize: '13px' }}>
              Discover frequent co-occurrence itemsets, market basket patterns, and conditional probability rules across incident transactions.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowEduModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: THEME.lakeBlueMuted,
            color: THEME.lakeBlue,
            border: '1px solid rgba(53, 184, 232, 0.35)',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <BookOpen size={16} />
          <span>Algorithm Theory & Metrics</span>
        </button>
      </div>

      {/* 2. Mining Hyperparameter Control Panel */}
      <div style={cardStyle}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontWeight: 600, fontSize: '14px' }}>
            <Sliders size={18} color={THEME.lakeBlue} />
            <span>Mining Hyperparameters & Categorical Attributes</span>
          </div>
          <button
            onClick={handleReset}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: THEME.bgDeep,
              color: THEME.textMuted,
              border: `1px solid ${THEME.borderRiver}`,
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '11.5px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>
        </div>

        {/* 4 Hyperparameter Controls */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
            marginBottom: '20px'
          }}
        >
          {/* Min Support */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: THEME.textPrimary }}>
                Min Support P(A ∩ B)
              </label>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: THEME.lakeBlueMuted,
                  color: THEME.lakeBlue,
                  border: '1px solid rgba(53, 184, 232, 0.3)'
                }}
              >
                {(minSupport * 100).toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="0.005"
              max="0.30"
              step="0.005"
              value={minSupport}
              disabled={loading}
              onChange={(e) => setMinSupport(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: loading ? 'not-allowed' : 'pointer', accentColor: THEME.lakeBlue }}
            />
            <span style={{ fontSize: '11px', color: THEME.textDim }}>
              Minimum overall incident occurrence percentage (0.5%–30%).
            </span>
          </div>

          {/* Min Confidence */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: THEME.textPrimary }}>
                Min Confidence P(B | A)
              </label>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: THEME.lakeBlueMuted,
                  color: THEME.lakeBlue,
                  border: '1px solid rgba(53, 184, 232, 0.3)'
                }}
              >
                {(minConfidence * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.90"
              step="0.05"
              value={minConfidence}
              disabled={loading}
              onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: loading ? 'not-allowed' : 'pointer', accentColor: THEME.lakeBlue }}
            />
            <span style={{ fontSize: '11px', color: THEME.textDim }}>
              Conditional probability threshold given antecedent (10%–90%).
            </span>
          </div>

          {/* Min Lift */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: THEME.textPrimary }}>
                Min Lift (Ratio)
              </label>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: THEME.lakeBlueMuted,
                  color: THEME.lakeBlue,
                  border: '1px solid rgba(53, 184, 232, 0.3)'
                }}
              >
                {minLift.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.1"
              value={minLift}
              disabled={loading}
              onChange={(e) => setMinLift(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: loading ? 'not-allowed' : 'pointer', accentColor: THEME.lakeBlue }}
            />
            <span style={{ fontSize: '11px', color: THEME.textDim }}>
              Co-occurrence multiplier above expected random chance (&gt;1.0x).
            </span>
          </div>

          {/* Max Itemset Length */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: THEME.textPrimary }}>
                Max Itemset Length
              </label>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: THEME.lakeBlueMuted,
                  color: THEME.lakeBlue,
                  border: '1px solid rgba(53, 184, 232, 0.3)'
                }}
              >
                {maxLen} Items
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[2, 3, 4, 5].map((len) => (
                <button
                  key={len}
                  disabled={loading}
                  onClick={() => setMaxLen(len)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    backgroundColor: maxLen === len ? THEME.lakeBlue : THEME.bgDeep,
                    color: maxLen === len ? '#08101C' : THEME.textMuted,
                    border: `1px solid ${maxLen === len ? THEME.lakeBlue : THEME.borderRiver}`,
                    transition: 'all 0.2s'
                  }}
                >
                  {len}
                </button>
              ))}
            </div>
            <span style={{ fontSize: '11px', color: THEME.textDim }}>
              Combinatorial pruning limit to prevent memory exhaustion.
            </span>
          </div>
        </div>

        {/* Attribute Selector Toggles */}
        <div style={{ borderTop: `1px solid ${THEME.borderRiver}`, paddingTop: '16px', marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: THEME.textPrimary, display: 'block', marginBottom: '10px' }}>
            Mining Categorical Attributes ({selectedAttributes.length}/{Object.keys(availableAttrMap).length} active):
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {Object.entries(availableAttrMap).map(([key, label]) => {
              const isSelected = selectedAttributes.includes(key);
              return (
                <button
                  key={key}
                  disabled={loading}
                  onClick={() => toggleAttribute(key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    backgroundColor: isSelected ? THEME.lakeBlueMuted : THEME.bgDeep,
                    border: `1px solid ${isSelected ? THEME.lakeBlue : THEME.borderRiver}`,
                    color: isSelected ? THEME.lakeBlue : THEME.textMuted,
                    transition: 'all 0.2s'
                  }}
                >
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '3px',
                      border: `1px solid ${isSelected ? THEME.lakeBlue : THEME.borderRiver}`,
                      backgroundColor: isSelected ? THEME.lakeBlue : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isSelected && <span style={{ color: '#08101C', fontSize: '10px', fontWeight: 800 }}>✓</span>}
                  </div>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Execute Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px' }}>
          <button
            onClick={runAnalysis}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: THEME.lakeBlue,
              color: '#08101C',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 24px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 16px rgba(53, 184, 232, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="#08101C" />}
            <span>{loading ? `Mining Rules (${elapsedSeconds.toFixed(1)}s)...` : 'Execute Apriori Mining'}</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            backgroundColor: THEME.alertRedMuted,
            border: '1px solid rgba(231, 111, 116, 0.4)',
            borderRadius: '10px',
            padding: '14px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: THEME.alertRed
          }}
        >
          <AlertCircle size={20} />
          <span style={{ fontSize: '13px' }}>{error}</span>
        </div>
      )}

      {/* 3. KPI Summary Cards */}
      {analysisResult && (
        <div
          className="dashboard-grid"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}
        >
          <KPICard
            title="Transactions Analyzed"
            value={analysisResult.kpi.total_transactions.toLocaleString()}
            subtitle="Warehouse incident records"
            icon={Database}
            accentColor="lake"
          />
          <KPICard
            title="Frequent Itemsets"
            value={analysisResult.kpi.frequent_itemsets_count.toLocaleString()}
            subtitle={`≥ ${(minSupport * 100).toFixed(1)}% support threshold`}
            icon={Layers}
            accentColor="lake"
          />
          <KPICard
            title="Association Rules"
            value={analysisResult.kpi.rules_generated_count.toLocaleString()}
            subtitle="Pruned high-confidence rules"
            icon={Network}
            accentColor="emerald"
          />
          <KPICard
            title="Highest Lift"
            value={`${analysisResult.kpi.highest_lift.toFixed(2)}x`}
            subtitle="Strongest co-occurrence signal"
            icon={TrendingUp}
            accentColor="amber"
          />
          <KPICard
            title="Average Confidence"
            value={`${analysisResult.kpi.avg_confidence.toFixed(1)}%`}
            subtitle="Mean conditional probability"
            icon={Zap}
            accentColor="river"
          />
        </div>
      )}

      {/* 4. Discovered Patterns & Rule Metrics Distribution (2-Column Grid) */}
      {analysisResult && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          
          {/* Left Panel: Strongest Association Rules Highlight */}
          <div style={{ ...cardStyle, marginBottom: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderBottom: `1px solid ${THEME.borderRiver}`,
                paddingBottom: '12px',
                marginBottom: '16px'
              }}
            >
              <Sparkles size={18} color={THEME.amber} />
              <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: '#fff' }}>
                Strongest Discovered Association Rules (Top Lift)
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto' }}>
              {analysisResult.top_rules && analysisResult.top_rules.map((rule, idx) => {
                const isSelected = selectedRule && selectedRule.rule_id === rule.rule_id;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedRule(rule)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? 'rgba(53, 184, 232, 0.12)' : THEME.bgDeep,
                      border: `1px solid ${isSelected ? THEME.lakeBlue : THEME.borderRiver}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: THEME.lakeBlue, backgroundColor: THEME.lakeBlueMuted, padding: '2px 8px', borderRadius: '4px' }}>
                        RULE #{rule.rule_id}
                      </span>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '11.5px', fontWeight: 600 }}>
                        <span style={{ color: THEME.emerald, backgroundColor: THEME.emeraldMuted, padding: '2px 8px', borderRadius: '4px' }}>
                          Lift: {rule.lift}x
                        </span>
                        <span style={{ color: THEME.amber, backgroundColor: THEME.amberMuted, padding: '2px 8px', borderRadius: '4px' }}>
                          Conf: {rule.confidence_pct}%
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                      {cleanRuleLabel(rule.rule_label)}
                    </div>

                    <p style={{ margin: 0, fontSize: '11.5px', color: THEME.textMuted, lineHeight: 1.5 }}>
                      {rule.explanation}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Support vs. Confidence Scatterplot */}
          <div style={{ ...cardStyle, marginBottom: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                borderBottom: `1px solid ${THEME.borderRiver}`,
                paddingBottom: '12px',
                marginBottom: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color={THEME.lakeBlue} />
                <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: '#fff' }}>
                  Rule Metrics Distribution (Support vs. Confidence)
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: THEME.textMuted }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: THEME.emerald }} /> Lift ≥ 2.5x
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: THEME.lakeBlue }} /> Lift ≥ 1.5x
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: THEME.amber }} /> Lift ≥ 1.1x
                </span>
              </div>
            </div>

            {analysisResult.scatter_data && analysisResult.scatter_data.length > 0 ? (
              <div style={{ height: '350px', minHeight: '350px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 15, right: 20, bottom: 25, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E3758" />
                    <XAxis
                      type="number"
                      dataKey="support"
                      name="Support"
                      unit="%"
                      stroke={THEME.textDim}
                      tick={{ fill: THEME.textMuted, fontSize: 10 }}
                      domain={['auto', 'auto']}
                      label={{ value: 'Support P(A ∩ B) %', position: 'insideBottom', offset: -12, fill: THEME.textMuted, fontSize: 11 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="confidence"
                      name="Confidence"
                      unit="%"
                      stroke={THEME.textDim}
                      tick={{ fill: THEME.textMuted, fontSize: 10 }}
                      domain={[0, 100]}
                      label={{ value: 'Confidence P(B | A) %', angle: -90, position: 'insideLeft', fill: THEME.textMuted, fontSize: 11 }}
                    />
                    <ZAxis type="number" dataKey="lift" range={[80, 360]} name="Lift" />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div
                              style={{
                                backgroundColor: THEME.bgDeep,
                                border: `1px solid ${THEME.borderRiver}`,
                                borderRadius: '8px',
                                padding: '10px 14px',
                                fontSize: '11.5px',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                maxWidth: '320px'
                              }}
                            >
                              <p style={{ fontWeight: 700, color: THEME.lakeBlue, margin: 0 }}>
                                {cleanRuleLabel(data.rule_label)}
                              </p>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginTop: '6px' }}>
                                <div>Support: <strong style={{ color: '#fff' }}>{data.support}%</strong></div>
                                <div>Confidence: <strong style={{ color: '#fff' }}>{data.confidence}%</strong></div>
                                <div>Lift: <strong style={{ color: THEME.emerald }}>{data.lift}x</strong></div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter
                      data={analysisResult.scatter_data}
                      onClick={(point) => {
                        const match = analysisResult.rules.find(r => r.rule_id === point.id);
                        if (match) setSelectedRule(match);
                      }}
                    >
                      {analysisResult.scatter_data.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getLiftColor(entry.lift)}
                          stroke="#08101C"
                          strokeWidth={1}
                          style={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.textDim, fontSize: '13px' }}>
                No association rule points available for current thresholds.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Selected Rule Inspector Panel */}
      {selectedRule && (
        <div
          style={{
            ...cardStyle,
            borderLeft: `4px solid ${THEME.lakeBlue}`,
            backgroundColor: 'rgba(16, 27, 46, 0.95)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: `1px solid ${THEME.borderRiver}`, paddingBottom: '14px', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: THEME.lakeBlue, backgroundColor: THEME.lakeBlueMuted, padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  RULE #{selectedRule.rule_id}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: THEME.textMuted }}>
                  Selected Rule Inspector
                </span>
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: '8px 0 4px' }}>
                {cleanRuleLabel(selectedRule.rule_label)}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: THEME.textMuted, lineHeight: 1.5 }}>
                {selectedRule.explanation}
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, backgroundColor: THEME.emeraldMuted, color: THEME.emerald }}>
                Lift: {selectedRule.lift}x
              </span>
              <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, backgroundColor: THEME.amberMuted, color: THEME.amber }}>
                Conf: {selectedRule.confidence_pct}%
              </span>
            </div>
          </div>

          {/* 4 Rule Metric Tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: THEME.bgDeep, padding: '14px', borderRadius: '8px', border: `1px solid ${THEME.borderRiver}` }}>
              <div style={{ fontSize: '11.5px', color: THEME.textDim, fontWeight: 600 }}>Support P(A ∩ B)</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: '4px 0' }}>{selectedRule.support_pct}%</div>
              <span style={{ fontSize: '11px', color: THEME.textMuted }}>Joint occurrence frequency across all incidents</span>
            </div>

            <div style={{ backgroundColor: THEME.bgDeep, padding: '14px', borderRadius: '8px', border: `1px solid ${THEME.borderRiver}` }}>
              <div style={{ fontSize: '11.5px', color: THEME.textDim, fontWeight: 600 }}>Confidence P(B | A)</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: THEME.amber, margin: '4px 0' }}>{selectedRule.confidence_pct}%</div>
              <span style={{ fontSize: '11px', color: THEME.textMuted }}>Conditional probability of B given antecedent A</span>
            </div>

            <div style={{ backgroundColor: THEME.bgDeep, padding: '14px', borderRadius: '8px', border: `1px solid ${THEME.borderRiver}` }}>
              <div style={{ fontSize: '11.5px', color: THEME.textDim, fontWeight: 600 }}>Lift Multiplier</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: THEME.emerald, margin: '4px 0' }}>{selectedRule.lift}x</div>
              <span style={{ fontSize: '11px', color: THEME.textMuted }}>Observed vs independent random expectation</span>
            </div>

            <div style={{ backgroundColor: THEME.bgDeep, padding: '14px', borderRadius: '8px', border: `1px solid ${THEME.borderRiver}` }}>
              <div style={{ fontSize: '11.5px', color: THEME.textDim, fontWeight: 600 }}>Supporting Incidents</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: THEME.lakeBlue, margin: '4px 0' }}>
                {selectedRule.supporting_incidents?.toLocaleString() || '--'}
              </div>
              <span style={{ fontSize: '11px', color: THEME.textMuted }}>Direct matching incidents in PostgreSQL warehouse</span>
            </div>
          </div>

          {/* Lift Formula Explanation Note */}
          <div style={{ backgroundColor: THEME.bgDeep, borderRadius: '8px', border: `1px solid ${THEME.borderRiver}`, padding: '12px 16px', marginBottom: '14px', fontSize: '12px', color: THEME.textMuted, lineHeight: 1.5 }}>
            <strong style={{ color: THEME.lakeBlue }}>Mathematical Interpretation of Lift:</strong> Lift is calculated as{' '}
            <code style={{ fontFamily: 'monospace', color: THEME.textPrimary, background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
              Lift(A ⇒ B) = P(B | A) / P(B)
            </code>
            . A lift of <strong>{selectedRule.lift}x</strong> indicates that when antecedent <em>{selectedRule.antecedent_str}</em> occurs, consequent <em>{selectedRule.consequent_str}</em> is {selectedRule.lift} times more likely to be present than its general base rate across the city.
          </div>

          {/* Civic Warning Callout */}
          <div
            style={{
              backgroundColor: 'rgba(233, 180, 76, 0.08)',
              border: '1px solid rgba(233, 180, 76, 0.3)',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '12px',
              color: THEME.amber,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}
          >
            <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              <strong>Civic Data Science Warning:</strong> Association does NOT imply causation. A high lift value indicates that these attributes frequently co-occur together in Chicago police records, not that one factor causes another. Operational decisions must account for reporting practices and spatial context.
            </span>
          </div>
        </div>
      )}

      {/* 6. Frequent Itemsets Panel (Full-Width Responsive Table) */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color={THEME.lakeBlue} />
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: '#fff' }}>
                Frequent Itemsets (Downward Closure Verified)
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: THEME.textMuted, margin: '4px 0 0' }}>
              Combinations of categorical attributes meeting minimum support threshold of {(minSupport * 100).toFixed(1)}%.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: THEME.textDim }} />
              <input
                type="text"
                placeholder="Filter itemset..."
                value={itemsetSearch}
                onChange={(e) => setItemsetSearch(e.target.value)}
                style={{
                  padding: '7px 12px 7px 30px',
                  backgroundColor: THEME.bgDeep,
                  border: `1px solid ${THEME.borderRiver}`,
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Sort Selector */}
            <select
              value={itemsetSortField}
              onChange={(e) => setItemsetSortField(e.target.value)}
              style={{
                padding: '7px 12px',
                backgroundColor: THEME.bgDeep,
                border: `1px solid ${THEME.borderRiver}`,
                borderRadius: '6px',
                color: '#fff',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="frequency">Sort: Incident Count (High to Low)</option>
              <option value="support">Sort: Support % (High to Low)</option>
              <option value="size">Sort: Itemset Size (k-itemsets)</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto', maxHeight: '420px', borderRadius: '8px', border: `1px solid ${THEME.borderRiver}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${THEME.borderRiver}`, color: THEME.textMuted, backgroundColor: THEME.bgDeep }}>
                <th style={{ padding: '12px 16px' }}>Itemset (k-itemset)</th>
                <th style={{ padding: '12px 16px' }}>Length</th>
                <th style={{ padding: '12px 16px' }}>Support Percentage</th>
                <th style={{ padding: '12px 16px' }}>Incident Frequency</th>
              </tr>
            </thead>
            <tbody>
              {filteredItemsets.length > 0 ? (
                filteredItemsets.map((item, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: `1px solid ${THEME.borderRiver}`,
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: THEME.textPrimary }}>
                      {item.itemset_str}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', padding: '2px 8px', borderRadius: '4px', backgroundColor: THEME.bgDeep, color: THEME.lakeBlue, border: `1px solid ${THEME.borderRiver}` }}>
                        {item.size}-item
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: THEME.emerald }}>
                      {item.support_pct}%
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: THEME.textMuted }}>
                      {item.frequency.toLocaleString()} incidents
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: THEME.textDim }}>
                    No frequent itemsets found matching search filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Complete Association Rules Table Panel */}
      {analysisResult && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TableIcon size={18} color={THEME.lakeBlue} />
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: '#fff' }}>
                  Discovered Association Rules Table
                </h3>
              </div>
              <p style={{ fontSize: '12px', color: THEME.textMuted, margin: '4px 0 0' }}>
                Showing {filteredRules.length} rules meeting support ≥ {(minSupport * 100).toFixed(1)}% and confidence ≥ {(minConfidence * 100).toFixed(0)}%.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Search Box */}
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: THEME.textDim }} />
                <input
                  type="text"
                  placeholder="Filter rules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '7px 12px 7px 30px',
                    backgroundColor: THEME.bgDeep,
                    border: `1px solid ${THEME.borderRiver}`,
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Sort Selector */}
              <select
                value={ruleSortField}
                onChange={(e) => setRuleSortField(e.target.value)}
                style={{
                  padding: '7px 12px',
                  backgroundColor: THEME.bgDeep,
                  border: `1px solid ${THEME.borderRiver}`,
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '12px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="lift">Sort: Lift (High to Low)</option>
                <option value="confidence">Sort: Confidence (High to Low)</option>
                <option value="support">Sort: Support (High to Low)</option>
                <option value="leverage">Sort: Leverage (High to Low)</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '460px', borderRadius: '8px', border: `1px solid ${THEME.borderRiver}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${THEME.borderRiver}`, color: THEME.textMuted, backgroundColor: THEME.bgDeep }}>
                  <th style={{ padding: '12px 14px' }}>Rule ID</th>
                  <th style={{ padding: '12px 14px' }}>Antecedent (A)</th>
                  <th style={{ padding: '12px 14px' }}>Consequent (B)</th>
                  <th style={{ padding: '12px 14px' }}>Support P(A ∩ B)</th>
                  <th style={{ padding: '12px 14px' }}>Confidence P(B | A)</th>
                  <th style={{ padding: '12px 14px' }}>Lift Ratio</th>
                  <th style={{ padding: '12px 14px' }}>Leverage</th>
                  <th style={{ padding: '12px 14px' }}>Incidents</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.length > 0 ? (
                  filteredRules.map((rule) => {
                    const isSelected = selectedRule && selectedRule.rule_id === rule.rule_id;
                    return (
                      <tr
                        key={rule.rule_id}
                        onClick={() => setSelectedRule(rule)}
                        style={{
                          borderBottom: `1px solid ${THEME.borderRiver}`,
                          backgroundColor: isSelected ? 'rgba(53, 184, 232, 0.15)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.15s'
                        }}
                      >
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: THEME.lakeBlue, fontWeight: 700 }}>
                          #{rule.rule_id}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#fff', fontWeight: 600 }}>
                          {rule.antecedent_str}
                        </td>
                        <td style={{ padding: '12px 14px', color: THEME.emerald, fontWeight: 600 }}>
                          {rule.consequent_str}
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace' }}>
                          {rule.support_pct}%
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 600, color: THEME.amber }}>
                          {rule.confidence_pct}%
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: getLiftColor(rule.lift) }}>
                          {rule.lift}x
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: THEME.textDim }}>
                          {rule.leverage}
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: THEME.textMuted }}>
                          {rule.supporting_incidents?.toLocaleString() || '--'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: THEME.textDim }}>
                      No association rules found matching search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. Educational Theory Modal */}
      {showEduModal && explanationData && (
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
                  {explanationData.title}
                </h3>
              </div>
              <button
                onClick={() => setShowEduModal(false)}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div style={{ backgroundColor: THEME.lakeBlueMuted, border: '1px solid rgba(53, 184, 232, 0.25)', borderRadius: '8px', padding: '12px 16px' }}>
                <span style={{ fontWeight: 700, color: THEME.lakeBlue }}>Downward Closure (Apriori Property):</span>
                <p style={{ margin: '4px 0 0', color: THEME.textMuted, lineHeight: 1.5 }}>
                  {explanationData.apriori_property || "If an itemset is frequent, all of its subsets must also be frequent. Conversely, if an itemset is infrequent, all of its supersets are pruned immediately, drastically reducing search space."}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
                {explanationData.concepts && explanationData.concepts.map((concept, idx) => (
                  <div key={idx} style={{ backgroundColor: THEME.bgDeep, borderRadius: '8px', border: `1px solid ${THEME.borderRiver}`, padding: '12px' }}>
                    <div style={{ fontWeight: 700, color: THEME.lakeBlue, marginBottom: '2px' }}>
                      {concept.term}
                    </div>
                    {concept.formula && (
                      <code style={{ display: 'block', fontFamily: 'monospace', fontSize: '11px', color: THEME.amber, backgroundColor: '#070C15', padding: '3px 6px', borderRadius: '4px', margin: '4px 0', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {concept.formula}
                      </code>
                    )}
                    <p style={{ margin: 0, fontSize: '11.5px', color: THEME.textMuted, lineHeight: 1.5 }}>
                      {concept.definition}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
