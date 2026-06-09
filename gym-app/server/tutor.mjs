// Tutor bridge — owner: tutor-host agent (see CONTRACT.md v1.2 "per-module conversations").
// The app is a tunnel to the real /go-gym conductor conversation, scoped to a
// module: every module keeps its conversation — opening one starts or RESUMES
// *that module's* session (one live at a time; ids in .session.json). This module pipes
// the conductor's markdown turns out over SSE, feeds learner input back, tees
// every turn into the per-module chat log, persists the session for
// `claude --resume`, and guards tool permissions. No grading or envelope
// protocol — the conductor runs the course itself.
//
// Routes (mounted at /api/tutor): GET /events (SSE) · GET /status ·
// POST /session/start · POST /session/input · GET /history/:slug · POST /model.
import { Router } from 'express';
import { query } from '@anthropic-ai/claude-agent-sdk';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { allSlugs } from './content.mjs';
import { appendTurn, readTurns } from './chatlog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const SESSION_FILE = path.join(__dirname, '..', '.session.json');
const PROGRESS_FILE = path.resolve(REPO_ROOT, 'progress', 'PROGRESS.local.md');
const NOTES_FILE = path.resolve(REPO_ROOT, 'progress', 'NOTES.local.md');
// Per-learner teaching strategy, owned by the gym-coach skill (gitignored).
const STRATEGY_FILE = path.resolve(REPO_ROOT, 'progress', 'STRATEGY.local.md');

// --- tuning constants -------------------------------------------------------
const HEARTBEAT_MS = 25_000;
const MAX_TURNS = 200;
const ALLOWED_TOOLS = ['Read', 'Glob', 'Grep', 'Skill', 'Bash', 'Edit', 'Write'];
// Claude Code model aliases the GUI may select; applied on the next conversation.
const VALID_MODELS = ['opus', 'sonnet', 'haiku'];

/**
 * Whether a value is an allowed model alias.
 * @param {unknown} model
 * @returns {boolean}
 */
export function isValidModel(model) {
  return typeof model === 'string' && VALID_MODELS.includes(model);
}

// Substring (not suffix-anchored) so trailing spaces / './' tricks can't slip past.
const SOLUTION_RE = /_solution/i;
// Grep over an exercises/ directory would surface solution-file contents without
// ever naming a *_solution.go path — only allow Grep against a specific .go file.
const EXERCISES_DIR_RE = /exercises[\\/]/i;
// The conductor may only run `go test` / `go vet`, on ./exercises/ paths, with no
// shell metacharacters (no chaining, redirection, substitution, or newlines).
const GO_CMD_RE = /^go\s+(test|vet)\b/;
const SHELL_META_RE = /[&|;`\n\r$()<>]/;
const EDIT_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit']);

export const tutorRouter = Router();

// ===========================================================================
// SSE — client registry + broadcast
// ===========================================================================

/** @type {Set<import('express').Response>} */
const sseClients = new Set();

/**
 * Broadcast an SSE event to all connected clients. Other server modules call
 * this (e.g. routes.mjs after a manual test run).
 * @param {string} event
 * @param {object} data
 */
export function broadcast(event, data) {
  const frame = `event: ${event}\ndata: ${JSON.stringify(data ?? {})}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(frame);
    } catch {
      // A dead socket is cleaned up by its own 'close' handler; ignore here.
    }
  }
}

tutorRouter.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 3000\n\n');

  sseClients.add(res);

  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      // ignore; close handler cleans up.
    }
  }, HEARTBEAT_MS);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// ===========================================================================
// Tool permission policy (exported for tests — no SDK needed to exercise it)
// ===========================================================================

/**
 * Decide whether the conductor may use a tool. Pure + synchronous so the test
 * suite can drive it directly without an SDK session.
 * @param {string} toolName
 * @param {Record<string, unknown>} input
 * @returns {{behavior: 'allow', updatedInput: Record<string, unknown>} | {behavior: 'deny', message: string}}
 */
export function evaluateToolUse(toolName, input) {
  const safeInput = input ?? {};

  if (!ALLOWED_TOOLS.includes(toolName) && !EDIT_TOOLS.has(toolName)) {
    return { behavior: 'deny', message: `Tool ${toolName} is not allowed for the conductor.` };
  }

  // Nothing touching a *_solution.go path, ever — keep the answer key sealed.
  for (const value of Object.values(safeInput)) {
    if (typeof value === 'string' && SOLUTION_RE.test(value)) {
      return { behavior: 'deny', message: 'Reading or touching *_solution.go is forbidden.' };
    }
  }

  if (toolName === 'Bash') {
    return evaluateBash(safeInput);
  }

  if (EDIT_TOOLS.has(toolName)) {
    return evaluateEdit(safeInput);
  }

  if (toolName === 'Grep') {
    return evaluateGrep(safeInput);
  }

  // Read / Glob / Skill — read-only and harmless otherwise.
  return { behavior: 'allow', updatedInput: safeInput };
}

/** @param {Record<string, unknown>} input */
function evaluateBash(input) {
  const command = typeof input.command === 'string' ? input.command.trim() : '';
  if (!command) {
    return { behavior: 'deny', message: 'Bash requires a command.' };
  }
  if (SHELL_META_RE.test(command)) {
    return { behavior: 'deny', message: 'the conductor may only run a single bare go command (no shell metacharacters)' };
  }
  if (!GO_CMD_RE.test(command)) {
    return { behavior: 'deny', message: 'the conductor may only run `go test` or `go vet`' };
  }
  if (!command.includes('./exercises/')) {
    return { behavior: 'deny', message: 'go commands must target a ./exercises/ path' };
  }
  // Reject any path-looking token that escapes the exercises tree.
  for (const token of command.split(/\s+/)) {
    if (token.includes('/') && !token.startsWith('./exercises/')) {
      return { behavior: 'deny', message: 'go commands may only reference ./exercises/ paths' };
    }
  }
  return { behavior: 'allow', updatedInput: input };
}

/** @param {Record<string, unknown>} input */
function evaluateEdit(input) {
  const filePath = typeof input.file_path === 'string' ? input.file_path : '';
  if (!filePath) {
    return {
      behavior: 'deny',
      message: 'the conductor may only write PROGRESS.local.md, NOTES.local.md, or STRATEGY.local.md',
    };
  }
  const resolved = path.resolve(REPO_ROOT, filePath);
  if (
    !samePath(resolved, PROGRESS_FILE) &&
    !samePath(resolved, NOTES_FILE) &&
    !samePath(resolved, STRATEGY_FILE)
  ) {
    return {
      behavior: 'deny',
      message: 'the conductor may only write PROGRESS.local.md, NOTES.local.md, or STRATEGY.local.md',
    };
  }
  return { behavior: 'allow', updatedInput: input };
}

/** @param {Record<string, unknown>} input */
function evaluateGrep(input) {
  const target = typeof input.path === 'string' ? input.path : '';
  // Grep over an exercises directory (not a specific .go file) could leak
  // solution contents — deny it. Grep elsewhere is fine.
  if (EXERCISES_DIR_RE.test(target) && !/\.go$/i.test(target)) {
    return { behavior: 'deny', message: 'Grep over exercises dirs is forbidden; target a specific .go file.' };
  }
  return { behavior: 'allow', updatedInput: input };
}

/**
 * Path equality, case-insensitive on win32.
 * @param {string} a
 * @param {string} b
 */
function samePath(a, b) {
  if (process.platform === 'win32') {
    return a.toLowerCase() === b.toLowerCase();
  }
  return a === b;
}

/** @type {import('@anthropic-ai/claude-agent-sdk').CanUseTool} */
async function canUseTool(toolName, input) {
  return evaluateToolUse(toolName, input);
}

// ===========================================================================
// Per-module conversation host
// ===========================================================================
//
// At most one live conversation, owned by one module `slug`. switchModule()
// tears the old host down and starts a new one when the slug changes (or when a
// fresh restart is requested). A generation counter guards against double
// teardown when a host's own loop ends concurrently with an explicit switch.

/**
 * @typedef {object} Host
 * @property {string} slug owning module
 * @property {ReturnType<typeof makeInputQueue>} queue
 * @property {number} gen generation id (for teardown races)
 * @property {object} [runner] the SDK Query object (has interrupt())
 * @property {'starting'|'online'|'dead'} state
 * @property {string|null} sessionId
 * @property {string|null} model
 */

/** @type {Host | null} */
let host = null;
let hostGen = 0;

/** Async-generator input queue: turns are pushed, the SDK pulls them. */
function makeInputQueue() {
  /** @type {{type:'user', message:{role:'user', content:string}, parent_tool_use_id:null}[]} */
  const buffer = [];
  /** @type {(() => void) | null} */
  let notify = null;
  let closed = false;

  function push(text) {
    buffer.push({
      type: 'user',
      message: { role: 'user', content: text },
      parent_tool_use_id: null,
    });
    if (notify) {
      const fn = notify;
      notify = null;
      fn();
    }
  }

  async function* generator() {
    while (!closed) {
      if (buffer.length === 0) {
        await new Promise((resolve) => {
          notify = resolve;
        });
        continue;
      }
      yield buffer.shift();
    }
  }

  return { push, generator, close: () => { closed = true; } };
}

/**
 * @typedef {object} SessionRecord
 * @property {string|null} current last-opened module slug (warmed on boot)
 * @property {string|null} model conductor model alias, applied on next start
 * @property {Record<string, string>} sessions per-module session ids — every
 *   module keeps its conversation and resumes it when reopened
 */

/**
 * Normalize whatever is on disk into the v1.2.1 SessionRecord shape. Pure and
 * exported for tests. Migrations: the v1.2 single-module shape
 * `{ slug, session_id, model }` becomes a one-entry map; the legacy
 * `{ session_id }` shape (no slug) yields an empty map (nothing resumable).
 * @param {unknown} parsed
 * @returns {SessionRecord}
 */
export function normalizeSessionRecord(parsed) {
  const rec = parsed && typeof parsed === 'object' ? /** @type {Record<string, unknown>} */ (parsed) : {};

  /** @type {Record<string, string>} */
  const sessions = {};
  if (rec.sessions && typeof rec.sessions === 'object' && !Array.isArray(rec.sessions)) {
    for (const [slug, id] of Object.entries(rec.sessions)) {
      if (typeof id === 'string' && id.length > 0) sessions[slug] = id;
    }
  } else if (typeof rec.slug === 'string' && typeof rec.session_id === 'string') {
    sessions[rec.slug] = rec.session_id;
  }

  const current =
    typeof rec.current === 'string' ? rec.current
    : typeof rec.slug === 'string' ? rec.slug
    : null;

  return { current, model: isValidModel(rec.model) ? rec.model : null, sessions };
}

/**
 * Merge a patch into a SessionRecord. Pure and exported for tests. `sessions`
 * entries merge (other modules' ids survive); `forget` deletes one module's id
 * (the Restart button / fresh start).
 * @param {SessionRecord} current
 * @param {{ current?: string|null, model?: string|null, sessions?: Record<string, string>, forget?: string }} patch
 * @returns {SessionRecord}
 */
export function mergeSessionRecord(current, patch) {
  const sessions = { ...current.sessions, ...(patch.sessions ?? {}) };
  if (patch.forget) delete sessions[patch.forget];
  return {
    current: patch.current !== undefined ? patch.current : current.current,
    model: patch.model !== undefined ? patch.model : current.model,
    sessions,
  };
}

/**
 * Read the persisted session record (normalized; missing/corrupt file → empty).
 * @returns {Promise<SessionRecord>}
 */
async function loadSession() {
  try {
    const raw = await readFile(SESSION_FILE, 'utf8');
    return normalizeSessionRecord(JSON.parse(raw));
  } catch {
    return { current: null, model: null, sessions: {} };
  }
}

/**
 * Persist the session record, merging over what's on disk so callers can update
 * one field (e.g. /model) or one module's session id without dropping the rest.
 * @param {Parameters<typeof mergeSessionRecord>[1]} patch
 */
async function persistSession(patch) {
  try {
    const next = mergeSessionRecord(await loadSession(), patch);
    await writeFile(SESSION_FILE, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  } catch (err) {
    console.error('tutor: failed to persist session:', err.message);
  }
}

/**
 * Format a tool_use content block into a dimmed activity line for the GUI.
 * @param {{name?: string, input?: Record<string, unknown>}} block
 * @returns {string | null}
 */
function formatToolActivity(block) {
  const name = block?.name;
  const input = block?.input ?? {};
  switch (name) {
    case 'Bash': {
      const cmd = typeof input.command === 'string' ? input.command : '';
      return `🧪 ${cmd || 'go test'}`;
    }
    case 'Read':
      return `📖 Read ${relPath(input.file_path)}`;
    case 'Glob':
      return `🔎 Glob ${input.pattern ?? ''}`.trim();
    case 'Grep':
      return `🔎 Grep ${input.pattern ?? ''}`.trim();
    case 'Edit':
    case 'Write':
    case 'NotebookEdit':
      return `✏️ ${name} ${relPath(input.file_path)}`;
    case 'Skill':
      return `🎓 Skill ${input.skill ?? input.name ?? ''}`.trim();
    default:
      return name ? `🛠️ ${name}` : null;
  }
}

/** Render an absolute path relative to the repo root for display. */
function relPath(p) {
  if (typeof p !== 'string' || !p) return '';
  const rel = path.relative(REPO_ROOT, path.resolve(REPO_ROOT, p));
  return rel.split(path.sep).join('/');
}

/**
 * @param {unknown} content
 * @returns {string}
 */
function extractText(content) {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';
  return content
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('')
    .trim();
}

/**
 * Create and run a conversation for one module. Resumes the module's recorded
 * session (every module keeps its conversation) unless `fresh` is requested —
 * then the recorded id is forgotten and a brand-new conversation starts. The
 * model (when set on disk) is passed through. Returns the live host
 * immediately; the SDK loop runs in the background.
 * @param {string} slug owning module
 * @param {{ fresh: boolean }} opts
 * @returns {Host}
 */
function initConversation(slug, { fresh }) {
  const queue = makeInputQueue();
  const gen = ++hostGen;
  /** @type {Host} */
  const h = { slug, queue, gen, runner: undefined, state: 'starting', sessionId: null, model: null };

  const run = async () => {
    const persisted = await loadSession();
    const recorded = persisted.sessions[slug] ?? null;
    const canResume = !fresh && Boolean(recorded);
    // A fresh restart discards the old id NOW, so a crash before system/init
    // can't resurrect the conversation the learner asked to leave behind.
    if (fresh && recorded) await persistSession({ forget: slug });
    h.model = persisted.model;

    const options = {
      cwd: REPO_ROOT,
      systemPrompt: { type: 'preset', preset: 'claude_code' },
      settingSources: ['user', 'project', 'local'],
      allowedTools: ALLOWED_TOOLS,
      includePartialMessages: true,
      canUseTool,
      maxTurns: MAX_TURNS,
      permissionMode: 'default',
    };
    if (persisted.model) options.model = persisted.model;
    if (canResume) options.resume = recorded;

    // Whether this conversation started without resume (for session_changed).
    const startedFresh = !canResume;

    try {
      const runner = query({ prompt: queue.generator(), options });
      h.runner = runner;
      for await (const msg of runner) {
        handleMessage(msg, startedFresh);
      }
    } catch (err) {
      console.error('tutor: conversation loop error:', err.message);
      broadcast('tutor_message', { text: '_(tutor connection error — reconnecting on next action)_' });
    } finally {
      // Loop exited: mark dead and, if we're still the active host, reset so the
      // next switchModule re-inits. A newer generation must not be clobbered.
      h.state = 'dead';
      queue.close();
      if (host === h) host = null;
    }
  };

  /**
   * @param {any} msg
   * @param {boolean} startedFresh
   */
  function handleMessage(msg, startedFresh) {
    if (msg.type === 'system' && msg.subtype === 'init') {
      if (msg.session_id) {
        // The SDK emits a system/init per RUN (one for every learner turn in
        // streaming-input mode), not just once per conversation — only the
        // first init of this host announces the conversation, and we only
        // re-persist when the id actually changes (a resume fork).
        const isNewId = msg.session_id !== h.sessionId;
        const isFirstInit = h.sessionId === null;
        h.sessionId = msg.session_id;
        if (isNewId) {
          persistSession({ current: slug, sessions: { [slug]: msg.session_id } });
        }
        if (isFirstInit) {
          broadcast('session_changed', {
            slug,
            sessionId: msg.session_id,
            model: h.model,
            fresh: startedFresh,
          });
          console.log(`tutor session ${msg.session_id} (${slug}) — watch live: claude --resume ${msg.session_id}`);
        }
      }
      return;
    }

    if (msg.type === 'stream_event') {
      const ev = msg.event;
      if (ev?.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
        broadcast('tutor_partial', { text: ev.delta.text });
      }
      return;
    }

    if (msg.type === 'assistant') {
      if (h.state !== 'online') h.state = 'online';
      const content = msg.message?.content;
      const text = extractText(content);
      if (text) {
        broadcast('tutor_message', { text });
        appendTurn(slug, { kind: 'tutor', text, ts: Date.now() });
      }
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block?.type === 'tool_use') {
            const line = formatToolActivity(block);
            if (line) {
              broadcast('tool_activity', { text: line });
              appendTurn(slug, { kind: 'activity', text: line, ts: Date.now() });
            }
          }
        }
      }
      return;
    }

    if (msg.type === 'result') {
      if (typeof msg.total_cost_usd === 'number') {
        broadcast('cost_update', { totalCostUsd: msg.total_cost_usd });
      }
      return;
    }
  }

  run();
  return h;
}

/**
 * Switch the live conversation to `slug`. If a matching host is already alive and
 * no fresh restart is requested, the existing host is returned (the caller pushes
 * the driver turn). Otherwise the old host is torn down and a new conversation
 * starts. Guards against double-teardown via a generation check.
 * @param {string} slug
 * @param {boolean} fresh
 * @returns {{ host: Host, reused: boolean }}
 */
function switchModule(slug, fresh) {
  if (host && host.state !== 'dead' && host.slug === slug && !fresh) {
    return { host, reused: true };
  }

  if (host) {
    teardownHost(host);
    host = null;
  }

  host = initConversation(slug, { fresh });
  return { host, reused: false };
}

/**
 * Tear down a host: interrupt its SDK runner (if the Query exposes interrupt())
 * and close its input queue. Teardown errors are logged and ignored. Safe to
 * call once per host — the generation guard prevents racing a self-ended loop.
 * @param {Host} h
 */
function teardownHost(h) {
  if (h.state === 'dead') return;
  h.state = 'dead';
  const runner = h.runner;
  if (runner && typeof runner.interrupt === 'function') {
    Promise.resolve()
      .then(() => runner.interrupt())
      .catch((err) => console.error('tutor: teardown interrupt failed:', err.message));
  }
  try {
    h.queue.close();
  } catch (err) {
    console.error('tutor: teardown queue close failed:', err.message);
  }
}

/**
 * On boot, warm the learner's CURRENT module only — the one they were last in —
 * if it has a recorded session. Other modules' conversations resume lazily when
 * reopened. For a fresh install we do NOT eagerly start a conversation — the
 * first POST /session/start kicks things off. Called by index.mjs after the
 * server starts listening.
 * @returns {Promise<void>}
 */
export async function startTutor() {
  const persisted = await loadSession();
  const current = persisted.current;
  if (!current || !allSlugs().includes(current) || !persisted.sessions[current]) return;
  if (host && host.state !== 'dead') return;

  const { host: h } = switchModule(current, false);
  // Warm the resumed module so it's ready when the learner returns.
  h.queue.push(
    `The learner re-opened module ${current} (server restarted) — ` +
      `continue where you left off. Remember: your markdown is rendered directly to them.`,
  );
}

/**
 * Backstop for the gym-memory protocol: when the progress watcher sees a module
 * complete, nudge the live conductor to record its learner-notes block. No-op if
 * no conversation is alive (the notes are written on the next session start).
 * @param {string} slug
 */
export function notifyModuleComplete(slug) {
  if (!host || host.state === 'dead') return;
  host.queue.push(
    `Module ${slug} is complete — run the gym-coach close-out now (see the gym-coach skill): ` +
      `ask the learner the short reflection, refresh progress/STRATEGY.local.md, and write your ` +
      `gym-memory notes block to progress/NOTES.local.md (see the gym-memory skill), then continue.`,
  );
}

/**
 * @returns {{ state: 'starting'|'online'|'dead', sessionId: string|null, slug: string|null, model: string|null }}
 */
export function getTutorStatus() {
  if (!host) return { state: 'dead', sessionId: null, slug: null, model: null };
  return { state: host.state, sessionId: host.sessionId, slug: host.slug, model: host.model };
}

// ===========================================================================
// REST routes
// ===========================================================================

tutorRouter.get('/status', (_req, res) => {
  res.json({ success: true, data: getTutorStatus(), error: null });
});

tutorRouter.post('/session/start', async (req, res) => {
  const { slug, fresh } = req.body ?? {};
  if (typeof slug !== 'string' || !allSlugs().includes(slug)) {
    res.status(404).json({ success: false, data: null, error: `unknown module: ${slug}` });
    return;
  }
  // Non-boolean `fresh` is treated as false (default).
  const wantFresh = fresh === true;
  // Peek before switching: a recorded session means this start RESUMES the
  // module's old conversation, which changes the driver turn below.
  const willResume = !wantFresh && Boolean((await loadSession()).sessions[slug]);

  const { host: h, reused } = switchModule(slug, wantFresh);
  // Driver turns are plumbing, not chat — never logged. A live or resumed
  // conversation continues where it left off; only a brand-new one gets the
  // full module-start primer.
  if (reused || willResume) {
    h.queue.push(
      `The learner re-opened module ${slug} — continue where you left off. ` +
        `Remember: your markdown is rendered directly to them.`,
    );
  } else {
    h.queue.push(
      `The learner opened module ${slug} in the GUI — read progress/NOTES.local.md, ` +
        `progress/PROGRESS.local.md, and progress/STRATEGY.local.md; apply the gym-memory and ` +
        `gym-coach skills (let the strategy set your recall lead, comparisons, pacing, and hints), ` +
        `then run the AGENTS.md Tutor-mode loop on it. Remember: your markdown is rendered directly to them.`,
    );
  }
  res.status(202).json({ success: true, data: { accepted: true }, error: null });
});

tutorRouter.post('/session/input', (req, res) => {
  const { text } = req.body ?? {};
  if (typeof text !== 'string' || text.length === 0) {
    res.status(400).json({ success: false, data: null, error: 'text is required' });
    return;
  }
  if (!host || host.state === 'dead') {
    res.status(409).json({ success: false, data: null, error: 'no live conversation; start a module first' });
    return;
  }
  host.queue.push(text);
  // Learner turns are chat — tee into the live module's log.
  appendTurn(host.slug, { kind: 'learner', text, ts: Date.now() });
  res.status(202).json({ success: true, data: { accepted: true }, error: null });
});

tutorRouter.get('/history/:slug', async (req, res) => {
  const { slug } = req.params;
  if (!allSlugs().includes(slug)) {
    res.status(404).json({ success: false, data: null, error: `unknown module: ${slug}` });
    return;
  }
  const turns = await readTurns(slug);
  res.json({ success: true, data: { turns }, error: null });
});

tutorRouter.post('/model', async (req, res) => {
  const { model } = req.body ?? {};
  if (!isValidModel(model)) {
    res.status(400).json({
      success: false,
      data: null,
      error: `model must be one of: ${VALID_MODELS.join(', ')}`,
    });
    return;
  }
  // Persist into .session.json (merge — keep slug/session_id). Takes effect on
  // the next initConversation; a live conversation never switches model mid-flight.
  await persistSession({ model });
  res.json({ success: true, data: { model, appliesOn: 'next_session' }, error: null });
});
