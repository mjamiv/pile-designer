import { useMemo } from 'react';
import { PileData, LoadCase, AnalysisResults, PileMaterial } from '../../types/pile-types';
import './visualization.css';

interface PileElevationProps {
  pileData: PileData;
  loadCase: LoadCase;
  results?: AnalysisResults | null;
  width?: number;
  height?: number;
}

// Material colors
const materialColors: Record<PileMaterial, string> = {
  steel: '#6b7280',
  concrete: '#a1a1aa',
  timber: '#a16207',
  composite: '#7c3aed',
};

function PileElevation({
  pileData,
  loadCase,
  results,
  width = 350,
  height = 500,
}: PileElevationProps) {
  const { length, diameter, material } = pileData;
  const { lateralLoad, moment } = loadCase;

  // Calculate dimensions for SVG
  const dimensions = useMemo(() => {
    const padding = { top: 60, bottom: 40, left: 80, right: 100 };
    const drawableHeight = height - padding.top - padding.bottom;
    const drawableWidth = width - padding.left - padding.right;

    // Scale: pixels per meter
    const verticalScale = drawableHeight / length;
    const pileWidth = Math.max(30, Math.min(60, diameter * 100)); // Min 30px, max 60px

    // Pile position
    const pileLeft = padding.left + (drawableWidth - pileWidth) / 2;
    const pileTop = padding.top;
    const pileHeight = drawableHeight;

    // Deflection scale (exaggerate for visibility)
    let deflectionScale = 0;
    let maxDeflectionPx = 0;
    if (results && results.deflections.length > 0) {
      const maxDefl = Math.max(...results.deflections.map(Math.abs));
      if (maxDefl > 0) {
        maxDeflectionPx = Math.min(60, drawableWidth / 3); // Max 60px deflection display
        deflectionScale = maxDeflectionPx / maxDefl;
      }
    }

    return {
      padding,
      drawableHeight,
      drawableWidth,
      verticalScale,
      pileWidth,
      pileLeft,
      pileTop,
      pileHeight,
      deflectionScale,
      maxDeflectionPx,
      pileCenterX: pileLeft + pileWidth / 2,
    };
  }, [width, height, length, diameter, results]);

  // Generate deflected shape path
  const deflectedPath = useMemo(() => {
    if (!results || results.deflections.length < 2) return null;

    const points: string[] = [];
    const { depths, deflections } = results;

    for (let i = 0; i < depths.length; i++) {
      const y = dimensions.pileTop + depths[i] * dimensions.verticalScale;
      const x = dimensions.pileCenterX + deflections[i] * dimensions.deflectionScale;
      points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
    }

    return points.join(' ');
  }, [results, dimensions]);

  // Depth markers
  const depthMarkers = useMemo(() => {
    const markers: { depth: number; y: number }[] = [];
    const numMarkers = Math.min(6, Math.ceil(length));
    const interval = length / numMarkers;

    for (let i = 0; i <= numMarkers; i++) {
      const depth = i * interval;
      markers.push({
        depth,
        y: dimensions.pileTop + depth * dimensions.verticalScale,
      });
    }

    return markers;
  }, [length, dimensions]);

  // Load arrow dimensions
  const loadArrowLength = Math.min(80, Math.max(30, Math.abs(lateralLoad) / 2));
  const momentArcRadius = 25;

  return (
    <div className="pile-elevation">
      <h4>Pile Elevation View</h4>

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="elevation-svg"
      >
        <defs>
          {/* Arrow marker */}
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#f87171" />
          </marker>
          <marker
            id="arrowhead-blue"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#646cff" />
          </marker>

          {/* Soil pattern */}
          <pattern id="soil-pattern" patternUnits="userSpaceOnUse" width="20" height="20">
            <circle cx="5" cy="5" r="2" fill="#4a4a4a" opacity="0.3" />
            <circle cx="15" cy="15" r="1.5" fill="#4a4a4a" opacity="0.3" />
            <circle cx="15" cy="5" r="1" fill="#4a4a4a" opacity="0.2" />
            <circle cx="5" cy="15" r="1" fill="#4a4a4a" opacity="0.2" />
          </pattern>

          {/* Ground pattern */}
          <pattern id="ground-hatch" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#3a3a3a" strokeWidth="2" />
          </pattern>
        </defs>

        {/* Ground surface line */}
        <line
          x1={dimensions.padding.left - 20}
          y1={dimensions.pileTop}
          x2={width - dimensions.padding.right + 20}
          y2={dimensions.pileTop}
          stroke="#4ade80"
          strokeWidth="3"
        />

        {/* Ground hatching (above pile) */}
        <rect
          x={dimensions.padding.left - 20}
          y={dimensions.pileTop - 15}
          width={width - dimensions.padding.left - dimensions.padding.right + 40}
          height="15"
          fill="url(#ground-hatch)"
        />

        {/* Soil background */}
        <rect
          x={dimensions.padding.left - 20}
          y={dimensions.pileTop}
          width={width - dimensions.padding.left - dimensions.padding.right + 40}
          height={dimensions.pileHeight}
          fill="url(#soil-pattern)"
          opacity="0.5"
        />

        {/* Pile (undeformed) */}
        <rect
          x={dimensions.pileLeft}
          y={dimensions.pileTop}
          width={dimensions.pileWidth}
          height={dimensions.pileHeight}
          fill={materialColors[material]}
          stroke="#1a1a1a"
          strokeWidth="2"
          opacity="0.4"
        />

        {/* Pile outline pattern */}
        <rect
          x={dimensions.pileLeft}
          y={dimensions.pileTop}
          width={dimensions.pileWidth}
          height={dimensions.pileHeight}
          fill="none"
          stroke={materialColors[material]}
          strokeWidth="2"
          strokeDasharray="8 4"
        />

        {/* Deflected shape */}
        {deflectedPath && (
          <path
            d={deflectedPath}
            fill="none"
            stroke="#646cff"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}

        {/* Deflected pile shape (filled) */}
        {results && deflectedPath && (
          <path
            d={`${deflectedPath}
                L ${dimensions.pileCenterX + results.deflections[results.deflections.length - 1] * dimensions.deflectionScale + dimensions.pileWidth / 2} ${dimensions.pileTop + dimensions.pileHeight}
                L ${dimensions.pileCenterX + results.deflections[results.deflections.length - 1] * dimensions.deflectionScale + dimensions.pileWidth / 2} ${dimensions.pileTop + dimensions.pileHeight}
                L ${dimensions.pileLeft + dimensions.pileWidth} ${dimensions.pileTop + dimensions.pileHeight}
                L ${dimensions.pileLeft + dimensions.pileWidth} ${dimensions.pileTop}
                Z`}
            fill={materialColors[material]}
            opacity="0.2"
          />
        )}

        {/* Lateral load arrow */}
        {lateralLoad !== 0 && (
          <g className="load-arrow">
            <line
              x1={dimensions.pileLeft - loadArrowLength - 10}
              y1={dimensions.pileTop + 5}
              x2={dimensions.pileLeft - 5}
              y2={dimensions.pileTop + 5}
              stroke="#f87171"
              strokeWidth="3"
              markerEnd="url(#arrowhead)"
            />
            <text
              x={dimensions.pileLeft - loadArrowLength / 2 - 10}
              y={dimensions.pileTop - 5}
              textAnchor="middle"
              fill="#f87171"
              fontSize="12"
              fontWeight="600"
            >
              P = {lateralLoad} kN
            </text>
          </g>
        )}

        {/* Moment indicator */}
        {moment !== 0 && (
          <g className="moment-indicator">
            <path
              d={`M ${dimensions.pileCenterX - momentArcRadius} ${dimensions.pileTop + 30}
                  A ${momentArcRadius} ${momentArcRadius} 0 1 1 ${dimensions.pileCenterX + momentArcRadius} ${dimensions.pileTop + 30}`}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2"
              markerEnd="url(#arrowhead-blue)"
            />
            <text
              x={dimensions.pileCenterX}
              y={dimensions.pileTop + 55}
              textAnchor="middle"
              fill="#fbbf24"
              fontSize="11"
              fontWeight="600"
            >
              M = {moment} kN-m
            </text>
          </g>
        )}

        {/* Depth scale */}
        <g className="depth-scale">
          {/* Scale line */}
          <line
            x1={dimensions.padding.left - 40}
            y1={dimensions.pileTop}
            x2={dimensions.padding.left - 40}
            y2={dimensions.pileTop + dimensions.pileHeight}
            stroke="#888"
            strokeWidth="1"
          />

          {/* Depth markers */}
          {depthMarkers.map((marker, idx) => (
            <g key={idx}>
              <line
                x1={dimensions.padding.left - 45}
                y1={marker.y}
                x2={dimensions.padding.left - 35}
                y2={marker.y}
                stroke="#888"
                strokeWidth="1"
              />
              <text
                x={dimensions.padding.left - 50}
                y={marker.y + 4}
                textAnchor="end"
                fill="#888"
                fontSize="10"
              >
                {marker.depth.toFixed(1)} m
              </text>
            </g>
          ))}

          {/* Depth label */}
          <text
            x={dimensions.padding.left - 60}
            y={dimensions.pileTop + dimensions.pileHeight / 2}
            textAnchor="middle"
            fill="#888"
            fontSize="11"
            transform={`rotate(-90, ${dimensions.padding.left - 60}, ${dimensions.pileTop + dimensions.pileHeight / 2})`}
          >
            Depth (m)
          </text>
        </g>

        {/* Deflection scale (if results exist) */}
        {results && dimensions.maxDeflectionPx > 0 && (
          <g className="deflection-scale">
            <line
              x1={dimensions.pileCenterX}
              y1={height - 25}
              x2={dimensions.pileCenterX + dimensions.maxDeflectionPx}
              y2={height - 25}
              stroke="#646cff"
              strokeWidth="2"
            />
            <line
              x1={dimensions.pileCenterX}
              y1={height - 30}
              x2={dimensions.pileCenterX}
              y2={height - 20}
              stroke="#646cff"
              strokeWidth="1"
            />
            <line
              x1={dimensions.pileCenterX + dimensions.maxDeflectionPx}
              y1={height - 30}
              x2={dimensions.pileCenterX + dimensions.maxDeflectionPx}
              y2={height - 20}
              stroke="#646cff"
              strokeWidth="1"
            />
            <text
              x={dimensions.pileCenterX + dimensions.maxDeflectionPx / 2}
              y={height - 8}
              textAnchor="middle"
              fill="#646cff"
              fontSize="10"
            >
              {(results.maxDeflection * 1000).toFixed(1)} mm (exaggerated)
            </text>
          </g>
        )}

        {/* Max deflection point indicator */}
        {results && (
          <g className="max-point">
            {(() => {
              const maxIdx = results.deflections.indexOf(results.maxDeflection);
              const maxY = dimensions.pileTop + results.depths[maxIdx] * dimensions.verticalScale;
              const maxX = dimensions.pileCenterX + results.deflections[maxIdx] * dimensions.deflectionScale;
              return (
                <>
                  <circle cx={maxX} cy={maxY} r="6" fill="#f87171" stroke="#fff" strokeWidth="2" />
                  <line
                    x1={maxX + 10}
                    y1={maxY}
                    x2={width - dimensions.padding.right + 10}
                    y2={maxY}
                    stroke="#f87171"
                    strokeWidth="1"
                    strokeDasharray="4 2"
                  />
                  <text
                    x={width - dimensions.padding.right + 15}
                    y={maxY + 4}
                    textAnchor="start"
                    fill="#f87171"
                    fontSize="10"
                  >
                    Max: {(results.maxDeflection * 1000).toFixed(2)} mm
                  </text>
                </>
              );
            })()}
          </g>
        )}

        {/* Pile head indicator */}
        <circle
          cx={dimensions.pileCenterX}
          cy={dimensions.pileTop}
          r="5"
          fill="#646cff"
          stroke="#fff"
          strokeWidth="2"
        />

        {/* Legend */}
        <g className="legend" transform={`translate(${width - 90}, ${dimensions.pileTop + 10})`}>
          <rect x="0" y="0" width="80" height="60" fill="#1e1e1e" stroke="#3a3a3a" rx="4" />
          <line x1="8" y1="15" x2="28" y2="15" stroke={materialColors[material]} strokeWidth="2" strokeDasharray="4 2" />
          <text x="33" y="18" fill="#888" fontSize="9">Original</text>
          <line x1="8" y1="30" x2="28" y2="30" stroke="#646cff" strokeWidth="2" />
          <text x="33" y="33" fill="#888" fontSize="9">Deflected</text>
          <circle cx="18" cy="45" r="4" fill="#f87171" />
          <text x="33" y="48" fill="#888" fontSize="9">Max</text>
        </g>
      </svg>

      {/* Info panel */}
      <div className="elevation-info">
        <div className="info-row">
          <span>Pile Length:</span>
          <span>{length.toFixed(1)} m</span>
        </div>
        <div className="info-row">
          <span>Diameter:</span>
          <span>{(diameter * 1000).toFixed(0)} mm</span>
        </div>
        {results && (
          <>
            <div className="info-row highlight">
              <span>Head Deflection:</span>
              <span>{(results.deflectionAtLoad * 1000).toFixed(2)} mm</span>
            </div>
            <div className="info-row">
              <span>Max Moment:</span>
              <span>{results.maxMoment.toFixed(1)} kN-m</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PileElevation;
