# The Go Gym

**Learn Go by doing — one runnable idea per chapter, each one nailed down with a test you write yourself.**

This is a hands-on Go course you take *with an AI tutor*. Every chapter is short and why-first: you read
the mental model, make a single failing test pass, then get quizzed on what just clicked. The tutor only
moves you on once you've genuinely got it. No passive video-watching, no terse walls of code — you learn
by building, with something checking your work the whole way.

## Two inspirations

The Go Gym borrows from the best of two worlds:

- The **test-driven rigor** of [*Learn Go with Tests*](https://quii.gitbook.io/learn-go-with-tests/) —
  every concept earns its keep by being proven with a test.
- The **why-first, mental-model storytelling** of [the Rust Book](https://doc.rust-lang.org/book/) — the
  *why* and the picture come before any syntax.

It's served with **mdBook** (the same engine that builds the Rust Book) and grows one chapter at a time.

## How a chapter works

Every chapter walks the same loop, so you always know where you are:

1. **Why-first** — what the feature is *for*, and the mental picture, before any code.
2. **A tiny runnable example** — small, real, with the output shown.
3. **Your rep** — a failing test you make pass (**RED → GREEN**). This is where the learning lands.
4. **Active recall** — answer a few questions without peeking. *This is the retention fix.*
5. **Real code in the wild** — spot the same idea live in real Go, usually the standard library.

That loop expands into a fixed **10-section anatomy** (a hook, where we're going, the big idea, the
details and traps, worked code, prove-it-with-a-test, your rep, active recall, real-code-in-the-wild, and
a what-you-learned summary) — so no matter which chapter you open, it feels the same.

The prose and the practice live side by side but in separate places: each chapter's text is a markdown
file in **`lessons/<slug>.md`**, and its exercise is a Go package in **`exercises/<slug>/`** (a failing
stub you fix, a reference solution, and the test). A small generator, `tools/gen-book.mjs`, wires the
lessons into this book — so the book you're reading and the code you run never drift apart.

## The roadmap

The course is five Parts. The sidebar shows every chapter in order: written ones are links, upcoming ones
are greyed-out drafts, so the whole journey is always visible.

- **Part 0 — Getting Started** — install Go, and learn how a project and its packages fit together.
- **Part 1 — Go Fundamentals** — the core language, re-anchored: integers, iteration, slices, structs,
  interfaces, pointers, maps, dependency injection, mocking, concurrency, generics, and more.
- **Part 2 — Testing Fundamentals** — acceptance tests, working without mocks, and a refactoring discipline.
- **Part 3 — Build an Application** — put it together into a small but complete app, end to end.
- **Part 4 — Q&A + Meta** — the sharper corners and the anti-patterns to avoid.

## The three graduation bars

The finish line isn't "watched every chapter" — it's three things you can *do*, in order:

- ⭐ **Build from scratch** — from a blank file, write a worker-goroutine + channel + `select`/timeout
  program, with passing tests, unaided.
- ⭐ **Read real code** — open an unfamiliar Go **standard-library** file cold and narrate every line.
- ⭐ **Ship something** — build a small but complete app, end to end.

## Where am I?

Your progress lives in `progress/PROGRESS.local.md`, which your AI keeps updated as you go — so you can
close the laptop and pick up exactly where you left off.
