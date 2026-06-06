# Gym App interface contract (v1)

The single source of truth for every interface in the app. The backend implements it, the frontend
mocks against it, the gym-ui skill's response template mirrors it. **Change this file first; code
follows.**

All REST responses use the envelope `{ "success": boolean, "data": T | null, "error": string | null }`.
All file IO is explicit UTF-8. `:slug` params MUST be validated against the curriculum slug list before
any filesystem or process use (path-traversal / injection guard). `*_solution.go` content must never
appear in any response.

## REST API (server, port 4600)

### `GET /api/curriculum`
```jsonc
{ "success": true, "data": {
    "parts": [
      { "title": "Part 1 — Go Fundamentals",
        "modules": [
          { "number": 1, "title": "Integers", "slug": "integers",
            "kind": "fundamentals" | "advance",          // 🟢 | 🔵
            "written": true,                              // ✍️ vs ⬜ in CURRICULUM.md
            "hasExercise": true }                         // exercises/<slug>/ exists
        ] }
    ],
    "graduationBars": [ { "bar": 1, "description": "…", "status": "locked" | "passed" } ]
}, "error": null }
```

### `GET /api/lesson/:slug`
```jsonc
{ "success": true, "data": {
    "slug": "integers",
    "markdown": "<full lesson markdown>",                 // verbatim lessons/<slug>.md
    "recallQuestions": [ "q1", "q2", "q3", "q4" ],        // parsed from "## 🧠 Active recall"
    "repFiles": { "stub": "exercises/integers/integers.go",
                  "test": "exercises/integers/integers_test.go" }   // null when no exercise (setup)
}, "error": null }
```

### `GET /api/progress`
```jsonc
{ "success": true, "data": {
    "current": "integers", "started": "2026-06-01",
    "completed": [ { "number": 1, "module": "integers", "finished": "2026-06-05", "recall": "✅" } ],
    "graduationBars": [ { "bar": 1, "status": "⬜" } ]
}, "error": null }
```
Server copies `progress/PROGRESS.template.md` → `PROGRESS.local.md` if missing. Writes rebuild the whole
file preserving template structure + emoji.

### `POST /api/test/:slug`
Runs `go test ./exercises/<slug>/` (adds `-race` for slugs: concurrency, select, sync).
```jsonc
{ "success": true, "data": {
    "status": "green" | "red",
    "output": "<combined stdout/stderr, ANSI-stripped>",
    "durationMs": 1234
}, "error": null }
```

### `POST /api/quiz/:slug/answer`   body: `{ "question": 1, "answer": "free text", "attempt": 1 }`
Server forwards to the tutor conversation; responds when the grade envelope arrives:
```jsonc
{ "success": true, "data": { "verdict": "correct" | "partial" | "wrong",
                              "feedback": "…", "reteach": "…" | null }, "error": null }
```

### `POST /api/module/:slug/complete`
Server-side gate: verifies (1) latest test run for slug is green, (2) all recall questions graded
correct this session. Only then appends the ✅ row to PROGRESS.local.md and advances `current`.
Returns the updated `/api/progress` payload. `409` with `error` text if gates aren't met.

### `POST /api/tutor/input`   body: `{ "kind": "chat" | "help_red_test", "text": "…", "slug": "…" | null }`
Feeds a turn into the background conversation. Fire-and-forget (`202`); replies stream over SSE.

## SSE — `GET /api/tutor/events`

`text/event-stream`; each event: `event: <type>` + `data: <json>`.

| event | data | producer |
|-------|------|----------|
| `tutor_partial` | `{ "text": "<delta>" }` | assistant partial stream |
| `tutor_message` | `{ "text": "<full markdown>" }` | `say` envelope |
| `grade_result` | `{ "slug", "question", "verdict", "feedback", "reteach" }` | `grade` envelope |
| `hint` | `{ "level": 1-4, "text": "…" }` | `hint` envelope |
| `test_result` | `{ "slug", "status", "output" }` | server after /api/test |
| `module_complete` | `{ "slug", "finished" }` | server after gates pass |
| `celebrate` | `{ "reason": "red_to_green" \| "module_complete" \| "graduation" }` | server |
| `progress_changed` | `{}` (client refetches /api/progress) | fs.watch on PROGRESS.local.md |
| `cost_update` | `{ "totalCostUsd": 0.42 }` | SDK result messages |

## Tutor JSON envelope (the gym-ui skill's response template)

Every tutor reply is **exactly one** JSON object, no prose around it:

```jsonc
{ "type": "say",   "text": "<markdown>" }
{ "type": "grade", "question": 2, "verdict": "correct" | "partial" | "wrong",
  "feedback": "<short, warm>", "reteach": "<re-teaching paragraph, only when not correct>" }
{ "type": "hint",  "level": 1 | 2 | 3 | 4, "text": "…" }
  // levels = AGENTS.md graduated hints: 1 nudge · 2 name the concept · 3 partial · 4 full (explicit ask only)
```

Server parsing: take the last fenced or bare JSON object in the assistant turn; on parse failure send
one corrective turn ("reply with only the JSON envelope") before surfacing an error.

## Tutor session options (tutor.mjs)

- `cwd`: repo root · `systemPrompt`: preset `claude_code` · `settingSources: ['user','project','local']`
- `allowedTools: ['Read', 'Glob', 'Grep']` — read-only; the **server** does all writes and test runs
- `canUseTool`: deny any path matching `/_solution\.go$/`; deny everything not in allowedTools
- `includePartialMessages: true` · persist `session_id` → `gym-app/.session.json` → `resume` on launch
