import { HelpCircle } from 'lucide-react';

interface QuestionBlockProps {
  question: string;
}

export function QuestionBlock({ question }: QuestionBlockProps) {
  return (
    <div className="bg-surface-container rounded-xl border-l-4 border-zinc-600 p-6 mb-8">
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle size={13} className="text-zinc-500 flex-shrink-0" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Question</span>
      </div>
      <p className="text-zinc-200 font-headline leading-relaxed">{question}</p>
    </div>
  );
}
