// Dashboard: overall progress %, "you are here" line, per-part module list
// with status icons + kind badges, and the graduation-bar cards.

import { useDashboardData } from '../lib/useGymData'
import type {
  Curriculum,
  CurriculumModule,
  GraduationBar,
  Progress,
} from '../lib/types'

interface DashboardProps {
  /** Start a conductor session for a written module and open the Session page. */
  onOpenModule: (slug: string, title: string) => void
}

const KIND_BADGE: Record<CurriculumModule['kind'], { icon: string; label: string }> =
  {
    fundamentals: { icon: '🟢', label: 'fundamentals' },
    advance: { icon: '🔵', label: 'advance' },
  }

function moduleStatus(
  mod: CurriculumModule,
  progress: Progress,
): { icon: string; label: string; done?: string } {
  const completed = progress.completed.find((c) => c.module === mod.slug)
  if (completed) return { icon: '✅', label: 'done', done: completed.finished }
  if (mod.slug === progress.current) return { icon: '⏸️', label: 'current' }
  return { icon: KIND_BADGE[mod.kind].icon, label: KIND_BADGE[mod.kind].label }
}

function overallPercent(curriculum: Curriculum, progress: Progress): number {
  const total = curriculum.parts.reduce((n, p) => n + p.modules.length, 0)
  if (total === 0) return 0
  return Math.round((progress.completed.length / total) * 100)
}

function currentModuleTitle(
  curriculum: Curriculum,
  slug: string,
): string {
  for (const part of curriculum.parts) {
    const found = part.modules.find((m) => m.slug === slug)
    if (found) return `${found.number} · ${found.title}`
  }
  return slug
}

export function Dashboard({ onOpenModule }: DashboardProps) {
  const { curriculum, progress, loading, error, reload } = useDashboardData()

  if (loading) {
    return <CenteredNote text="Loading your gym…" />
  }
  if (error || !curriculum || !progress) {
    return (
      <CenteredNote
        text={error ?? 'Could not load data'}
        action={{ label: 'Retry', onClick: reload }}
      />
    )
  }

  const percent = overallPercent(curriculum, progress)
  const here = currentModuleTitle(curriculum, progress.current)

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
          The Go Gym 🏋️
        </h1>
        <p className="mt-1 text-zinc-400">
          You are here: <span className="text-emerald-400">{here}</span>
        </p>

        <div className="mt-5">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-semibold text-zinc-200">Overall progress</span>
            <span className="text-zinc-400">
              {percent}% · {progress.completed.length} done
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </header>

      {curriculum.parts.map((part) => (
        <section key={part.title} className="mb-8">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-zinc-400 uppercase">
            {part.title}
          </h2>
          <ul className="space-y-2">
            {part.modules.map((mod) => {
              const status = moduleStatus(mod, progress)
              const kind = KIND_BADGE[mod.kind]
              const isDone = status.label === 'done'
              const title = !mod.written
                ? 'Not written yet'
                : isDone
                  ? 'review — past chat will load'
                  : 'Open in the conductor'
              return (
                <li key={mod.slug}>
                  <button
                    type="button"
                    onClick={() => onOpenModule(mod.slug, `${mod.number} · ${mod.title}`)}
                    disabled={!mod.written}
                    title={title}
                    className="group flex w-full items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-left transition-colors enabled:hover:border-emerald-700 enabled:hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="text-lg">{status.icon}</span>
                    <span className="flex-1">
                      <span className="font-medium text-zinc-100">
                        {mod.number} · {mod.title}
                      </span>
                      {status.done && (
                        <span className="ml-2 text-xs text-zinc-500">
                          {status.done}
                        </span>
                      )}
                      {!mod.written && (
                        <span className="ml-2 text-xs text-zinc-600">⬜ to-write</span>
                      )}
                    </span>
                    <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                      {kind.icon} {kind.label}
                    </span>
                    <span className="text-zinc-600 group-enabled:group-hover:text-emerald-400">
                      →
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-zinc-400 uppercase">
          ⭐ Graduation bars
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {curriculum.graduationBars.map((bar) => (
            <GraduationCard key={bar.bar} bar={bar} />
          ))}
        </div>
      </section>
    </div>
  )
}

function GraduationCard({ bar }: { bar: GraduationBar }) {
  const passed = bar.status === 'passed'
  return (
    <div
      className={`rounded-xl border p-4 ${
        passed
          ? 'border-emerald-600 bg-emerald-950/30'
          : 'border-zinc-800 bg-zinc-900/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-100">
          Bar {bar.bar}
        </span>
        <span className="text-xs">{passed ? '⭐ passed' : '🔒 locked'}</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-zinc-400">{bar.description}</p>
    </div>
  )
}

function CenteredNote({
  text,
  action,
}: {
  text: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-400">
      <p>{text}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
