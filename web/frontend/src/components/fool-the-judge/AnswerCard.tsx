import React, { useRef } from 'react';
import { Edit3, X } from 'lucide-react';
import { motion } from 'motion/react';
import { VerboseDropdown } from './VerboseDropdown';
import { wordCount } from './constants';

interface AnswerCardProps {
  key?: React.Key;
  label: 'A' | 'B';
  text: string;
  originalText: string;
  isEditing: boolean;
  swapAnimDir: 'left' | 'right' | null;
  expandLoading: boolean;
  expandLoadingTarget: 'A' | 'B' | null;
  onTextChange: (text: string) => void;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onExpand: (method: 'deterministic' | 'llm') => void;
  onExpandOther: (target: 'A' | 'B', method: 'deterministic' | 'llm') => void;
  otherText: string;
}

const BORDER_COLOR = { A: 'border-primary/60', B: 'border-amber-500/60' };
const LABEL_STYLE = {
  A: 'bg-primary/20 text-primary',
  B: 'bg-amber-500/20 text-amber-400',
};

export function AnswerCard({
  label,
  text,
  originalText,
  isEditing,
  swapAnimDir,
  expandLoading,
  expandLoadingTarget,
  onTextChange,
  onStartEdit,
  onStopEdit,
  onExpand,
  onExpandOther,
  otherText,
}: AnswerCardProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wordDiff = wordCount(text) - wordCount(originalText);
  const isExpanded = text !== originalText && wordDiff > 0 && !isEditing;

  const animX = swapAnimDir === 'right' ? [0, 18, 0] : swapAnimDir === 'left' ? [0, -18, 0] : 0;

  return (
    <motion.div
      animate={{ x: animX }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      className={`bg-surface-container-low rounded-xl overflow-hidden border-l-4 border border-outline-variant/10 transition-all ${BORDER_COLOR[label]} ${isEditing ? 'ring-1 ring-primary/30' : ''}`}
    >
      {/* Header */}
      <div className="px-5 py-3 border-b border-outline-variant/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${LABEL_STYLE[label]}`}>
            Answer {label}
          </span>
          {isExpanded && (
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              +{wordDiff} words
            </span>
          )}
          {isEditing && (
            <span className="font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              editing
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-zinc-600">{wordCount(text)} words</span>
          {isEditing && (
            <button
              onClick={onStopEdit}
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5 rounded"
              title="Stop editing"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="relative group/card">
        {isEditing ? (
          <div className="p-5">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => onTextChange(e.target.value)}
              rows={8}
              autoFocus
              className="w-full bg-transparent text-zinc-200 font-headline text-sm leading-relaxed p-0 resize-none focus:outline-none border-0 border-b border-dashed border-zinc-700 focus:border-primary/50 transition-colors"
            />
          </div>
        ) : (
          <div
            className="p-5 max-h-64 overflow-y-auto cursor-text"
            onDoubleClick={onStartEdit}
            title="Double-click to edit"
          >
            <p className="text-zinc-300 font-headline text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
          </div>
        )}

        {/* Action bar — visible on hover or while editing */}
        {!isEditing && (
          <div className="flex items-center gap-2 px-5 py-3 border-t border-outline-variant/10 opacity-0 group-hover/card:opacity-100 transition-opacity bg-surface-container-low">
            <VerboseDropdown
              disabled={expandLoading}
              loading={expandLoading}
              loadingTarget={expandLoadingTarget}
              answerA={label === 'A' ? text : otherText}
              answerB={label === 'B' ? text : otherText}
              onExpand={(target, method) => {
                if (target === label) {
                  onExpand(method);
                } else {
                  onExpandOther(target, method);
                }
              }}
            />
            <button
              onClick={onStartEdit}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 font-mono px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 transition-all bg-surface-container-low"
            >
              <Edit3 size={12} />
              Edit
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
