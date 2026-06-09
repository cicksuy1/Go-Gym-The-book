---
name: gym-coach
description: Use when running as the Go Gym conductor to adapt HOW you teach a specific learner. Triggers at session start (read progress/STRATEGY.local.md and apply it to recall lead, comparisons, pacing, and hints) and at module completion (run a short reflection, then rebuild the strategy). Tunes delivery only — never the modules, exercises, or graduation bar. Pairs with gym-memory (which owns the factual per-module notes).
---

# Go Gym conductor — per-learner teaching strategy

gym-memory remembers *who the learner is* (facts: recall scores, struggles, re-quiz debts).
**gym-coach decides *how to teach them*** — and, crucially, makes that decision *act* on the next
session instead of being re-derived from scratch each time.

This skill sits **on top of** `AGENTS.md`. AGENTS.md (the 5-step Tutor loop, the four modes, the
**hard gates**) is the invariant and is never yours to tune. You adapt only the *delivery* — the
ramp, never the gate.

- **Base rules (static, never rewritten):** `references/strategy-base.md` — the four levers, their
  defaults and adjustment ranges, and the guardrails. Read it; it is the law this skill operates
  under.
- **Per-learner strategy (you maintain this):** `progress/STRATEGY.local.md` — a short, rewritten-
  each-module block of concrete delivery directives for *this* learner. It is one of the three files
  you may write (`PROGRESS.local.md`, `NOTES.local.md`, `STRATEGY.local.md`); gitignored, never
  leaves the machine.

## On session start (apply the strategy)

After the gym-memory reads (`PROGRESS.local.md`, `NOTES.local.md`):

1. Read `progress/STRATEGY.local.md`. If it's missing, copy `progress/STRATEGY.template.md` to it
   (or create it from the format in `strategy-base.md`) — and if `NOTES.local.md` already has
   completed-module blocks, seed the strategy from them rather than starting blank.
2. Read `references/strategy-base.md` so you know the bounds.
3. **Let the strategy set this session's delivery** — *before* you start teaching, decide from it:
   - which recall question / modality you'll **lead** with,
   - whether to deploy **side-by-side comparisons** and how hard to probe the **"why"**,
   - your **pacing** (modules this sitting) and **hint** aggressiveness.
4. Honor the guardrails regardless: keep the graduation bar identical, and plan **at least one cold,
   un-cued recall** this session. If a spaced re-quiz is due (gym-memory), discharge it in a
   *switched* modality to test known-vs-cued.

The strategy is a *default lead*, not a script — what the live turn shows always overrides it.

## On module completion (gather → reshape) — BEFORE you record the ✅

Order matters and mirrors gym-memory's rule: the ✅ can end the session, and the reflection needs a
learner reply, so both happen first. Sequence:

1. **Gates pass** — `go test` GREEN (you ran it) and recall answered correctly.
2. **Reflection turn** — ask the learner 2–3 short questions and *end the turn* so they can answer:
   - *What was the hardest part of this one?*
   - *What finally made it click?*
   - *Anything about how I taught it you'd change for next time?*
3. **Reshape** — combine their answer with what you **observed** (which recall they missed and how,
   the questions they asked, how much hinting they needed). Rewrite `progress/STRATEGY.local.md` from
   the `strategy-base.md` defaults + the accumulated evidence: one concrete line per lever, the
   guardrail line, and `updated: <YYYY-MM-DD> from <slug>`. **Rewrite, don't append** — it's a living
   control input, not a log.
4. **gym-memory** appends its factual ≤5-line `NOTES.local.md` block (unchanged).
5. **Then** mark ✅ in `PROGRESS.local.md`.

## The four levers (full detail in `references/strategy-base.md`)

1. **Recall lead & modality** — reorder/reframe step-4 recall to open on the learner's soft spot in
   the modality that lands; never drop questions.
2. **Why-depth & comparisons** — how hard to probe the "why"; when to use side-by-side framings.
3. **Pacing & hints** — modules per sitting; how soon you name the gap vs re-explain.
4. **Re-quiz modality switch** — discharge spaced re-quizzes in a changed format.

## Guardrails (from `strategy-base.md` — enforce them)

- **Adapt the ramp, never the gate.** Bar and hard gates are identical for everyone.
- **Always ≥1 cold, un-cued recall** per session.
- **Target the gap, not the comfort zone** — a liked format is no reason to pass a fuzzy answer.
- **Thin-data humility** — the live turn overrides the written strategy.

## What this is NOT

- **Not a content tool.** Never edit a lesson, exercise, test, or the graduation bar to fit a
  learner. Chapter-quality feedback is a separate, human-driven path and does not live here.
- **Not a gate.** Adapting delivery never lowers the bar; learner preferences never satisfy a gate.
- **Not solution storage, not a transcript.** No answer keys, no test output, no chat log — only how
  to *teach* this learner.
- **Not gym-memory.** Facts about the learner stay in `NOTES.local.md`; this file is only the
  forward-looking delivery strategy.
