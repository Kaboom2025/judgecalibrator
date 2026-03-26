import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LiveDemoForm } from '@/components/LiveDemoForm'

describe('LiveDemoForm', () => {
  const mockOnSubmit = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should render form fields', () => {
    render(<LiveDemoForm onSubmit={mockOnSubmit} />)

    expect(screen.getByLabelText(/judge model/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/api key/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/benchmark/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/task count/i)).toBeInTheDocument()
  })

  it('should render submit button', () => {
    render(<LiveDemoForm onSubmit={mockOnSubmit} />)

    expect(screen.getByRole('button', { name: /start audit/i })).toBeInTheDocument()
  })

  it('should submit form with correct data', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({ job_id: 'job-123', status: 'queued' }),
    })

    render(<LiveDemoForm onSubmit={mockOnSubmit} />)

    await user.type(screen.getByLabelText(/judge model/i), 'gpt-4o')
    await user.type(screen.getByLabelText(/api key/i), 'test-key-123')
    await user.selectOptions(screen.getByLabelText(/benchmark/i), 'mt_bench')

    const submitButton = screen.getByRole('button', { name: /start audit/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('job-123')
    })
  })

  it('should show rate limit error on 429', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ detail: 'Rate limit: 1 audit per hour per IP' }),
    })

    render(<LiveDemoForm onSubmit={mockOnSubmit} />)

    await user.type(screen.getByLabelText(/judge model/i), 'gpt-4o')
    await user.type(screen.getByLabelText(/api key/i), 'test-key-123')

    const submitButton = screen.getByRole('button', { name: /start audit/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/rate limit/i)).toBeInTheDocument()
    })
  })

  it('should show error message on fetch failure', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(<LiveDemoForm onSubmit={mockOnSubmit} />)

    await user.type(screen.getByLabelText(/judge model/i), 'gpt-4o')
    await user.type(screen.getByLabelText(/api key/i), 'test-key-123')

    const submitButton = screen.getByRole('button', { name: /start audit/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })

  it('should disable submit button while loading', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))

    render(<LiveDemoForm onSubmit={mockOnSubmit} />)

    await user.type(screen.getByLabelText(/judge model/i), 'gpt-4o')
    await user.type(screen.getByLabelText(/api key/i), 'test-key-123')

    const submitButton = screen.getByRole('button', { name: /start audit/i })
    await user.click(submitButton)

    expect(submitButton).toBeDisabled()
  })

  it('should have task count slider with min/max values', () => {
    render(<LiveDemoForm onSubmit={mockOnSubmit} />)

    const slider = screen.getByLabelText(/task count/i) as HTMLInputElement
    expect(slider).toHaveAttribute('min', '10')
    expect(slider).toHaveAttribute('max', '200')
  })

  it('should have benchmark options', () => {
    render(<LiveDemoForm onSubmit={mockOnSubmit} />)

    const benchmarkSelect = screen.getByLabelText(/benchmark/i) as HTMLSelectElement
    expect(benchmarkSelect.options).toHaveLength(3)
    expect(benchmarkSelect.options[0]?.value).toBe('mt_bench')
    expect(benchmarkSelect.options[1]?.value).toBe('reward_bench')
    expect(benchmarkSelect.options[2]?.value).toBe('alpaca_eval')
  })

  it('should clear error on new submission attempt', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ job_id: 'job-123', status: 'queued' }),
      })

    render(<LiveDemoForm onSubmit={mockOnSubmit} />)

    // First submission - fails
    await user.type(screen.getByLabelText(/judge model/i), 'gpt-4o')
    await user.type(screen.getByLabelText(/api key/i), 'test-key-123')
    const submitButton = screen.getByRole('button', { name: /start audit/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })

    // Second submission - succeeds
    await user.clear(screen.getByLabelText(/judge model/i))
    await user.type(screen.getByLabelText(/judge model/i), 'claude')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
    })
  })
})
