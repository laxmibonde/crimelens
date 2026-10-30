import React from 'react';
import { Database, AlertCircle, Inbox } from 'lucide-react';

export default function EmptyState({
  title = "Crime data will appear after query execution.",
  description = "No active records match the current filter or warehouse selection. Adjust parameters or select a different dimension.",
  icon: Icon = Database
}) {
  return (
    <div className="empty-state-container" role="status">
      <div className="empty-state-icon">
        <Icon size={24} />
      </div>
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-desc">{description}</div>
    </div>
  );
}
