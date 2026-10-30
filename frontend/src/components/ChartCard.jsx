import React from 'react';
import EmptyState from './EmptyState';

export default function ChartCard({
  title,
  badgeText = "Awaiting Data",
  icon: Icon,
  children,
  isEmpty = false,
  emptyTitle,
  emptyDesc,
  height = "320px",
  style = {},
  actionElement = null
}) {
  return (
    <div className="chart-card" style={style}>
      <div className="chart-header">
        <div className="chart-title">
          {Icon && <Icon size={17} className="chart-title-icon" />}
          <span>{title}</span>
        </div>
        <div className="chart-header-actions">
          {badgeText && <span className="chart-badge">{badgeText}</span>}
          {actionElement}
        </div>
      </div>

      <div className="chart-content-body" style={{ minHeight: height }}>
        {isEmpty ? (
          <EmptyState title={emptyTitle} description={emptyDesc} />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
