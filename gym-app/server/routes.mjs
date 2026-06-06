// Content API router (see CONTRACT.md).
// GET /curriculum · GET /lesson/:slug · GET /progress · POST /test/:slug
// The conductor conversation owns all gating and progress writes (v1.1).
import { Router } from 'express';
import { allSlugs, getLesson, parseCurriculum } from './content.mjs';
import { readProgress } from './progress.mjs';
import { runGoTest } from './tests.mjs';
import { broadcast } from './tutor.mjs';

const router = Router();

/** @type {(data: unknown) => { success: true, data: unknown, error: null }} */
const ok = (data) => ({ success: true, data, error: null });
/** @type {(error: string) => { success: false, data: null, error: string }} */
const fail = (error) => ({ success: false, data: null, error });

/** @type {Map<string, 'green'|'red'>} latest manual test status by slug (for red→green celebration) */
const lastTestStatus = new Map();

/**
 * Reject a request whose :slug is not a known curriculum slug.
 * @param {import('express').Response} res
 * @param {string} slug
 * @returns {boolean} true if invalid (response already sent)
 */
function rejectUnknownSlug(res, slug) {
  if (!allSlugs().includes(slug)) {
    res.status(404).json(fail(`unknown module slug: ${slug}`));
    return true;
  }
  return false;
}

router.get('/curriculum', (_req, res) => {
  try {
    const { parts, graduationBars } = parseCurriculum();
    const passed = barStatusMap();
    const bars = graduationBars.map((b) => ({
      ...b,
      status: passed.get(b.bar) === '✅' ? 'passed' : 'locked',
    }));
    res.json(ok({ parts, graduationBars: bars }));
  } catch (err) {
    res.status(500).json(fail(err.message));
  }
});

/**
 * Map graduation-bar number → status emoji from PROGRESS.local.md.
 * @returns {Map<number, string>}
 */
function barStatusMap() {
  try {
    return new Map(readProgress().graduationBars.map((b) => [b.bar, b.status]));
  } catch {
    return new Map();
  }
}

router.get('/lesson/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    if (rejectUnknownSlug(res, slug)) return;
    res.json(ok(getLesson(slug)));
  } catch (err) {
    res.status(500).json(fail(err.message));
  }
});

router.get('/progress', (_req, res) => {
  try {
    res.json(ok(readProgress()));
  } catch (err) {
    res.status(500).json(fail(err.message));
  }
});

/** @type {Set<string>} slugs with a go test currently running */
const testsInFlight = new Set();

router.post('/test/:slug', async (req, res) => {
  let inFlightSlug = null;
  try {
    const { slug } = req.params;
    if (rejectUnknownSlug(res, slug)) return;
    if (testsInFlight.has(slug)) {
      res.status(429).json(fail(`a test for ${slug} is already running`));
      return;
    }
    testsInFlight.add(slug);
    inFlightSlug = slug;

    const prev = lastTestStatus.get(slug);
    const result = await runGoTest(slug);
    lastTestStatus.set(slug, result.status);

    broadcast('test_result', { slug, status: result.status, output: result.output });
    if (prev === 'red' && result.status === 'green') {
      broadcast('celebrate', { reason: 'red_to_green' });
    }
    res.json(ok(result));
  } catch (err) {
    res.status(500).json(fail(err.message));
  } finally {
    if (inFlightSlug) testsInFlight.delete(inFlightSlug);
  }
});

export default router;
