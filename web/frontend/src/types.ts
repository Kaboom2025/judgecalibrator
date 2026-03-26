export interface AuditMetric {
  name: string;
  value: string;
  status: 'success' | 'warning' | 'error';
  icon: string;
}

export interface Insight {
  id: string;
  text: string;
  icon: string;
  isPrimary: boolean;
}

export interface SystemConfig {
  judgeModel: string;
  apiKey: string;
  benchmark: string;
  taskCount: number;
}

export interface AuditStatus {
  currentStep: string;
  progress: number;
  estTime: string;
  tags: string[];
}

export interface ProbeResult {
  probe_name: string;
  metric_name: string;
  metric_value: number;
  details: Record<string, unknown>;
  error: string | null;
}

export interface PrecomputedResult {
  judge: string;
  trust_grade: string;
  probes: ProbeResult[];
  tasks_evaluated: number;
  benchmark: string;
  recommendations: string[];
  estimated_cost_usd: number;
}

export interface DemoQuestion {
  question_id: string;
  question: string;
  answer_a: string;
  answer_b: string;
  human_winner: string;
}

export interface PairwiseEvaluation {
  preference: 'A' | 'B';
  confidence: number;
  reasoning: string;
}

export type AppTab = 'home' | 'demo' | 'audit';
