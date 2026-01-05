import { useState, useEffect, useRef } from 'react';
import { AnalysisResults, PileData, LoadCase } from '../types/pile-types';
import ChartsPanel from './visualization/ChartsPanel';
import PileCrossSection from './visualization/PileCrossSection';
import PileElevation from './visualization/PileElevation';
import './ResultsPanel.css';

interface ResultsPanelProps {
  results: AnalysisResults | null;
  isAnalyzing: boolean;
  pileData: PileData;
  loadCase: LoadCase;
}

type ViewTab = 'summary' | 'charts' | 'elevation' | 'data';

interface MetricCard {
  id: string;
  label: string;
  value: number;
  unit: string;
  format: (v: number) => string;
  status?: 'normal' | 'warning' | 'critical';
  description?: string;
}

// Animated counter hook
function useAnimatedCounter(
  targetValue: number,
  duration: number = 500
): number {
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(0);

  useEffect(() => {
    startValueRef.current = displayValue;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue =
        startValueRef.current + (targetValue - startValueRef.current) * easeOut;

      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [targetValue, duration]);

  return displayValue;
}

// Animated metric card component
function AnimatedMetricCard({ metric }: { metric: MetricCard }) {
  const animatedValue = useAnimatedCounter(metric.value, 600);

  const getStatusClass = (status?: string) => {
    switch (status) {
      case 'warning':
        return 'status-warning';
      case 'critical':
        return 'status-critical';
      default:
        return 'status-normal';
    }
  };

  return (
    <div className={`metric-card ${getStatusClass(metric.status)}`}>
      <div className="metric-header">
        <span className="metric-label">{metric.label}</span>
        {metric.status && metric.status !== 'normal' && (
          <span className={`status-indicator ${metric.status}`}>
            {metric.status === 'warning' ? '!' : '!!'}
          </span>
        )}
      </div>
      <div className="metric-value">
        <span className="value">{metric.format(animatedValue)}</span>
        <span className="unit">{metric.unit}</span>
      </div>
      {metric.description && (
        <div className="metric-description">{metric.description}</div>
      )}
    </div>
  );
}

function ResultsPanel({
  results,
  isAnalyzing,
  pileData,
  loadCase,
}: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>('summary');

  // Loading state
  if (isAnalyzing) {
    return (
      <div className="results-panel enhanced">
        <div className="analyzing-container">
          <div className="analyzing-content">
            <div className="spinner-container">
              <div className="spinner"></div>
              <div className="spinner-ring"></div>
            </div>
            <h2>Running Analysis</h2>
            <p>Solving finite difference equations...</p>
            <div className="analysis-steps">
              <div className="step active">
                <span className="step-dot"></span>
                <span>Assembling stiffness matrix</span>
              </div>
              <div className="step pending">
                <span className="step-dot"></span>
                <span>Newton-Raphson iteration</span>
              </div>
              <div className="step pending">
                <span className="step-dot"></span>
                <span>Computing internal forces</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No results state
  if (!results) {
    return (
      <div className="results-panel enhanced">
        <div className="no-results-container">
          <div className="no-results-content">
            <div className="illustration">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                {/* Pile illustration */}
                <rect x="50" y="20" width="20" height="80" rx="2" fill="#3a3a3a" />
                <rect x="50" y="20" width="20" height="80" rx="2" stroke="#646cff" strokeWidth="2" strokeDasharray="4 2" />
                {/* Ground line */}
                <line x1="20" y1="40" x2="100" y2="40" stroke="#4ade80" strokeWidth="2" />
                {/* Soil dots */}
                <circle cx="35" cy="55" r="3" fill="#3a3a3a" opacity="0.5" />
                <circle cx="85" cy="65" r="2" fill="#3a3a3a" opacity="0.5" />
                <circle cx="30" cy="75" r="2" fill="#3a3a3a" opacity="0.5" />
                <circle cx="90" cy="85" r="3" fill="#3a3a3a" opacity="0.5" />
                {/* Arrow */}
                <path d="M15 30 L45 30" stroke="#f87171" strokeWidth="3" markerEnd="url(#arrowhead-placeholder)" />
                <polygon points="45,26 53,30 45,34" fill="#f87171" />
              </svg>
            </div>
            <h2>No Analysis Results</h2>
            <p>Configure your pile and load parameters, then click "Run Analysis" to see results.</p>
            <div className="quick-tips">
              <h4>Quick Tips:</h4>
              <ul>
                <li>Use Quick Presets to quickly configure common pile types</li>
                <li>Enable auto-calculate EI for automatic rigidity calculation</li>
                <li>Typical analysis takes 1-3 seconds</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Prepare metric cards
  const metrics: MetricCard[] = [
    {
      id: 'status',
      label: 'Analysis Status',
      value: results.converged ? 1 : 0,
      unit: '',
      format: () => (results.converged ? 'Converged' : 'Failed'),
      status: results.converged ? 'normal' : 'critical',
    },
    {
      id: 'iterations',
      label: 'Iterations',
      value: results.iterations,
      unit: '',
      format: (v) => Math.round(v).toString(),
      description: 'Newton-Raphson iterations',
    },
    {
      id: 'maxDeflection',
      label: 'Maximum Deflection',
      value: results.maxDeflection * 1000,
      unit: 'mm',
      format: (v) => v.toFixed(2),
      status:
        results.maxDeflection * 1000 > 50
          ? 'warning'
          : results.maxDeflection * 1000 > 100
          ? 'critical'
          : 'normal',
    },
    {
      id: 'headDeflection',
      label: 'Deflection at Head',
      value: results.deflectionAtLoad * 1000,
      unit: 'mm',
      format: (v) => v.toFixed(2),
    },
    {
      id: 'maxMoment',
      label: 'Maximum Moment',
      value: results.maxMoment,
      unit: 'kN-m',
      format: (v) => v.toFixed(1),
    },
    {
      id: 'maxShear',
      label: 'Maximum Shear',
      value: results.maxShear,
      unit: 'kN',
      format: (v) => v.toFixed(1),
    },
  ];

  // Find depth of maximum values
  const maxDeflIdx = results.deflections.indexOf(results.maxDeflection);
  const maxDeflDepth = results.depths[maxDeflIdx];
  const maxMomentIdx = results.moments.indexOf(
    Math.max(...results.moments.map(Math.abs))
  );
  const maxMomentDepth = results.depths[maxMomentIdx];

  return (
    <div className="results-panel enhanced with-results">
      {/* Tab navigation */}
      <div className="results-tabs">
        <button
          className={activeTab === 'summary' ? 'active' : ''}
          onClick={() => setActiveTab('summary')}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="1" y="1" width="6" height="6" rx="1" />
            <rect x="9" y="1" width="6" height="6" rx="1" />
            <rect x="1" y="9" width="6" height="6" rx="1" />
            <rect x="9" y="9" width="6" height="6" rx="1" />
          </svg>
          Summary
        </button>
        <button
          className={activeTab === 'charts' ? 'active' : ''}
          onClick={() => setActiveTab('charts')}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 14h14v1H1v-1zM3 10h2v3H3v-3zm4-4h2v7H7V6zm4-3h2v10h-2V3z" />
          </svg>
          Charts
        </button>
        <button
          className={activeTab === 'elevation' ? 'active' : ''}
          onClick={() => setActiveTab('elevation')}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="6" y="1" width="4" height="14" rx="1" />
            <line x1="2" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="2" />
          </svg>
          Pile View
        </button>
        <button
          className={activeTab === 'data' ? 'active' : ''}
          onClick={() => setActiveTab('data')}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 2h12v2H2V2zm0 4h8v2H2V6zm0 4h10v2H2v-2zm0 4h6v2H2v-2z" />
          </svg>
          Raw Data
        </button>
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="summary-tab">
            {/* Status banner */}
            <div className={`status-banner ${results.converged ? 'success' : 'error'}`}>
              <span className="status-icon">
                {results.converged ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
              </span>
              <span className="status-text">
                {results.converged
                  ? `Analysis converged in ${results.iterations} iterations`
                  : 'Analysis did not converge - results may be unreliable'}
              </span>
            </div>

            {/* Metrics grid */}
            <div className="metrics-grid">
              {metrics.slice(2).map((metric) => (
                <AnimatedMetricCard key={metric.id} metric={metric} />
              ))}
            </div>

            {/* Key findings */}
            <div className="key-findings">
              <h3>Key Findings</h3>
              <div className="findings-grid">
                <div className="finding-card">
                  <div className="finding-icon deflection">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 2C5.5 2 3 10 3 10s2.5 8 7 8 7-8 7-8-2.5-8-7-8z" />
                    </svg>
                  </div>
                  <div className="finding-content">
                    <span className="finding-label">Maximum Deflection Location</span>
                    <span className="finding-value">
                      {maxDeflDepth.toFixed(2)} m depth
                    </span>
                  </div>
                </div>
                <div className="finding-card">
                  <div className="finding-icon moment">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 14l-3-4h6l-3 4z" />
                    </svg>
                  </div>
                  <div className="finding-content">
                    <span className="finding-label">Maximum Moment Location</span>
                    <span className="finding-value">
                      {maxMomentDepth.toFixed(2)} m depth
                    </span>
                  </div>
                </div>
                <div className="finding-card">
                  <div className="finding-icon stiffness">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <rect x="4" y="4" width="12" height="12" rx="2" />
                    </svg>
                  </div>
                  <div className="finding-content">
                    <span className="finding-label">Pile Head Stiffness</span>
                    <span className="finding-value">
                      {(loadCase.lateralLoad / (results.deflectionAtLoad * 1000)).toFixed(1)} kN/mm
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cross section preview */}
            <div className="section-preview">
              <PileCrossSection pileData={pileData} size={200} />
            </div>

            {/* Export buttons */}
            <div className="export-actions">
              <button className="export-btn" disabled title="Coming soon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1v10M4 7l4 4 4-4M2 13h12v2H2z" />
                </svg>
                Export PNG
              </button>
              <button className="export-btn" disabled title="Coming soon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 1h8l3 3v11H1V1h3zm4 8V5h2v4h2l-3 3-3-3h2z" />
                </svg>
                Export PDF
              </button>
              <button
                className="export-btn"
                onClick={() => {
                  const dataStr = JSON.stringify(results, null, 2);
                  const blob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'pile-analysis-results.json';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2 2h12v12H2V2zm2 2v8h8V4H4z" />
                </svg>
                Export JSON
              </button>
            </div>
          </div>
        )}

        {/* Charts Tab */}
        {activeTab === 'charts' && (
          <div className="charts-tab">
            <ChartsPanel results={results} />
          </div>
        )}

        {/* Elevation Tab */}
        {activeTab === 'elevation' && (
          <div className="elevation-tab">
            <div className="elevation-layout">
              <PileElevation
                pileData={pileData}
                loadCase={loadCase}
                results={results}
                width={400}
                height={550}
              />
              <div className="elevation-sidebar">
                <PileCrossSection pileData={pileData} size={220} />
                <div className="results-table">
                  <h4>Results at Key Points</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>Depth (m)</th>
                        <th>Deflection (mm)</th>
                        <th>Moment (kN-m)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                        const idx = Math.min(
                          Math.floor(fraction * (results.depths.length - 1)),
                          results.depths.length - 1
                        );
                        return (
                          <tr key={fraction}>
                            <td>{results.depths[idx].toFixed(2)}</td>
                            <td>{(results.deflections[idx] * 1000).toFixed(2)}</td>
                            <td>{results.moments[idx].toFixed(1)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Raw Data Tab */}
        {activeTab === 'data' && (
          <div className="data-tab">
            <div className="data-section">
              <h3>Analysis Parameters</h3>
              <div className="data-grid">
                <div className="data-item">
                  <span className="data-label">Pile Length</span>
                  <span className="data-value">{pileData.length.toFixed(2)} m</span>
                </div>
                <div className="data-item">
                  <span className="data-label">Pile Diameter</span>
                  <span className="data-value">{(pileData.diameter * 1000).toFixed(0)} mm</span>
                </div>
                <div className="data-item">
                  <span className="data-label">Flexural Rigidity (EI)</span>
                  <span className="data-value">{pileData.EI.toLocaleString()} kN-m<sup>2</sup></span>
                </div>
                <div className="data-item">
                  <span className="data-label">Material</span>
                  <span className="data-value">{pileData.material}</span>
                </div>
                <div className="data-item">
                  <span className="data-label">Lateral Load</span>
                  <span className="data-value">{loadCase.lateralLoad} kN</span>
                </div>
                <div className="data-item">
                  <span className="data-label">Applied Moment</span>
                  <span className="data-value">{loadCase.moment} kN-m</span>
                </div>
              </div>
            </div>

            <div className="data-section">
              <h3>Numerical Results</h3>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Node</th>
                      <th>Depth (m)</th>
                      <th>Deflection (mm)</th>
                      <th>Moment (kN-m)</th>
                      <th>Shear (kN)</th>
                      <th>Soil Reaction (kN/m)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.depths.map((depth, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{depth.toFixed(3)}</td>
                        <td>{(results.deflections[idx] * 1000).toFixed(4)}</td>
                        <td>{results.moments[idx].toFixed(2)}</td>
                        <td>{results.shears[idx].toFixed(2)}</td>
                        <td>{results.soilReactions[idx].toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <details className="raw-json">
              <summary>View Raw JSON</summary>
              <pre>{JSON.stringify(results, null, 2)}</pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResultsPanel;
