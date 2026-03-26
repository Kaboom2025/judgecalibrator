'use client'

import { useState, useEffect } from 'react'
import { useSSE } from '@/hooks/useSSE'
import { AuditReport } from '@/types'

interface LiveAuditProgressProps {
  jobId: string
  onComplete: (report: AuditReport) => void
}

export function LiveAuditProgress({ jobId, onComplete }: LiveAuditProgressProps) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
  const { data, error } = useSSE(`${apiUrl}/api/audit/${jobId}/stream`)
  const [progress, setProgress] = useState(0)
  const [currentProbe, setCurrentProbe] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)
  const [auditError, setAuditError] = useState<string | null>(null)

  // Update progress from SSE data
  useEffect(() => {
    if (!data) return

    if (data.percent !== undefined && data.percent !== progress) {
      setProgress(data.percent)
    }

    if (data.probe && data.probe !== currentProbe) {
      setCurrentProbe(data.probe)
    }

    if (data.status === 'completed' && data.result) {
      setCompleted(true)
      onComplete(data.result)
    }

    if (data.status === 'failed' && data.error) {
      setCompleted(true)
      setAuditError(data.error)
    }
  }, [data, progress, currentProbe, onComplete])

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Audit in Progress</h2>

      <div className="mb-6">
        <p className="text-sm text-slate-600 mb-2">
          Job ID: <span className="font-mono text-slate-900">{jobId}</span>
        </p>
      </div>

      {auditError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700 font-semibold">Audit Failed</p>
          <p className="text-red-600 mt-2">{auditError}</p>
        </div>
      ) : completed ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-700 font-semibold">Audit Complete!</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-slate-900">Progress</p>
              <p className="text-sm font-semibold text-slate-900">{progress}%</p>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              ></div>
            </div>
          </div>

          {currentProbe && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-700">
                <span className="font-semibold">Current probe:</span> {currentProbe}
              </p>
            </div>
          )}

          {error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-700 text-sm">
                {error.message}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
