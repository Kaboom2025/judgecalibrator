import React, { useEffect, useMemo, useState } from 'react';
import { AppTab, PrecomputedResult, ProbeResult } from '../types';
import { MetricIcon } from './MetricIcon';
import { KeyFindings } from './KeyFindings';
import { BiasBarChart } from './BiasBarChart';
import { CalibrationCurveChart } from './CalibrationCurveChart';

interface LandingPageProps {
  onTabChange: (tab: AppTab) => void;
}

type SortKey = 'rank' | 'calibration' | 'consistency' | 'positional_bias' | 'verbosity_bias' | 'human_alignment' | 'self_preference';

function probeStatus(p: ProbeResult): 'success' | 'warning' | 'error' {
  const v = p.metric_value;
  switch (p.probe_name) {
    case 'calibration':     return v < 0.05 ? 'success' : v < 0.10 ? 'warning' : 'error';
    case 'consistency':     return v < 0.5  ? 'success' : v < 1.2  ? 'warning' : 'error';
    case 'positional_bias': return v < 0.05 ? 'success' : v < 0.30 ? 'warning' : 'error';
    case 'verbosity_bias':  return v < 0.3  ? 'success' : v < 0.9  ? 'warning' : 'error';
    case 'human_alignment': return v > 0.80 ? 'success' : v > 0.60 ? 'warning' : 'error';
    case 'self_preference': return v < 0.55 ? 'success' : v < 0.65 ? 'warning' : 'error';
    default: return 'warning';
  }
}

const GRADE_ORDER: Record<string, number> = { A: 0, 'B+': 1, B: 2, C: 3 };
const GRADE_COLOR: Record<string, string> = {
  A: 'text-emerald-400',
  'B+': 'text-emerald-400',
  B: 'text-amber-400',
  C: 'text-red-400',
};
const GRADE_BG: Record<string, string> = {
  A: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  'B+': 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  B: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  C: 'bg-red-500/10 border-red-500/20 text-red-400',
};

const STATUS_CELL: Record<string, string> = {
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  error:   'text-red-400',
};
const STATUS_DOT: Record<string, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error:   'bg-red-500',
};

const COLS: { key: SortKey; label: string; icon: string; shortLabel: string; format: (v: number) => string }[] = [
  { key: 'calibration',     label: 'Calibration ECE',   shortLabel: 'ECE',    icon: 'Activity',      format: v => v.toFixed(3) },
  { key: 'consistency',     label: 'Consistency SD',    shortLabel: 'SD',     icon: 'RefreshCw',     format: v => v.toFixed(2) },
  { key: 'positional_bias', label: 'Positional Flip',   shortLabel: 'Pos.',   icon: 'Radar',         format: v => `${(v*100).toFixed(0)}%` },
  { key: 'verbosity_bias',  label: 'Verbosity Lift',    shortLabel: 'Verb.',  icon: 'AlertTriangle', format: v => `+${v.toFixed(2)}` },
  { key: 'human_alignment', label: 'Human Alignment ρ', shortLabel: 'Align.', icon: 'ShieldCheck',   format: v => v.toFixed(2) },
  { key: 'self_preference', label: 'Self-Preference Rate', shortLabel: 'Self-Pref.', icon: 'BrainCircuit', format: v => v.toFixed(2) },
];

function formatGrade(grade: string) { return grade.replace('_PLUS', '+'); }

function gradeScore(result: PrecomputedResult): number {
  const g = formatGrade(result.trust_grade);
  return (GRADE_ORDER[g] ?? 9) * 10 - (result.probes.find(p => p.probe_name === 'human_alignment')?.metric_value ?? 0);
}

function probeVal(result: PrecomputedResult, name: string): ProbeResult | undefined {
  return result.probes.find(p => p.probe_name === name);
}

interface RowProps {
  key?: React.Key;
  rank: number;
  result: PrecomputedResult;
  expanded: boolean;
  onToggle: () => void;
}

function Row({ rank, result, expanded, onToggle }: RowProps) {
  const grade = formatGrade(result.trust_grade);

  return (
    <>
      <tr
        className="border-b border-outline-variant/10 hover:bg-surface-container/40 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        {/* Rank */}
        <td className="py-3 pl-6 pr-3 font-mono text-xs text-zinc-600 w-10">{rank}</td>

        {/* Model name */}
        <td className="py-3 pr-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`inline-flex items-center justify-center border text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${GRADE_BG[grade] ?? 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'}`}>
              {grade}
            </span>
            <span className="font-mono text-xs text-zinc-200 truncate">{result.judge}</span>
          </div>
        </td>

        {/* Metric columns */}
        {COLS.map(col => {
          const p = probeVal(result, col.key);
          if (!p) return <td key={col.key} className="py-3 px-3 text-center font-mono text-xs text-zinc-600">—</td>;
          const status = probeStatus(p);
          return (
            <td key={col.key} className={`py-3 px-3 text-center font-mono text-xs tabular-nums ${STATUS_CELL[status]}`}>
              {col.format(p.metric_value)}
            </td>
          );
        })}

        {/* Expand toggle */}
        <td className="py-3 pr-6 pl-3 w-8 text-center">
          <span className={`font-mono text-xs text-zinc-600 transition-transform inline-block ${expanded ? 'rotate-90' : ''}`}>›</span>
        </td>
      </tr>

      {/* Expanded recommendations row */}
      {expanded && (
        <tr className="bg-surface-container/20">
          <td colSpan={9} className="px-6 py-4">
            <div className="flex flex-wrap gap-2">
              {result.recommendations.map((rec, i) => (
                <span key={i} className="flex items-start gap-2 text-xs text-zinc-400 font-headline leading-relaxed basis-full sm:basis-auto sm:flex-1 sm:min-w-[280px]">
                  <span className="text-primary mt-0.5 flex-shrink-0">→</span>
                  {rec}
                </span>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function LandingPage({ onTabChange }: LandingPageProps) {
  const [results, setResults] = useState<PrecomputedResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortAsc, setSortAsc] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/precomputed')
      .then(r => r.json())
      .then((d: { results: PrecomputedResult[] }) => {
        setResults(d.results);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    const base = [...results].sort((a, b) => gradeScore(a) - gradeScore(b));
    if (sortKey === 'rank') return sortAsc ? base : [...base].reverse();

    return [...base].sort((a, b) => {
      const av = probeVal(a, sortKey)?.metric_value ?? 0;
      const bv = probeVal(b, sortKey)?.metric_value ?? 0;
      return sortAsc ? av - bv : bv - av;
    });
  }, [results, sortKey, sortAsc]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  const gradeGroups = useMemo(() => {
    const counts: Record<string, number> = { A: 0, 'B+': 0, B: 0, C: 0 };
    for (const r of results) counts[formatGrade(r.trust_grade)] = (counts[formatGrade(r.trust_grade)] ?? 0) + 1;
    return counts;
  }, [results]);

  return (
    <div className="pt-32 pb-24 px-4 sm:px-8 lg:px-16 max-w-[1440px] mx-auto w-full">
      {/* Hero */}
      <div className="text-center mb-20">
        <h1 className="text-4xl lg:text-6xl font-headline font-black tracking-tight text-zinc-100 mb-6 leading-tight">
          How Trustworthy Is Your<br />
          <span className="text-primary">LLM Judge?</span>
        </h1>
        <p className="text-zinc-400 text-lg font-headline max-w-2xl mx-auto mb-10 leading-relaxed">
          LLM judges are biased. They prefer longer answers, flip decisions based on answer order,
          and contradict themselves. JudgeCalibrator measures exactly how biased your judge is.
          15 models tested across 580 tasks from MT-Bench and Chatbot Arena.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => onTabChange('demo')}
            className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-8 py-3 rounded-md font-semibold text-sm tracking-wide transition-all hover:opacity-90 active:scale-95"
          >
            Try the Interactive Demo
          </button>
          <button
            onClick={() => onTabChange('audit')}
            className="border border-zinc-700 text-zinc-300 px-8 py-3 rounded-md font-semibold text-sm tracking-wide transition-all hover:border-zinc-500 hover:text-zinc-100 active:scale-95"
          >
            Run Full Audit
          </button>
        </div>
      </div>

      {/* Charts section */}
      {!loading && results.length > 0 && (
        <div className="mb-12">
          <KeyFindings results={results} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
            <BiasBarChart results={results} />
            <CalibrationCurveChart results={results} />
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {!loading && results.length > 0 && (
        <div>
          {/* Section header + summary badges */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <h2 className="text-on-surface-variant font-mono text-[0.6875rem] uppercase tracking-tighter opacity-60 mr-2">
              Judge Leaderboard — {results.length} Models · 580 Tasks Each
            </h2>
            {(Object.entries(gradeGroups) as [string, number][]).filter(([, n]) => n > 0).map(([grade, n]) => (
              <span key={grade} className={`inline-flex items-center gap-1 border text-[10px] font-mono px-2 py-0.5 rounded ${GRADE_BG[grade] ?? ''}`}>
                <span>{grade}</span>
                <span className="opacity-60">×{n}</span>
              </span>
            ))}
          </div>

          {/* Table */}
          <div className="bg-surface-container-low rounded-xl overflow-hidden mb-12">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/20 bg-surface-container">
                    <th className="py-3 pl-6 pr-3 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-600 w-10">#</th>
                    <th
                      className="py-3 pr-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500 cursor-pointer hover:text-zinc-300 select-none"
                      onClick={() => handleSort('rank')}
                    >
                      Model {sortKey === 'rank' && (sortAsc ? '↑' : '↓')}
                    </th>
                    {COLS.map(col => (
                      <th
                        key={col.key}
                        className="py-3 px-3 text-center font-mono text-[10px] uppercase tracking-widest text-zinc-500 cursor-pointer hover:text-zinc-300 select-none whitespace-nowrap"
                        onClick={() => handleSort(col.key)}
                        title={col.label}
                      >
                        <span className="flex items-center justify-center gap-1">
                          <MetricIcon name={col.icon} size={11} className="opacity-60" />
                          {col.shortLabel}
                          {sortKey === col.key && <span>{sortAsc ? '↑' : '↓'}</span>}
                        </span>
                      </th>
                    ))}
                    <th className="py-3 pr-6 pl-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r, i) => (
                    <Row
                      key={r.judge}
                      rank={i + 1}
                      result={r}
                      expanded={expanded === r.judge}
                      onToggle={() => setExpanded(prev => prev === r.judge ? null : r.judge)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="px-6 py-3 border-t border-outline-variant/10 flex items-center gap-6 flex-wrap">
              <span className="font-mono text-[10px] text-zinc-600 uppercase tracking-wider">Legend</span>
              {(['success', 'warning', 'error'] as const).map(s => (
                <span key={s} className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-500">
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[s]}`} />
                  {s === 'success' ? 'Pass' : s === 'warning' ? 'Caution' : 'Fail'}
                </span>
              ))}
              <span className="font-mono text-[10px] text-zinc-600 ml-auto">Click a row to expand recommendations</span>
            </div>
          </div>

          {/* Metric guide */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {COLS.map(col => (
              <div key={col.key} className="bg-surface-container-low rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MetricIcon name={col.icon} size={13} className="text-zinc-500" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">{col.shortLabel}</span>
                </div>
                <p className="text-xs text-zinc-500 font-headline leading-relaxed">{col.label}</p>
                <div className="mt-2 space-y-0.5 font-mono text-[9px] text-zinc-600">
                  {col.key === 'human_alignment'
                    ? <>
                        <div><span className="text-emerald-500">●</span> &gt;0.80 pass</div>
                        <div><span className="text-amber-500">●</span> &gt;0.60 caution</div>
                        <div><span className="text-red-500">●</span> ≤0.60 fail</div>
                      </>
                    : col.key === 'calibration'
                      ? <>
                          <div><span className="text-emerald-500">●</span> &lt;0.05 pass</div>
                          <div><span className="text-amber-500">●</span> &lt;0.10 caution</div>
                          <div><span className="text-red-500">●</span> ≥0.10 fail</div>
                        </>
                      : col.key === 'consistency'
                        ? <>
                            <div><span className="text-emerald-500">●</span> &lt;0.5 pass</div>
                            <div><span className="text-amber-500">●</span> &lt;1.2 caution</div>
                            <div><span className="text-red-500">●</span> ≥1.2 fail</div>
                          </>
                        : col.key === 'positional_bias'
                          ? <>
                              <div><span className="text-emerald-500">●</span> &lt;5% pass</div>
                              <div><span className="text-amber-500">●</span> &lt;30% caution</div>
                              <div><span className="text-red-500">●</span> ≥30% fail</div>
                            </>
                          : col.key === 'self_preference'
                            ? <>
                                <div><span className="text-emerald-500">●</span> &lt;0.55 pass</div>
                                <div><span className="text-amber-500">●</span> &lt;0.65 caution</div>
                                <div><span className="text-red-500">●</span> ≥0.65 fail</div>
                              </>
                            : <>
                                <div><span className="text-emerald-500">●</span> &lt;+0.3 pass</div>
                                <div><span className="text-amber-500">●</span> &lt;+0.9 caution</div>
                                <div><span className="text-red-500">●</span> ≥+0.9 fail</div>
                              </>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-20 text-zinc-600 font-mono text-sm">Loading comparison data...</div>
      )}

      {!loading && results.length === 0 && (
        <div className="text-center py-20 text-zinc-600 font-mono text-sm">No precomputed results available.</div>
      )}
    </div>
  );
}
