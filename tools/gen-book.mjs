#!/usr/bin/env node
// Regenerates book/src/SUMMARY.md and the per-module include wrapper pages from CURRICULUM.md.
//
//   node tools/gen-book.mjs
//
// Modules whose lesson file doesn't exist yet appear as greyed-out DRAFT entries, so the full
// roadmap is always visible in the sidebar. introduction.md is never touched.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

// --- Parse CURRICULUM.md: group modules by "## Part N" header, read table rows. ---
const lines = readFileSync(join(root, 'CURRICULUM.md'), 'utf8').split(/\r?\n/);
const partHeader = /^##\s+(Part\s+\d+[^\n]*)/;
const stopHeader = /^##\s+Graduation/i;        // stop before the graduation-bars section
const rowRe = /^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|/;

const parts = [];
let part = null;
let stopped = false;
for (const line of lines) {
  if (stopHeader.test(line)) stopped = true;
  if (stopped) continue;
  const ph = line.match(partHeader);
  if (ph) { part = { title: ph[1].trim(), modules: [] }; parts.push(part); continue; }
  const m = line.match(rowRe);
  if (m && part) part.modules.push({ n: m[1], title: m[2].trim(), slug: m[3].trim() });
}

// --- Emit SUMMARY.md + wrapper pages. ---
let summary = '# Summary\n\n[Introduction](introduction.md)\n';
const written = [];
const srcDir = join(root, 'book', 'src');

// Optional orientation prefix pages (hand-maintained in book/src, like introduction.md).
if (existsSync(join(srcDir, 'tdd.md'))) summary += '[The TDD Cycle](tdd.md)\n';

for (const p of parts) {
  summary += `\n---\n\n# ${p.title}\n\n`;
  for (const mod of p.modules) {
    const label = `${mod.n} · ${mod.title}`;
    const lessonAbs = join(root, mod.slug, `${mod.slug}.md`);
    if (!existsSync(lessonAbs)) {
      summary += `- [${label}]()\n`;            // draft: not written yet
      continue;
    }
    writeFileSync(join(srcDir, `${mod.slug}.md`), `{{#include ../../${mod.slug}/${mod.slug}.md}}\n`);
    written.push(`${mod.slug}.md`);
    summary += `- [${label}](${mod.slug}.md)\n`;
  }
}

writeFileSync(join(srcDir, 'SUMMARY.md'), summary);
console.log(`Wrote SUMMARY.md and ${written.length} page(s).`);
