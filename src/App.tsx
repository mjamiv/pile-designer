import { useState, useEffect } from 'react';
import { loadPyodide } from './engine/pyodide-loader';
import InputPanel from './components/InputPanel';
import ResultsPanel from './components/ResultsPanel';
import { PileData, LoadCase, AnalysisConfig, AnalysisResults } from './types/pile-types';
import './App.css';

function App() {
  const [pyodideReady, setPyodideReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadMessage, setLoadMessage] = useState('Initializing...');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);

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
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <rect x="26" y="8" width="12" height="48" rx="2" fill="#3a3a3a" />
                <rect x="26" y="8" width="12" height="48" rx="2" stroke="#646cff" strokeWidth="2" strokeDasharray="4 2" className="pile-outline" />
                <line x1="12" y1="20" x2="52" y2="20" stroke="#4ade80" strokeWidth="2" />
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
            />
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
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 3a7 7 0 100 14 7 7 0 000-14zM8 7l6 3-6 3V7z" />
                  </svg>
                  Run Analysis
                </>
              )}
            </button>
          </div>

          <div className="right-panel">
            <ResultsPanel
              results={results}
              isAnalyzing={isAnalyzing}
              pileData={pileData}
              loadCase={loadCase}
            />
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
            Powered by Pyodide + React | Version 0.1.0
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
