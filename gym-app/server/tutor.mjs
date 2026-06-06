// Tutor bridge — owner: tutor-host agent (see CONTRACT.md).
// Hosts the background Claude conversation (Agent SDK) and the SSE event stream.
// GET /events (SSE, mounted at /api/tutor/events) · POST /input (/api/tutor/input)
import { Router } from 'express';
import { query } from '@anthropic-ai/claude-agent-sdk';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const SESSION_FILE = path.join(__dirname, '..', '.session.json');

// --- tuning constants -------------------------------------------------------
const HEARTBEAT_MS = 25_000;
const ASK_TIMEOUT_MS = 90_000;
const MAX_TURNS = 50;
const PRIMER_TURN =
  'Load the gym-ui skill rules. You are now the GUI tutor. ' +
  'Reply {"type":"say","text":"ready"}';
const SOLUTION_FILE_RE = /_solution\.go$/i;
const ALLOWED_TOOLS = ['Read', 'Glob', 'Grep'];

export const tutorRouter = Router();

// ===========================================================================
// SSE — client registry + broadcast
// ===========================================================================

/** @type {Set<import('express').Response>} */
const sseClients = new Set();

/**
 * Broadcast an SSE event to all connected clients. Other server modules call
 * this (e.g. routes.mjs after a test run).
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
// Envelope parsing
// ===========================================================================

const ENVELOPE_TYPES = new Set(['say', 'grade', 'hint']);
const VERDICTS = new Set(['correct', 'partial', 'wrong']);

/**
 * Extract and validate the tutor's JSON envelope from an assistant turn.
 * Takes the LAST JSON object in the text (fenced or bare), parses it, and
 * validates the shape. Returns null on any failure so callers can recover.
 * @param {string} text
 * @returns {{type: 'say'|'grade'|'hint'} & Record<string, unknown> | null}
 */
export function parseEnvelope(text) {
  if (typeof text !== 'string') return null;

  for (const candidate of jsonObjectCandidates(text)) {
    let obj;
    try {
      obj = JSON.parse(candidate);
    } catch {
      continue;
    }
    if (isValidEnvelope(obj)) return obj;
  }
  return null;
}

/**
 * Yield balanced top-level `{...}` substrings, LAST first, so the caller picks
 * the final JSON object in the turn. Handles strings/escapes so braces inside
 * JSON string values don't throw off the depth count.
 * @param {string} text
 * @returns {string[]}
 */
function jsonObjectCandidates(text) {
  const objects = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === '}') {
      if (depth > 0) {
        depth -= 1;
        if (depth === 0 && start !== -1) {
          objects.push(text.slice(start, i + 1));
          start = -1;
        }
      }
    }
  }

  return objects.reverse();
}

/**
 * @param {unknown} obj
 * @returns {boolean}
 */
function isValidEnvelope(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const env = /** @type {Record<string, unknown>} */ (obj);
  if (!ENVELOPE_TYPES.has(/** @type {string} */ (env.type))) return false;

  if (env.type === 'say') {
    return typeof env.text === 'string';
  }
  if (env.type === 'grade') {
    return (
      Number.isInteger(env.question) &&
      VERDICTS.has(/** @type {string} */ (env.verdict)) &&
      typeof env.feedback === 'string'
    );
  }
  if (env.type === 'hint') {
    return (
      Number.isInteger(env.level) &&
      env.level >= 1 &&
      env.level <= 4 &&
      typeof env.text === 'string'
    );
  }
  return false;
}

// ===========================================================================
// Background conversation host (lazy-init)
// ===========================================================================

/** @type {ReturnType<typeof initConversation> | null} */
let host = null;

/**
 * FIFO of askTutor() callers waiting for the next say/grade envelope.
 * @type {{resolve: (v: object) => void, reject: (e: Error) => void, timer: NodeJS.Timeout}[]}
 */
const pending = [];

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
 * Read-only guard: deny any *_solution.go read and anything outside the
 * allowlist. The server does all writes and test runs.
 * @type {import('@anthropic-ai/claude-agent-sdk').CanUseTool}
 */
async function canUseTool(toolName, input) {
  if (!ALLOWED_TOOLS.includes(toolName)) {
    return { behavior: 'deny', message: `Tool ${toolName} is not allowed for the tutor.` };
  }
  for (const value of Object.values(input ?? {})) {
    if (typeof value === 'string' && SOLUTION_FILE_RE.test(value)) {
      return { behavior: 'deny', message: 'Reading *_solution.go is forbidden.' };
    }
  }
  return { behavior: 'allow', updatedInput: input };
}

/** Resolve the oldest pending askTutor() caller with an envelope. */
function resolvePending(envelope) {
  const waiter = pending.shift();
  if (!waiter) return;
  clearTimeout(waiter.timer);
  waiter.resolve(envelope);
}

/**
 * Route a parsed envelope to SSE + any waiting askTutor() caller.
 * @param {object} envelope
 */
function routeEnvelope(envelope) {
  switch (envelope.type) {
    case 'say':
      broadcast('tutor_message', { text: envelope.text });
      resolvePending(envelope);
      break;
    case 'grade':
      broadcast('grade_result', {
        question: envelope.question,
        verdict: envelope.verdict,
        feedback: envelope.feedback,
        reteach: envelope.reteach ?? null,
      });
      resolvePending(envelope);
      break;
    case 'hint':
      broadcast('hint', { level: envelope.level, text: envelope.text });
      // Hints don't resolve askTutor (callers wait for say/grade), but they are
      // streamed to the GUI. routes.mjs grades via askTutor; help is fire-and-forget.
      break;
    default:
      break;
  }
}

/** Lazy-create the background conversation. Safe to call repeatedly. */
function initConversation() {
  const queue = makeInputQueue();
  let textBuffer = '';
  let correctionSent = false;

  const start = async () => {
    const resume = await loadResumeSessionId();
    // Prime the session as the very first turn.
    queue.push(PRIMER_TURN);

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
        await handleMessage(msg);
      }
    } catch (err) {
      console.error('tutor: conversation loop error:', err.message);
      broadcast('tutor_message', { text: '(tutor connection error)' });
    }
  };

  /** @param {any} msg */
  async function handleMessage(msg) {
    if (msg.type === 'system' && msg.subtype === 'init') {
      if (msg.session_id) await persistSessionId(msg.session_id);
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
      const text = extractText(msg.message?.content);
      if (!text) return;
      textBuffer = text;
      const envelope = parseEnvelope(text);
      if (envelope) {
        correctionSent = false;
        routeEnvelope(envelope);
      } else if (!correctionSent) {
        // One corrective nudge, then surface a format error if it persists.
        correctionSent = true;
        queue.push('Reply with only the JSON envelope.');
      } else {
        correctionSent = false;
        const errorEnvelope = { type: 'say', text: '(tutor format error)' };
        routeEnvelope(errorEnvelope);
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

  start();
  return { queue, get textBuffer() { return textBuffer; } };
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

function ensureHost() {
  if (!host) host = initConversation();
  return host;
}

// ===========================================================================
// Public API: askTutor + POST /input
// ===========================================================================

/**
 * Send a turn into the background tutor conversation and resolve with the next
 * parsed say/grade envelope. Generic: routes.mjs uses it for grading; chat and
 * help turns go through POST /input.
 * @param {string} text
 * @returns {Promise<object>}
 */
export function askTutor(text) {
  const h = ensureHost();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const idx = pending.findIndex((p) => p.timer === timer);
      if (idx !== -1) pending.splice(idx, 1);
      reject(new Error('tutor timed out'));
    }, ASK_TIMEOUT_MS);
    pending.push({ resolve, reject, timer });
    h.queue.push(text);
  });
}

tutorRouter.post('/input', (req, res) => {
  const { kind, text, slug } = req.body ?? {};
  if (typeof text !== 'string' || text.length === 0) {
    res.status(400).json({ success: false, data: null, error: 'text is required' });
    return;
  }

  const h = ensureHost();
  const turn =
    kind === 'help_red_test'
      ? `The learner's test for ${slug ?? 'this module'} is RED and they asked for help. ` +
        `Test output:\n${text}\nGive a level-appropriate hint envelope.`
      : text;

  h.queue.push(turn);
  res.status(202).json({ success: true, data: { accepted: true }, error: null });
});
