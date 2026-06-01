# 10 · Select 🔵

> *Last chapter you learned to wait on **one** channel. Real programs need to wait on **several at
> once** — "whichever of these finishes first, go with it" — and they need a way to say "...but give up
> if nothing answers in time." Go has one tiny construct that does both: `select`. Pair it with
> `time.After` and you get the single most useful concurrency pattern there is: **race two operations,
> with a timeout so neither can hang you forever.***

**What you'll build:** `Racer` — fire off two HTTP requests at the same time and return whichever URL
responds first, giving up with an error if both are too slow.

**Files for this chapter:** `exercises/select/select.go` (you fix this) · `exercises/select/select_test.go` (written for you).

---

## Where we're going

By the end of this chapter you'll be able to:

1. Use `select` to wait on **multiple** channel operations and proceed with whichever is ready first.
2. Use **`time.After`** to build a timeout — a channel that fires after a delay.
3. Use a **closed channel** as a "this is done" signal.
4. Test timing-sensitive concurrent code with **`net/http/httptest`** servers, deterministically and
   fast (milliseconds, no real network).

A short, sharp 🔵 chapter — one new keyword, one beautiful pattern.

---

## The big idea: `select` waits on many channels at once

A plain receive `<-ch` waits on **one** channel. But what if you have two things in flight and you want
to react to *whichever finishes first*? You can't write `<-chA` then `<-chB` — that waits for A and only
*then* looks at B. You need to wait on **both simultaneously**.

That's exactly what `select` does. It looks like a `switch`, but every `case` is a channel operation, and
it blocks until **one** of them is ready — then runs that case:

```go
select {
case msg := <-chA:
	// chA was ready first
case msg := <-chB:
	// chB was ready first
}
```

```text
   select ── waits on ──┬─ <-chA ─┐
                        └─ <-chB ─┴─▶ runs the case for whichever fires FIRST
```

If several cases are ready at the same instant, `select` picks one **at random** (so you can't
accidentally rely on an order). If none is ready, it blocks — *unless* you add a `default` case, which
makes `select` non-blocking. We won't need `default` here, but it's good to know it exists.

---

## Racing two operations

Here's the shape we want: start *both* HTTP requests, and return whichever URL comes back first. The
trick is to turn "this request finished" into "this channel is ready to receive from."

We do that with a helper that launches the request in a goroutine and **closes a channel** when it's
done:

```go
func ping(url string) chan struct{} {
	ch := make(chan struct{})
	go func() {
		http.Get(url)   // do the slow thing
		close(ch)       // ...then signal "done" by closing the channel
	}()
	return ch
}
```

Two things to notice:

- **`chan struct{}`** is a channel that carries *no data* — `struct{}` is the empty struct, zero bytes.
  We don't care about a *value*, only about the *event* "it finished." This is the idiomatic "signal"
  channel.
- **Closing a channel is a broadcast.** A receive on a **closed** channel returns *immediately* (with the
  zero value). So `<-ping(url)` blocks until `ping` closes the channel — i.e. until the request finishes.

Now `select` over the two pings, and whichever closes first wins:

```go
select {
case <-ping(a):
	return a, nil
case <-ping(b):
	return b, nil
}
```

---

## ...but never hang forever: `time.After`

There's a danger lurking: what if *both* servers are down and neither channel ever closes? Our `select`
would block **forever**. A program that can hang indefinitely is a broken program.

The fix is a third racer in the `select`: a **timeout channel**. `time.After(d)` returns a channel that
automatically receives a value after the duration `d` — no goroutine to manage, the runtime does it:

```go
case <-time.After(timeout):
	return "", fmt.Errorf("timed out waiting for %s and %s", a, b)
```

Now the `select` is a three-way race: URL `a`, URL `b`, or the timeout — *whatever* happens first wins, so
the function **always** returns. That's the whole pattern, and it's everywhere in real Go.

> We expose **two** functions so the timeout is testable. `Racer(a, b)` uses a sensible 10-second default;
> `ConfigurableRacer(a, b, timeout)` lets a caller (like our test) pass a *tiny* timeout. `Racer` is just
> `ConfigurableRacer(a, b, 10 * time.Second)`. Making the awkward-to-test value a parameter is a tidy,
> reusable habit.

---

## Worked example — the whole solution

```go
func Racer(a, b string) (string, error) {
	return ConfigurableRacer(a, b, 10*time.Second)
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

Read it as a sentence: *"return `a` if `a` answers first, `b` if `b` answers first, or an error if neither
answers within `timeout`."* Three outcomes, one construct, no way to hang.

---

## Prove it with a test (without the real internet)

How do you test "the faster URL wins" reliably? You don't hit real sites — they're slow and flaky. You
spin up **fake** HTTP servers you control with [`net/http/httptest`](https://pkg.go.dev/net/http/httptest),
and make one deliberately slower than the other:

```go
func makeDelayedServer(delay time.Duration) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			time.Sleep(delay)
			w.WriteHeader(http.StatusOK)
		}))
}
```

`httptest.NewServer` starts a real local server on a random port and gives you its `.URL`. The test makes
a **slow** one (sleeps ~20ms) and a **fast** one (no sleep), races them, and asserts the *fast* URL wins.
A second test points the racer at a server slower than a *tiny* `ConfigurableRacer` timeout (a 25ms server
against a 20ms timeout) and asserts it returns an **error**. Every delay is in **milliseconds**, so the
whole suite is fast and not flaky — and `defer server.Close()` cleans each one up.

---

## 🏋️ Your rep — make it GREEN

`Racer` is already wired up for you; the part that lies is `ConfigurableRacer`:

```go
func ConfigurableRacer(a, b string, timeout time.Duration) (string, error) {
	return "", nil // TODO(you): select over ping(a), ping(b), and time.After(timeout)
}
```

1. Watch it fail (RED — this is supposed to happen):
   ```text
   go test ./exercises/select/ -v
   ```
   *(run it from the `go-gym` folder)*
2. Build it:
   1. Write a helper `ping(url string) chan struct{}` that makes a channel, starts a goroutine which
      calls `http.Get(url)` and then `close`s the channel, and returns the channel.
   2. In `ConfigurableRacer`, `select` over three cases: `<-ping(a)` → return `a, nil`; `<-ping(b)` →
      return `b, nil`; and `<-time.After(timeout)` → return `"", fmt.Errorf(...)`.
3. Run again → **GREEN**. (These tests use timing, so it's worth a `go test -race ./exercises/select/`
   too.)

Type it yourself. Reading builds recognition; *writing* builds skill — the muscle only grows when your
fingers move.

### Stretch goals (optional, ask your tutor to scaffold any)

- Return the *response time* of the winner alongside the URL.
- Add a `default` case to a small `select` and watch how it makes the receive non-blocking.
- Re-implement the timeout with a `context.WithTimeout` instead of `time.After` (a preview of Chapter 13).

---

## 🧠 Active recall — answer out loud, no peeking

1. What does `select` do when *two* of its cases are ready at the same moment?
2. Why do we use `chan struct{}` for `ping`, and what does **closing** that channel signal?
3. What problem does the `time.After` case solve, and what would happen without it?
4. Why does the test use `httptest` servers instead of real URLs?

If any answer is fuzzy, scroll back up — that's the recall doing its job, not failure.

---

## 🔍 Real code in the wild

Open the [`time`](https://pkg.go.dev/time#After) package and read `time.After`'s one-line doc: *"After
waits for the duration to elapse and then sends the current time on the returned channel."* That's the
whole magic — a channel that fires on a timer, perfect as a `select` case. Then peek at
[`context`](https://pkg.go.dev/context) (your Chapter 13 destination): `context.WithTimeout` and
`ctx.Done()` generalize this exact idea — a channel that closes when it's time to stop — into something you
can thread through an entire call stack, not just a single `select`. You've just learned the seed that the
whole `context` package grows from.

---

## What you learned

- **`select`** waits on several channel operations at once and runs the case for whichever is ready
  first; ties are broken **at random**; a `default` makes it non-blocking.
- A **`chan struct{}`** carries no data — it's a pure **signal**; **closing** it makes every receive
  return immediately, which is how `ping` says "I'm done."
- **`time.After(d)`** gives you a timeout channel; adding it as a `select` case means your code **can
  never hang forever**.
- Make awkward values (like a timeout) a **parameter** so they're testable — `Racer` wraps
  `ConfigurableRacer`.
- Test timing-sensitive code with **`httptest`** servers and **millisecond** delays — fast and
  deterministic.

✅ **Done when:** `go test ./exercises/select/` is GREEN (and clean under `go test -race ./exercises/select/`) and you can answer the four recall questions.

**Next:** Chapter 11 — *Reflection*, where we leave concurrency for a chapter to ask a stranger question:
can a program inspect the *type and shape* of a value it's never seen before, at run time?
