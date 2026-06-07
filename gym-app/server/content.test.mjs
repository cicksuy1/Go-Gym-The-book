// Unit tests — owner: backend-content agent. Run: node --test gym-app/server/
//
// Content/curriculum/lesson/files tests run against the real repo. The progress
// round-trip test runs against an isolated temp repo by spawning a child
// `node --test` with GYM_REPO_ROOT set, so it never touches the real
// PROGRESS.local.md and exercises the env override in files.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REAL_ROOT = path.resolve(HERE, '../..');

// --- Curriculum + lesson parsing (real repo) -------------------------------
test('curriculum parses >=30 modules across >=4 parts incl. integers', async () => {
  const { parseCurriculum, allSlugs } = await import('./content.mjs');
  const { parts } = parseCurriculum();
  const moduleCount = parts.reduce((n, p) => n + p.modules.length, 0);
  assert.ok(parts.length >= 4, `expected >=4 parts, got ${parts.length}`);
  assert.ok(moduleCount >= 30, `expected >=30 modules, got ${moduleCount}`);
  assert.ok(allSlugs().includes('integers'), 'integers slug missing');

  const integers = parts.flatMap((p) => p.modules).find((m) => m.slug === 'integers');
  assert.equal(integers.kind, 'fundamentals');
  assert.equal(integers.written, true);
  assert.equal(integers.hasExercise, true);
});

test('graduation bars parse into >=3 entries', async () => {
  const { parseCurriculum } = await import('./content.mjs');
  assert.ok(parseCurriculum().graduationBars.length >= 3);
});

test('integers lesson yields 4 recall questions + rep files', async () => {
  const { getLesson } = await import('./content.mjs');
  const lesson = getLesson('integers');
  assert.equal(lesson.recallQuestions.length, 4);
  assert.match(lesson.markdown, /Active recall/);
  assert.deepEqual(lesson.repFiles, {
    stub: 'exercises/integers/integers.go',
    test: 'exercises/integers/integers_test.go',
  });
});

// --- files.mjs guards (real repo) ------------------------------------------
test('readRepoFile refuses *_solution.go and path escape', async () => {
  const { readRepoFile } = await import('./files.mjs');
  assert.throws(() => readRepoFile('exercises/integers/integers_solution.go'), /solution/i);
  assert.throws(() => readRepoFile('../escape'), /escapes repo root/);
});

// --- progress round-trip in an isolated temp repo (child process) ----------
test('progress round-trip preserves emoji byte-for-byte (isolated repo)', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'gym-progress-'));
  mkdirSync(path.join(dir, 'progress'), { recursive: true });
  cpSync(path.join(REAL_ROOT, 'progress/PROGRESS.template.md'), path.join(dir, 'progress/PROGRESS.template.md'));
  cpSync(path.join(REAL_ROOT, 'CURRICULUM.md'), path.join(dir, 'CURRICULUM.md'));

  const child = spawnSync(process.execPath, ['--test', path.join(HERE, 'progress.itest.mjs')], {
    env: { ...process.env, GYM_REPO_ROOT: dir },
    encoding: 'utf8',
  });
  assert.equal(child.status, 0, `progress itest failed:\n${child.stdout}\n${child.stderr}`);
});
