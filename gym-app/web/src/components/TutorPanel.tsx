// Collapsible right-dock tutor chat. Streams partial markdown, finalizes on
// tutor_message, renders graduated hint badges, and shows session cost.

import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { useTutor } from '../lib/TutorContext'
import type { HintLevel } from '../lib/types'
import { Markdown } from './Markdown'

interface TutorPanelProps {
  slug: string | null
}

const HINT_LABEL: Record<HintLevel, string> = {
  1: 'Hint · nudge',
  2: 'Hint · name the concept',
  3: 'Hint · partial',
  4: 'Hint · full solution',
}

const HINT_CLS: Record<HintLevel, string> = {
  1: 'border-sky-700 bg-sky-950/40 text-sky-300',
  2: 'border-indigo-700 bg-indigo-950/40 text-indigo-300',
  3: 'border-amber-700 bg-amber-950/40 text-amber-300',
  4: 'border-rose-700 bg-rose-950/40 text-rose-300',
}

export function TutorPanel({ slug }: TutorPanelProps) {
  const { messages, streaming, hints, costUsd } = useTutor()
  const [open, setOpen] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, streaming, hints])

  const send = async (): Promise<void> => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    try {
      await api.sendTutorInput({ kind: 'chat', text, slug })
    } finally {
      setSending(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-1/2 right-0 z-30 -translate-y-1/2 rounded-l-lg border border-r-0 border-zinc-800 bg-zinc-900 px-2 py-4 text-xs font-semibold tracking-wide text-emerald-400 [writing-mode:vertical-rl] hover:bg-zinc-800"
      >
        💬 Tutor
      </button>
    )
  }

  const isEmpty = messages.length === 0 && hints.length === 0 && !streaming

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-zinc-800 bg-zinc-900/60">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="text-sm font-semibold text-zinc-100">💬 Tutor</div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          Collapse →
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {isEmpty && (
          <p className="text-sm text-zinc-500">
            Ask anything about this rep. I’ll keep it warm and why-first. 💪
          </p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
          >
            <Markdown compact>{msg.text}</Markdown>
          </div>
        ))}

        {streaming && (
          <div className="rounded-lg border border-emerald-900/60 bg-zinc-950/60 p-3">
            <Markdown compact>{streaming}</Markdown>
            <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-emerald-400 align-middle" />
          </div>
        )}

        {hints.map((hint, i) => (
          <div
            key={`hint-${i}`}
            className={`rounded-lg border-l-4 p-3 text-sm ${HINT_CLS[hint.level]}`}
          >
            <div className="mb-1 text-xs font-semibold tracking-wide uppercase">
              {HINT_LABEL[hint.level]}
            </div>
            <div className="text-zinc-300">{hint.text}</div>
          </div>
        ))}
      </div>

      <div className="border-t border-zinc-800 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void send()
            }}
            placeholder="Ask the tutor…"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={send}
            disabled={!input.trim() || sending}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
          >
            Send
          </button>
        </div>
        <div className="mt-2 text-right text-xs text-zinc-500">
          {costUsd === null
            ? 'session cost —'
            : `session cost $${costUsd.toFixed(2)}`}
        </div>
      </div>
    </aside>
  )
}
