# The TDD Cycle (in 90 seconds)

This whole course is **test-driven**, so before your first chapter, here's the method itself — quickly.

**Test-Driven Development (TDD)** means: *write a small failing test that describes what you want, then
write just enough code to make it pass, then tidy up.* You write the test **first**, on purpose.

## The loop: Red → Green → Refactor

```text
        ┌───────────────────────────────────────────┐
        │                                           │
        ▼                                           │
   ① RED  ──────▶  ② GREEN  ──────▶  ③ REFACTOR  ───┘
   write a         write the          clean it up —
   failing test    simplest code      tests stay green,
   for what you    that passes        so you can change
   want            the test           code fearlessly
```

- **🔴 RED** — a test that fails because the behaviour doesn't exist yet. It *describes* the goal.
- **🟢 GREEN** — the smallest change that makes the test pass. Done = green. No guessing.
- **🔵 REFACTOR** — improve the code now that a test has your back. If it's still green, you didn't break it.

Then repeat for the next tiny piece of behaviour.

## Why write the test *first*? (the part most people miss)

Writing the test before the code does three things writing it afterwards can't:

1. **It designs the contract.** To write the test you must decide what the function takes and returns —
   you think like the *caller* before you think like the *implementer*.
2. **It defines "done."** Green is an objective finish line. No vague "I think it works."
3. **It proves the test has teeth.** A test you watch fail first, then pass, is a test you *know* actually
   checks something. (A test that's green from birth might be checking nothing.)

## How this course uses it

Every chapter hands you a **🔴 RED test already written** and a stub that's wrong on purpose. Your **rep**
is to make it **🟢 GREEN** yourself — then we talk about *why* the test is shaped the way it is. That's the
3rd step of each chapter's 5-step loop (why-first → tiny example → **your rep** → recall → real code).

You don't have to write tests-first to *use* this course — they're already written. But by the end you'll
have done the Red→Green rhythm ~30 times, and it'll feel natural.

## A tool, not a religion

TDD is a *tool*, and like any tool it has a job it's great for and jobs it isn't. It shines for learning a
language and for code with clear inputs/outputs (most of this course). It's *not* a law of physics — Part 2
("Testing Fundamentals") is where we step back and talk honestly about when test-first earns its keep and
when it's just ceremony.

For now: see a red test, make it green. That's the whole game. Let's set up Go and play it. →
