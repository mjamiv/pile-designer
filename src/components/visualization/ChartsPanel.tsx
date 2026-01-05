import { useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { AnalysisResults } from '../../types/pile-types';
import './visualization.css';

interface ChartsPanelProps {
  results: AnalysisResults;
}

type ChartType = 'deflection' | 'moment' | 'shear' | 'soilReaction';

interface ChartConfig {
  id: ChartType;
  title: string;
  xLabel: string;
  yLabel: string;
}

const chartConfigs: ChartConfig[] = [
  { id: 'deflection', title: 'Deflection Profile', xLabel: 'Deflection (in)', yLabel: 'Depth (ft)' },
  { id: 'moment', title: 'Bending Moment', xLabel: 'Moment (kip-ft)', yLabel: 'Depth (ft)' },
  { id: 'shear', title: 'Shear Force', xLabel: 'Shear (kips)', yLabel: 'Depth (ft)' },
  { id: 'soilReaction', title: 'Soil Reaction', xLabel: 'Reaction (kip/ft)', yLabel: 'Depth (ft)' },
];

// Color scheme
const colors = {
  primary: '#646cff',
  primaryLight: '#8b92ff',
  secondary: '#4ade80',
  warning: '#fbbf24',
  danger: '#f87171',
  grid: '#3a3a3a',
  text: '#888888',
  background: '#1e1e1e',
  cardBackground: '#2a2a2a',
};

function ChartsPanel({ results }: ChartsPanelProps) {
  const [activeChart, setActiveChart] = useState<ChartType>('deflection');
  const [viewMode, setViewMode] = useState<'grid' | 'single'>('grid');

  // Convert to imperial units for display
  const deflectionsIn = useMemo(
    () => results.deflections.map((d) => d * 39.3701), // m to in
    [results.deflections]
  );
  const depthsFt = useMemo(
    () => results.depths.map((d) => d / 0.3048), // m to ft
    [results.depths]
  );
  const momentsKipFt = useMemo(
    () => results.moments.map((m) => m / 1.35582), // kN-m to kip-ft
    [results.moments]
  );
  const shearsKips = useMemo(
    () => results.shears.map((s) => s / 4.44822), // kN to kips
    [results.shears]
  );
  const reactionsKipFt = useMemo(
    () => results.soilReactions.map((r) => r / 1.45939), // kN/m to kip/ft
    [results.soilReactions]
  );

  // Find max values and their indices for highlighting
  const maxPoints = useMemo(() => {
    // Find index of maximum absolute value
    const findMaxAbsIndex = (arr: number[]) => {
      let maxIdx = 0;
      let maxAbsVal = Math.abs(arr[0]);
      for (let i = 1; i < arr.length; i++) {
        const absVal = Math.abs(arr[i]);
        if (absVal > maxAbsVal) {
          maxAbsVal = absVal;
          maxIdx = i;
        }
      }
      return maxIdx;
    };

    const maxDeflIdx = findMaxAbsIndex(deflectionsIn);
    const maxMomentIdx = findMaxAbsIndex(momentsKipFt);
    const maxShearIdx = findMaxAbsIndex(shearsKips);
    const maxReactionIdx = findMaxAbsIndex(reactionsKipFt);

    return {
      deflection: { idx: maxDeflIdx, depth: depthsFt[maxDeflIdx], value: deflectionsIn[maxDeflIdx] },
      moment: { idx: maxMomentIdx, depth: depthsFt[maxMomentIdx], value: momentsKipFt[maxMomentIdx] },
      shear: { idx: maxShearIdx, depth: depthsFt[maxShearIdx], value: shearsKips[maxShearIdx] },
      soilReaction: { idx: maxReactionIdx, depth: depthsFt[maxReactionIdx], value: reactionsKipFt[maxReactionIdx] },
    };
  }, [deflectionsIn, depthsFt, momentsKipFt, shearsKips, reactionsKipFt]);

  // Common layout settings
  const getLayout = (config: ChartConfig): Partial<Plotly.Layout> => ({
    title: {
      text: config.title,
      font: { color: colors.text, size: 16 },
    },
    xaxis: {
      title: { text: config.xLabel, font: { color: colors.text } },
      gridcolor: colors.grid,
      zerolinecolor: colors.primary,
      zerolinewidth: 2,
      color: colors.text,
    },
    yaxis: {
      title: { text: config.yLabel, font: { color: colors.text } },
      autorange: 'reversed', // Depth increases downward
      gridcolor: colors.grid,
      color: colors.text,
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { color: colors.text },
    margin: { t: 50, r: 30, b: 60, l: 70 },
    showlegend: false,
    hovermode: 'closest',
  });

  // Deflection chart
  const deflectionChart = useMemo(() => {
    const maxPoint = maxPoints.deflection;
    return {
      data: [
        {
          x: deflectionsIn,
          y: depthsFt,
          type: 'scatter' as const,
          mode: 'lines' as const,
          line: { color: colors.primary, width: 3 },
          fill: 'tozerox' as const,
          fillcolor: 'rgba(100, 108, 255, 0.1)',
          name: 'Deflection',
          hovertemplate: 'Depth: %{y:.2f} ft<br>Deflection: %{x:.3f} in<extra></extra>',
        },
        {
          x: [maxPoint.value],
          y: [maxPoint.depth],
          type: 'scatter' as const,
          mode: 'markers' as const,
          marker: { color: colors.danger, size: 12, symbol: 'diamond' },
          name: 'Max Deflection',
          hovertemplate: `Max: ${maxPoint.value.toFixed(3)} in<br>at ${maxPoint.depth.toFixed(2)} ft<extra></extra>`,
        },
      ],
      layout: getLayout(chartConfigs[0]),
    };
  }, [deflectionsIn, depthsFt, maxPoints]);

  // Moment chart
  const momentChart = useMemo(() => {
    const maxPoint = maxPoints.moment;
    return {
      data: [
        {
          x: momentsKipFt,
          y: depthsFt,
          type: 'scatter' as const,
          mode: 'lines' as const,
          line: { color: colors.secondary, width: 3 },
          fill: 'tozerox' as const,
          fillcolor: 'rgba(74, 222, 128, 0.1)',
          name: 'Moment',
          hovertemplate: 'Depth: %{y:.2f} ft<br>Moment: %{x:.2f} kip-ft<extra></extra>',
        },
        {
          x: [maxPoint.value],
          y: [maxPoint.depth],
          type: 'scatter' as const,
          mode: 'markers' as const,
          marker: { color: colors.danger, size: 12, symbol: 'diamond' },
          name: 'Max Moment',
          hovertemplate: `Max: ${maxPoint.value.toFixed(2)} kip-ft<br>at ${maxPoint.depth.toFixed(2)} ft<extra></extra>`,
        },
      ],
      layout: getLayout(chartConfigs[1]),
    };
  }, [momentsKipFt, depthsFt, maxPoints]);

  // Shear chart
  const shearChart = useMemo(() => {
    const maxPoint = maxPoints.shear;
    return {
      data: [
        {
          x: shearsKips,
          y: depthsFt,
          type: 'scatter' as const,
          mode: 'lines' as const,
          line: { color: colors.warning, width: 3 },
          fill: 'tozerox' as const,
          fillcolor: 'rgba(251, 191, 36, 0.1)',
          name: 'Shear',
          hovertemplate: 'Depth: %{y:.2f} ft<br>Shear: %{x:.2f} kips<extra></extra>',
        },
        {
          x: [maxPoint.value],
          y: [maxPoint.depth],
          type: 'scatter' as const,
          mode: 'markers' as const,
          marker: { color: colors.danger, size: 12, symbol: 'diamond' },
          name: 'Max Shear',
          hovertemplate: `Max: ${maxPoint.value.toFixed(2)} kips<br>at ${maxPoint.depth.toFixed(2)} ft<extra></extra>`,
        },
      ],
      layout: getLayout(chartConfigs[2]),
    };
  }, [shearsKips, depthsFt, maxPoints]);

  // Soil Reaction chart
  const soilReactionChart = useMemo(() => {
    const maxPoint = maxPoints.soilReaction;
    return {
      data: [
        {
          x: reactionsKipFt,
          y: depthsFt,
          type: 'scatter' as const,
          mode: 'lines' as const,
          line: { color: '#e879f9', width: 3 },
          fill: 'tozerox' as const,
          fillcolor: 'rgba(232, 121, 249, 0.1)',
          name: 'Soil Reaction',
          hovertemplate: 'Depth: %{y:.2f} ft<br>Reaction: %{x:.2f} kip/ft<extra></extra>',
        },
        {
          x: [maxPoint.value],
          y: [maxPoint.depth],
          type: 'scatter' as const,
          mode: 'markers' as const,
          marker: { color: colors.danger, size: 12, symbol: 'diamond' },
          name: 'Max Reaction',
          hovertemplate: `Max: ${maxPoint.value.toFixed(2)} kip/ft<br>at ${maxPoint.depth.toFixed(2)} ft<extra></extra>`,
        },
      ],
      layout: getLayout(chartConfigs[3]),
    };
  }, [reactionsKipFt, depthsFt, maxPoints]);

  const charts = {
    deflection: deflectionChart,
    moment: momentChart,
    shear: shearChart,
    soilReaction: soilReactionChart,
  };

  const plotConfig: Partial<Plotly.Config> = {
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
    displaylogo: false,
    responsive: true,
  };

  return (
    <div className="charts-panel">
      <div className="charts-header">
        <h3>Analysis Charts</h3>
        <div className="charts-controls">
          <div className="view-toggle">
            <button
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="1" width="6" height="6" rx="1" />
                <rect x="9" y="1" width="6" height="6" rx="1" />
                <rect x="1" y="9" width="6" height="6" rx="1" />
                <rect x="9" y="9" width="6" height="6" rx="1" />
              </svg>
            </button>
            <button
              className={viewMode === 'single' ? 'active' : ''}
              onClick={() => setViewMode('single')}
              title="Single View"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="1" width="14" height="14" rx="1" />
              </svg>
            </button>
          </div>
          {viewMode === 'single' && (
            <div className="chart-tabs">
              {chartConfigs.map((config) => (
                <button
                  key={config.id}
                  className={activeChart === config.id ? 'active' : ''}
                  onClick={() => setActiveChart(config.id)}
                >
                  {config.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="charts-grid">
          {chartConfigs.map((config) => (
            <div key={config.id} className="chart-card">
              <Plot
                data={charts[config.id].data}
                layout={charts[config.id].layout}
                config={plotConfig}
                useResizeHandler
                style={{ width: '100%', height: '300px' }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="chart-single">
          <Plot
            data={charts[activeChart].data}
            layout={{
              ...charts[activeChart].layout,
              height: 500,
            }}
            config={plotConfig}
            useResizeHandler
            style={{ width: '100%', height: '500px' }}
          />
        </div>
      )}

      <div className="charts-legend">
        <div className="legend-item">
          <span className="legend-marker" style={{ backgroundColor: colors.danger }}></span>
          <span>Maximum Value Location</span>
        </div>
        <div className="legend-item">
          <span className="legend-marker hollow" style={{ borderColor: colors.primary }}></span>
          <span>Zero Reference Line</span>
        </div>
      </div>
    </div>
  );
}

export default ChartsPanel;
