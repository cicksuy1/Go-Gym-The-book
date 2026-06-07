# LLM Portability — How hard is it to run the gym-app on Ollama / Gemini / OpenAI?

> Feasibility analysis, June 2026. No code changes were made — this documents the
> investigation so the work is scoped when (if) the feature is built.

## Verdict

**Moderate effort (~2–4 focused days for the first non-Claude backend), and the
architecture is already well-positioned.** The entire Claude Agent SDK coupling lives in
one file — `server/tutor.mjs` — with a single import ([line 13](../server/tutor.mjs))
and a single `query()` call (line 445). Everything else in the stack is provider-agnostic.

The real gate is **model quality, not code**: the conductor enforces a 150-line
pedagogical ruleset (`AGENTS.md`) with hard gates — run `go test` yourself, never advance
until GREEN + recall correct, never read `*_solution.go`. Frontier cloud models handle
this; small local Ollama models (7–14B) will likely break the gates. Local needs a
32B+ coder-class model.

## What is already portable

| Layer | Status |
|---|---|
| **Frontend** (React, `web/`) | Provider-blind. Talks only REST + SSE per [CONTRACT.md](../CONTRACT.md). Three cosmetic Claude-isms: the Opus/Sonnet/Haiku picker (`web/src/pages/Session.tsx:24-28`), the `$cost` display (line 202), the session UUID in the header (lines 193-199). |
| **Course content** | Fully portable. `AGENTS.md`, `lessons/`, `exercises/`, `progress/*.local.md` are pure markdown + Go with zero Claude references. `AGENTS.md` is itself the cross-vendor standard — Codex reads it natively; Gemini CLI can via `contextFileName`. |
| **Tool security guard** | `evaluateToolUse()` (`server/tutor.mjs:115-191`) is plain JS — blocks `*_solution.go` on every tool input, restricts Bash to bare `go test`/`go vet` on `./exercises/`, restricts Edit/Write to the two progress files. Reusable by any backend that exposes a per-call permission hook. |
| **SSE contract** | `tutor_partial` / `tutor_message` / `tool_activity` / `session_changed` / `cost_update` — generic streaming-agent events, nothing Claude-shaped. |
| **Persistence** | `.session.json` (per-module session IDs) and `.chats/<slug>.jsonl` (full turn log) are plain files; the JSONL log is enough to reconstruct context for providers without native resume. |

## What is Claude-specific (the actual work)

All in `server/tutor.mjs`:

| Coupling | Line | Replacement |
|---|---|---|
| `query()` from `@anthropic-ai/claude-agent-sdk` | 13, 445 | Provider-agnostic backend behind an interface (below) |
| `systemPrompt: { preset: 'claude_code' }` | 430 | Hand-assembled system prompt embedding `AGENTS.md` + the `gym-ui`/`gym-memory` skill text |
| `settingSources` auto-loading `.claude/` skills | 431 | Same — skill text folded into the system prompt |
| Built-in tools (Read/Glob/Grep/Bash/Edit/Write/Skill) | 29 | Provider's native tools (Path A) or ~6 hand-rolled tool impls (Path B) |
| `resume: <sessionId>` | 439 | Provider thread resume (Codex) or history replay from `.chats/*.jsonl` |
| `total_cost_usd` metering | 523 | Per-provider pricing table, or hide cost (Ollama) |
| Model aliases `opus\|sonnet\|haiku` | 31 | Per-provider model list served by the backend |
| Subscription auth (no API keys anywhere) | implicit | API-key config (env / settings endpoint; never committed) |

## Two porting paths

The conductor needs an **agent runtime** (tool loop + file access + sessions), not just a
chat-completions API. That splits the options:

### Path A — Agent-runtime adapters (lowest effort for OpenAI + Gemini)

OpenAI and Google both ship Claude-Code-equivalents:

- **Codex TypeScript SDK** (`@openai/codex-sdk`) — nearly isomorphic to the Agent SDK:
  `thread.run()` streams events, `resumeThread(id)` resumes (threads persist in
  `~/.codex/sessions`), reads `AGENTS.md` natively, headless `codex exec --json`.
  Closest drop-in replacement.
- **Gemini CLI headless mode** — `gemini -p --output-format stream-json` emits NDJSON
  events; supports resume-by-session-ID; reads context files (configurable to
  `AGENTS.md`).

~1–2 days per provider: an adapter mapping their event stream onto the existing SSE
contract. Tools, file access, and AGENTS.md loading come for free.

**Weak spot:** their permission hooks are coarser than the SDK's per-call `canUseTool`
callback — the `*_solution.go` ban would lean on sandbox/approval-policy configuration
instead of `evaluateToolUse()`. Worth verifying the guarantee holds before trusting it.

### Path B — API-level adapter (required for Ollama)

Ollama has no agent runtime, so this path hand-builds the loop: OpenAI-compatible
`/v1/chat/completions` + function calling, with ~6 small tool implementations
(read/glob/grep/bash/edit/write — the restriction logic already exists in
`evaluateToolUse()` and is reused as-is). One adapter also covers OpenAI and Gemini via
their OpenAI-compat endpoints. ~2–4 days. Session resume = replay history from
`.chats/<slug>.jsonl`. The Vercel AI SDK (`ai` package) is the obvious off-the-shelf
loop/streaming layer if a dependency is acceptable.

## Recommended shape (when implemented)

Extract a `TutorBackend` interface matching what `tutor.mjs` already consumes:

```js
interface TutorBackend {
  start(slug, { resume, fresh, model });  // begin or resume a module conversation
  sendInput(text);                        // push a learner turn
  interrupt();                            // tear down (module switch)
  // events: 'partial' | 'message' | 'tool_activity' | 'session_id' | 'cost'
}
```

1. `ClaudeAgentBackend` — extract the current `query()` code unchanged (stays the default).
2. `CodexBackend` (Path A) — second provider, closest semantics.
3. `OpenAICompatBackend` (Path B) — covers Ollama + Gemini + OpenAI keys.

Server: `.session.json` gains `provider` per module; `POST /api/tutor/model` generalizes
to `{ provider, model }`; `cost_update` only emitted when the provider reports cost.
UI: provider dropdown ahead of the model picker, optional API-key field, conditional
cost display, generic "Session" label.

## Risks

1. **Model quality** — the hard gates assume an obedient, tool-reliable model. Weak local
   models skip steps, hallucinate test output, or read solutions. Gate adherence should be
   smoke-tested per provider before offering it.
2. **Session semantics differ** — Codex has real thread resume; Gemini CLI's headless
   session-ID surfacing was recently still being ironed out
   ([gemini-cli#14435](https://github.com/google-gemini/gemini-cli/issues/14435));
   Ollama has none (history replay).
3. **Auth shift** — from zero-config subscription auth to API-key management.

## Sources

- [Codex SDK — OpenAI Developers](https://developers.openai.com/codex/sdk)
- [Codex TypeScript SDK README](https://github.com/openai/codex/blob/main/sdk/typescript/README.md)
- [Custom instructions with AGENTS.md — Codex](https://developers.openai.com/codex/guides/agents-md)
- [Gemini CLI headless mode reference](https://geminicli.com/docs/cli/headless/)
