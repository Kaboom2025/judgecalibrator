'use client'

import { FormEvent, useState } from 'react'
import { AuditRequest } from '@/types'

interface LiveDemoFormProps {
  onSubmit: (jobId: string) => void
}

export function LiveDemoForm({ onSubmit }: LiveDemoFormProps) {
  const [judgeModel, setJudgeModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [benchmark, setBenchmark] = useState('mt_bench')
  const [taskCount, setTaskCount] = useState(50)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
      const request: AuditRequest = {
        judge_model: judgeModel,
        api_key: apiKey,
        benchmark: benchmark as 'mt_bench' | 'reward_bench' | 'alpaca_eval',
        task_count: taskCount,
      }

      const response = await fetch(`${apiUrl}/api/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (response.status === 429) {
        setError('Rate limit: 1 audit per hour per IP')
        return
      }

      if (!response.ok) {
        const data = await response.json()
        setError(data.detail || `Error: ${response.statusText}`)
        return
      }

      const data = await response.json()
      onSubmit(data.job_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Run a Live Audit</h2>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="judge-model" className="block text-sm font-medium text-slate-900 mb-2">
            Judge Model
          </label>
          <input
            id="judge-model"
            type="text"
            value={judgeModel}
            onChange={e => setJudgeModel(e.target.value)}
            placeholder="e.g., gpt-4o, claude-sonnet-4-5"
            required
            disabled={loading}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label htmlFor="api-key" className="block text-sm font-medium text-slate-900 mb-2">
            API Key
          </label>
          <input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="Your API key (not stored)"
            required
            disabled={loading}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-slate-500 mt-1">Your API key is never stored or logged.</p>
        </div>

        <div>
          <label htmlFor="benchmark" className="block text-sm font-medium text-slate-900 mb-2">
            Benchmark
          </label>
          <select
            id="benchmark"
            value={benchmark}
            onChange={e => setBenchmark(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option value="mt_bench">MT Bench</option>
            <option value="reward_bench">Reward Bench</option>
            <option value="alpaca_eval">Alpaca Eval</option>
          </select>
        </div>

        <div>
          <label htmlFor="task-count" className="block text-sm font-medium text-slate-900 mb-2">
            Task Count: {taskCount}
          </label>
          <input
            id="task-count"
            type="range"
            min="10"
            max="200"
            value={taskCount}
            onChange={e => setTaskCount(parseInt(e.target.value))}
            disabled={loading}
            className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-slate-500 mt-1">More tasks = more accurate but slower and more expensive.</p>
        </div>

        <button
          type="submit"
          disabled={loading || !judgeModel || !apiKey}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {loading ? 'Submitting...' : 'Start Audit'}
        </button>
      </form>
    </div>
  )
}
