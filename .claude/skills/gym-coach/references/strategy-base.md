# gym-coach base rules — the levers and the guardrails

This is the **static base** the per-learner strategy is built on. The conductor never rewrites this
file; it rewrites `progress/STRATEGY.local.md` *within* the bounds set here. If `STRATEGY.local.md`
and these rules ever disagree, these rules win.

The invariant beneath everything is **`AGENTS.md` Tutor mode**: the 5-step loop and the hard gates
(GREEN test + recall answered correctly) are not yours to tune. You adapt **how you guide a learner
to the bar**, never the bar itself.

## The four levers (the only things the strategy may reshape)

Each lever has a **default** (what you do with no signal) and an **adjustment range** (how far
evidence may move it). Everything here is about *delivery* — never the module content, the exercise,
or the graduation bar.

1. **Recall lead & modality** — the order and format of step-4 active recall.
   - *Default:* ask the chapter's recall questions in their written order.
   - *Adapt:* open with the learner's known soft spot, in the modality that lands for them. A learner
     who nails mechanics but fumbles the "why" → lead with the conceptual/Socratic question while
     they're fresh. A learner shaky on mechanics → lead with a concrete code-trace ("what does this
     print, line by line?"). Never *drop* questions — only reorder and reframe them.

2. **Why-depth & comparisons** — how hard to probe the conceptual "why", and when to reach for a
   side-by-side comparison.
   - *Default:* ask the "why" once; accept a clear answer and move on.
   - *Adapt:* for a learner whose "why" repeatedly slips into a vaguer answer, probe a second time and
     name the precise gap before re-asking. Use side-by-side framings (Go vs another language,
     correct vs deliberately-broken) where the notes say comparisons land.

3. **Pacing & hints** — modules per sitting, and how graduated the hints are.
   - *Default:* 1–2 modules per sitting; hints graduate nudge → name the concept → partial → full
     (full only on an explicit ask).
   - *Adapt:* if a learner consistently gets unstuck once the gap is *named* (vs re-explained), bias
     toward naming sooner; if they're tired or it was a hard win, stop on the win.

4. **Re-quiz modality switch** — when discharging a spaced re-quiz (the gym-memory `re-quiz in ~N
   modules` debt), deliberately change the question's format from how it was first taught/answered.
   - *Default:* re-ask the concept directly.
   - *Adapt:* if it first landed Socratically, discharge it as a blunt cold prompt (and vice-versa).
     Passing *across a modality switch* proves the concept is **known**, not merely **cued**.

## Guardrails (non-negotiable — they bound every adaptation above)

- **Adapt the ramp, never the gate.** Personalize the entry-point, order, and modality. The
  graduation bar and the hard gates (GREEN test + correct recall) are identical for every learner.
- **Always ≥1 cold, un-cued check per session.** Whatever the learner's preferred modality, at least
  one recall must be asked cold — no re-reading, no comfortable ramp. This is the integrity probe
  against teaching-to-comfort and against the learner memorizing your *question format* instead of
  the concept.
- **Target the gap, not the comfort zone.** Adaptation exists to train the weak muscle, not to
  pander to a preference. If a learner "likes" a format, that is not a reason to let a fuzzy answer
  pass in it. (Cautionary case: a learner whose testability answer kept slipping to "generic/flexible"
  needed the gap *pressed*, not smoothed over.)
- **Thin-data humility.** The strategy is a *default lead*, not a law. One noisy session never becomes
  doctrine; whatever the live turn shows overrides the written strategy cheaply.
- **Delivery only.** Never edit the lesson, the exercise, the test, or the graduation bar to fit a
  learner. Chapter-quality feedback is a separate, human-driven path — it does not live here.

## The block format you maintain (`progress/STRATEGY.local.md`)

Rewrite (don't append) one short, concrete line per lever, plus the guardrail line and an `updated`
stamp. Keep it scannable — it's a control input you read at session start, not a diary.

```markdown
# How to teach me   <!-- maintained by gym-coach; rebuilt each module from strategy-base.md + reflection + inference -->
- recall lead: conceptual "why" first (Socratic), then mechanics — mechanics land fast; the "why" needs one nudge
- why-depth & comparisons: probe the "why" twice and name the gap; lead abstract claims with a side-by-side — reliably lands
- pacing & hints: 1–2 modules/sitting; on a miss, name the gap precisely then re-ask (re-explaining alone doesn't stick)
- re-quiz: on discharge, switch modality — if taught Socratically, re-ask cold/blunt to test known-vs-cued
- guardrail: graduation bar unchanged; ≥1 cold, un-cued recall every session
- updated: 2026-06-08 from mocking
```
