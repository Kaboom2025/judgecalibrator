import React from 'react';
import { PrecomputedResult, ProbeResult } from '../types';

interface BiasBarChartProps {
  results: PrecomputedResult[];
}

function probeVal(result: PrecomputedResult, name: string): ProbeResult | undefined {
  return result.probes.find(p => p.probe_name === name);
}

function abbreviateModel(judge: string): string {
  const parts = judge.split(' ');
  if (parts.length > 1) {
    return (parts[0].charAt(0) + parts.slice(1).map(p => p.charAt(0)).join('')).toUpperCase();
  }
  return judge.substring(0, 4).toUpperCase();
}

export function BiasBarChart({ results }: BiasBarChartProps) {
  if (results.length === 0) return null;

  const data = results.map(r => ({
    name: r.judge,
    abbr: abbreviateModel(r.judge),
    verbosity: probeVal(r, 'verbosity_bias')?.metric_value ?? 0,
    positional: probeVal(r, 'positional_bias')?.metric_value ?? 0,
  }));

  const maxValue = Math.max(
    ...data.map(d => Math.max(d.verbosity, d.positional * 100))
  );
  const padding = maxValue * 0.15;
  const scaledMax = maxValue + padding;

  // SVG dimensions
  const chartWidth = 600;
  const chartHeight = 300;
  const marginLeft = 60;
  const marginRight = 20;
  const marginTop = 30;
  const marginBottom = 60;
  const plotWidth = chartWidth - marginLeft - marginRight;
  const plotHeight = chartHeight - marginTop - marginBottom;

  // Axes
  const axisY = 0.95; // Position from bottom as fraction
  const axisX = marginLeft / chartWidth;

  // Scale functions
  const scaleY = (value: number) => {
    const normalized = value / scaledMax;
    return marginTop + plotHeight * (1 - normalized);
  };

  const scaleX = (index: number) => {
    const spacing = plotWidth / data.length;
    return marginLeft + (index + 0.5) * spacing;
  };

  // Bar width
  const barWidth = (plotWidth / data.length) * 0.35;

  return (
    <div className="bg-surface-container-low rounded-lg p-6 flex-1">
      <h3 className="text-sm font-mono font-semibold text-zinc-200 mb-4 uppercase tracking-wider">
        Bias Comparison Across Judges
      </h3>

      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full border border-zinc-700/30 rounded bg-zinc-950/30"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
          const y = marginTop + plotHeight * (1 - frac);
          const labelValue = (scaledMax * frac).toFixed(1);
          return (
            <g key={`grid-${i}`}>
              <line
                x1={marginLeft}
                y1={y}
                x2={chartWidth - marginRight}
                y2={y}
                stroke="rgb(113 113 122 / 0.2)"
                strokeWidth="1"
              />
              <text
                x={marginLeft - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="rgb(161 161 170)"
                fontFamily="monospace"
              >
                {labelValue}
              </text>
            </g>
          );
        })}

        {/* Threshold lines */}
        {/* Verbosity threshold at 0.9 */}
        <line
          x1={marginLeft}
          y1={scaleY(0.9)}
          x2={chartWidth - marginRight}
          y2={scaleY(0.9)}
          stroke="rgb(239 68 68 / 0.5)"
          strokeWidth="2"
          strokeDasharray="4,4"
        />
        <text
          x={chartWidth - marginRight - 5}
          y={scaleY(0.9) - 5}
          textAnchor="end"
          fontSize="10"
          fill="rgb(239 68 68)"
          fontFamily="monospace"
          opacity="0.7"
        >
          Verb. threshold
        </text>

        {/* Positional threshold at 0.30 (scaled to match verbosity scale) */}
        <line
          x1={marginLeft}
          y1={scaleY(0.30 * 100)}
          x2={chartWidth - marginRight}
          y2={scaleY(0.30 * 100)}
          stroke="rgb(239 68 68 / 0.5)"
          strokeWidth="2"
          strokeDasharray="4,4"
        />
        <text
          x={chartWidth - marginRight - 5}
          y={scaleY(0.30 * 100) + 12}
          textAnchor="end"
          fontSize="10"
          fill="rgb(239 68 68)"
          fontFamily="monospace"
          opacity="0.7"
        >
          Pos. threshold
        </text>

        {/* Bars */}
        {data.map((d, i) => {
          const x = scaleX(i);
          const verbosityHeight = (plotHeight * d.verbosity) / scaledMax;
          const positionalHeight = (plotHeight * (d.positional * 100)) / scaledMax;

          return (
            <g key={`bar-${i}`}>
              {/* Verbosity bar (blue) */}
              <rect
                x={x - barWidth - 5}
                y={marginTop + plotHeight - verbosityHeight}
                width={barWidth}
                height={verbosityHeight}
                fill="rgb(59 130 246)"
                opacity="0.7"
              />
              {/* Positional bar (amber) */}
              <rect
                x={x + 5}
                y={marginTop + plotHeight - positionalHeight}
                width={barWidth}
                height={positionalHeight}
                fill="rgb(217 119 6)"
                opacity="0.7"
              />

              {/* X-axis label */}
              <text
                x={x}
                y={marginTop + plotHeight + 20}
                textAnchor="middle"
                fontSize="11"
                fill="rgb(161 161 170)"
                fontFamily="monospace"
                fontWeight="500"
              >
                {d.abbr}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line
          x1={marginLeft}
          y1={marginTop + plotHeight}
          x2={chartWidth - marginRight}
          y2={marginTop + plotHeight}
          stroke="rgb(113 113 122)"
          strokeWidth="1"
        />
        <line
          x1={marginLeft}
          y1={marginTop}
          x2={marginLeft}
          y2={marginTop + plotHeight}
          stroke="rgb(113 113 122)"
          strokeWidth="1"
        />

        {/* Axis labels */}
        <text
          x={marginLeft - 30}
          y={marginTop / 2}
          fontSize="11"
          fill="rgb(161 161 170)"
          fontFamily="monospace"
          fontWeight="500"
        >
          Score
        </text>
        <text
          x={chartWidth / 2}
          y={chartHeight - 10}
          textAnchor="middle"
          fontSize="11"
          fill="rgb(161 161 170)"
          fontFamily="monospace"
          fontWeight="500"
        >
          Model
        </text>
      </svg>

      {/* Legend */}
      <div className="flex gap-6 mt-4 text-xs text-zinc-400 font-mono">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(59 130 246)', opacity: 0.7 }} />
          <span>Verbosity Bias</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(217 119 6)', opacity: 0.7 }} />
          <span>Positional Bias (flip %)</span>
        </div>
      </div>
    </div>
  );
}
