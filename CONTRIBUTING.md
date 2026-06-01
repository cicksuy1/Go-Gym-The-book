# Contributing to The Go Gym

Thanks for helping make Go approachable! Most contributions are **new or improved chapters**. The course
is designed so an AI agent (in *Author mode*, see `AGENTS.md`) does the heavy lifting — but here's the
standard so humans and agents agree.

## A chapter = a lesson + an exercise

Each module's **lesson** lives at `lessons/<slug>.md`, and its **exercise** is the Go package
`exercises/<slug>/` (the repo root is the Go module — see `go.mod`). Together they ship four files:

| File | Build tag | Purpose |
|------|-----------|---------|
| `lessons/<slug>.md` | — | the lesson (the **10-section anatomy** below) |
| `exercises/<slug>/<slug>.go` | `//go:build !solution` | the **stub** the learner fixes (wrong/empty on purpose) |
| `exercises/<slug>/<slug>_solution.go` | `//go:build solution` | the **reference solution** (QA only) |
| `exercises/<slug>/<slug>_test.go` | — | the **table-driven test** (fails against the stub) |

The two build-tagged `.go` files are mutually exclusive, so `Add` (etc.) is never declared twice:
- `go test ./exercises/<slug>/` compiles the **stub** → should be **RED**.
- `go test -tags solution ./exercises/<slug>/` compiles the **reference** → should be **GREEN**.

(Module 0 — Setup — is the exception: it's a guided hands-on with no exercise package.)

## The 10-section chapter anatomy

1. Hook · 2. Where we're going · 3. The big idea (mental model before syntax) · 4. The details (call out
the traps) · 5. Worked runnable code (show output) · 6. Prove it with a test (and *why* it's shaped that
way) · 7. 🏋️ Your rep (RED→GREEN + stretch goals) · 8. 🧠 Active recall (no-peek questions) · 9. 🔍 Real
code in the wild (real Go code, e.g. the standard library) · 10. What you learned + what's next.

Voice: warm, why-first, Rust-Book style. No terse bullet-dumps. **Write for a generic public reader:**
instructional "you" is good ("you'll build…"), but never attribute a personal history/motive/goal to the
reader ("you said you wanted…", "the thing you were missing") or reference private project context.

## Steps to add a module

1. **Add it to `CURRICULUM.md` first** (number, title, `slug`, kind). That file is the source of truth.
2. Create the lesson + exercise files above (copy `lessons/integers.md` and `exercises/integers/` as the template).
3. Run `node tools/gen-book.mjs` to wire it into the book sidebar.
4. Self-check with the QA checklist below.

## QA checklist (must all pass before a PR)

- [ ] `go test ./exercises/<slug>/` is **RED** (stub fails → the test has teeth).
- [ ] `go test -tags solution ./exercises/<slug>/` is **GREEN** (reference solves it → it's solvable).
- [ ] `mdbook build book` is clean; the chapter shows in the sidebar; links resolve.
- [ ] The lesson hits all **10 anatomy sections**.
- [ ] **Standalone:** the chapter teaches with Go + the standard library only — no external or private
      project code.
- [ ] **Generic voice:** no reader-personal history/motive ("you said you wanted…") and no private-context
      references (real people, the author's other projects, "like we discussed").

## Code style

Standard Go: `gofmt` everything (tabs, not spaces, in `.go` files). Keep stubs minimal and tests
table-driven. Prose lines wrapped ~100 cols.

## Licensing of contributions

By contributing you agree your work is released under the repo's [MIT license](LICENSE).
