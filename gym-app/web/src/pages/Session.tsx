// Session page: a tunnel to the real /go-gym conductor conversation.
// Header (module title · tutor status · session id · cost · back), a scrolling
// transcript of rendered turns, and one always-active answer box.

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { api } from '../lib/api'
import { useTutor } from '../lib/TutorContext'
import type { TutorModel, TutorState, TutorStatus } from '../lib/types'
import { Markdown } from '../components/Markdown'

interface SessionProps {
  slug: string
  title: string
  onBack: () => void
}

const STATUS_STYLE: Record<TutorState, { label: string; cls: string }> = {
  starting: { label: '● starting…', cls: 'text-amber-400' },
  online: { label: '● online', cls: 'text-emerald-400' },
  dead: { label: '● offline', cls: 'text-rose-400' },
}

const MODEL_OPTIONS: { value: TutorModel; label: string }[] = [
  { value: 'opus', label: 'Opus' },
  { value: 'sonnet', label: 'Sonnet' },
  { value: 'haiku', label: 'Haiku' },
]

const STATUS_POLL_MS = 3000
const MODEL_HINT_MS = 4000

function useTutorStatus(): TutorStatus {
  const [status, setStatus] = useState<TutorStatus>({
    state: 'starting',
    sessionId: null,
    slug: null,
    model: null,
  })

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const poll = async (): Promise<void> => {
      try {
        const next = await api.tutorStatus()
        if (cancelled) return
        setStatus(next)
        if (next.state === 'online') return // stop polling once live
      } catch {
        if (cancelled) return
      }
      timer = setTimeout(poll, STATUS_POLL_MS)
    }

    void poll()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  return status
}

export function Session({ slug, title, onBack }: SessionProps) {
  const {
    transcript,
    streaming,
    costUsd,
    model,
    addLearnerTurn,
    resetTranscript,
    loadHistory,
  } = useTutor()
  const status = useTutorStatus()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [modelHint, setModelHint] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  const online = status.state === 'online'
  // Prefer the live (context) model; fall back to the polled status.
  const selectedModel = model ?? status.model

  const onModelChange = async (
    e: ChangeEvent<HTMLSelectElement>,
  ): Promise<void> => {
    const next = e.target.value as TutorModel
    try {
      await api.setModel(next)
      setModelHint(true)
      setTimeout(() => setModelHint(false), MODEL_HINT_MS)
    } catch (error: unknown) {
      console.error('Failed to set model', error)
    }
  }

  const restartConversation = async (): Promise<void> => {
    const ok = window.confirm(
      'Start a fresh conversation for this module? The chat log stays readable.',
    )
    if (!ok) return
    resetTranscript()
    await loadHistory(slug)
    await api.sessionStart(slug, { fresh: true })
  }

  // Auto-stick to bottom unless the user scrolled up.
  useEffect(() => {
    if (stickToBottom.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
    }
  }, [transcript, streaming])

  const onScroll = (): void => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    stickToBottom.current = nearBottom
  }

  const send = async (): Promise<void> => {
    const text = input.trim()
    if (!text || sending || !online) return
    setSending(true)
    setInput('')
    stickToBottom.current = true
    addLearnerTurn(text) // echo locally immediately
    try {
      await api.sessionInput(text)
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b border-zinc-800 bg-zinc-900/60 px-6 py-3">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-zinc-400 hover:text-emerald-400"
        >
          ← Dashboard
        </button>
        <h1 className="flex-1 truncate font-semibold text-zinc-100">{title}</h1>
        <div className="flex flex-col items-end">
          <select
            value={selectedModel ?? ''}
            onChange={(e) => void onModelChange(e)}
            title="Model applies on the next session"
            className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-emerald-500"
          >
            {selectedModel === null && (
              <option value="" disabled>
                —
              </option>
            )}
            {MODEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {modelHint && (
            <span className="mt-0.5 text-[10px] text-zinc-500">
              applies to next session
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void restartConversation()}
          title="Start a fresh conversation for this module"
          className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-emerald-700 hover:text-emerald-400"
        >
          Restart conversation
        </button>
        <span className={`text-sm font-medium ${STATUS_STYLE[status.state].cls}`}>
          {STATUS_STYLE[status.state].label}
        </span>
        {status.sessionId && (
          <span
            className="hidden font-mono text-xs text-zinc-500 sm:inline"
            title={status.sessionId}
          >
            {status.sessionId.slice(0, 12)}…
          </span>
        )}
        <span className="text-xs text-zinc-500">
          {costUsd === null ? '$—' : `$${costUsd.toFixed(2)}`}
        </span>
      </header>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-6 py-6"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {transcript.length === 0 && !streaming && (
            <p className="text-sm text-zinc-500">
              {online
                ? `Opening ${slug} with the conductor…`
                : 'Waiting for the conductor to come online…'}
            </p>
          )}

          {transcript.map((turn, i) => {
            // Insert an "— earlier —" divider once, between the last history
            // turn and the first live turn (only when both kinds are present).
            const prev = transcript[i - 1]
            const divider =
              !turn.history && prev?.history ? (
                <div
                  key={`divider-${i}`}
                  className="my-2 text-center text-xs tracking-wide text-zinc-600"
                >
                  — earlier —
                </div>
              ) : null
            const dim = turn.history ? 'opacity-60' : ''

            if (turn.kind === 'activity') {
              return (
                <div key={i}>
                  {divider}
                  <div className={`font-mono text-xs text-zinc-500 italic ${dim}`}>
                    {turn.text}
                  </div>
                </div>
              )
            }
            if (turn.kind === 'learner') {
              return (
                <div key={i}>
                  {divider}
                  <div className={`flex justify-end ${dim}`}>
                    <div className="max-w-[80%] rounded-2xl rounded-br-sm border border-emerald-800/60 bg-emerald-950/30 px-4 py-2 text-sm whitespace-pre-wrap text-zinc-100">
                      {turn.text}
                    </div>
                  </div>
                </div>
              )
            }
            return (
              <div key={i}>
                {divider}
                <div
                  className={`rounded-2xl border border-zinc-800 bg-zinc-900/50 px-5 py-3 ${dim}`}
                >
                  <Markdown>{turn.text}</Markdown>
                </div>
              </div>
            )
          })}

          {streaming && (
            <>
              {transcript.length > 0 &&
                transcript.every((t) => t.history) && (
                  <div className="my-2 text-center text-xs tracking-wide text-zinc-600">
                    — earlier —
                  </div>
                )}
              <div className="rounded-2xl border border-emerald-900/50 bg-zinc-900/50 px-5 py-3">
                <Markdown>{streaming}</Markdown>
                <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-emerald-400 align-middle" />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-zinc-800 bg-zinc-900/60 px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={!online}
              rows={2}
              placeholder={
                online
                  ? 'Answer the conductor… (Enter to send, Shift+Enter for newline)'
                  : 'Waiting for the conductor to come online…'
              }
              className="flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={send}
              disabled={!input.trim() || sending || !online}
              className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
          </div>
          {!online && (
            <p className="mt-2 text-xs text-zinc-500">
              The conductor is {status.state === 'dead' ? 'offline' : 'starting up'}.
              You can type once it's online.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
