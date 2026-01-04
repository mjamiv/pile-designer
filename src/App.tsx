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
      // Import the solver module
      const { runPython } = await import('./engine/pyodide-loader');

      // Read the Python solver code
      const solverCode = await fetch('/src/engine/pile-solver.py').then(r => r.text());

      // Load the solver module
      await runPython(solverCode);

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
        <h1>Pile Designer</h1>
        <p>Lateral Pile Analysis - Open Source Engineering Tool</p>
      </header>

      {!pyodideReady ? (
        <div className="loading-container">
          <h2>Loading computational engine...</h2>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${loadProgress}%` }}
            />
          </div>
          <p>{loadMessage} ({loadProgress}%)</p>
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
              {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>

          <div className="right-panel">
            <ResultsPanel results={results} isAnalyzing={isAnalyzing} />
          </div>
        </div>
      )}

      <footer className="app-footer">
        <p>
          Open source geotechnical engineering tool |{' '}
          <a href="https://github.com/mjamiv/piledesigner" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
