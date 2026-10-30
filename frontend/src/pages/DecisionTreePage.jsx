import React, { useState, useEffect, useRef } from 'react';
import {
  GitBranch,
  Sliders,
  Play,
  RotateCcw,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Info,
  Sparkles,
  Target,
  BarChart2,
  Cpu,
  ShieldAlert,
  Loader2,
  Zap,
  HelpCircle,
  ChevronDown,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';
import {
  fetchDecisionTreeMetadata,
  fetchDecisionTreeTrain,
  fetchDecisionTreeDepthAnalysis,
  fetchDecisionTreeClassifyExample,
  fetchDecisionTreeExplanation,
  getActiveDataset
} from '../services/api';
import { useDataset } from '../context/DatasetContext';

// Color palette constants for Chicago Nightfall
const COLORS = {
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
  textPrimary: '#EAF2FF',
  textMuted: '#94A7C6',
  textDim: '#5E7292',
  borderSubtle: 'rgba(53, 184, 232, 0.14)',
  borderRiver: '#1E3758'
};

// Tree Node Component for Interactive Decision Tree Visualizer
function TreeNodeView({ node, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (!node) return null;

  const isLeaf = node.is_leaf;
  const isYesDominant = node.predicted_class === 'Arrest = YES';

  let bg = COLORS.bgCardElevated;
  let borderColor = 'rgba(53, 184, 232, 0.35)';
  let titleColor = COLORS.lakeBlue;

  if (isLeaf) {
    if (isYesDominant) {
      bg = 'rgba(45, 212, 191, 0.12)';
      borderColor = 'rgba(45, 212, 191, 0.45)';
      titleColor = COLORS.emerald;
    } else {
      bg = 'rgba(16, 27, 46, 0.9)';
      borderColor = '#1E3758';
      titleColor = COLORS.textMuted;
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 8px' }}>
      {/* Node Box */}
      <div
        onClick={() => !isLeaf && setExpanded(!expanded)}
        style={{
          backgroundColor: bg,
          border: `1px solid ${borderColor}`,
          borderRadius: '10px',
          padding: '10px 14px',
          width: '230px',
          cursor: isLeaf ? 'default' : 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
          userSelect: 'none'
        }}
        title={isLeaf ? `Leaf: ${node.predicted_class}` : `Click to ${expanded ? 'collapse' : 'expand'} sub-branches`}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: titleColor,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '150px'
            }}
            title={isLeaf ? node.predicted_class : node.condition}
          >
            {isLeaf ? node.predicted_class : node.condition}
          </span>
          <span
            style={{
              fontSize: '9.5px',
              fontFamily: 'monospace',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: COLORS.bgDeep,
              color: COLORS.textMuted,
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}
          >
            N={node.samples.toLocaleString()}
          </span>
        </div>

        <div style={{ fontSize: '10.5px', color: COLORS.textMuted, display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span>Impurity: <strong style={{ color: COLORS.textPrimary }}>{node.impurity}</strong></span>
          <span>P(YES): <strong style={{ color: COLORS.emerald }}>{node.prob_yes}%</strong></span>
        </div>

        {/* Mini Class Proportion Bar */}
        <div
          style={{
            width: '100%',
            height: '6px',
            backgroundColor: COLORS.bgDeep,
            borderRadius: '9999px',
            overflow: 'hidden',
            display: 'flex'
          }}
        >
          <div
            style={{
              width: `${node.samples > 0 ? (node.no_count / node.samples) * 100 : 50}%`,
              backgroundColor: '#475569',
              height: '100%'
            }}
            title={`Arrest NO: ${node.no_count.toLocaleString()}`}
          />
          <div
            style={{
              width: `${node.samples > 0 ? (node.yes_count / node.samples) * 100 : 50}%`,
              backgroundColor: COLORS.emerald,
              height: '100%'
            }}
            title={`Arrest YES: ${node.yes_count.toLocaleString()}`}
          />
        </div>
      </div>

      {/* Children Nodes */}
      {!isLeaf && expanded && (node.left || node.right) && (
        <div
          style={{
            display: 'flex',
            gap: '16px',
            paddingTop: '12px',
            position: 'relative',
            borderTop: '1px solid rgba(53, 184, 232, 0.25)',
            marginTop: '8px'
          }}
        >
          {node.left && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '9.5px',
                  fontFamily: 'monospace',
                  color: COLORS.lakeBlue,
                  backgroundColor: COLORS.lakeBlueMuted,
                  border: '1px solid rgba(53, 184, 232, 0.3)',
                  padding: '1px 6px',
                  borderRadius: '3px',
                  marginBottom: '6px'
                }}
              >
                True (≤)
              </span>
              <TreeNodeView node={node.left} depth={depth + 1} />
            </div>
          )}
          {node.right && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '9.5px',
                  fontFamily: 'monospace',
                  color: COLORS.amber,
                  backgroundColor: COLORS.amberMuted,
                  border: '1px solid rgba(233, 180, 76, 0.3)',
                  padding: '1px 6px',
                  borderRadius: '3px',
                  marginBottom: '6px'
                }}
              >
                False (&gt;)
              </span>
              <TreeNodeView node={node.right} depth={depth + 1} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DecisionTreePage() {
  const datasetContext = useDataset();
  const currentDataset = datasetContext?.dataset || getActiveDataset();

  // Parameter Configuration State (Default: depth=5, split=20, leaf=10, gini, None)
  const [maxDepth, setMaxDepth] = useState(5);
  const [minSamplesSplit, setMinSamplesSplit] = useState(20);
  const [minSamplesLeaf, setMinSamplesLeaf] = useState(10);
  const [criterion, setCriterion] = useState('gini');
  const [classWeight, setClassWeight] = useState('None');

  // Loading, Timer & Execution State
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastExecutionInfo, setLastExecutionInfo] = useState(null);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  // Metadata & Model Results State
  const [metadata, setMetadata] = useState(null);
  const [trainResult, setTrainResult] = useState(null);
  const [depthCurve, setDepthCurve] = useState(null);
  const [explanationData, setExplanationData] = useState(null);
  const [showEduModal, setShowEduModal] = useState(false);

  // Single Incident Predictor State
  const [predictLoading, setPredictLoading] = useState(false);
  const [predictResult, setPredictResult] = useState(null);
  const [predictInput, setPredictInput] = useState({
    primary_type: 'THEFT',
    premise: 'STREET',
    district: '001',
    community_area: '32',
    hour: 14,
    day_of_week: 'Friday',
    month: 6,
    is_weekend: false,
    is_domestic: false
  });

  // Handle Training Execution with Live Elapsed Timer
  const runTraining = async (params = null) => {
    if (loading) return; // Prevent concurrent submissions
    setLoading(true);
    setError(null);
    setElapsedSeconds(0);

    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Number(((Date.now() - startTime) / 1000).toFixed(1)));
    }, 100);

    const depthToUse = params?.maxDepth ?? maxDepth;
    const splitToUse = params?.minSamplesSplit ?? minSamplesSplit;
    const leafToUse = params?.minSamplesLeaf ?? minSamplesLeaf;
    const critToUse = params?.criterion ?? criterion;
    const cwToUse = params?.classWeight ?? classWeight;

    try {
      const payload = {
        dataset: currentDataset,
        max_depth: parseInt(depthToUse, 10),
        min_samples_split: parseInt(splitToUse, 10),
        min_samples_leaf: parseInt(leafToUse, 10),
        criterion: critToUse,
        class_weight: cwToUse === 'balanced' ? 'balanced' : null
      };

      const [resTrain, resDepth] = await Promise.all([
        fetchDecisionTreeTrain(payload),
        fetchDecisionTreeDepthAnalysis(payload)
      ]);

      setTrainResult(resTrain);
      setDepthCurve(resDepth);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      setLastExecutionInfo({
        durationSeconds: duration,
        timestamp: new Date().toLocaleTimeString(),
        trainSamples: resTrain?.dataset_summary?.train_size || 28000,
        testSamples: resTrain?.dataset_summary?.test_size || 7000
      });
    } catch (err) {
      console.error('Decision Tree training error:', err);
      setError(err.message || 'Failed to train Decision Tree model.');
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setLoading(false);
    }
  };

  // Initial Data Load and Dataset Switch Watcher
  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      try {
        const [meta, exp] = await Promise.all([
          fetchDecisionTreeMetadata(currentDataset),
          fetchDecisionTreeExplanation()
        ]);
        if (isMounted) {
          setMetadata(meta);
          setExplanationData(exp);
        }
      } catch (err) {
        console.error('Error fetching DT metadata/explanation:', err);
      }
      if (isMounted) {
        runTraining();
      }
    }

    loadInitial();

    return () => {
      isMounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentDataset]);

  // Reset Defaults Handler
  const handleReset = () => {
    setMaxDepth(5);
    setMinSamplesSplit(20);
    setMinSamplesLeaf(10);
    setCriterion('gini');
    setClassWeight('None');
  };

  // Single Incident Predictor Handler
  const handlePredict = async () => {
    setPredictLoading(true);
    try {
      const res = await fetchDecisionTreeClassifyExample({
        ...predictInput,
        dataset: currentDataset,
        max_depth: parseInt(maxDepth, 10)
      });
      setPredictResult(res);
    } catch (err) {
      console.error('Error classifying incident:', err);
    } finally {
      setPredictLoading(false);
    }
  };

  // Common card style
  const cardStyle = {
    backgroundColor: COLORS.bgCard,
    borderRadius: '12px',
    border: `1px solid ${COLORS.borderRiver}`,
    padding: '20px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
    marginBottom: '24px'
  };

  const inputControlStyle = {
    backgroundColor: COLORS.bgDeep,
    border: `1px solid ${COLORS.borderRiver}`,
    borderRadius: '8px',
    color: COLORS.textPrimary,
    padding: '8px 12px',
    fontSize: '12px',
    outline: 'none',
    width: '100%'
  };

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px', color: COLORS.textPrimary }}>
      {/* 1. Page Header & Dataset Badge */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          background: 'linear-gradient(135deg, rgba(23, 54, 93, 0.4) 0%, rgba(16, 27, 46, 0.95) 100%)',
          border: `1px solid ${COLORS.borderRiver}`,
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
              backgroundColor: COLORS.lakeBlueMuted,
              border: '1px solid rgba(53, 184, 232, 0.3)',
              borderRadius: '10px',
              color: COLORS.lakeBlue,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <GitBranch size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, letterSpacing: '-0.3px', color: '#fff' }}>
                Decision Tree Classification Engine
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  backgroundColor: currentDataset === 'synthetic' ? COLORS.amberMuted : COLORS.emeraldMuted,
                  color: currentDataset === 'synthetic' ? COLORS.amber : COLORS.emerald,
                  border: `1px solid ${currentDataset === 'synthetic' ? 'rgba(233, 180, 76, 0.4)' : 'rgba(45, 212, 191, 0.4)'}`
                }}
              >
                {currentDataset === 'synthetic' ? 'SYNTHETIC DATASET' : 'REAL CHICAGO DATASET'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', color: COLORS.textMuted, fontSize: '13px' }}>
              Supervised classification predicting historical <strong style={{ color: COLORS.textPrimary }}>Arrest Outcomes</strong> using zero-leakage scikit-learn decision tree pipelines.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowEduModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: COLORS.lakeBlueMuted,
            color: COLORS.lakeBlue,
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
          <span>Classification Theory</span>
        </button>
      </div>

      {/* 2. Hyperparameter Configuration Card */}
      <div style={cardStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${COLORS.borderRiver}`,
            paddingBottom: '14px',
            marginBottom: '18px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontWeight: 600, fontSize: '14px' }}>
            <Sliders size={18} color={COLORS.lakeBlue} />
            <span>Hyperparameter Configuration</span>
          </div>
          <button
            onClick={handleReset}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: COLORS.bgDeep,
              color: COLORS.textMuted,
              border: `1px solid ${COLORS.borderRiver}`,
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '11.5px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'background 0.2s'
            }}
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>
        </div>

        {/* 5-Column Grid for Controls */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '20px'
          }}
        >
          {/* Max Depth */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textPrimary }}>Max Depth</label>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: COLORS.lakeBlueMuted,
                  color: COLORS.lakeBlue,
                  border: '1px solid rgba(53, 184, 232, 0.3)'
                }}
              >
                {maxDepth}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={maxDepth}
              disabled={loading}
              onChange={(e) => setMaxDepth(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                cursor: loading ? 'not-allowed' : 'pointer',
                accentColor: COLORS.lakeBlue
              }}
            />
            <span style={{ fontSize: '11px', color: COLORS.textDim }}>Controls tree depth and overfitting limit (1–15).</span>
          </div>

          {/* Min Samples Split */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textPrimary }}>Min Samples Split</label>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: COLORS.lakeBlueMuted,
                  color: COLORS.lakeBlue,
                  border: '1px solid rgba(53, 184, 232, 0.3)'
                }}
              >
                {minSamplesSplit}
              </span>
            </div>
            <input
              type="range"
              min="2"
              max="100"
              step="2"
              value={minSamplesSplit}
              disabled={loading}
              onChange={(e) => setMinSamplesSplit(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                cursor: loading ? 'not-allowed' : 'pointer',
                accentColor: COLORS.lakeBlue
              }}
            />
            <span style={{ fontSize: '11px', color: COLORS.textDim }}>Minimum node samples required to split (2–100).</span>
          </div>

          {/* Min Samples Leaf */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textPrimary }}>Min Samples Leaf</label>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: COLORS.lakeBlueMuted,
                  color: COLORS.lakeBlue,
                  border: '1px solid rgba(53, 184, 232, 0.3)'
                }}
              >
                {minSamplesLeaf}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={minSamplesLeaf}
              disabled={loading}
              onChange={(e) => setMinSamplesLeaf(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                cursor: loading ? 'not-allowed' : 'pointer',
                accentColor: COLORS.lakeBlue
              }}
            />
            <span style={{ fontSize: '11px', color: COLORS.textDim }}>Minimum samples required at a leaf node (1–50).</span>
          </div>

          {/* Split Criterion */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textPrimary }}>Split Criterion</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['gini', 'entropy'].map((crit) => (
                <button
                  key={crit}
                  disabled={loading}
                  onClick={() => setCriterion(crit)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    backgroundColor: criterion === crit ? COLORS.lakeBlue : COLORS.bgDeep,
                    color: criterion === crit ? '#08101C' : COLORS.textMuted,
                    border: `1px solid ${criterion === crit ? COLORS.lakeBlue : COLORS.borderRiver}`,
                    transition: 'all 0.2s'
                  }}
                >
                  {crit}
                </button>
              ))}
            </div>
            <span style={{ fontSize: '11px', color: COLORS.textDim }}>Node impurity metric (Gini vs Shannon Entropy).</span>
          </div>

          {/* Class Weight */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textPrimary }}>Class Weight</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['None', 'balanced'].map((cw) => (
                <button
                  key={cw}
                  disabled={loading}
                  onClick={() => setClassWeight(cw)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    backgroundColor: classWeight === cw ? COLORS.lakeBlue : COLORS.bgDeep,
                    color: classWeight === cw ? '#08101C' : COLORS.textMuted,
                    border: `1px solid ${classWeight === cw ? COLORS.lakeBlue : COLORS.borderRiver}`,
                    transition: 'all 0.2s'
                  }}
                >
                  {cw}
                </button>
              ))}
            </div>
            <span style={{ fontSize: '11px', color: COLORS.textDim }}>Inversely weights samples to counteract 86/14 skew.</span>
          </div>
        </div>

        {/* Action Button & Live Progress */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px', paddingTop: '10px' }}>
          <button
            onClick={() => runTraining()}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: COLORS.lakeBlue,
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
            <span>{loading ? `Training Pipeline (${elapsedSeconds.toFixed(1)}s)...` : 'Run Classification'}</span>
          </button>
        </div>
      </div>

      {/* 3. Training Feedback Banners */}
      {loading && (
        <div
          style={{
            backgroundColor: 'rgba(53, 184, 232, 0.08)',
            border: '1px solid rgba(53, 184, 232, 0.3)',
            borderRadius: '10px',
            padding: '14px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <Loader2 size={18} color={COLORS.lakeBlue} className="animate-spin" />
          <div style={{ fontSize: '13px', color: COLORS.textPrimary }}>
            <strong>Fitting Decision Tree pipeline... ({elapsedSeconds.toFixed(1)}s elapsed)</strong>
            <span style={{ color: COLORS.textMuted, marginLeft: '8px' }}>
              Stratified 80/20 partition → OneHotEncoder categorical transformation → Scikit-Learn CART fitting
            </span>
          </div>
        </div>
      )}

      {lastExecutionInfo && !loading && !error && (
        <div
          style={{
            backgroundColor: 'rgba(45, 212, 191, 0.08)',
            border: '1px solid rgba(45, 212, 191, 0.25)',
            borderRadius: '10px',
            padding: '12px 18px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={18} color={COLORS.emerald} />
            <span style={{ fontSize: '12.5px', color: COLORS.textPrimary }}>
              Model fitted in <strong>{lastExecutionInfo.durationSeconds}s</strong> on{' '}
              <strong>{lastExecutionInfo.trainSamples.toLocaleString()}</strong> training incidents (
              {lastExecutionInfo.testSamples.toLocaleString()} test).
            </span>
          </div>
          <span style={{ fontSize: '11.5px', color: COLORS.textMuted }}>
            Completed at {lastExecutionInfo.timestamp}
          </span>
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: COLORS.alertRedMuted,
            border: '1px solid rgba(231, 111, 116, 0.4)',
            borderRadius: '10px',
            padding: '14px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: COLORS.alertRed
          }}
        >
          <AlertCircle size={20} />
          <span style={{ fontSize: '13px' }}>{error}</span>
        </div>
      )}

      {/* 4. KPI Summary Cards */}
      {metadata && trainResult && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}
        >
          {/* Warehouse Census */}
          <div style={{ ...cardStyle, padding: '16px', marginBottom: 0 }}>
            <span style={{ fontSize: '11.5px', color: COLORS.textMuted, fontWeight: 500 }}>Census Scope</span>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', margin: '6px 0 2px' }}>
              {metadata.total_records.toLocaleString()}
            </div>
            <span style={{ fontSize: '11px', color: COLORS.textDim }}>PostgreSQL fact rows</span>
          </div>

          {/* Sample Bounded Partition */}
          <div style={{ ...cardStyle, padding: '16px', marginBottom: 0 }}>
            <span style={{ fontSize: '11.5px', color: COLORS.textMuted, fontWeight: 500 }}>Training Partition</span>
            <div style={{ fontSize: '22px', fontWeight: 700, color: COLORS.lakeBlue, margin: '6px 0 2px' }}>
              {trainResult.dataset_summary.total_records.toLocaleString()}
            </div>
            <span style={{ fontSize: '11px', color: COLORS.textDim }}>
              {trainResult.dataset_summary.train_size.toLocaleString()} train / {trainResult.dataset_summary.test_size.toLocaleString()} test
            </span>
          </div>

          {/* Class Balance */}
          <div style={{ ...cardStyle, padding: '16px', marginBottom: 0 }}>
            <span style={{ fontSize: '11.5px', color: COLORS.textMuted, fontWeight: 500 }}>Class Balance (Census)</span>
            <div style={{ fontSize: '15px', fontWeight: 700, color: COLORS.textPrimary, margin: '8px 0 4px', display: 'flex', gap: '6px' }}>
              <span>{metadata.arrest_no_pct}% NO</span>
              <span style={{ color: COLORS.textDim }}>/</span>
              <span style={{ color: COLORS.emerald }}>{metadata.arrest_yes_pct}% YES</span>
            </div>
            <span style={{ fontSize: '11px', color: COLORS.textDim }}>Severe class skew</span>
          </div>

          {/* Test Accuracy */}
          <div style={{ ...cardStyle, padding: '16px', marginBottom: 0 }}>
            <span style={{ fontSize: '11.5px', color: COLORS.textMuted, fontWeight: 500 }}>Test Accuracy</span>
            <div style={{ fontSize: '22px', fontWeight: 700, color: COLORS.emerald, margin: '6px 0 2px' }}>
              {trainResult.metrics.test_accuracy}%
            </div>
            <span style={{ fontSize: '11px', color: COLORS.textDim }}>
              Train: {trainResult.metrics.train_accuracy}% (Gap: {trainResult.metrics.overfitting_gap}%)
            </span>
          </div>

          {/* F1-Score (Arrest YES) */}
          <div style={{ ...cardStyle, padding: '16px', marginBottom: 0 }}>
            <span style={{ fontSize: '11.5px', color: COLORS.textMuted, fontWeight: 500 }}>F1-Score (Arrest = YES)</span>
            <div style={{ fontSize: '22px', fontWeight: 700, color: COLORS.amber, margin: '6px 0 2px' }}>
              {trainResult.metrics.f1_score}%
            </div>
            <span style={{ fontSize: '11px', color: COLORS.textDim }}>
              Prec: {trainResult.metrics.precision}% | Rec: {trainResult.metrics.recall}%
            </span>
          </div>

          {/* Majority Baseline */}
          <div style={{ ...cardStyle, padding: '16px', marginBottom: 0 }}>
            <span style={{ fontSize: '11.5px', color: COLORS.textMuted, fontWeight: 500 }}>Majority Baseline</span>
            <div style={{ fontSize: '22px', fontWeight: 700, color: COLORS.textMuted, margin: '6px 0 2px' }}>
              {trainResult.dataset_summary.majority_baseline_acc}%
            </div>
            <span style={{ fontSize: '11px', color: COLORS.textDim }}>Zero-rule naive accuracy</span>
          </div>
        </div>
      )}

      {/* 5. Main Evaluation Dashboard (Confusion Matrix, Feature Importances, Depth Curve) */}
      {trainResult && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            marginBottom: '24px'
          }}
        >
          {/* Card 1: 2x2 Confusion Matrix */}
          <div style={{ ...cardStyle, marginBottom: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderBottom: `1px solid ${COLORS.borderRiver}`,
                paddingBottom: '12px',
                marginBottom: '16px'
              }}
            >
              <Target size={18} color={COLORS.lakeBlue} />
              <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: '#fff' }}>2×2 Confusion Matrix</h2>
            </div>

            {/* Matrix Header Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', gap: '8px', marginBottom: '8px', textAlign: 'center' }}>
              <div />
              <span style={{ fontSize: '11px', fontWeight: 600, color: COLORS.lakeBlue }}>Pred: NO</span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: COLORS.emerald }}>Pred: YES</span>
            </div>

            {/* Row 1: Actual NO */}
            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '11px', fontWeight: 600, color: COLORS.textMuted }}>
                Act: NO
              </div>
              {/* True Negative */}
              <div
                style={{
                  backgroundColor: COLORS.bgDeep,
                  border: `1px solid ${COLORS.borderRiver}`,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '10px', color: COLORS.textDim, fontWeight: 600 }}>True Neg (TN)</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: '4px 0' }}>
                  {trainResult.confusion_matrix.tn.toLocaleString()}
                </div>
                <span style={{ fontSize: '10.5px', color: COLORS.lakeBlue, fontWeight: 600 }}>
                  {trainResult.confusion_matrix.tn_pct}%
                </span>
              </div>
              {/* False Positive */}
              <div
                style={{
                  backgroundColor: COLORS.alertRedMuted,
                  border: '1px solid rgba(231, 111, 116, 0.3)',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '10px', color: COLORS.alertRed, fontWeight: 600 }}>False Pos (FP)</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: COLORS.alertRed, margin: '4px 0' }}>
                  {trainResult.confusion_matrix.fp.toLocaleString()}
                </div>
                <span style={{ fontSize: '10.5px', color: COLORS.alertRed, fontWeight: 600 }}>
                  {trainResult.confusion_matrix.fp_pct}%
                </span>
              </div>
            </div>

            {/* Row 2: Actual YES */}
            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '11px', fontWeight: 600, color: COLORS.emerald }}>
                Act: YES
              </div>
              {/* False Negative */}
              <div
                style={{
                  backgroundColor: COLORS.amberMuted,
                  border: '1px solid rgba(233, 180, 76, 0.3)',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '10px', color: COLORS.amber, fontWeight: 600 }}>False Neg (FN)</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: COLORS.amber, margin: '4px 0' }}>
                  {trainResult.confusion_matrix.fn.toLocaleString()}
                </div>
                <span style={{ fontSize: '10.5px', color: COLORS.amber, fontWeight: 600 }}>
                  {trainResult.confusion_matrix.fn_pct}%
                </span>
              </div>
              {/* True Positive */}
              <div
                style={{
                  backgroundColor: COLORS.emeraldMuted,
                  border: '1px solid rgba(45, 212, 191, 0.3)',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '10px', color: COLORS.emerald, fontWeight: 600 }}>True Pos (TP)</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: COLORS.emerald, margin: '4px 0' }}>
                  {trainResult.confusion_matrix.tp.toLocaleString()}
                </div>
                <span style={{ fontSize: '10.5px', color: COLORS.emerald, fontWeight: 600 }}>
                  {trainResult.confusion_matrix.tp_pct}%
                </span>
              </div>
            </div>

            {/* Sensitivity & Specificity Banner */}
            <div
              style={{
                backgroundColor: COLORS.bgDeep,
                borderRadius: '8px',
                border: `1px solid ${COLORS.borderRiver}`,
                padding: '10px 14px',
                fontSize: '11.5px',
                display: 'flex',
                justifyContent: 'space-between',
                color: COLORS.textMuted
              }}
            >
              <span>Sensitivity (Recall): <strong style={{ color: COLORS.emerald }}>{trainResult.metrics.sensitivity}%</strong></span>
              <span>Specificity: <strong style={{ color: COLORS.lakeBlue }}>{trainResult.metrics.specificity}%</strong></span>
            </div>
          </div>

          {/* Card 2: Feature Importances */}
          <div style={{ ...cardStyle, marginBottom: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderBottom: `1px solid ${COLORS.borderRiver}`,
                paddingBottom: '12px',
                marginBottom: '16px'
              }}
            >
              <BarChart2 size={18} color={COLORS.lakeBlue} />
              <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: '#fff' }}>Top Feature Importances</h2>
            </div>

            {trainResult.feature_importances && trainResult.feature_importances.length > 0 ? (
              <div style={{ height: '240px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={trainResult.feature_importances.slice(0, 7)}
                    margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
                  >
                    <XAxis type="number" stroke={COLORS.textDim} tick={{ fill: COLORS.textMuted, fontSize: 10 }} />
                    <YAxis
                      type="category"
                      dataKey="clean_label"
                      stroke={COLORS.textDim}
                      tick={{ fill: COLORS.textMuted, fontSize: 10 }}
                      width={90}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div
                              style={{
                                backgroundColor: COLORS.bgDeep,
                                border: `1px solid ${COLORS.borderRiver}`,
                                borderRadius: '8px',
                                padding: '8px 12px',
                                fontSize: '11.5px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                              }}
                            >
                              <p style={{ fontWeight: 700, color: '#fff', margin: 0 }}>{data.clean_label}</p>
                              <p style={{ color: COLORS.lakeBlue, margin: '4px 0 0' }}>Gini Importance: {data.importance_pct}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="importance_pct" fill={COLORS.lakeBlue} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textDim, fontSize: '13px' }}>
                No feature importance data available.
              </div>
            )}
          </div>

          {/* Card 3: Overfitting Depth Analysis */}
          <div style={{ ...cardStyle, marginBottom: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: `1px solid ${COLORS.borderRiver}`,
                paddingBottom: '12px',
                marginBottom: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color={COLORS.lakeBlue} />
                <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: '#fff' }}>Overfitting Depth Analysis</h2>
              </div>
              {depthCurve && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '20px',
                    backgroundColor: COLORS.emeraldMuted,
                    color: COLORS.emerald,
                    border: '1px solid rgba(45, 212, 191, 0.3)'
                  }}
                >
                  Optimal Depth: {depthCurve.optimal_depth}
                </span>
              )}
            </div>

            {depthCurve && depthCurve.curve ? (
              <div style={{ height: '240px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={depthCurve.curve} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E3758" />
                    <XAxis
                      dataKey="depth"
                      stroke={COLORS.textDim}
                      tick={{ fill: COLORS.textMuted, fontSize: 10 }}
                      label={{ value: 'max_depth', position: 'insideBottom', offset: -4, fill: COLORS.textMuted, fontSize: 10 }}
                    />
                    <YAxis domain={[50, 100]} stroke={COLORS.textDim} tick={{ fill: COLORS.textMuted, fontSize: 10 }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div
                              style={{
                                backgroundColor: COLORS.bgDeep,
                                border: `1px solid ${COLORS.borderRiver}`,
                                borderRadius: '8px',
                                padding: '8px 12px',
                                fontSize: '11.5px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                              }}
                            >
                              <p style={{ fontWeight: 700, color: '#fff', margin: 0 }}>Depth {data.depth}</p>
                              <p style={{ color: COLORS.lakeBlue, margin: '2px 0' }}>Train Acc: {data.train_accuracy}%</p>
                              <p style={{ color: COLORS.emerald, margin: '2px 0' }}>Test Acc: {data.test_accuracy}%</p>
                              <p style={{ color: COLORS.amber, margin: '2px 0' }}>Generalization Gap: {data.gap}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line type="monotone" dataKey="train_accuracy" name="Train Accuracy" stroke={COLORS.lakeBlue} strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="test_accuracy" name="Test Accuracy" stroke={COLORS.emerald} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textDim, fontSize: '13px' }}>
                Evaluating depth curve...
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Interactive Decision Tree Visualizer */}
      {trainResult && trainResult.tree_structure && (
        <div style={cardStyle}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              borderBottom: `1px solid ${COLORS.borderRiver}`,
              paddingBottom: '14px',
              marginBottom: '18px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontWeight: 600, fontSize: '14px' }}>
              <Cpu size={18} color={COLORS.lakeBlue} />
              <span>Interactive Decision Tree Visualizer</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: COLORS.textMuted }}>
              <span>Total Nodes: <strong style={{ color: '#fff' }}>{trainResult.tree_summary.total_nodes}</strong></span>
              <span>Leaves: <strong style={{ color: '#fff' }}>{trainResult.tree_summary.leaf_count}</strong></span>
              <span>Max Depth: <strong style={{ color: COLORS.lakeBlue }}>{trainResult.tree_summary.depth}</strong></span>
            </div>
          </div>

          <div
            style={{
              backgroundColor: COLORS.bgDeep,
              borderRadius: '10px',
              border: `1px solid ${COLORS.borderRiver}`,
              padding: '24px 16px',
              overflowX: 'auto',
              minHeight: '280px'
            }}
          >
            <div style={{ minWidth: '850px', display: 'flex', justifyContent: 'center' }}>
              <TreeNodeView node={trainResult.tree_structure} depth={0} />
            </div>
          </div>
        </div>
      )}

      {/* 7. Single Incident Inference Sandbox */}
      {metadata && metadata.feature_options && (
        <div style={cardStyle}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: `1px solid ${COLORS.borderRiver}`,
              paddingBottom: '12px',
              marginBottom: '18px'
            }}
          >
            <Sparkles size={18} color={COLORS.amber} />
            <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: '#fff' }}>
              Single Incident Inference Sandbox
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
              marginBottom: '20px'
            }}
          >
            {/* Primary Type */}
            <div>
              <label style={{ fontSize: '11.5px', color: COLORS.textMuted, fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                Primary Crime Category
              </label>
              <select
                value={predictInput.primary_type}
                onChange={(e) => setPredictInput({ ...predictInput, primary_type: e.target.value })}
                style={inputControlStyle}
              >
                {metadata.feature_options.primary_types.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Premise */}
            <div>
              <label style={{ fontSize: '11.5px', color: COLORS.textMuted, fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                Premise Location
              </label>
              <select
                value={predictInput.premise}
                onChange={(e) => setPredictInput({ ...predictInput, premise: e.target.value })}
                style={inputControlStyle}
              >
                {metadata.feature_options.premises.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* District */}
            <div>
              <label style={{ fontSize: '11.5px', color: COLORS.textMuted, fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                Police District
              </label>
              <select
                value={predictInput.district}
                onChange={(e) => setPredictInput({ ...predictInput, district: e.target.value })}
                style={inputControlStyle}
              >
                {metadata.feature_options.districts.map((d) => (
                  <option key={d} value={d}>District {d}</option>
                ))}
              </select>
            </div>

            {/* Day of Week */}
            <div>
              <label style={{ fontSize: '11.5px', color: COLORS.textMuted, fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                Day of Week
              </label>
              <select
                value={predictInput.day_of_week}
                onChange={(e) => setPredictInput({ ...predictInput, day_of_week: e.target.value })}
                style={inputControlStyle}
              >
                {metadata.feature_options.days_of_week.map((day) => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            {/* Hour */}
            <div>
              <label style={{ fontSize: '11.5px', color: COLORS.textMuted, fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                Hour of Day (0–23)
              </label>
              <input
                type="number"
                min="0"
                max="23"
                value={predictInput.hour}
                onChange={(e) => setPredictInput({ ...predictInput, hour: parseInt(e.target.value, 10) || 0 })}
                style={inputControlStyle}
              />
            </div>

            {/* Domestic Flag */}
            <div>
              <label style={{ fontSize: '11.5px', color: COLORS.textMuted, fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                Domestic Status
              </label>
              <button
                type="button"
                onClick={() => setPredictInput({ ...predictInput, is_domestic: !predictInput.is_domestic })}
                style={{
                  ...inputControlStyle,
                  cursor: 'pointer',
                  fontWeight: 600,
                  backgroundColor: predictInput.is_domestic ? COLORS.alertRedMuted : COLORS.bgDeep,
                  color: predictInput.is_domestic ? COLORS.alertRed : COLORS.textMuted,
                  border: `1px solid ${predictInput.is_domestic ? 'rgba(231, 111, 116, 0.4)' : COLORS.borderRiver}`
                }}
              >
                {predictInput.is_domestic ? 'Domestic: YES' : 'Domestic: NO'}
              </button>
            </div>

            {/* Weekend Flag */}
            <div>
              <label style={{ fontSize: '11.5px', color: COLORS.textMuted, fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                Weekend Status
              </label>
              <button
                type="button"
                onClick={() => setPredictInput({ ...predictInput, is_weekend: !predictInput.is_weekend })}
                style={{
                  ...inputControlStyle,
                  cursor: 'pointer',
                  fontWeight: 600,
                  backgroundColor: predictInput.is_weekend ? COLORS.lakeBlueMuted : COLORS.bgDeep,
                  color: predictInput.is_weekend ? COLORS.lakeBlue : COLORS.textMuted,
                  border: `1px solid ${predictInput.is_weekend ? 'rgba(53, 184, 232, 0.4)' : COLORS.borderRiver}`
                }}
              >
                {predictInput.is_weekend ? 'Weekend: YES' : 'Weekend: NO'}
              </button>
            </div>

            {/* Classify Button */}
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={handlePredict}
                disabled={predictLoading}
                style={{
                  width: '100%',
                  padding: '9px 16px',
                  backgroundColor: COLORS.emerald,
                  color: '#08101C',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: predictLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(45, 212, 191, 0.35)',
                  transition: 'all 0.2s'
                }}
              >
                {predictLoading ? 'Classifying...' : 'Classify Incident'}
              </button>
            </div>
          </div>

          {/* Prediction Result Display */}
          {predictResult && (
            <div
              style={{
                backgroundColor: COLORS.bgDeep,
                borderRadius: '10px',
                border: `1px solid ${COLORS.borderRiver}`,
                padding: '16px 20px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '14px',
                  marginBottom: '12px'
                }}
              >
                <div>
                  <span style={{ fontSize: '11.5px', color: COLORS.textMuted, display: 'block' }}>Predicted Classification Outcome</span>
                  <span
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: predictResult.prediction.predicted_class_id === 1 ? COLORS.emerald : COLORS.textPrimary
                    }}
                  >
                    {predictResult.prediction.predicted_label}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '20px', fontSize: '12px', fontFamily: 'monospace' }}>
                  <span>P(Arrest NO): <strong style={{ color: COLORS.textMuted }}>{predictResult.prediction.prob_arrest_no}%</strong></span>
                  <span>P(Arrest YES): <strong style={{ color: COLORS.emerald }}>{predictResult.prediction.prob_arrest_yes}%</strong></span>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: COLORS.amberMuted,
                  border: '1px solid rgba(233, 180, 76, 0.25)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '11.5px',
                  color: COLORS.amber,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}
              >
                <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{predictResult.disclaimer}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 8. Classification Foundations & Theoretical Concepts */}
      <div style={cardStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${COLORS.borderRiver}`,
            paddingBottom: '12px',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} color={COLORS.lakeBlue} />
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#fff' }}>
              Classification Foundations: Decision Tree & Class Imbalance Theory
            </h3>
          </div>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '20px',
              backgroundColor: COLORS.lakeBlueMuted,
              color: COLORS.lakeBlue,
              fontWeight: 600,
              border: '1px solid rgba(53, 184, 232, 0.3)'
            }}
          >
            DWM Classification Module
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            fontSize: '12px',
            color: COLORS.textMuted
          }}
        >
          <div style={{ backgroundColor: COLORS.bgDeep, padding: '14px', borderRadius: '8px', border: `1px solid ${COLORS.borderRiver}` }}>
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: '6px' }}>ALGORITHM & SPLITS</div>
            <p style={{ margin: 0, lineHeight: 1.6, color: COLORS.textDim }}>
              CART Decision Trees evaluate binary candidate splits across categorical one-hot encoded features using Gini impurity or Shannon Entropy minimization.
            </p>
          </div>

          <div style={{ backgroundColor: COLORS.bgDeep, padding: '14px', borderRadius: '8px', border: `1px solid ${COLORS.borderRiver}` }}>
            <div style={{ fontWeight: 700, color: COLORS.alertRed, marginBottom: '6px' }}>CLASS IMBALANCE (13.99%)</div>
            <p style={{ margin: 0, lineHeight: 1.6, color: COLORS.textDim }}>
              Historical crime census has severe class skew (86.01% Non-Arrest vs 13.99% Arrest). Stratified train/test splitting prevents majority-class zero-rule collapse.
            </p>
          </div>

          <div style={{ backgroundColor: COLORS.bgDeep, padding: '14px', borderRadius: '8px', border: `1px solid ${COLORS.borderRiver}` }}>
            <div style={{ fontWeight: 700, color: COLORS.emerald, marginBottom: '6px' }}>EVALUATION METRICS</div>
            <p style={{ margin: 0, lineHeight: 1.6, color: COLORS.textDim }}>
              Raw accuracy is deceptive on skewed data. Model efficacy is evaluated using Precision, Recall, F1-Score for Arrest = YES, ROC-AUC, and full Confusion Matrix.
            </p>
          </div>

          <div style={{ backgroundColor: COLORS.bgDeep, padding: '14px', borderRadius: '8px', border: `1px solid ${COLORS.borderRiver}` }}>
            <div style={{ fontWeight: 700, color: COLORS.amber, marginBottom: '6px' }}>REGULARIZATION & LIMITS</div>
            <p style={{ margin: 0, lineHeight: 1.6, color: COLORS.textDim }}>
              Max Depth is regularized (default 5) to ensure full explainability and prevent memorization of noise. Predictions reflect administrative records, not legal guilt.
            </p>
          </div>
        </div>
      </div>

      {/* 9. Educational Theory Modal */}
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
              backgroundColor: COLORS.bgCardElevated,
              border: `1px solid ${COLORS.borderRiver}`,
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
                borderBottom: `1px solid ${COLORS.borderRiver}`,
                paddingBottom: '14px',
                marginBottom: '18px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={20} color={COLORS.lakeBlue} />
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#fff' }}>
                  {explanationData.title}
                </h3>
              </div>
              <button
                onClick={() => setShowEduModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: COLORS.textMuted,
                  fontSize: '18px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
              <div
                style={{
                  backgroundColor: COLORS.lakeBlueMuted,
                  border: '1px solid rgba(53, 184, 232, 0.25)',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  color: COLORS.textPrimary
                }}
              >
                <div style={{ fontWeight: 700, color: COLORS.lakeBlue, marginBottom: '6px' }}>
                  Relationship to Other CrimeLens Analytical Modules:
                </div>
                <p style={{ margin: 0, lineHeight: 1.6, color: COLORS.textMuted }}>
                  {explanationData.comparison_with_other_phases}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                {explanationData.concepts && explanationData.concepts.map((concept, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: COLORS.bgDeep,
                      borderRadius: '8px',
                      border: `1px solid ${COLORS.borderRiver}`,
                      padding: '14px'
                    }}
                  >
                    <div style={{ fontWeight: 700, color: COLORS.lakeBlue, marginBottom: '4px' }}>
                      {concept.term}
                    </div>
                    {concept.formula && (
                      <code
                        style={{
                          display: 'block',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          color: COLORS.amber,
                          backgroundColor: '#070C15',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          margin: '6px 0',
                          border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}
                      >
                        {concept.formula}
                      </code>
                    )}
                    <p style={{ margin: 0, fontSize: '12px', color: COLORS.textMuted, lineHeight: 1.5 }}>
                      {concept.definition}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. Disclaimer Footer */}
      {trainResult && trainResult.disclaimer && (
        <div
          style={{
            backgroundColor: 'rgba(16, 27, 46, 0.6)',
            border: `1px solid ${COLORS.borderRiver}`,
            borderRadius: '10px',
            padding: '14px 18px',
            fontSize: '11.5px',
            color: COLORS.textDim,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}
        >
          <Info size={16} color={COLORS.textDim} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{trainResult.disclaimer}</span>
        </div>
      )}
    </div>
  );
}
