import React from 'react';
import {
  X,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  BarChart2,
  MapPin,
  ExternalLink
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

export default function DistrictDetailPanel({
  profile,
  onClose,
  onSetAreaA,
  onSetAreaB,
  isAreaA,
  isAreaB
}) {
  if (!profile) return null;

  const kpi = profile.kpi || {};
  const categories = (profile.top_categories || profile.categories_all || profile.category_breakdown || []).slice(0, 5);
  const hourly = profile.hourly_distribution || [];
  const hotspots = profile.district_hotspots || [];

  return (
    <div style={{
      background: 'var(--bg-elevated, #101B2E)',
      border: '1px solid var(--border-subtle, rgba(53, 184, 232, 0.25))',
      borderRadius: 'var(--radius-md, 8px)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      boxShadow: 'var(--shadow-card)',
      color: '#EAF2FF'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--lake-blue, #35B8E8)'
            }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#EAF2FF' }}>
              {profile.area_label || `District ${profile.area_id}`}
            </h3>
            <span style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(53, 184, 232, 0.15)',
              color: 'var(--lake-blue, #35B8E8)',
              border: '1px solid rgba(53, 184, 232, 0.3)'
            }}>
              {kpi.dataset_share_pct || 0}% of Census
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '11.5px', color: 'var(--text-muted, #7E92B0)' }}>
            CPD Police Administrative Zonal Sector • Star Schema Warehouse
          </p>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-dim, #5D728F)',
            cursor: 'pointer',
            padding: '4px'
          }}
          title="Close panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Quick Compare Plug Action */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onSetAreaA}
          style={{
            flex: 1,
            padding: '6px 10px',
            background: isAreaA ? 'rgba(129, 140, 248, 0.3)' : 'rgba(23, 54, 93, 0.5)',
            border: `1px solid ${isAreaA ? '#818cf8' : 'rgba(53, 184, 232, 0.3)'}`,
            borderRadius: '6px',
            color: isAreaA ? '#FFFFFF' : '#818cf8',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          {isAreaA ? '✓ Currently Area A' : 'Set as Area A for Comparison'}
        </button>

        <button
          onClick={onSetAreaB}
          style={{
            flex: 1,
            padding: '6px 10px',
            background: isAreaB ? 'rgba(53, 184, 232, 0.3)' : 'rgba(23, 54, 93, 0.5)',
            border: `1px solid ${isAreaB ? '#35B8E8' : 'rgba(53, 184, 232, 0.3)'}`,
            borderRadius: '6px',
            color: isAreaB ? '#FFFFFF' : '#35B8E8',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          {isAreaB ? '✓ Currently Area B' : 'Set as Area B for Comparison'}
        </button>
      </div>

      {/* 4 Micro-KPIs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        <div style={{ background: 'rgba(23, 54, 93, 0.35)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted, #7E92B0)', display: 'block' }}>Recorded Volume</span>
          <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: '#FFFFFF' }}>
            {kpi.total_incidents?.toLocaleString() || 0}
          </span>
        </div>

        <div style={{ background: 'rgba(23, 54, 93, 0.35)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted, #7E92B0)', display: 'block' }}>Arrest Rate</span>
          <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: '#2EC4B6' }}>
            {kpi.arrest_pct || 0}%
          </span>
        </div>

        <div style={{ background: 'rgba(23, 54, 93, 0.35)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted, #7E92B0)', display: 'block' }}>Domestic Share</span>
          <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: '#E76F74' }}>
            {kpi.domestic_pct || 0}%
          </span>
        </div>

        <div style={{ background: 'rgba(23, 54, 93, 0.35)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted, #7E92B0)', display: 'block' }}>Nighttime Share</span>
          <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: '#35B8E8' }}>
            {kpi.night_pct || 0}%
          </span>
        </div>
      </div>

      {/* Top Categories Breakdown */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#EAF2FF', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BarChart2 size={13} style={{ color: 'var(--lake-blue, #35B8E8)' }} />
            Top Crime Categories (% Share)
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {categories.map((cat, idx) => {
            const pct = cat.share_pct ?? cat.percentage ?? 0;
            return (
              <div key={idx} style={{ fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ color: '#EAF2FF' }}>{cat.category}</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--lake-blue, #35B8E8)' }}>
                    {pct}% ({cat.count?.toLocaleString() || 0})
                  </span>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: 'var(--lake-blue, #35B8E8)', borderRadius: '2px' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 24-Hour Diurnal Pattern */}
      <div>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#EAF2FF', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <Clock size={13} style={{ color: 'var(--amber, #E9B44C)' }} />
          24-Hour Diurnal Distribution
        </span>
        <div style={{ height: '110px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourly} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hour" stroke="var(--text-dim, #5D728F)" fontSize={9} tickLine={false} formatter={(h) => (h % 4 === 0 ? `${h}h` : '')} />
              <YAxis stroke="var(--text-dim, #5D728F)" fontSize={9} tickLine={false} unit="%" />
              <Tooltip
                contentStyle={{ background: '#0B1423', borderColor: 'rgba(53, 184, 232, 0.3)', fontSize: '11px' }}
                formatter={(val) => [`${val}%`, 'Hourly Share']}
                labelFormatter={(h) => `Hour ${h}:00 - ${h}:59`}
              />
              <Bar dataKey="pct" fill="#35B8E8" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DBSCAN Hotspots in this District */}
      {hotspots.length > 0 && (
        <div style={{ background: 'rgba(231, 111, 116, 0.08)', border: '1px solid rgba(231, 111, 116, 0.25)', borderRadius: '6px', padding: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#E76F74', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Sparkles size={12} />
            <span>Active DBSCAN Clusters in this District ({hotspots.length})</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {hotspots.map((h, i) => (
              <span key={i} style={{ fontSize: '10.5px', background: 'rgba(231, 111, 116, 0.15)', color: '#EAF2FF', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(231, 111, 116, 0.3)' }}>
                #{h.cluster_id}: {h.cluster_size} incidents ({h.primary_crime_type || 'Mixed'})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* K-Means Cluster Assignment */}
      {profile.kmeans_cluster && (
        <div style={{ background: 'rgba(23, 54, 93, 0.4)', border: '1px solid rgba(53, 184, 232, 0.2)', borderRadius: '6px', padding: '10px', fontSize: '11px' }}>
          <span style={{ color: 'var(--text-muted, #7E92B0)', display: 'block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Phase 9 K-Means Cluster Assignment
          </span>
          <div style={{ fontWeight: 700, color: 'var(--lake-blue, #35B8E8)', marginTop: '2px' }}>
            {profile.kmeans_cluster.cluster_label}
          </div>
          {profile.kmeans_cluster.similar_areas && profile.kmeans_cluster.similar_areas.length > 0 && (
            <div style={{ marginTop: '4px', color: 'var(--text-muted, #7E92B0)', fontSize: '10.5px' }}>
              Similar Profile: {profile.kmeans_cluster.similar_areas.slice(0, 4).map(a => `Dist ${a}`).join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}