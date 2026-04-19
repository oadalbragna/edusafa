/**
 * Error Detection & Display Interface
 * يعرض جميع الأخطاء بشكل واضح للمطور
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';

interface ErrorInfo {
  id: string;
  type: 'runtime' | 'module' | 'network' | 'render' | 'auth' | 'import';
  message: string;
  details?: string;
  stack?: string;
  timestamp: Date;
  file?: string;
  severity: 'error' | 'warning' | 'critical';
}

// Global error state
let globalErrors: ErrorInfo[] = [];
let listeners: Set<() => void> = new Set();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

export function addError(error: Omit<ErrorInfo, 'id' | 'timestamp'>) {
  const newError: ErrorInfo = {
    ...error,
    id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date()
  };
  globalErrors.unshift(newError);
  if (globalErrors.length > 50) globalErrors = globalErrors.slice(0, 50);
  notifyListeners();
  console.error('[Error Detector]', error.message, error.details);
}

export function clearErrors() {
  globalErrors = [];
  notifyListeners();
}

export function getErrors() {
  return [...globalErrors];
}

// Main Component
export const ErrorDetector: React.FC = () => {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'critical'>('all');
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const listener = () => setErrors([...globalErrors]);
    listeners.add(listener);
    setErrors([...globalErrors]);

    // Poll for changes
    intervalRef.current = window.setInterval(() => {
      setErrors([...globalErrors]);
    }, 500);

    return () => {
      listeners.delete(listener);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Global error handlers
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      event.preventDefault();
      addError({
        type: event.error?.name === 'ReferenceError' ? 'import' : 'runtime',
        message: event.message,
        stack: event.error?.stack,
        file: event.filename || undefined,
        severity: event.error?.name === 'ReferenceError' ? 'critical' : 'error'
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      const reason = event.reason;
      addError({
        type: 'runtime',
        message: reason?.message || reason?.toString() || 'Promise rejected',
        stack: reason?.stack,
        severity: 'error'
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const filteredErrors = filter === 'all' ? errors : errors.filter(e => e.severity === filter);
  const errorCount = errors.filter(e => e.severity === 'error').length;
  const criticalCount = errors.filter(e => e.severity === 'critical').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  const severityConfig = {
    error: { color: '#ef4444', bg: '#fef2f2', icon: '🔴', label: 'خطأ' },
    warning: { color: '#f59e0b', bg: '#fffbeb', icon: '🟡', label: 'تحذير' },
    critical: { color: '#dc2626', bg: '#fee2e2', icon: '🔴', label: 'حرج' }
  };

  const typeLabels = {
    runtime: 'Runtime',
    module: 'Module',
    network: 'Network',
    render: 'Render',
    auth: 'Auth',
    import: 'Import'
  };

  // Don't render if no errors and panel is closed
  if (!isOpen && errors.length === 0) {
    return null;
  }

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '100%',
      maxWidth: '600px',
      maxHeight: '100vh',
      zIndex: 999999,
      fontFamily: 'monospace',
      direction: 'ltr',
      fontSize: '12px'
    }}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'absolute',
          top: '10px',
          left: isOpen ? 'auto' : '10px',
          right: isOpen ? '10px' : 'auto',
          zIndex: 1000000,
          background: criticalCount > 0 ? '#dc2626' : errorCount > 0 ? '#ef4444' : warningCount > 0 ? '#f59e0b' : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 16px',
          cursor: 'pointer',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}
      >
        <span>🔍 Errors: {errors.length}</span>
        {criticalCount > 0 && <span style={{ background: '#7f1d1d', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>{criticalCount}</span>}
        {errorCount > 0 && <span style={{ background: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>{errorCount}</span>}
        {warningCount > 0 && <span style={{ background: '#92400e', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>{warningCount}</span>}
      </button>

      {/* Main Panel */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '100%',
          maxWidth: '600px',
          height: '100vh',
          background: 'white',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            background: '#1e293b',
            color: 'white',
            padding: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px' }}>🔍 Error Detector</h2>
              <p style={{ margin: '4px 0 0', fontSize: '11px', opacity: 0.7 }}>
                {errors.length} errors detected
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { clearErrors(); }}
                style={{
                  background: '#334155',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                Clear All
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: '#475569',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            padding: '12px',
            background: '#f8fafc'
          }}>
            <div style={{
              background: severityConfig.critical.bg,
              border: `1px solid ${severityConfig.critical.color}`,
              borderRadius: '8px',
              padding: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '20px' }}>{severityConfig.critical.icon}</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: severityConfig.critical.color }}>{criticalCount}</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>Critical</div>
            </div>
            <div style={{
              background: severityConfig.error.bg,
              border: `1px solid ${severityConfig.error.color}`,
              borderRadius: '8px',
              padding: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '20px' }}>{severityConfig.error.icon}</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: severityConfig.error.color }}>{errorCount}</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>Errors</div>
            </div>
            <div style={{
              background: severityConfig.warning.bg,
              border: `1px solid ${severityConfig.warning.color}`,
              borderRadius: '8px',
              padding: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '20px' }}>{severityConfig.warning.icon}</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: severityConfig.warning.color }}>{warningCount}</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>Warnings</div>
            </div>
          </div>

          {/* Filters */}
          <div style={{
            display: 'flex',
            gap: '4px',
            padding: '8px 12px',
            background: 'white',
            borderBottom: '1px solid #e2e8f0'
          }}>
            {(['all', 'critical', 'error', 'warning'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  border: '1px solid',
                  borderColor: filter === f ? '#3b82f6' : '#e2e8f0',
                  background: filter === f ? '#3b82f6' : 'white',
                  color: filter === f ? 'white' : '#64748b',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  fontWeight: filter === f ? 'bold' : 'normal',
                  textTransform: 'capitalize'
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Error List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px'
          }}>
            {filteredErrors.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#64748b'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>No errors detected</div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>Everything looks good!</div>
              </div>
            ) : (
              filteredErrors.map(error => (
                <div
                  key={error.id}
                  style={{
                    background: severityConfig[error.severity].bg,
                    border: `2px solid ${severityConfig[error.severity].color}`,
                    borderRadius: '8px',
                    marginBottom: '8px',
                    overflow: 'hidden'
                  }}
                >
                  {/* Error Header */}
                  <div
                    onClick={() => setExpandedError(expandedError === error.id ? null : error.id)}
                    style={{
                      padding: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px'
                    }}
                  >
                    <div style={{
                      fontSize: '16px',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      {severityConfig[error.severity].icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        gap: '6px',
                        marginBottom: '4px',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{
                          background: severityConfig[error.severity].color,
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '9px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase'
                        }}>
                          {typeLabels[error.type]}
                        </span>
                        <span style={{
                          background: '#e2e8f0',
                          color: '#475569',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '9px'
                        }}>
                          {error.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div style={{
                        color: severityConfig[error.severity].color,
                        fontWeight: 'bold',
                        fontSize: '12px',
                        wordBreak: 'break-word'
                      }}>
                        {error.message}
                      </div>
                      {error.file && (
                        <div style={{
                          color: '#64748b',
                          fontSize: '10px',
                          marginTop: '4px'
                        }}>
                          📁 {error.file}
                        </div>
                      )}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#94a3b8',
                      flexShrink: 0
                    }}>
                      {expandedError === error.id ? '▲' : '▼'}
                    </div>
                  </div>

                  {/* Error Details */}
                  {expandedError === error.id && (
                    <div style={{
                      borderTop: `1px solid ${severityConfig[error.severity].color}`,
                      padding: '12px',
                      background: 'white'
                    }}>
                      {error.details && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                            Details:
                          </div>
                          <pre style={{
                            background: '#f1f5f9',
                            padding: '8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            overflow: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            maxHeight: '150px'
                          }}>
                            {error.details}
                          </pre>
                        </div>
                      )}
                      {error.stack && (
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                            Stack Trace:
                          </div>
                          <pre style={{
                            background: '#1e293b',
                            color: '#e2e8f0',
                            padding: '8px',
                            borderRadius: '4px',
                            fontSize: '9px',
                            overflow: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            maxHeight: '200px'
                          }}>
                            {error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

// Module import checker
export async function checkModuleImport(moduleName: string, importFn: () => Promise<any>) {
  try {
    await importFn();
    return true;
  } catch (error: any) {
    addError({
      type: 'import',
      message: `Failed to import module: ${moduleName}`,
      details: error.message,
      stack: error.stack,
      severity: 'critical'
    });
    return false;
  }
}

// React component render checker
export function checkComponentRender(componentName: string, renderFn: () => React.ReactNode) {
  try {
    renderFn();
    return true;
  } catch (error: any) {
    addError({
      type: 'render',
      message: `Failed to render component: ${componentName}`,
      details: error.message,
      stack: error.stack,
      severity: 'error'
    });
    return false;
  }
}

// Network request checker
export async function checkNetworkRequest(url: string, requestFn: () => Promise<any>) {
  try {
    await requestFn();
    return true;
  } catch (error: any) {
    addError({
      type: 'network',
      message: `Network request failed: ${url}`,
      details: error.message,
      severity: 'error'
    });
    return false;
  }
}

// Auth checker
export function checkAuthStatus(isAuthenticated: boolean, errorMessage?: string) {
  if (!isAuthenticated && errorMessage) {
    addError({
      type: 'auth',
      message: `Authentication error: ${errorMessage}`,
      severity: 'error'
    });
  }
}
