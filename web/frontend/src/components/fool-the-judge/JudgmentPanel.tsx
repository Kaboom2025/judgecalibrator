import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { EvalState } from './constants';

function PreferenceChip({ pref, conf }: { pref: 'A' | 'B'; conf: number }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold ${pref === 'A' ? 'bg-primary/20 text-primary' : 'bg-amber-500/20 text-amber-400'}`}>
      Prefers {pref} · {Math.round(conf)}% confident
    </span>
  );
}

interface JudgmentPanelProps {
  originalEval: EvalState;
  currentEval: EvalState;
  prefChanged: boolean;
  hasUserActed: boolean;
}

export function JudgmentPanel({ originalEval, currentEval, prefChanged, hasUserActed }: JudgmentPanelProps) {
  const [showOrigReasoning, setShowOrigReasoning] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);

  if (!originalEval.result && !originalEval.loading) return null;

  if (originalEval.loading && !originalEval.result) {
    return (
      <div className="flex items-center gap-2 text-zinc-500 mb-8">
        <Loader2 size={16} className="animate-spin" />
        <span className="font-mono text-sm">Evaluating with gpt-4o-mini...</span>
      </div>
    );
  }

  if (!originalEval.result) return null;

  return (
    <motion.div
      layout
      className={`grid gap-4 mb-8 p-5 rounded-xl border transition-colors ${hasUserActed ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} ${prefChanged ? 'bg-amber-500/5 border-amber-500/30' : 'bg-emerald-500/5 border-emerald-500/10'}`}
    >
      <div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 block mb-2">Original Judgment</span>
        <PreferenceChip pref={originalEval.result.preference} conf={originalEval.result.confidence} />
        <button
          onClick={() => setShowOrigReasoning(v => !v)}
          className="flex items-center gap-1 text-zinc-600 hover:text-zinc-400 text-[10px] font-mono mt-2 transition-colors"
        >
          Reasoning {showOrigReasoning ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>
        <AnimatePresence>
          {showOrigReasoning && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 text-zinc-500 text-xs font-headline leading-relaxed overflow-hidden"
            >
              {originalEval.result.reasoning}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {hasUserActed && (
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Current Judgment</span>
              <AnimatePresence>
                {prefChanged && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="font-mono text-[10px] text-amber-400 font-bold"
                  >
                    CHANGED
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {currentEval.loading ? (
              <div className="flex items-center gap-2 text-zinc-500">
                <Loader2 size={14} className="animate-spin" />
                <span className="font-mono text-xs">Re-evaluating...</span>
              </div>
            ) : currentEval.result ? (
              <>
                <PreferenceChip pref={currentEval.result.preference} conf={currentEval.result.confidence} />
                <button
                  onClick={() => setShowReasoning(v => !v)}
                  className="flex items-center gap-1 text-zinc-600 hover:text-zinc-400 text-[10px] font-mono mt-2 transition-colors"
                >
                  Reasoning {showReasoning ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
                <AnimatePresence>
                  {showReasoning && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 text-zinc-500 text-xs font-headline leading-relaxed overflow-hidden"
                    >
                      {currentEval.result.reasoning}
                    </motion.p>
                  )}
                </AnimatePresence>
              </>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
