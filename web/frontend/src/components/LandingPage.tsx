import { useEffect, useState } from 'react';
import { AppTab, PrecomputedResult, ProbeResult } from '../types';
import { MetricIcon } from './MetricIcon';

interface LandingPageProps {
  onTabChange: (tab: AppTab) => void;
}

function probeStatus(p: ProbeResult): 'success' | 'warning' | 'error' {
  const v = p.metric_value;
  switch (p.probe_name) {
    case 'calibration':     return v < 0.05 ? 'success' : v < 0.10 ? 'warning' : 'error';
    case 'consistency':     return v < 0.5  ? 'success' : v < 1.2  ? 'warning' : 'error';
    case 'positional_bias': return v < 0.05 ? 'success' : v < 0.30 ? 'warning' : 'error';
    case 'verbosity_bias':  return v < 0.3  ? 'success' : v < 0.9  ? 'warning' : 'error';
    case 'human_alignment': return v > 0.80 ? 'success' : v > 0.60 ? 'warning' : 'error';
    default: return 'warning';
  }
}

const PROBE_DISPLAY: Record<string, { label: string; icon: string; format: (v: number) => string; higherIsBetter: boolean; max: number }> = {
  calibration:     { label: 'Calibration ECE',  icon: 'Activity',      format: v => v.toFixed(3),        higherIsBetter: false, max: 0.30 },
  consistency:     { label: 'Consistency SD',   icon: 'RefreshCw',     format: v => v.toFixed(2),        higherIsBetter: false, max: 2.0  },
  positional_bias: { label: 'Positional Flip %', icon: 'Radar',        format: v => `${(v*100).toFixed(0)}%`, higherIsBetter: false, max: 1.0  },
  verbosity_bias:  { label: 'Verbosity Lift',   icon: 'AlertTriangle', format: v => `+${v.toFixed(1)}`,  higherIsBetter: false, max: 2.0  },
  human_alignment: { label: 'Human Alignment ρ', icon: 'ShieldCheck',  format: v => v.toFixed(2),        higherIsBetter: true,  max: 1.0  },
};

const PROBE_ORDER = ['calibration', 'consistency', 'positional_bias', 'verbosity_bias', 'human_alignment'];

const STATUS_DOT: Record<string, string> = {
  success: 'bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
  warning: 'bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.4)]',
  error:   'bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.4)]',
};

const GRADE_COLOR: Record<string, string> = {
  A: 'text-emerald-400',
  'B+': 'text-emerald-400',
  B: 'text-amber-400',
  C: 'text-red-400',
};

function gradeColor(grade: string) {
  const g = grade.replace('_PLUS', '+');
  return GRADE_COLOR[g] ?? 'text-zinc-100';
}

function formatGrade(grade: string) {
  return grade.replace('_PLUS', '+');
}

export function LandingPage({ onTabChange }: LandingPageProps) {
  const [results, setResults] = useState<PrecomputedResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/precomputed')
      .then(r => r.json())
      .then((d: { results: PrecomputedResult[] }) => {
        setResults(d.results);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const probeMap = (result: PrecomputedResult) => {
    const map: Record<string, ProbeResult> = {};
    for (const p of result.probes) map[p.probe_name] = p;
    return map;
  };

  return (
    <div className="pt-32 pb-24 px-8 lg:px-16 max-w-[1440px] mx-auto w-full">
      {/* Hero */}
      <div className="text-center mb-20">
        <h1 className="text-4xl lg:text-6xl font-headline font-black tracking-tight text-zinc-100 mb-6 leading-tight">
          How Trustworthy Is Your<br />
          <span className="text-primary">LLM Judge?</span>
        </h1>
        <p className="text-zinc-400 text-lg font-headline max-w-2xl mx-auto mb-10 leading-relaxed">
          LLM judges are biased. They prefer longer answers, flip decisions based on answer order,
          and contradict themselves. JudgeCalibrator measures exactly how biased your judge is.
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

      {/* Model Comparison */}
      {!loading && results.length > 0 && (
        <div>
          <h2 className="text-on-surface-variant font-mono text-[0.6875rem] uppercase tracking-tighter mb-8 opacity-60">
            Model Comparison — 580 Tasks Each
          </h2>

          {/* Trust grade cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {results.map(r => (
              <div key={r.judge} className="bg-surface-container-low rounded-xl p-8 flex items-center gap-8">
                <div className="flex-shrink-0 flex flex-col items-center justify-center bg-surface-container-lowest rounded-xl p-6 min-w-[100px]">
                  <span className={`text-5xl font-headline font-black tracking-tighter ${gradeColor(r.trust_grade)}`}>
                    {formatGrade(r.trust_grade)}
                  </span>
                  <span className="text-[0.6rem] font-mono uppercase tracking-[0.2em] text-zinc-500 mt-2">Trust Grade</span>
                </div>
                <div>
                  <h3 className="text-xl font-headline font-bold text-zinc-100 mb-1">{r.judge}</h3>
                  <p className="text-zinc-500 font-mono text-xs">{r.benchmark} · {r.tasks_evaluated} tasks</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.probes.map(p => (
                      <span key={p.probe_name} className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider bg-surface-container-highest`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[probeStatus(p)]}`} />
                        {PROBE_DISPLAY[p.probe_name]?.label ?? p.probe_name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Metric comparison chart */}
          <div className="bg-surface-container-low rounded-xl overflow-hidden mb-12">
            <div className="p-8 border-b border-outline-variant/10">
              <h3 className="font-headline font-semibold text-zinc-100">Metric Breakdown</h3>
              <p className="text-zinc-500 text-sm font-headline mt-1">Lower is better for calibration, consistency, bias, verbosity. Higher is better for alignment.</p>
            </div>
            <div className="p-8 space-y-6">
              {PROBE_ORDER.map(probeName => {
                const display = PROBE_DISPLAY[probeName];
                if (!display) return null;
                return (
                  <div key={probeName}>
                    <div className="flex items-center gap-3 mb-3">
                      <MetricIcon name={display.icon} size={14} className="text-zinc-500" />
                      <span className="font-mono text-[0.6875rem] uppercase tracking-widest text-zinc-400">{display.label}</span>
                    </div>
                    <div className="space-y-2">
                      {results.map(r => {
                        const pm = probeMap(r);
                        const p = pm[probeName];
                        if (!p) return null;
                        const status = probeStatus(p);
                        const barWidth = display.higherIsBetter
                          ? (p.metric_value / display.max) * 100
                          : ((display.max - p.metric_value) / display.max) * 100;
                        const clampedWidth = Math.max(4, Math.min(100, barWidth));
                        const barColor = status === 'success' ? 'bg-emerald-500/70' : status === 'warning' ? 'bg-amber-500/70' : 'bg-red-500/70';
                        return (
                          <div key={r.judge} className="flex items-center gap-4">
                            <span className="font-mono text-[10px] text-zinc-500 w-36 flex-shrink-0 truncate">{r.judge}</span>
                            <div className="flex-1 bg-surface-container-highest rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${barColor}`}
                                style={{ width: `${clampedWidth}%` }}
                              />
                            </div>
                            <span className={`font-mono text-xs w-14 text-right flex-shrink-0 ${status === 'success' ? 'text-emerald-400' : status === 'warning' ? 'text-amber-400' : 'text-red-400'}`}>
                              {display.format(p.metric_value)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h2 className="text-on-surface-variant font-mono text-[0.6875rem] uppercase tracking-tighter mb-6 opacity-60">
              Recommendations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.map(r => (
                <div key={r.judge} className="bg-surface-container-low rounded-xl p-6">
                  <h4 className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-4">{r.judge}</h4>
                  <ul className="space-y-3">
                    {r.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-zinc-300 font-headline leading-relaxed">
                        <span className="text-primary mt-0.5 flex-shrink-0">→</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
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
