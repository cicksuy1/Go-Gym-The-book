// Active-recall quiz modal: one free-text question at a time, gated.
// Wrong/partial → show feedback + reteach + force a retry. All correct →
// POST /api/module/:slug/complete → celebration → back to dashboard.

import { useState } from 'react'
import { api } from '../lib/api'
import type { Verdict } from '../lib/types'
import { Markdown } from './Markdown'

interface QuizProps {
  slug: string
  questions: string[]
  onClose: () => void
  /** Fired after the completion gate passes (module marked done). */
  onCompleted: () => void
}

interface VerdictState {
  verdict: Verdict
  feedback: string
  reteach: string | null
}

const VERDICT_STYLE: Record<Verdict, { label: string; cls: string }> = {
  correct: { label: '✅ Correct', cls: 'border-emerald-500 text-emerald-300' },
  partial: { label: '🟡 Partial', cls: 'border-amber-500 text-amber-300' },
  wrong: { label: '❌ Not yet', cls: 'border-rose-500 text-rose-300' },
}

export function Quiz({ slug, questions, onClose, onCompleted }: QuizProps) {
  const [index, setIndex] = useState(0)
  const [attempt, setAttempt] = useState(1)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<VerdictState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)

  const total = questions.length
  const isLast = index === total - 1

  const submit = async (): Promise<void> => {
    if (!answer.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const verdict = await api.submitQuizAnswer(slug, {
        question: index + 1,
        answer: answer.trim(),
        attempt,
      })
      setResult(verdict)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to grade answer')
    } finally {
      setBusy(false)
    }
  }

  const retry = (): void => {
    setResult(null)
    setAttempt((a) => a + 1)
    setAnswer('')
  }

  const advance = async (): Promise<void> => {
    if (!isLast) {
      setIndex((i) => i + 1)
      setAttempt(1)
      setAnswer('')
      setResult(null)
      return
    }
    // Last question correct → run the server-side completion gate.
    setCompleting(true)
    setError(null)
    try {
      await api.completeModule(slug)
      onCompleted()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not complete module')
      setCompleting(false)
    }
  }

  const passed = result?.verdict === 'correct'

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <div className="text-xs font-semibold tracking-wide text-emerald-400 uppercase">
              🧠 Active recall
            </div>
            <div className="text-sm text-zinc-400">
              Question {index + 1} of {total}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Close quiz"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="text-lg font-medium text-zinc-100">
            <Markdown compact>{questions[index]}</Markdown>
          </div>

          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={busy || passed}
            rows={4}
            placeholder="Answer in your own words — no peeking at the lesson."
            className="mt-4 w-full resize-none rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500 disabled:opacity-60"
          />

          {result && (
            <div
              className={`mt-4 rounded-lg border-l-4 bg-zinc-950/60 p-4 ${VERDICT_STYLE[result.verdict].cls}`}
            >
              <div className="text-sm font-semibold">
                {VERDICT_STYLE[result.verdict].label}
              </div>
              <p className="mt-1 text-sm text-zinc-300">{result.feedback}</p>
              {result.reteach && (
                <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-900 p-3">
                  <div className="mb-1 text-xs font-semibold tracking-wide text-amber-400 uppercase">
                    Reteach
                  </div>
                  <div className="text-sm text-zinc-300">
                    <Markdown compact>{result.reteach}</Markdown>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm text-rose-400">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-zinc-800 px-6 py-4">
          {!result && (
            <button
              type="button"
              onClick={submit}
              disabled={!answer.trim() || busy}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? 'Grading…' : 'Submit answer'}
            </button>
          )}
          {result && !passed && (
            <button
              type="button"
              onClick={retry}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
            >
              Try again (attempt {attempt + 1})
            </button>
          )}
          {result && passed && (
            <button
              type="button"
              onClick={advance}
              disabled={completing}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isLast
                ? completing
                  ? 'Finishing…'
                  : 'Finish module ⭐'
                : 'Next question →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
