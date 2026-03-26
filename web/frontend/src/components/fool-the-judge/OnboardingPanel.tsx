import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlignJustify, ArrowLeftRight, ChevronDown, ChevronUp, Edit3, Lightbulb } from 'lucide-react';

const TOOLS = [
  {
    icon: <ArrowLeftRight size={14} />,
    label: 'Swap A ↔ B',
    description: 'Reorder answers to test if position affects the verdict.',
    bias: 'Positional Bias',
  },
  {
    icon: <AlignJustify size={14} />,
    label: 'Make Verbose',
    description: 'Pad an answer with filler to test if length sways the judge.',
    bias: 'Verbosity Bias',
  },
  {
    icon: <Edit3 size={14} />,
    label: 'Edit Manually',
    description: 'Rewrite an answer to see how easy it is to game the judge.',
    bias: 'Manual Exploit',
  },
];

const STORAGE_KEY = 'ftj-onboarding-dismissed';

export function OnboardingPanel() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; }
    catch { return false; }
  });
  const [expanded, setExpanded] = useState(!dismissed);

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    setDismissed(true);
    setExpanded(false);
  }

  if (dismissed) return null;

  return (
    <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl mb-8 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-container/50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2.5">
          <Lightbulb size={15} className="text-primary flex-shrink-0" />
          <span className="font-mono text-xs font-semibold text-zinc-300">How this demo works</span>
        </div>
        {expanded ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-outline-variant/10">
              <div className="pt-4 mb-5 space-y-2">
                <p className="text-zinc-300 font-headline text-sm leading-relaxed">
                  An <span className="text-zinc-100 font-semibold">LLM judge</span> is an AI model asked to evaluate which of two answers is better. They're widely used in AI benchmarks and automated evaluation pipelines.
                </p>
                <p className="text-zinc-400 font-headline text-sm leading-relaxed">
                  The problem: LLM judges are biased. This demo lets you <span className="text-zinc-200">personally trigger those biases</span> and watch the verdict change — with the same underlying content.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                {TOOLS.map(tool => (
                  <div key={tool.label} className="bg-surface-container rounded-lg p-3.5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-primary">{tool.icon}</span>
                      <span className="font-mono text-xs font-semibold text-zinc-200">{tool.label}</span>
                    </div>
                    <p className="font-headline text-xs text-zinc-400 leading-relaxed mb-2">{tool.description}</p>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">
                      Tests: {tool.bias}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] text-zinc-600">
                  Try all 3 tools to find all biases → <span className="text-zinc-500">0/3 found</span>
                </p>
                <button
                  onClick={dismiss}
                  className="font-mono text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-container"
                >
                  Got it, hide this
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
