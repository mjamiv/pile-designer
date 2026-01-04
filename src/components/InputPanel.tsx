import { PileData, LoadCase } from '../types/pile-types';
import './InputPanel.css';

interface InputPanelProps {
  pileData: PileData;
  loadCase: LoadCase;
  onPileDataChange: (data: PileData) => void;
  onLoadCaseChange: (loadCase: LoadCase) => void;
}

function InputPanel({ pileData, loadCase, onPileDataChange, onLoadCaseChange }: InputPanelProps) {
  return (
    <div className="input-panel">
      <h2>Input Parameters</h2>

      <section className="input-section">
        <h3>Pile Properties</h3>

        <div className="form-group">
          <label htmlFor="pile-length">Pile Length (m)</label>
          <input
            id="pile-length"
            type="number"
            value={pileData.length}
            onChange={(e) =>
              onPileDataChange({ ...pileData, length: parseFloat(e.target.value) })
            }
            step="0.1"
            min="0.1"
          />
        </div>

        <div className="form-group">
          <label htmlFor="pile-diameter">Pile Diameter (m)</label>
          <input
            id="pile-diameter"
            type="number"
            value={pileData.diameter}
            onChange={(e) =>
              onPileDataChange({ ...pileData, diameter: parseFloat(e.target.value) })
            }
            step="0.01"
            min="0.01"
          />
        </div>

        <div className="form-group">
          <label htmlFor="pile-EI">Flexural Rigidity EI (kN·m²)</label>
          <input
            id="pile-EI"
            type="number"
            value={pileData.EI}
            onChange={(e) =>
              onPileDataChange({ ...pileData, EI: parseFloat(e.target.value) })
            }
            step="1000"
            min="1"
          />
        </div>

        <div className="form-group">
          <label htmlFor="pile-material">Material</label>
          <select
            id="pile-material"
            value={pileData.material}
            onChange={(e) =>
              onPileDataChange({ ...pileData, material: e.target.value as any })
            }
          >
            <option value="steel">Steel</option>
            <option value="concrete">Concrete</option>
            <option value="timber">Timber</option>
            <option value="composite">Composite</option>
          </select>
        </div>
      </section>

      <section className="input-section">
        <h3>Load Case</h3>

        <div className="form-group">
          <label htmlFor="lateral-load">Lateral Load (kN)</label>
          <input
            id="lateral-load"
            type="number"
            value={loadCase.lateralLoad}
            onChange={(e) =>
              onLoadCaseChange({ ...loadCase, lateralLoad: parseFloat(e.target.value) })
            }
            step="10"
          />
        </div>

        <div className="form-group">
          <label htmlFor="moment">Moment (kN·m)</label>
          <input
            id="moment"
            type="number"
            value={loadCase.moment}
            onChange={(e) =>
              onLoadCaseChange({ ...loadCase, moment: parseFloat(e.target.value) })
            }
            step="10"
          />
        </div>

        <div className="form-group">
          <label htmlFor="axial-load">Axial Load (kN, compression +)</label>
          <input
            id="axial-load"
            type="number"
            value={loadCase.axialLoad}
            onChange={(e) =>
              onLoadCaseChange({ ...loadCase, axialLoad: parseFloat(e.target.value) })
            }
            step="10"
          />
        </div>
      </section>

      <div className="info-box">
        <p><strong>Note:</strong> This is a simplified initial version. Full soil profile builder and advanced features coming soon!</p>
      </div>
    </div>
  );
}

export default InputPanel;
