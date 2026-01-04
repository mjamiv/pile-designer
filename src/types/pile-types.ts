/**
 * TypeScript type definitions for Pile Designer
 */

// Pile geometry and material properties
export interface PileData {
  length: number;           // Total pile length (m)
  diameter: number;         // Pile diameter or width (m)
  wallThickness?: number;   // Wall thickness for pipe piles (m)
  EI: number;              // Flexural rigidity (kN·m²)
  material: PileMaterial;
  sections?: PileSection[]; // For variable section piles
}

export type PileMaterial = 'steel' | 'concrete' | 'timber' | 'composite';

export interface PileSection {
  startDepth: number;       // Depth where section starts (m)
  endDepth: number;         // Depth where section ends (m)
  diameter: number;         // Section diameter (m)
  EI: number;              // Section flexural rigidity (kN·m²)
}

// Soil profile and layer properties
export interface SoilProfile {
  layers: SoilLayer[];
  groundwaterDepth?: number; // Depth to groundwater table (m)
}

export interface SoilLayer {
  id: string;
  topDepth: number;         // Top of layer (m)
  bottomDepth: number;      // Bottom of layer (m)
  soilType: SoilType;
  pyCurveMethod: PYCurveMethod;
  properties: SoilProperties;
}

export type SoilType = 'soft-clay' | 'stiff-clay' | 'sand' | 'rock' | 'custom';

export type PYCurveMethod = 'matlock' | 'reese-stiff-clay' | 'api-sand' | 'custom';

export interface SoilProperties {
  // Common properties
  unitWeight: number;       // Total unit weight (kN/m³)
  effectiveUnitWeight?: number; // Effective unit weight (kN/m³)

  // Clay properties
  undrainedShearStrength?: number; // cu (kPa)
  epsilon50?: number;       // Strain at 50% peak stress
  J?: number;              // Empirical constant

  // Sand properties
  frictionAngle?: number;   // φ' (degrees)
  relativeDensity?: 'loose' | 'medium' | 'dense' | 'very-dense';
  k0?: number;             // Initial modulus of subgrade reaction (kN/m³)

  // Stiff clay specific
  ks?: number;             // Coefficient of subgrade modulus variation (kN/m³)
}

// Load cases
export interface LoadCase {
  id: string;
  name: string;
  lateralLoad: number;      // Horizontal load at pile head (kN)
  moment: number;          // Moment at pile head (kN·m)
  axialLoad: number;       // Axial load (kN, positive = compression)
  loadDepth: number;       // Depth where lateral load applied (m, 0 = pile head)
}

// Analysis configuration
export interface AnalysisConfig {
  boundaryCondition: BoundaryCondition;
  numNodes: number;        // Number of nodes for FD discretization
  maxIterations: number;   // Max Newton-Raphson iterations
  convergenceTolerance: number; // Convergence tolerance
  loadSteps: number;       // Number of load steps
}

export type BoundaryCondition = 'free-head' | 'fixed-head' | 'pinned-head';

// Analysis results
export interface AnalysisResults {
  converged: boolean;
  iterations: number;
  depths: number[];        // Depth coordinates (m)
  deflections: number[];   // Lateral deflections (m)
  moments: number[];       // Bending moments (kN·m)
  shears: number[];        // Shear forces (kN)
  soilReactions: number[]; // Soil reactions per unit length (kN/m)
  maxDeflection: number;
  maxMoment: number;
  maxShear: number;
  deflectionAtLoad: number; // Deflection at load application point
}

// Pyodide-related types
export interface PyodideInterface {
  runPython: (code: string) => any;
  runPythonAsync: (code: string) => Promise<any>;
  loadPackage: (packages: string | string[]) => Promise<void>;
  globals: any;
  pyimport: (moduleName: string) => any;
  FS: any;  // Filesystem API
  toPy: (obj: any) => any;  // Convert JS to Python
}

export interface SolverInput {
  pile: PileData;
  soil: SoilProfile;
  loadCase: LoadCase;
  config: AnalysisConfig;
}

export interface SolverOutput {
  success: boolean;
  results?: AnalysisResults;
  error?: string;
}

// UI state
export interface AppState {
  pileData: PileData;
  soilProfile: SoilProfile;
  loadCases: LoadCase[];
  activeLoadCaseId: string | null;
  analysisConfig: AnalysisConfig;
  results: AnalysisResults | null;
  isAnalyzing: boolean;
  pyodideReady: boolean;
  pyodideLoadProgress: number;
}
