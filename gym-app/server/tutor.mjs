// Tutor bridge — owner: tutor-host agent (see CONTRACT.md v1.1 "conversation tunnel").
// The app is a tunnel to the real /go-gym conductor conversation: one background
// Claude Code session (Agent SDK) opened eagerly at boot. This module pipes the
// conductor's markdown turns out over SSE, feeds learner input back, persists the
// session for `claude --resume`, and guards tool permissions. No grading or
// envelope protocol — the conductor runs the course itself.
//
// Routes (mounted at /api/tutor): GET /events (SSE) · GET /status ·
// POST /session/start · POST /session/input.
import { Router } from 'express';
import { query } from '@anthropic-ai/claude-agent-sdk';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { allSlugs } from './content.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const SESSION_FILE = path.join(__dirname, '..', '.session.json');
const PROGRESS_FILE = path.resolve(REPO_ROOT, 'progress', 'PROGRESS.local.md');

// --- tuning constants -------------------------------------------------------
const HEARTBEAT_MS = 25_000;
const MAX_TURNS = 200;
const ALLOWED_TOOLS = ['Read', 'Glob', 'Grep', 'Skill', 'Bash', 'Edit', 'Write'];
const BOOT_PRIMER =
  'You are the Go Gym conductor running behind the gym-app web GUI; the gym-ui ' +
  'skill applies. Greet the learner in one short warm paragraph and wait.';

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
    return { behavior: 'deny', message: 'the conductor may only write PROGRESS.local.md' };
  }
  const resolved = path.resolve(REPO_ROOT, filePath);
  if (!samePath(resolved, PROGRESS_FILE)) {
    return { behavior: 'deny', message: 'the conductor may only write PROGRESS.local.md' };
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
// Background conversation host (eager init via startTutor)
// ===========================================================================

/**
 * @type {{ queue: ReturnType<typeof makeInputQueue>, get state(): 'starting'|'online'|'dead', get sessionId(): string|null } | null}
 */
let host = null;

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

async function loadResumeSessionId() {
  try {
    const raw = await readFile(SESSION_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return typeof parsed?.session_id === 'string' ? parsed.session_id : null;
  } catch {
    return null;
  }
}

async function persistSessionId(sessionId) {
  try {
    await writeFile(
      SESSION_FILE,
      `${JSON.stringify({ session_id: sessionId }, null, 2)}\n`,
      'utf8',
    );
  } catch (err) {
    console.error('tutor: failed to persist session id:', err.message);
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

/** Create and run the background conversation. */
function initConversation() {
  const queue = makeInputQueue();
  let state = /** @type {'starting'|'online'|'dead'} */ ('starting');
  let sessionId = /** @type {string|null} */ (null);

  const run = async () => {
    const resume = await loadResumeSessionId();
    queue.push(BOOT_PRIMER);

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
    if (resume) options.resume = resume;

    try {
      for await (const msg of query({ prompt: queue.generator(), options })) {
        handleMessage(msg);
      }
    } catch (err) {
      console.error('tutor: conversation loop error:', err.message);
      broadcast('tutor_message', { text: '_(tutor connection error — reconnecting on next action)_' });
    } finally {
      // Loop exited: mark dead and reset so the next call re-inits a fresh host.
      state = 'dead';
      queue.close();
      host = null;
    }
  };

  /** @param {any} msg */
  function handleMessage(msg) {
    if (msg.type === 'system' && msg.subtype === 'init') {
      if (msg.session_id) {
        sessionId = msg.session_id;
        persistSessionId(msg.session_id);
        console.log(`tutor session ${msg.session_id} — watch live: claude --resume ${msg.session_id}`);
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
      if (state !== 'online') state = 'online';
      const content = msg.message?.content;
      const text = extractText(content);
      if (text) broadcast('tutor_message', { text });
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block?.type === 'tool_use') {
            const line = formatToolActivity(block);
            if (line) broadcast('tool_activity', { text: line });
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

  return {
    queue,
    get state() { return state; },
    get sessionId() { return sessionId; },
  };
}

/**
 * Eagerly start the conductor conversation. Idempotent — repeated calls while a
 * host is alive are no-ops; after the loop dies, host resets so this re-inits.
 * Called by index.mjs after the server starts listening.
 */
export function startTutor() {
  if (!host) host = initConversation();
  return host;
}

/**
 * @returns {{ state: 'starting'|'online'|'dead', sessionId: string|null }}
 */
export function getTutorStatus() {
  if (!host) return { state: 'dead', sessionId: null };
  return { state: host.state, sessionId: host.sessionId };
}

// ===========================================================================
// REST routes
// ===========================================================================

tutorRouter.get('/status', (_req, res) => {
  res.json({ success: true, data: getTutorStatus(), error: null });
});

tutorRouter.post('/session/start', (req, res) => {
  const { slug } = req.body ?? {};
  if (typeof slug !== 'string' || !allSlugs().includes(slug)) {
    res.status(404).json({ success: false, data: null, error: `unknown module: ${slug}` });
    return;
  }

  const h = startTutor();
  h.queue.push(
    `The learner opened module ${slug} in the GUI — run the AGENTS.md Tutor-mode loop on it ` +
      `(re-quiz an earlier module first if the pacing rules call for it). ` +
      `Remember: your markdown is rendered directly to them.`,
  );
  res.status(202).json({ success: true, data: { accepted: true }, error: null });
});

tutorRouter.post('/session/input', (req, res) => {
  const { text } = req.body ?? {};
  if (typeof text !== 'string' || text.length === 0) {
    res.status(400).json({ success: false, data: null, error: 'text is required' });
    return;
  }
  const h = startTutor();
  h.queue.push(text);
  res.status(202).json({ success: true, data: { accepted: true }, error: null });
});
