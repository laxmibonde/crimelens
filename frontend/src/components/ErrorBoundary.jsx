import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, Layers, MapPin, TrendingUp } from 'lucide-react';
import { CHICAGO_NIGHTFALL } from '../theme/colors';

/**
 * CrimeLens - Application Module Error Boundary
 * 
 * Intercepts unhandled JavaScript runtime exceptions within routed page views,
 * preventing full-application blank-screen crashes. Preserves the sidebar,
 * top navigation header, dataset context, and background workers while offering
 * immediate recovery and diagnostic actions.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Detailed diagnostic logging for developer inspection
    console.error('[CrimeLens Error Boundary Intercepted Exception]:', error);
    console.error('[CrimeLens Component Stack Trace]:', errorInfo?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleNavigateHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || String(this.state.error) || 'Unknown runtime exception';
      const errorStack = this.state.error?.stack || this.state.errorInfo?.componentStack;

      return (
        <div style={{
          minHeight: '75vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: CHICAGO_NIGHTFALL.midnightNavy,
          color: CHICAGO_NIGHTFALL.textPrimary,
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{
            maxWidth: '680px',
            width: '100%',
            backgroundColor: CHICAGO_NIGHTFALL.bgCardElevated,
            border: `1px solid ${CHICAGO_NIGHTFALL.alertRed}`,
            borderRadius: '14px',
            padding: '32px',
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.5)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Ambient Alert Glow Accent */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              backgroundColor: CHICAGO_NIGHTFALL.alertRed
            }} />

            {/* Header with Alert Icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{
                backgroundColor: CHICAGO_NIGHTFALL.alertRedMuted,
                border: `1px solid ${CHICAGO_NIGHTFALL.alertRed}`,
                borderRadius: '10px',
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertTriangle size={28} color={CHICAGO_NIGHTFALL.alertRed} />
              </div>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, letterSpacing: '-0.3px', color: '#fff' }}>
                  Analytical View Intercepted
                </h2>
                <span style={{ fontSize: '12px', color: CHICAGO_NIGHTFALL.textMuted }}>
                  Workspace shell and background warehouse connections remain operational.
                </span>
              </div>
            </div>

            {/* Diagnostic Message */}
            <p style={{ fontSize: '13.5px', color: CHICAGO_NIGHTFALL.textMuted, lineHeight: '1.6', margin: '0 0 16px 0' }}>
              An isolated runtime error occurred while rendering this module. Your session, active filters, and database connectivity have been safely preserved.
            </p>

            {/* Error Message Box */}
            <div style={{
              backgroundColor: 'rgba(7, 12, 21, 0.8)',
              border: `1px solid ${CHICAGO_NIGHTFALL.borderRiver}`,
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontSize: '12.5px',
              color: CHICAGO_NIGHTFALL.alertRed,
              wordBreak: 'break-word'
            }}>
              <strong>Error:</strong> {errorMessage}
            </div>

            {/* Expandable Technical Details in Dev */}
            {errorStack && (
              <details style={{ marginBottom: '24px', fontSize: '11.5px', color: CHICAGO_NIGHTFALL.textDim }}>
                <summary style={{ cursor: 'pointer', color: CHICAGO_NIGHTFALL.lakeBlue, fontWeight: 600, marginBottom: '8px' }}>
                  Inspect Diagnostic Stack Trace
                </summary>
                <pre style={{
                  backgroundColor: 'rgba(7, 12, 21, 0.95)',
                  padding: '12px',
                  borderRadius: '6px',
                  overflowX: 'auto',
                  maxHeight: '160px',
                  border: `1px solid ${CHICAGO_NIGHTFALL.borderRiver}`,
                  color: '#94a3b8',
                  lineHeight: '1.4'
                }}>
                  {errorStack}
                </pre>
              </details>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  backgroundColor: CHICAGO_NIGHTFALL.lakeBlue,
                  color: CHICAGO_NIGHTFALL.midnightNavy,
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(53, 184, 232, 0.25)'
                }}
              >
                <RefreshCw size={15} />
                Retry Module
              </button>

              <button
                type="button"
                onClick={this.handleNavigateHome}
                style={{
                  backgroundColor: 'transparent',
                  color: CHICAGO_NIGHTFALL.textPrimary,
                  border: `1px solid ${CHICAGO_NIGHTFALL.borderRiver}`,
                  borderRadius: '8px',
                  padding: '10px 18px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Home size={15} />
                Return to Command Center
              </button>

              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <a
                  href="/area-intelligence"
                  style={{
                    color: CHICAGO_NIGHTFALL.textMuted,
                    fontSize: '12px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255,255,255,0.04)'
                  }}
                >
                  <MapPin size={12} /> Area Intel
                </a>
                <a
                  href="/trend-analysis"
                  style={{
                    color: CHICAGO_NIGHTFALL.textMuted,
                    fontSize: '12px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255,255,255,0.04)'
                  }}
                >
                  <TrendingUp size={12} /> Trends
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
