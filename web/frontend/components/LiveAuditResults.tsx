'use client'

import { AuditReport } from '@/types'
import { ReliabilityDiagram } from './ReliabilityDiagram'
import { ProbeScoreBars } from './ProbeScoreBars'

interface LiveAuditResultsProps {
  report: AuditReport
}

export function LiveAuditResults({ report }: LiveAuditResultsProps) {
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

  return (
    <div className="space-y-12">
      <div className="bg-white rounded-lg border border-slate-200 p-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-8">Audit Results</h2>

        {/* Summary Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Left: Model Info & Grade */}
          <div>
            <div className="mb-6">
              <p className="text-sm text-slate-500 mb-2">Model</p>
              <h3 className="text-2xl font-bold text-slate-900">{report.judge}</h3>
            </div>

            <div className="mb-6">
              <p className="text-sm text-slate-500 mb-2">Benchmark</p>
              <p className="text-lg font-semibold text-slate-900">{report.benchmark}</p>
            </div>

            <div className="mb-6">
              <p className="text-sm text-slate-500 mb-2">Tasks Evaluated</p>
              <p className="text-lg font-semibold text-slate-900">{report.tasks_evaluated}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500 mb-2">Evaluated At</p>
              <p className="text-sm font-mono text-slate-600">{report.timestamp}</p>
            </div>
          </div>

          {/* Right: Grade & Cost */}
          <div>
            <div className="mb-6">
              <p className="text-sm text-slate-500 mb-2">Trust Grade</p>
              <div>
                <span className={`inline-block px-6 py-3 rounded-lg font-bold text-3xl ${getGradeColor(report.trust_grade)}`}>
                  {report.trust_grade}
                </span>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-slate-500 mb-2">Estimated Cost</p>
              <p className="text-2xl font-bold text-slate-900">${report.estimated_cost_usd.toFixed(2)}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500 mb-2">Total Tokens</p>
              <p className="text-lg font-semibold text-slate-900">{report.total_tokens.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {report.recommendations.length > 0 && (
          <div className="border-t border-slate-200 pt-8">
            <h4 className="text-lg font-semibold text-slate-900 mb-4">Recommendations</h4>
            <ul className="space-y-2">
              {report.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="inline-block w-6 h-6 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-semibold text-sm mr-3 mt-0.5">
                    •
                  </span>
                  <span className="text-slate-700">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Metrics Section */}
      <ProbeScoreBars report={report} />

      {/* Calibration Diagram */}
      <div>
        <h3 className="text-2xl font-bold text-slate-900 mb-6">Calibration Analysis</h3>
        <ReliabilityDiagram report={report} />
      </div>
    </div>
  )
}
