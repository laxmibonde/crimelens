import React from 'react';

export default function KPICard({
  title,
  value = "--",
  subtitle = "Awaiting data",
  icon: Icon,
  badgeText,
  accentColor = "lake" // "lake", "amber", "river", "alert"
}) {
  return (
    <div className={`kpi-card accent-${accentColor}`}>
      <div className="kpi-card-header">
        <span className="kpi-title">{title}</span>
        {Icon && (
          <div className="kpi-icon-wrapper">
            <Icon size={18} />
          </div>
        )}
      </div>

      <div className="kpi-value">{value}</div>

      <div className="kpi-status-tag">
        <span className="kpi-indicator-dot"></span>
        <span className="kpi-subtitle-text">{subtitle}</span>
        {badgeText && (
          <span className="kpi-badge-chip">{badgeText}</span>
        )}
      </div>
    </div>
  );
}
