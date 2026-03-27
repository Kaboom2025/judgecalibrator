import { AnimatePresence, motion } from 'motion/react';
import { Trophy } from 'lucide-react';
import { BiasFound, BIAS_EXPLAINERS } from './constants';

interface BiasExplainerProps {
  lastBiasTriggered: BiasFound | null;
  biasesFound: Set<BiasFound>;
}

export function BiasExplainer({ lastBiasTriggered, biasesFound }: BiasExplainerProps) {
  return (
    <>
      <AnimatePresence>
        {lastBiasTriggered && (
          <motion.div
            key={lastBiasTriggered}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 mb-8"
          >
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
          </motion.div>
        )}
      </AnimatePresence>

      {biasesFound.size > 0 && (
        <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/10">
          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 block mb-3">Biases You've Demonstrated</span>
          <div className="flex flex-wrap gap-2 mb-4">
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
          </div>
          <AnimatePresence>
            {biasesFound.size === 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 flex items-start gap-4"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Trophy size={16} className="text-emerald-400" />
                </div>
                <div>
                  <p className="font-headline font-bold text-emerald-300 mb-1">You found all 3 biases!</p>
                  <p className="font-headline text-xs text-zinc-400 leading-relaxed">
                    LLM judges are powerful but flawed. Positional bias, verbosity bias, and prompt manipulation are real vulnerabilities in today's AI evaluation pipelines.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
