import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell
} from 'recharts';
import { BarChart3, TrendingUp, Compass } from 'lucide-react';
import { getClassificationColor } from './SynchronizedDualMap';

export default function EvolutionCharts({ matches = [], periodALabel, periodBLabel }) {
  if (!matches || matches.length === 0) return null;

  // 1. Prepare Cluster-Size Distribution Data
  // Rank matched and prominent clusters by size
  const clusterSizeData = matches.slice(0, 10).map((m, idx) => ({
    name: m.period_a_cluster_id !== null && m.period_b_cluster_id !== null
      ? `Pair #${idx + 1}`
      : (m.period_a_cluster_id !== null ? `A #${m.period_a_cluster_id + 1}` : `B #${m.period_b_cluster_id + 1}`),
    size_a: m.period_a_count || 0,
    size_b: m.period_b_count || 0,
    classification: m.match_classification
  }));

  // 2. Prepare Centroid Displacement Bins
  const displacementBins = [
    { label: '0–100m', count: 0, range: [0, 100], color: '#2EC4B6' },
    { label: '100–200m', count: 0, range: [100, 200], color: '#2EC4B6' },
    { label: '200–300m', count: 0, range: [200, 300], color: '#2EC4B6' },
    { label: '300–400m', count: 0, range: [300, 400], color: '#E9B44C' },
    { label: '400–500m', count: 0, range: [400, 500], color: '#E9B44C' }
  ];

  matches.forEach((m) => {
    if (m.centroid_distance_meters !== null && m.centroid_distance_meters !== undefined) {
      const dist = m.centroid_distance_meters;
      for (const bin of displacementBins) {
        if (dist >= bin.range[0] && dist < bin.range[1]) {
          bin.count += 1;
          break;
        }
      }
    }
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
      {/* Chart 1: Cluster Size Distribution */}
      <div className="chart-card">
        <div className="chart-header">
          <div className="chart-title">
            <BarChart3 size={16} style={{ color: 'var(--lake-blue, #35B8E8)' }} />
            <span>Cluster Incident Size Comparison</span>
          </div>
          <span className="chart-badge">Volume</span>
        </div>

        <div style={{ height: '240px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={clusterSizeData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="var(--text-dim, #5D728F)" fontSize={10} />
              <YAxis stroke="var(--text-dim, #5D728F)" fontSize={10} />
              <Tooltip
                contentStyle={{ background: '#0B1423', borderColor: 'rgba(53, 184, 232, 0.3)', fontSize: '11px' }}
                formatter={(val, name) => [`${val} incidents`, name]}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="size_a" name={`Period A (${periodALabel})`} fill="#818cf8" radius={[3, 3, 0, 0]} />
              <Bar dataKey="size_b" name={`Period B (${periodBLabel})`} fill="#35B8E8" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Centroid Displacement Distance Histogram */}
      <div className="chart-card">
        <div className="chart-header">
          <div className="chart-title">
            <Compass size={16} style={{ color: 'var(--amber, #E9B44C)' }} />
            <span>Centroid Displacement Distance Distribution</span>
          </div>
          <span className="chart-badge">Haversine Meters</span>
        </div>

        <div style={{ height: '240px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displacementBins} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" stroke="var(--text-dim, #5D728F)" fontSize={10} />
              <YAxis stroke="var(--text-dim, #5D728F)" fontSize={10} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#0B1423', borderColor: 'rgba(233, 180, 76, 0.3)', fontSize: '11px' }}
                formatter={(val) => [`${val} matched clusters`, 'Frequency']}
              />
              <Bar dataKey="count" name="Matched Clusters" fill="#E9B44C" radius={[4, 4, 0, 0]}>
                {displacementBins.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}