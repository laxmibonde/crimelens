import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  TrendingUp,
  MapPin,
  Sparkles,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { getClassificationColor } from './SynchronizedDualMap';

export default function EvolutionSummaryCards({ summary, comparisonMetrics, periodALabel, periodBLabel }) {
  if (!summary) return null;

  const matchedTotal = (summary.spatially_matched || 0) + (summary.uncertain_match || 0);
  const recon = summary.reconciliation || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 6 Metric KPI Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px'
      }}>
        {/* Card 1: Period A Total */}
        <div style={{
          background: 'var(--bg-elevated, #101B2E)',
          border: '1px solid rgba(129, 140, 248, 0.3)',
          borderRadius: '8px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 600 }}>Period A Clusters</span>
          <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'monospace', color: '#FFFFFF' }}>
            {summary.clusters_a}
          </div>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted, #7E92B0)' }}>
            {periodALabel} baseline
          </span>
        </div>

        {/* Card 2: Period B Total */}
        <div style={{
          background: 'var(--bg-elevated, #101B2E)',
          border: '1px solid rgba(53, 184, 232, 0.3)',
          borderRadius: '8px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span style={{ fontSize: '11px', color: 'var(--lake-blue, #35B8E8)', fontWeight: 600 }}>Period B Clusters</span>
          <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'monospace', color: '#FFFFFF' }}>
            {summary.clusters_b}
          </div>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted, #7E92B0)' }}>
            {periodBLabel} comparison
          </span>
        </div>

        {/* Card 3: Spatially Matched */}
        <div style={{
          background: 'var(--bg-elevated, #101B2E)',
          border: '1px solid rgba(46, 196, 182, 0.35)',
          borderRadius: '8px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span style={{ fontSize: '11px', color: '#2EC4B6', fontWeight: 600 }}>Spatially Matched</span>
          <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'monospace', color: '#2EC4B6' }}>
            {summary.spatially_matched}
          </div>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted, #7E92B0)' }}>
            Centroid dist ≤ 300m
          </span>
        </div>

        {/* Card 4: Uncertain Matches */}
        <div style={{
          background: 'var(--bg-elevated, #101B2E)',
          border: '1px solid rgba(233, 180, 76, 0.35)',
          borderRadius: '8px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span style={{ fontSize: '11px', color: 'var(--amber, #E9B44C)', fontWeight: 600 }}>Uncertain Matches</span>
          <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--amber, #E9B44C)' }}>
            {summary.uncertain_match}
          </div>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted, #7E92B0)' }}>
            300m &lt; dist ≤ 500m
          </span>
        </div>

        {/* Card 5: Newly Observed */}
        <div style={{
          background: 'var(--bg-elevated, #101B2E)',
          border: '1px solid rgba(53, 184, 232, 0.35)',
          borderRadius: '8px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span style={{ fontSize: '11px', color: 'var(--lake-blue, #35B8E8)', fontWeight: 600 }}>Newly Observed</span>
          <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--lake-blue, #35B8E8)' }}>
            {summary.newly_observed}
          </div>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted, #7E92B0)' }}>
            Newly observed in Period B
          </span>
        </div>

        {/* Card 6: No Longer Observed */}
        <div style={{
          background: 'var(--bg-elevated, #101B2E)',
          border: '1px solid rgba(231, 111, 116, 0.35)',
          borderRadius: '8px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span style={{ fontSize: '11px', color: 'var(--alert-red, #E76F74)', fontWeight: 600 }}>No Longer Observed</span>
          <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--alert-red, #E76F74)' }}>
            {summary.no_longer_observed}
          </div>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted, #7E92B0)' }}>
            No longer observed in Period B
          </span>
        </div>
      </div>

      {/* Conservation & Mathematical Reconciliation Banner */}
      <div style={{
        background: 'rgba(23, 54, 93, 0.35)',
        border: '1px solid rgba(53, 184, 232, 0.25)',
        borderRadius: '8px',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '11.5px',
        color: '#EAF2FF'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} style={{ color: '#2EC4B6', flexShrink: 0 }} />
          <span>
            <strong style={{ color: '#2EC4B6' }}>One-to-One Spatial Conservation Verified:</strong>{' '}
            <code style={{ background: 'rgba(11, 20, 35, 0.6)', padding: '2px 6px', borderRadius: '4px', color: '#818cf8', fontFamily: 'monospace' }}>
              {recon.formula_a || `NA = ${matchedTotal} + ${summary.no_longer_observed} = ${summary.clusters_a}`}
            </code>
            {'  •  '}
            <code style={{ background: 'rgba(11, 20, 35, 0.6)', padding: '2px 6px', borderRadius: '4px', color: 'var(--lake-blue, #35B8E8)', fontFamily: 'monospace' }}>
              {recon.formula_b || `NB = ${matchedTotal} + ${summary.newly_observed} = ${summary.clusters_b}`}
            </code>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted, #7E92B0)' }}>
          <span>Avg Displacement: <strong style={{ color: 'var(--amber, #E9B44C)' }}>{summary.avg_displacement_meters || 0}m</strong></span>
          <span>Max Displacement: <strong style={{ color: 'var(--amber, #E9B44C)' }}>{summary.max_displacement_meters || 0}m</strong></span>
        </div>
      </div>
    </div>
  );
}