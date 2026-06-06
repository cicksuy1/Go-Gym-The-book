// Data-loading hook for the dashboard. Fetches curriculum + progress together
// and refetches progress when a progress_changed SSE event arrives.

import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import { useTutor } from './TutorContext'
import type { Curriculum, Progress } from './types'

interface DashboardData {
  curriculum: Curriculum | null
  progress: Progress | null
  loading: boolean
  error: string | null
  reload: () => void
}

export function useDashboardData(): DashboardData {
  const { onProgressChanged } = useTutor()
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [c, p] = await Promise.all([api.getCurriculum(), api.getProgress()])
      setCurriculum(c)
      setProgress(p)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Refetch progress (only) when the server signals a change.
  useEffect(
    () =>
      onProgressChanged(() => {
        api.getProgress().then(setProgress).catch(() => {})
      }),
    [onProgressChanged],
  )

  return { curriculum, progress, loading, error, reload: load }
}
