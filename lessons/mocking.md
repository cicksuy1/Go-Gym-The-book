# 8 · Mocking 🟢

> *"Mocking" has a bad reputation, and some of it is earned — overused, it makes tests brittle and
> confusing. But the core idea is one you can't do without: sometimes the real dependency is too slow,
> too unpredictable, or too inconvenient to use in a test, so you hand in a **fake** that you control.
> In the last chapter you injected a real writer. This chapter you'll inject a stand-in — and learn to
> verify not just **what** your code produced, but **how** it behaved along the way.*

**What you'll build:** `Countdown` — print `3 2 1 Go!` with a pause between each — built so the test
runs **instantly** by swapping the real one-second sleep for a fake you can inspect.

**Files for this chapter:** `exercises/mocking/mocking.go` (you fix this) · `exercises/mocking/mocking_test.go` (written for you).

---

## Where we're going

By the end of this chapter you'll be able to:

1. Explain what a **mock** (or spy) is, and when reaching for one is the right call.
2. Define your *own* interface to describe a dependency, then inject it.
3. Swap a real, slow dependency for a fast fake **without touching the function under test**.
4. Verify **behaviour** — that a dependency was called the right number of times — not just output.

---

## The big idea: inject a fake you control

Picture a countdown that prints `3`, `2`, `1`, then `Go!`, pausing a second between each so it feels
like a real countdown. The naive version reaches straight for `time.Sleep`:

```go
func Countdown(out io.Writer) {
	for i := 3; i > 0; i-- {
		time.Sleep(1 * time.Second)
		fmt.Fprintln(out, i)
	}
	fmt.Fprint(out, "Go!")
}
```

It works — but now write a test for it. Every run takes **three real seconds**. Multiply that across a
test suite and your feedback loop crawls. Worse, the test can't check that the sleeps even *happened* —
sleeping leaves no trace to assert on.

The fix is the same move as last chapter — **dependency injection** — applied to the sleep. We don't let
`Countdown` reach for `time.Sleep`; we hand it *something that can sleep*, and let the caller decide what
that something does. In `main`, it's a real one-second sleep. In a test, it's a **fake** that does
nothing but quietly count how many times it was asked to sleep. That fake is a **mock** (here, since we
mainly use it to *record* calls, we call it a **spy**).

---

## Step 1: describe the dependency with an interface

To inject "something that can sleep," we first need a *type* for it. In the DI chapter we used the
standard library's `io.Writer`. Here there's no off-the-shelf interface for "a thing that sleeps," so we
**define our own** — and it's tiny:

```go
type Sleeper interface {
	Sleep()
}
```

That's the entire contract: a `Sleeper` is anything with a `Sleep()` method. Defining a one-method
interface like this is *extremely* common in Go — small interfaces are the language's love language.

---

## Step 2: the real implementation (so the program runs)

Tests will use a fake `Sleeper`, but the real program needs a real one. So we ship a `DefaultSleeper`
that actually sleeps:

```go
type DefaultSleeper struct{}

func (d *DefaultSleeper) Sleep() {
	time.Sleep(1 * time.Second)
}
```

`DefaultSleeper` is an empty struct (it holds no data — it just needs *a method*). Its `Sleep` does the
real one-second pause. In `main` you'd write `Countdown(os.Stdout, &DefaultSleeper{})`. The **test never
touches `DefaultSleeper`** — that's the whole point. It exists so the package compiles and the real
program works; the test brings its own fake.

---

## Step 3: the function takes the interface, not the concrete type

Now `Countdown` accepts *any* `Sleeper`:

```go
func Countdown(out io.Writer, sleeper Sleeper) {
	for i := 3; i > 0; i-- {
		sleeper.Sleep()
		fmt.Fprintln(out, i)
	}
	fmt.Fprint(out, "Go!")
}
```

Read the order carefully, because the test pins it down exactly:

- It **sleeps *before* each number** — sleep, then print `3`; sleep, then print `2`; sleep, then print `1`.
- That's **three sleeps total**, one before each of the three numbers.
- There is **no sleep before `Go!`** — `Go!` prints immediately after the last number.

So the printed output is exactly `"3\n2\n1\nGo!"` (each number on its own line via `Fprintln`, then
`Go!` with no trailing newline via `Fprint`), and `Sleep()` is called exactly **3** times.

---

## The spy: a fake that records what happened

Here's the fake the test injects. It satisfies `Sleeper` (it has a `Sleep()` method), but instead of
pausing it just **counts**:

```go
type SpySleeper struct {
	Calls int
}

func (s *SpySleeper) Sleep() {
	s.Calls++
}
```

A **spy** is a mock that *records* how it was used so the test can make assertions about it afterward.
This one records one thing: how many times `Sleep` was called. Because its `Sleep` returns instantly,
the test runs in microseconds instead of three seconds — and because it counts, the test can prove the
sleeps actually happened.

---

## Prove it with a test

The test injects **two** fakes: a `*bytes.Buffer` for the output (an `io.Writer`, exactly like the DI
chapter) and a `*SpySleeper` for the pauses. Then it checks **both** dimensions — *what* was printed
**and** *how many times* we slept:

```go
func TestCountdown(t *testing.T) {
	buffer := &bytes.Buffer{}
	spy := &SpySleeper{}

	Countdown(buffer, spy)

	got := buffer.String()
	want := "3\n2\n1\nGo!"
	if got != want {
		t.Errorf("got %q want %q", got, want)
	}

	if spy.Calls != 3 {
		t.Errorf("Sleep called %d times, want 3", spy.Calls)
	}
}
```

This is the lesson in one screen. The first assertion checks the **result** (the printed string). The
second checks the **behaviour** (the dependency was used the right number of times) — something you can
*only* verify because you injected a fake that records it. Mocking lets you test interactions, not just
outputs.

---

## A word of caution

Mocking is a sharp tool, and sharp tools cut both ways. If you find yourself asserting *every* internal
call your function makes, your test becomes a mirror of the implementation — change the code and the test
breaks even though the behaviour is identical. That's brittle. Reach for a mock when the real dependency
is genuinely **slow, flaky, or external** (a clock, a network, a database), and prefer asserting on
*observable behaviour* (output, call counts that matter) over micro-managing internals. Used with
judgement, mocks are indispensable; used everywhere, they're a maintenance tax.

---

## 🏋️ Your rep — make it GREEN

Right now `Countdown` in `mocking.go` has an empty body, so nothing is printed and `Sleep` is never
called — the test fails on both assertions (that's the RED state):

```go
func Countdown(out io.Writer, sleeper Sleeper) {
	// TODO(you): sleep then print 3, 2, 1 (one sleep each), then print "Go!"
}
```

(`Sleeper`, `DefaultSleeper`, and its `Sleep` method are already defined for you so the package compiles
— you only fill in `Countdown`.)

Your job, in plain language:

1. Watch it fail (RED): `go test ./exercises/mocking/`
2. Loop a counter `i` from `3` down to `1` (`for i := 3; i > 0; i--`).
3. **Inside the loop, first** call `sleeper.Sleep()`, **then** print the number with `fmt.Fprintln(out, i)`
   so each lands on its own line. (Order matters: sleep first, then print.)
4. **After the loop**, print `Go!` with `fmt.Fprint(out, "Go!")` — note `Fprint`, no newline, and no
   sleep before it.
5. Run again → **GREEN** (output matches *and* the spy counted exactly 3 sleeps).

### Stretch goals (ask your tutor to scaffold any)

- Add a `main` that wires up the real thing: `Countdown(os.Stdout, &DefaultSleeper{})`, and watch it
  count down for real, one second at a time.
- Make a `CountdownConfigurableSleeper` that takes a `time.Duration`, so the pause is a parameter instead
  of a hard-coded second.

---

## 🧠 Active recall — no peeking

1. What's the difference between a *mock/spy* and the *real* dependency, and why inject the fake in a test?
2. How many times is `Sleep()` called during one `Countdown`, and is there a sleep before `Go!`?
3. What two things does the test assert, and why does checking the **call count** require a spy?
4. When is mocking the *wrong* tool — when does it make a test brittle?

---

## 🔍 Real code in the wild

This same pattern — define a small interface, inject it, swap in a fake for tests — is everywhere in
Go's own tooling. The standard library's [`net/http/httptest`](https://pkg.go.dev/net/http/httptest)
package exists for exactly this reason: it gives you fake HTTP servers and a `ResponseRecorder` (a spy
for HTTP responses, much like your `SpySleeper` is a spy for sleeps) so you can test web handlers without
opening a real network connection. Every time you see a test that runs instantly against something that
would normally be slow or external, a fake injected behind an interface is usually how.

---

## What you learned

- A **mock/spy** is a fake dependency you inject in tests so they run fast and you can inspect behaviour.
- When there's no standard interface for a dependency, you **define your own** — often one tiny method,
  like `Sleeper { Sleep() }`.
- Ship a **real** implementation (`DefaultSleeper`) for the program *and* a **fake** (`SpySleeper`) for
  tests; the function under test takes the **interface**, so it never knows which it got.
- A spy lets you assert on **behaviour** (how many times something was called), not just **output**.
- Mocking is powerful but easy to overuse — reach for it for slow/flaky/external dependencies, and assert
  on observable behaviour, not every internal call.

✅ **Done when:** `go test ./exercises/mocking/` is GREEN and you can answer the four recall questions.

**Next:** Chapter 9 — *Concurrency*, where Go's superpower — goroutines and channels — lets your program
do many things at once.
