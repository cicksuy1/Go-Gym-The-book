// The Go Gym GUI server — serves the built frontend, the content API, and the tutor bridge.
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
const { tutorRouter, broadcast } = await import('./tutor.mjs');
app.use('/api', contentRouter);
app.use('/api/tutor', tutorRouter);

// PROGRESS.local.md is the single source of truth, shared with CLI sessions —
// watch its directory (the file may not exist yet) and tell clients to refetch.
try {
  let timer = null;
  watch(path.join(REPO_ROOT, 'progress'), (_event, filename) => {
    if (filename !== 'PROGRESS.local.md') return;
    clearTimeout(timer);
    timer = setTimeout(() => broadcast('progress_changed', {}), PROGRESS_DEBOUNCE_MS);
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
});
