# The Go Gym

Most Go tutorials pour syntax over you and hope it sticks. It rarely does — you watch, you nod, and a
week later the slice tricks are gone. The Go Gym is built the opposite way: you learn one idea at a time,
and you *earn* each one by turning a failing test green with your own hands. An AI tutor works through it
beside you — explaining the *why* before the *how*, watching you do the rep, and refusing to move on until
the idea is genuinely yours. No videos to half-watch, no walls of code to skim. You read the picture
first, then you build.

## What you'll be able to do

The finish line isn't "read every chapter." It's three things you can *do* — earned in order:

- ⭐ **Build from scratch.** From a blank file, write a worker-goroutine + channel + `select`/timeout
  program, with passing tests, unaided.
- ⭐ **Read real code.** Open an unfamiliar file from Go's own standard library, cold, and narrate every
  line.
- ⭐ **Ship something.** Build a small but complete app, end to end.

Everything in the course is aimed at those three moments.

## How a chapter works

Every chapter walks the same short loop, so you always know where you are. It opens with the *why* — what
a feature is for and the mental picture behind it — then shows a tiny runnable example. From there you do
**your rep**: a failing test you make pass, red to green, in real Go code. Once it's green, the tutor
quizzes you from memory (this is the part that makes it actually stick), and finally points you at the same
idea living in the wild — usually somewhere in the standard library, so you see it's not a toy.

That's the rhythm of all of them: **why first, then a rep, then recall, then the real thing.** Open any
chapter and it feels the same.

## Where it comes from

The Go Gym stands on two shoulders. From [*Learn Go with Tests*](https://quii.gitbook.io/learn-go-with-tests/)
it takes a simple discipline: no idea is "learned" until a test proves it. From
[the Rust Book](https://doc.rust-lang.org/book/) it takes the belief that the *why* and the mental model
come before any syntax — and the warmth to match. It's served with mdBook, the same engine that builds the
Rust Book, and it grows one chapter at a time.

## The roadmap

The course runs in five Parts, and the sidebar shows all of them at once — written chapters are links,
upcoming ones are greyed-out drafts, so the whole road is always in view:

- **Part 0 — Getting Started:** install Go and learn how a project and its packages fit together.
- **Part 1 — Go Fundamentals:** the core language, properly re-anchored — from integers all the way to generics.
- **Part 2 — Testing Fundamentals:** acceptance tests, working without mocks, and a refactoring discipline.
- **Part 3 — Build an Application:** put it all together into a small but complete app.
- **Part 4 — Q&A + Meta:** the sharper corners, and the anti-patterns worth avoiding.

## Running the gym

The course lives in a Git repo you train inside of: clone it, open it with your AI agent, and say
*"start the Go Gym."* The repo ships a `Taskfile.yml` so the common moves are one command each
(needs [go-task](https://taskfile.dev/installation/)):

| Command | What it does |
|---------|--------------|
| `task --list` | Show every available command. |
| `task up` | Serve this book at `localhost:3000` **and** the Gym GUI at `localhost:4600`, together. |
| `task test SLUG=arrays` | Run *your* rep for one module — red until you make it green. |
| `task setup` | One-time install for the Gym GUI (the in-browser tutor chat — see `gym-app/`). |

No go-task? Everything also works as plain `go test ./exercises/<module>/` and `mdbook serve book`.

## Where am I?

Your progress lives in `progress/PROGRESS.local.md`, which your AI tutor keeps updated as you go — close
the laptop and pick up exactly where you left off. When you're ready, turn the page to
[The TDD Cycle](tdd.md) and start with Part 0.
