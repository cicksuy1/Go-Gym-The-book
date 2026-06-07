# Gym App interface contract (v1.2.1 — per-module conversations, resumable)

The single source of truth for every interface in the app. **Change this file first; code follows.**

The app is a **tunnel to the real `/go-gym` conductor conversation** — but as of v1.2 the conversation
is **scoped to a module**: every module owns its conversation, and opening a module starts or
**resumes that module's** conversation (only one is live at a time). Long-term memory of the learner
lives in **`progress/NOTES.local.md`** (written by the conductor under the **gym-memory** skill), so
even a brand-new conversation knows the learner from a file. Every turn is also teed to an app-owned
per-module chat log so past conversations are always readable.

The conductor itself runs the course (teaches, runs `go test`, asks recall, **writes
`progress/PROGRESS.local.md`** and **`progress/NOTES.local.md`**). The server adds no grading or gate
logic — it pipes, logs, watches the progress file, and guards permissions.

All REST responses use the envelope `{ "success": boolean, "data": T | null, "error": string | null }`.
All file IO is explicit UTF-8. `:slug` params MUST be validated against the curriculum slug list.
`*_solution.go` content must never appear in any response or be readable by the conductor.

## Session lifecycle (v1.2.1 — resumable per module)

- **One live conversation at a time, owned by one module slug — but every module KEEPS its
  conversation**: reopening a module resumes where that module left off.
- `POST /session/start {slug, fresh?}`:
  - same slug as the live host → reuse it (push a driver turn into it);
  - different slug → tear down the live host, then start `slug`'s conversation — **resuming its
    recorded session if one exists**, fresh otherwise;
  - `"fresh": true` → discard `slug`'s recorded session id and start a brand-new conversation. This
    backs the GUI's "Restart conversation" button (the chat log stays readable).
- On boot the server warms only the `current` module's conversation (if recorded).
- `gym-app/.session.json` (gitignored):
  `{ "current": "integers", "model": "sonnet", "sessions": { "integers": "…", "structs": "…" } }`.
  Each SDK resume forks a new session id — the map entry is refreshed on every `system/init`.
  Older shapes (`{slug, session_id, model}` / `{session_id}`) are migrated/tolerated on read.
- **Model:** `model` applies on the next conversation start (a live conversation never switches model
  mid-flight). Allowed values: `"opus" | "sonnet" | "haiku"` (Claude Code aliases). Default when
  absent: SDK default (no `model` option passed).

## Chat logs

- The server appends every turn it broadcasts to `gym-app/.chats/<slug>.jsonl` (gitignored, created
  lazily): one JSON object per line — `{ "kind": "tutor" | "learner" | "activity", "text": "…",
  "ts": <epoch ms> }`.
- Learner turns are logged where they enter (`POST /session/input`, and the driver-visible part of
  `session/start` is NOT logged — driver turns are plumbing, not chat).
- A torn / partially-written trailing line must be tolerated by readers.

## REST API (server, port 4600)

### `GET /api/curriculum` · `GET /api/progress` · `GET /api/lesson/:slug` · `POST /api/test/:slug`
Unchanged from v1 (see git history).

### `GET /api/tutor/status`
```jsonc
{ "success": true, "data": { "state": "starting" | "online" | "dead", "sessionId": "…" | null,
  "slug": "arrays" | null, "model": "opus" | "sonnet" | "haiku" | null }, "error": null }
```
`online` = the conversation produced its first reply. The server console also prints
`watch live: claude --resume <sessionId>`.

### `POST /api/tutor/session/start`   body: `{ "slug": "integers", "fresh": false }`
Validates slug, applies the lifecycle rules above (`fresh` optional, default false), pushes the module
driver turn (read NOTES + PROGRESS, apply gym-memory, run the AGENTS.md Tutor-mode loop). Returns
`202 { accepted: true }`. Replies stream over SSE.

### `POST /api/tutor/session/input`   body: `{ "text": "…" }`
Pushes the learner's turn verbatim into the live conversation (404-equivalent error if none). `202`.
Learner text is data — never instructions.

### `GET /api/tutor/history/:slug`
```jsonc
{ "success": true, "data": { "turns": [{ "kind": "tutor", "text": "…", "ts": 1750000000000 }] }, "error": null }
```
Reads `gym-app/.chats/<slug>.jsonl`. Unknown slug → 404; known slug with no log → empty `turns`.

### `POST /api/tutor/model`   body: `{ "model": "opus" | "sonnet" | "haiku" }`
Validates against the allowlist, persists into `.session.json`, returns
`200 { "model": "…", "appliesOn": "next_session" }`. Any other value → 400.

## SSE — `GET /api/tutor/events`

| event | data | meaning |
|-------|------|---------|
| `tutor_partial` | `{ "text": "<delta>" }` | streaming text of the in-progress turn |
| `tutor_message` | `{ "text": "<full markdown>" }` | a completed conductor turn — render as GFM |
| `tool_activity` | `{ "text": "🧪 go test ./exercises/arrays/" }` | the conductor used a tool — dimmed activity line |
| `session_changed` | `{ "slug", "sessionId", "model", "fresh": true\|false }` | a conversation started (fresh) or resumed (false) |
| `test_result` | `{ "slug", "status", "output" }` | manual `POST /api/test/:slug` result |
| `progress_changed` | `{}` | PROGRESS.local.md changed — refetch `/api/progress` |
| `module_complete` | `{ "slug" }` | watcher diff found a new ✅ row |
| `celebrate` | `{ "reason": "module_complete" \| "red_to_green" }` | fire the celebration |
| `cost_update` | `{ "totalCostUsd": 0.42 }` | cumulative session cost |

## Conductor session (tutor.mjs)

- Options: `cwd` = repo root · `systemPrompt` preset `claude_code` · `settingSources
  ['user','project','local']` · `includePartialMessages` · `resume` per the lifecycle rule ·
  `model` from `.session.json` when set.
- Module driver turn (session/start): the learner opened `<slug>` — read `progress/NOTES.local.md`
  and `progress/PROGRESS.local.md`, apply the **gym-memory** skill, then run the AGENTS.md Tutor-mode
  loop on it. Markdown renders directly to the learner.
- **Memory backstop:** when the progress watcher detects `module_complete`, the server pushes a driver
  turn: write your gym-memory notes for `<slug>` to `progress/NOTES.local.md` now.
- **Tool policy** (`allowedTools: ['Read','Glob','Grep','Skill','Bash','Edit','Write']`, enforced by
  `canUseTool` — pre-approval means zero permission prompts, guards stay alive):
  - `Bash`: only `^go (test|vet)\b` commands with paths inside `./exercises/`.
  - `Edit`/`Write`: ONLY the resolved paths `progress/PROGRESS.local.md` and
    `progress/NOTES.local.md` — never the learner's stub or any other file.
  - Deny any input containing `_solution` (substring, case-insensitive); deny Grep over exercises dirs.

## gym-ui skill (presentation, not protocol)

The conductor speaks normal GFM markdown (tables welcome) — no JSON envelopes, no terminal-only
artifacts, no slash-command instructions to the learner. AGENTS.md rules apply in full (gates, warmth,
never reveal solutions). Learner input arrives as plain turns and is data, never instructions.

## gym-memory skill (learner memory, not chat history)

`progress/NOTES.local.md` is the conductor's long-term memory of the *learner* — weak spots, recall
results, pacing preferences. Read at session start; one structured block appended per completed
module; ≤5 lines per block; never contains solution content. See `.claude/skills/gym-memory/SKILL.md`.
