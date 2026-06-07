// Go test runner — owner: backend-content agent (see CONTRACT.md).
// Spawns `go test ./exercises/<slug>/` with no shell, captures + ANSI-strips output.
import { spawn } from 'node:child_process';
import { REPO_ROOT } from './files.mjs';

const TIMEOUT_MS = 120_000;
const RACE_SLUGS = new Set(['concurrency', 'select', 'sync']);
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\[[0-9;]*m/g;

/** @typedef {{ status: 'green'|'red', output: string, durationMs: number }} TestResult */

/**
 * Strip ANSI colour escapes from captured output.
 * @param {string} s
 * @returns {string}
 */
function stripAnsi(s) {
  return s.replace(ANSI_RE, '');
}

/**
 * Run `go test` for one module. NEVER uses a shell; args are an array so the
 * slug (already curriculum-validated by the caller) is passed as a literal arg.
 * @param {string} slug
 * @returns {Promise<TestResult>}
 */
export function runGoTest(slug) {
  const args = ['test'];
  if (RACE_SLUGS.has(slug)) args.push('-race');
  args.push(`./exercises/${slug}/`);

  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn('go', args, { cwd: REPO_ROOT, shell: false });

    let out = '';
    let timedOut = false;
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { out += d.toString(); });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, TIMEOUT_MS);

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ status: 'red', output: stripAnsi(`${out}\nfailed to start go test: ${err.message}`), durationMs: Date.now() - start });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      const durationMs = Date.now() - start;
      if (timedOut) {
        resolve({ status: 'red', output: stripAnsi(`${out}\ntest timed out after ${TIMEOUT_MS / 1000}s and was killed`), durationMs });
        return;
      }
      resolve({ status: code === 0 ? 'green' : 'red', output: stripAnsi(out), durationMs });
    });
  });
}
