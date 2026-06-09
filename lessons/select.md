# 10 · Select 🔵

> *Last chapter you learned to wait on **one** channel. Real programs need to wait on **several at
> once** — "whichever of these finishes first, go with it" — and they need a way to say "…but give
> up if nothing answers in time." Go has one tiny construct that does both: `select`. We won't start
> there, though. We'll start where an honest programmer starts: with a stopwatch and a wrong
> question. Watching the first version work — and then realizing it asked the wrong question
> entirely — is how `select` stops being syntax and becomes the obvious thing.*

**What you'll build:** `Racer` — fire off two HTTP requests at the same time and return whichever URL
responds first, giving up with an error if both are too slow.

**Files for this chapter:** `exercises/select/select.go` (you fix this) · `exercises/select/select_test.go` (written for you).
(One quirk up front: `select` is a Go *keyword*, so it can't be a package name — the package in this
folder is called `racer`.)

---

## Where we're going

By the end of this chapter you'll be able to:

1. Use `select` to wait on **multiple** channel operations and proceed with whichever is ready first.
2. Use a **closed channel** as a pure "this is done" signal — and say why `chan struct{}` is the
   right type for one.
3. Use **`time.After`** to build a timeout, so a `select` can never block forever.
4. Test timing-sensitive concurrent code with **`net/http/httptest`** servers — fast, local,
   deterministic — and clean them up with **`defer`**.
5. Split a function into a public default and a configurable core (`Racer` / `ConfigurableRacer`)
   so production gets sane defaults and tests get fast ones.

One image carries the chapter: **the finish line** — a referee watching several lanes at once.

---

## The big idea: stop timing, start racing

The job sounds simple: given two URLs, return whichever responds faster. The honest first version
reaches for a stopwatch — time the first one, time the second one, compare:

```go
// First try — it works, but watch what it actually does.
func Racer(a, b string) string {
	startA := time.Now()
	http.Get(a)
	aDuration := time.Since(startA)

	startB := time.Now()
	http.Get(b)
	bDuration := time.Since(startB)

	if aDuration < bDuration {
		return a
	}
	return b
}
```

`time.Now()` marks the start, `time.Since(start)` measures the elapsed `time.Duration` — nothing
new there. And this *works*: it really does return the faster URL. But look at it with last
chapter's eyes and two things should bother you.

First, it's **sequential**. It fetches `a` completely — waits out the entire response — and only
then even *starts* on `b`. If `a` takes ten seconds and `b` takes one, you wait eleven seconds to
learn what you could have learned in one. We spent all of chapter 9 learning that waits should
overlap, and here we are, standing in line again.

Second — and this is the insight that rewrites the whole function — **we don't care about the
times.** Read the job again: *return whichever responds first.* Nobody asked for durations. We
measured two finish times and compared them, when all we ever needed was to stand at the finish
line and see who crosses it first.

So picture the better design. Both runners start at the same moment — one goroutine per URL,
chapter 9's move. We don't follow either of them around with a stopwatch. We stand at the **finish
line** and watch the lanes. The first lane that fires, wins.

The "watch several lanes at once" tool is `select`. It looks like a `switch`, but every `case` is a
channel operation, and it blocks until **one** of them is ready — then runs that case and ignores
the rest:

```go
select {
case <-laneA:
	// A crossed the line first
case <-laneB:
	// B crossed the line first
}
```

```text
                          ┌─ lane A ──▶ <-chA ─┐
   the referee: select ───┤                    ├─▶ first to fire wins; its case runs
                          └─ lane B ──▶ <-chB ─┘
```

A plain `<-ch` is a referee who can only watch one lane. `select` is the referee who watches them
all — and `select` is why the rewrite is not just faster but *simpler*: no stopwatches, no
subtraction, no `if`. The race itself produces the answer.

If two lanes fire in the same instant, `select` picks one **at random** — deliberately, so you can
never accidentally depend on an ordering. And if *no* lane ever fires, `select` blocks forever…
which is a real trap we'll deal with before the chapter ends. (There's also a `default` case that
makes `select` give up immediately if nothing is ready — good to know it exists; we don't need it
here.)

**Checkpoint:** the first version timed two complete runs, one after the other — slow, and an
answer to a question nobody asked. The real question is *who crosses the line first*, and `select`
is the referee that watches every lane at once and reacts to the first one that fires.

---

## The details (with the traps called out)

### The lane: a channel that closes when the work is done

Each runner needs a lane — a channel the referee can watch. Here's the helper that builds one:

```go
func ping(url string) chan struct{} {
	ch := make(chan struct{})
	go func() {
		http.Get(url)
		close(ch)
	}()
	return ch
}
```

`ping` makes a channel, starts a goroutine that fetches the URL, and returns the channel
*immediately* — the runner is off, and you're holding the lane. When the fetch finishes, the
goroutine doesn't **send** anything. It **closes** the channel.

Two deliberate choices are packed in there:

**Why close instead of send?** Because there's no message — there's only an *event*: "done." A
receive on a closed channel returns immediately, so `close(ch)` is the runner breaking the tape:
no value crosses the line, but everyone watching knows it happened. (A send would also need
someone ready to receive, exactly when, on which side — close has none of that choreography.)

**Why `chan struct{}` and not `chan bool`?** `struct{}` is the empty struct — a type with no
fields, taking **zero bytes**. Since nothing is ever sent, the channel's element type is pure
paperwork, and `struct{}` is Go's idiom for "no data, just a signal." Seeing `chan struct{}` in
real code tells you instantly: this channel is an event, not a pipe.

### Trap: a referee with no whistle

Put the lanes and the referee together and you have a working racer:

```go
select {
case <-ping(a):
	return a, nil
case <-ping(b):
	return b, nil
}
```

Now ask the question chapter 9 trained you to ask: *what if neither finishes?* Both servers are
down; both goroutines sit inside `http.Get` forever; neither channel ever closes. `select` blocks
eternally — and so does whoever called you. No error, no crash, just a program standing at a
finish line nobody will ever cross.

A `select` that can block forever is a bug waiting for a bad day. The referee needs a whistle —
some way to call the race off.

### `time.After`: the runner who always finishes

The whistle is one of Go's neatest tricks: `time.After(d)` returns a **channel** that delivers one
value after duration `d`. That's the whole API — and because it's a channel, it can *enter the
race as a third lane*:

```go
select {
case <-ping(a):
	return a, nil
case <-ping(b):
	return b, nil
case <-time.After(timeout):
	return "", fmt.Errorf("timed out waiting for %s and %s", a, b)
}
```

Think of `time.After(timeout)` as a pace runner who is *guaranteed* to cross the line at exactly
`timeout`. If either real runner beats him, great — his lane simply never fires (the case is
abandoned with the rest). But if he crosses first, both real runners were too slow, and his case
returns an error instead of a URL. The `select` now has an upper bound: it physically cannot block
longer than `timeout`.

This three-lane shape — *race the work against the clock* — is arguably the single most useful
concurrency pattern in Go. You'll see it guarding network calls, database queries, graceful
shutdowns: anywhere "wait for this" must never become "wait forever."

### Trap: the timeout that makes your tests crawl

The requirement says: give up after **10 seconds**. So hard-code `time.After(10 * time.Second)`…
and now think about testing the timeout path. The test has to *actually wait out the timeout* —
every run of the suite sits there for ten seconds to check one error message. The fast feedback
loop this whole course runs on dies for one constant.

The fix is a shape you'll reuse forever — **public default, configurable core**:

```go
const tenSecondTimeout = 10 * time.Second

func Racer(a, b string) (string, error) {
	return ConfigurableRacer(a, b, tenSecondTimeout)
}
```

`ConfigurableRacer` takes the timeout as a parameter and does all the work. `Racer` is a one-line
wrapper that bakes in the production default. Real callers get the sane 10 seconds without
thinking; the test calls `ConfigurableRacer` directly with **20 milliseconds** and proves the
timeout path in the blink of an eye. Nobody pays for a constant they didn't choose.

**Checkpoint:** a lane is a `chan struct{}` that *closes* when its work is done — an event, not a
message. A `select` over lanes alone can block forever; `time.After` enters a runner who always
finishes at `timeout`, capping the wait. And when a default would make tests slow, split the
function: public wrapper with the default, configurable core for everyone who needs a different
clock.

---

## Worked example — the whole solution

All the pieces, assembled (this is exactly the shape the exercise wants):

```go
const tenSecondTimeout = 10 * time.Second

func Racer(a, b string) (string, error) {
	return ConfigurableRacer(a, b, tenSecondTimeout)
}

func ping(url string) chan struct{} {
	ch := make(chan struct{})
	go func() {
		http.Get(url)
		close(ch)
	}()
	return ch
}

func ConfigurableRacer(a, b string, timeout time.Duration) (string, error) {
	select {
	case <-ping(a):
		return a, nil
	case <-ping(b):
		return b, nil
	case <-time.After(timeout):
		return "", fmt.Errorf("timed out waiting for %s and %s", a, b)
	}
}
```

Read `ConfigurableRacer` out loud and it's the design in one sentence: *start both pings, then
wait on whichever finishes first — a, b, or the clock.* Both `ping` calls happen first (both
runners start; the goroutines are off before the referee settles in), and then `select` watches
the three lanes. Compare it to the stopwatch version at the top of the chapter: shorter, faster,
and it says what it means.

---

## Prove it with a test (without the real internet)

How do you test this — against real websites? Think about what that would mean: tests that depend
on someone else's servers, the network between you and them, and which site happens to be having a
slow morning. Slow, flaky, and out of your control — three words that kill a test suite.

The standard library's answer is `net/http/httptest`. It gives you a **real HTTP server** on a
local port that exists only for your test — same handler shape as every real Go server, but you
control its every behavior, including how slow it is:

```go
func makeDelayedServer(delay time.Duration) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			time.Sleep(delay)
			w.WriteHeader(http.StatusOK)
		}))
}
```

Look at the handler's signature — `(w http.ResponseWriter, r *http.Request)`. You've seen `w`
before: it's the `io.Writer` payoff from chapter 7, now in its natural habitat. This *is* a real
web server; `httptest.NewServer` just hosts it on a random free port and hands you its `.URL`.
A `delay` parameter makes server speed a dial we turn from the test.

The happy-path test builds a slow server (20ms) and a fast one (0ms), races them, and expects the
fast one's URL:

```go
slowServer := makeDelayedServer(20 * time.Millisecond)
fastServer := makeDelayedServer(0 * time.Millisecond)
defer slowServer.Close()
defer fastServer.Close()

want := fastServer.URL
got, err := Racer(slowServer.URL, fastServer.URL)
```

Those two `defer` lines are a new keyword earning its keep. **`defer f()` schedules `f` to run
when the surrounding function returns** — however it returns, early, late, or in a panic. Servers
hold a port; they must be closed. You *could* put `slowServer.Close()` at the bottom of the test —
but then a failed assertion (or any early return) skips it. `defer` lets you write the cleanup
*next to the creation*, where a reader sees open-and-close as one thought, and Go guarantees it
runs at the end. You'll use this constantly from here on: closing files, unlocking locks, closing
servers — `defer` is how Go code cleans up after itself without trusting every exit path.

And the timeout test is where `ConfigurableRacer` cashes in: one server that takes 25ms, raced
against itself with a **20ms** timeout — the pace runner wins, and the test demands an error:

```go
server := makeDelayedServer(25 * time.Millisecond)
defer server.Close()

_, err := ConfigurableRacer(server.URL, server.URL, 20*time.Millisecond)

if err == nil {
	t.Error("expected a timeout error but got nil")
}
```

The whole suite — including the timeout path — runs in well under a tenth of a second, touches no
real network, and behaves identically on every machine, every time. That's what controlling your
dependencies buys; it's the chapter 8 lesson wearing HTTP clothes.

---

## 🏋️ Your rep — make it GREEN

Open `exercises/select/select.go`. `Racer` is already written — it delegates to
`ConfigurableRacer` with the 10-second default. Your job is the core, which currently lies:

```go
func ConfigurableRacer(a, b string, timeout time.Duration) (string, error) {
	return "", nil // TODO(you): select over ping(a), ping(b), and time.After(timeout)
}
```

Your job, in plain language:

1. Watch it fail (RED): `go test ./exercises/select/` (run from the `go-gym` folder). Both tests
   fail — the happy path gets `""` instead of a URL, and the timeout path gets `nil` instead of an
   error.
2. Write the `ping` helper: make a `chan struct{}`, launch a goroutine that does `http.Get(url)`
   then `close(ch)`, return the channel. (Imports: `net/http`, plus `fmt` and `time` for the next
   step.)
3. In `ConfigurableRacer`, write the three-lane `select`: `case <-ping(a)` returns `a, nil`;
   `case <-ping(b)` returns `b, nil`; `case <-time.After(timeout)` returns `""` and an error
   (`fmt.Errorf("timed out waiting for %s and %s", a, b)`).
4. Run again → **GREEN**, in milliseconds.

### Stretch goals (ask your tutor to scaffold any)

- Feel the trap you dodged: temporarily delete the `time.After` case and run only the timeout test
  — `go test -run TestRacerTimeout ./exercises/select/` — and watch it hang until you press
  Ctrl+C. Put the case back. (Every `select` you write from now on, you'll hear that silence.)
- Return more: make a variant that returns the winner *and* how long it took — you'll find
  yourself wanting `time.Now`/`time.Since` again, this time for reporting instead of deciding.
- Experiment with `default`: write a tiny `select` with a `default` case and see it skip waiting
  entirely when no channel is ready — then say out loud when you'd want that (polling) versus
  blocking (waiting for a race).

---

## 🧠 Active recall — answer out loud, no peeking

1. The first version of `Racer` worked. What were its *two* flaws — and which question was it
   answering that nobody asked?
2. What does `select` do when none of its cases are ready? When several become ready at the same
   instant?
3. Why does `ping` *close* its channel instead of sending a value on it — and why is
   `chan struct{}` the idiomatic element type for that?
4. What does `time.After(d)` return, and how does that let a timeout join a `select` as just
   another case?
5. Why do `Racer` and `ConfigurableRacer` both exist? What would a hard-coded 10-second timeout do
   to the test suite?
6. What does `defer server.Close()` guarantee that putting `server.Close()` at the end of the test
   doesn't?
7. Why are `httptest` servers better than real websites for these tests — name the three words.

If any answer is fuzzy, scroll back up — that's the recall doing its job.

---

## 🔍 Real code in the wild

The race-against-the-clock shape is everywhere in production Go. Open the
[`time`](https://pkg.go.dev/time#After) docs and you'll find `time.After` documented with almost
exactly our pattern — a `select` racing work against a timeout. Its siblings live there too:
`time.Tick` for a lane that fires *repeatedly*, and `time.NewTimer` when you need to cancel the
pace runner early.

And one signpost for three chapters from now: the standard library's grown-up version of "give up
if it takes too long" is the [`context`](https://pkg.go.dev/context) package —
`context.WithTimeout` threads a deadline through *entire call trees*, not just one `select`. When
you reach chapter 13, you'll recognize it instantly: it's this chapter's pace runner, scaled up to
cancel whole pipelines. The instinct you built today — *nothing waits forever* — is one of the
marks of production-quality Go.

---

## What you learned

- The stopwatch version answered the wrong question: it measured **how long** when the job only
  asked **who's first** — and it did it sequentially, one full wait after another.
- **`select`** is the referee at the finish line: every `case` is a channel operation, it blocks
  until one fires, runs that case, and picks at random on a tie.
- A done-signal lane is a **`chan struct{}` that gets `close`d** — no message, just the event;
  receives on a closed channel return immediately.
- A `select` with no escape can block **forever**. **`time.After(timeout)`** enters a runner who
  always finishes at `timeout`, turning "wait" into "wait, but never longer than this."
- **Public default, configurable core**: `Racer` bakes in 10 seconds for production;
  `ConfigurableRacer` takes the timeout as a parameter so tests prove the timeout path in 20ms.
- **`httptest.NewServer`** gives you a real, local, fully-controlled HTTP server (the handler is
  chapter 7's `io.Writer` in the wild), and **`defer`** schedules cleanup at function exit — written
  next to the creation, guaranteed to run.

✅ **Done when:** `go test ./exercises/select/` is GREEN (and clean under
`go test -race ./exercises/select/`) and you can answer the recall questions.

**Next:** Chapter 11 — *Reflection*, where we leave concurrency for a chapter to ask a stranger
question: can a program inspect the *type and shape* of a value it's never seen before, at run time?
