import React from 'react'
import { render, screen } from '@testing-library/react'
import { ReliabilityDiagram } from '@/components/ReliabilityDiagram'
import { AuditReport } from '@/types'

const mockAuditReport: AuditReport = {
  judge: 'gpt-4o',
  benchmark: 'mt_bench',
  tasks_evaluated: 100,
  timestamp: '2024-01-01T00:00:00Z',
  probes: [
    {
      probe_name: 'calibration',
      metric_name: 'ECE',
      metric_value: 0.05,
      details: {
        bins: [
          { confidence: 50, accuracy: 48 },
          { confidence: 70, accuracy: 68 },
          { confidence: 90, accuracy: 92 },
        ],
      },
      error: null,
    },
  ],
  trust_grade: 'A',
  recommendations: [],
  total_tokens: 50000,
  estimated_cost_usd: 2.5,
}

describe('ReliabilityDiagram', () => {
  it('should render without crashing', () => {
    render(<ReliabilityDiagram report={mockAuditReport} />)

    expect(screen.getByText('gpt-4o')).toBeInTheDocument()
  })

  it('should display model name', () => {
    render(<ReliabilityDiagram report={mockAuditReport} />)

    expect(screen.getByText('gpt-4o')).toBeInTheDocument()
  })

  it('should display benchmark name', () => {
    render(<ReliabilityDiagram report={mockAuditReport} />)

    expect(screen.getByText('mt_bench')).toBeInTheDocument()
  })

  it('should render with empty bins', () => {
    const reportNoBins: AuditReport = {
      ...mockAuditReport,
      probes: [
        {
          ...mockAuditReport.probes[0],
          details: { bins: [] },
        },
      ],
    }

    render(<ReliabilityDiagram report={reportNoBins} />)

    expect(screen.getByText('gpt-4o')).toBeInTheDocument()
  })

  it('should render with missing calibration probe', () => {
    const reportNoCalibration: AuditReport = {
      ...mockAuditReport,
      probes: [],
    }

    render(<ReliabilityDiagram report={reportNoCalibration} />)

    expect(screen.getByText('gpt-4o')).toBeInTheDocument()
  })

  it('should handle report without details', () => {
    const reportNoDetails: AuditReport = {
      ...mockAuditReport,
      probes: [
        {
          ...mockAuditReport.probes[0],
          details: {},
        },
      ],
    }

    render(<ReliabilityDiagram report={reportNoDetails} />)

    expect(screen.getByText('gpt-4o')).toBeInTheDocument()
  })
})
