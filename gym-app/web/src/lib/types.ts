// Shared types mirroring gym-app/CONTRACT.md (v1.1 — conversation tunnel).

export interface ApiResponse<T> {
  success: boolean
  data: T | null
  error: string | null
}

// --- Curriculum ---

export type ModuleKind = 'fundamentals' | 'advance' // 🟢 | 🔵

export interface CurriculumModule {
  number: number
  title: string
  slug: string
  kind: ModuleKind
  written: boolean
  hasExercise: boolean
}

export interface CurriculumPart {
  title: string
  modules: CurriculumModule[]
}

export type GraduationStatus = 'locked' | 'passed'

export interface GraduationBar {
  bar: number
  description: string
  status: GraduationStatus
}

export interface Curriculum {
  parts: CurriculumPart[]
  graduationBars: GraduationBar[]
}

// --- Progress ---

export interface CompletedModule {
  number: number
  module: string
  finished: string
  recall: string
}

export interface ProgressGraduationBar {
  bar: number
  status: string // emoji, e.g. "⬜" | "✅"
}

export interface Progress {
  current: string
  started: string
  completed: CompletedModule[]
  graduationBars: ProgressGraduationBar[]
}

// --- Tutor status ---

export type TutorState = 'starting' | 'online' | 'dead'

export interface TutorStatus {
  state: TutorState
  sessionId: string | null
}

// --- Test (manual run, broadcast over SSE) ---

export type TestStatus = 'green' | 'red'

// --- SSE events (CONTRACT.md §SSE, v1.1) ---

export interface TutorPartialEvent {
  text: string
}

export interface TutorMessageEvent {
  text: string
}

export interface ToolActivityEvent {
  text: string // pre-formatted, e.g. "🧪 go test ./exercises/arrays/"
}

export interface TestResultEvent {
  slug: string
  status: TestStatus
  output: string
}

export interface ModuleCompleteEvent {
  slug: string
}

export type CelebrateReason = 'module_complete' | 'red_to_green'

export interface CelebrateEvent {
  reason: CelebrateReason
}

export type ProgressChangedEvent = Record<string, never>

export interface CostUpdateEvent {
  totalCostUsd: number
}

export interface TutorEventMap {
  tutor_partial: TutorPartialEvent
  tutor_message: TutorMessageEvent
  tool_activity: ToolActivityEvent
  test_result: TestResultEvent
  module_complete: ModuleCompleteEvent
  celebrate: CelebrateEvent
  progress_changed: ProgressChangedEvent
  cost_update: CostUpdateEvent
}

export type TutorEventType = keyof TutorEventMap
