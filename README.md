# Pile Designer

Open-source geotechnical engineering application for analyzing laterally loaded piles, modeled after the industry-standard L-Pile program.

🚀 **Live Demo:** (https://mjamiv.github.io/pile-designer/)

## Features

- **Non-linear pile analysis** using P-Y curve methods
- **Finite difference solver** with Newton-Raphson iteration
- **Client-side computation** via Pyodide (Python in browser)
- **Interactive visualization** of results
- **Open source** and free to use

## Technology Stack

- **Frontend:** React + TypeScript + Vite
- **Computation:** Pyodide (Python + NumPy/SciPy in WebAssembly)
- **Visualization:** Plotly.js (planned)
- **Deployment:** GitHub Pages

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/mjamiv/piledesigner.git
cd piledesigner

# Install dependencies
npm install

# Start dev server
npm run dev
```

The application will be available at `http://localhost:3000`

### Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Project Structure

```
pile-designer/
├── src/
│   ├── components/      # React components
│   ├── engine/          # Pyodide loader & Python solver
│   ├── types/           # TypeScript type definitions
│   ├── App.tsx          # Main application
│   └── main.tsx         # Entry point
├── public/              # Static assets
└── index.html           # HTML template
```

## Computational Methodology

### Governing Equation

Laterally loaded piles are analyzed using the beam-column equation:

```
EI · d⁴y/dx⁴ + P · d²y/dx² + p(y) = 0
```

Where:
- `y(x)` = lateral deflection at depth x
- `EI` = flexural rigidity
- `P` = axial load
- `p(y)` = soil reaction (from P-Y curves)

### Solution Method

- **Finite Difference Method:** Discretize pile into nodes
- **Newton-Raphson Iteration:** Solve non-linear system
- **P-Y Curves:** Matlock (soft clay), Reese (stiff clay), API (sand)

## Roadmap

- [x] Project setup and basic UI
- [x] Pyodide integration
- [x] Basic finite difference solver
- [ ] Full P-Y curve implementations
- [ ] Interactive Plotly charts
- [ ] Soil profile builder
- [ ] Multiple load cases
- [ ] PDF report generation
- [ ] GROUP analysis (pile groups)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details

## References

- Matlock, H. (1970). Correlations for Design of Laterally Loaded Piles in Soft Clay
- Reese et al. (1975). Field Testing and Analysis of Laterally Loaded Piles in Stiff Clay
- API RP2A (2014). Recommended Practice for Planning, Designing and Constructing Fixed Offshore Platforms

## Acknowledgments

This project is inspired by L-Pile (Ensoft Inc.) and aims to provide an open-source alternative for educational and professional use.
