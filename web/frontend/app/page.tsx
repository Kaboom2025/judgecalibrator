'use client'

import Link from 'next/link'
import { PrecomputedDashboard } from '@/components/PrecomputedDashboard'

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h1 className="text-5xl font-bold mb-6">JudgeCalibrator</h1>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl">
            Audit the reliability and calibration of your LLM judges. Understand how well your judge aligns with human preferences and identify biases.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/audit"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-center"
            >
              Run a Live Audit
            </Link>
            <a
              href="https://github.com/anthropics/judge-calibrator"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-center"
            >
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-slate-900 mb-8">Why JudgeCalibrator?</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Calibration Analysis</h3>
            <p className="text-slate-600">
              Measure how well your judge's confidence aligns with actual accuracy across different tasks.
            </p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Bias Detection</h3>
            <p className="text-slate-600">
              Identify positional bias, verbosity bias, and other systematic issues affecting judge decisions.
            </p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="text-3xl mb-4">📈</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Trust Grading</h3>
            <p className="text-slate-600">
              Get a clear A-F grade showing how reliable your judge is for your use case.
            </p>
          </div>
        </div>
      </section>

      {/* Precomputed Results Section */}
      <section className="bg-slate-50 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-900 mb-8">Precomputed Benchmarks</h2>
          <p className="text-slate-600 mb-8">
            See how major LLM judges perform on standard benchmarks. These results are pre-computed with consistent settings for easy comparison.
          </p>
          <PrecomputedDashboard />
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-slate-900 mb-8">How It Works</h2>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-600 text-white font-bold">
                1
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Submit Your Judge</h3>
              <p className="text-slate-600 mt-2">
                Provide your LLM judge model and API key. JudgeCalibrator will send evaluation tasks to it.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-600 text-white font-bold">
                2
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Run Audit Probes</h3>
              <p className="text-slate-600 mt-2">
                Multiple test suites probe for calibration, consistency, biases, and human alignment in parallel.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-600 text-white font-bold">
                3
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Get Trust Grade</h3>
              <p className="text-slate-600 mt-2">
                Receive a comprehensive report with calibration curves, bias metrics, and actionable recommendations.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
