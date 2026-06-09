# 8 · Mocking 🟢

> *Mocking has a terrible reputation — and over-used, it earns it. But underneath the bad press is a
> move you genuinely cannot test without: when the real dependency is too slow, too flaky, or too
> real to use in a test, you inject a stand-in you control. Last chapter you injected a real writer
> the caller chose. This chapter you inject a fake that does **nothing real** — and discover that a
> good fake doesn't just stand there. It takes notes. By the end you'll verify not just *what* your
> code produced, but *how it behaved on the way there* — and you'll watch a green test wave a broken
> countdown straight through to learn why that distinction matters.*

**What you'll build:** `Countdown` — print `3`, `2`, `1`, `Go!` with a pause before each number —
built so the test runs **instantly** and can prove the pauses happened *in the right places*.

**Files for this chapter:** `exercises/mocking/mocking.go` (you fix this) · `exercises/mocking/mocking_test.go` (written for you).

---

## Where we're going

By the end of this chapter you'll be able to:

1. Explain what a **mock** and a **spy** are, and when reaching for one is the right call.
2. **Define your own interface** to name a dependency the standard library doesn't cover — and
   inject it, exactly like chapter 7's socket move.
3. Swap a slow real dependency for a fast fake **without touching the function under test**.
4. Verify **behavior** — not just what a function printed, but that it did things **in the right
   order** — and explain why a plain call-count can never do that.

All four hang off one image we build first and keep for the whole chapter: a stunt double standing
in for the real performer.

---

## The big idea: a stunt double you can question afterward

Picture the countdown. It prints `3`, pauses a second, prints `2`, pauses, prints `1`, pauses,
then prints `Go!`. The obvious first version reaches straight for the clock:

```go
func Countdown(out io.Writer) {
	for i := 3; i > 0; i-- {
		time.Sleep(1 * time.Second)
		fmt.Fprintln(out, i)
	}
	fmt.Fprint(out, "Go!")
}
```

It works — run it and you get a real countdown with real suspense. Now write a test for it, and
the cost lands: **every run takes three real seconds.** Three seconds, every time you save a file.
Multiply that across a growing test suite and the tight loop you've been living in since chapter 1
— change, test, change, test — slows to a crawl. And there's a second, quieter problem: sleeping
leaves no trace. The test can check the output string, but it has no way to prove the pauses
*happened at all*, let alone happened in the right places.

The fix is the same move as last chapter — dependency injection — applied to time. Don't let
`Countdown` reach for `time.Sleep`; **hand it something that can sleep**, and let the caller decide
what that something does.

And that's where the new idea enters. In `main`, the role of "something that can sleep" is played
by the real performer: it genuinely pauses one second, the countdown genuinely counts down. But in
the test, you cast a **stunt double**: to `Countdown` it looks exactly like a sleeper — same moves
on camera — but it does nothing dangerous. No pause, no three-second bill. And crucially, a good
stunt double does one thing more: **it writes down every cue it's given.** That notebook is what
makes the fake worth more than a no-op.

```text
          Countdown(out, sleeper Sleeper)    ← a socket the shape of Sleeper
                        │  any plug with a Sleep() method fits:
          ┌─────────────┴───────────────┐
     DefaultSleeper                the spy
     (the real performer:          (the stunt double: never pauses —
      actually sleeps 1s)           writes each cue in its notebook)
```

A fake that records how it was used, so the test can question it afterward, is called a **spy** —
a kind of mock. And a spy can keep two kinds of notes. The cheap kind is a **tally**: a running
count — *"I was told to sleep three times."* The rich kind is **the tape**: the full sequence of
cues, in order — *"sleep, then write, then sleep, then write…"*

Hold this line; it's the hinge of the chapter: **a tally can tell you how often something
happened. Only the tape can tell you in what order.** We'll start with a tally because it's
simpler — and then discover, the hard way, exactly where it goes blind.

**Checkpoint:** don't let `Countdown` reach for `time.Sleep` — hand it a `Sleeper`. In `main`
that's the real performer that truly pauses; in the test it's a stunt double that fakes the pause
and records the cue. A tally counts cues; a tape remembers their order.

---

## Naming the dependency: your own interface

To hand in "something that can sleep," we need a type for it. Last chapter the standard library
handed us `io.Writer` ready-made. This time there's no off-the-shelf interface for "a thing that
pauses" — so we **define our own**, and it's tiny:

```go
type Sleeper interface {
	Sleep()
}
```

That's the entire contract. A `Sleeper` is anything with a `Sleep()` method — chapter 4's
automatic satisfaction, still doing the heavy lifting. Defining a one-method interface to name
*exactly* the capability you depend on is one of the most Go things you can do; small interfaces
are the language's love language.

The program still needs a real one, so the package ships it:

```go
type DefaultSleeper struct{}

func (d *DefaultSleeper) Sleep() {
	time.Sleep(1 * time.Second)
}
```

An empty struct — it holds no data; it exists to carry a method. In `main` you'd write
`Countdown(os.Stdout, &DefaultSleeper{})` and get the real, suspenseful countdown. **The test
never touches `DefaultSleeper`.** That's not an accident; it's the entire point. The real
performer is for the audience, the stunt double is for the set.

---

## The function takes the interface, not the clock

With the dependency named, `Countdown` accepts *any* `Sleeper`:

```go
func Countdown(out io.Writer, sleeper Sleeper) {
	for i := 3; i > 0; i-- {
		sleeper.Sleep()
		fmt.Fprintln(out, i)
	}
	fmt.Fprint(out, "Go!")
}
```

Note the parameter types — `io.Writer` and `Sleeper`, the *interfaces*, never `*DefaultSleeper`.
Type the parameter as the interface and any plug fits; that rule is from last chapter and it still
holds.

Now read the body's order carefully, because it's the contract this whole chapter defends:

- It **sleeps *before* each number** — sleep, then `3`; sleep, then `2`; sleep, then `1`.
- That's **three sleeps total**, one before each of the three numbers.
- There is **no sleep before `Go!`** — after the last number, `Go!` prints immediately.

So the printed output is exactly `"3\n2\n1\nGo!"` — each number on its own line via `Fprintln`,
then `Go!` with no trailing newline via `Fprint`.

We're about to write a test for that ordering. And then we're going to watch that test **fail to
notice** when we get the order completely wrong.

---

## A first spy: the tally

Here's the stunt double the test casts first — the tally-keeper. It satisfies `Sleeper` (it has
`Sleep()`), but instead of pausing it just counts:

```go
type SpySleeper struct {
	Calls int
}

func (s *SpySleeper) Sleep() {
	s.Calls++
}
```

Because its `Sleep` returns instantly, the whole test runs in microseconds instead of three
seconds. And because it counts, the test can finally prove the sleeps *happened*. The test injects
two fakes — a `*bytes.Buffer` for the output (an `io.Writer`, exactly the chapter 7 move) and a
`*SpySleeper` for the pauses — and asserts on **both dimensions**:

```go
t.Run("prints 3 to Go!", func(t *testing.T) {
	buffer := &bytes.Buffer{}
	Countdown(buffer, &SpySleeper{})

	got := buffer.String()
	want := "3\n2\n1\nGo!"
	if got != want {
		t.Errorf("got %q want %q", got, want)
	}
})

t.Run("sleeps three times", func(t *testing.T) {
	spy := &SpySleeper{}
	Countdown(&bytes.Buffer{}, spy)

	if spy.Calls != 3 {
		t.Errorf("Sleep called %d times, want 3", spy.Calls)
	}
})
```

The second assertion is something new in this course: it checks **behavior** — how the dependency
was *used* — not output. You can only write that assertion because you injected a fake that
records. This is the extra power mocking buys you.

Two dimensions, instant runtime, both assertions green. It feels like a complete test.

It isn't — and the next section proves it by breaking the code on purpose.

**Checkpoint:** a spy is a fake that records how it was used. The tally-keeper records one number
— how many sleeps — letting the test assert on behavior, not just output. But a count is all it
knows.

---

## Breaking it on purpose: where the tally goes blind

A test is only worth the confidence it gives you, and there's one honest way to measure that:
**deliberately write wrong code and see whether the test notices.** If a test stays green while
the code is broken, it was never guarding what you thought it was.

So let's sabotage the countdown. Here's an implementation that prints everything first and crams
all three sleeps at the end:

```go
// WRONG on purpose: all the prints, THEN all the sleeps.
func Countdown(out io.Writer, sleeper Sleeper) {
	for i := 3; i > 0; i-- {
		fmt.Fprintln(out, i)
	}
	fmt.Fprint(out, "Go!")
	for i := 0; i < 3; i++ {
		sleeper.Sleep()
	}
}
```

As a countdown, this is nonsense — `3 2 1 Go!` flashes up instantly, and *then* the program stands
still for three silent seconds, after it already said go. A user would notice in a heartbeat.

Now run the two assertions we have against it. The output? Still exactly `"3\n2\n1\nGo!"` — the
prints didn't move relative to each other, only the sleeps moved. **Pass.** The tally? `Sleep` was
still called exactly three times. **Pass.** The test is green. The countdown is broken. Both facts
are true at once.

The diagnosis writes itself if you think in the model: we asked the stunt double a question it
could answer — *how many times were you cued?* — and "three" is true of the correct code *and* the
sabotage. The tally never recorded **where** the cues fell.

*A tally can't show order. Only the tape can.*

---

## The tape: one spy that records the whole sequence

To catch the sabotage, the test needs the full sequence — every write and every sleep, on **one
timeline**. And that forces a design insight: the recording can't be split across two fakes. If
the buffer kept its own notes and the sleeper kept its own, you'd know there were four writes and
three sleeps, but never how they interleaved. The interleaving *is* the bug.

So we build one stunt double that plays **both roles** — it is an `io.Writer` *and* a `Sleeper` —
and every cue, from either role, lands on the same tape:

```go
type SpyCountdownOperations struct {
	Calls []string
}

func (s *SpyCountdownOperations) Sleep() {
	s.Calls = append(s.Calls, sleep)
}

func (s *SpyCountdownOperations) Write(p []byte) (int, error) {
	s.Calls = append(s.Calls, write)
	return len(p), nil // an io.Writer must report how many bytes it accepted
}

const (
	write = "write"
	sleep = "sleep"
)
```

Every `fmt.Fprintln` or `fmt.Fprint` call becomes exactly one `Write` — appending `"write"` to the
tape. Every `sleeper.Sleep()` appends `"sleep"`. One slice, strict order of arrival.

In the test, this produces a line that looks strange the first time you see it:

```go
spy := &SpyCountdownOperations{}
Countdown(spy, spy) // the SAME spy is the io.Writer AND the Sleeper
```

The same value, passed as both arguments. It's allowed — and it's the point. To `Countdown`, the
first parameter is "some `io.Writer`" and the second is "some `Sleeper`"; one object is welcome to
be both, because satisfying an interface only ever meant having the methods. And *because* it's
one object, there's one tape — which is exactly what we need.

Now the assertion. The expected tape is a script, and the spy's recording must match it exactly.
Slices can't be compared with `!=`, so we reach for `reflect.DeepEqual`, which walks both slices
element by element:

```go
want := []string{sleep, write, sleep, write, sleep, write, write}
if !reflect.DeepEqual(spy.Calls, want) {
	t.Errorf("wanted calls %v got %v", want, spy.Calls)
}
```

Read the script aloud against the contract: sleep, write `3`; sleep, write `2`; sleep, write `1`;
then write `Go!` with no sleep before it. That's why the tape **starts with `sleep`** and **ends
`write, write`** — the last number, then `Go!`. (If you've seen this pattern elsewhere with the
sleep *after* each print, note that our `Countdown` pauses *first*, so our script leads with
`sleep`.)

Run the sabotage against *this* assertion and it dies instantly:

```text
--- FAIL: TestCountdown/sleeps_before_every_print
    wanted calls [sleep write sleep write sleep write write]
    got [write write write write sleep sleep sleep]
```

Look at that failure message: it's not just red, it's a **confession**. Four writes, then three
sleeps — the tape shows you the exact shape of the bug that two green assertions waved through.

**Checkpoint:** one spy, playing both `io.Writer` and `Sleeper`, records every write and sleep on
a single shared tape; `reflect.DeepEqual` compares the tape against the script. A count proves
*how many*; the tape proves *in what order* — and only the tape catches the sleeps-after-`Go!`
bug.

---

## A word of caution

You've just acquired a sharp tool, so here's the safety briefing — earned, now that you've seen
both what the tape catches and what it costs.

**Assert on behavior you actually care about.** The tape couples the test to *how* `Countdown`
works inside. Here that's justified: the placement of the pauses *is* the behavior — a countdown
that sleeps after "go" is broken in a way users feel. But pin down an internal detail nobody would
notice, and your test becomes a mirror of the implementation: refactor harmlessly and it shatters
anyway.

**Many mocks is a smell.** If testing one function means faking three, four, five dependencies,
that's not a testing problem — it's the design talking. The function is juggling too much and
wants splitting.

**When mocking hurts, listen.** Complicated, painful mock setups are a signal about the code under
test, not about testing itself. Hard-to-fake usually means too-tightly-coupled.

**Reach for a fake when the real thing is slow, flaky, or external.** A clock, a network, a
database, a random generator. Our sleeper is the textbook case: real time is slow *and*
unobservable. For a pure function that just computes, you don't need any of this — assert on the
return value and move on.

Used with judgment, spies are indispensable. Used everywhere, they're a maintenance tax on every
future refactor. The question to ask before writing one is always: *would a user notice if this
detail were wrong?* For our pauses — absolutely.

---

## Worked, runnable code: the real countdown

The same `Countdown` the instant test drove all chapter, wired to the real performer:

```go
package main

import (
	"os"
)

func main() {
	Countdown(os.Stdout, &DefaultSleeper{})
}
```

Run it and the chapter's two worlds snap together:

```text
3
2
1
Go!
```

— except live, each line lands one real second after the last, because this time the `Sleep()` cue
reached a sleeper that actually sleeps. Same function, same socket; the caller chose the performer.

---

## 🏋️ Your rep — make it GREEN

Right now `Countdown` in `mocking.go` has an empty body — nothing printed, `Sleep` never called —
so all three subtests fail (that's the RED state). `Sleeper` and `DefaultSleeper` are already
defined for you; you only fill in `Countdown`:

```go
func Countdown(out io.Writer, sleeper Sleeper) {
	// TODO(you): sleep then print 3, 2, 1 (one sleep each), then print "Go!"
}
```

Your job, in plain language:

1. Watch it fail (RED): `go test ./exercises/mocking/` (run from the `go-gym` folder).
2. Count down with a loop: `for i := 3; i > 0; i--`.
3. **Inside the loop, sleep first** — `sleeper.Sleep()` — **then** print the number with
   `fmt.Fprintln(out, i)` so each lands on its own line.
4. **After the loop**, print `Go!` with `fmt.Fprint(out, "Go!")` — `Fprint`, no newline, and no
   sleep before it.
5. Run again → **GREEN**.

One warning worth its weight: there are **three** subtests now. The first checks the output, the
second counts the sleeps — and the **third reads the tape**, asserting the exact sequence
`sleep, write, sleep, write, sleep, write, write`. Put a print before its sleep and the first two
subtests may stay green while the third goes red and shows you exactly which cue landed out of
place. That third subtest is this chapter's whole lesson, enforced.

### Stretch goals (ask your tutor to scaffold any)

- Write a `main` that calls `Countdown(os.Stdout, &DefaultSleeper{})` and feel the three real
  seconds the spy spared you.
- Build a `ConfigurableSleeper` — a struct holding a `duration time.Duration` and a
  `sleep func(time.Duration)` field — whose `Sleep()` calls `s.sleep(s.duration)`. Now the pause
  length is configuration, not a hard-coded second. Test it with a `SpyTime` that records the
  duration it was handed: a spy on the *value* passed, where `SpySleeper` spied on the *count*.
- Try the sabotage yourself: move the sleeps after the printing loop and run the test. Read the
  tape in the failure message, then put it back. (Knowing exactly how your tripwire trips is half
  of trusting it.)

---

## 🧠 Active recall — answer out loud, no peeking

1. What's a **spy**, and what makes it more useful in a test than a fake that simply does nothing?
2. The standard library had `io.Writer` ready for chapter 7, but nothing for sleeping. What did you
   do about that, and what's the *entire* definition of `Sleeper`?
3. How many times does `Countdown` sleep, where do the sleeps fall relative to the prints, and is
   there a sleep before `Go!`?
4. The sabotaged `Countdown` — all prints first, all sleeps after — passed both the output check
   *and* the count check. Why did each one miss the bug?
5. Why must the tape spy be **one struct implementing both `Write` and `Sleep`**, rather than two
   separate spies with a slice each?
6. The test calls `Countdown(spy, spy)` — the same value as both arguments. Why does the compiler
   accept that, and why does the technique *depend* on it?
7. Name two warning signs that mocking is hurting a codebase rather than helping it.

If any answer is fuzzy, scroll back up — that's the recall doing its job.

---

## 🔍 Real code in the wild

The define-a-small-interface, inject-a-fake pattern is all over Go's own toolbox. The standard
library ships an entire package for it: [`net/http/httptest`](https://pkg.go.dev/net/http/httptest).
Its `httptest.ResponseRecorder` is precisely your spy with a different costume — a fake
`http.ResponseWriter` that records the status code, headers, and body a handler writes, so a test
can question it afterward instead of standing up a real network. And `httptest.NewServer` is the
stunt double for a whole remote service.

Once you know the shape, you'll spot the tape pattern everywhere: any test asserting on a
*recorded sequence* — captured log lines, recorded HTTP exchanges, an event list compared against
a script — is doing exactly what `SpyCountdownOperations` does: keeping order, so order can be
checked.

---

## What you learned

- A **spy** (a kind of mock) is a stunt double you inject in tests: it fakes a slow, flaky, or
  external dependency so tests run instantly — and **records how it was used** so the test can
  assert on behavior, not just output.
- When the standard library has no interface for your dependency, **define your own** — often one
  method, like `Sleeper { Sleep() }`. Ship a real implementation for the program and a spy for the
  test; the function takes the **interface**, so it never knows which it got (chapter 7's socket,
  still load-bearing).
- A **tally** spy (`Calls int`) proves *how many times* something happened — your first
  behavior-not-output assertion.
- A tally is blind to **order**. The honest way to discover that is to **break the code on
  purpose** and watch which assertions stay green.
- The **tape** spy — one struct satisfying both `io.Writer` and `Sleeper`, appending to a single
  slice — records the exact interleaving, and `reflect.DeepEqual` checks it against the script.
  That's what catches the sleeps-after-`Go!` bug.
- Mocking is sharp: assert only on details users would feel, treat many-mocks and painful-mocks as
  the design asking for change.

✅ **Done when:** `go test ./exercises/mocking/` is GREEN and you can answer the recall questions.

**Next:** Chapter 9 — *Concurrency*, where Go's superpower — goroutines and channels — lets your
program do many things at once.
