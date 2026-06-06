// Content API router — owner: backend-content agent (see CONTRACT.md).
// GET /curriculum · GET /lesson/:slug · GET /progress · POST /test/:slug
// POST /quiz/:slug/answer · POST /module/:slug/complete
import { Router } from 'express';
import { allSlugs, getLesson, parseCurriculum } from './content.mjs';
import { markComplete, readProgress } from './progress.mjs';
import { runGoTest } from './tests.mjs';
import { askTutor, broadcast } from './tutor.mjs';

const router = Router();

/** @type {(data: unknown) => { success: true, data: unknown, error: null }} */
const ok = (data) => ({ success: true, data, error: null });
/** @type {(error: string) => { success: false, data: null, error: string }} */
const fail = (error) => ({ success: false, data: null, error });

// ---- In-memory session gate state (per server process) --------------------
/** @type {Map<string, 'green'|'red'>} latest test status by slug */
const lastTestStatus = new Map();
/** @type {Map<string, Map<number, 'correct'|'partial'|'wrong'>>} recall grades by slug→question */
const grades = new Map();

/**
 * Record a test result so /module/:slug/complete can gate on it. Exported so
 * other flows can feed it.
 * @param {string} slug
 * @param {'green'|'red'} status
 */
export function recordTestResult(slug, status) {
  lastTestStatus.set(slug, status);
}

/**
 * Record a recall grade so the completion gate can require all-correct.
 * @param {string} slug
 * @param {number} question
 * @param {'correct'|'partial'|'wrong'} verdict
 */
export function recordGrade(slug, question, verdict) {
  if (!grades.has(slug)) grades.set(slug, new Map());
  grades.get(slug).set(question, verdict);
}

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

router.post('/test/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    if (rejectUnknownSlug(res, slug)) return;

    const prev = lastTestStatus.get(slug);
    const result = await runGoTest(slug);
    recordTestResult(slug, result.status);

    broadcast('test_result', { slug, status: result.status, output: result.output });
    if (prev === 'red' && result.status === 'green') {
      broadcast('celebrate', { reason: 'red_to_green' });
    }
    res.json(ok(result));
  } catch (err) {
    res.status(500).json(fail(err.message));
  }
});

router.post('/module/:slug/complete', (req, res) => {
  try {
    const { slug } = req.params;
    if (rejectUnknownSlug(res, slug)) return;

    if (lastTestStatus.get(slug) !== 'green') {
      res.status(409).json(fail('test must be green before completing this module'));
      return;
    }
    const expected = getLesson(slug).recallQuestions.length;
    const graded = grades.get(slug) ?? new Map();
    const allCorrect = expected > 0
      && graded.size >= expected
      && [...graded.values()].every((v) => v === 'correct');
    if (!allCorrect) {
      res.status(409).json(fail('all recall questions must be graded correct before completing'));
      return;
    }

    const date = new Date().toISOString().slice(0, 10);
    markComplete(slug, { date });
    broadcast('module_complete', { slug, finished: date });
    broadcast('celebrate', { reason: 'module_complete' });
    res.json(ok(readProgress()));
  } catch (err) {
    res.status(500).json(fail(err.message));
  }
});

router.post('/quiz/:slug/answer', async (req, res) => {
  try {
    const { slug } = req.params;
    if (rejectUnknownSlug(res, slug)) return;

    const { question, answer, attempt } = req.body ?? {};
    if (typeof question !== 'number' || typeof answer !== 'string') {
      res.status(400).json(fail('body requires { question:number, answer:string, attempt:number }'));
      return;
    }
    const questions = getLesson(slug).recallQuestions;
    const qText = questions[question - 1] ?? `(question ${question})`;
    const prompt =
      'Grade the learner\'s recall answer.\n' +
      `Module: ${slug}\n` +
      `Question ${question}: ${qText}\n` +
      `Answer: ${answer}\n` +
      `Attempt: ${attempt ?? 1}\n` +
      'Reply with ONLY the grade JSON envelope.';

    const envelope = await askTutor(prompt, ['grade']);
    if (envelope.type !== 'grade' || !envelope.verdict) {
      res.status(502).json(fail('tutor returned a non-grade reply'));
      return;
    }
    const data = {
      verdict: envelope.verdict,
      feedback: envelope.feedback ?? '',
      reteach: envelope.reteach ?? null,
    };
    recordGrade(slug, question, data.verdict);
    broadcast('grade_result', { slug, question, ...data });
    res.json(ok(data));
  } catch (err) {
    res.status(500).json(fail(err.message));
  }
});

export default router;
