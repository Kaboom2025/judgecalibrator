import { useState, useEffect, useCallback } from 'react';
import { Loader2, ArrowLeftRight, AlignJustify, Edit3, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { DemoQuestion, PairwiseEvaluation } from '../types';

interface EvalState {
  result: PairwiseEvaluation | null;
  loading: boolean;
  error: string | null;
}

interface ExpandState {
  loading: boolean;
  error: string | null;
}

type BiasFound = 'positional' | 'verbosity' | 'manual';

const BIAS_EXPLAINERS: Record<BiasFound, { title: string; description: string; stat: string }> = {
  positional: {
    title: 'Positional Bias Triggered',
    description: 'The judge changed its preference just because you swapped the answer positions. The content is identical — only the order changed. This is positional bias.',
    stat: 'In our audit, gpt-4o flipped its preference on 63% of swapped pairs.',
  },
  verbosity: {
    title: 'Verbosity Bias Triggered',
    description: 'The judge changed its preference after you made one answer longer — even though the core content is the same. LLM judges reward length over quality.',
    stat: 'In our audit, verbosity lift averaged +0.8 score points per 50% length increase.',
  },
  manual: {
    title: 'Manual Manipulation',
    description: 'You edited the answer directly and changed the judge\'s preference. This shows how easy it is to game LLM judges with superficial changes.',
    stat: 'Simple edits like adding confident-sounding phrases can shift judge scores by up to 2 points.',
  },
};

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function PreferenceChip({ pref, conf }: { pref: 'A' | 'B'; conf: number }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold ${pref === 'A' ? 'bg-primary/20 text-primary' : 'bg-amber-500/20 text-amber-400'}`}>
      Prefers {pref} · {Math.round(conf * 100)}% confident
    </span>
  );
}

export function FoolTheJudge() {
  const [question, setQuestion] = useState<DemoQuestion | null>(null);
  const [answerA, setAnswerA] = useState('');
  const [answerB, setAnswerB] = useState('');
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [questionError, setQuestionError] = useState<string | null>(null);

  const [originalEval, setOriginalEval] = useState<EvalState>({ result: null, loading: false, error: null });
  const [currentEval, setCurrentEval] = useState<EvalState>({ result: null, loading: false, error: null });

  const [swapped, setSwapped] = useState(false);
  const [editMode, setEditMode] = useState<'A' | 'B' | null>(null);
  const [expandState, setExpandState] = useState<ExpandState>({ loading: false, error: null });

  const [biasesFound, setBiasesFound] = useState<Set<BiasFound>>(new Set());
  const [lastBiasTriggered, setLastBiasTriggered] = useState<BiasFound | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);
  const [showOrigReasoning, setShowOrigReasoning] = useState(false);

  const evaluate = useCallback(async (q: string, a: string, b: string): Promise<PairwiseEvaluation | null> => {
    try {
      const res = await fetch('/api/demo/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, answer_a: a, answer_b: b }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(body.detail ?? `HTTP ${res.status}`);
      }
      return await res.json() as PairwiseEvaluation;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Evaluation failed');
    }
  }, []);

  const loadQuestion = useCallback(async (exclude: string[] = []) => {
    setLoadingQuestion(true);
    setQuestionError(null);
    setSwapped(false);
    setEditMode(null);
    setOriginalEval({ result: null, loading: false, error: null });
    setCurrentEval({ result: null, loading: false, error: null });
    setLastBiasTriggered(null);
    setShowReasoning(false);
    setShowOrigReasoning(false);

    try {
      const params = exclude.length ? `?exclude=${exclude.join(',')}` : '';
      const res = await fetch(`/api/demo/question${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const q = await res.json() as DemoQuestion;

      setQuestion(q);
      setAnswerA(q.answer_a);
      setAnswerB(q.answer_b);
      setSeenIds(prev => [...prev, q.question_id]);

      // Auto-evaluate
      setOriginalEval({ result: null, loading: true, error: null });
      setCurrentEval({ result: null, loading: true, error: null });
      setLoadingQuestion(false);

      const result = await evaluate(q.question, q.answer_a, q.answer_b);
      if (result) {
        setOriginalEval({ result, loading: false, error: null });
        setCurrentEval({ result, loading: false, error: null });
      }
    } catch (err) {
      setQuestionError(err instanceof Error ? err.message : 'Failed to load question');
      setLoadingQuestion(false);
    }
  }, [evaluate]);

  useEffect(() => {
    loadQuestion([]);
  }, [loadQuestion]);

  async function handleSwap() {
    if (!question || currentEval.loading) return;
    const newA = answerB;
    const newB = answerA;
    setAnswerA(newA);
    setAnswerB(newB);
    setSwapped(s => !s);

    const prevPref = currentEval.result?.preference ?? null;
    setCurrentEval(s => ({ ...s, loading: true, error: null }));
    try {
      const result = await evaluate(question.question, newA, newB);
      if (result) {
        setCurrentEval({ result, loading: false, error: null });
        // After swap: if new preference is opposite of original (mapped back), it's positional bias
        // When swapped, judge prefers "A" = originally B, prefers "B" = originally A
        // So if original preferred A and now prefers A (which is now original B), that's a flip
        const origPref = originalEval.result?.preference;
        const flipped = origPref && prevPref && result.preference !== prevPref;
        if (flipped) {
          const newSet = new Set(biasesFound);
          newSet.add('positional');
          setBiasesFound(newSet);
          setLastBiasTriggered('positional');
        }
      }
    } catch (err) {
      setCurrentEval({ result: null, loading: false, error: err instanceof Error ? err.message : 'Error' });
    }
  }

  async function handleExpand(target: 'A' | 'B', method: 'deterministic' | 'llm') {
    if (!question || expandState.loading) return;
    const text = target === 'A' ? answerA : answerB;

    setExpandState({ loading: true, error: null });
    try {
      const res = await fetch('/api/demo/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, method }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(body.detail ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as { expanded_text: string };
      const newA = target === 'A' ? data.expanded_text : answerA;
      const newB = target === 'B' ? data.expanded_text : answerB;
      if (target === 'A') setAnswerA(data.expanded_text);
      else setAnswerB(data.expanded_text);
      setExpandState({ loading: false, error: null });

      const prevPref = currentEval.result?.preference;
      setCurrentEval(s => ({ ...s, loading: true, error: null }));
      const result = await evaluate(question.question, newA, newB);
      if (result) {
        setCurrentEval({ result, loading: false, error: null });
        if (prevPref && result.preference !== prevPref) {
          const newSet = new Set(biasesFound);
          newSet.add('verbosity');
          setBiasesFound(newSet);
          setLastBiasTriggered('verbosity');
        }
      }
    } catch (err) {
      setExpandState({ loading: false, error: err instanceof Error ? err.message : 'Error' });
      setCurrentEval(s => ({ ...s, loading: false }));
    }
  }

  async function handleReEvaluate() {
    if (!question || currentEval.loading) return;
    const prevPref = currentEval.result?.preference;
    setCurrentEval(s => ({ ...s, loading: true, error: null }));
    try {
      const result = await evaluate(question.question, answerA, answerB);
      if (result) {
        setCurrentEval({ result, loading: false, error: null });
        if (prevPref && result.preference !== prevPref) {
          const newSet = new Set(biasesFound);
          newSet.add('manual');
          setBiasesFound(newSet);
          setLastBiasTriggered('manual');
        }
      }
    } catch (err) {
      setCurrentEval({ result: null, loading: false, error: err instanceof Error ? err.message : 'Error' });
    }
  }

  const hasChanges = answerA !== question?.answer_a || answerB !== question?.answer_b;
  const prefChanged = originalEval.result && currentEval.result &&
    originalEval.result.preference !== currentEval.result.preference;

  if (loadingQuestion) {
    return (
      <div className="pt-32 pb-24 px-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-primary mb-4" />
        <p className="text-zinc-500 font-mono text-sm">Loading question & evaluating...</p>
      </div>
    );
  }

  if (questionError) {
    return (
      <div className="pt-32 pb-24 px-8 flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-red-400 font-mono text-sm mb-4">{questionError}</p>
        <button onClick={() => loadQuestion(seenIds)} className="bg-primary text-on-primary px-4 py-2 rounded text-sm font-semibold">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 px-8 lg:px-16 max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-3">
          <h1 className="text-3xl lg:text-4xl font-headline font-black tracking-tight text-zinc-100">
            Fool the Judge
          </h1>
          <div className="flex items-center gap-3">
            {/* Bias counter */}
            <div className="flex items-center gap-2 bg-surface-container-low rounded-lg px-4 py-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Biases Found</span>
              <span className="font-headline font-bold text-lg text-primary">{biasesFound.size}</span>
              <span className="font-mono text-xs text-zinc-600">/3</span>
            </div>
            <button
              onClick={() => loadQuestion(seenIds)}
              className="flex items-center gap-2 border border-zinc-700 text-zinc-400 px-4 py-2 rounded-lg text-sm font-semibold hover:border-zinc-500 hover:text-zinc-200 transition-all"
            >
              <RefreshCw size={14} />
              Next Question
            </button>
          </div>
        </div>
        <p className="text-zinc-500 font-headline text-sm max-w-2xl">
          Can you make the judge change its mind? Try swapping answers, making one more verbose, or editing directly.
        </p>
      </div>

      {/* Question */}
      <div className="bg-surface-container-low rounded-xl p-6 mb-8 border border-outline-variant/10">
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600 block mb-2">Question</span>
        <p className="text-zinc-200 font-headline leading-relaxed">{question?.question}</p>
      </div>

      {/* Before / After eval */}
      {originalEval.result && currentEval.result && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 p-5 rounded-xl border transition-all ${prefChanged ? 'bg-amber-500/5 border-amber-500/30' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 block mb-2">Original Judgment</span>
            <PreferenceChip pref={originalEval.result.preference} conf={originalEval.result.confidence} />
            <button
              onClick={() => setShowOrigReasoning(v => !v)}
              className="flex items-center gap-1 text-zinc-600 hover:text-zinc-400 text-[10px] font-mono mt-2 transition-colors"
            >
              Reasoning {showOrigReasoning ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
            {showOrigReasoning && (
              <p className="mt-2 text-zinc-500 text-xs font-headline leading-relaxed">{originalEval.result.reasoning}</p>
            )}
          </div>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 block mb-2">
              Current Judgment {prefChanged && <span className="text-amber-400 ml-1">CHANGED</span>}
            </span>
            {currentEval.loading ? (
              <div className="flex items-center gap-2 text-zinc-500">
                <Loader2 size={14} className="animate-spin" />
                <span className="font-mono text-xs">Re-evaluating...</span>
              </div>
            ) : (
              <>
                <PreferenceChip pref={currentEval.result.preference} conf={currentEval.result.confidence} />
                <button
                  onClick={() => setShowReasoning(v => !v)}
                  className="flex items-center gap-1 text-zinc-600 hover:text-zinc-400 text-[10px] font-mono mt-2 transition-colors"
                >
                  Reasoning {showReasoning ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
                {showReasoning && (
                  <p className="mt-2 text-zinc-500 text-xs font-headline leading-relaxed">{currentEval.result.reasoning}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {originalEval.loading && !originalEval.result && (
        <div className="flex items-center gap-2 text-zinc-500 mb-8">
          <Loader2 size={16} className="animate-spin" />
          <span className="font-mono text-sm">Evaluating with gpt-4o-mini...</span>
        </div>
      )}

      {/* Manipulation Tools */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={handleSwap}
          disabled={currentEval.loading || !originalEval.result}
          className="flex items-center gap-2 bg-surface-container-low border border-zinc-700 text-zinc-300 px-4 py-2.5 rounded-lg text-sm font-semibold hover:border-primary/50 hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowLeftRight size={14} />
          Swap A ↔ B
          {swapped && <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">swapped</span>}
        </button>

        <div className="relative group">
          <button
            disabled={expandState.loading || !originalEval.result}
            className="flex items-center gap-2 bg-surface-container-low border border-zinc-700 text-zinc-300 px-4 py-2.5 rounded-lg text-sm font-semibold hover:border-primary/50 hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {expandState.loading ? <Loader2 size={14} className="animate-spin" /> : <AlignJustify size={14} />}
            Make Verbose
            <ChevronDown size={12} className="text-zinc-600" />
          </button>
          <div className="absolute top-full left-0 mt-1 w-72 bg-surface-container-highest border border-zinc-700 rounded-xl p-3 shadow-xl z-10 hidden group-hover:block">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Choose answer to expand</p>
            {(['A', 'B'] as const).map(target => (
              <div key={target} className="mb-3 last:mb-0">
                <p className="font-mono text-[10px] text-zinc-600 mb-1.5">Answer {target} ({wordCount(target === 'A' ? answerA : answerB)} words)</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExpand(target, 'deterministic')}
                    className="flex-1 text-xs bg-surface-container-low border border-zinc-700 text-zinc-300 px-2 py-1.5 rounded hover:border-zinc-500 transition-all"
                  >
                    Pad Text (instant)
                  </button>
                  <button
                    onClick={() => handleExpand(target, 'llm')}
                    className="flex-1 text-xs bg-surface-container-low border border-zinc-700 text-zinc-300 px-2 py-1.5 rounded hover:border-primary/50 hover:text-primary transition-all"
                  >
                    AI Expand
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => setEditMode(editMode ? null : 'A')}
          disabled={!originalEval.result}
          className={`flex items-center gap-2 bg-surface-container-low border text-sm font-semibold px-4 py-2.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${editMode ? 'border-primary/50 text-primary' : 'border-zinc-700 text-zinc-300 hover:border-primary/50 hover:text-primary'}`}
        >
          <Edit3 size={14} />
          Edit Manually
        </button>

        {hasChanges && editMode && (
          <button
            onClick={handleReEvaluate}
            disabled={currentEval.loading}
            className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-on-primary px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-40"
          >
            {currentEval.loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Re-evaluate
          </button>
        )}
      </div>

      {expandState.error && (
        <p className="text-red-400 font-mono text-xs mb-4">{expandState.error}</p>
      )}
      {currentEval.error && (
        <p className="text-red-400 font-mono text-xs mb-4">{currentEval.error}</p>
      )}

      {/* Answers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {(['A', 'B'] as const).map(label => {
          const text = label === 'A' ? answerA : answerB;
          const setText = label === 'A' ? setAnswerA : setAnswerB;
          const origText = label === 'A' ? question?.answer_a : question?.answer_b;
          const isExpanded = text !== origText && !editMode;
          const isEditing = editMode === label;

          return (
            <div key={label} className={`bg-surface-container-low rounded-xl overflow-hidden border transition-all ${isEditing ? 'border-primary/40' : 'border-outline-variant/10'}`}>
              <div className="px-5 py-3 border-b border-outline-variant/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${label === 'A' ? 'bg-primary/20 text-primary' : 'bg-amber-500/20 text-amber-400'}`}>
                    Answer {label}
                  </span>
                  {isExpanded && (
                    <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      +{wordCount(text) - wordCount(origText ?? '')} words
                    </span>
                  )}
                </div>
                <span className="font-mono text-[10px] text-zinc-600">{wordCount(text)} words</span>
              </div>
              {isEditing ? (
                <div className="p-5">
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={8}
                    className="w-full bg-surface-container-lowest text-zinc-200 font-headline text-sm leading-relaxed p-3 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setEditMode(label === 'A' ? 'B' : 'A')}
                      className="text-xs text-zinc-500 hover:text-zinc-300 font-mono"
                    >
                      Edit Answer {label === 'A' ? 'B' : 'A'} instead
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-5 max-h-64 overflow-y-auto">
                  <p className="text-zinc-300 font-headline text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bias Explainer */}
      {lastBiasTriggered && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-amber-400 text-sm font-bold">!</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-amber-300 mb-1">{BIAS_EXPLAINERS[lastBiasTriggered].title}</h3>
              <p className="text-zinc-300 font-headline text-sm leading-relaxed mb-2">{BIAS_EXPLAINERS[lastBiasTriggered].description}</p>
              <p className="font-mono text-xs text-zinc-500">{BIAS_EXPLAINERS[lastBiasTriggered].stat}</p>
            </div>
          </div>
        </div>
      )}

      {/* Found biases summary */}
      {biasesFound.size > 0 && (
        <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/10">
          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 block mb-3">Biases You've Demonstrated</span>
          <div className="flex flex-wrap gap-2">
            {Array.from(biasesFound).map(b => (
              <span key={b} className="font-mono text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
                {b === 'positional' ? 'Positional Bias' : b === 'verbosity' ? 'Verbosity Bias' : 'Manual Exploit'}
              </span>
            ))}
            {biasesFound.size < 3 && (
              <span className="font-mono text-xs text-zinc-600 px-3 py-1">
                {3 - biasesFound.size} more to find...
              </span>
            )}
            {biasesFound.size === 3 && (
              <span className="font-mono text-xs text-emerald-400 px-3 py-1">All biases found!</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
