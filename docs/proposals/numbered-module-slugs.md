# RFC: Numbered module slugs (`01-integers` … `19-generics-revisit`)

**Status:** proposed — not implemented
**Question:** should the module folders/files be renamed to numbered form (`exercises/04-structs/`,
`lessons/04-structs.md`) so they sort in course order in the file tree?

---

## TL;DR

- **Ordering already works everywhere that matters.** The GUI, the book sidebar, and the conductor all
  take their order from `CURRICULUM.md` row order — *nothing* in the system sorts by folder or file name.
- The **only** thing a rename fixes is the alphabetical view in a file explorer / IDE tree.
- The cost is ~120 mechanical reference edits, **plus two non-mechanical gotchas**: learner-state
  migration and changed published book URLs.
- **Recommendation: don't rename.** Revisit only if the file-tree pain becomes real (e.g., contributors
  repeatedly confused about course order while browsing the repo).

---

## How ordering actually works today

The single source of truth is the module table in `CURRICULUM.md`
(`| # | Module | slug | kind | status |`). Three consumers read it, all in **row order**:

| Consumer | Code | Effect |
|---|---|---|
| Web GUI | `gym-app/server/content.mjs` → `parseCurriculum()` | Dashboard lists modules in table order |
| Book sidebar | `tools/gen-book.mjs` | Regenerates `book/src/SUMMARY.md` in table order |
| Conductor | `AGENTS.md` ("read `CURRICULUM.md` for module order") | "next module" walks the table |

The `#` column is display-only — no code parses it for sorting. Renaming files would therefore **not
change ordering anywhere in the app or book**; it only changes how `ls` / the IDE tree sorts.

## What would NOT need changes (slug-agnostic by design)

- **All gym-app server code** — `content.mjs`, `routes.mjs`, `tests.mjs`, `progress.mjs`, `tutor.mjs`
  build paths from the slug at runtime (`lessons/${slug}.md`, `exercises/${slug}/`).
- **All web client code** — slugs flow through the API; nothing hardcoded except `mock.ts` (see below).
- **Skills** — `go-gym`, `gym-ui`, `gym-memory` all use `‹slug›` placeholders.
- **`Taskfile.yml`** — `go test ./exercises/{{.SLUG}}/` is a variable.
- **Go packages** — Go allows folder ≠ package name, so `exercises/04-structs/` may keep
  `package structs`. (It must: `package 04-structs` is an illegal identifier. Precedent already exists —
  `select/` → `package racer`, `sync/` → `package counter`, `context/` → `package ctxserver`.)
- **`go.mod`, CI workflow** (`deploy-book.yml` watches directories generically).

## What MUST change (if accepted)

| Area | Work | Count |
|---|---|---|
| `exercises/` directories | `git mv structs 04-structs` etc. | 19 dirs |
| `lessons/*.md` files | `git mv structs.md 04-structs.md` etc. | 20 files |
| `CURRICULUM.md` | slug column updates | 20 rows (written modules) |
| Paths inside lessons | `exercises/<slug>/…` references in lesson text | ~70 refs |
| `book/src/*.md` + `SUMMARY.md` | regenerate with `node tools/gen-book.mjs`; **delete stale wrappers first** | 20 + 1 files (auto) |
| `gym-app/web/src/lib/mock.ts` | hardcoded mock curriculum slugs | ~25 strings |
| Server tests | hardcoded slugs in `content.test.mjs`, `tutor.test.mjs`, `progress.itest.mjs` | ~12 asserts |
| Doc examples | `README.md` (`SLUG=arrays`), `CONTRIBUTING.md` (`integers` example), `.claude/skills/gym-ui/references/examples.md` | 3 files |

## The two real gotchas

1. **Learner state breaks without migration.** `progress/PROGRESS.local.md` stores `current: <slug>` and
   completed-module rows by slug; `.session.json` keys **per-module GUI chat sessions** by slug. Rename
   without migrating these and the learner's progress and conversations orphan silently. A one-off
   migration script (old-slug → new-slug map over both files) would be required.
2. **Published book URLs change.** GitHub Pages pages move (`…/structs.html` → `…/04-structs.html`);
   existing links 404. mdBook has no built-in redirects — would need a `[output.html.redirect]` table in
   `book.toml` for every renamed page.

## Options

- **A — Full rename** (`01-integers` zero-padded everywhere): file tree sorts perfectly; full cost above.
- **B — Number `lessons/` only**: halves the blast radius (no exercise dir renames, no `go test` path
  changes in lesson text beyond the header lines, no session-key migration — sessions key on the module
  slug which would stay). Still changes book URLs. File tree fixed only for `lessons/`.
- **C — Skip** *(recommended)*: keep slugs as-is; ordering stays driven by `CURRICULUM.md`. Zero cost.

## Migration checklist (only if A or B is accepted)

1. Branch; freeze other course PRs to avoid rename conflicts.
2. `git mv` dirs/files (zero-padded two-digit prefixes).
3. Update `CURRICULUM.md` slug column.
4. Search-replace `exercises/<old>/` → `exercises/<new>/` across `lessons/`.
5. Delete `book/src/<old>.md` wrappers; run `node tools/gen-book.mjs`; add redirects to `book.toml`.
6. Update `mock.ts`, server test assertions, doc examples.
7. Write + run the learner-state migration (PROGRESS.local.md, .session.json).
8. Gates: server tests green, `mdbook build` clean, stub RED / `-tags solution` GREEN per module,
   GUI smoke test (open a module, send a tutor turn, run a test).
