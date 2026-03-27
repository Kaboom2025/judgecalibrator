import { useState, useEffect, useCallback } from 'react';
import { Loader2, ArrowLeftRight, RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { DemoQuestion, PairwiseEvaluation } from '../types';
import { BiasFound, EvalState, ExpandState, wordCount } from './fool-the-judge/constants';
import { OnboardingPanel } from './fool-the-judge/OnboardingPanel';
import { QuestionBlock } from './fool-the-judge/QuestionBlock';
import { JudgmentPanel } from './fool-the-judge/JudgmentPanel';
import { AnswerCard } from './fool-the-judge/AnswerCard';
import { BiasExplainer } from './fool-the-judge/BiasExplainer';

interface SwapFeedback {
  prefChanged: boolean;
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

  const [editMode, setEditMode] = useState<'A' | 'B' | null>(null);
  const [expandState, setExpandState] = useState<ExpandState>({ loading: false, target: null, error: null });

  const [swapAnimDir, setSwapAnimDir] = useState<'left' | 'right' | null>(null);
  const [swapFeedback, setSwapFeedback] = useState<SwapFeedback | null>(null);
  const [swapFeedbackTimer, setSwapFeedbackTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const [biasesFound, setBiasesFound] = useState<Set<BiasFound>>(new Set());
  const [lastBiasTriggered, setLastBiasTriggered] = useState<BiasFound | null>(null);

  const evaluate = useCallback(async (q: string, a: string, b: string): Promise<PairwiseEvaluation | null> => {
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
  }, []);

  const loadQuestion = useCallback(async (exclude: string[] = []) => {
    setLoadingQuestion(true);
    setQuestionError(null);
    setEditMode(null);
    setSwapFeedback(null);
    setOriginalEval({ result: null, loading: false, error: null });
    setCurrentEval({ result: null, loading: false, error: null });
    setLastBiasTriggered(null);

    try {
      const params = exclude.length ? `?exclude=${exclude.join(',')}` : '';
      const res = await fetch(`/api/demo/question${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const q = await res.json() as DemoQuestion;

      setQuestion(q);
      setAnswerA(q.answer_a);
      setAnswerB(q.answer_b);
      setSeenIds(prev => [...prev, q.question_id]);

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

  useEffect(() => { loadQuestion([]); }, [loadQuestion]);

  function showSwapFeedback(prefChanged: boolean) {
    setSwapFeedback({ prefChanged });
    if (swapFeedbackTimer) clearTimeout(swapFeedbackTimer);
    const timer = setTimeout(() => setSwapFeedback(null), 5000);
    setSwapFeedbackTimer(timer);
  }

  async function handleSwap() {
    if (!question || currentEval.loading) return;
    const newA = answerB;
    const newB = answerA;

    setSwapAnimDir('right');
    setTimeout(() => setSwapAnimDir(null), 400);

    setAnswerA(newA);
    setAnswerB(newB);

    const prevPref = currentEval.result?.preference ?? null;
    setCurrentEval(s => ({ ...s, loading: true, error: null }));
    try {
      const result = await evaluate(question.question, newA, newB);
      if (result) {
        setCurrentEval({ result, loading: false, error: null });
        const prefChanged = !!prevPref && result.preference !== prevPref;
        showSwapFeedback(prefChanged);
        if (prefChanged) {
          setBiasesFound(prev => new Set([...prev, 'positional']));
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

    setExpandState({ loading: true, target, error: null });
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
      setExpandState({ loading: false, target: null, error: null });

      const prevPref = currentEval.result?.preference;
      setCurrentEval(s => ({ ...s, loading: true, error: null }));
      const result = await evaluate(question.question, newA, newB);
      if (result) {
        setCurrentEval({ result, loading: false, error: null });
        if (prevPref && result.preference !== prevPref) {
          setBiasesFound(prev => new Set([...prev, 'verbosity']));
          setLastBiasTriggered('verbosity');
        }
      }
    } catch (err) {
      setExpandState({ loading: false, target: null, error: err instanceof Error ? err.message : 'Error' });
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
          setBiasesFound(prev => new Set([...prev, 'manual']));
          setLastBiasTriggered('manual');
        }
      }
    } catch (err) {
      setCurrentEval({ result: null, loading: false, error: err instanceof Error ? err.message : 'Error' });
    }
  }

  const hasChanges = answerA !== question?.answer_a || answerB !== question?.answer_b;
  const prefChanged = !!(originalEval.result && currentEval.result &&
    originalEval.result.preference !== currentEval.result.preference);

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
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-3">
          <h1 className="text-3xl lg:text-4xl font-headline font-black tracking-tight text-zinc-100">
            Fool the Judge
          </h1>
          <div className="flex items-center gap-3">
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
          Can you make the judge change its mind? Trigger all 3 biases to win.
        </p>
      </div>

      <OnboardingPanel />

      {question && <QuestionBlock question={question.question} />}

      {/* Answer cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {(['A', 'B'] as const).map(label => (
          <AnswerCard
            key={label}
            label={label}
            text={label === 'A' ? answerA : answerB}
            originalText={label === 'A' ? (question?.answer_a ?? '') : (question?.answer_b ?? '')}
            isEditing={editMode === label}
            swapAnimDir={label === 'A' ? swapAnimDir : swapAnimDir === 'right' ? 'left' : swapAnimDir === 'left' ? 'right' : null}
            expandLoading={expandState.loading}
            expandLoadingTarget={expandState.target}
            onTextChange={text => label === 'A' ? setAnswerA(text) : setAnswerB(text)}
            onStartEdit={() => setEditMode(label)}
            onStopEdit={() => setEditMode(null)}
            onExpand={method => handleExpand(label, method)}
            onExpandOther={(target, method) => handleExpand(target, method)}
            otherText={label === 'A' ? answerB : answerA}
          />
        ))}
      </div>

      {/* Toolbar: Swap + Re-evaluate */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={handleSwap}
          disabled={currentEval.loading || !originalEval.result}
          className="flex items-center gap-2 bg-surface-container-low border border-zinc-700 text-zinc-300 px-4 py-2.5 rounded-lg text-sm font-semibold hover:border-primary/50 hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowLeftRight size={14} />
          Swap A ↔ B
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

      {/* Swap feedback banner */}
      <AnimatePresence>
        {swapFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={`rounded-xl px-5 py-3.5 mb-6 flex items-center justify-between ${swapFeedback.prefChanged ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-emerald-500/10 border border-emerald-500/20'}`}
          >
            <p className={`font-headline text-sm ${swapFeedback.prefChanged ? 'text-amber-200' : 'text-emerald-300'}`}>
              {swapFeedback.prefChanged
                ? 'The judge flipped! Same content, different order — that\'s positional bias.'
                : 'The judge held steady. Same preference despite the swap.'}
            </p>
            <button onClick={() => setSwapFeedback(null)} className="text-zinc-500 hover:text-zinc-300 font-mono text-xs ml-4">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {expandState.error && (
        <p className="text-red-400 font-mono text-xs mb-4">{expandState.error}</p>
      )}
      {currentEval.error && (
        <p className="text-red-400 font-mono text-xs mb-4">{currentEval.error}</p>
      )}

      <JudgmentPanel
        originalEval={originalEval}
        currentEval={currentEval}
        prefChanged={prefChanged}
        hasUserActed={hasChanges || swapFeedback !== null || biasesFound.size > 0}
      />

      <BiasExplainer lastBiasTriggered={lastBiasTriggered} biasesFound={biasesFound} />
    </div>
  );
}
