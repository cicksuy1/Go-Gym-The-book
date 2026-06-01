# The Go Gym Book

Your own Go course — one runnable idea per chapter, every concept nailed down with a test you write
yourself.

It draws on two inspirations: the **TDD rigor** of [*Learn Go with Tests*](https://quii.gitbook.io/learn-go-with-tests/),
and the **why-first, mental-model storytelling** of [the **Rust Book**](https://doc.rust-lang.org/book/) —
combined into something that's its own thing.

This book is served with **mdBook** (the same engine that builds the Rust Book) and grows one chapter
at a time.

## How each chapter works (the 5-step loop)

1. **Why-first** — what the feature is *for*, and the mental picture.
2. **30-second example** — a tiny runnable snippet.
3. **Your rep** — a failing test you fix (RED → GREEN) in the module's folder.
4. **Active recall** — answer the questions without peeking. *This is the retention fix.*
5. **Real-code peek** — see the concept live in real Go code (e.g. the standard library).

Each chapter's text is the same `.md` that lives next to its exercise code in
`<module>/<module>.md` (at the repo root) — so the book and the practice never drift apart.

## Anatomy of a chapter (the standard)

Every chapter is full-length and follows the same skeleton, so you always know where you are:

1. **A hook** — why this topic secretly matters.
2. **Where we're going** — the concrete skills you'll have by the end.
3. **The big idea** — the mental model, in plain language, *before* any syntax.
4. **The details** — the type/feature explored properly, with the traps called out.
5. **Worked code** — small, runnable, with the output shown.
6. **Prove it with a test** — the TDD rep, and *why* the test is shaped that way.
7. **🏋️ Your rep** — RED → GREEN, plus optional stretch goals.
8. **🧠 Active recall** — questions to answer without peeking (the retention fix).
9. **🔍 Real code in the wild** — the same idea spotted in real Go code, e.g. the standard library.
10. **What you learned** — a tight summary + what's next.

## The three graduation bars (the finish line, in order)

- ⭐ **Bar 1 — Build from scratch:** a worker-goroutine + channel + `select`/timeout program, with passing tests, from a blank file.
- ⭐ **Bar 2 — Read real code:** open an unfamiliar Go **standard-library** file cold and narrate every line.
- ⭐ **Bar 3 — Ship something:** build a small but complete app, end to end.

## Where am I?

Your progress lives in `progress/PROGRESS.local.md`, which your AI keeps updated. The full roadmap is in
the sidebar: written chapters are links, upcoming ones are greyed-out drafts.
