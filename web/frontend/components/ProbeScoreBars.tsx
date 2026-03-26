'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { AuditReport } from '@/types'

interface ProbeScoreBarsProps {
  report: AuditReport
}

interface BarData {
  name: string
  value: number
  description: string
  isHigherBetter: boolean
}

export function ProbeScoreBars({ report }: ProbeScoreBarsProps) {
  // Extract metric values
  const metricsMap: Record<string, { value: number; description: string; isHigherBetter: boolean }> = {}

  for (const probe of report.probes) {
    if (probe.probe_name === 'calibration') {
      metricsMap['ECE (lower is better)'] = {
        value: probe.metric_value,
        description: probe.metric_name,
        isHigherBetter: false,
      }
    } else if (probe.probe_name === 'consistency') {
      metricsMap['Consistency SD (lower is better)'] = {
        value: probe.metric_value,
        description: probe.metric_name,
        isHigherBetter: false,
      }
    } else if (probe.probe_name === 'positional_bias') {
      metricsMap['Flip Rate (lower is better)'] = {
        value: probe.metric_value,
        description: probe.metric_name,
        isHigherBetter: false,
      }
    } else if (probe.probe_name === 'human_alignment') {
      metricsMap['Spearman ρ (higher is better)'] = {
        value: probe.metric_value,
        description: probe.metric_name,
        isHigherBetter: true,
      }
    }
  }

  const chartData = Object.entries(metricsMap).map(([name, data]) => ({
    name,
    value: data.value,
    description: data.description,
    isHigherBetter: data.isHigherBetter,
  }))

  const getBarColor = (metric: BarData) => {
    const value = metric.value

    // Color thresholds based on metric type
    if (metric.isHigherBetter) {
      // Higher is better (Spearman ρ)
      if (value >= 0.8) return '#22c55e' // green
      if (value >= 0.6) return '#eab308' // yellow
      return '#ef4444' // red
    } else {
      // Lower is better (ECE, SD, Flip Rate)
      if (value <= 0.1) return '#22c55e' // green
      if (value <= 0.2) return '#eab308' // yellow
      return '#ef4444' // red
    }
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-xl font-semibold text-slate-900 mb-6">Performance Metrics</h3>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={190} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: unknown) => {
                if (typeof value === 'number') {
                  return value.toFixed(4)
                }
                return String(value)
              }}
              contentStyle={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' }}
            />
            <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-80 flex items-center justify-center bg-slate-50 rounded">
          <p className="text-slate-500 text-sm">No probe data available</p>
        </div>
      )}
    </div>
  )
}
