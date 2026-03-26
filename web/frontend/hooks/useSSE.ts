'use client'

import { useEffect, useState } from 'react'
import { SSEEvent } from '@/types'

interface UseSSEResult {
  data: SSEEvent | null
  error: Error | null
  connected: boolean
}

export function useSSE(url: string | null): UseSSEResult {
  const [data, setData] = useState<SSEEvent | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!url) {
      return
    }

    try {
      const eventSource = new EventSource(url)
      setConnected(true)

      const handleMessage = (event: MessageEvent) => {
        try {
          const parsedData = JSON.parse(event.data)
          setData(parsedData)
          setError(null)
        } catch (e) {
          setError(new Error(`Failed to parse SSE message: ${e instanceof Error ? e.message : 'Unknown error'}`))
        }
      }

      const handleComplete = (event: MessageEvent) => {
        try {
          const parsedData = JSON.parse(event.data)
          setData(parsedData)
          setError(null)
          eventSource.close()
          setConnected(false)
        } catch (e) {
          setError(new Error(`Failed to parse complete event: ${e instanceof Error ? e.message : 'Unknown error'}`))
        }
      }

      const handleError = () => {
        setError(new Error('SSE connection error'))
        setConnected(false)
        eventSource.close()
      }

      eventSource.addEventListener('message', handleMessage)
      eventSource.addEventListener('complete', handleComplete)
      eventSource.addEventListener('error', handleError)

      return () => {
        eventSource.removeEventListener('message', handleMessage)
        eventSource.removeEventListener('complete', handleComplete)
        eventSource.removeEventListener('error', handleError)
        eventSource.close()
      }
    } catch (e) {
      setError(new Error(`Failed to create SSE connection: ${e instanceof Error ? e.message : 'Unknown error'}`))
    }
  }, [url])

  return { data, error, connected }
}
