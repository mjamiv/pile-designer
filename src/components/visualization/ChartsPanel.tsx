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
  { id: 'deflection', title: 'Deflection Profile', xLabel: 'Deflection (mm)', yLabel: 'Depth (m)' },
  { id: 'moment', title: 'Bending Moment', xLabel: 'Moment (kN-m)', yLabel: 'Depth (m)' },
  { id: 'shear', title: 'Shear Force', xLabel: 'Shear (kN)', yLabel: 'Depth (m)' },
  { id: 'soilReaction', title: 'Soil Reaction', xLabel: 'Reaction (kN/m)', yLabel: 'Depth (m)' },
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

  // Convert deflections from m to mm for display
  const deflectionsMm = useMemo(
    () => results.deflections.map((d) => d * 1000),
    [results.deflections]
  );

  // Find max values and their indices for highlighting
  const maxPoints = useMemo(() => {
    const maxDeflIdx = deflectionsMm.indexOf(Math.max(...deflectionsMm.map(Math.abs)));
    const maxMomentIdx = results.moments.indexOf(
      Math.max(...results.moments.map(Math.abs))
    );
    const maxShearIdx = results.shears.indexOf(
      Math.max(...results.shears.map(Math.abs))
    );
    const maxReactionIdx = results.soilReactions.indexOf(
      Math.max(...results.soilReactions.map(Math.abs))
    );

    return {
      deflection: { idx: maxDeflIdx, depth: results.depths[maxDeflIdx], value: deflectionsMm[maxDeflIdx] },
      moment: { idx: maxMomentIdx, depth: results.depths[maxMomentIdx], value: results.moments[maxMomentIdx] },
      shear: { idx: maxShearIdx, depth: results.depths[maxShearIdx], value: results.shears[maxShearIdx] },
      soilReaction: { idx: maxReactionIdx, depth: results.depths[maxReactionIdx], value: results.soilReactions[maxReactionIdx] },
    };
  }, [deflectionsMm, results]);

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
          x: deflectionsMm,
          y: results.depths,
          type: 'scatter' as const,
          mode: 'lines' as const,
          line: { color: colors.primary, width: 3 },
          fill: 'tozerox' as const,
          fillcolor: 'rgba(100, 108, 255, 0.1)',
          name: 'Deflection',
          hovertemplate: 'Depth: %{y:.2f} m<br>Deflection: %{x:.2f} mm<extra></extra>',
        },
        {
          x: [maxPoint.value],
          y: [maxPoint.depth],
          type: 'scatter' as const,
          mode: 'markers' as const,
          marker: { color: colors.danger, size: 12, symbol: 'diamond' },
          name: 'Max Deflection',
          hovertemplate: `Max: ${maxPoint.value.toFixed(2)} mm<br>at ${maxPoint.depth.toFixed(2)} m<extra></extra>`,
        },
      ],
      layout: getLayout(chartConfigs[0]),
    };
  }, [deflectionsMm, results.depths, maxPoints]);

  // Moment chart
  const momentChart = useMemo(() => {
    const maxPoint = maxPoints.moment;
    return {
      data: [
        {
          x: results.moments,
          y: results.depths,
          type: 'scatter' as const,
          mode: 'lines' as const,
          line: { color: colors.secondary, width: 3 },
          fill: 'tozerox' as const,
          fillcolor: 'rgba(74, 222, 128, 0.1)',
          name: 'Moment',
          hovertemplate: 'Depth: %{y:.2f} m<br>Moment: %{x:.2f} kN-m<extra></extra>',
        },
        {
          x: [maxPoint.value],
          y: [maxPoint.depth],
          type: 'scatter' as const,
          mode: 'markers' as const,
          marker: { color: colors.danger, size: 12, symbol: 'diamond' },
          name: 'Max Moment',
          hovertemplate: `Max: ${maxPoint.value.toFixed(2)} kN-m<br>at ${maxPoint.depth.toFixed(2)} m<extra></extra>`,
        },
      ],
      layout: getLayout(chartConfigs[1]),
    };
  }, [results.moments, results.depths, maxPoints]);

  // Shear chart
  const shearChart = useMemo(() => {
    const maxPoint = maxPoints.shear;
    return {
      data: [
        {
          x: results.shears,
          y: results.depths,
          type: 'scatter' as const,
          mode: 'lines' as const,
          line: { color: colors.warning, width: 3 },
          fill: 'tozerox' as const,
          fillcolor: 'rgba(251, 191, 36, 0.1)',
          name: 'Shear',
          hovertemplate: 'Depth: %{y:.2f} m<br>Shear: %{x:.2f} kN<extra></extra>',
        },
        {
          x: [maxPoint.value],
          y: [maxPoint.depth],
          type: 'scatter' as const,
          mode: 'markers' as const,
          marker: { color: colors.danger, size: 12, symbol: 'diamond' },
          name: 'Max Shear',
          hovertemplate: `Max: ${maxPoint.value.toFixed(2)} kN<br>at ${maxPoint.depth.toFixed(2)} m<extra></extra>`,
        },
      ],
      layout: getLayout(chartConfigs[2]),
    };
  }, [results.shears, results.depths, maxPoints]);

  // Soil Reaction chart
  const soilReactionChart = useMemo(() => {
    const maxPoint = maxPoints.soilReaction;
    return {
      data: [
        {
          x: results.soilReactions,
          y: results.depths,
          type: 'scatter' as const,
          mode: 'lines' as const,
          line: { color: '#e879f9', width: 3 },
          fill: 'tozerox' as const,
          fillcolor: 'rgba(232, 121, 249, 0.1)',
          name: 'Soil Reaction',
          hovertemplate: 'Depth: %{y:.2f} m<br>Reaction: %{x:.2f} kN/m<extra></extra>',
        },
        {
          x: [maxPoint.value],
          y: [maxPoint.depth],
          type: 'scatter' as const,
          mode: 'markers' as const,
          marker: { color: colors.danger, size: 12, symbol: 'diamond' },
          name: 'Max Reaction',
          hovertemplate: `Max: ${maxPoint.value.toFixed(2)} kN/m<br>at ${maxPoint.depth.toFixed(2)} m<extra></extra>`,
        },
      ],
      layout: getLayout(chartConfigs[3]),
    };
  }, [results.soilReactions, results.depths, maxPoints]);

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
