// Right-docked "Rep panel" on the lesson page: read-only stub/test paths, a
// Run-test button driving a live TestOutput block, RED→GREEN celebration, and
// the gated "Start recall quiz" + "Help, my test is RED" actions.

import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useTutor } from '../lib/TutorContext'
import type { RepFiles, TestResult, TestStatus } from '../lib/types'

interface RepPanelProps {
  slug: string
  repFiles: RepFiles | null
  onStartQuiz: () => void
}

export function RepPanel({ slug, repFiles, onStartQuiz }: RepPanelProps) {
  const { onTestResult } = useTutor()
  const [result, setResult] = useState<TestResult | null>(null)
  const [running, setRunning] = useState(false)
  const [helping, setHelping] = useState(false)
  const [flash, setFlash] = useState(false)
  const [prevStatus, setPrevStatus] = useState<TestStatus | null>(null)

  // Mirror server-pushed test_result events (keeps panel in sync if the test
  // is run from elsewhere / the server re-emits).
  useEffect(
    () =>
      onTestResult((e) => {
        if (e.slug !== slug) return
        setResult({ status: e.status, output: e.output, durationMs: 0 })
      }),
    [onTestResult, slug],
  )

  const isGreen = result?.status === 'green'

  const runTest = async (): Promise<void> => {
    if (running) return
    setRunning(true)
    try {
      const next = await api.runTest(slug)
      if (prevStatus === 'red' && next.status === 'green') {
        setFlash(true)
        setTimeout(() => setFlash(false), 1600)
      }
      setPrevStatus(next.status)
      setResult(next)
    } finally {
      setRunning(false)
    }
  }

  const helpRedTest = async (): Promise<void> => {
    if (helping) return
    setHelping(true)
    try {
      await api.sendTutorInput({
        kind: 'help_red_test',
        text: 'My test is RED — help me read the failure.',
        slug,
      })
    } finally {
      setHelping(false)
    }
  }

  if (!repFiles) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h3 className="text-sm font-semibold text-zinc-100">🏋️ Your rep</h3>
        <p className="mt-2 text-sm text-zinc-400">
          This module has no exercise package — you build the structure by hand.
          Follow the lesson steps, then jump to recall.
        </p>
        <button
          type="button"
          onClick={onStartQuiz}
          className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          🧠 Start recall quiz
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h3 className="text-sm font-semibold text-zinc-100">🏋️ Your rep</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Edit these in your editor — the GUI never edits code for you.
        </p>
        <dl className="mt-3 space-y-2 text-xs">
          <FilePath label="Stub" path={repFiles.stub} />
          <FilePath label="Test" path={repFiles.test} />
        </dl>

        <button
          type="button"
          onClick={runTest}
          disabled={running}
          className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {running ? 'Running go test…' : '▶ Run test'}
        </button>
      </div>

      {result && (
        <TestOutput
          status={result.status}
          output={result.output}
          flash={flash}
        />
      )}

      <div className="space-y-2">
        <button
          type="button"
          onClick={onStartQuiz}
          disabled={!isGreen}
          title={isGreen ? '' : 'Get the test GREEN first'}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          🧠 Start recall quiz {isGreen ? '' : '(needs GREEN)'}
        </button>
        <button
          type="button"
          onClick={helpRedTest}
          disabled={helping}
          className="w-full rounded-lg border border-rose-700 bg-rose-950/40 px-4 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-950/70 disabled:opacity-50"
        >
          🆘 Help, my test is RED
        </button>
      </div>
    </div>
  )
}

function FilePath({ label, path }: { label: string; path: string }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="w-9 shrink-0 text-zinc-500">{label}</dt>
      <dd className="flex-1 truncate rounded bg-zinc-950 px-2 py-1 font-mono text-zinc-300">
        {path}
      </dd>
    </div>
  )
}

function TestOutput({
  status,
  output,
  flash,
}: {
  status: TestStatus
  output: string
  flash: boolean
}) {
  const green = status === 'green'
  return (
    <div
      className={`overflow-hidden rounded-xl border-2 ${
        green ? 'border-emerald-500' : 'border-rose-500'
      } ${flash ? 'green-flash' : ''}`}
    >
      <div
        className={`flex items-center justify-between px-4 py-2 text-xs font-semibold ${
          green
            ? 'bg-emerald-950/50 text-emerald-300'
            : 'bg-rose-950/50 text-rose-300'
        }`}
      >
        <span>{green ? '🟩 GREEN — passing' : '🟥 RED — failing'}</span>
        <span className="rounded-full bg-black/30 px-2 py-0.5">
          {green ? 'PASS' : 'FAIL'}
        </span>
      </div>
      <pre className="max-h-72 overflow-auto bg-[#0b0f14] p-3 font-mono text-xs leading-5 whitespace-pre-wrap text-zinc-300">
        {output}
      </pre>
    </div>
  )
}
