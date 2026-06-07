// Tests for the conductor's tool permission policy (evaluateToolUse).
// Pure + synchronous — no live SDK session is opened. Importing tutor.mjs only
// registers routes and exports; the conversation host is eager only via
// startTutor(), which these tests never call.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateToolUse, isValidModel, normalizeSessionRecord, mergeSessionRecord } from './tutor.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

function allow(toolName, input) {
  const r = evaluateToolUse(toolName, input);
  assert.equal(r.behavior, 'allow', `expected allow, got deny: ${r.message ?? ''}`);
}
function deny(toolName, input) {
  const r = evaluateToolUse(toolName, input);
  assert.equal(r.behavior, 'deny', 'expected deny, got allow');
}

// --- Bash: go test / go vet on ./exercises/ -------------------------------

test('Bash: go test on an exercises path is allowed', () => {
  allow('Bash', { command: 'go test ./exercises/integers/' });
});

test('Bash: go vet on an exercises path is allowed', () => {
  allow('Bash', { command: 'go vet ./exercises/arrays/' });
});

test('Bash: go test with -race on an exercises path is allowed', () => {
  allow('Bash', { command: 'go test -race ./exercises/concurrency/' });
});

test('Bash: chained command (&&) is denied', () => {
  deny('Bash', { command: 'go test ./exercises/integers/ && rm -rf .' });
});

test('Bash: a bare destructive command is denied', () => {
  deny('Bash', { command: 'rm -rf' });
});

test('Bash: go test targeting outside exercises is denied', () => {
  deny('Bash', { command: 'go test ../../etc' });
});

test('Bash: go test with no exercises path is denied', () => {
  deny('Bash', { command: 'go test ./...' });
});

test('Bash: piped command is denied', () => {
  deny('Bash', { command: 'go test ./exercises/integers/ | tee out.txt' });
});

test('Bash: command substitution is denied', () => {
  deny('Bash', { command: 'go test ./exercises/$(whoami)/' });
});

test('Bash: a non-go command is denied', () => {
  deny('Bash', { command: 'cat ./exercises/integers/integers_solution.go' });
});

test('Bash: empty command is denied', () => {
  deny('Bash', { command: '' });
});

// --- Edit / Write: only PROGRESS.local.md ---------------------------------

test('Edit on progress/PROGRESS.local.md (forward slashes) is allowed', () => {
  allow('Edit', { file_path: 'progress/PROGRESS.local.md' });
});

test('Edit on PROGRESS.local.md via absolute repo path is allowed', () => {
  allow('Edit', { file_path: path.join(REPO_ROOT, 'progress', 'PROGRESS.local.md') });
});

test('Edit on PROGRESS.local.md with back slashes is allowed', () => {
  allow('Edit', { file_path: 'progress\\PROGRESS.local.md' });
});

test('Write on the learner stub (exercises/integers/integers.go) is DENIED', () => {
  deny('Write', { file_path: 'exercises/integers/integers.go' });
});

test('Edit on the template (not .local) is denied', () => {
  deny('Edit', { file_path: 'progress/PROGRESS.template.md' });
});

test('Write with no file_path is denied', () => {
  deny('Write', { file_path: '' });
});

// --- Edit / Write: NOTES.local.md (gym-memory) ----------------------------

test('Edit on progress/NOTES.local.md (forward slashes) is allowed', () => {
  allow('Edit', { file_path: 'progress/NOTES.local.md' });
});

test('Write on NOTES.local.md via absolute repo path is allowed', () => {
  allow('Write', { file_path: path.join(REPO_ROOT, 'progress', 'NOTES.local.md') });
});

test('Edit on NOTES.local.md with back slashes is allowed', () => {
  allow('Edit', { file_path: 'progress\\NOTES.local.md' });
});

test('Edit on the NOTES template (not .local) is denied', () => {
  deny('Edit', { file_path: 'progress/NOTES.template.md' });
});

test('Edit on an arbitrary repo file (README.md) is still denied', () => {
  deny('Edit', { file_path: 'README.md' });
});

// --- *_solution.go is sealed across every tool ----------------------------

test('Read on a _solution.go file is denied', () => {
  deny('Read', { file_path: 'exercises/integers/integers_solution.go' });
});

test('Bash referencing a solution file is denied', () => {
  deny('Bash', { command: 'go test ./exercises/integers/integers_solution.go' });
});

// --- Grep: no scanning exercises directories ------------------------------

test('Grep over an exercises directory is denied', () => {
  deny('Grep', { pattern: 'func', path: 'exercises/integers/' });
});

test('Grep against a specific .go file under exercises is allowed', () => {
  allow('Grep', { pattern: 'func', path: 'exercises/integers/integers.go' });
});

test('Grep over a non-exercises path is allowed', () => {
  allow('Grep', { pattern: 'TODO', path: 'lessons/' });
});

// --- Read / Glob / Skill: generally allowed -------------------------------

test('Read on a lesson file is allowed', () => {
  allow('Read', { file_path: 'lessons/arrays.md' });
});

test('Glob is allowed', () => {
  allow('Glob', { pattern: 'exercises/**/*_test.go' });
});

test('Skill is allowed', () => {
  allow('Skill', { skill: 'gym-ui' });
});

// --- Tools outside the allowlist ------------------------------------------

test('an unlisted tool (WebFetch) is denied', () => {
  deny('WebFetch', { url: 'https://example.com' });
});

// --- Model validation (pure helper, no HTTP) ------------------------------

test('isValidModel accepts the three Claude Code aliases', () => {
  assert.equal(isValidModel('opus'), true);
  assert.equal(isValidModel('sonnet'), true);
  assert.equal(isValidModel('haiku'), true);
});

test('isValidModel rejects unknown strings, non-strings, and empty', () => {
  assert.equal(isValidModel('gpt-4'), false);
  assert.equal(isValidModel('OPUS'), false);
  assert.equal(isValidModel(''), false);
  assert.equal(isValidModel(undefined), false);
  assert.equal(isValidModel(null), false);
  assert.equal(isValidModel(42), false);
});

// --- Session record: normalize + merge (pure helpers, no disk) -------------

test('normalizeSessionRecord passes a v1.2.1 map shape through', () => {
  const rec = normalizeSessionRecord({
    current: 'structs',
    model: 'sonnet',
    sessions: { integers: 'id-a', structs: 'id-b' },
  });
  assert.deepEqual(rec, {
    current: 'structs',
    model: 'sonnet',
    sessions: { integers: 'id-a', structs: 'id-b' },
  });
});

test('normalizeSessionRecord migrates the v1.2 single-module shape', () => {
  const rec = normalizeSessionRecord({ slug: 'integers', session_id: 'id-a', model: 'opus' });
  assert.deepEqual(rec, { current: 'integers', model: 'opus', sessions: { integers: 'id-a' } });
});

test('normalizeSessionRecord treats the legacy {session_id} shape as nothing resumable', () => {
  const rec = normalizeSessionRecord({ session_id: 'id-a' });
  assert.deepEqual(rec, { current: null, model: null, sessions: {} });
});

test('normalizeSessionRecord tolerates junk: non-objects, bad ids, bad model', () => {
  assert.deepEqual(normalizeSessionRecord(null), { current: null, model: null, sessions: {} });
  assert.deepEqual(normalizeSessionRecord('nope'), { current: null, model: null, sessions: {} });
  const rec = normalizeSessionRecord({
    current: 'maps',
    model: 'gpt-4',
    sessions: { maps: 42, sync: '', pointers: 'id-ok' },
  });
  assert.deepEqual(rec, { current: 'maps', model: null, sessions: { pointers: 'id-ok' } });
});

test('mergeSessionRecord updates one module without dropping the others', () => {
  const before = { current: 'integers', model: 'sonnet', sessions: { integers: 'id-a' } };
  const after = mergeSessionRecord(before, { current: 'structs', sessions: { structs: 'id-b' } });
  assert.deepEqual(after, {
    current: 'structs',
    model: 'sonnet',
    sessions: { integers: 'id-a', structs: 'id-b' },
  });
});

test('mergeSessionRecord forget removes exactly one module session', () => {
  const before = { current: 'integers', model: null, sessions: { integers: 'id-a', structs: 'id-b' } };
  const after = mergeSessionRecord(before, { forget: 'integers' });
  assert.deepEqual(after.sessions, { structs: 'id-b' });
  assert.equal(after.current, 'integers');
});

test('mergeSessionRecord model-only patch leaves the session map untouched', () => {
  const before = { current: 'integers', model: null, sessions: { integers: 'id-a' } };
  const after = mergeSessionRecord(before, { model: 'haiku' });
  assert.deepEqual(after, { current: 'integers', model: 'haiku', sessions: { integers: 'id-a' } });
});
