// Single source of tutor SSE state for the whole app. One useTutorEvents()
// subscription lives here (so real mode opens exactly one EventSource); pages
// and panels read the derived state and register lightweight callbacks.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { useTutorEvents } from './sse'
import type {
  CelebrateReason,
  HintEvent,
  TestResultEvent,
} from './types'

export interface ChatMessage {
  role: 'tutor'
  text: string
}

interface TutorContextValue {
  messages: ChatMessage[]
  streaming: string // in-flight partial accumulation
  hints: HintEvent[]
  costUsd: number | null
  celebrate: CelebrateReason | null
  clearCelebrate: () => void
  /** Subscribe to test_result events (Lesson uses this to drive the rep panel). */
  onTestResult: (fn: (e: TestResultEvent) => void) => () => void
  /** Subscribe to progress_changed (Dashboard refetches). */
  onProgressChanged: (fn: () => void) => () => void
}

const TutorContext = createContext<TutorContextValue | null>(null)

export function TutorProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState('')
  const [hints, setHints] = useState<HintEvent[]>([])
  const [costUsd, setCostUsd] = useState<number | null>(null)
  const [celebrate, setCelebrate] = useState<CelebrateReason | null>(null)

  const testResultSubs = useRef(new Set<(e: TestResultEvent) => void>())
  const progressSubs = useRef(new Set<() => void>())

  const onTestResult = useCallback(
    (fn: (e: TestResultEvent) => void) => {
      testResultSubs.current.add(fn)
      return () => {
        testResultSubs.current.delete(fn)
      }
    },
    [],
  )

  const onProgressChanged = useCallback((fn: () => void) => {
    progressSubs.current.add(fn)
    return () => {
      progressSubs.current.delete(fn)
    }
  }, [])

  useTutorEvents({
    tutor_partial: (e) => setStreaming((s) => s + e.text),
    tutor_message: (e) => {
      setMessages((m) => [...m, { role: 'tutor', text: e.text }])
      setStreaming('')
    },
    hint: (e) => setHints((h) => [...h, e]),
    cost_update: (e) => setCostUsd(e.totalCostUsd),
    celebrate: (e) => setCelebrate(e.reason),
    test_result: (e) => {
      for (const fn of testResultSubs.current) fn(e)
    },
    progress_changed: () => {
      for (const fn of progressSubs.current) fn()
    },
  })

  const clearCelebrate = useCallback(() => setCelebrate(null), [])

  const value = useMemo<TutorContextValue>(
    () => ({
      messages,
      streaming,
      hints,
      costUsd,
      celebrate,
      clearCelebrate,
      onTestResult,
      onProgressChanged,
    }),
    [
      messages,
      streaming,
      hints,
      costUsd,
      celebrate,
      clearCelebrate,
      onTestResult,
      onProgressChanged,
    ],
  )

  return <TutorContext value={value}>{children}</TutorContext>
}

export function useTutor(): TutorContextValue {
  const ctx = useContext(TutorContext)
  if (!ctx) throw new Error('useTutor must be used within a TutorProvider')
  return ctx
}
