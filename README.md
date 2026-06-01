# The Go Gym 🏋️

**Learn Go by doing — with an AI tutor that actually teaches.**

The Go Gym is an open-source Go course you take *with an AI assistant*. You read a short, why-first
chapter, then make a failing test pass. Your AI explains the idea, watches you do the rep, tests your
memory, and only moves on when you've genuinely got it. No passive video-watching, no terse walls of code.

It's inspired by two things: the **test-driven rigor** of
[*Learn Go with Tests*](https://quii.gitbook.io/learn-go-with-tests/), and the **why-first, mental-model
storytelling** of [the Rust Book](https://doc.rust-lang.org/book/).

## Who it's for

- You want to learn Go and have an AI coding assistant (Claude Code, or any agent that reads `AGENTS.md`).
- You've bounced off terse tutorials and want the *why* before the *how*.
- You learn by building, not by watching.

## How it works — three layers

1. **A book** (`book/`, built with [mdBook](https://rust-lang.github.io/mdBook/)) — one why-first chapter per concept.
2. **Exercises** (one Go package per module) — each ships a failing test you make pass.
3. **An AI conductor** (`AGENTS.md`) — runs you through it: explains, gates on real `go test` results,
   quizzes you, tracks progress, and keeps the pace sane so you don't burn out.

Every module follows the same loop: **why-first → tiny example → make the test green → recall quiz →
real code in the wild.**

## Quickstart

**Prerequisites:** [Go](https://go.dev/dl/) 1.26+, an AI coding agent, and (optional, to read the book in a
browser) [mdBook](https://rust-lang.github.io/mdBook/guide/installation.html).

```bash
# 1. Get the course
git clone <your-fork-url> go-gym && cd go-gym

# 2. (optional) read the book in your browser at http://127.0.0.1:3000
mdbook serve book

# 3. Make your private progress file
cp progress/PROGRESS.template.md progress/PROGRESS.local.md

# 4. Open the folder in your AI agent and say:
#    "start the Go Gym"
```

Your agent reads `AGENTS.md`, sees you're at Module 1, and begins. From then on: `continue`, `next`,
`test me`, `where am I`, `I'm stuck`, or `add an exercise`.

### Three ways to start
- **Any agent:** it auto-reads `AGENTS.md`; just say *"start the Go Gym."*
- **Claude Code:** run the **`/go-gym`** skill — it shows where you are and drives the next module.
- **Prefer reading first?** Follow this README, `mdbook serve book`, and let your agent take it from there.

## Curriculum & progress

The full module list and the graduation bars live in **[`CURRICULUM.md`](CURRICULUM.md)** (the single
source of truth). Your personal progress lives in `progress/PROGRESS.local.md` (gitignored — it never
leaves your machine).

## Contributing

Want to write or improve a chapter? See **[`CONTRIBUTING.md`](CONTRIBUTING.md)** — chapters follow a fixed
10-section anatomy and a build-tag reference-solution convention, both enforced by the AI's QA mode.

## License

[MIT](LICENSE).
