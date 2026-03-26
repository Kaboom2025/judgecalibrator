import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  ChevronDown, Activity, RefreshCw, Radar,
  ShieldCheck, BrainCircuit, Thermometer, AlertTriangle, ChevronRight,
  CheckCircle2, Circle, Loader2, ChevronUp,
} from 'lucide-react';

// ── Model catalogue ────────────────────────────────────────────────────────

interface ModelDef {
  id: string;
  label: string;
  note?: string;
}

interface ProviderGroup {
  name: string;
  color: string;      // Tailwind text colour for the provider badge
  badge: string;      // bg colour for the badge
  models: ModelDef[];
}

const MODEL_GROUPS: ProviderGroup[] = [
  {
    name: 'OpenAI',
    color: 'text-emerald-300',
    badge: 'bg-emerald-500/10 border-emerald-500/20',
    models: [
      { id: 'gpt-4o',       label: 'GPT-4o',        note: 'flagship' },
      { id: 'gpt-4o-mini',  label: 'GPT-4o mini',   note: 'fast · cheap' },
      { id: 'gpt-4-turbo',  label: 'GPT-4 Turbo' },
      { id: 'o1',           label: 'o1',             note: 'reasoning' },
      { id: 'o1-mini',      label: 'o1-mini',        note: 'reasoning · fast' },
      { id: 'o3-mini',      label: 'o3-mini',        note: 'reasoning · cheap' },
    ],
  },
  {
    name: 'Anthropic',
    color: 'text-orange-300',
    badge: 'bg-orange-500/10 border-orange-500/20',
    models: [
      { id: 'claude-opus-4-5',             label: 'Claude Opus 4.5',      note: 'most capable' },
      { id: 'claude-sonnet-4-5',           label: 'Claude Sonnet 4.5',    note: 'balanced' },
      { id: 'claude-haiku-4-5-20251001',   label: 'Claude Haiku 4.5',     note: 'fast · cheap' },
      { id: 'claude-3-5-sonnet-20241022',  label: 'Claude 3.5 Sonnet',    note: 'prev-gen' },
      { id: 'claude-3-haiku-20240307',     label: 'Claude 3 Haiku',       note: 'prev-gen · cheap' },
    ],
  },
  {
    name: 'Google',
    color: 'text-blue-300',
    badge: 'bg-blue-500/10 border-blue-500/20',
    models: [
      { id: 'gemini/gemini-2.5-pro',          label: 'Gemini 2.5 Pro',       note: 'most capable' },
      { id: 'gemini/gemini-2.5-flash',        label: 'Gemini 2.5 Flash',     note: 'fast · cheap' },
      { id: 'gemini/gemini-2.0-flash',        label: 'Gemini 2.0 Flash' },
      { id: 'gemini/gemini-1.5-pro-latest',   label: 'Gemini 1.5 Pro',       note: 'prev-gen' },
      { id: 'gemini/gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash',     note: 'prev-gen · cheap' },
    ],
  },
];

function ModelPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);

  const selectedModel = MODEL_GROUPS.flatMap(g => g.models).find(m => m.id === value);
  const selectedGroup = MODEL_GROUPS.find(g => g.models.some(m => m.id === value));

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-surface-container-lowest text-on-surface font-mono text-sm p-4 rounded-md focus:ring-1 focus:ring-primary/50 transition-all hover:bg-surface-container-high"
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedGroup && (
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${selectedGroup.badge} ${selectedGroup.color} flex-shrink-0`}>
              {selectedGroup.name}
            </span>
          )}
          <span className="truncate">{selectedModel?.label ?? value}</span>
          {selectedModel?.note && (
            <span className="text-zinc-600 text-[10px] hidden sm:inline">{selectedModel.note}</span>
          )}
        </div>
        {open ? <ChevronUp size={16} className="text-zinc-500 flex-shrink-0" /> : <ChevronDown size={16} className="text-zinc-500 flex-shrink-0" />}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-highest border border-zinc-700/60 rounded-xl shadow-2xl z-20 overflow-hidden">
          {MODEL_GROUPS.map(group => (
            <div key={group.name}>
              <div className={`px-4 py-2 border-b border-zinc-800 flex items-center gap-2`}>
                <span className={`text-[10px] font-mono font-semibold uppercase tracking-widest ${group.color}`}>{group.name}</span>
              </div>
              <div className="p-2 grid grid-cols-1 gap-0.5">
                {group.models.map(model => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => { onChange(model.id); setOpen(false); }}
                    className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-left transition-all ${
                      value === model.id
                        ? 'bg-primary/15 text-primary'
                        : 'text-zinc-300 hover:bg-surface-container-low hover:text-zinc-100'
                    }`}
                  >
                    <span className="font-mono text-sm">{model.label}</span>
                    <div className="flex items-center gap-2">
                      {model.note && (
                        <span className="text-[10px] font-mono text-zinc-600">{model.note}</span>
                      )}
                      {value === model.id && (
                        <CheckCircle2 size={12} className="text-primary flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
import { motion, AnimatePresence } from 'motion/react';
import { AuditMetric, Insight, SystemConfig, AuditStatus } from '../types';
import { MetricIcon } from './MetricIcon';

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

function probeDisplay(p: ProbeResult): { label: string; value: string; icon: string } {
  const v = p.metric_value;
  switch (p.probe_name) {
    case 'calibration':     return { label: 'Calibration',    value: `ECE ${v.toFixed(3)}`,         icon: 'Activity' };
    case 'consistency':     return { label: 'Consistency',    value: `SD ${v.toFixed(2)}`,           icon: 'RefreshCw' };
    case 'positional_bias': return { label: 'Bias Detection', value: `Flip ${(v*100).toFixed(0)}%`, icon: 'Radar' };
    case 'verbosity_bias':  return { label: 'Verbosity Bias', value: `Lift +${v.toFixed(1)}`,       icon: 'AlertTriangle' };
    case 'human_alignment': return { label: 'Alignment',      value: `rho ${v.toFixed(2)}`,         icon: 'ShieldCheck' };
    default:                return { label: p.probe_name,     value: v.toFixed(3),                   icon: 'Activity' };
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

export interface AuditDashboardRef {
  triggerSubmit: () => void;
}

export const AuditDashboard = forwardRef<AuditDashboardRef>((_, ref) => {
  const [config, setConfig] = useState<SystemConfig>({ judgeModel: 'gpt-4o', apiKey: '', benchmark: 'MT-Bench', taskCount: 50 });
  const [auditState, setAuditState] = useState<AuditState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<AuditStatus>({ currentStep: 'Waiting to start...', progress: 0, estTime: '', tags: PROBE_ORDER.map(k => PROBE_LABELS[k]) });
  const [metrics, setMetrics] = useState<AuditMetric[]>(EMPTY_METRICS);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [trustGrade, setTrustGrade] = useState('--');
  const [report, setReport] = useState<AuditReport | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const completedRef = useRef(false);
  const [currentProbe, setCurrentProbe] = useState<string | null>(null);
  const [completedProbes, setCompletedProbes] = useState<string[]>([]);

  useImperativeHandle(ref, () => ({
    triggerSubmit: () => handleSubmit(),
  }));

  useEffect(() => {
    if (!jobId) return;
    completedRef.current = false;
    setCurrentProbe(null);
    setCompletedProbes([]);
    const es = new EventSource(`/api/audit/${jobId}/stream`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data) as { probe: string | null; percent: number };
        setStatus(s => ({ ...s, currentStep: d.probe ? `Running ${d.probe.replace(/_/g, ' ')} probe...` : 'Initialising...', progress: d.percent }));
        if (d.probe) {
          setCurrentProbe(prev => {
            if (prev && prev !== d.probe) setCompletedProbes(c => c.includes(prev) ? c : [...c, prev]);
            return d.probe;
          });
        }
      } catch { /* ignore */ }
    };

    es.addEventListener('complete', (e: MessageEvent) => {
      try {
        const p = JSON.parse(e.data) as { status: string; result: AuditReport | null; error: string | null };
        completedRef.current = true;
        es.close(); esRef.current = null;
        if (p.status === 'completed' && p.result) {
          const r = p.result;
          setReport(r);
          setMetrics(r.probes.map(pr => { const { label, value, icon } = probeDisplay(pr); return { name: label, value, status: probeStatus(pr), icon }; }));
          setInsights(r.recommendations.map((text, i) => ({ id: String(i), text, icon: i === 0 ? 'BrainCircuit' : 'Thermometer', isPrimary: i === 0 })));
          setTrustGrade(r.trust_grade.replace('_PLUS', '+'));
          setStatus(s => ({ ...s, currentStep: 'Audit complete', progress: 100 }));
          setCompletedProbes(PROBE_ORDER);
          setCurrentProbe(null);
          setAuditState('complete');
        } else {
          setErrorMsg(p.error ?? 'Audit failed'); setAuditState('error');
        }
      } catch { /* ignore */ }
    });

    es.onerror = () => {
      if (completedRef.current) return;
      es.close(); esRef.current = null;
      pollJobUntilDone(jobId);
    };
    return () => { es.close(); esRef.current = null; };
  }, [jobId]);

  async function pollJobUntilDone(id: string) {
    while (true) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const res = await fetch(`/api/audit/${id}/report`);
        if (!res.ok) { setErrorMsg(`HTTP ${res.status}`); setAuditState('error'); return; }
        const job = await res.json() as { status: string; progress: number; current_probe: string | null; result: AuditReport | null; error: string | null };
        if (job.status === 'running') {
          setStatus(s => ({ ...s, currentStep: job.current_probe ? `Running ${job.current_probe.replace(/_/g, ' ')} probe...` : s.currentStep, progress: job.progress }));
          if (job.current_probe) {
            setCurrentProbe(prev => {
              if (prev && prev !== job.current_probe) setCompletedProbes(c => c.includes(prev) ? c : [...c, prev]);
              return job.current_probe;
            });
          }
          continue;
        }
        if (job.status === 'completed' && job.result) {
          completedRef.current = true;
          const r = job.result;
          setReport(r);
          setMetrics(r.probes.map(pr => { const { label, value, icon } = probeDisplay(pr); return { name: label, value, status: probeStatus(pr), icon }; }));
          setInsights(r.recommendations.map((text, i) => ({ id: String(i), text, icon: i === 0 ? 'BrainCircuit' : 'Thermometer', isPrimary: i === 0 })));
          setTrustGrade(r.trust_grade.replace('_PLUS', '+'));
          setStatus(s => ({ ...s, currentStep: 'Audit complete', progress: 100 }));
          setCompletedProbes(PROBE_ORDER);
          setCurrentProbe(null);
          setAuditState('complete');
          return;
        }
        if (job.status === 'failed') {
          setErrorMsg(job.error ?? 'Audit failed'); setAuditState('error'); return;
        }
      } catch {
        // network blip — keep retrying
      }
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    esRef.current?.close(); esRef.current = null;
    setErrorMsg(null); setAuditState('running'); setMetrics(EMPTY_METRICS); setInsights([]);
    setTrustGrade('--'); setReport(null); setJobId(null);
    setStatus({ currentStep: 'Queuing audit...', progress: 0, estTime: '', tags: PROBE_ORDER.map(k => PROBE_LABELS[k]) });

    try {
      const res = await fetch('/api/audit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ judge_model: config.judgeModel, benchmark: BENCHMARK_PARAM[config.benchmark] ?? 'mt_bench', task_count: config.taskCount }),
      });
      if (res.status === 429) { setErrorMsg('Rate limit: 1 audit per IP per hour.'); setAuditState('error'); return; }
      if (!res.ok) { const b = await res.json().catch(() => ({})); setErrorMsg((b as { detail?: string }).detail ?? `HTTP ${res.status}`); setAuditState('error'); return; }
      setJobId((await res.json() as { job_id: string }).job_id);
    } catch {
      setErrorMsg('Could not reach backend. Start it with: uvicorn web.backend.main:app --reload'); setAuditState('error');
    }
  }

  return (
    <div className="pt-32 pb-24 px-8 lg:px-16 max-w-[1440px] mx-auto w-full grid grid-cols-12 gap-8 lg:gap-12 items-start">
      <div className="col-span-12 lg:col-span-5 space-y-12">
        <section>
          <h2 className="text-on-surface-variant font-mono text-[0.6875rem] uppercase tracking-tighter mb-4 opacity-60">System Configuration</h2>
          <form onSubmit={handleSubmit} className="bg-surface-container-low p-8 rounded-xl space-y-6">
            <div className="space-y-2">
              <label className="block font-mono text-[0.6875rem] text-on-surface-variant uppercase tracking-widest">Judge Model</label>
              <ModelPicker value={config.judgeModel} onChange={id => setConfig({ ...config, judgeModel: id })} />
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
              <div className="mt-5 space-y-2">
                {PROBE_ORDER.map((probe) => {
                  const done = completedProbes.includes(probe);
                  const active = currentProbe === probe;
                  return (
                    <div key={probe} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${active ? 'bg-primary/10' : ''}`}>
                      {done
                        ? <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                        : active
                          ? <Loader2 size={14} className="text-primary flex-shrink-0 animate-spin" />
                          : <Circle size={14} className="text-zinc-700 flex-shrink-0" />
                      }
                      <span className={`font-mono text-[10px] uppercase tracking-widest ${done ? 'text-emerald-500' : active ? 'text-primary' : 'text-zinc-600'}`}>
                        {PROBE_LABELS[probe]}
                      </span>
                    </div>
                  );
                })}
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
    </div>
  );
});
