// useTutorEvents() — typed subscription to /api/tutor/events (SSE).
// Auto-reconnect with exponential backoff. In mock mode it binds to the
// in-memory event emitter instead of opening a real EventSource.

import { useEffect, useRef } from 'react'
import type { TutorEventMap, TutorEventType } from './types'
import { mockEvents } from './mock'

const MOCK_ENABLED = import.meta.env.VITE_MOCK === '1'
const SSE_URL = '/api/tutor/events'
const BACKOFF_START_MS = 500
const BACKOFF_MAX_MS = 10_000

export type TutorEventHandlers = {
  [K in TutorEventType]?: (data: TutorEventMap[K]) => void
}

function dispatch(
  handlers: TutorEventHandlers,
  type: TutorEventType,
  raw: string,
): void {
  let data: unknown
  try {
    data = raw ? JSON.parse(raw) : {}
  } catch {
    return // ignore malformed payloads rather than crash the stream
  }
  // Each handler narrows its own event shape; the map keys guarantee pairing.
  const handler = handlers[type] as ((d: unknown) => void) | undefined
  handler?.(data)
}

const EVENT_TYPES: TutorEventType[] = [
  'tutor_partial',
  'tutor_message',
  'tool_activity',
  'test_result',
  'module_complete',
  'celebrate',
  'progress_changed',
  'cost_update',
]

/**
 * Subscribe to tutor SSE events. Handlers are kept in a ref so callers can pass
 * fresh closures every render without tearing down the connection.
 */
export function useTutorEvents(handlers: TutorEventHandlers): void {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (MOCK_ENABLED) {
      return mockEvents.subscribe((type, raw) =>
        dispatch(handlersRef.current, type, raw),
      )
    }

    let source: EventSource | null = null
    let backoff = BACKOFF_START_MS
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let closed = false

    const listeners: Array<[string, (e: MessageEvent) => void]> = []

    const connect = (): void => {
      source = new EventSource(SSE_URL)

      source.onopen = () => {
        backoff = BACKOFF_START_MS // reset backoff on a healthy connection
      }

      for (const type of EVENT_TYPES) {
        const listener = (e: MessageEvent) =>
          dispatch(handlersRef.current, type, e.data)
        source.addEventListener(type, listener)
        listeners.push([type, listener])
      }

      source.onerror = () => {
        source?.close()
        source = null
        if (closed) return
        reconnectTimer = setTimeout(connect, backoff)
        backoff = Math.min(backoff * 2, BACKOFF_MAX_MS)
      }
    }

    connect()

    return () => {
      closed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      source?.close()
    }
  }, [])
}
