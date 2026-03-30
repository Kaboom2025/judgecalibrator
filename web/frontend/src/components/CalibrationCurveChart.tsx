import React, { useState } from 'react';
import { PrecomputedResult } from '../types';

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

interface TooltipData {
  leftPct: number;
  topPct: number;
  model: string;
  grade: string;
  confidence: number;
  accuracy: number;
  count: number;
  color: string;
}

function formatGrade(grade: string): string {
  return grade.replace('_PLUS', '+');
}

const COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
];

function getModelColor(index: number, grade: string): string {
  const baseColor = COLORS[index % COLORS.length];
  const formattedGrade = formatGrade(grade);
  if (formattedGrade === 'A' || formattedGrade === 'B+') {
    return baseColor;
  }
  return baseColor + '80';
}

export function CalibrationCurveChart({ results }: CalibrationCurveChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoveredModel, setHoveredModel] = useState<number | null>(null);

  if (results.length === 0) return null;

  const curveData = results
    .map((r, idx) => {
      const calibProbe = r.probes.find(p => p.probe_name === 'calibration');
      if (!calibProbe || !calibProbe.details) return null;

      const bins = calibProbe.details.bins as BinData[] | undefined;
      if (!bins || !Array.isArray(bins) || bins.length === 0) return null;

      const sortedBins = [...bins].sort((a, b) => a.mean_confidence - b.mean_confidence);

      return {
        model: r.judge,
        grade: r.trust_grade,
        color: getModelColor(idx, r.trust_grade),
        points: sortedBins.map(b => ({
          x: b.mean_confidence,
          y: b.accuracy,
          count: b.count,
        })),
      };
    })
    .filter(Boolean);

  if (curveData.length === 0) return null;

  const chartWidth = 600;
  const chartHeight = 320;
  const marginLeft = 60;
  const marginRight = 40;
  const marginTop = 30;
  const marginBottom = 60;
  const plotWidth = chartWidth - marginLeft - marginRight;
  const plotHeight = chartHeight - marginTop - marginBottom;

  const scaleX = (value: number) => marginLeft + value * plotWidth;
  const scaleY = (value: number) => marginTop + plotHeight * (1 - value);

  return (
    <div className="bg-surface-container-low rounded-lg p-6 flex-1">
      <h3 className="text-sm font-mono font-semibold text-zinc-200 mb-4 uppercase tracking-wider">
        Calibration Curves — Confidence vs. Accuracy
      </h3>

      <div className="relative">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full border border-zinc-700/30 rounded bg-zinc-950/30"
          onMouseLeave={() => {
            setTooltip(null);
            setHoveredModel(null);
          }}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
            const x = scaleX(frac);
            const y = scaleY(frac);
            return (
              <g key={`grid-${i}`}>
                <line
                  x1={x}
                  y1={marginTop}
                  x2={x}
                  y2={marginTop + plotHeight}
                  stroke="rgb(113 113 122 / 0.2)"
                  strokeWidth="1"
                />
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

          {/* Perfect calibration diagonal */}
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
          <text
            x={scaleX(0.88)}
            y={scaleY(0.92)}
            fontSize="9"
            fill="rgb(113 113 122)"
            fontFamily="monospace"
            opacity="0.7"
            textAnchor="middle"
          >
            perfect
          </text>

          {/* Model curves — render non-hovered first, then hovered on top */}
          {[...curveData.keys()]
            .sort((a, b) => {
              if (a === hoveredModel) return 1;
              if (b === hoveredModel) return -1;
              return 0;
            })
            .map(modelIdx => {
              const model = curveData[modelIdx];
              if (!model || model.points.length === 0) return null;
              const isHovered = hoveredModel === modelIdx;
              const isDimmed = hoveredModel !== null && !isHovered;

              const pathData = model.points
                .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.x)} ${scaleY(pt.y)}`)
                .join(' ');

              return (
                <g key={`model-${modelIdx}`}>
                  {/* Line */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={model.color}
                    strokeWidth={isHovered ? 3 : 2}
                    opacity={isDimmed ? 0.2 : 0.85}
                    style={{ transition: 'opacity 0.15s, stroke-width 0.15s' }}
                  />

                  {/* Points with invisible hit areas */}
                  {model.points.map((pt, ptIdx) => {
                    const cx = scaleX(pt.x);
                    const cy = scaleY(pt.y);
                    const leftPct = (cx / chartWidth) * 100;
                    const topPct = (cy / chartHeight) * 100;

                    return (
                      <g key={`point-${ptIdx}`}>
                        {/* Visible dot */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isHovered ? 5 : 3}
                          fill={model.color}
                          opacity={isDimmed ? 0.2 : 0.9}
                          style={{ transition: 'opacity 0.15s, r 0.1s' }}
                          pointerEvents="none"
                        />
                        {/* Hit area */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r="10"
                          fill="transparent"
                          style={{ cursor: 'crosshair' }}
                          onMouseEnter={() => {
                            setHoveredModel(modelIdx);
                            setTooltip({
                              leftPct,
                              topPct,
                              model: model.model,
                              grade: model.grade,
                              confidence: pt.x,
                              accuracy: pt.y,
                              count: pt.count,
                              color: model.color,
                            });
                          }}
                        />
                      </g>
                    );
                  })}
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

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-10 bg-zinc-800/95 border border-zinc-600 rounded-md px-3 py-2 text-xs font-mono shadow-xl"
            style={{
              left: `${Math.min(Math.max(tooltip.leftPct, 12), 75)}%`,
              top: `${Math.min(Math.max(tooltip.topPct - 18, 2), 55)}%`,
              transform: 'translate(-50%, -100%)',
              whiteSpace: 'nowrap',
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: tooltip.color }}
              />
              <span className="font-semibold text-zinc-100 truncate max-w-[180px]">
                {tooltip.model}
              </span>
              <span className="text-zinc-400 text-[10px]">({formatGrade(tooltip.grade)})</span>
            </div>
            <div className="flex gap-4 text-zinc-300">
              <span>Confidence: <span className="text-zinc-100 font-semibold">{(tooltip.confidence * 100).toFixed(1)}%</span></span>
              <span>Accuracy: <span className="text-zinc-100 font-semibold">{(tooltip.accuracy * 100).toFixed(1)}%</span></span>
            </div>
            <div className="text-zinc-500 mt-0.5">
              {tooltip.count} samples in bin
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-400 font-mono">
        {curveData.map((model, idx) => (
          <div
            key={`legend-${idx}`}
            className="flex items-center gap-2 cursor-default"
            onMouseEnter={() => setHoveredModel(idx)}
            onMouseLeave={() => setHoveredModel(null)}
          >
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: model?.color }}
            />
            <span className="truncate">{model?.model}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
