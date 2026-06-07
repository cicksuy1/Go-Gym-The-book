// Curriculum + lesson parsing — owner: backend-content agent (see CONTRACT.md).
// Ports the table/part regexes from tools/gen-book.mjs and adds kind/written,
// graduation bars, and the "## 🧠 Active recall" question parser.
import { existsSync } from 'node:fs';
import { readRepoFile, resolveInRepo } from './files.mjs';

/** @typedef {{ number: number, title: string, slug: string, kind: 'fundamentals'|'advance', written: boolean, hasExercise: boolean }} Module */
/** @typedef {{ title: string, modules: Module[] }} Part */
/** @typedef {{ bar: number, description: string }} GraduationBar */
/** @typedef {{ parts: Part[], graduationBars: GraduationBar[] }} Curriculum */

const partHeader = /^##\s+(Part\s+\d+[^\n]*)/;
const stopHeader = /^##\s+Graduation/i;
// | # | Module | `slug` | kind | status |  — capture number, title, slug, kind, status cells.
const rowRe = /^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|/;
// "- ⭐ **Bar 1 — …:** description …"  (description runs until the next blank line / bar).
const barRe = /^-\s*⭐?\s*\*\*Bar\s+(\d+)\s*[—-]\s*([^*]*?)\*\*\s*(.*)$/;

/** @type {Curriculum | null} */
let cache = null;

/** Clear the curriculum cache (tests). */
export function invalidate() {
  cache = null;
}

/**
 * Map a kind cell (🟢 / 🔵) to the contract's kind string.
 * @param {string} cell
 * @returns {'fundamentals'|'advance'}
 */
function parseKind(cell) {
  return cell.includes('🔵') ? 'advance' : 'fundamentals';
}

/**
 * Parse the graduation-bars section into [{bar, description}].
 * @param {string[]} lines
 * @returns {GraduationBar[]}
 */
function parseGraduationBars(lines) {
  const bars = [];
  let started = false;
  for (const line of lines) {
    if (stopHeader.test(line)) { started = true; continue; }
    if (!started) continue;
    const m = line.match(barRe);
    if (m) {
      const desc = `${m[2].trim()} ${m[3].trim()}`.replace(/\s+/g, ' ').trim();
      bars.push({ bar: Number(m[1]), description: desc });
    }
  }
  return bars;
}

/**
 * Parse CURRICULUM.md into parts + modules + graduation bars.
 * @returns {Curriculum}
 */
export function parseCurriculum() {
  if (cache) return cache;
  const lines = readRepoFile('CURRICULUM.md').split(/\r?\n/);

  /** @type {Part[]} */
  const parts = [];
  /** @type {Part | null} */
  let part = null;
  let stopped = false;

  for (const line of lines) {
    if (stopHeader.test(line)) stopped = true;
    if (stopped) continue;
    const ph = line.match(partHeader);
    if (ph) { part = { title: ph[1].trim(), modules: [] }; parts.push(part); continue; }
    const m = line.match(rowRe);
    if (m && part) {
      const slug = m[3].trim();
      part.modules.push({
        number: Number(m[1]),
        title: m[2].trim(),
        slug,
        kind: parseKind(m[4]),
        written: m[5].includes('✍️'),
        hasExercise: existsSync(resolveInRepo(`exercises/${slug}`)),
      });
    }
  }

  cache = { parts, graduationBars: parseGraduationBars(lines) };
  return cache;
}

/**
 * Flat list of every known slug (the path-traversal allow-list).
 * @returns {string[]}
 */
export function allSlugs() {
  return parseCurriculum().parts.flatMap((p) => p.modules.map((m) => m.slug));
}

/**
 * Find a module record by slug, or null.
 * @param {string} slug
 * @returns {Module | null}
 */
export function findModule(slug) {
  for (const p of parseCurriculum().parts) {
    const m = p.modules.find((mod) => mod.slug === slug);
    if (m) return m;
  }
  return null;
}

/**
 * Parse numbered recall questions from the "## 🧠 Active recall" section.
 * Items are "N. text" with multi-line continuation, until --- or the next ##.
 * @param {string} markdown
 * @returns {string[]}
 */
export function parseRecallQuestions(markdown) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s+.*Active recall/i.test(l));
  if (start === -1) return [];

  /** @type {string[]} */
  const questions = [];
  let buf = null;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^---\s*$/.test(line) || /^##\s/.test(line)) break;
    const item = line.match(/^\s*\d+\.\s+(.*)$/);
    if (item) {
      if (buf !== null) questions.push(buf.trim());
      buf = item[1];
    } else if (buf !== null && line.trim() !== '') {
      buf += ` ${line.trim()}`;
    }
  }
  if (buf !== null) questions.push(buf.trim());
  return questions;
}

/**
 * Load a lesson: full markdown, recall questions, and rep file paths.
 * @param {string} slug
 * @returns {{ slug: string, markdown: string, recallQuestions: string[], repFiles: { stub: string, test: string } | null }}
 */
export function getLesson(slug) {
  const markdown = readRepoFile(`lessons/${slug}.md`);
  const hasExercise = existsSync(resolveInRepo(`exercises/${slug}`));
  return {
    slug,
    markdown,
    recallQuestions: parseRecallQuestions(markdown),
    repFiles: hasExercise
      ? { stub: `exercises/${slug}/${slug}.go`, test: `exercises/${slug}/${slug}_test.go` }
      : null,
  };
}
