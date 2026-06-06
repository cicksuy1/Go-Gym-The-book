// Mock API + fake SSE emitter, enabled when VITE_MOCK === '1'.
// Lets the whole app be demoed with no server: `VITE_MOCK=1 npm run dev`.
// Fixtures use real module names/slugs from CURRICULUM.md.

import type {
  Curriculum,
  Lesson,
  Progress,
  QuizAnswerRequest,
  QuizVerdict,
  TestResult,
  TutorEventType,
  TutorInputRequest,
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

const curriculum: Curriculum = {
  parts: [
    {
      title: 'Part 0 — Getting Started',
      modules: [
        {
          number: 0,
          title: 'Setup: install Go, project & package structure',
          slug: 'setup',
          kind: 'fundamentals',
          written: true,
          hasExercise: false,
        },
      ],
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

function m(
  number: number,
  title: string,
  slug: string,
  kind: 'fundamentals' | 'advance',
  written = true,
): Curriculum['parts'][number]['modules'][number] {
  return { number, title, slug, kind, written, hasExercise: written }
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

const integersRecall = [
  'In `func Add(x, y int) int`, which `int` is the return type, and which are the parameters?',
  'Why won’t `Add(2, "four")` compile — and is that error caught before or while the program runs?',
  'What does `go test` actually do with the `// Output: 6` line?',
  'Bonus: what does `var n int` equal before you assign anything, and why does Go guarantee that?',
]

const integersMarkdown = `# 1 · Integers 🟢

> *"Integers" looks like the most boring chapter in any programming book. It is secretly the most
> important, because it's where you learn how Go **thinks** — about types, about values, and about
> proving your code works.*

**What you'll build:** a one-line \`Add\` function — and around it, the four ideas the rest of Go is made of.

## Big idea: a type is a promise

In Go, **every value has a type, and the type is a promise that the compiler forces you to keep.**

\`\`\`go
var age int = 34
\`\`\`

You are promising: *"\`age\` is an integer, forever."* If you later try \`age = "old"\`, the program
won't even compile.

> **A type is a contract. The compiler is the enforcer.**

## Functions are typed contracts

\`\`\`go
func Add(x, y int) int {
	return x + y
}
\`\`\`

- **The types are part of the signature.** \`Add\` promises: give me two \`int\`s, I'll return one \`int\`.
- **\`(x, y int)\` is shorthand** for \`(x int, y int)\`.
- **The return type comes after the parameters**, before the \`{\`.

## Proving it works: your first test

\`\`\`go
func TestAdd(t *testing.T) {
	cases := []struct {
		name string
		x, y int
		want int
	}{
		{name: "two positives", x: 2, y: 4, want: 6},
		{name: "with zero", x: 9, y: 0, want: 9},
		{name: "a negative", x: 5, y: -3, want: 2},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := Add(c.x, c.y)
			if got != c.want {
				t.Errorf("Add(%d, %d) = %d; want %d", c.x, c.y, got, c.want)
			}
		})
	}
}
\`\`\`

This is a **table-driven test** — the single most important pattern in the whole book.

## 🏋️ Your rep — make it GREEN

Right now \`integers.go\` lies on purpose:

\`\`\`go
func Add(x, y int) int {
	return 0 // TODO: make this correct
}
\`\`\`

Run the tests and watch them fail (RED), fix the one line, then watch RED turn **GREEN**.

## 🧠 Active recall — answer out loud, no peeking

1. In \`func Add(x, y int) int\`, which \`int\` is the return type?
2. Why won't \`Add(2, "four")\` compile?
3. What does \`go test\` do with the \`// Output: 6\` line?
4. Bonus: what does \`var n int\` equal before you assign anything?

## What you learned

- A **type is a promise the compiler enforces**.
- A function signature is a **typed contract**: \`func Name(params) returnType\`.
- **Table-driven tests** + \`t.Run\` are the idiomatic way to test in Go.
- We write tests **first**: **RED → GREEN → REFACTOR**.
`

const arraysMarkdown = `# 3 · Arrays & slices 🟢

> Slices are how Go does "a list of things." Get them in your fingers and half of everyday Go opens up.

**What you'll build:** a \`Sum\` function over a slice of ints, then \`SumAll\` over many slices.

## Big idea: a slice is a window onto an array

An array has a fixed size baked into its type (\`[5]int\`). A **slice** (\`[]int\`) is a flexible view
that can grow with \`append\`. You'll almost always reach for slices.

\`\`\`go
numbers := []int{1, 2, 3}
numbers = append(numbers, 4) // [1 2 3 4]
\`\`\`

## 🏋️ Your rep — make it GREEN

\`\`\`go
func Sum(numbers []int) int {
	return 0 // TODO
}
\`\`\`

Range over the slice and add each value. Watch RED → **GREEN**.

## 🧠 Active recall

1. What's the difference between \`[5]int\` and \`[]int\`?
2. What does \`append\` return, and why must you reassign it?
3. What is the zero value of a slice?
4. How do you ask a slice for its length?

## What you learned

- A slice is a growable window onto a backing array.
- \`append\` returns a (possibly new) slice — always reassign.
- \`range\` is the idiomatic way to walk a slice.
`

const lessons: Record<string, Lesson> = {
  integers: {
    slug: 'integers',
    markdown: integersMarkdown,
    recallQuestions: integersRecall,
    repFiles: {
      stub: 'exercises/integers/integers.go',
      test: 'exercises/integers/integers_test.go',
    },
  },
  arrays: {
    slug: 'arrays',
    markdown: arraysMarkdown,
    recallQuestions: [
      'What’s the difference between `[5]int` and `[]int`?',
      'What does `append` return, and why must you reassign it?',
      'What is the zero value of a slice?',
      'How do you ask a slice for its length?',
    ],
    repFiles: {
      stub: 'exercises/arrays/arrays.go',
      test: 'exercises/arrays/arrays_test.go',
    },
  },
  setup: {
    slug: 'setup',
    markdown:
      '# 0 · Setup 🟢\n\nInstall Go, then build a project, module, and package layout **by hand**. This module has no exercise package — you create the structure yourself, step by step.',
    recallQuestions: [
      'What command starts a new Go module?',
      'What file records your module path and Go version?',
      'How does Go know which folder is a package?',
      'How do you run every test in the module?',
    ],
    repFiles: null,
  },
}

const fallbackLesson = (slug: string): Lesson => ({
  slug,
  markdown: `# ${slug}\n\nThis lesson hasn't been written into the mock fixtures yet. Pick **Integers** or **Arrays & slices** for the full demo.`,
  recallQuestions: [
    'Placeholder recall question 1?',
    'Placeholder recall question 2?',
  ],
  repFiles: {
    stub: `exercises/${slug}/${slug}.go`,
    test: `exercises/${slug}/${slug}_test.go`,
  },
})

// --- mock test runner (RED first, then GREEN) ------------------------------

const greenSlugs = new Set<string>() // tracks which slugs have "passed" this session
let sessionCostUsd = 0.18

const redOutput = (slug: string) => `=== RUN   TestAdd
=== RUN   TestAdd/two_positives
    ${slug}_test.go:18: Add(2, 4) = 0; want 6
=== RUN   TestAdd/with_zero
    ${slug}_test.go:18: Add(9, 0) = 0; want 9
--- FAIL: TestAdd (0.00s)
    --- FAIL: TestAdd/two_positives (0.00s)
    --- FAIL: TestAdd/with_zero (0.00s)
FAIL
FAIL    go-gym/exercises/${slug}   0.184s`

const greenOutput = (slug: string) => `=== RUN   TestAdd
=== RUN   TestAdd/two_positives
=== RUN   TestAdd/with_zero
=== RUN   TestAdd/a_negative
--- PASS: TestAdd (0.00s)
    --- PASS: TestAdd/two_positives (0.00s)
    --- PASS: TestAdd/with_zero (0.00s)
    --- PASS: TestAdd/a_negative (0.00s)
PASS
ok      go-gym/exercises/${slug}   0.201s`

function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

// --- mock API --------------------------------------------------------------

export const mockApi: GymApi = {
  getCurriculum: () => delay(curriculum),

  getLesson: (slug) => delay(lessons[slug] ?? fallbackLesson(slug)),

  getProgress: () => delay(progress),

  runTest: async (slug) => {
    // First run is RED; second run (after the learner "fixes" it) is GREEN.
    const hasRunBefore = greenSlugs.has(slug)
    if (!hasRunBefore) {
      greenSlugs.add(slug)
      const result: TestResult = {
        status: 'red',
        output: redOutput(slug),
        durationMs: 184,
      }
      mockEvents.emit('test_result', { slug, status: 'red', output: result.output })
      return delay(result, 600)
    }
    const result: TestResult = {
      status: 'green',
      output: greenOutput(slug),
      durationMs: 201,
    }
    mockEvents.emit('test_result', { slug, status: 'green', output: result.output })
    mockEvents.emit('celebrate', { reason: 'red_to_green' })
    return delay(result, 600)
  },

  submitQuizAnswer: async (slug, body: QuizAnswerRequest) => {
    // Demo grading: first attempt on Q2 is "wrong" (shows reteach), retry passes.
    const isFirstAttemptOnQ2 = body.question === 2 && body.attempt === 1
    let verdict: QuizVerdict
    if (isFirstAttemptOnQ2) {
      verdict = {
        verdict: 'wrong',
        feedback:
          'Close, but think about *when* the compiler checks types. Try again after the reteach below.',
        reteach:
          'Type mismatches like `Add(2, "four")` are caught at **compile time** — before the program ever runs. The compiler reads the signature `func Add(x, y int) int`, sees you passed a string, and refuses to build. That is the whole point: a type is a promise the compiler enforces *before* runtime.',
      }
    } else {
      verdict = {
        verdict: 'correct',
        feedback: 'Exactly right — that is a clean rep. 💪',
        reteach: null,
      }
    }
    sessionCostUsd += 0.03
    mockEvents.emit('grade_result', {
      slug,
      question: body.question,
      verdict: verdict.verdict,
      feedback: verdict.feedback,
      reteach: verdict.reteach,
    })
    mockEvents.emit('cost_update', { totalCostUsd: Number(sessionCostUsd.toFixed(2)) })
    return delay(verdict, 500)
  },

  completeModule: async (slug) => {
    const finished = new Date().toISOString().slice(0, 10)
    mockEvents.emit('module_complete', { slug, finished })
    mockEvents.emit('celebrate', { reason: 'module_complete' })
    mockEvents.emit('progress_changed', {})
    const updated: Progress = {
      ...progress,
      completed: [...progress.completed],
    }
    return delay(updated, 400)
  },

  sendTutorInput: async (body: TutorInputRequest) => {
    // Stream a fake assistant reply over SSE.
    const isHelp = body.kind === 'help_red_test'
    const reply = isHelp
      ? "Let's read that failure together. RED is information, not a verdict. 🟥\n\nYour test says `Add(2, 4) = 0; want 6` — so `Add` is returning the stub's `0`. The fix is one line: return `x + y` instead of `0`.\n\nMake that change, run the test again, and watch it flip to **GREEN**. 🟩"
      : "Great question. The key idea: a *type is a promise the compiler enforces*. Ask away and we'll work it rep by rep. 💪"

    // Simulate token streaming.
    const tokens = reply.match(/.{1,18}/gs) ?? [reply]
    let i = 0
    const tick = () => {
      if (i < tokens.length) {
        mockEvents.emit('tutor_partial', { text: tokens[i] })
        i += 1
        setTimeout(tick, 60)
      } else {
        mockEvents.emit('tutor_message', { text: reply })
        if (isHelp) {
          mockEvents.emit('hint', {
            level: 1,
            text: 'Look at what the stub returns versus what the test wants.',
          })
        }
        sessionCostUsd += 0.02
        mockEvents.emit('cost_update', {
          totalCostUsd: Number(sessionCostUsd.toFixed(2)),
        })
      }
    }
    setTimeout(tick, 120)
  },
}
