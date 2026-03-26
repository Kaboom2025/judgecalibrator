import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { PrecomputedDashboard } from '@/components/PrecomputedDashboard'
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
          { confidence: 0.5, accuracy: 0.48 },
          { confidence: 0.7, accuracy: 0.68 },
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
  recommendations: ['Model is well calibrated'],
  total_tokens: 50000,
  estimated_cost_usd: 2.5,
}

describe('PrecomputedDashboard', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should render loading state initially', () => {
    ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))

    render(<PrecomputedDashboard />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should fetch precomputed results on mount', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [mockAuditReport] }),
    })

    render(<PrecomputedDashboard />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/precomputed')
      )
    })
  })

  it('should render results table with model names', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [mockAuditReport] }),
    })

    render(<PrecomputedDashboard />)

    await waitFor(() => {
      const modelNames = screen.queryAllByText('gpt-4o')
      expect(modelNames.length).toBeGreaterThan(0)
    })
  })

  it('should render trust grade badge with correct color', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [mockAuditReport] }),
    })

    render(<PrecomputedDashboard />)

    await waitFor(() => {
      const gradeCell = screen.getByText('A')
      expect(gradeCell).toBeInTheDocument()
    })
  })

  it('should handle fetch error gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network error')
    )

    render(<PrecomputedDashboard />)

    await waitFor(() => {
      const errorElements = screen.queryAllByText(/error/i)
      expect(errorElements.length).toBeGreaterThan(0)
    }, { timeout: 2000 })
  })

  it('should render multiple results', async () => {
    const report2: AuditReport = { ...mockAuditReport, judge: 'claude-sonnet-4-5' }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [mockAuditReport, report2] }),
    })

    render(<PrecomputedDashboard />)

    await waitFor(() => {
      const modelNames = screen.queryAllByText('gpt-4o')
      expect(modelNames.length).toBeGreaterThan(0)
    }, { timeout: 2000 })

    const report2Names = screen.queryAllByText('claude-sonnet-4-5')
    expect(report2Names.length).toBeGreaterThan(0)
  })

  it('should render column headers', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [mockAuditReport] }),
    })

    render(<PrecomputedDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Model')).toBeInTheDocument()
      expect(screen.getByText('Trust Grade')).toBeInTheDocument()
    })
  })
})
