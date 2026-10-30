import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  History,
  Grid,
  Layers,
  Network,
  GitBranch,
  GitCompare,
  Map,
  TrendingUp,
  Zap,
  Activity,
  ShieldCheck,
  FileText,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Building2
} from 'lucide-react';
import { useSidebar } from '../context/SidebarContext';

export default function Sidebar() {
  const { isCollapsed, toggleSidebar } = useSidebar();

  const navSections = [
    {
      title: 'Analytics & Intelligence',
      shortTitle: 'Intel',
      items: [
        { label: 'Command Center', path: '/dashboard', icon: LayoutDashboard },
        { label: 'OLAP Explorer', path: '/olap', icon: Layers },
        { label: 'Area Intelligence', path: '/area-intelligence', icon: Map },
        { label: 'Trend Analysis', path: '/trend-analysis', icon: TrendingUp },
        { label: 'What Changed?', path: '/what-changed', icon: GitCompare },
        { label: 'Automated Insights', path: '/insights', icon: Zap },
      ]
    },
    {
      title: 'Pattern Mining & AI',
      shortTitle: 'Mining',
      items: [
        { label: 'Hotspot Intelligence', path: '/hotspots', icon: MapPin },
        { label: 'Hotspot Evolution', path: '/evolution', icon: History },
        { label: 'K-Means Clustering', path: '/kmeans', icon: Grid },
        { label: 'Association Rules', path: '/apriori', icon: Network },
        { label: 'Decision Tree', path: '/decision-tree', icon: GitBranch },
      ]
    },
    {
      title: 'Data Governance & BI',
      shortTitle: 'Gov',
      items: [
        { label: 'ETL Observability', path: '/etl-monitoring', icon: Activity },
        { label: 'Data Quality', path: '/data-quality', icon: ShieldCheck },
        { label: 'Reports & Exports', path: '/reports', icon: FileText },
        { label: 'Power BI Integration', path: '/power-bi', icon: BarChart3 },
      ]
    }
  ];

  return (
    <aside
      className={`sidebar-container ${isCollapsed ? 'collapsed' : 'expanded'}`}
      aria-label="Primary Navigation"
    >
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon-wrapper" title="Chicago Municipal Intelligence System">
          {/* Chicago Six-Pointed Civic Star */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="chicago-star-icon">
            <polygon
              points="12,1 14.5,8 22,8 16.5,13 18.5,20.5 12,16 5.5,20.5 7.5,13 2,8 9.5,8"
              fill="#35B8E8"
            />
          </svg>
        </div>

        {!isCollapsed && (
          <div className="brand-text-wrapper">
            <div className="brand-title-row">
              <span className="brand-title">CrimeLens</span>
              <span className="brand-edition">CHICAGO</span>
            </div>
            <span className="brand-subtext">URBAN INTELLIGENCE</span>
          </div>
        )}

        {/* Sidebar Collapse Toggle Button */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="sidebar-collapse-btn"
          title={isCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.title} className="nav-section-group">
            {!isCollapsed ? (
              <div className="nav-section-label">{section.title}</div>
            ) : (
              <div className="nav-section-divider" title={section.shortTitle} />
            )}

            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'active' : ''}`
                  }
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon size={18} className="nav-icon" />
                  {!isCollapsed && <span className="nav-label">{item.label}</span>}
                  {isCollapsed && (
                    <span className="nav-tooltip" role="tooltip">
                      {item.label}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        {!isCollapsed ? (
          <div className="footer-expanded">
            <div className="footer-title">Chicago Star Schema</div>
            <div className="footer-meta">PostgreSQL 18 DWM</div>
          </div>
        ) : (
          <div className="footer-collapsed" title="PostgreSQL 18 Data Warehouse">
            <Building2 size={16} />
          </div>
        )}
      </div>
    </aside>
  );
}
