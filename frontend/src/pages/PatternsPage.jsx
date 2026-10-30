import React from 'react';
import { Network, GitFork, Share2, Sparkles } from 'lucide-react';
import FilterBar from '../components/FilterBar';
import ChartCard from '../components/ChartCard';
import KPICard from '../components/KPICard';

export default function PatternsPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <Network size={24} style={{ color: 'var(--primary-indigo)' }} />
          Pattern Mining & Rule Association
        </h1>
        <p className="page-description">
          Data mining algorithms (Apriori & Decision Trees) for co-occurrence patterns and risk decision rules.
        </p>
      </div>

      <FilterBar />

      <div className="kpi-grid">
        <KPICard title="Generated Association Rules" value="--" subtitle="Apriori algorithm pending" icon={Network} />
        <KPICard title="Min Support Threshold" value="--" subtitle="Parameter configuration pending" icon={Sparkles} />
        <KPICard title="Min Confidence Threshold" value="--" subtitle="Parameter configuration pending" icon={GitFork} />
        <KPICard title="Decision Tree Depth" value="--" subtitle="Decision tree model pending" icon={Share2} />
      </div>

      <div className="dashboard-grid">
        <div style={{ gridColumn: 'span 7' }}>
          <ChartCard
            title="Apriori Association Rules Graph"
            badgeText="Apriori Mining"
            icon={Network}
            isEmpty={true}
            emptyTitle="Association rules will display after mining pipeline runs."
            emptyDesc="Discovered crime co-occurrence relationships (e.g. {Nighttime, Alley, Weekend} -> {Theft}) will be rendered as interactive network graphs."
            height="360px"
          />
        </div>

        <div style={{ gridColumn: 'span 5' }}>
          <ChartCard
            title="Decision Tree Classification Structure"
            badgeText="scikit-learn"
            icon={GitFork}
            isEmpty={true}
            emptyTitle="Decision tree visualization will appear after training."
            emptyDesc="Crime severity classification rules and decision tree nodes will be displayed here."
            height="360px"
          />
        </div>
      </div>
    </div>
  );
}
