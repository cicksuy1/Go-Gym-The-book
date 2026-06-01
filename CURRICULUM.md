# Curriculum

The single source of truth for module order, status, and the graduation bars. The book sidebar, the
README, and `tools/gen-book.mjs` all follow this list. **To add a module, add it here first.**

**Legend:** ðŸŸ¢ fundamentals re-anchor Â· ðŸ”µ new/advance Â· â­ graduation checkpoint
**Authoring status** (a learner's own progress lives in `progress/PROGRESS.local.md`): â¬œ to-write Â· âœï¸ written

> Each module has its **lesson** at `lessons/â€¹slugâ€º.md` and its **exercise** as the Go package
> `exercises/â€¹slugâ€º/`, which contains `â€¹slugâ€º.go` (`//go:build !solution` stub the learner fixes),
> `â€¹slugâ€º_solution.go` (`//go:build solution` reference, QA only), and `â€¹slugâ€º_test.go` (the table-driven
> test). The repo root is the Go module (see `go.mod`); run a module's test with `go test ./exercises/â€¹slugâ€º/`.
> (Module 0 â€” Setup â€” is lesson-only, no exercise.)

## Part 0 â€” Getting Started

| # | Module | slug | kind | status |
|---|--------|------|------|--------|
| 0 | Setup: install Go, project & package structure | `setup` | ðŸŸ¢ | âœï¸ |

## Part 1 â€” Go Fundamentals

| # | Module | slug | kind | status |
|---|--------|------|------|--------|
| 1 | Integers | `integers` | ðŸŸ¢ | âœï¸ |
| 2 | Iteration | `iteration` | ðŸŸ¢ | âœï¸ |
| 3 | Arrays & slices | `arrays` | ðŸŸ¢ | âœï¸ |
| 4 | Structs, methods & interfaces | `structs` | ðŸŸ¢ | âœï¸ |
| 5 | Pointers & errors | `pointers` | ðŸŸ¢ | âœï¸ |
| 6 | Maps | `maps` | ðŸŸ¢ | âœï¸ |
| 7 | Dependency Injection | `di` | ðŸŸ¢ | â¬œ |
| 8 | Mocking | `mocking` | ðŸŸ¢ | â¬œ |
| 9 | Concurrency | `concurrency` | ðŸ”µ | â¬œ |
| 10 | Select | `select` | ðŸ”µ | â¬œ |
| 11 | Reflection | `reflection` | ðŸ”µ | â¬œ |
| 12 | Sync | `sync` | ðŸ”µ | â¬œ |
| 13 | Context | `context` | ðŸ”µ | â¬œ |
| 14 | Property-based tests | `property` | ðŸ”µ | â¬œ |
| 15 | Maths | `maths` | ðŸ”µ | â¬œ |
| 16 | Reading files | `files` | ðŸ”µ | â¬œ |
| 17 | Templating | `templating` | ðŸ”µ | â¬œ |
| 18 | Generics | `generics` | ðŸ”µ | â¬œ |
| 19 | Revisiting arrays & slices with generics | `generics-revisit` | ðŸ”µ | â¬œ |

## Part 2 â€” Testing Fundamentals

| # | Module | slug | kind | status |
|---|--------|------|------|--------|
| 20 | Intro to acceptance tests | `acceptance` | ðŸ”µ | â¬œ |
| 21 | Scaling acceptance tests | `acceptance-scale` | ðŸ”µ | â¬œ |
| 22 | Working without mocks | `no-mocks` | ðŸ”µ | â¬œ |
| 23 | Refactoring checklist | `refactoring` | ðŸ”µ | â¬œ |

## Part 3 â€” Build an Application

| # | Module | slug | kind | status |
|---|--------|------|------|--------|
| 24 | HTTP server | `http-server` | ðŸ”µ | â¬œ |
| 25 | JSON, routing & embedding | `json` | ðŸ”µ | â¬œ |
| 26 | IO & sorting | `io` | ðŸ”µ | â¬œ |
| 27 | Command line & package structure | `cli` | ðŸ”µ | â¬œ |
| 28 | Time | `time` | ðŸ”µ | â¬œ |
| 29 | WebSockets | `websockets` | ðŸ”µ | â¬œ |

## Part 4 â€” Q&A + Meta

| # | Module | slug | kind | status |
|---|--------|------|------|--------|
| 30 | OS Exec | `os-exec` | ðŸ”µ | â¬œ |
| 31 | Error types | `error-types` | ðŸ”µ | â¬œ |
| 32 | Context-aware Reader | `context-reader` | ðŸ”µ | â¬œ |
| 33 | Revisiting HTTP Handlers | `http-handlers` | ðŸ”µ | â¬œ |
| 34 | Why unit tests (and making them work) | `why-tests` | ðŸ”µ | â¬œ |
| 35 | Anti-patterns | `anti-patterns` | ðŸ”µ | â¬œ |

## Graduation bars

- â­ **Bar 1 â€” Build from scratch:** from a blank file, a worker-goroutine + channel + `select`-with-timeout
  program, with passing tests, unaided. (Lands after the Concurrency â†’ Select â†’ Sync cluster.)
- â­ **Bar 2 â€” Read real code:** open an unfamiliar **Go standard-library** file (e.g. from `sync` or
  `container/list`) cold and narrate every line.
- â­ **Bar 3 â€” Ship something:** build a small but complete app (the Part 3 capstone) end to end.
