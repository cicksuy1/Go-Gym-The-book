// Isolated progress round-trip — run ONLY as a child with GYM_REPO_ROOT set.
// Named *.itest.mjs so the default `node --test` glob does not pick it up
// directly (which would run it against the real repo). content.test.mjs spawns
// it with GYM_REPO_ROOT pointed at a seeded temp repo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

test('progress round-trip preserves ✅ ⬜ ⭐ and advances current', async () => {
  const root = process.env.GYM_REPO_ROOT;
  assert.ok(root, 'GYM_REPO_ROOT must be set');

  const { readProgress, writeProgress, markComplete } = await import('./progress.mjs');

  // First read copies template -> local.
  const initial = readProgress();
  assert.equal(initial.current, 'setup');

  const model = {
    current: 'iteration',
    started: '2026-06-01',
    completed: [{ number: 1, module: 'integers', finished: '2026-06-05', recall: '✅' }],
    graduationBars: [
      { bar: 1, status: '⭐' },
      { bar: 2, status: '⬜' },
      { bar: 3, status: '⬜' },
    ],
  };
  writeProgress(model);

  const local = readFileSync(path.join(root, 'progress/PROGRESS.local.md'), 'utf8');
  assert.ok(local.includes('✅'), 'missing ✅');
  assert.ok(local.includes('⬜'), 'missing ⬜');
  assert.ok(local.includes('⭐'), 'missing ⭐');

  const back = readProgress();
  assert.equal(back.current, 'iteration');
  assert.equal(back.completed[0].recall, '✅');
  assert.equal(back.completed[0].module, 'integers');

  // markComplete advances current to the next *written* module after iteration.
  const after = markComplete('iteration', { date: '2026-06-06' });
  assert.equal(after.current, 'arrays');
  assert.ok(after.completed.some((r) => r.module === 'iteration' && r.recall === '✅'));
});
