// Session page: a tunnel to the real /go-gym conductor conversation.
// Header (module title · tutor status · session id · cost · back), a scrolling
// transcript of rendered turns, and one always-active answer box.

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { api } from '../lib/api'
import { useTutor } from '../lib/TutorContext'
import type { TutorState, TutorStatus } from '../lib/types'
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

const STATUS_POLL_MS = 3000

function useTutorStatus(): TutorStatus {
  const [status, setStatus] = useState<TutorStatus>({
    state: 'starting',
    sessionId: null,
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
  const { transcript, streaming, costUsd, addLearnerTurn } = useTutor()
  const status = useTutorStatus()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  const online = status.state === 'online'

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
            if (turn.kind === 'activity') {
              return (
                <div
                  key={i}
                  className="font-mono text-xs text-zinc-500 italic"
                >
                  {turn.text}
                </div>
              )
            }
            if (turn.kind === 'learner') {
              return (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-sm border border-emerald-800/60 bg-emerald-950/30 px-4 py-2 text-sm whitespace-pre-wrap text-zinc-100">
                    {turn.text}
                  </div>
                </div>
              )
            }
            return (
              <div
                key={i}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-5 py-3"
              >
                <Markdown>{turn.text}</Markdown>
              </div>
            )
          })}

          {streaming && (
            <div className="rounded-2xl border border-emerald-900/50 bg-zinc-900/50 px-5 py-3">
              <Markdown>{streaming}</Markdown>
              <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-emerald-400 align-middle" />
            </div>
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
