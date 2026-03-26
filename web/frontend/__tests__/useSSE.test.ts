import { renderHook, waitFor } from '@testing-library/react'
import { useSSE } from '@/hooks/useSSE'

describe('useSSE', () => {
  let mockEventSource: any
  let eventListeners: Record<string, Function[]> = {}

  beforeAll(() => {
    global.EventSource = jest.fn((url: string) => {
      mockEventSource = {
        addEventListener: jest.fn((event: string, handler: Function) => {
          if (!eventListeners[event]) {
            eventListeners[event] = []
          }
          eventListeners[event].push(handler)
        }),
        removeEventListener: jest.fn((event: string, handler: Function) => {
          if (eventListeners[event]) {
            eventListeners[event] = eventListeners[event].filter(h => h !== handler)
          }
        }),
        close: jest.fn(),
      }
      return mockEventSource
    }) as any
  })

  beforeEach(() => {
    eventListeners = {}
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with null data and not connected', () => {
    const { result } = renderHook(() => useSSE(null))

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.connected).toBe(false)
  })

  it('should not create EventSource when url is null', () => {
    renderHook(() => useSSE(null))

    expect(global.EventSource).not.toHaveBeenCalled()
  })

  it('should create EventSource when url is provided', () => {
    renderHook(() => useSSE('http://localhost:8000/stream'))

    expect(global.EventSource).toHaveBeenCalledWith('http://localhost:8000/stream')
  })

  it('should parse and update data on message event', async () => {
    const { result } = renderHook(() => useSSE('http://localhost:8000/stream'))

    const testData = { probe: 'calibration', percent: 50 }

    // Simulate message event
    if (eventListeners['message'] && eventListeners['message'].length > 0) {
      eventListeners['message'][0]({
        data: JSON.stringify(testData),
      })
    }

    await waitFor(() => {
      expect(result.current.data).toEqual(testData)
    })
  })

  it('should handle malformed JSON gracefully', async () => {
    const { result } = renderHook(() => useSSE('http://localhost:8000/stream'))

    if (eventListeners['message'] && eventListeners['message'].length > 0) {
      eventListeners['message'][0]({
        data: 'invalid json',
      })
    }

    await waitFor(() => {
      expect(result.current.error).toBeDefined()
    })
  })

  it('should handle error events', async () => {
    const { result } = renderHook(() => useSSE('http://localhost:8000/stream'))

    if (eventListeners['error'] && eventListeners['error'].length > 0) {
      eventListeners['error'][0](new Error('Connection failed'))
    }

    await waitFor(() => {
      expect(result.current.error).toBeDefined()
      expect(result.current.connected).toBe(false)
    })
  })

  it('should close connection on unmount', () => {
    const { unmount } = renderHook(() => useSSE('http://localhost:8000/stream'))

    unmount()

    expect(mockEventSource.close).toHaveBeenCalled()
  })

  it('should handle complete event', async () => {
    const { result } = renderHook(() => useSSE('http://localhost:8000/stream'))

    const completeData = {
      status: 'completed',
      result: { judge: 'gpt-4', trust_grade: 'A' },
    }

    if (eventListeners['complete'] && eventListeners['complete'].length > 0) {
      eventListeners['complete'][0]({
        data: JSON.stringify(completeData),
      })
    }

    await waitFor(() => {
      expect(result.current.data).toEqual(completeData)
    })
  })
})
