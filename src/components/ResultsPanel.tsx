import { AnalysisResults } from '../types/pile-types';
import './ResultsPanel.css';

interface ResultsPanelProps {
  results: AnalysisResults | null;
  isAnalyzing: boolean;
}

function ResultsPanel({ results, isAnalyzing }: ResultsPanelProps) {
  if (isAnalyzing) {
    return (
      <div className="results-panel">
        <div className="analyzing-message">
          <h2>Analyzing...</h2>
          <p>Running finite difference analysis</p>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="results-panel">
        <div className="no-results">
          <h2>Results</h2>
          <p>Run an analysis to see results here</p>
          <div className="placeholder-icon">📊</div>
        </div>
      </div>
    );
  }

  return (
    <div className="results-panel">
      <h2>Analysis Results</h2>

      <div className="results-summary">
        <div className="summary-item">
          <span className="label">Status:</span>
          <span className={`value ${results.converged ? 'success' : 'error'}`}>
            {results.converged ? '✓ Converged' : '✗ Did not converge'}
          </span>
        </div>

        <div className="summary-item">
          <span className="label">Iterations:</span>
          <span className="value">{results.iterations}</span>
        </div>

        <div className="summary-item">
          <span className="label">Max Deflection:</span>
          <span className="value">{(results.maxDeflection * 1000).toFixed(2)} mm</span>
        </div>

        <div className="summary-item">
          <span className="label">Deflection at Load:</span>
          <span className="value">{(results.deflectionAtLoad * 1000).toFixed(2)} mm</span>
        </div>

        <div className="summary-item">
          <span className="label">Max Moment:</span>
          <span className="value">{results.maxMoment.toFixed(2)} kN·m</span>
        </div>

        <div className="summary-item">
          <span className="label">Max Shear:</span>
          <span className="value">{results.maxShear.toFixed(2)} kN</span>
        </div>
      </div>

      <div className="charts-container">
        <div className="chart-placeholder">
          <h3>Deflection Profile</h3>
          <p>Chart visualization coming soon with Plotly.js</p>
          <div className="data-preview">
            <p>Nodes: {results.depths.length}</p>
            <p>Depth range: 0 - {results.depths[results.depths.length - 1].toFixed(2)} m</p>
          </div>
        </div>

        <div className="chart-placeholder">
          <h3>Moment Diagram</h3>
          <p>Chart visualization coming soon</p>
        </div>
      </div>

      <details className="raw-data">
        <summary>View Raw Data</summary>
        <pre>{JSON.stringify(results, null, 2)}</pre>
      </details>
    </div>
  );
}

export default ResultsPanel;
