// Typed REST client for gym-app/CONTRACT.md (v1.1 — conversation tunnel).
// When VITE_MOCK=1 the mock client is used instead (see mock.ts).

import type {
  ApiResponse,
  Curriculum,
  HistoryTurn,
  Progress,
  TutorModel,
  TutorStatus,
} from './types'
import { mockApi } from './mock'

const MOCK_ENABLED = import.meta.env.VITE_MOCK === '1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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

// Fire-and-forget POST (202 accepted); replies stream over SSE.
async function post202(path: string, body: unknown): Promise<void> {
  await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export interface TutorHistory {
  turns: HistoryTurn[]
}

export interface SetModelResult {
  model: TutorModel
  appliesOn: string
}

export interface GymApi {
  getCurriculum(): Promise<Curriculum>
  getProgress(): Promise<Progress>
  tutorStatus(): Promise<TutorStatus>
  history(slug: string): Promise<TutorHistory>
  setModel(model: TutorModel): Promise<SetModelResult>
  sessionStart(slug: string, opts?: { fresh?: boolean }): Promise<void>
  sessionInput(text: string): Promise<void>
}

const realApi: GymApi = {
  getCurriculum: () => request<Curriculum>('/curriculum'),
  getProgress: () => request<Progress>('/progress'),
  tutorStatus: () => request<TutorStatus>('/tutor/status'),
  history: (slug) =>
    request<TutorHistory>(`/tutor/history/${encodeURIComponent(slug)}`),
  setModel: (model) => request<SetModelResult>('/tutor/model', {
    method: 'POST',
    body: JSON.stringify({ model }),
  }),
  sessionStart: (slug, opts) =>
    post202('/tutor/session/start', { slug, fresh: opts?.fresh ?? false }),
  sessionInput: (text) => post202('/tutor/session/input', { text }),
}

export const api: GymApi = MOCK_ENABLED ? mockApi : realApi
