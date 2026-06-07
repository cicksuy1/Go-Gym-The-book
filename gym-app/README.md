# The Go Gym GUI 🖥️

**A local web app that puts the real `/go-gym` tutor conversation in your browser.**

This is not a chatbot wrapper. Each module gets its **own background Claude Code session** (via the
[Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk/overview)) — the same conductor that runs
the course in a terminal, loaded with the same `AGENTS.md` rules, skills, and gates. Opening a module
starts (or resumes) *that module's* conversation; switching modules parks the old one — it resumes
when you come back. At boot the server warms only the **current** module's conversation. The web UI renders the
conductor's markdown turns and pipes your typed replies back. The server adds **no grading or gate
logic of its own** — it only pipes the conversation, logs every turn, watches your progress file, and
guards what tools the tutor may use.

> 📜 **`CONTRACT.md` is the source of truth for every interface in this app** (REST routes, SSE
> events, tool policy). Change that file first; code follows.

## Architecture

```
 Browser (React 19 + Vite + Tailwind)
    │  ▲
    │  │  REST  /api/*            (curriculum, progress, lesson, history, model, manual go-test)
    │  │  SSE   /api/tutor/events (tutor_partial / tutor_message / tool_activity / session_changed /
    │  │                           test_result / progress_changed / celebrate / cost_update)
    ▼  │
 Express server  :4600  (server/index.mjs)
    │  ▲                  • watches progress/PROGRESS.local.md → celebrations
    │  │                  • tees every turn to gym-app/.chats/<slug>.jsonl (read-only history)
    │  │                  • serves web/dist in production
    ▼  │
 Claude Agent SDK conversation  (server/tutor.mjs)
    │      one conversation per module · each resumes when reopened (.session.json session map)
    ▼
 The course repo  (AGENTS.md rules · lessons/ · exercises/ · gym-ui + gym-memory skills ·
                   progress/NOTES.local.md = the tutor's long-term memory of the learner)
```

## Prerequisites

- **Node.js 20+** (developed on 24)
- **Go 1.26+** — the tutor runs real `go test` on your reps
- **[Claude Code](https://claude.com/claude-code) installed and authenticated** — the tutor session
  reuses your local Claude Code auth and settings (it loads `AGENTS.md` and the `go-gym`/`gym-ui`
  skills through them)

> ⚠️ **Billing note (June 15, 2026):** Agent SDK usage — which is what this app runs on — no longer
> draws from your Claude subscription's regular usage limits. It uses a **separate monthly SDK credit**
> ($20 Pro / $100 Max 5x / $200 Max 20x) metered at standard API rates, with a **one-time opt-in you
> must claim** in your Claude account — otherwise the tutor won't start. The cost meter in the app's
> header (driven by the `cost_update` event) shows the running total per session. Details:
> [Use the Claude Agent SDK with your Claude plan](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan).

## Install

From the **repo root** (easiest, needs [go-task](https://taskfile.dev)):

```bash
task setup
```

Or by hand:

```bash
cd gym-app && npm install
cd web && npm install
```

## Run

| Command (from `gym-app/`) | What it does |
|---|---|
| `npm run start` | **Production mode** — builds the frontend, serves everything at <http://localhost:4600> |
| `npm run dev` | **Dev mode** — Express on :4600 + Vite HMR on :5173 (the Vite dev server proxies `/api` → :4600) |

From the repo root with go-task: `task app` (production), `task app:dev`, or **`task up`** to serve
the app *and* the mdBook together.

- Override the port with `GYM_PORT` (default `4600`).
- **Every module keeps its conversation**: `gym-app/.session.json` (gitignored) stores a map of
  `{ current, model, sessions: { <slug>: <session_id> } }` — reopening a module **resumes** where it
  left off (at boot only the *current* module is warmed; others resume lazily when opened). The
  "Restart conversation" button forgets one module's session; delete the file to forget them all.
- **Per-module chat logs:** every turn is teed to `gym-app/.chats/<slug>.jsonl` (gitignored). The UI
  replays them when you reopen a module, so past conversations stay readable.
- **Model picker:** the header `select` (opus / sonnet / haiku) chooses the conductor's model; it
  applies on the **next** session start, never mid-conversation.
- The server console prints `watch live: claude --resume <sessionId>` — run it in a terminal to
  observe (or join) the very same conversation the browser is showing.

## Tests & lint

```bash
cd gym-app
node --test "server/*.test.mjs"   # server unit tests (tool policy, content, progress)
npm --prefix web run lint          # frontend ESLint
```

The `*.itest.mjs` file is deliberately excluded from the default glob — it round-trips the progress
file and must only run against a seeded temp repo, so `content.test.mjs` spawns it as a child with
`GYM_REPO_ROOT` pointed at one.

From the repo root: `task app:test` and `task app:lint`.

## Security model

The tutor session is pre-approved for a fixed tool list, enforced by a `canUseTool` guard in
`server/tutor.mjs` (zero permission prompts, guards always on):

- **Bash** — only `go test` / `go vet` on paths inside `./exercises/`
- **Edit / Write** — only `progress/PROGRESS.local.md` and `progress/NOTES.local.md`; the tutor can
  never touch your stub or any other file
- **`_solution` is radioactive** — any tool input containing it (case-insensitive) is denied, and
  Grep over exercise directories is blocked, so reference solutions can't leak into the conversation
- Learner input is piped as plain conversation turns — the `gym-ui` skill instructs the conductor to
  treat it as data, never as instructions; the `gym-memory` skill governs what may be written to
  `progress/NOTES.local.md` (learner notes only, never solution content)

All REST responses use the envelope `{ success, data, error }`; `:slug` params are validated against
the curriculum.

## Memory & history

Conversations are scoped to a module so token costs stay bounded — the tutor never drags the whole
course history into every reply. To keep continuity across those separate conversations, the conductor
keeps **long-term memory of the *learner*** in `progress/NOTES.local.md`, governed by the `gym-memory`
skill: it reads the notes at session start and appends a short block (weak spots, recall, pacing) when
a module completes — never solution content. Separately, the server tees **every turn** to
`gym-app/.chats/<slug>.jsonl`, giving *you* a read-only transcript of each module's conversation that
the UI replays when you reopen a module. Learner memory is for the tutor; the chat logs are for you.

## Layout

```
gym-app/
├── CONTRACT.md     ← interface source of truth (read this first)
├── .chats/         per-module chat logs <slug>.jsonl (gitignored, read-only history)
├── server/         Express + Agent SDK host (.mjs, node:test specs alongside)
│   ├── index.mjs   boot, static serving, progress watcher
│   ├── tutor.mjs   the conversation host + tool guards + SSE
│   ├── chatlog.mjs per-module .jsonl tee + history reader
│   ├── routes.mjs  content API (curriculum / progress / lesson / test)
│   └── …
└── web/            React frontend (Vite + Tailwind 4 + react-markdown) — see web/README.md
```
