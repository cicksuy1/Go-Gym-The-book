# Curriculum

The single source of truth for module order, status, and the graduation bars. The book sidebar, the
README, and `tools/gen-book.mjs` all follow this list. **To add a module, add it here first.**

**Legend:** 🟢 fundamentals re-anchor · 🔵 new/advance · ⭐ graduation checkpoint
**Authoring status** (a learner's own progress lives in `progress/PROGRESS.local.md`): ⬜ to-write · ✍️ written

> Each module is a folder at the **repository root** (the repo root is the Go module — see `go.mod`),
> named by its `slug`, and contains: `‹slug›.md` (the lesson),
> `‹slug›.go` (`//go:build !solution` stub the learner fixes), `‹slug›_solution.go` (`//go:build solution`
> reference, QA only), and `‹slug›_test.go` (the table-driven test).

## Part 0 — Getting Started

| # | Module | slug | kind | status |
|---|--------|------|------|--------|
| 0 | Setup: install Go, project & package structure | `setup` | 🟢 | ✍️ |

## Part 1 — Go Fundamentals

| # | Module | slug | kind | status |
|---|--------|------|------|--------|
| 1 | Integers | `integers` | 🟢 | ✍️ |
| 2 | Iteration | `iteration` | 🟢 | ✍️ |
| 3 | Arrays & slices | `arrays` | 🟢 | ⬜ |
| 4 | Structs, methods & interfaces | `structs` | 🟢 | ⬜ |
| 5 | Pointers & errors | `pointers` | 🟢 | ⬜ |
| 6 | Maps | `maps` | 🟢 | ⬜ |
| 7 | Dependency Injection | `di` | 🟢 | ⬜ |
| 8 | Mocking | `mocking` | 🟢 | ⬜ |
| 9 | Concurrency | `concurrency` | 🔵 | ⬜ |
| 10 | Select | `select` | 🔵 | ⬜ |
| 11 | Reflection | `reflection` | 🔵 | ⬜ |
| 12 | Sync | `sync` | 🔵 | ⬜ |
| 13 | Context | `context` | 🔵 | ⬜ |
| 14 | Property-based tests | `property` | 🔵 | ⬜ |
| 15 | Maths | `maths` | 🔵 | ⬜ |
| 16 | Reading files | `files` | 🔵 | ⬜ |
| 17 | Templating | `templating` | 🔵 | ⬜ |
| 18 | Generics | `generics` | 🔵 | ⬜ |
| 19 | Revisiting arrays & slices with generics | `generics-revisit` | 🔵 | ⬜ |

## Part 2 — Testing Fundamentals

| # | Module | slug | kind | status |
|---|--------|------|------|--------|
| 20 | Intro to acceptance tests | `acceptance` | 🔵 | ⬜ |
| 21 | Scaling acceptance tests | `acceptance-scale` | 🔵 | ⬜ |
| 22 | Working without mocks | `no-mocks` | 🔵 | ⬜ |
| 23 | Refactoring checklist | `refactoring` | 🔵 | ⬜ |

## Part 3 — Build an Application

| # | Module | slug | kind | status |
|---|--------|------|------|--------|
| 24 | HTTP server | `http-server` | 🔵 | ⬜ |
| 25 | JSON, routing & embedding | `json` | 🔵 | ⬜ |
| 26 | IO & sorting | `io` | 🔵 | ⬜ |
| 27 | Command line & package structure | `cli` | 🔵 | ⬜ |
| 28 | Time | `time` | 🔵 | ⬜ |
| 29 | WebSockets | `websockets` | 🔵 | ⬜ |

## Part 4 — Q&A + Meta

| # | Module | slug | kind | status |
|---|--------|------|------|--------|
| 30 | OS Exec | `os-exec` | 🔵 | ⬜ |
| 31 | Error types | `error-types` | 🔵 | ⬜ |
| 32 | Context-aware Reader | `context-reader` | 🔵 | ⬜ |
| 33 | Revisiting HTTP Handlers | `http-handlers` | 🔵 | ⬜ |
| 34 | Why unit tests (and making them work) | `why-tests` | 🔵 | ⬜ |
| 35 | Anti-patterns | `anti-patterns` | 🔵 | ⬜ |

## Graduation bars

- ⭐ **Bar 1 — Build from scratch:** from a blank file, a worker-goroutine + channel + `select`-with-timeout
  program, with passing tests, unaided. (Lands after the Concurrency → Select → Sync cluster.)
- ⭐ **Bar 2 — Read real code:** open an unfamiliar **Go standard-library** file (e.g. from `sync` or
  `container/list`) cold and narrate every line.
- ⭐ **Bar 3 — Ship something:** build a small but complete app (the Part 3 capstone) end to end.
