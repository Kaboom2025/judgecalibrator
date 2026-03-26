export interface ProbeResult {
  probe_name: string
  metric_name: string
  metric_value: number
  details: Record<string, any>
  error: string | null
}

export interface AuditReport {
  judge: string
  benchmark: string
  tasks_evaluated: number
  timestamp: string
  probes: ProbeResult[]
  trust_grade: 'A' | 'B+' | 'B' | 'C' | 'UNKNOWN'
  recommendations: string[]
  total_tokens: number
  estimated_cost_usd: number
}

export interface AuditRequest {
  judge_model: string
  api_key: string
  benchmark: string
  task_count: number
  probes?: string[]
}

export interface AuditJobResponse {
  job_id: string
  status: string
}

export interface AuditReportResponse {
  status: string
  progress: number
  current_probe: string | null
  result?: AuditReport | null
  error?: string | null
}

export interface SSEEvent {
  probe?: string
  percent?: number
  status?: string
  result?: AuditReport | null
  error?: string | null
}
