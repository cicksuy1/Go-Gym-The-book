// Tests for the per-module chat log (chatlog.mjs). Each test points the chats
// base dir at a fresh temp dir via setChatsDir(), so the real .chats/ is never
// touched, and cleans up after itself.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { appendTurn, readTurns, setChatsDir, getChatsDir } from './chatlog.mjs';

/** @type {string[]} dirs to clean up after each test */
const tmpDirs = [];

function freshChatsDir() {
  const dir = mkdtempSync(path.join(tmpdir(), 'gym-chats-'));
  tmpDirs.push(dir);
  setChatsDir(dir);
  return dir;
}

afterEach(() => {
  while (tmpDirs.length) {
    const dir = tmpDirs.pop();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('append then read round-trips turns in order', async () => {
  // Arrange
  freshChatsDir();

  // Act
  await appendTurn('arrays', { kind: 'tutor', text: 'hello', ts: 1000 });
  await appendTurn('arrays', { kind: 'learner', text: 'hi back', ts: 2000 });
  const turns = await readTurns('arrays');

  // Assert
  assert.deepEqual(turns, [
    { kind: 'tutor', text: 'hello', ts: 1000 },
    { kind: 'learner', text: 'hi back', ts: 2000 },
  ]);
});

test('readTurns on a missing file returns an empty array', async () => {
  // Arrange
  freshChatsDir();

  // Act
  const turns = await readTurns('never-written');

  // Assert
  assert.deepEqual(turns, []);
});

test('a corrupt/partial trailing line is skipped, earlier lines survive', async () => {
  // Arrange
  const dir = freshChatsDir();
  mkdirSync(dir, { recursive: true });
  const good = JSON.stringify({ kind: 'tutor', text: 'first', ts: 1 });
  // Simulate a crash mid-write: a valid line followed by a truncated JSON object.
  writeFileSync(path.join(dir, 'slices.jsonl'), `${good}\n{"kind":"tutor","text":"trunc`, 'utf8');

  // Act
  const turns = await readTurns('slices');

  // Assert
  assert.equal(turns.length, 1);
  assert.deepEqual(turns[0], { kind: 'tutor', text: 'first', ts: 1 });
});

test('append only persists kind/text/ts (no extra fields leak through)', async () => {
  // Arrange
  freshChatsDir();

  // Act
  await appendTurn('maps', { kind: 'activity', text: '🧪 go test', ts: 5, secret: 'x' });
  const [turn] = await readTurns('maps');

  // Assert
  assert.deepEqual(Object.keys(turn).sort(), ['kind', 'text', 'ts']);
});

test('setChatsDir/getChatsDir round-trip an absolute path', () => {
  // Arrange
  const dir = freshChatsDir();

  // Act + Assert
  assert.equal(getChatsDir(), path.resolve(dir));
});
