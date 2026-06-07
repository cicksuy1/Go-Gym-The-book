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
import { api } from './api'
import { useTutorEvents } from './sse'
import type { CelebrateReason, TutorModel } from './types'

// A single entry in the conversation transcript. `history` marks turns replayed
// from a past chat log (rendered dimmed), vs. turns from the live conversation.
export type Turn =
  | { kind: 'tutor'; text: string; history?: boolean }
  | { kind: 'learner'; text: string; history?: boolean }
  | { kind: 'activity'; text: string; history?: boolean }

interface TutorContextValue {
  transcript: Turn[]
  streaming: string // in-flight partial accumulation for the current tutor turn
  costUsd: number | null
  celebrate: CelebrateReason | null
  /** The module slug the live conversation is currently bound to. */
  sessionSlug: string | null
  /** The model the live conversation is running on. */
  model: TutorModel | null
  clearCelebrate: () => void
  /** Append a learner turn locally (echoed immediately on send). */
  addLearnerTurn: (text: string) => void
  /** Clear the transcript when starting/leaving a session. */
  resetTranscript: () => void
  /** Replay a module's past chat log into the transcript (dimmed). */
  loadHistory: (slug: string) => Promise<void>
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
  const [sessionSlug, setSessionSlug] = useState<string | null>(null)
  const [model, setModel] = useState<TutorModel | null>(null)

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
    session_changed: (e) => {
      setSessionSlug(e.slug)
      setModel(e.model)
      if (e.fresh) {
        setTranscript((t) => [
          ...t,
          { kind: 'activity', text: '— new conversation —' },
        ])
      }
    },
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

  // Replace the transcript with a module's past chat log, marked as history so
  // the Session page renders it dimmed. Errors leave an empty transcript.
  const loadHistory = useCallback(async (slug: string): Promise<void> => {
    try {
      const { turns } = await api.history(slug)
      setTranscript(
        turns.map((turn) => ({
          kind: turn.kind,
          text: turn.text,
          history: true,
        })),
      )
    } catch (error: unknown) {
      console.error('Failed to load chat history', error)
      setTranscript([])
    }
  }, [])

  const value = useMemo<TutorContextValue>(
    () => ({
      transcript,
      streaming,
      costUsd,
      celebrate,
      sessionSlug,
      model,
      clearCelebrate,
      addLearnerTurn,
      resetTranscript,
      loadHistory,
      onProgressChanged,
      onModuleComplete,
    }),
    [
      transcript,
      streaming,
      costUsd,
      celebrate,
      sessionSlug,
      model,
      clearCelebrate,
      addLearnerTurn,
      resetTranscript,
      loadHistory,
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
