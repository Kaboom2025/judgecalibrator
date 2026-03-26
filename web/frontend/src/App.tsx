/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Eye, EyeOff, ChevronDown, Activity, RefreshCw, Radar,
  ShieldCheck, BrainCircuit, Thermometer, AlertTriangle, ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuditMetric, Insight, SystemConfig, AuditStatus } from './types';

// ── Backend types ─────────────────────────────────────────────────────────

interface ProbeResult {
  probe_name: string;
  metric_name: string;
  metric_value: number;
  details: Record<string, unknown>;
  error: string | null;
}

interface AuditReport {
  judge: string;
  benchmark: string;
  tasks_evaluated: number;
  probes: ProbeResult[];
  trust_grade: string;
  recommendations: string[];
  estimated_cost_usd: number;
}

// ── Probe helpers ─────────────────────────────────────────────────────────

function probeStatus(p: ProbeResult): 'success' | 'warning' | 'error' {
  const v = p.metric_value;
  switch (p.probe_name) {
    case 'calibration':    return v < 0.05 ? 'success' : v < 0.10 ? 'warning' : 'error';
    case 'consistency':    return v < 0.5  ? 'success' : v < 1.2  ? 'warning' : 'error';
    case 'positional_bias':return v < 0.05 ? 'success' : v < 0.30 ? 'warning' : 'error';
    case 'verbosity_bias': return v < 0.3  ? 'success' : v < 0.9  ? 'warning' : 'error';
    case 'human_alignment':return v > 0.80 ? 'success' : v > 0.60 ? 'warning' : 'error';
    default: return 'warning';
  }
}

function probeDisplay(p: ProbeResult): { label: string; value: string; icon: string } {
  const v = p.metric_value;
  switch (p.probe_name) {
    case 'calibration':    return { label: 'Calibration',    value: `ECE ${v.toFixed(3)}`,          icon: 'Activity' };
    case 'consistency':    return { label: 'Consistency',    value: `SD ${v.toFixed(2)}`,            icon: 'RefreshCw' };
    case 'positional_bias':return { label: 'Bias Detection', value: `Flip ${(v*100).toFixed(0)}%`,  icon: 'Radar' };
    case 'verbosity_bias': return { label: 'Verbosity Bias', value: `Lift +${v.toFixed(1)}`,        icon: 'AlertTriangle' };
    case 'human_alignment':return { label: 'Alignment',      value: `rho ${v.toFixed(2)}`,          icon: 'ShieldCheck' };
    default:               return { label: p.probe_name,     value: v.toFixed(3),                    icon: 'Activity' };
  }
}

const PROBE_ORDER = ['calibration', 'consistency', 'positional_bias', 'verbosity_bias', 'human_alignment'];
const PROBE_LABELS: Record<string, string> = {
  calibration: 'CALIBRATION', consistency: 'CONSISTENCY',
  positional_bias: 'POSITIONAL_BIAS', verbosity_bias: 'VERBOSITY_BIAS', human_alignment: 'HUMAN_ALIGNMENT',
};
const BENCHMARK_PARAM: Record<string, string> = {
  'MT-Bench': 'mt_bench', RewardBench: 'reward_bench', AlpacaEval: 'alpaca_eval',
};

const EMPTY_METRICS: AuditMetric[] = [
  { name: 'Calibration',    value: '--', status: 'warning', icon: 'Activity' },
  { name: 'Consistency',    value: '--', status: 'warning', icon: 'RefreshCw' },
  { name: 'Bias Detection', value: '--', status: 'warning', icon: 'Radar' },
  { name: 'Verbosity Bias', value: '--', status: 'warning', icon: 'AlertTriangle' },
  { name: 'Alignment',      value: '--', status: 'warning', icon: 'ShieldCheck' },
];

type AuditState = 'idle' | 'running' | 'complete' | 'error';

// ── App ───────────────────────────────────────────────────────────────────

export default function App() {
  const [config, setConfig] = useState<SystemConfig>({ judgeModel: 'gpt-4o', apiKey: '', benchmark: 'MT-Bench', taskCount: 50 });
  const [showApiKey, setShowApiKey] = useState(false);
  const [auditState, setAuditState] = useState<AuditState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<AuditStatus>({ currentStep: 'Waiting to start...', progress: 0, estTime: '', tags: PROBE_ORDER.map(k => PROBE_LABELS[k]) });
  const [metrics, setMetrics] = useState<AuditMetric[]>(EMPTY_METRICS);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [trustGrade, setTrustGrade] = useState('--');
  const [report, setReport] = useState<AuditReport | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!jobId) return;
    const es = new EventSource(`/api/audit/${jobId}/stream`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data) as { probe: string | null; percent: number };
        const idx = d.probe ? PROBE_ORDER.indexOf(d.probe) + 1 : 0;
        setStatus({ currentStep: d.probe ? `Running ${d.probe.replace(/_/g, ' ')} probe... (${idx}/${PROBE_ORDER.length})` : 'Initialising...', progress: d.percent, estTime: '', tags: PROBE_ORDER.map(k => PROBE_LABELS[k]) });
      } catch { /* ignore */ }
    };

    es.addEventListener('complete', (e: MessageEvent) => {
      try {
        const p = JSON.parse(e.data) as { status: string; result: AuditReport | null; error: string | null };
        es.close(); esRef.current = null;
        if (p.status === 'completed' && p.result) {
          const r = p.result;
          setReport(r);
          setMetrics(r.probes.map(pr => { const { label, value, icon } = probeDisplay(pr); return { name: label, value, status: probeStatus(pr), icon }; }));
          setInsights(r.recommendations.map((text, i) => ({ id: String(i), text, icon: i === 0 ? 'BrainCircuit' : 'Thermometer', isPrimary: i === 0 })));
          setTrustGrade(r.trust_grade.replace('_PLUS', '+'));
          setStatus(s => ({ ...s, currentStep: 'Audit complete', progress: 100 }));
          setAuditState('complete');
        } else {
          setErrorMsg(p.error ?? 'Audit failed'); setAuditState('error');
        }
      } catch { /* ignore */ }
    });

    es.onerror = () => { es.close(); esRef.current = null; setErrorMsg('Lost connection to backend.'); setAuditState('error'); };
    return () => { es.close(); esRef.current = null; };
  }, [jobId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    esRef.current?.close(); esRef.current = null;
    setErrorMsg(null); setAuditState('running'); setMetrics(EMPTY_METRICS); setInsights([]);
    setTrustGrade('--'); setReport(null); setJobId(null);
    setStatus({ currentStep: 'Queuing audit...', progress: 0, estTime: '', tags: PROBE_ORDER.map(k => PROBE_LABELS[k]) });

    try {
      const res = await fetch('/api/audit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ judge_model: config.judgeModel, api_key: config.apiKey, benchmark: BENCHMARK_PARAM[config.benchmark] ?? 'mt_bench', task_count: config.taskCount }),
      });
      if (res.status === 429) { setErrorMsg('Rate limit: 1 audit per IP per hour.'); setAuditState('error'); return; }
      if (!res.ok) { const b = await res.json().catch(() => ({})); setErrorMsg((b as { detail?: string }).detail ?? `HTTP ${res.status}`); setAuditState('error'); return; }
      setJobId((await res.json() as { job_id: string }).job_id);
    } catch {
      setErrorMsg('Could not reach backend. Start it with: uvicorn web.backend.main:app --reload'); setAuditState('error');
    }
  }

  return (
    <div className="min-h-screen flex flex-col selection:bg-primary/30 selection:text-primary">
      <header className="fixed top-0 w-full border-b border-outline-variant/15 bg-surface/90 backdrop-blur-md z-50">
        <div className="flex items-center justify-between px-8 lg:px-16 h-16 max-w-[1440px] mx-auto">
          <div className="text-xl font-bold tracking-tight text-zinc-100 font-headline">JudgeCalibrator</div>
          <nav className="hidden md:flex items-center gap-8 text-sm tracking-wide">
            <a className="text-on-surface-variant hover:text-zinc-200 transition-colors" href="#">Home</a>
            <a className="text-zinc-100 font-semibold border-b-2 border-zinc-100 pb-1" href="#">Live Audit</a>
            <a className="text-on-surface-variant hover:text-zinc-200 transition-colors" href="#">Documentation</a>
          </nav>
          <button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={auditState === 'running'} className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-5 py-2 rounded-md text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
            {auditState === 'running' ? 'Running...' : 'Run Audit'}
          </button>
        </div>
      </header>

      <main className="flex-grow pt-32 pb-24 px-8 lg:px-16 max-w-[1440px] mx-auto w-full grid grid-cols-12 gap-8 lg:gap-12 items-start">
        <div className="col-span-12 lg:col-span-5 space-y-12">
          <section>
            <h2 className="text-on-surface-variant font-mono text-[0.6875rem] uppercase tracking-tighter mb-4 opacity-60">System Configuration</h2>
            <form onSubmit={handleSubmit} className="bg-surface-container-low p-8 rounded-xl space-y-6">
              <div className="space-y-2">
                <label className="block font-mono text-[0.6875rem] text-on-surface-variant uppercase tracking-widest">Judge Model</label>
                <input className="w-full bg-surface-container-lowest border-none text-on-surface font-mono text-sm p-4 rounded-md focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-zinc-700" value={config.judgeModel} onChange={e => setConfig({ ...config, judgeModel: e.target.value })} placeholder="gpt-4o" type="text" required />
              </div>
              <div className="space-y-2">
                <label className="block font-mono text-[0.6875rem] text-on-surface-variant uppercase tracking-widest">API Key</label>
                <div className="relative">
                  <input className="w-full bg-surface-container-lowest border-none text-on-surface font-mono text-sm p-4 rounded-md focus:ring-1 focus:ring-primary/50 transition-all" type={showApiKey ? 'text' : 'password'} value={config.apiKey} onChange={e => setConfig({ ...config, apiKey: e.target.value })} placeholder="sk-..." required />
                  <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 cursor-pointer hover:text-zinc-400">
                    {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block font-mono text-[0.6875rem] text-on-surface-variant uppercase tracking-widest">Benchmark</label>
                  <div className="relative">
                    <select className="w-full bg-surface-container-lowest border-none text-on-surface font-headline text-sm p-4 rounded-md focus:ring-1 focus:ring-primary/50 appearance-none transition-all" value={config.benchmark} onChange={e => setConfig({ ...config, benchmark: e.target.value })}>
                      <option>MT-Bench</option><option>RewardBench</option><option>AlpacaEval</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block font-mono text-[0.6875rem] text-on-surface-variant uppercase tracking-widest">Task Count</label>
                  <div className="pt-4 px-2">
                    <input className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary" max="200" min="10" type="range" value={config.taskCount} onChange={e => setConfig({ ...config, taskCount: parseInt(e.target.value) })} />
                    <div className="flex justify-between text-[10px] text-zinc-600 font-mono mt-2">
                      <span>10</span><span className="text-zinc-400">{config.taskCount} TASKS</span><span>200</span>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </section>

          <AnimatePresence mode="wait">
            {auditState === 'error' && errorMsg ? (
              <motion.section key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-surface-container-low p-8 rounded-xl border border-error/30">
                <div className="flex items-center gap-3 text-error"><AlertTriangle size={18} /><span className="font-headline text-sm font-semibold">Audit failed</span></div>
                <p className="mt-3 text-zinc-400 text-sm font-mono leading-relaxed">{errorMsg}</p>
              </motion.section>
            ) : (
              <motion.section key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-surface-container-low p-8 rounded-xl">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <span className="text-on-surface-variant font-mono text-[0.6875rem] uppercase tracking-tighter opacity-60">Status</span>
                    <h3 className="font-headline font-semibold text-lg text-primary mt-1">{status.currentStep}</h3>
                  </div>
                </div>
                <div className="w-full bg-surface-container-lowest h-1.5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${status.progress}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} className="h-full bg-gradient-to-r from-primary to-primary-container" />
                </div>
                <div className="mt-6 flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                  {status.tags.map(tag => (
                    <span key={tag} className="flex-shrink-0 bg-secondary-container/30 text-on-secondary-container text-[10px] font-mono px-3 py-1 rounded-full border border-outline-variant/10">{tag}</span>
                  ))}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        <div className="col-span-12 lg:col-span-7 space-y-12">
          <section className="bg-surface-container-low rounded-xl overflow-hidden border border-outline-variant/5">
            <div className="p-8 flex items-start justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-headline font-extrabold tracking-tight">Audit Results</h2>
                <p className="text-on-surface-variant text-sm font-headline opacity-80">{report ? `Final diagnostic report for ${report.judge}` : 'Run an audit to see results'}</p>
              </div>
              <div className="flex flex-col items-center justify-center p-6 bg-surface-container-lowest rounded-xl min-w-[120px]">
                <span className="text-5xl font-headline font-black text-primary tracking-tighter">{trustGrade}</span>
                <span className="text-[0.6rem] font-mono uppercase tracking-[0.2em] text-zinc-500 mt-2">TRUST GRADE</span>
              </div>
            </div>

            <div className="px-8 pb-8 space-y-2">
              {metrics.map(m => (
                <div key={m.name} className="flex items-center justify-between p-4 hover:bg-surface-container-highest transition-colors rounded-lg group cursor-default">
                  <div className="flex items-center gap-4">
                    <MetricIcon name={m.icon} className="text-primary-dim opacity-40 group-hover:opacity-100 transition-opacity" />
                    <span className="font-headline text-sm font-medium">{m.name}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-mono text-xs text-zinc-500">{m.value}</span>
                    <div className={`w-2 h-2 rounded-full ${m.status === 'success' ? 'bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : m.status === 'warning' ? 'bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-error shadow-[0_0_8px_rgba(236,124,138,0.4)]'}`} />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 bg-surface-container-lowest border-t border-outline-variant/10 p-6">
              <div className="text-center border-r border-outline-variant/10">
                <p className="text-[0.6rem] font-mono uppercase tracking-[0.2em] text-zinc-600 mb-1">Tasks Evaluated</p>
                <p className="text-xl font-headline font-bold">{report ? report.tasks_evaluated : config.taskCount}</p>
              </div>
              <div className="text-center border-r border-outline-variant/10">
                <p className="text-[0.6rem] font-mono uppercase tracking-[0.2em] text-zinc-600 mb-1">Probes Complete</p>
                <p className="text-xl font-headline font-bold">{report ? `${report.probes.length} / ${PROBE_ORDER.length}` : `0 / ${PROBE_ORDER.length}`}</p>
              </div>
              <div className="text-center">
                <p className="text-[0.6rem] font-mono uppercase tracking-[0.2em] text-zinc-600 mb-1">Est. Cost</p>
                <p className="text-xl font-headline font-bold text-zinc-300">{report ? `$${report.estimated_cost_usd.toFixed(2)}` : '--'}</p>
              </div>
            </div>
          </section>

          {insights.length > 0 && (
            <section>
              <h2 className="text-on-surface-variant font-mono text-[0.6875rem] uppercase tracking-tighter mb-4 opacity-60">Actionable Insights</h2>
              <div className="space-y-4">
                {insights.map(insight => (
                  <motion.div key={insight.id} whileHover={{ x: 4 }} className={`bg-surface-container-low p-6 rounded-lg flex items-start gap-5 border-l-2 transition-all hover:bg-surface-container-high ${insight.isPrimary ? 'border-primary' : 'border-zinc-700'}`}>
                    <div className="mt-1 bg-surface-container-highest p-2 rounded flex-shrink-0">
                      <MetricIcon name={insight.icon} className={insight.isPrimary ? 'text-primary' : 'text-zinc-500'} />
                    </div>
                    <p className="flex-grow font-headline text-sm text-zinc-200 leading-relaxed">{insight.text}</p>
                    <ChevronRight size={16} className="mt-2 text-zinc-700 flex-shrink-0" />
                  </motion.div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <footer className="mt-auto w-full py-8 border-t border-zinc-900 bg-zinc-950">
        <div className="flex flex-col md:flex-row justify-between items-center px-8 lg:px-16 max-w-[1440px] mx-auto">
          <div className="font-mono text-[0.6875rem] uppercase tracking-tighter text-zinc-500">2024 JudgeCalibrator. Open-source LLM judge diagnostics.</div>
          <div className="flex gap-8 mt-4 md:mt-0 font-mono text-[0.6875rem] uppercase tracking-tighter">
            <a className="text-zinc-600 hover:text-zinc-100 transition-colors" href="#">Privacy</a>
            <a className="text-zinc-600 hover:text-zinc-100 transition-colors" href="#">Terms</a>
            <a className="text-zinc-600 hover:text-zinc-100 transition-colors" href="https://github.com/Kaboom2025/judgecalibrator">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function MetricIcon({ name, className }: { name: string; className?: string }) {
  const p = { className, size: 20 } as const;
  switch (name) {
    case 'Activity':      return <Activity {...p} />;
    case 'RefreshCw':     return <RefreshCw {...p} />;
    case 'Radar':         return <Radar {...p} />;
    case 'ShieldCheck':   return <ShieldCheck {...p} />;
    case 'BrainCircuit':  return <BrainCircuit {...p} />;
    case 'Thermometer':   return <Thermometer {...p} />;
    case 'AlertTriangle': return <AlertTriangle {...p} />;
    default:              return <Activity {...p} />;
  }
}
