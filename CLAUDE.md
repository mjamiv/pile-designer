# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Pile Designer** is an open-source geotechnical engineering application for analyzing laterally loaded piles, modeled after the industry-standard L-Pile program. The application performs full non-linear analysis using P-Y curve methods and finite difference techniques.

**Repository:** https://github.com/mjamiv/piledesigner
**Deployment:** GitHub Pages (static site)
**License:** Open source (free)

## Technology Stack

### Architecture: Client-Side Python via Pyodide

Since this application is deployed on GitHub Pages (static hosting only), all computation runs **client-side** in the browser using:

- **Pyodide** - Python + NumPy/SciPy compiled to WebAssembly
- **React 18+ with TypeScript** - Modern UI framework
- **Plotly.js** - Interactive engineering visualization
- **Vite** - Fast build tooling

### Why Pyodide?

1. **No backend server needed** - runs entirely in browser
2. **Full NumPy/SciPy support** - use actual scientific Python libraries
3. **Performance** - 3-5x slower than native Python, but still fast enough (1-5 sec for typical problems)
4. **Educational** - users can see and modify actual Python code

## Computational Methodology

### Governing Equation

Laterally loaded pile analyzed using **beam-column equation**:

```
EI · d⁴y/dx⁴ + P · d²y/dx² + p(y) = 0
```

Where:
- `y(x)` = lateral deflection
- `EI` = flexural rigidity
- `P` = axial load
- `p(y)` = soil reaction (from P-Y curves, non-linear)

### Solution Approach

**Finite Difference Method:**
- Discretize pile into nodes (typically 50-200)
- Approximate derivatives using 5-point stencil
- Assemble pentadiagonal stiffness matrix
- Solve non-linear system via Newton-Raphson iteration

**Newton-Raphson Iteration:**
- Iterate until convergence: `||R|| / ||F|| < 1e-6`
- Adaptive load stepping for robustness
- Under-relaxation to prevent divergence
- Line search for optimal step size

### P-Y Curve Models

Three industry-standard methods implemented:

1. **Matlock (1970) - Soft Clay**
   - `p = 0.5 · p_u · (y/y_50)^(1/3)` for `y ≤ 8·y_50`
   - Static and cyclic loading support

2. **Reese et al. (1975) - Stiff Clay**
   - 5-segment piecewise curve
   - Shallow: `p_u = (3 + γ'z/c_u + Jz/b) · c_u · b`
   - Deep: `p_u = 11 · c_u · b`

3. **API RP2A (2014) - Sand**
   - `p = A · p_u · tanh(kz/Ap_u · y)`
   - Depth-dependent initial stiffness

## Project Structure

```
pile-designer/
├── public/
│   └── index.html              # Main HTML
├── src/
│   ├── components/
│   │   ├── InputPanel.tsx      # Pile/soil/load inputs
│   │   ├── ResultsPanel.tsx    # Numerical results
│   │   └── PlotPanel.tsx       # Plotly visualizations
│   ├── engine/
│   │   ├── pyodide-loader.ts   # Initialize Pyodide runtime
│   │   ├── pile-solver.py      # Finite difference solver
│   │   ├── py-curves.py        # P-Y curve implementations
│   │   ├── finite-difference.py # Matrix assembly
│   │   └── newton-raphson.py   # Non-linear solver
│   ├── types/
│   │   └── pile-types.ts       # TypeScript interfaces
│   ├── utils/
│   │   └── formatters.ts       # Unit conversions
│   └── App.tsx                 # Main application
├── package.json
├── vite.config.ts
└── README.md
```

## Critical Implementation Files

### 1. pile-solver.py (Backend Core)
- Finite difference matrix assembly
- Newton-Raphson solver loop
- Convergence checking (residual, displacement, energy)
- Adaptive load stepping
- Divergence recovery strategies

### 2. py-curves.py (Soil Models)
Complete implementations with all equations:
- `matlock_soft_clay()` - returns (p, k_tangent)
- `reese_stiff_clay()` - 5-segment piecewise
- `api_rp2a_sand()` - hyperbolic tangent

### 3. pyodide-loader.ts (Bridge)
- Load Pyodide from CDN (cached)
- Initialize NumPy/SciPy packages
- Marshal data between JavaScript ↔ Python
- Run solver in Web Worker (non-blocking UI)

### 4. InputPanel.tsx (User Interface)
- Pile geometry input
- Soil profile builder (multi-layer)
- Load case manager
- P-Y curve method selection
- Unit conversion (SI/Imperial)

### 5. PlotPanel.tsx (Visualization)
Plotly.js charts:
- Deflection vs depth
- Moment diagram
- Shear diagram
- Soil reaction (P-Y response)

## Development Workflow

### Initial Setup
```bash
npm install
npm run dev          # Start dev server
```

### Build for GitHub Pages
```bash
npm run build        # Creates /dist folder
git add dist
git commit -m "Build for deployment"
git push
```

### Deployment
- GitHub Actions auto-deploys on push to `main`
- Site available at: https://mjamiv.github.io/piledesigner/

### Testing
- **Unit tests:** P-Y curves against hand calculations
- **Integration tests:** Full analysis vs analytical solutions
- **Validation:** Compare against L-Pile benchmarks (<5% difference target)

## Key Design Decisions

1. **Pyodide over JavaScript**: Use actual Python/NumPy instead of reimplementing in JS
2. **Web Workers**: Run heavy computation in background thread (UI stays responsive)
3. **Sparse matrices**: SciPy sparse solvers for performance
4. **Modular P-Y curves**: Strategy pattern for extensibility
5. **Progressive enhancement**: Start simple, add complexity incrementally

## Performance Targets

- **Simple analysis** (50 nodes, uniform soil): < 1 second
- **Complex analysis** (200 nodes, multi-layer): < 5 seconds
- **Initial Pyodide load**: ~3-5 seconds (cached after first load)

## Future Development Phases

**Phase 1 (Current):** Single pile analysis
- Vertical uniform piles
- Static lateral loads
- Standard P-Y curves

**Phase 2:** Advanced features
- Variable pile sections
- Multi-load cases
- Custom P-Y curves
- PDF report generation

**Phase 3:** GROUP analysis extension
- Multiple pile layouts
- Group interaction effects
- Pile cap modeling

## Validation Strategy

### Level 1: Analytical Solutions
- Elastic pile (linear P-Y)
- Infinite pile solutions
- Boundary condition verification

### Level 2: L-Pile Benchmarking
- Identical test cases
- <5% difference target
- Document deviations

### Level 3: Published Case Studies
- Mustang Island tests (Reese et al. 1974)
- Roosevelt Bridge tests
- Full-scale load test data

## Important Conventions

### Code Style
- **TypeScript:** Strict mode, explicit types
- **Python:** PEP 8, type hints
- **React:** Functional components, hooks
- **Comments:** Focus on "why" not "what"

### Units
- **SI (default):** m, kN, kPa, kN/m³
- **Imperial (optional):** ft, lb, psf, lb/ft³
- All internal calculations in SI, convert at UI layer

### Naming
- **Python:** snake_case (pile_diameter, cu, gamma_eff)
- **TypeScript:** camelCase (pileData, soilLayers, loadCases)
- **Components:** PascalCase (InputPanel, PlotPanel)

## Computational Details

### Matrix Assembly (5-point stencil)
```
Fourth derivative at node i:
d⁴y/dx⁴ ≈ (y[i-2] - 4y[i-1] + 6y[i] - 4y[i+1] + y[i+2]) / h⁴

Stiffness matrix row i:
EI/h⁴ · [1, -4+β, 6+β, -4+β, 1] · [y[i-2], y[i-1], y[i], y[i+1], y[i+2]]
where β = -Ph²/EI
```

### Convergence Criteria (all must pass)
1. **Residual:** `||R|| / ||F|| < 1e-6`
2. **Displacement:** `||Δy|| / ||y|| < 1e-6`
3. **Energy:** `|Δy·R| / |y·F| < 1e-8`

### Boundary Conditions
- **Free head:** M=0, V=0 (moment, shear zero)
- **Fixed head:** y=0, dy/dx=0 (deflection, rotation zero)
- **Free tip:** M=0, V=0 (embedded deep below)

## References

### P-Y Curve Methods
- Matlock (1970): OTC 1204 - Soft clay
- Reese et al. (1975): OTC 2312 - Stiff clay
- API RP2A (2014): Section 6.8.3 - Sand

### Software
- L-Pile (Ensoft): Industry standard comparison tool
- Pyodide: https://pyodide.org
- SciPy sparse solvers: https://docs.scipy.org/doc/scipy/reference/sparse.linalg.html

## Known Limitations

1. **Current:** Single vertical pile only
2. **Current:** Static loading only (no time-dependent effects)
3. **Performance:** 3-5x slower than native Python (acceptable)
4. **Browser memory:** 2GB limit (not an issue for realistic pile problems)

## Getting Help

- **Documentation:** See `/docs` folder (when created)
- **Issues:** https://github.com/mjamiv/piledesigner/issues
- **Discussions:** GitHub Discussions

## Status: Initial Planning Complete

Ready to begin implementation. Start with:
1. Set up Vite + React + TypeScript project
2. Implement Pyodide loader
3. Create simple P-Y curve (linear elastic)
4. Build basic finite difference solver
5. Add simple UI for single pile case
6. Validate against analytical solution
