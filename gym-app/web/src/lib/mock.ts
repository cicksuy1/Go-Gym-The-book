// Mock API + fake SSE emitter, enabled when VITE_MOCK === '1'.
// Demos the whole app with no server: `VITE_MOCK=1 npm run dev`.
// VITE_MOCK=1 replays a canned conductor session: scripted markdown turns
// (with a GFM concept-coverage table + a recall question), echoes learner
// input with a graded reply, a tool_activity + RED→GREEN test_result, then
// module_complete. Fixtures use real module names/slugs from CURRICULUM.md.

import type {
  Curriculum,
  Progress,
  TutorEventType,
  TutorStatus,
} from './types'
import type { GymApi } from './api'

// --- in-memory SSE emitter -------------------------------------------------

type Subscriber = (type: TutorEventType, rawJson: string) => void

class MockEmitter {
  private subscribers = new Set<Subscriber>()

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn)
    return () => {
      this.subscribers.delete(fn)
    }
  }

  emit<T>(type: TutorEventType, data: T): void {
    const raw = JSON.stringify(data)
    for (const fn of this.subscribers) fn(type, raw)
  }
}

export const mockEvents = new MockEmitter()

// --- fixtures --------------------------------------------------------------

function m(
  number: number,
  title: string,
  slug: string,
  kind: 'fundamentals' | 'advance',
  written = true,
): Curriculum['parts'][number]['modules'][number] {
  return { number, title, slug, kind, written, hasExercise: written }
}

const curriculum: Curriculum = {
  parts: [
    {
      title: 'Part 0 — Getting Started',
      modules: [m(0, 'Setup: install Go, project & package structure', 'setup', 'fundamentals')],
    },
    {
      title: 'Part 1 — Go Fundamentals',
      modules: [
        m(1, 'Integers', 'integers', 'fundamentals'),
        m(2, 'Iteration', 'iteration', 'fundamentals'),
        m(3, 'Arrays & slices', 'arrays', 'fundamentals'),
        m(4, 'Structs, methods & interfaces', 'structs', 'fundamentals'),
        m(5, 'Pointers & errors', 'pointers', 'fundamentals'),
        m(6, 'Maps', 'maps', 'fundamentals'),
        m(7, 'Dependency Injection', 'di', 'fundamentals'),
        m(8, 'Mocking', 'mocking', 'fundamentals'),
        m(9, 'Concurrency', 'concurrency', 'advance'),
        m(10, 'Select', 'select', 'advance'),
        m(11, 'Reflection', 'reflection', 'advance'),
        m(12, 'Sync', 'sync', 'advance'),
        m(13, 'Context', 'context', 'advance'),
      ],
    },
    {
      title: 'Part 2 — Testing Fundamentals',
      modules: [
        m(20, 'Intro to acceptance tests', 'acceptance', 'advance', false),
        m(21, 'Scaling acceptance tests', 'acceptance-scale', 'advance', false),
      ],
    },
  ],
  graduationBars: [
    {
      bar: 1,
      description:
        'Build from scratch: a worker-goroutine + channel + select-with-timeout program, with passing tests, unaided.',
      status: 'locked',
    },
    {
      bar: 2,
      description:
        'Read real code: open an unfamiliar Go standard-library file cold and narrate every line.',
      status: 'locked',
    },
    {
      bar: 3,
      description: 'Ship something: build a small but complete app end to end.',
      status: 'locked',
    },
  ],
}

const progress: Progress = {
  current: 'arrays',
  started: '2026-06-01',
  completed: [
    { number: 0, module: 'setup', finished: '2026-06-02', recall: '✅' },
    { number: 1, module: 'integers', finished: '2026-06-04', recall: '✅' },
    { number: 2, module: 'iteration', finished: '2026-06-05', recall: '✅' },
  ],
  graduationBars: [
    { bar: 1, status: '⬜' },
    { bar: 2, status: '⬜' },
    { bar: 3, status: '⬜' },
  ],
}

const MOCK_SESSION_ID = 'mock-7f3a9c21-arrays'
let started = false
let sessionCostUsd = 0.18

// --- scripted conductor turns ----------------------------------------------

const WELCOME_TURN = `## Arrays & slices 🟢 — let's get a rep in 💪

You're here: **3 · Arrays & slices**. Slices are how Go does "a list of things" — get
them in your fingers and half of everyday Go opens up.

**Why this matters:** an array's size is baked into its *type* (\`[5]int\`), so it can't
grow. A **slice** (\`[]int\`) is a flexible window onto a backing array — and it's what
you'll reach for ~95% of the time.

### What this module covers

| Concept | Syntax | Watch out for |
|---|---|---|
| Array | \`[3]int{1, 2, 3}\` | Fixed size — part of the type |
| Slice | \`[]int{1, 2, 3}\` | Growable view; the everyday choice |
| Grow a slice | \`s = append(s, 4)\` | \`append\` may reallocate — **reassign** |
| Length | \`len(s)\` | Zero value of a slice is \`nil\`, \`len\` is \`0\` |
| Iterate | \`for i, v := range s\` | \`range\` gives index **and** value |

### Your rep

Open \`exercises/arrays/arrays.go\` and make \`Sum\` add every number in the slice:

\`\`\`go
func Sum(numbers []int) int {
\treturn 0 // TODO: range over numbers and add them up
}
\`\`\`

Run the test, watch it go **RED**, fix the body, watch it flip **GREEN**. When you're
ready, paste your \`Sum\` here or just tell me to run the test.

**Quick recall to warm up:** *What does \`append\` return, and why must you reassign its result?*`

const GRADED_TURN = `Nice — that's the right instinct. ✅

\`append\` returns a **(possibly new) slice header**: if the backing array has spare
capacity it reuses it, but if it's full Go allocates a bigger array, copies the
elements, and hands back a slice pointing at the *new* array. If you ignore the return
value, you keep pointing at the old one — so you always write \`s = append(s, x)\`.

Let's prove your \`Sum\` works — running the test now. 🏃`

// --- mock API --------------------------------------------------------------

function streamTurn(fullText: string, onDone?: () => void): void {
  const tokens = fullText.match(/[\s\S]{1,22}/g) ?? [fullText]
  let i = 0
  const tick = () => {
    if (i < tokens.length) {
      mockEvents.emit('tutor_partial', { text: tokens[i] })
      i += 1
      setTimeout(tick, 35)
    } else {
      mockEvents.emit('tutor_message', { text: fullText })
      onDone?.()
    }
  }
  setTimeout(tick, 120)
}

function bumpCost(amount: number): void {
  sessionCostUsd += amount
  mockEvents.emit('cost_update', { totalCostUsd: Number(sessionCostUsd.toFixed(2)) })
}

export const mockApi: GymApi = {
  getCurriculum: () =>
    new Promise((r) => setTimeout(() => r(curriculum), 250)),

  getProgress: () => new Promise((r) => setTimeout(() => r(progress), 250)),

  tutorStatus: () =>
    new Promise<TutorStatus>((r) =>
      setTimeout(
        () => r({ state: started ? 'online' : 'starting', sessionId: MOCK_SESSION_ID }),
        150,
      ),
    ),

  sessionStart: async (_slug) => {
    started = true
    // Conductor opens the module with its welcome turn.
    setTimeout(() => streamTurn(WELCOME_TURN, () => bumpCost(0.04)), 400)
  },

  sessionInput: async (_text) => {
    // The learner answered the recall question / asked to run the test.
    // 1) graded reply, 2) tool activity + RED, 3) re-run GREEN, 4) complete.
    streamTurn(GRADED_TURN, () => {
      bumpCost(0.03)

      setTimeout(() => {
        mockEvents.emit('tool_activity', { text: '🧪 go test ./exercises/arrays/' })
      }, 500)

      setTimeout(() => {
        mockEvents.emit('test_result', {
          slug: 'arrays',
          status: 'red',
          output:
            '--- FAIL: TestSum (0.00s)\n    arrays_test.go:14: Sum([1 2 3]) = 0; want 6\nFAIL',
        })
        streamTurn(
          'RED — exactly what we want to see first. 🟥 Your \`Sum\` still returns the stub\'s `0`. Range over `numbers` and add each value, then run it again.',
        )
      }, 1300)

      setTimeout(() => {
        mockEvents.emit('tool_activity', { text: '🧪 go test ./exercises/arrays/' })
      }, 3200)

      setTimeout(() => {
        mockEvents.emit('test_result', {
          slug: 'arrays',
          status: 'green',
          output: 'ok  \tgo-gym/exercises/arrays\t0.201s\nPASS',
        })
        mockEvents.emit('celebrate', { reason: 'red_to_green' })
        streamTurn(
          'GREEN! 🟩 That\'s the rep. Recall was solid too, so this module is done — marking it ✅ in your progress.',
          () => {
            bumpCost(0.02)
            setTimeout(() => {
              mockEvents.emit('progress_changed', {})
              mockEvents.emit('module_complete', { slug: 'arrays' })
              mockEvents.emit('celebrate', { reason: 'module_complete' })
            }, 900)
          },
        )
      }, 4000)
    })
  },
}
