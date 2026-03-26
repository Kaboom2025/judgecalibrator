import { useEffect, useRef, useState } from 'react';
import { AlignJustify, ChevronDown, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { wordCount } from './constants';

interface VerboseDropdownProps {
  disabled: boolean;
  loading: boolean;
  loadingTarget: 'A' | 'B' | null;
  answerA: string;
  answerB: string;
  onExpand: (target: 'A' | 'B', method: 'deterministic' | 'llm') => void;
}

export function VerboseDropdown({ disabled, loading, loadingTarget, answerA, answerB, onExpand }: VerboseDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  function handleExpand(target: 'A' | 'B', method: 'deterministic' | 'llm') {
    setOpen(false);
    onExpand(target, method);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={disabled}
        className={`flex items-center gap-2 bg-surface-container-low border text-sm font-semibold px-4 py-2.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${open ? 'border-primary/50 text-primary' : 'border-zinc-700 text-zinc-300 hover:border-primary/50 hover:text-primary'}`}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <AlignJustify size={14} />}
        Make Verbose
        <ChevronDown size={12} className={`text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 mt-1 w-72 bg-surface-container-highest border border-zinc-700 rounded-xl p-3 shadow-xl z-20"
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Choose answer to expand</p>
            {(['A', 'B'] as const).map(target => {
              const text = target === 'A' ? answerA : answerB;
              const isLoading = loading && loadingTarget === target;
              return (
                <div key={target} className="mb-3 last:mb-0">
                  <p className="font-mono text-[10px] text-zinc-600 mb-1.5">
                    Answer {target} ({wordCount(text)} words)
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExpand(target, 'deterministic')}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-surface-container-low border border-zinc-700 text-zinc-300 px-2 py-1.5 rounded hover:border-zinc-500 transition-all disabled:opacity-40"
                    >
                      {isLoading ? <Loader2 size={11} className="animate-spin" /> : null}
                      Pad Text (instant)
                    </button>
                    <button
                      onClick={() => handleExpand(target, 'llm')}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-surface-container-low border border-zinc-700 text-zinc-300 px-2 py-1.5 rounded hover:border-primary/50 hover:text-primary transition-all disabled:opacity-40"
                    >
                      {isLoading ? <Loader2 size={11} className="animate-spin" /> : null}
                      AI Expand
                    </button>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
