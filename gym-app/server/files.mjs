// Safe repo file access — owner: backend-content agent (see CONTRACT.md).
// Every read in the server goes through readRepoFile so that (a) we never escape
// the repo root via path traversal and (b) *_solution.go content can never leak.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Repo root. Resolves ../../ from gym-app/server/. Overridable via GYM_REPO_ROOT
 * for tests (so progress round-trips can target a temp dir).
 * @type {string}
 */
export const REPO_ROOT = process.env.GYM_REPO_ROOT
  ? path.resolve(process.env.GYM_REPO_ROOT)
  : path.resolve(__dirname, '../..');

/** Reference-solution files must never be read into any response. */
const SOLUTION_RE = /_solution\.go$/i;

/**
 * Resolve a repo-relative path and verify it stays inside REPO_ROOT.
 * @param {string} relPath
 * @returns {string} absolute path, guaranteed inside REPO_ROOT
 */
export function resolveInRepo(relPath) {
  const abs = path.resolve(REPO_ROOT, relPath);
  const rootWithSep = REPO_ROOT.endsWith(path.sep) ? REPO_ROOT : REPO_ROOT + path.sep;
  if (abs !== REPO_ROOT && !abs.startsWith(rootWithSep)) {
    throw new Error(`path escapes repo root: ${relPath}`);
  }
  return abs;
}

/**
 * Read a repo file as UTF-8, refusing path traversal and *_solution.go.
 * @param {string} relPath repo-relative path
 * @returns {string}
 */
export function readRepoFile(relPath) {
  if (SOLUTION_RE.test(relPath)) {
    throw new Error('refusing to read reference solution file');
  }
  const abs = resolveInRepo(relPath);
  if (SOLUTION_RE.test(abs)) {
    throw new Error('refusing to read reference solution file');
  }
  return readFileSync(abs, 'utf8');
}

/**
 * Guard a :slug param against the known curriculum slug list.
 * @param {string} slug
 * @param {readonly string[]} slugs
 * @returns {boolean}
 */
export function isValidSlug(slug, slugs) {
  return typeof slug === 'string' && slugs.includes(slug);
}
