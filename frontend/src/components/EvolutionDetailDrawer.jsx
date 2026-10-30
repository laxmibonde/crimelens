import React from 'react';
import {
  X,
  MapPin,
  Flame,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  Info,
  Calendar
} from 'lucide-react';
import { getClassificationColor } from './SynchronizedDualMap';

export default function EvolutionDetailDrawer({ match, periodALabel, periodBLabel, onClose }) {
  if (!match) return null;

  const color = getClassificationColor(match.match_classification);
  const isMatched = match.match_classification === 'SPATIALLY_MATCHED' || match.match_classification === 'UNCERTAIN_MATCH';
  const isNew = match.match_classification === 'NEWLY_OBSERVED';
  const isDissolved = match.match_classification === 'NO_LONGER_OBSERVED';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '420px',
      maxWidth: '90vw',
      background: 'var(--bg-elevated, #101B2E)',
      borderLeft: '1px solid var(--border-subtle, rgba(53, 184, 232, 0.3))',
      boxShadow: '-8px 0 32px rgba(0,0,0,0.6)',
      zIndex: 2500,
      display: 'flex',
      flexDirection: 'column',
      color: '#EAF2FF',
      overflowY: 'auto'
    }}>
      {/* Drawer Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(23, 54, 93, 0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#EAF2FF' }}>
              Cluster Match Inspector
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted, #7E92B0)' }}>
              Bipartite Spatial Proximity Audit
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted, #7E92B0)', cursor: 'pointer', padding: '4px' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Drawer Body */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Classification Badge & Distance Banner */}
        <div style={{
          background: 'rgba(11, 20, 35, 0.6)',
          border: `1px solid ${color}`,
          borderRadius: '8px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '12px',
              background: `${color}25`,
              color: color,
              border: `1px solid ${color}60`
            }}>
              {match.match_classification}
            </span>

            {match.centroid_distance_meters !== null && (
              <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--amber, #E9B44C)' }}>
                📍 {match.centroid_distance_meters}m displacement
              </span>
            )}
          </div>

          <p style={{ margin: 0, fontSize: '12px', color: '#EAF2FF', lineHeight: 1.4 }}>
            {match.explanation}
          </p>
        </div>

        {/* Side-by-Side Cluster Attributes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {/* Period A Box */}
          <div style={{
            background: 'rgba(23, 54, 93, 0.35)',
            border: '1px solid rgba(129, 140, 248, 0.3)',
            borderRadius: '6px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '11px'
          }}>
            <span style={{ fontWeight: 700, color: '#818cf8' }}>PERIOD A ({periodALabel})</span>
            {match.period_a_cluster_id !== null ? (
              <>
                <div>Label: <strong>{match.period_a_label}</strong></div>
                <div>Volume: <strong style={{ color: '#FFFFFF', fontFamily: 'monospace' }}>{match.period_a_count} incidents</strong></div>
                <div>Top Offense: <strong style={{ color: 'var(--amber, #E9B44C)' }}>{match.period_a_dominant_crime}</strong></div>
                {match.period_a_centroid && (
                  <div style={{ fontFamily: 'monospace', color: 'var(--text-muted, #7E92B0)', marginTop: '4px' }}>
                    [{match.period_a_centroid.lat.toFixed(5)}, {match.period_a_centroid.lon.toFixed(5)}]
                  </div>
                )}
                {match.period_a_hull && match.period_a_hull.length > 0 && (
                  <div style={{ color: 'var(--text-dim, #5D728F)', fontSize: '10px' }}>
                    Hull Footprint: {match.period_a_hull.length} vertices
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: 'var(--text-dim, #5D728F)', fontStyle: 'italic', padding: '10px 0' }}>
                No predecessor cluster in Period A
              </div>
            )}
          </div>

          {/* Period B Box */}
          <div style={{
            background: 'rgba(23, 54, 93, 0.35)',
            border: '1px solid rgba(53, 184, 232, 0.3)',
            borderRadius: '6px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '11px'
          }}>
            <span style={{ fontWeight: 700, color: 'var(--lake-blue, #35B8E8)' }}>PERIOD B ({periodBLabel})</span>
            {match.period_b_cluster_id !== null ? (
              <>
                <div>Label: <strong>{match.period_b_label}</strong></div>
                <div>Volume: <strong style={{ color: '#FFFFFF', fontFamily: 'monospace' }}>{match.period_b_count} incidents</strong></div>
                <div>Top Offense: <strong style={{ color: 'var(--amber, #E9B44C)' }}>{match.period_b_dominant_crime}</strong></div>
                {match.period_b_centroid && (
                  <div style={{ fontFamily: 'monospace', color: 'var(--text-muted, #7E92B0)', marginTop: '4px' }}>
                    [{match.period_b_centroid.lat.toFixed(5)}, {match.period_b_centroid.lon.toFixed(5)}]
                  </div>
                )}
                {match.period_b_hull && match.period_b_hull.length > 0 && (
                  <div style={{ color: 'var(--text-dim, #5D728F)', fontSize: '10px' }}>
                    Hull Footprint: {match.period_b_hull.length} vertices
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: 'var(--text-dim, #5D728F)', fontStyle: 'italic', padding: '10px 0' }}>
                No longer observed in Period B
              </div>
            )}
          </div>
        </div>

        {/* Volume Delta Metrics */}
        {isMatched && (
          <div style={{
            background: 'rgba(11, 20, 35, 0.5)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '6px',
            padding: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11.5px'
          }}>
            <span>Cluster Incident Volume Trajectory:</span>
            <span style={{
              fontWeight: 800,
              fontFamily: 'monospace',
              fontSize: '13px',
              color: match.volume_change >= 0 ? 'var(--alert-red, #E76F74)' : '#2EC4B6'
            }}>
              {match.volume_change >= 0 ? `+${match.volume_change}` : match.volume_change} incidents ({match.volume_change_pct > 0 ? `+${match.volume_change_pct}` : match.volume_change_pct}%)
            </span>
          </div>
        )}

        {/* Essential Scientific Caveat Requirement 9 */}
        <div style={{
          background: 'rgba(233, 180, 76, 0.08)',
          border: '1px solid rgba(233, 180, 76, 0.3)',
          borderRadius: '6px',
          padding: '12px',
          fontSize: '11px',
          color: 'var(--off-white, #EAF2FF)',
          lineHeight: 1.5
        }}>
          <div style={{ fontWeight: 700, color: 'var(--amber, #E9B44C)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <AlertTriangle size={13} />
            <span>Methodological Limitation Notice</span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted, #7E92B0)' }}>
            <strong>Spatial Proximity vs Real-World Continuity:</strong> Centroid distance matching indicates that a dense cluster recurred within nearby geographic coordinates during both time windows. It is purely an algorithmic geometric calculation and does <strong>not</strong> prove that the same criminal actors, specific network, or social enterprise persisted across the two periods.
          </p>
        </div>

        {/* Matching Algorithm Specifications */}
        <div style={{
          background: 'rgba(23, 54, 93, 0.3)',
          border: '1px solid rgba(53, 184, 232, 0.2)',
          borderRadius: '6px',
          padding: '12px',
          fontSize: '11px',
          color: 'var(--text-muted, #7E92B0)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span style={{ fontWeight: 700, color: 'var(--lake-blue, #35B8E8)' }}>Algorithm Audit Specification</span>
          <div>• Distance Metric: Great-Circle Haversine (R = 6,371,008.8m)</div>
          <div>• Assignment Policy: Greedy Bipartite Nearest-Neighbor (Strict 1-to-1)</div>
          <div>• Spatial Match Threshold: &le; 300 meters</div>
          <div>• Uncertain Match Threshold: 300m &lt; d &le; 500m</div>
        </div>
      </div>
    </div>
  );
}