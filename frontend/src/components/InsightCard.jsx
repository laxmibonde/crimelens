import React from 'react';
import { Info, AlertTriangle, Lightbulb, Zap, CheckCircle2 } from 'lucide-react';

export default function InsightCard({
  title = "System Readiness Insight",
  body = "CrimeLens UI & Architecture initialized. Connect dataset to raw/ storage and run ETL pipeline to generate real-time spatial and temporal intelligence.",
  type = "info",
  timestamp = "Verified Warehouse Evidence"
}) {
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle size={17} className="icon-amber" />;
      case 'alert':
        return <AlertTriangle size={17} className="icon-alert" />;
      case 'success':
        return <CheckCircle2 size={17} className="icon-success" />;
      case 'insight':
        return <Zap size={17} className="icon-lake" />;
      default:
        return <Info size={17} className="icon-lake" />;
    }
  };

  return (
    <div className={`insight-card insight-${type}`}>
      <div className="insight-icon">{getIcon()}</div>
      <div className="insight-content">
        <div className="insight-title">{title}</div>
        <div className="insight-body">{body}</div>
        {timestamp && <div className="insight-footer">{timestamp}</div>}
      </div>
    </div>
  );
}
