// CSS-only confetti + banner for RED → GREEN and module-complete moments.
// No heavy deps — just keyframes from index.css.

import { useEffect, useMemo } from 'react'
import type { CelebrateReason } from '../lib/types'

interface CelebrationProps {
  reason: CelebrateReason
  onDone: () => void
}

const COLORS = ['#10b981', '#34d399', '#6ee7b7', '#fbbf24', '#60a5fa', '#f472b6']
const PIECE_COUNT = 70
const DURATION_MS = 2600

const HEADLINES: Record<CelebrateReason, string> = {
  red_to_green: 'GREEN! 🟩',
  module_complete: 'Module complete! ⭐',
  graduation: 'Graduation bar passed! 🎓',
}

const SUBLINES: Record<CelebrateReason, string> = {
  red_to_green: 'That RED → GREEN flip is the whole engine. Nice rep. 💪',
  module_complete: 'Both gates passed — test GREEN and recall nailed.',
  graduation: 'A real milestone. You earned this one.',
}

interface Piece {
  left: string
  background: string
  delay: string
  duration: string
}

export function Celebration({ reason, onDone }: CelebrationProps) {
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: PIECE_COUNT }, () => ({
        left: `${Math.random() * 100}%`,
        background: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: `${Math.random() * 0.4}s`,
        duration: `${1.6 + Math.random() * 1.2}s`,
      })),
    [],
  )

  useEffect(() => {
    const timer = setTimeout(onDone, DURATION_MS)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: p.left,
            background: p.background,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
      <div className="flex h-full items-center justify-center">
        <div className="celebrate-card rounded-2xl border border-emerald-500/40 bg-zinc-900/90 px-10 py-8 text-center shadow-2xl shadow-emerald-900/40 backdrop-blur">
          <div className="text-4xl font-extrabold tracking-tight text-emerald-400">
            {HEADLINES[reason]}
          </div>
          <p className="mt-2 max-w-xs text-sm text-zinc-300">{SUBLINES[reason]}</p>
        </div>
      </div>
    </div>
  )
}
