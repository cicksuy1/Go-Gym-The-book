// Tests for the conductor's tool permission policy (evaluateToolUse).
// Pure + synchronous — no live SDK session is opened. Importing tutor.mjs only
// registers routes and exports; the conversation host is eager only via
// startTutor(), which these tests never call.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateToolUse } from './tutor.mjs';

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
