// Shared types mirroring gym-app/CONTRACT.md exactly.

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

// --- Lesson ---

export interface RepFiles {
  stub: string
  test: string
}

export interface Lesson {
  slug: string
  markdown: string
  recallQuestions: string[]
  repFiles: RepFiles | null // null when no exercise (setup)
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

// --- Test ---

export type TestStatus = 'green' | 'red'

export interface TestResult {
  status: TestStatus
  output: string
  durationMs: number
}

// --- Quiz ---

export type Verdict = 'correct' | 'partial' | 'wrong'

export interface QuizAnswerRequest {
  question: number
  answer: string
  attempt: number
}

export interface QuizVerdict {
  verdict: Verdict
  feedback: string
  reteach: string | null
}

// --- Tutor input ---

export type TutorInputKind = 'chat' | 'help_red_test'

export interface TutorInputRequest {
  kind: TutorInputKind
  text: string
  slug: string | null
}

// --- SSE events (CONTRACT.md §SSE) ---

export interface TutorPartialEvent {
  text: string
}

export interface TutorMessageEvent {
  text: string
}

export interface GradeResultEvent {
  slug: string
  question: number
  verdict: Verdict
  feedback: string
  reteach: string | null
}

export type HintLevel = 1 | 2 | 3 | 4

export interface HintEvent {
  level: HintLevel
  text: string
}

export interface TestResultEvent {
  slug: string
  status: TestStatus
  output: string
}

export interface ModuleCompleteEvent {
  slug: string
  finished: string
}

export type CelebrateReason = 'red_to_green' | 'module_complete' | 'graduation'

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
  grade_result: GradeResultEvent
  hint: HintEvent
  test_result: TestResultEvent
  module_complete: ModuleCompleteEvent
  celebrate: CelebrateEvent
  progress_changed: ProgressChangedEvent
  cost_update: CostUpdateEvent
}

export type TutorEventType = keyof TutorEventMap
