// Progress state — owner: backend-content agent (see CONTRACT.md).
// Reads/writes progress/PROGRESS.local.md, copying the template on first use.
// Writes ALWAYS rebuild the whole file from the template skeleton (never patch),
// so emoji (✅ ⬜ ⭐) and structure survive byte-for-byte.
import { existsSync, writeFileSync } from 'node:fs';
import { readRepoFile, resolveInRepo } from './files.mjs';
import { findModule, parseCurriculum } from './content.mjs';

const TEMPLATE_REL = 'progress/PROGRESS.template.md';
const LOCAL_REL = 'progress/PROGRESS.local.md';

/** @typedef {{ number: number|string, module: string, finished: string, recall: string }} CompletedRow */
/** @typedef {{ bar: number, status: string }} BarRow */
/** @typedef {{ current: string, started: string, completed: CompletedRow[], graduationBars: BarRow[] }} Progress */

/** Ensure PROGRESS.local.md exists, copying the template if not. */
function ensureLocal() {
  const localAbs = resolveInRepo(LOCAL_REL);
  if (!existsSync(localAbs)) {
    writeFileSync(localAbs, readRepoFile(TEMPLATE_REL), 'utf8');
  }
}

/**
 * Read and parse the learner's progress.
 * @returns {Progress}
 */
export function readProgress() {
  ensureLocal();
  const text = readRepoFile(LOCAL_REL);
  return {
    current: matchOne(text, /-\s*\*\*current:\*\*\s*`([^`]+)`/),
    started: matchOne(text, /-\s*\*\*started:\*\*\s*`([^`]+)`/),
    completed: parseCompleted(text),
    graduationBars: parseBars(text),
  };
}

/**
 * @param {string} text
 * @param {RegExp} re
 * @returns {string}
 */
function matchOne(text, re) {
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

/**
 * Parse completed-module table rows (skips the placeholder "–" row).
 * @param {string} text
 * @returns {CompletedRow[]}
 */
function parseCompleted(text) {
  const rows = [];
  const re = /^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    rows.push({ number: Number(m[1]), module: m[2].trim(), finished: m[3].trim(), recall: m[4].trim() });
  }
  return rows;
}

/**
 * Parse graduation-bar rows ("| ⭐1 | … | ⬜ |").
 * @param {string} text
 * @returns {BarRow[]}
 */
function parseBars(text) {
  const rows = [];
  const re = /^\|\s*⭐\s*(\d+)\s*\|\s*[^|]*\|\s*([^|]*?)\s*\|/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    rows.push({ bar: Number(m[1]), status: m[2].trim() });
  }
  return rows;
}

/** Static descriptions for the three bars (mirror the template). */
const BAR_DESCRIPTIONS = {
  1: 'Build a concurrent program from scratch',
  2: 'Narrate an unfamiliar real Go file cold',
  3: 'Ship a small complete app',
};

/**
 * Rebuild the whole PROGRESS.local.md from the template skeleton + the model.
 * @param {Progress} model
 */
export function writeProgress(model) {
  const completedBody = model.completed.length
    ? model.completed
        .map((r) => `| ${r.number} | ${r.module} | ${r.finished} | ${r.recall} |`)
        .join('\n')
    : '| – | _(none yet — your first ✅ lands here)_ | | |';

  const bars = model.graduationBars.length
    ? model.graduationBars
    : [1, 2, 3].map((bar) => ({ bar, status: '⬜' }));
  const barsBody = bars
    .map((b) => `| ⭐${b.bar} | ${BAR_DESCRIPTIONS[b.bar] ?? ''} | ${b.status} |`)
    .join('\n');

  const out = `# My Go Gym Progress

> Copy this file to \`PROGRESS.local.md\` (same folder) and that becomes *your* private progress.
> \`PROGRESS.local.md\` is gitignored, so it never leaves your machine. Your AI reads it at the start of
> every session and updates it as you finish modules. Don't edit this template for yourself — copy it.

## Settings

- **current:** \`${model.current}\`           <!-- slug of the module you're on; see CURRICULUM.md -->
- **started:** \`${model.started}\`

## Completed modules

| # | module | finished (YYYY-MM-DD) | recall |
|---|--------|----------------------|--------|
${completedBody}

## Graduation bars

| bar | description | status |
|-----|-------------|--------|
${barsBody}

## Notes

<!-- Free space: things you found hard, stretch goals you did, questions to revisit. -->
-
`;

  writeFileSync(resolveInRepo(LOCAL_REL), out, 'utf8');
}

/**
 * Find the next *written* module after the given slug, in curriculum order.
 * @param {string} slug
 * @returns {string} next written slug, or the same slug if none follows
 */
function nextWrittenSlug(slug) {
  const all = parseCurriculum().parts.flatMap((p) => p.modules);
  const idx = all.findIndex((m) => m.slug === slug);
  if (idx === -1) return slug;
  for (let i = idx + 1; i < all.length; i++) {
    if (all[i].written) return all[i].slug;
  }
  return slug;
}

/**
 * Mark a module complete: append a ✅ row, advance current, persist.
 * Re-reads from disk first to avoid clobbering concurrent edits.
 * @param {string} slug
 * @param {{ number?: number, date: string }} info
 * @returns {Progress} the updated progress
 */
export function markComplete(slug, info) {
  const model = readProgress();
  const number = info.number ?? findModule(slug)?.number ?? '';
  const already = model.completed.some((r) => r.module === slug);
  const completed = already
    ? model.completed
    : [...model.completed, { number, module: slug, finished: info.date, recall: '✅' }];

  const updated = { ...model, completed, current: nextWrittenSlug(slug) };
  writeProgress(updated);
  return updated;
}
