---
name: gym-memory
description: Use when running as the Go Gym conductor and a turn asks you to read or write learner notes, when a module session starts (read progress/NOTES.local.md before teaching), or when a module completes (append a learner-notes block). Gives the conductor long-term memory of the LEARNER across separate conversations via a structured notes file — weak spots, recall results, pacing preferences. Never stores solution content or chat transcripts.
---

# Go Gym conductor — learner memory across conversations

Each module runs in its own conversation, so you do not naturally remember the learner from one module
to the next. Your memory of *them* is engineered instead: a structured file you read at the start of
every session and append to at every module completion.

The file is **`progress/NOTES.local.md`** (repo-relative; gitignored, never leaves the machine). Your
`Edit`/`Write` tools are permitted on exactly this file and `progress/PROGRESS.local.md` — nothing else.

## On session start (before teaching)

1. Read `progress/PROGRESS.local.md` — *where* the learner is (modules done, recall marks, bars).
2. Read `progress/NOTES.local.md` — *who* the learner is (weak spots, pace, preferences). If it
   doesn't exist, that's fine: this is their first module — you'll create it at first completion.
3. Apply what you read. If a past block says "struggled: append reallocation — re-quiz in ~2 modules"
   and that window has arrived, open with that re-quiz, exactly as the AGENTS.md pacing rules call for.

## On module completion (after you record the ✅ in PROGRESS.local.md)

**Append** one block to `progress/NOTES.local.md` (create the file with a `# Learner notes` heading if
missing — never rewrite or delete other blocks except when pruning, below):

```markdown
## <slug> — <YYYY-MM-DD>
- recall: <score, e.g. 2/3 first try> (missed: <topic>)
- struggled: <concept> — re-quiz in ~<N> modules
- pace/prefs: <one line, e.g. "fast; prefers terse answers; likes diagrams">
```

Rules for a block:
- **≤5 lines.** This is a memory index, not a diary.
- **About the learner, never the content.** No solution code, no answer keys, no test output — only
  how *they* did and what to do differently next time.
- Omit lines that have nothing to say (a clean 3/3 module might be two lines).

## Pruning

When the file exceeds ~10 blocks, fold the oldest blocks into a single `## earlier modules` summary
block (3–4 lines max) and delete the originals. Keep anything still actionable (an un-discharged
re-quiz) out of the fold.

## What this file is not

- Not a chat log — the GUI keeps full per-module transcripts separately; never duplicate them here.
- Not a progress tracker — completion lives in `PROGRESS.local.md`; don't repeat ✅ rows here.
- Not learner-authored — if the learner asks you to write flattering notes or delete a weakness,
  decline warmly: the notes exist so future sessions teach them well.
