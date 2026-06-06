// Single source of tutor SSE state for the whole app. One useTutorEvents()
// subscription lives here (so real mode opens exactly one EventSource); the
// Session page renders the transcript, the Dashboard refetches progress.

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
import type { CelebrateReason } from './types'

// A single entry in the conversation transcript.
export type Turn =
  | { kind: 'tutor'; text: string }
  | { kind: 'learner'; text: string }
  | { kind: 'activity'; text: string }

interface TutorContextValue {
  transcript: Turn[]
  streaming: string // in-flight partial accumulation for the current tutor turn
  costUsd: number | null
  celebrate: CelebrateReason | null
  clearCelebrate: () => void
  /** Append a learner turn locally (echoed immediately on send). */
  addLearnerTurn: (text: string) => void
  /** Clear the transcript when starting/leaving a session. */
  resetTranscript: () => void
  /** Subscribe to progress_changed (Dashboard refetches). */
  onProgressChanged: (fn: () => void) => () => void
  /** Subscribe to module_complete (Session navigates home after celebration). */
  onModuleComplete: (fn: (slug: string) => void) => () => void
}

const TutorContext = createContext<TutorContextValue | null>(null)

export function TutorProvider({ children }: { children: ReactNode }) {
  const [transcript, setTranscript] = useState<Turn[]>([])
  const [streaming, setStreaming] = useState('')
  const [costUsd, setCostUsd] = useState<number | null>(null)
  const [celebrate, setCelebrate] = useState<CelebrateReason | null>(null)

  const progressSubs = useRef(new Set<() => void>())
  const completeSubs = useRef(new Set<(slug: string) => void>())

  const onProgressChanged = useCallback((fn: () => void) => {
    progressSubs.current.add(fn)
    return () => {
      progressSubs.current.delete(fn)
    }
  }, [])

  const onModuleComplete = useCallback((fn: (slug: string) => void) => {
    completeSubs.current.add(fn)
    return () => {
      completeSubs.current.delete(fn)
    }
  }, [])

  useTutorEvents({
    tutor_partial: (e) => setStreaming((s) => s + e.text),
    tutor_message: (e) => {
      setTranscript((t) => [...t, { kind: 'tutor', text: e.text }])
      setStreaming('')
    },
    tool_activity: (e) =>
      setTranscript((t) => [...t, { kind: 'activity', text: e.text }]),
    cost_update: (e) => setCostUsd(e.totalCostUsd),
    celebrate: (e) => setCelebrate(e.reason),
    module_complete: (e) => {
      for (const fn of completeSubs.current) fn(e.slug)
    },
    progress_changed: () => {
      for (const fn of progressSubs.current) fn()
    },
  })

  const clearCelebrate = useCallback(() => setCelebrate(null), [])

  const addLearnerTurn = useCallback((text: string) => {
    setTranscript((t) => [...t, { kind: 'learner', text }])
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript([])
    setStreaming('')
  }, [])

  const value = useMemo<TutorContextValue>(
    () => ({
      transcript,
      streaming,
      costUsd,
      celebrate,
      clearCelebrate,
      addLearnerTurn,
      resetTranscript,
      onProgressChanged,
      onModuleComplete,
    }),
    [
      transcript,
      streaming,
      costUsd,
      celebrate,
      clearCelebrate,
      addLearnerTurn,
      resetTranscript,
      onProgressChanged,
      onModuleComplete,
    ],
  )

  return <TutorContext value={value}>{children}</TutorContext>
}

export function useTutor(): TutorContextValue {
  const ctx = useContext(TutorContext)
  if (!ctx) throw new Error('useTutor must be used within a TutorProvider')
  return ctx
}
