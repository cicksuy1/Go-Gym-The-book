// The Go Gym GUI server — a tunnel to the real /go-gym conductor conversation.
// Serves the built frontend, the content API, and the conversation bridge.
import express from 'express';
import { watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '../..');

const PORT = Number(process.env.GYM_PORT ?? 4600);
const PROGRESS_DEBOUNCE_MS = 300;
const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' }, error: null });
});

// Routers live in their own modules so parallel work never collides here.
const { default: contentRouter } = await import('./routes.mjs');
const { tutorRouter, broadcast, startTutor } = await import('./tutor.mjs');
const { readProgress } = await import('./progress.mjs');
app.use('/api', contentRouter);
app.use('/api/tutor', tutorRouter);

// PROGRESS.local.md is the single source of truth — the conductor writes it
// itself. Watch the directory (the file may not exist yet), tell clients to
// refetch, and celebrate newly completed modules by diffing the ✅ rows.
function completedSlugs() {
  try {
    return new Set(readProgress().completed.map((r) => r.module));
  } catch {
    return new Set();
  }
}

try {
  let known = completedSlugs();
  let timer = null;
  watch(path.join(REPO_ROOT, 'progress'), (_event, filename) => {
    if (filename !== 'PROGRESS.local.md') return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      broadcast('progress_changed', {});
      const now = completedSlugs();
      for (const slug of now) {
        if (!known.has(slug)) {
          broadcast('module_complete', { slug });
          broadcast('celebrate', { reason: 'module_complete' });
        }
      }
      known = now;
    }, PROGRESS_DEBOUNCE_MS);
  });
} catch (err) {
  console.error('progress watch unavailable:', err.message);
}

// Production: serve the built frontend (dev mode uses the Vite proxy instead).
const distDir = path.join(__dirname, '../web/dist');
app.use(express.static(distDir));
// SPA fallback: any non-API GET serves the app shell.
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Go Gym GUI server on http://localhost:${PORT}`);
  // Open the conductor conversation eagerly so the tutor is visibly online.
  startTutor();
});
