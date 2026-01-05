import { useState, useMemo, useCallback } from 'react';
import { PileData, LoadCase, PileMaterial } from '../types/pile-types';
import './InputPanel.css';

interface InputPanelProps {
  pileData: PileData;
  loadCase: LoadCase;
  onPileDataChange: (data: PileData) => void;
  onLoadCaseChange: (loadCase: LoadCase) => void;
  lastRunAvailable?: boolean;
  onCopyFromLastRun?: () => void;
}

type UnitSystem = 'SI' | 'Imperial';

interface ValidationError {
  field: string;
  message: string;
}

// Preset pile configurations
interface PilePreset {
  id: string;
  name: string;
  description: string;
  data: Partial<PileData>;
}

const pilePresets: PilePreset[] = [
  {
    id: 'steel-12',
    name: '12" Steel Pipe Pile',
    description: 'Standard 12.75" OD x 0.375" wall steel pipe',
    data: {
      diameter: 0.324, // 12.75 inches in meters
      wallThickness: 0.0095, // 0.375 inches in meters
      material: 'steel',
      EI: 38000, // Approximate EI for this section
    },
  },
  {
    id: 'steel-16',
    name: '16" Steel Pipe Pile',
    description: 'Standard 16" OD x 0.5" wall steel pipe',
    data: {
      diameter: 0.406, // 16 inches in meters
      wallThickness: 0.0127, // 0.5 inches in meters
      material: 'steel',
      EI: 95000,
    },
  },
  {
    id: 'steel-24',
    name: '24" Steel Pipe Pile',
    description: 'Standard 24" OD x 0.5" wall steel pipe',
    data: {
      diameter: 0.610, // 24 inches in meters
      wallThickness: 0.0127, // 0.5 inches in meters
      material: 'steel',
      EI: 210000,
    },
  },
  {
    id: 'concrete-18',
    name: '18" Drilled Shaft',
    description: '18" diameter solid concrete drilled shaft',
    data: {
      diameter: 0.457, // 18 inches in meters
      wallThickness: undefined,
      material: 'concrete',
      EI: 45000,
    },
  },
  {
    id: 'concrete-24',
    name: '24" Drilled Shaft',
    description: '24" diameter solid concrete drilled shaft',
    data: {
      diameter: 0.610,
      wallThickness: undefined,
      material: 'concrete',
      EI: 120000,
    },
  },
  {
    id: 'concrete-36',
    name: '36" Drilled Shaft',
    description: '36" diameter solid concrete drilled shaft',
    data: {
      diameter: 0.914,
      wallThickness: undefined,
      material: 'concrete',
      EI: 420000,
    },
  },
  {
    id: 'timber-12',
    name: '12" Timber Pile',
    description: '12" diameter treated timber pile',
    data: {
      diameter: 0.305,
      wallThickness: undefined,
      material: 'timber',
      EI: 8500,
    },
  },
];

// Unit conversion factors (to SI)
const unitConversions = {
  length: { SI: 1, Imperial: 0.3048 }, // ft to m
  diameter: { SI: 1, Imperial: 0.0254 }, // in to m
  force: { SI: 1, Imperial: 4.44822 }, // kip to kN
  moment: { SI: 1, Imperial: 1.35582 }, // kip-ft to kN-m
  EI: { SI: 1, Imperial: 2.419e-6 }, // kip-ft^2 to kN-m^2 (simplified)
};

// Modulus of elasticity for materials (GPa)
const materialModulus: Record<PileMaterial, number> = {
  steel: 200,
  concrete: 30,
  timber: 10,
  composite: 50,
};

function InputPanel({
  pileData,
  loadCase,
  onPileDataChange,
  onLoadCaseChange,
}: InputPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    geometry: true,
    material: true,
    loads: true,
    presets: false,
  });

  const [unitSystem, setUnitSystem] = useState<UnitSystem>('Imperial');
  const [autoCalculateEI, setAutoCalculateEI] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  // Calculate EI based on section properties
  const calculateEI = useMemo(() => {
    if (!autoCalculateEI) return pileData.EI;

    const E = materialModulus[pileData.material] * 1e6; // kPa
    const D = pileData.diameter; // m
    const t = pileData.wallThickness || 0;

    let I: number;
    if (t > 0) {
      // Hollow section
      const outerD = D;
      const innerD = D - 2 * t;
      I = (Math.PI / 64) * (Math.pow(outerD, 4) - Math.pow(innerD, 4));
    } else {
      // Solid section
      I = (Math.PI / 64) * Math.pow(D, 4);
    }

    return E * I; // kN-m^2
  }, [autoCalculateEI, pileData.diameter, pileData.wallThickness, pileData.material, pileData.EI]);

  // Validate inputs
  const validateInputs = useCallback((data: PileData, load: LoadCase): ValidationError[] => {
    const errs: ValidationError[] = [];

    if (data.length <= 0) {
      errs.push({ field: 'length', message: 'Pile length must be positive' });
    }
    if (data.length > 100) {
      errs.push({ field: 'length', message: 'Pile length exceeds typical maximum (100m)' });
    }
    if (data.diameter <= 0) {
      errs.push({ field: 'diameter', message: 'Diameter must be positive' });
    }
    if (data.diameter > 5) {
      errs.push({ field: 'diameter', message: 'Diameter exceeds typical maximum (5m)' });
    }
    if (data.wallThickness && data.wallThickness >= data.diameter / 2) {
      errs.push({ field: 'wallThickness', message: 'Wall thickness too large for diameter' });
    }
    if (data.EI <= 0) {
      errs.push({ field: 'EI', message: 'Flexural rigidity must be positive' });
    }
    if (Math.abs(load.lateralLoad) > 10000) {
      errs.push({ field: 'lateralLoad', message: 'Lateral load exceeds typical maximum (10,000 kN)' });
    }

    return errs;
  }, []);

  // Handle pile data changes with validation
  const handlePileChange = useCallback(
    (updates: Partial<PileData>) => {
      const newData = { ...pileData, ...updates };

      // Auto-calculate EI if enabled
      if (autoCalculateEI && (updates.diameter !== undefined || updates.wallThickness !== undefined || updates.material !== undefined)) {
        const E = materialModulus[newData.material] * 1e6;
        const D = newData.diameter;
        const t = newData.wallThickness || 0;

        let I: number;
        if (t > 0) {
          const outerD = D;
          const innerD = D - 2 * t;
          I = (Math.PI / 64) * (Math.pow(outerD, 4) - Math.pow(innerD, 4));
        } else {
          I = (Math.PI / 64) * Math.pow(D, 4);
        }

        newData.EI = Math.round(E * I);
      }

      const validationErrors = validateInputs(newData, loadCase);
      setErrors(validationErrors);
      onPileDataChange(newData);
    },
    [pileData, loadCase, autoCalculateEI, validateInputs, onPileDataChange]
  );

  // Handle load case changes
  const handleLoadChange = useCallback(
    (updates: Partial<LoadCase>) => {
      const newLoad = { ...loadCase, ...updates };
      const validationErrors = validateInputs(pileData, newLoad);
      setErrors(validationErrors);
      onLoadCaseChange(newLoad);
    },
    [pileData, loadCase, validateInputs, onLoadCaseChange]
  );

  // Apply preset
  const applyPreset = useCallback(
    (preset: PilePreset) => {
      handlePileChange(preset.data);
      setExpandedSections((prev) => ({ ...prev, presets: false, geometry: true }));
    },
    [handlePileChange]
  );

  // Get field error
  const getFieldError = (field: string): string | undefined => {
    const error = errors.find((e) => e.field === field);
    return error?.message;
  };

  // Unit labels
  const units = {
    length: unitSystem === 'SI' ? 'm' : 'ft',
    diameter: unitSystem === 'SI' ? 'm' : 'in',
    force: unitSystem === 'SI' ? 'kN' : 'kip',
    moment: unitSystem === 'SI' ? 'kN-m' : 'kip-ft',
    EI: unitSystem === 'SI' ? 'kN-m^2' : 'kip-ft^2',
  };

  // Convert display value based on unit system
  const displayValue = (value: number, type: keyof typeof unitConversions): number => {
    if (unitSystem === 'SI') return value;
    return value / unitConversions[type][unitSystem];
  };

  // Convert input value to SI
  const toSI = (value: number, type: keyof typeof unitConversions): number => {
    if (unitSystem === 'SI') return value;
    return value * unitConversions[type][unitSystem];
  };

  return (
    <div className="input-panel enhanced">
      <div className="panel-header">
        <h2>Input Parameters</h2>
        <div className="unit-toggle">
          <button
            className={unitSystem === 'SI' ? 'active' : ''}
            onClick={() => setUnitSystem('SI')}
          >
            SI
          </button>
          <button
            className={unitSystem === 'Imperial' ? 'active' : ''}
            onClick={() => setUnitSystem('Imperial')}
          >
            Imperial
          </button>
        </div>
      </div>

      {/* Validation errors summary */}
      {errors.length > 0 && (
        <div className="validation-summary">
          <span className="warning-icon">!</span>
          <span>{errors.length} validation {errors.length === 1 ? 'warning' : 'warnings'}</span>
        </div>
      )}

      {/* Presets Section */}
      <section className={`input-section collapsible ${expandedSections.presets ? 'expanded' : ''}`}>
        <button className="section-header" onClick={() => toggleSection('presets')}>
          <span className="section-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 4h12v2H2V4zm0 3h12v2H2V7zm0 3h12v2H2v-2z" />
            </svg>
          </span>
          <h3>Quick Presets</h3>
          <span className={`expand-icon ${expandedSections.presets ? 'rotated' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M2 4l4 4 4-4" />
            </svg>
          </span>
        </button>
        {expandedSections.presets && (
          <div className="section-content">
            <div className="presets-grid">
              {pilePresets.map((preset) => (
                <button
                  key={preset.id}
                  className="preset-card"
                  onClick={() => applyPreset(preset)}
                  title={preset.description}
                >
                  <span className="preset-name">{preset.name}</span>
                  <span className="preset-desc">{preset.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Geometry Section */}
      <section className={`input-section collapsible ${expandedSections.geometry ? 'expanded' : ''}`}>
        <button className="section-header" onClick={() => toggleSection('geometry')}>
          <span className="section-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="6" y="1" width="4" height="14" rx="1" />
            </svg>
          </span>
          <h3>Pile Geometry</h3>
          <span className={`expand-icon ${expandedSections.geometry ? 'rotated' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M2 4l4 4 4-4" />
            </svg>
          </span>
        </button>
        {expandedSections.geometry && (
          <div className="section-content">
            <div className={`form-group ${getFieldError('length') ? 'has-error' : ''}`}>
              <label htmlFor="pile-length">
                Pile Length ({units.length})
                {getFieldError('length') && (
                  <span className="field-error">{getFieldError('length')}</span>
                )}
              </label>
              <input
                id="pile-length"
                type="number"
                value={displayValue(pileData.length, 'length').toFixed(2)}
                onChange={(e) =>
                  handlePileChange({ length: toSI(parseFloat(e.target.value) || 0, 'length') })
                }
                step={unitSystem === 'SI' ? '0.1' : '1'}
                min="0.1"
              />
            </div>

            <div className={`form-group ${getFieldError('diameter') ? 'has-error' : ''}`}>
              <label htmlFor="pile-diameter">
                Pile Diameter ({units.diameter})
                {getFieldError('diameter') && (
                  <span className="field-error">{getFieldError('diameter')}</span>
                )}
              </label>
              <input
                id="pile-diameter"
                type="number"
                value={
                  unitSystem === 'SI'
                    ? pileData.diameter.toFixed(3)
                    : (pileData.diameter / 0.0254).toFixed(1)
                }
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  handlePileChange({
                    diameter: unitSystem === 'SI' ? val : val * 0.0254,
                  });
                }}
                step={unitSystem === 'SI' ? '0.01' : '1'}
                min="0.01"
              />
            </div>

            <div className={`form-group ${getFieldError('wallThickness') ? 'has-error' : ''}`}>
              <label htmlFor="pile-wall">
                Wall Thickness ({units.diameter}) - for hollow piles
                {getFieldError('wallThickness') && (
                  <span className="field-error">{getFieldError('wallThickness')}</span>
                )}
              </label>
              <input
                id="pile-wall"
                type="number"
                value={
                  pileData.wallThickness
                    ? unitSystem === 'SI'
                      ? (pileData.wallThickness * 1000).toFixed(1)
                      : (pileData.wallThickness / 0.0254).toFixed(3)
                    : ''
                }
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  handlePileChange({
                    wallThickness: val
                      ? unitSystem === 'SI'
                        ? val / 1000
                        : val * 0.0254
                      : undefined,
                  });
                }}
                step={unitSystem === 'SI' ? '0.1' : '0.001'}
                min="0"
                placeholder="Leave empty for solid pile"
              />
              <span className="input-hint">
                {unitSystem === 'SI' ? 'Enter in mm' : 'Enter in inches'}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Material Section */}
      <section className={`input-section collapsible ${expandedSections.material ? 'expanded' : ''}`}>
        <button className="section-header" onClick={() => toggleSection('material')}>
          <span className="section-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="8" r="6" strokeWidth="2" stroke="currentColor" fill="none" />
            </svg>
          </span>
          <h3>Material Properties</h3>
          <span className={`expand-icon ${expandedSections.material ? 'rotated' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M2 4l4 4 4-4" />
            </svg>
          </span>
        </button>
        {expandedSections.material && (
          <div className="section-content">
            <div className="form-group">
              <label htmlFor="pile-material">Material Type</label>
              <select
                id="pile-material"
                value={pileData.material}
                onChange={(e) =>
                  handlePileChange({ material: e.target.value as PileMaterial })
                }
              >
                <option value="steel">Steel (E = 200 GPa)</option>
                <option value="concrete">Concrete (E = 30 GPa)</option>
                <option value="timber">Timber (E = 10 GPa)</option>
                <option value="composite">Composite (E = 50 GPa)</option>
              </select>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={autoCalculateEI}
                  onChange={(e) => {
                    setAutoCalculateEI(e.target.checked);
                    if (e.target.checked) {
                      handlePileChange({ EI: calculateEI });
                    }
                  }}
                />
                <span>Auto-calculate EI from section</span>
              </label>
            </div>

            <div className={`form-group ${getFieldError('EI') ? 'has-error' : ''}`}>
              <label htmlFor="pile-EI">
                Flexural Rigidity EI ({units.EI})
                {getFieldError('EI') && (
                  <span className="field-error">{getFieldError('EI')}</span>
                )}
              </label>
              <input
                id="pile-EI"
                type="number"
                value={autoCalculateEI ? calculateEI.toFixed(0) : pileData.EI}
                onChange={(e) =>
                  handlePileChange({ EI: parseFloat(e.target.value) || 0 })
                }
                step="1000"
                min="1"
                disabled={autoCalculateEI}
                className={autoCalculateEI ? 'calculated' : ''}
              />
              {autoCalculateEI && (
                <span className="input-hint calculated-hint">
                  Calculated from E = {materialModulus[pileData.material]} GPa and section geometry
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Loads Section */}
      <section className={`input-section collapsible ${expandedSections.loads ? 'expanded' : ''}`}>
        <button className="section-header" onClick={() => toggleSection('loads')}>
          <span className="section-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1v10M4 7l4 4 4-4" />
            </svg>
          </span>
          <h3>Applied Loads</h3>
          <span className={`expand-icon ${expandedSections.loads ? 'rotated' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M2 4l4 4 4-4" />
            </svg>
          </span>
        </button>
        {expandedSections.loads && (
          <div className="section-content">
            <div className={`form-group ${getFieldError('lateralLoad') ? 'has-error' : ''}`}>
              <label htmlFor="lateral-load">
                Lateral Load ({units.force})
                {getFieldError('lateralLoad') && (
                  <span className="field-error">{getFieldError('lateralLoad')}</span>
                )}
              </label>
              <input
                id="lateral-load"
                type="number"
                value={
                  unitSystem === 'SI'
                    ? loadCase.lateralLoad
                    : (loadCase.lateralLoad / 4.44822).toFixed(1)
                }
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  handleLoadChange({
                    lateralLoad: unitSystem === 'SI' ? val : val * 4.44822,
                  });
                }}
                step={unitSystem === 'SI' ? '10' : '1'}
              />
              <span className="input-hint">Positive = pushing pile in +X direction</span>
            </div>

            <div className="form-group">
              <label htmlFor="moment">Moment at Head ({units.moment})</label>
              <input
                id="moment"
                type="number"
                value={
                  unitSystem === 'SI'
                    ? loadCase.moment
                    : (loadCase.moment / 1.35582).toFixed(1)
                }
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  handleLoadChange({
                    moment: unitSystem === 'SI' ? val : val * 1.35582,
                  });
                }}
                step={unitSystem === 'SI' ? '10' : '1'}
              />
              <span className="input-hint">Positive = counterclockwise when viewed from +Y</span>
            </div>

            <div className="form-group">
              <label htmlFor="axial-load">Axial Load ({units.force})</label>
              <input
                id="axial-load"
                type="number"
                value={
                  unitSystem === 'SI'
                    ? loadCase.axialLoad
                    : (loadCase.axialLoad / 4.44822).toFixed(1)
                }
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  handleLoadChange({
                    axialLoad: unitSystem === 'SI' ? val : val * 4.44822,
                  });
                }}
                step={unitSystem === 'SI' ? '10' : '1'}
              />
              <span className="input-hint">Positive = compression (downward)</span>
            </div>
          </div>
        )}
      </section>

      {/* Info box */}
      <div className="info-box">
        <p>
          <strong>Current Configuration:</strong>
        </p>
        <ul className="config-summary">
          <li>
            {pileData.wallThickness ? 'Hollow' : 'Solid'} {pileData.material} pile
          </li>
          <li>
            L = {pileData.length.toFixed(1)} m, D = {(pileData.diameter * 1000).toFixed(0)} mm
          </li>
          <li>EI = {pileData.EI.toLocaleString()} kN-m<sup>2</sup></li>
        </ul>
      </div>
    </div>
  );
}

export default InputPanel;
