import React, { useState } from 'react';
import { PrecomputedResult, ProbeResult } from '../types';

interface BiasBarChartProps {
  results: PrecomputedResult[];
}

interface TooltipData {
  xPercent: number;
  name: string;
  verbosity: number;
  positional: number;
}

function probeVal(result: PrecomputedResult, name: string): ProbeResult | undefined {
  return result.probes.find(p => p.probe_name === name);
}

function abbreviateModel(judge: string): string {
  const j = judge.toLowerCase();
  if (j.includes('claude')) {
    if (j.includes('haiku')) return 'C-Haiku';
    if ((j.includes('3-5') || j.includes('3.5')) && j.includes('sonnet')) return 'C3.5-S';
    if (j.includes('sonnet')) return 'C3-Son';
    if (j.includes('opus')) return 'C3-Opus';
    return 'Claude';
  }
  if (j.includes('gemini')) {
    if (j.includes('flash') && j.includes('1.5')) return 'G1.5-F';
    if (j.includes('flash')) return 'Gem-F';
    if (j.includes('1.5') && j.includes('pro')) return 'G1.5-P';
    if (j.includes('pro')) return 'Gem-P';
    return 'Gemini';
  }
  if (j.includes('gpt-4o') || j.includes('gpt4o')) return 'GPT-4o';
  if (j.includes('gpt-4-turbo') || j.includes('gpt4-turbo')) return 'GPT-4T';
  if (j.includes('gpt-4')) return 'GPT-4';
  if (j.includes('gpt-3.5')) return 'GPT3.5';
  if (j.includes('o1-mini')) return 'O1-mini';
  if (j.includes('o1-preview')) return 'O1-prev';
  if (j.includes('o3-mini')) return 'O3-mini';
  if (j.includes('o1')) return 'O1';
  if (j.includes('o3')) return 'O3';
  if (j.includes('llama') || j.includes('meta')) {
    if (j.includes('70b')) return 'L3-70B';
    if (j.includes('8b')) return 'L3-8B';
    return 'Llama';
  }
  return judge.substring(0, 8);
}

export function BiasBarChart({ results }: BiasBarChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  if (results.length === 0) return null;

  // Both metrics normalized to % for a unified scale
  const data = results.map(r => ({
    name: r.judge,
    abbr: abbreviateModel(r.judge),
    verbosity: (probeVal(r, 'verbosity_bias')?.metric_value ?? 0) * 100,
    positional: (probeVal(r, 'positional_bias')?.metric_value ?? 0) * 100,
  }));

  const maxValue = Math.max(...data.map(d => Math.max(d.verbosity, d.positional)));
  const scaledMax = Math.max(maxValue * 1.15, 10);

  const chartWidth = 640;
  const chartHeight = 340;
  const marginLeft = 58;
  const marginRight = 16;
  const marginTop = 16;
  const marginBottom = 88;
  const plotWidth = chartWidth - marginLeft - marginRight;
  const plotHeight = chartHeight - marginTop - marginBottom;

  const scaleY = (value: number) => marginTop + plotHeight * (1 - value / scaledMax);
  const scaleX = (index: number) => marginLeft + (index + 0.5) * (plotWidth / data.length);
  const barWidth = (plotWidth / data.length) * 0.3;

  const gridValues = [0, 25, 50, 75, 100].filter(v => v <= scaledMax + 1);

  return (
    <div className="bg-surface-container-low rounded-lg p-6 flex-1">
      <h3 className="text-sm font-mono font-semibold text-zinc-200 mb-4 uppercase tracking-wider">
        Bias Comparison Across Judges
      </h3>

      <div className="relative">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full border border-zinc-700/30 rounded bg-zinc-950/30"
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Grid lines */}
          {gridValues.map((val, i) => {
            const y = scaleY(val);
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
                  x={marginLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="rgb(161 161 170)"
                  fontFamily="monospace"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Verbosity threshold at 90% */}
          {scaledMax >= 85 && (
            <>
              <line
                x1={marginLeft}
                y1={scaleY(90)}
                x2={chartWidth - marginRight}
                y2={scaleY(90)}
                stroke="rgb(96 165 250 / 0.5)"
                strokeWidth="1.5"
                strokeDasharray="5,3"
              />
              <text
                x={chartWidth - marginRight - 4}
                y={scaleY(90) - 4}
                textAnchor="end"
                fontSize="9"
                fill="rgb(96 165 250)"
                fontFamily="monospace"
                opacity="0.8"
              >
                verb. 90%
              </text>
            </>
          )}

          {/* Positional threshold at 30% */}
          <line
            x1={marginLeft}
            y1={scaleY(30)}
            x2={chartWidth - marginRight}
            y2={scaleY(30)}
            stroke="rgb(251 146 60 / 0.55)"
            strokeWidth="1.5"
            strokeDasharray="5,3"
          />
          <text
            x={chartWidth - marginRight - 4}
            y={scaleY(30) + 12}
            textAnchor="end"
            fontSize="9"
            fill="rgb(251 146 60)"
            fontFamily="monospace"
            opacity="0.85"
          >
            pos. 30%
          </text>

          {/* Bars */}
          {data.map((d, i) => {
            const x = scaleX(i);
            const baseY = marginTop + plotHeight;
            const verbH = Math.max((plotHeight * d.verbosity) / scaledMax, d.verbosity > 0 ? 2 : 0);
            const posH = Math.max((plotHeight * d.positional) / scaledMax, d.positional > 0 ? 2 : 0);
            const xPercent = ((x - marginLeft) / plotWidth) * 100;

            return (
              <g
                key={`bar-${i}`}
                onMouseEnter={() =>
                  setTooltip({ xPercent, name: d.name, verbosity: d.verbosity, positional: d.positional })
                }
                style={{ cursor: 'crosshair' }}
              >
                {/* Hover hit area */}
                <rect
                  x={x - barWidth - 6}
                  y={marginTop}
                  width={barWidth * 2 + 12}
                  height={plotHeight}
                  fill="transparent"
                />

                {/* Verbosity bar (blue) */}
                <rect
                  x={x - barWidth - 2}
                  y={baseY - verbH}
                  width={barWidth}
                  height={verbH}
                  fill="rgb(59 130 246)"
                  opacity="0.85"
                  rx="2"
                />

                {/* Positional bar (amber) */}
                <rect
                  x={x + 2}
                  y={baseY - posH}
                  width={barWidth}
                  height={posH}
                  fill="rgb(251 146 60)"
                  opacity="0.9"
                  rx="2"
                />

                {/* Rotated x-axis label */}
                <text
                  x={x}
                  y={baseY + 10}
                  textAnchor="end"
                  fontSize="10"
                  fill="rgb(161 161 170)"
                  fontFamily="monospace"
                  fontWeight="500"
                  transform={`rotate(-38, ${x}, ${baseY + 10})`}
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

          {/* Y axis label */}
          <text
            x={13}
            y={marginTop + plotHeight / 2}
            textAnchor="middle"
            fontSize="10"
            fill="rgb(161 161 170)"
            fontFamily="monospace"
            transform={`rotate(-90, 13, ${marginTop + plotHeight / 2})`}
          >
            Bias Score (%)
          </text>
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-10 bg-zinc-800/95 border border-zinc-600 rounded-md px-3 py-2 text-xs font-mono shadow-xl"
            style={{
              left: `${Math.min(Math.max(tooltip.xPercent, 12), 72)}%`,
              top: '10px',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
            }}
          >
            <div className="font-semibold text-zinc-100 mb-1.5 truncate max-w-[200px]">
              {tooltip.name}
            </div>
            <div className="flex items-center gap-2 text-zinc-300">
              <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: 'rgb(59 130 246)' }} />
              Verbosity: <span className="text-blue-300 font-semibold">{tooltip.verbosity.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300 mt-0.5">
              <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: 'rgb(251 146 60)' }} />
              Positional: <span className="text-orange-300 font-semibold">{tooltip.positional.toFixed(1)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-6 mt-4 text-xs text-zinc-400 font-mono">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgb(59 130 246)', opacity: 0.85 }} />
          <span>Verbosity Bias</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgb(251 146 60)', opacity: 0.9 }} />
          <span>Positional Bias (flip %)</span>
        </div>
      </div>
    </div>
  );
}
