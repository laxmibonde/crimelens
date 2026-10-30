import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';
import { DatasetProvider } from './context/DatasetContext';
import { SidebarProvider } from './context/SidebarContext';

// Route-based lazy loading for optimal bundle size and loading performance
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const HotspotsPage = lazy(() => import('./pages/HotspotsPage'));
const EvolutionPage = lazy(() => import('./pages/EvolutionPage'));
const KMeansPage = lazy(() => import('./pages/KMeansPage'));
const AprioriPage = lazy(() => import('./pages/AprioriPage'));
const DecisionTreePage = lazy(() => import('./pages/DecisionTreePage'));
const AreaIntelligencePage = lazy(() => import('./pages/AreaIntelligencePage'));
const TrendAnalysisPage = lazy(() => import('./pages/TrendAnalysisPage'));
const WhatChangedPage = lazy(() => import('./pages/WhatChangedPage'));
const InsightsPage = lazy(() => import('./pages/InsightsPage'));
const ETLMonitoringPage = lazy(() => import('./pages/ETLMonitoringPage'));
const DataQualityPage = lazy(() => import('./pages/DataQualityPage'));
const OLAPPage = lazy(() => import('./pages/OLAPPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const PowerBIPage = lazy(() => import('./pages/PowerBIPage'));

// Graceful loading fallback for route transitions in Chicago Nightfall palette
function PageLoadingFallback() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: '16px'
    }}>
      <div style={{
        width: '42px',
        height: '42px',
        border: '3px solid rgba(53, 184, 232, 0.2)',
        borderTop: '3px solid #35B8E8',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <span style={{ fontSize: '13px', color: 'var(--text-muted, #7E92B0)', letterSpacing: '0.5px' }}>
        Loading Chicago intelligence module...
      </span>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <DatasetProvider>
      <SidebarProvider>
        <div className="app-container">
          {/* Reusable Collapsible Sidebar Navigation */}
          <Sidebar />

          <div className="main-wrapper">
            {/* Reusable Top Header */}
            <Header />

            {/* Main Content Area with Error Boundary and Suspense Code-Splitting */}
            <main className="content-body">
              <ErrorBoundary>
                <Suspense fallback={<PageLoadingFallback />}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/hotspots" element={<HotspotsPage />} />
                    <Route path="/evolution" element={<EvolutionPage />} />
                    <Route path="/kmeans" element={<KMeansPage />} />
                    <Route path="/apriori" element={<AprioriPage />} />
                    <Route path="/decision-tree" element={<DecisionTreePage />} />
                    <Route path="/area-intelligence" element={<AreaIntelligencePage />} />
                    <Route path="/trend-analysis" element={<TrendAnalysisPage />} />
                    <Route path="/trends" element={<TrendAnalysisPage />} />
                    <Route path="/what-changed" element={<WhatChangedPage />} />
                    <Route path="/insights" element={<InsightsPage />} />
                    <Route path="/etl-monitoring" element={<ETLMonitoringPage />} />
                    <Route path="/data-quality" element={<DataQualityPage />} />
                    <Route path="/olap" element={<OLAPPage />} />
                    <Route path="/warehouse" element={<ETLMonitoringPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/power-bi" element={<PowerBIPage />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </DatasetProvider>
  );
}
