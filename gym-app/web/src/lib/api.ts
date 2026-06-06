// Typed REST client for every endpoint in gym-app/CONTRACT.md.
// When VITE_MOCK=1 the mock client is used instead (see mock.ts).

import type {
  ApiResponse,
  Curriculum,
  Lesson,
  Progress,
  QuizAnswerRequest,
  QuizVerdict,
  TestResult,
  TutorInputRequest,
} from './types'
import { mockApi } from './mock'

const MOCK_ENABLED = import.meta.env.VITE_MOCK === '1'

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  let envelope: ApiResponse<T>
  try {
    envelope = (await res.json()) as ApiResponse<T>
  } catch {
    throw new Error(`Invalid JSON from ${path} (HTTP ${res.status})`)
  }

  if (!envelope.success || envelope.data === null) {
    throw new Error(envelope.error ?? `Request to ${path} failed`)
  }

  return envelope.data
}

export interface GymApi {
  getCurriculum(): Promise<Curriculum>
  getLesson(slug: string): Promise<Lesson>
  getProgress(): Promise<Progress>
  runTest(slug: string): Promise<TestResult>
  submitQuizAnswer(slug: string, body: QuizAnswerRequest): Promise<QuizVerdict>
  completeModule(slug: string): Promise<Progress>
  sendTutorInput(body: TutorInputRequest): Promise<void>
}

const realApi: GymApi = {
  getCurriculum: () => request<Curriculum>('/curriculum'),
  getLesson: (slug) => request<Lesson>(`/lesson/${encodeURIComponent(slug)}`),
  getProgress: () => request<Progress>('/progress'),
  runTest: (slug) =>
    request<TestResult>(`/test/${encodeURIComponent(slug)}`, { method: 'POST' }),
  submitQuizAnswer: (slug, body) =>
    request<QuizVerdict>(`/quiz/${encodeURIComponent(slug)}/answer`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  completeModule: (slug) =>
    request<Progress>(`/module/${encodeURIComponent(slug)}/complete`, {
      method: 'POST',
    }),
  sendTutorInput: async (body) => {
    // Fire-and-forget (202); replies stream over SSE.
    await fetch('/api/tutor/input', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  },
}

export const api: GymApi = MOCK_ENABLED ? mockApi : realApi
