import React from 'react'
import { render, screen } from '@testing-library/react'
import { LiveAuditResults } from '@/components/LiveAuditResults'
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
        ],
      },
      error: null,
    },
    {
      probe_name: 'consistency',
      metric_name: 'Consistency SD',
      metric_value: 0.02,
      details: {},
      error: null,
    },
    {
      probe_name: 'positional_bias',
      metric_name: 'Flip Rate',
      metric_value: 0.03,
      details: {},
      error: null,
    },
    {
      probe_name: 'human_alignment',
      metric_name: 'Spearman ρ',
      metric_value: 0.85,
      details: {},
      error: null,
    },
  ],
  trust_grade: 'A',
  recommendations: ['Model is well calibrated', 'Consider using for high-stakes tasks'],
  total_tokens: 50000,
  estimated_cost_usd: 2.5,
}

describe('LiveAuditResults', () => {
  it('should render without crashing', () => {
    render(<LiveAuditResults report={mockAuditReport} />)

    expect(screen.getByText(/audit results/i)).toBeInTheDocument()
  })

  it('should display model name', () => {
    render(<LiveAuditResults report={mockAuditReport} />)

    // getByText will find the first occurrence
    const modelNames = screen.getAllByText('gpt-4o')
    expect(modelNames.length).toBeGreaterThan(0)
  })

  it('should display trust grade prominently', () => {
    render(<LiveAuditResults report={mockAuditReport} />)

    const gradeElement = screen.getByText('A')
    expect(gradeElement).toBeInTheDocument()
  })

  it('should display all recommendations', () => {
    render(<LiveAuditResults report={mockAuditReport} />)

    expect(screen.getByText('Model is well calibrated')).toBeInTheDocument()
    expect(screen.getByText('Consider using for high-stakes tasks')).toBeInTheDocument()
  })

  it('should display cost and tokens', () => {
    render(<LiveAuditResults report={mockAuditReport} />)

    expect(screen.getByText(/\$2\.50/)).toBeInTheDocument()
    expect(screen.getByText(/50,000/)).toBeInTheDocument()
  })

  it('should display benchmark', () => {
    render(<LiveAuditResults report={mockAuditReport} />)

    const benchmarks = screen.getAllByText('mt_bench')
    expect(benchmarks.length).toBeGreaterThan(0)
  })

  it('should render with grade B+', () => {
    const reportB = { ...mockAuditReport, trust_grade: 'B+' as const }

    render(<LiveAuditResults report={reportB} />)

    const gradeElement = screen.getByText('B+')
    expect(gradeElement).toBeInTheDocument()
  })

  it('should render with grade C', () => {
    const reportC = { ...mockAuditReport, trust_grade: 'C' as const }

    render(<LiveAuditResults report={reportC} />)

    const gradeElement = screen.getByText('C')
    expect(gradeElement).toBeInTheDocument()
  })

  it('should handle empty recommendations', () => {
    const reportNoRecs = { ...mockAuditReport, recommendations: [] }

    render(<LiveAuditResults report={reportNoRecs} />)

    expect(screen.getByText(/audit results/i)).toBeInTheDocument()
  })

  it('should display timestamp', () => {
    render(<LiveAuditResults report={mockAuditReport} />)

    expect(screen.getByText('2024-01-01T00:00:00Z')).toBeInTheDocument()
  })

  it('should display tasks evaluated', () => {
    render(<LiveAuditResults report={mockAuditReport} />)

    expect(screen.getByText('100')).toBeInTheDocument()
  })
})
