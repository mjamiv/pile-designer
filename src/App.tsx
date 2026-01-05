import { useState, useEffect, useCallback } from 'react';
import { loadPyodide } from './engine/pyodide-loader';
import InputPanel from './components/InputPanel';
import ResultsPanel from './components/ResultsPanel';
import { PileData, LoadCase, AnalysisConfig, AnalysisResults } from './types/pile-types';
import './App.css';

// Solution history entry type
interface SolutionHistoryEntry {
  id: string;
  timestamp: Date;
  pileData: PileData;
  loadCase: LoadCase;
  results: AnalysisResults;
}

// Quick iterate parameter type
interface QuickIterateParams {
  lateralLoad: number;
  diameter: number;
  length: number;
}

function App() {
  const [pyodideReady, setPyodideReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadMessage, setLoadMessage] = useState('Initializing...');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);

  // Solution history state (last 5 runs)
  const [solutionHistory, setSolutionHistory] = useState<SolutionHistoryEntry[]>([]);
  const [compareEntry, setCompareEntry] = useState<SolutionHistoryEntry | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Quick iterate state
  const [quickIterateParams, setQuickIterateParams] = useState<QuickIterateParams>({
    lateralLoad: 100,
    diameter: 0.6,
    length: 10.0
  });

  // Default pile data
  const [pileData, setPileData] = useState<PileData>({
    length: 10.0,
    diameter: 0.6,
    EI: 50000,
    material: 'steel'
  });

  // Default load case
  const [loadCase, setLoadCase] = useState<LoadCase>({
    id: '1',
    name: 'Load Case 1',
    lateralLoad: 100,
    moment: 0,
    axialLoad: 0,
    loadDepth: 0
  });

  // Default analysis config
  const [analysisConfig] = useState<AnalysisConfig>({
    boundaryCondition: 'free-head',
    numNodes: 50,
    maxIterations: 50,
    convergenceTolerance: 1e-6,
    loadSteps: 10
  });

  // Sync quick iterate params with main values
  useEffect(() => {
    setQuickIterateParams({
      lateralLoad: loadCase.lateralLoad,
      diameter: pileData.diameter,
      length: pileData.length
    });
  }, [loadCase.lateralLoad, pileData.diameter, pileData.length]);

  // Load Pyodide on mount
  useEffect(() => {
    loadPyodide((progress, message) => {
      setLoadProgress(progress);
      setLoadMessage(message);
    })
      .then(() => {
        setPyodideReady(true);
        setLoadMessage('Pyodide ready!');
      })
      .catch((error) => {
        console.error('Failed to load Pyodide:', error);
        setLoadMessage(`Error: ${error.message}`);
      });
  }, []);

  // Add result to history
  const addToHistory = useCallback((pile: PileData, load: LoadCase, result: AnalysisResults) => {
    const entry: SolutionHistoryEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      pileData: { ...pile },
      loadCase: { ...load },
      results: result
    };

    setSolutionHistory(prev => {
      const newHistory = [entry, ...prev];
      return newHistory.slice(0, 5); // Keep only last 5
    });
  }, []);

  // Handle quick iterate slider changes
  const handleQuickIterateChange = (param: keyof QuickIterateParams, value: number) => {
    setQuickIterateParams(prev => ({ ...prev, [param]: value }));
  };

  // Apply quick iterate values and optionally run analysis
  const applyQuickIterateValues = (runAnalysis: boolean = false) => {
    setPileData(prev => ({
      ...prev,
      diameter: quickIterateParams.diameter,
      length: quickIterateParams.length
    }));
    setLoadCase(prev => ({
      ...prev,
      lateralLoad: quickIterateParams.lateralLoad
    }));

    if (runAnalysis) {
      // Need to use timeout to allow state to update
      setTimeout(() => handleAnalyze(), 100);
    }
  };

  // Copy from last run
  const copyFromLastRun = () => {
    if (solutionHistory.length > 0) {
      const lastRun = solutionHistory[0];
      setPileData({ ...lastRun.pileData });
      setLoadCase({ ...lastRun.loadCase });
    }
  };

  // Clear history
  const clearHistory = () => {
    setSolutionHistory([]);
  };

  // Handle comparison
  const handleCompare = (entry: SolutionHistoryEntry) => {
    setCompareEntry(entry);
    setShowComparison(true);
  };

  const closeComparison = () => {
    setShowComparison(false);
    setCompareEntry(null);
  };

  // Quick action handlers for results panel
  const handleIncreaseDiameter = () => {
    const newDiameter = pileData.diameter * 1.2;
    setPileData(prev => ({ ...prev, diameter: newDiameter }));
    setQuickIterateParams(prev => ({ ...prev, diameter: newDiameter }));
  };

  const handleReduceLoad = () => {
    const newLoad = loadCase.lateralLoad * 0.8;
    setLoadCase(prev => ({ ...prev, lateralLoad: newLoad }));
    setQuickIterateParams(prev => ({ ...prev, lateralLoad: newLoad }));
  };

  const handleAnalyze = async () => {
    if (!pyodideReady) {
      alert('Pyodide is still loading. Please wait...');
      return;
    }

    setIsAnalyzing(true);
    setResults(null);

    try {
      // Import the solver module and Python code
      const { runPython } = await import('./engine/pyodide-loader');
      const solverCode = await import('./engine/pile-solver.py?raw');

      // Load the solver module
      await runPython(solverCode.default);

      // Prepare input data
      const inputData = {
        pile_data: {
          length: pileData.length,
          diameter: pileData.diameter,
          EI: pileData.EI
        },
        soil_profile: {
          layers: []
        },
        load_case: {
          lateralLoad: loadCase.lateralLoad,
          moment: loadCase.moment,
          axialLoad: loadCase.axialLoad
        },
        config: {
          boundaryCondition: analysisConfig.boundaryCondition,
          numNodes: analysisConfig.numNodes,
          maxIterations: analysisConfig.maxIterations,
          convergenceTolerance: analysisConfig.convergenceTolerance
        }
      };

      // Run the solver
      const resultCode = `
import json
result = solve_pile(
  ${JSON.stringify(inputData.pile_data)},
  ${JSON.stringify(inputData.soil_profile)},
  ${JSON.stringify(inputData.load_case)},
  ${JSON.stringify(inputData.config)}
)
json.dumps(result)
      `;

      const resultJson = await runPython(resultCode);
      const analysisResults = JSON.parse(resultJson);

      if (analysisResults.success) {
        setResults(analysisResults as AnalysisResults);
        addToHistory(pileData, loadCase, analysisResults as AnalysisResults);
      } else {
        alert(`Analysis failed: ${analysisResults.error}`);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert(`Error running analysis: ${error}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <h1>Pile Designer</h1>
            <p>Lateral Pile Analysis - Open Source Engineering Tool</p>
          </div>
          <div className="header-badge">
            {pyodideReady ? (
              <span className="status-badge ready">Engine Ready</span>
            ) : (
              <span className="status-badge loading">Loading...</span>
            )}
          </div>
        </div>
      </header>

      {!pyodideReady ? (
        <div className="loading-container">
          <div className="loading-content">
            <div className="loading-icon">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <rect x="32" y="10" width="16" height="60" rx="2" fill="#1a1a1a" />
                <rect x="32" y="10" width="16" height="60" rx="2" stroke="#d4af37" strokeWidth="2" strokeDasharray="4 2" className="pile-outline" />
                <line x1="15" y1="25" x2="65" y2="25" stroke="#4ade80" strokeWidth="3" />
                {/* Ground texture */}
                <circle cx="22" cy="40" r="2" fill="#3a3a3a" opacity="0.5" />
                <circle cx="58" cy="50" r="3" fill="#3a3a3a" opacity="0.5" />
                <circle cx="20" cy="60" r="2.5" fill="#3a3a3a" opacity="0.5" />
                <circle cx="60" cy="65" r="2" fill="#3a3a3a" opacity="0.5" />
                {/* Load arrow */}
                <path d="M10 20 L28 20" stroke="#ffd700" strokeWidth="3" />
                <polygon points="28,15 38,20 28,25" fill="#ffd700" />
              </svg>
            </div>
            <h2>Loading Computational Engine</h2>
            <p>{loadMessage}</p>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
            <span className="progress-text">{loadProgress}%</span>
            <div className="loading-info">
              <p>Initializing Pyodide runtime with NumPy and SciPy...</p>
              <p className="loading-note">First load may take 10-20 seconds. Subsequent loads will be faster.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="main-content">
          <div className="left-panel">
            <InputPanel
              pileData={pileData}
              loadCase={loadCase}
              onPileDataChange={setPileData}
              onLoadCaseChange={setLoadCase}
              lastRunAvailable={solutionHistory.length > 0}
              onCopyFromLastRun={copyFromLastRun}
            />

            {/* Prominent Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="analyze-button"
            >
              {isAnalyzing ? (
                <>
                  <span className="button-spinner"></span>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                  </svg>
                  Run Analysis
                </>
              )}
            </button>

            {/* Quick Iterate Section */}
            <div className="quick-iterate">
              <div className="quick-iterate-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
                </svg>
                <h3>Quick Iterate</h3>
              </div>

              {/* Lateral Load Slider */}
              <div className="quick-slider">
                <div className="quick-slider-header">
                  <span className="quick-slider-label">Lateral Load (kN)</span>
                  <span className="quick-slider-value">{quickIterateParams.lateralLoad.toFixed(0)}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={quickIterateParams.lateralLoad}
                  onChange={(e) => handleQuickIterateChange('lateralLoad', parseFloat(e.target.value))}
                  style={{ '--progress': `${((quickIterateParams.lateralLoad - 10) / 490) * 100}%` } as React.CSSProperties}
                />
              </div>

              {/* Diameter Slider */}
              <div className="quick-slider">
                <div className="quick-slider-header">
                  <span className="quick-slider-label">Diameter (m)</span>
                  <span className="quick-slider-value">{quickIterateParams.diameter.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="2.0"
                  step="0.05"
                  value={quickIterateParams.diameter}
                  onChange={(e) => handleQuickIterateChange('diameter', parseFloat(e.target.value))}
                  style={{ '--progress': `${((quickIterateParams.diameter - 0.3) / 1.7) * 100}%` } as React.CSSProperties}
                />
              </div>

              {/* Length Slider */}
              <div className="quick-slider">
                <div className="quick-slider-header">
                  <span className="quick-slider-label">Length (m)</span>
                  <span className="quick-slider-value">{quickIterateParams.length.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="0.5"
                  value={quickIterateParams.length}
                  onChange={(e) => handleQuickIterateChange('length', parseFloat(e.target.value))}
                  style={{ '--progress': `${((quickIterateParams.length - 5) / 35) * 100}%` } as React.CSSProperties}
                />
              </div>

              {/* Quick Actions */}
              <div className="quick-actions">
                <button
                  className="quick-action-btn"
                  onClick={() => applyQuickIterateValues(false)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                  Apply
                </button>
                <button
                  className="quick-action-btn"
                  onClick={() => applyQuickIterateValues(true)}
                  disabled={isAnalyzing}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                  </svg>
                  Re-run
                </button>
              </div>
            </div>

            {/* Solution History */}
            <div className="solution-history">
              <div className="solution-history-header">
                <h3>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
                  </svg>
                  Solution History
                </h3>
                {solutionHistory.length > 0 && (
                  <button className="clear-history-btn" onClick={clearHistory}>
                    Clear
                  </button>
                )}
              </div>

              {solutionHistory.length === 0 ? (
                <div className="empty-history">
                  No analysis runs yet. Run an analysis to see history.
                </div>
              ) : (
                <div className="history-list">
                  {solutionHistory.map((entry, index) => (
                    <div
                      key={entry.id}
                      className={`history-item ${index === 0 ? 'active' : ''}`}
                    >
                      <div className="history-item-info">
                        <span className="history-item-label">
                          {index === 0 ? 'Current' : `Run ${solutionHistory.length - index}`}
                        </span>
                        <span className="history-item-params">
                          D={entry.pileData.diameter.toFixed(2)}m, L={entry.pileData.length.toFixed(1)}m, P={entry.loadCase.lateralLoad.toFixed(0)}kN
                        </span>
                      </div>
                      <span className="history-item-value">
                        {(entry.results.maxDeflection * 39.3701).toFixed(2)}"
                      </span>
                      {index !== 0 && (
                        <button
                          className="history-compare-btn"
                          onClick={() => handleCompare(entry)}
                        >
                          Compare
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="right-panel">
            <ResultsPanel
              results={results}
              isAnalyzing={isAnalyzing}
              pileData={pileData}
              loadCase={loadCase}
              onIncreaseDiameter={handleIncreaseDiameter}
              onReduceLoad={handleReduceLoad}
              onRerunAnalysis={handleAnalyze}
            />
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {showComparison && compareEntry && results && (
        <div className="comparison-view" onClick={closeComparison}>
          <div className="comparison-content" onClick={(e) => e.stopPropagation()}>
            <div className="comparison-header">
              <h2>Compare Results</h2>
              <button className="close-comparison-btn" onClick={closeComparison}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                </svg>
              </button>
            </div>
            <div className="comparison-grid">
              <div className="comparison-column current">
                <h3>
                  Current Run
                  <span className="badge badge-gold">Latest</span>
                </h3>
                <div className="comparison-data">
                  <div className="data-item">
                    <span className="data-label">Diameter</span>
                    <span className="data-value">{pileData.diameter.toFixed(2)} m</span>
                  </div>
                  <div className="data-item">
                    <span className="data-label">Length</span>
                    <span className="data-value">{pileData.length.toFixed(1)} m</span>
                  </div>
                  <div className="data-item">
                    <span className="data-label">Lateral Load</span>
                    <span className="data-value">{loadCase.lateralLoad.toFixed(0)} kN</span>
                  </div>
                  <div className="data-item">
                    <span className="data-label">Max Deflection</span>
                    <span className="data-value">{(results.maxDeflection * 39.3701).toFixed(3)} in</span>
                  </div>
                  <div className="data-item">
                    <span className="data-label">Max Moment</span>
                    <span className="data-value">{(results.maxMoment / 1.35582).toFixed(1)} kip-ft</span>
                  </div>
                </div>
              </div>
              <div className="comparison-column">
                <h3>
                  Previous Run
                  <span className="badge">Comparison</span>
                </h3>
                <div className="comparison-data">
                  <div className="data-item">
                    <span className="data-label">Diameter</span>
                    <span className="data-value">{compareEntry.pileData.diameter.toFixed(2)} m</span>
                  </div>
                  <div className="data-item">
                    <span className="data-label">Length</span>
                    <span className="data-value">{compareEntry.pileData.length.toFixed(1)} m</span>
                  </div>
                  <div className="data-item">
                    <span className="data-label">Lateral Load</span>
                    <span className="data-value">{compareEntry.loadCase.lateralLoad.toFixed(0)} kN</span>
                  </div>
                  <div className="data-item">
                    <span className="data-label">Max Deflection</span>
                    <span className="data-value">{(compareEntry.results.maxDeflection * 39.3701).toFixed(3)} in</span>
                  </div>
                  <div className="data-item">
                    <span className="data-label">Max Moment</span>
                    <span className="data-value">{(compareEntry.results.maxMoment / 1.35582).toFixed(1)} kip-ft</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <div className="footer-content">
          <p>
            Open source geotechnical engineering tool |{' '}
            <a href="https://github.com/mjamiv/piledesigner" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </p>
          <p className="version-info">
            Powered by <span>Pyodide + React</span> | Version 0.1.0
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
