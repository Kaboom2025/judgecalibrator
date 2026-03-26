'use client'

import { useState } from 'react'
import { LiveDemoForm } from '@/components/LiveDemoForm'
import { LiveAuditProgress } from '@/components/LiveAuditProgress'
import { LiveAuditResults } from '@/components/LiveAuditResults'
import { AuditReport } from '@/types'

export default function AuditPage() {
  const [jobId, setJobId] = useState<string | null>(null)
  const [result, setResult] = useState<AuditReport | null>(null)

  const handleAuditSubmit = (id: string) => {
    setJobId(id)
    setResult(null)
  }

  const handleAuditComplete = (report: AuditReport) => {
    setResult(report)
  }

  const handleReset = () => {
    setJobId(null)
    setResult(null)
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {!jobId ? (
        <LiveDemoForm onSubmit={handleAuditSubmit} />
      ) : !result ? (
        <LiveAuditProgress jobId={jobId} onComplete={handleAuditComplete} />
      ) : (
        <>
          <LiveAuditResults report={result} />
          <div className="mt-12 text-center">
            <button
              onClick={handleReset}
              className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Run Another Audit
            </button>
          </div>
        </>
      )}
    </div>
  )
}
