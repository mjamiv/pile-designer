import { useMemo } from 'react';
import { PileData, PileMaterial } from '../../types/pile-types';
import './visualization.css';

interface PileCrossSectionProps {
  pileData: PileData;
  size?: number; // SVG size in pixels
}

// Material colors for visualization
const materialColors: Record<PileMaterial, { primary: string; secondary: string; pattern?: string }> = {
  steel: { primary: '#6b7280', secondary: '#9ca3af', pattern: 'diagonal-lines' },
  concrete: { primary: '#a1a1aa', secondary: '#d4d4d8', pattern: 'dots' },
  timber: { primary: '#a16207', secondary: '#ca8a04', pattern: 'wood-grain' },
  composite: { primary: '#7c3aed', secondary: '#a78bfa', pattern: 'cross-hatch' },
};

// Material properties for display
const materialProperties: Record<PileMaterial, { name: string; E: string }> = {
  steel: { name: 'Steel', E: '200 GPa' },
  concrete: { name: 'Concrete', E: '25-40 GPa' },
  timber: { name: 'Timber', E: '8-14 GPa' },
  composite: { name: 'Composite', E: 'Variable' },
};

function PileCrossSection({ pileData, size = 250 }: PileCrossSectionProps) {
  const { diameter, wallThickness, material, EI } = pileData;

  // Calculate dimensions for SVG
  const dimensions = useMemo(() => {
    const padding = 40;
    const maxDiameter = size - padding * 2;
    const scale = maxDiameter / diameter; // pixels per meter

    const outerRadius = (diameter / 2) * scale;
    const innerRadius = wallThickness ? ((diameter / 2) - wallThickness) * scale : 0;
    const isPipe = wallThickness && wallThickness > 0;

    return {
      centerX: size / 2,
      centerY: size / 2,
      outerRadius,
      innerRadius,
      isPipe,
      scale,
    };
  }, [diameter, wallThickness, size]);

  const colors = materialColors[material];
  const props = materialProperties[material];

  // Calculate section properties
  const sectionProps = useMemo(() => {
    const D = diameter * 1000; // mm
    const t = (wallThickness || 0) * 1000; // mm

    // Area calculation
    let area: number;
    let momentOfInertia: number;

    if (wallThickness && wallThickness > 0) {
      // Hollow section (pipe)
      const outerD = D;
      const innerD = D - 2 * t;
      area = (Math.PI / 4) * (outerD ** 2 - innerD ** 2);
      momentOfInertia = (Math.PI / 64) * (outerD ** 4 - innerD ** 4);
    } else {
      // Solid section
      area = (Math.PI / 4) * D ** 2;
      momentOfInertia = (Math.PI / 64) * D ** 4;
    }

    return {
      area: area / 1e6, // m^2
      momentOfInertia: momentOfInertia / 1e12, // m^4
    };
  }, [diameter, wallThickness]);

  // Format large numbers
  const formatNumber = (num: number, precision = 2): string => {
    if (num >= 1e9) return (num / 1e9).toFixed(precision) + ' G';
    if (num >= 1e6) return (num / 1e6).toFixed(precision) + ' M';
    if (num >= 1e3) return (num / 1e3).toFixed(precision) + ' k';
    return num.toFixed(precision);
  };

  return (
    <div className="pile-cross-section">
      <h4>Pile Cross-Section</h4>

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="cross-section-svg"
      >
        {/* Pattern definitions */}
        <defs>
          <pattern id="diagonal-lines" patternUnits="userSpaceOnUse" width="6" height="6">
            <path d="M0,6 L6,0" stroke={colors.secondary} strokeWidth="1" opacity="0.3" />
          </pattern>
          <pattern id="dots" patternUnits="userSpaceOnUse" width="8" height="8">
            <circle cx="4" cy="4" r="1" fill={colors.secondary} opacity="0.4" />
          </pattern>
          <pattern id="wood-grain" patternUnits="userSpaceOnUse" width="10" height="4">
            <path d="M0,2 Q5,0 10,2" stroke={colors.secondary} strokeWidth="0.5" fill="none" opacity="0.3" />
          </pattern>
          <pattern id="cross-hatch" patternUnits="userSpaceOnUse" width="8" height="8">
            <path d="M0,0 L8,8 M8,0 L0,8" stroke={colors.secondary} strokeWidth="0.5" opacity="0.3" />
          </pattern>

          {/* Gradient for 3D effect */}
          <radialGradient id="pileGradient" cx="30%" cy="30%">
            <stop offset="0%" stopColor={colors.secondary} />
            <stop offset="100%" stopColor={colors.primary} />
          </radialGradient>

          {/* Inner gradient for pipe piles */}
          <radialGradient id="innerGradient" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#1e1e1e" />
            <stop offset="100%" stopColor="#2a2a2a" />
          </radialGradient>
        </defs>

        {/* Outer circle (pile) */}
        <circle
          cx={dimensions.centerX}
          cy={dimensions.centerY}
          r={dimensions.outerRadius}
          fill="url(#pileGradient)"
          stroke={colors.primary}
          strokeWidth="2"
        />

        {/* Pattern overlay */}
        <circle
          cx={dimensions.centerX}
          cy={dimensions.centerY}
          r={dimensions.outerRadius}
          fill={colors.pattern ? `url(#${colors.pattern})` : 'none'}
        />

        {/* Inner circle for pipe piles */}
        {dimensions.isPipe && (
          <circle
            cx={dimensions.centerX}
            cy={dimensions.centerY}
            r={dimensions.innerRadius}
            fill="url(#innerGradient)"
            stroke={colors.primary}
            strokeWidth="1"
            strokeDasharray="4 2"
          />
        )}

        {/* Diameter dimension line */}
        <g className="dimension-lines">
          {/* Horizontal diameter */}
          <line
            x1={dimensions.centerX - dimensions.outerRadius - 15}
            y1={dimensions.centerY}
            x2={dimensions.centerX - dimensions.outerRadius}
            y2={dimensions.centerY}
            stroke="#646cff"
            strokeWidth="1"
            markerEnd="url(#arrow)"
          />
          <line
            x1={dimensions.centerX + dimensions.outerRadius}
            y1={dimensions.centerY}
            x2={dimensions.centerX + dimensions.outerRadius + 15}
            y2={dimensions.centerY}
            stroke="#646cff"
            strokeWidth="1"
            markerEnd="url(#arrow)"
          />
          <line
            x1={dimensions.centerX - dimensions.outerRadius - 15}
            y1={dimensions.centerY}
            x2={dimensions.centerX + dimensions.outerRadius + 15}
            y2={dimensions.centerY}
            stroke="#646cff"
            strokeWidth="1"
            strokeDasharray="4 2"
          />

          {/* Diameter label */}
          <text
            x={dimensions.centerX}
            y={dimensions.centerY - dimensions.outerRadius - 20}
            textAnchor="middle"
            fill="#646cff"
            fontSize="12"
            fontWeight="600"
          >
            D = {(diameter * 1000).toFixed(0)} mm
          </text>

          {/* Wall thickness for pipe piles */}
          {dimensions.isPipe && wallThickness && (
            <>
              <line
                x1={dimensions.centerX + dimensions.innerRadius}
                y1={dimensions.centerY + 20}
                x2={dimensions.centerX + dimensions.outerRadius}
                y2={dimensions.centerY + 20}
                stroke="#4ade80"
                strokeWidth="2"
              />
              <text
                x={dimensions.centerX + dimensions.outerRadius + 5}
                y={dimensions.centerY + 25}
                textAnchor="start"
                fill="#4ade80"
                fontSize="11"
              >
                t = {(wallThickness * 1000).toFixed(0)} mm
              </text>
            </>
          )}
        </g>

        {/* Center point */}
        <circle
          cx={dimensions.centerX}
          cy={dimensions.centerY}
          r="3"
          fill="#646cff"
        />

        {/* Axis lines */}
        <line
          x1={dimensions.centerX - 10}
          y1={dimensions.centerY}
          x2={dimensions.centerX + 10}
          y2={dimensions.centerY}
          stroke="#646cff"
          strokeWidth="1"
          opacity="0.5"
        />
        <line
          x1={dimensions.centerX}
          y1={dimensions.centerY - 10}
          x2={dimensions.centerX}
          y2={dimensions.centerY + 10}
          stroke="#646cff"
          strokeWidth="1"
          opacity="0.5"
        />
      </svg>

      {/* Section properties info */}
      <div className="section-properties">
        <div className="property-row">
          <span className="property-label">Material:</span>
          <span className="property-value" style={{ color: colors.primary }}>
            {props.name}
          </span>
        </div>
        <div className="property-row">
          <span className="property-label">Type:</span>
          <span className="property-value">
            {dimensions.isPipe ? 'Hollow (Pipe)' : 'Solid'}
          </span>
        </div>
        <div className="property-row">
          <span className="property-label">Area:</span>
          <span className="property-value">
            {(sectionProps.area * 1e4).toFixed(2)} cm<sup>2</sup>
          </span>
        </div>
        <div className="property-row">
          <span className="property-label">Moment of Inertia:</span>
          <span className="property-value">
            {(sectionProps.momentOfInertia * 1e8).toFixed(0)} cm<sup>4</sup>
          </span>
        </div>
        <div className="property-row highlight">
          <span className="property-label">EI:</span>
          <span className="property-value">
            {formatNumber(EI)} kN-m<sup>2</sup>
          </span>
        </div>
      </div>

      {/* Scale indicator */}
      <div className="scale-indicator">
        <div className="scale-bar">
          <div
            className="scale-segment"
            style={{ width: Math.min(50, dimensions.scale * 0.1) }}
          />
        </div>
        <span className="scale-label">100 mm</span>
      </div>
    </div>
  );
}

export default PileCrossSection;
