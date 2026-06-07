# Gym GUI frontend

The React frontend of the [Go Gym GUI](../README.md): React 19 + Vite + Tailwind 4, with
`react-markdown` (+ `remark-gfm`, `rehype-highlight`) rendering the tutor's turns.

It is a thin presentation layer — all state of substance lives in the conversation on the server
side. The REST routes and SSE events this app consumes are specified in
[`../CONTRACT.md`](../CONTRACT.md).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on :5173 with HMR — proxies `/api` → `http://localhost:4600` (see `vite.config.ts`), so run the Express server too (`npm run dev` in `../` starts both) |
| `npm run build` | Type-check + production build into `dist/` (served by the Express server) |
| `npm run lint` | ESLint |

To run the whole app, start from [`../README.md`](../README.md) — or `task up` at the repo root.
