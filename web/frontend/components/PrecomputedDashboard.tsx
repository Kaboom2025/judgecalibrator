'use client'

import { useEffect, useState } from 'react'
import { AuditReport } from '@/types'
import { ReliabilityDiagram } from './ReliabilityDiagram'

interface PrecomputedDashboardProps {}

export function PrecomputedDashboard({}: PrecomputedDashboardProps) {
  const [results, setResults] = useState<AuditReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPrecomputed = async () => {
      try {
        setLoading(true)
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
        const response = await fetch(`${apiUrl}/api/precomputed`)

        if (!response.ok) {
          throw new Error(`Failed to fetch precomputed results: ${response.statusText}`)
        }

        const data = await response.json()
        setResults(data.results || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    fetchPrecomputed()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading precomputed results...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-900">Error</h3>
          <p className="text-red-700 mt-2">{error}</p>
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
          <p className="text-slate-600">No precomputed results available</p>
        </div>
      </div>
    )
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'bg-green-100 text-green-900'
      case 'B+':
        return 'bg-blue-100 text-blue-900'
      case 'B':
        return 'bg-yellow-100 text-yellow-900'
      case 'C':
        return 'bg-red-100 text-red-900'
      default:
        return 'bg-slate-100 text-slate-900'
    }
  }

  const getMetricValue = (report: AuditReport, probeName: string, metricName: string) => {
    const probe = report.probes.find(p => p.probe_name === probeName)
    if (probe && probe.metric_name === metricName) {
      return probe.metric_value.toFixed(4)
    }
    return 'N/A'
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <h2 className="text-3xl font-bold text-slate-900 mb-8">Precomputed Results</h2>

      {/* Results Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 mb-12">
        <table className="w-full">
          <thead className="bg-slate-100 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Model</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Trust Grade</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">ECE</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Flip Rate</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Consistency SD</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Spearman ρ</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Tasks</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Cost (USD)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {results.map((report, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{report.judge}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`inline-block px-3 py-1 rounded-full font-semibold text-xs ${getGradeColor(report.trust_grade)}`}>
                    {report.trust_grade}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {getMetricValue(report, 'calibration', 'ECE')}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {getMetricValue(report, 'positional_bias', 'Flip Rate')}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {getMetricValue(report, 'consistency', 'Consistency SD')}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {getMetricValue(report, 'human_alignment', 'Spearman ρ')}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{report.tasks_evaluated}</td>
                <td className="px-6 py-4 text-sm text-slate-600">${report.estimated_cost_usd.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reliability Diagrams */}
      <h3 className="text-2xl font-bold text-slate-900 mb-6">Calibration Curves</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((report, idx) => (
          <ReliabilityDiagram key={idx} report={report} />
        ))}
      </div>
    </div>
  )
}
