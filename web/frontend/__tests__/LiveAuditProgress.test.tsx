import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { LiveAuditProgress } from '@/components/LiveAuditProgress'

const mockAuditReport = {
  judge: 'gpt-4o',
  benchmark: 'mt_bench',
  tasks_evaluated: 100,
  timestamp: '2024-01-01T00:00:00Z',
  probes: [],
  trust_grade: 'A' as const,
  recommendations: [],
  total_tokens: 50000,
  estimated_cost_usd: 2.5,
}

describe('LiveAuditProgress', () => {
  const mockOnComplete = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render progress component', () => {
    render(<LiveAuditProgress jobId="job-123" onComplete={mockOnComplete} />)

    expect(screen.getByText(/audit in progress/i)).toBeInTheDocument()
  })

  it('should display job ID', () => {
    render(<LiveAuditProgress jobId="job-123" onComplete={mockOnComplete} />)

    expect(screen.getByText(/job-123/i)).toBeInTheDocument()
  })

  it('should show progress bar', () => {
    render(<LiveAuditProgress jobId="job-123" onComplete={mockOnComplete} />)

    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toBeInTheDocument()
  })

  it('should display current probe name when available', async () => {
    let eventListeners: Record<string, Function[]> = {}

    global.EventSource = jest.fn((url: string) => {
      return {
        addEventListener: jest.fn((event: string, handler: Function) => {
          if (!eventListeners[event]) {
            eventListeners[event] = []
          }
          eventListeners[event].push(handler)
        }),
        removeEventListener: jest.fn(),
        close: jest.fn(),
      }
    }) as any

    render(<LiveAuditProgress jobId="job-123" onComplete={mockOnComplete} />)

    await act(async () => {
      if (eventListeners['message'] && eventListeners['message'].length > 0) {
        eventListeners['message'][0]({
          data: JSON.stringify({ probe: 'calibration', percent: 50 }),
        })
      }
    })

    await waitFor(() => {
      expect(screen.getByText(/calibration/i)).toBeInTheDocument()
    })
  })

  it('should call onComplete when audit completes', async () => {
    let eventListeners: Record<string, Function[]> = {}

    global.EventSource = jest.fn((url: string) => {
      return {
        addEventListener: jest.fn((event: string, handler: Function) => {
          if (!eventListeners[event]) {
            eventListeners[event] = []
          }
          eventListeners[event].push(handler)
        }),
        removeEventListener: jest.fn(),
        close: jest.fn(),
      }
    }) as any

    render(<LiveAuditProgress jobId="job-123" onComplete={mockOnComplete} />)

    await act(async () => {
      if (eventListeners['complete'] && eventListeners['complete'].length > 0) {
        eventListeners['complete'][0]({
          data: JSON.stringify({ status: 'completed', result: mockAuditReport }),
        })
      }
    })

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith(mockAuditReport)
    })
  })

  it('should handle error in audit', async () => {
    let eventListeners: Record<string, Function[]> = {}

    global.EventSource = jest.fn((url: string) => {
      return {
        addEventListener: jest.fn((event: string, handler: Function) => {
          if (!eventListeners[event]) {
            eventListeners[event] = []
          }
          eventListeners[event].push(handler)
        }),
        removeEventListener: jest.fn(),
        close: jest.fn(),
      }
    }) as any

    render(<LiveAuditProgress jobId="job-123" onComplete={mockOnComplete} />)

    await act(async () => {
      if (eventListeners['complete'] && eventListeners['complete'].length > 0) {
        eventListeners['complete'][0]({
          data: JSON.stringify({ status: 'failed', error: 'Test error' }),
        })
      }
    })

    await waitFor(() => {
      expect(screen.getByText(/test error/i)).toBeInTheDocument()
    })
  })

  it('should show progress percentage', async () => {
    let eventListeners: Record<string, Function[]> = {}

    global.EventSource = jest.fn((url: string) => {
      return {
        addEventListener: jest.fn((event: string, handler: Function) => {
          if (!eventListeners[event]) {
            eventListeners[event] = []
          }
          eventListeners[event].push(handler)
        }),
        removeEventListener: jest.fn(),
        close: jest.fn(),
      }
    }) as any

    render(<LiveAuditProgress jobId="job-123" onComplete={mockOnComplete} />)

    await act(async () => {
      if (eventListeners['message'] && eventListeners['message'].length > 0) {
        eventListeners['message'][0]({
          data: JSON.stringify({ percent: 75 }),
        })
      }
    })

    await waitFor(() => {
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '75')
    })
  })
})
