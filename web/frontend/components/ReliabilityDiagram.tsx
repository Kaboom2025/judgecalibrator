'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { AuditReport } from '@/types'

interface ReliabilityDiagramProps {
  report: AuditReport
}

interface BinData {
  confidence: number
  accuracy: number
}

export function ReliabilityDiagram({ report }: ReliabilityDiagramProps) {
  // Extract calibration probe data
  const calibrationProbe = report.probes.find(p => p.probe_name === 'calibration')
  const bins = (calibrationProbe?.details?.bins as BinData[]) || []

  // Prepare chart data: both the actual model curve and the perfect calibration line
  const chartData = bins.map(bin => ({
    confidence: bin.confidence,
    accuracy: bin.accuracy,
    perfect: bin.confidence, // Perfect calibration line (confidence === accuracy)
  }))

  // Add corner points for perfect calibration line
  if (chartData.length > 0) {
    chartData.unshift({ confidence: 0, accuracy: 0, perfect: 0 })
    chartData.push({ confidence: 100, accuracy: 100, perfect: 100 })
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-slate-900">{report.judge}</h4>
        <p className="text-sm text-slate-500">{report.benchmark}</p>
      </div>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="confidence"
              label={{ value: 'Mean Confidence (%)', position: 'insideBottom', offset: -5 }}
              type="number"
              domain={[0, 100]}
            />
            <YAxis
              label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft' }}
              domain={[0, 100]}
            />
            <Tooltip
              formatter={(value: unknown) => {
                if (typeof value === 'number') {
                  return value.toFixed(2)
                }
                return String(value)
              }}
              labelFormatter={(label: unknown) => {
                if (typeof label === 'number') {
                  return `Confidence: ${label.toFixed(2)}%`
                }
                return String(label)
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="perfect"
              stroke="#94a3b8"
              name="Perfect Calibration"
              strokeDasharray="5 5"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="accuracy"
              stroke="#3b82f6"
              name="Model"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-80 flex items-center justify-center bg-slate-50 rounded">
          <p className="text-slate-500 text-sm">No calibration data available</p>
        </div>
      )}
    </div>
  )
}
