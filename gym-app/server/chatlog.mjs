// Per-module chat logs — owner: tutor-host agent (see CONTRACT.md v1.2 "Chat logs").
// The server tees every turn it broadcasts into gym-app/.chats/<slug>.jsonl: one
// JSON object per line — { kind: 'tutor'|'learner'|'activity', text, ts }. Appends
// are fire-and-forget (errors logged, never thrown into callers); readers tolerate
// a torn/partially-written trailing line. The chats dir is gitignored, created
// lazily, and overridable via GYM_CHATS_DIR for tests.
import { appendFile, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default chats dir is gym-app/.chats. Tests point GYM_CHATS_DIR at a temp dir;
// an explicit setter is also exported for in-process overrides.
let chatsDir = process.env.GYM_CHATS_DIR
  ? path.resolve(process.env.GYM_CHATS_DIR)
  : path.join(__dirname, '..', '.chats');

/**
 * Override the chats base directory (tests). Pass an absolute or resolvable path.
 * @param {string} dir
 */
export function setChatsDir(dir) {
  chatsDir = path.resolve(dir);
}

/** @returns {string} the current chats base directory. */
export function getChatsDir() {
  return chatsDir;
}

/** @param {string} slug */
function logFileFor(slug) {
  return path.join(chatsDir, `${slug}.jsonl`);
}

/**
 * Append one turn to the module's chat log. Fire-and-forget: any IO error is
 * logged to the console and swallowed so a logging failure never breaks the
 * conversation pipe. Creates the chats dir lazily.
 * @param {string} slug
 * @param {{ kind: 'tutor'|'learner'|'activity', text: string, ts: number }} turn
 * @returns {Promise<void>}
 */
export async function appendTurn(slug, turn) {
  try {
    await mkdir(chatsDir, { recursive: true });
    const line = `${JSON.stringify({ kind: turn.kind, text: turn.text, ts: turn.ts })}\n`;
    await appendFile(logFileFor(slug), line, 'utf8');
  } catch (err) {
    console.error(`chatlog: failed to append turn for ${slug}:`, err.message);
  }
}

/**
 * Read all turns for a module. Missing file → []. A corrupt or partially-written
 * trailing line (or any unparseable line) is skipped rather than throwing.
 * @param {string} slug
 * @returns {Promise<{ kind: string, text: string, ts: number }[]>}
 */
export async function readTurns(slug) {
  let raw;
  try {
    raw = await readFile(logFileFor(slug), 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    console.error(`chatlog: failed to read turns for ${slug}:`, err.message);
    return [];
  }

  const turns = [];
  for (const line of raw.split('\n')) {
    if (line.trim() === '') continue;
    try {
      turns.push(JSON.parse(line));
    } catch {
      // Tolerate a torn/partial trailing line (or any garbage line): skip it.
    }
  }
  return turns;
}
