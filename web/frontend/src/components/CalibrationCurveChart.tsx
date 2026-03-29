import React from 'react';
import { PrecomputedResult, ProbeResult } from '../types';

interface CalibrationCurveChartProps {
  results: PrecomputedResult[];
}

interface BinData {
  confidence_min: number;
  confidence_max: number;
  mean_confidence: number;
  accuracy: number;
  count: number;
}

function formatGrade(grade: string): string {
  return grade.replace('_PLUS', '+');
}

// Color palette: cycle through 10 distinct colors
const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
];

function getModelColor(index: number, grade: string): string {
  const baseColor = COLORS[index % COLORS.length];
  // Brighter for A/B+, muted for B/C
  const formattedGrade = formatGrade(grade);
  if (formattedGrade === 'A' || formattedGrade === 'B+') {
    return baseColor; // Full brightness
  }
  // Muted version by reducing opacity
  return baseColor + '80'; // 50% opacity for muted effect
}

export function CalibrationCurveChart({ results }: CalibrationCurveChartProps) {
  if (results.length === 0) return null;

  // Extract calibration curve data
  const curveData = results
    .map((r, idx) => {
      const calibProbe = r.probes.find(p => p.probe_name === 'calibration');
      if (!calibProbe || !calibProbe.details) return null;

      const bins = calibProbe.details.bins as BinData[] | undefined;
      if (!bins || !Array.isArray(bins) || bins.length === 0) return null;

      // Sort by mean_confidence
      const sortedBins = [...bins].sort((a, b) => a.mean_confidence - b.mean_confidence);

      return {
        model: r.judge,
        grade: r.trust_grade,
        color: getModelColor(idx, r.trust_grade),
        points: sortedBins.map(b => ({
          x: b.mean_confidence,
          y: b.accuracy,
        })),
      };
    })
    .filter(Boolean);

  if (curveData.length === 0) return null;

  // SVG dimensions
  const chartWidth = 600;
  const chartHeight = 320;
  const marginLeft = 60;
  const marginRight = 40;
  const marginTop = 30;
  const marginBottom = 60;
  const plotWidth = chartWidth - marginLeft - marginRight;
  const plotHeight = chartHeight - marginTop - marginBottom;

  // Scale functions (both axes 0-1)
  const scaleX = (value: number) => marginLeft + (value * plotWidth);
  const scaleY = (value: number) => marginTop + plotHeight * (1 - value);

  return (
    <div className="bg-surface-container-low rounded-lg p-6 flex-1">
      <h3 className="text-sm font-mono font-semibold text-zinc-200 mb-4 uppercase tracking-wider">
        Calibration Curves — Confidence vs. Accuracy
      </h3>

      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full border border-zinc-700/30 rounded bg-zinc-950/30"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
          const x = scaleX(frac);
          const y = scaleY(frac);
          return (
            <g key={`grid-${i}`}>
              {/* Vertical grid */}
              <line
                x1={x}
                y1={marginTop}
                x2={x}
                y2={marginTop + plotHeight}
                stroke="rgb(113 113 122 / 0.2)"
                strokeWidth="1"
              />
              {/* Horizontal grid */}
              <line
                x1={marginLeft}
                y1={y}
                x2={chartWidth - marginRight}
                y2={y}
                stroke="rgb(113 113 122 / 0.2)"
                strokeWidth="1"
              />
            </g>
          );
        })}

        {/* Perfect calibration diagonal (dashed) */}
        <line
          x1={scaleX(0)}
          y1={scaleY(0)}
          x2={scaleX(1)}
          y2={scaleY(1)}
          stroke="rgb(113 113 122)"
          strokeWidth="2"
          strokeDasharray="4,4"
          opacity="0.6"
        />

        {/* Model curves */}
        {curveData.map((model, modelIdx) => {
          if (model.points.length === 0) return null;

          // Create path
          const pathData = model.points
            .map((pt, i) => {
              const x = scaleX(pt.x);
              const y = scaleY(pt.y);
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            })
            .join(' ');

          return (
            <g key={`model-${modelIdx}`}>
              {/* Line */}
              <path
                d={pathData}
                fill="none"
                stroke={model.color}
                strokeWidth="2.5"
                opacity="0.8"
              />

              {/* Points */}
              {model.points.map((pt, ptIdx) => (
                <circle
                  key={`point-${ptIdx}`}
                  cx={scaleX(pt.x)}
                  cy={scaleY(pt.y)}
                  r="3"
                  fill={model.color}
                  opacity="0.9"
                />
              ))}
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

        {/* Axis ticks and labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
          const label = `${(frac * 100).toFixed(0)}%`;
          return (
            <g key={`tick-${i}`}>
              {/* X-axis */}
              <line
                x1={scaleX(frac)}
                y1={marginTop + plotHeight}
                x2={scaleX(frac)}
                y2={marginTop + plotHeight + 4}
                stroke="rgb(113 113 122)"
                strokeWidth="1"
              />
              <text
                x={scaleX(frac)}
                y={marginTop + plotHeight + 16}
                textAnchor="middle"
                fontSize="10"
                fill="rgb(161 161 170)"
                fontFamily="monospace"
              >
                {label}
              </text>

              {/* Y-axis */}
              <line
                x1={marginLeft - 4}
                y1={scaleY(frac)}
                x2={marginLeft}
                y2={scaleY(frac)}
                stroke="rgb(113 113 122)"
                strokeWidth="1"
              />
              <text
                x={marginLeft - 10}
                y={scaleY(frac) + 4}
                textAnchor="end"
                fontSize="10"
                fill="rgb(161 161 170)"
                fontFamily="monospace"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Axis labels */}
        <text
          x={marginLeft - 45}
          y={marginTop + plotHeight / 2}
          textAnchor="middle"
          fontSize="11"
          fill="rgb(161 161 170)"
          fontFamily="monospace"
          fontWeight="500"
          transform={`rotate(-90 ${marginLeft - 45} ${marginTop + plotHeight / 2})`}
        >
          Actual Accuracy
        </text>
        <text
          x={chartWidth / 2}
          y={chartHeight - 8}
          textAnchor="middle"
          fontSize="11"
          fill="rgb(161 161 170)"
          fontFamily="monospace"
          fontWeight="500"
        >
          Stated Confidence
        </text>
      </svg>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-400 font-mono">
        {curveData.map((model, idx) => (
          <div key={`legend-${idx}`} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: model.color }}
            />
            <span className="truncate">{model.model}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
