// The Go Gym GUI server — serves the built frontend, the content API, and the tutor bridge.
// Phase-0 skeleton: routes land here in marked regions so parallel agents don't collide.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '../..');

const PORT = Number(process.env.GYM_PORT ?? 4600);
const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' }, error: null });
});

// --- content routes (owner: backend-content agent) ---------------------------
// GET /api/curriculum · GET /api/lesson/:slug · GET /api/progress · POST /api/test/:slug
// ------------------------------------------------------------------------------

// --- tutor routes (owner: tutor-host agent) ----------------------------------
// GET /api/tutor/events (SSE) · POST /api/tutor/input
// ------------------------------------------------------------------------------

// Production: serve the built frontend (dev mode uses the Vite proxy instead).
const distDir = path.join(__dirname, '../web/dist');
app.use(express.static(distDir));

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Go Gym GUI server on http://localhost:${PORT}`);
});
