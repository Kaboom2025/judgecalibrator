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
