// Data-loading hooks for the dashboard. Fetches curriculum + progress together
// and refetches progress when a progress_changed SSE event arrives.

import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import { useTutor } from './TutorContext'
import type { Curriculum, Lesson, Progress } from './types'

interface DashboardData {
  curriculum: Curriculum | null
  progress: Progress | null
  loading: boolean
  error: string | null
  reload: () => void
}

export function useCallbackProgress(): DashboardData {
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

interface LessonData {
  lesson: Lesson | null
  loading: boolean
  error: string | null
}

export function useLesson(slug: string): LessonData {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setLesson(null)
    api
      .getLesson(slug)
      .then((l) => {
        if (!cancelled) setLesson(l)
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Failed to load lesson')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  return { lesson, loading, error }
}
