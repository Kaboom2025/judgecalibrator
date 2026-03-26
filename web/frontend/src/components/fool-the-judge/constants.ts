import { DemoQuestion, PairwiseEvaluation } from '../../types';

export type BiasFound = 'positional' | 'verbosity' | 'manual';

export interface EvalState {
  result: PairwiseEvaluation | null;
  loading: boolean;
  error: string | null;
}

export interface ExpandState {
  loading: boolean;
  target: 'A' | 'B' | null;
  error: string | null;
}

export interface DemoState {
  question: DemoQuestion | null;
  answerA: string;
  answerB: string;
}

export const BIAS_EXPLAINERS: Record<BiasFound, { title: string; description: string; stat: string }> = {
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
    description: "You edited the answer directly and changed the judge's preference. This shows how easy it is to game LLM judges with superficial changes.",
    stat: 'Simple edits like adding confident-sounding phrases can shift judge scores by up to 2 points.',
  },
};

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
