# 9 · Concurrency 🔵

> *This is where Go earns its reputation. Concurrency — doing several things at once — is built into
> the **language**, not bolted on as a library. Two tiny pieces do almost all the work: the word `go`
> to start something running alongside everything else, and **channels** to pass results back safely.
> The hard part isn't the syntax (it's astonishingly small) — it's the new way of *thinking*. This
> chapter builds that thinking carefully, including the trap that bites every newcomer: sharing memory
> between concurrent code.*

**What you'll build:** `CheckWebsites` — check a whole list of URLs *at the same time* instead of one
after another — and, around it, the mental model that makes Go concurrency safe instead of scary.

**Files for this chapter:** `exercises/concurrency/concurrency.go` (you fix this) · `exercises/concurrency/concurrency_test.go` (written for you).

---

## Where we're going

By the end of this chapter you'll be able to:

1. Start a **goroutine** with `go f()` and explain what just happened.
2. Say why goroutines can't simply *return* values the way functions do.
3. Use a **channel** to pass results back from goroutines safely.
4. Recognize a **data race** — the #1 concurrency bug — and explain why writing a shared map from many
   goroutines is broken.
5. Run the **race detector** (`go test -race`) and know what it's for.

This is a 🔵 chapter — a genuine step up. Go slowly; the payoff is huge.

---

## The big idea: `go` starts a thing running *alongside* you

Normally your code is a single line of dominoes: each statement finishes before the next begins. That's
**sequential** execution, and it's all you've done so far.

A **goroutine** is a function that runs *concurrently* — at the same time as the code that started it.
You launch one by putting the keyword `go` in front of a call:

```go
go doSomething()   // starts doSomething() and DOESN'T wait — the next line runs immediately
```

That one word is the whole feature. `doSomething()` is now running on its own, and control returns to
you instantly so you can launch more.

```text
   sequential:   check A ──▶ check B ──▶ check C        (each waits for the last)

   concurrent:   check A ─┐
                 check B ─┼─▶ all in flight at once
                 check C ─┘
```

Goroutines are **cheap** — you can start thousands. The Go runtime multiplexes them onto a small number
of operating-system threads for you. You don't manage threads; you just say `go`.

> A goroutine is *not* guaranteed to run in parallel on multiple CPU cores (though it often will). The
> guarantee is **concurrency** — progress on several tasks in overlapping time — which is exactly what you
> want when each task spends most of its time *waiting* (for a network reply, a disk, a timer).

---

## The catch: a goroutine can't `return` to you

Here's the first thing that trips people. A goroutine runs *independently*, so where would its return
value even go? The line that launched it has already moved on.

```go
go wc(url)   // this DOES call wc(url) — but the bool it returns is thrown away
```

A goroutine that computes an answer needs some way to hand that answer *back* across the boundary between
"the goroutine" and "whoever wants the result." That channel of communication is, fittingly, called a
**channel**.

---

## Channels: a typed pipe between goroutines

A **channel** is a typed conduit you can **send** values into and **receive** values out of. The arrow
`<-` points the way the data flows:

```go
ch := make(chan int)   // a channel that carries ints

ch <- 42               // SEND 42 into the channel  (arrow points INTO ch)
x := <-ch              // RECEIVE from the channel into x  (arrow points OUT of ch)
```

The crucial property: **an unbuffered channel synchronizes.** A send blocks until someone is ready to
receive, and a receive blocks until someone sends. That blocking is a *feature* — it's how one goroutine
safely hands a value to another with no shared memory and no locks.

So the safe pattern for "do work in goroutines, collect the answers" is: each goroutine **sends its
result on a channel**, and one collector **receives** them all.

```go
results := make(chan string)

go func() { results <- "from goroutine A" }()
go func() { results <- "from goroutine B" }()

fmt.Println(<-results) // waits for, then prints, whichever arrives first
fmt.Println(<-results) // then the other
```

Notice we passed each goroutine an **anonymous function** (`func(){ ... }()` — defined and called on the
spot). That's the usual way to wrap up a little unit of concurrent work.

---

## The trap you must understand: the shared-map data race

Now the part that separates people who *use* concurrency from people who get burned by it.

The "obvious" way to build a `url -> bool` map concurrently looks like this — and it is **wrong**:

```go
func CheckWebsites(wc WebsiteChecker, urls []string) map[string]bool {
	results := make(map[string]bool)
	for _, url := range urls {
		go func(u string) {
			results[u] = wc(u)   // ❌ MANY goroutines writing the SAME map
		}(url)
	}
	// ... and we'd have to wait somehow ...
	return results
}
```

Multiple goroutines writing to the **same** `map` at the **same** time is a **data race**: two pieces of
concurrent code touching the same memory, with at least one of them writing, and no coordination between
them. Maps in Go are explicitly **not** safe for concurrent writes — do this and Go may crash your program
outright with `fatal error: concurrent map writes`, or silently corrupt the map. Either way it's a bug,
and a *non-deterministic* one — it might pass a hundred times and explode on the hundred-and-first.

> **The rule:** never let two goroutines touch the same memory when one of them writes, unless you
> coordinate access. There are two ways to coordinate: **don't share memory — communicate** (channels,
> this chapter) or **guard the memory with a lock** (`sync.Mutex`, Chapter 12). Go's motto is the first
> one: *"Don't communicate by sharing memory; share memory by communicating."*

### The fix: send results over a channel, collect them in one place

Let each goroutine *send* its little result on a channel. Then **one** goroutine — the original one —
receives them all and writes the map. Only one writer, so no race:

```go
type result struct {
	string
	bool
}

func CheckWebsites(wc WebsiteChecker, urls []string) map[string]bool {
	results := make(map[string]bool)
	resultChannel := make(chan result)

	for _, url := range urls {
		go func(u string) {
			resultChannel <- result{u, wc(u)}   // ✅ send, don't write the map
		}(url)
	}

	for i := 0; i < len(urls); i++ {
		r := <-resultChannel                    // ✅ ONE goroutine writes the map
		results[r.string] = r.bool
	}

	return results
}
```

Two details worth pausing on:

- **`result` has two *unnamed* fields** (`string` and `bool`). Go lets a struct field be just a type;
  the field's name becomes the type name. It's a tidy little carrier here — `r.string`, `r.bool`.
- **We pass `url` into the goroutine as a parameter** (`func(u string){...}(url)`). This captures *this
  iteration's* value cleanly, rather than relying on the loop variable — a habit that keeps you safe and
  reads clearly.

The second loop runs exactly `len(urls)` times, one receive per goroutine, so we collect every answer and
then return. No locks, no shared writes — just values flowing through a pipe.

---

## Prove it with a test (and the tool that catches races)

`concurrency_test.go` hands `CheckWebsites` a **fake** `WebsiteChecker` so the test never touches the real
network — it's a plain function that returns `false` for one known-bad URL and `true` for everything else:

```go
func mockWebsiteChecker(url string) bool {
	return url != "waat://furhurterwe.geds"
}
```

The test then asserts the returned map matches the expected `url -> bool` map (with `reflect.DeepEqual`,
since you can't `==` a map). Because the *whole point* of this chapter is concurrency correctness, you
should also run it under the **race detector**:

```text
go test -race ./exercises/concurrency/
```

`-race` instruments your program to watch for two goroutines touching the same memory without coordination.
Run the broken shared-map version under it and it screams `DATA RACE` with both stack traces. Run your
channel-based version and it's silent. That tool is your concurrency seatbelt — get in the habit of wearing
it.

---

## 🏋️ Your rep — make it GREEN

Right now `concurrency.go` returns an empty map on purpose:

```go
func CheckWebsites(wc WebsiteChecker, urls []string) map[string]bool {
	results := make(map[string]bool)
	// TODO(you): one goroutine per url; each SENDS its result on a channel;
	// collect them into results. Do NOT write the map from the goroutines.
	return results
}
```

1. Watch it fail (RED — this is supposed to happen):
   ```text
   go test ./exercises/concurrency/ -v
   ```
   *(run it from the `go-gym` folder)*
2. Build it with the safe pattern:
   1. Make a channel to carry results — a small struct of `{url, bool}` works well.
   2. `range` over `urls` and, for each one, launch a goroutine (`go func(u string){ ... }(url)`)
      that **sends** `{u, wc(u)}` on the channel. Pass `url` in as an argument.
   3. Loop exactly `len(urls)` times, **receiving** one result each pass, and write it into the map.
   4. Return the map.
3. Run again → **GREEN**. Then run it once more with `-race` to prove there's no data race.

Type it yourself. Reading builds recognition; *writing* builds skill — the muscle only grows when your
fingers move.

### Stretch goals (optional, ask your tutor to scaffold any)

- Add a benchmark that compares a sequential `CheckWebsites` (no `go`) against the concurrent one using a
  fake checker that sleeps a few milliseconds — watch the concurrent version win.
- Deliberately write the **broken** shared-map version in a scratch file and run it under `-race` so you
  see the detector fire. (Then delete it — you only need to witness it once.)
- Cap how many checks run at once (a "worker pool") using a buffered channel as a semaphore.

---

## 🧠 Active recall — answer out loud, no peeking

1. What does the keyword `go` do, and why can't the goroutine it starts just `return` a value to you?
2. What is a **channel**, and which direction does `ch <- x` send versus `x := <-ch`?
3. Why is writing to one shared `map` from many goroutines a bug — and what *two* ways exist to fix it?
4. What does `go test -race` do, and why should you run it on concurrent code?

If any answer is fuzzy, scroll back up — that's the recall doing its job, not failure.

---

## 🔍 Real code in the wild

The standard library's [`sync`](https://pkg.go.dev/sync) package is the *other* half of Go concurrency —
the "guard the memory with a lock" toolkit you'll meet properly in Chapter 12. Skim its summary now and
notice the vocabulary already makes sense: `Mutex` (a lock for a critical section), `WaitGroup` (wait for
a batch of goroutines to finish), `Once` (run something exactly one time even if many goroutines ask). The
package doc opens with the same advice this chapter gave you — *"Values containing the types defined in
this package should not be copied"* and prefer communicating over sharing. You're reading it fluently
because you just lived the problem it solves.

---

## What you learned

- **`go f()`** starts a **goroutine** — `f` runs concurrently and control returns to you immediately.
- Goroutines can't `return` to the launcher; they **communicate over channels**.
- A **channel** (`make(chan T)`) is a typed pipe: `ch <- x` sends, `x := <-ch` receives; an unbuffered
  channel **synchronizes** sender and receiver.
- Writing shared memory (like a `map`) from many goroutines is a **data race** — non-deterministic and
  often fatal. Fix it by **communicating** (channels) or **locking** (`sync.Mutex`, next-but-one chapter).
- The pattern: each goroutine **sends** its result; **one** collector **receives** and builds the map.
- **`go test -race`** detects data races — wear it like a seatbelt.

✅ **Done when:** `go test ./exercises/concurrency/` is GREEN (and clean under `go test -race ./exercises/concurrency/`) and you can answer the four recall questions.

**Next:** Chapter 10 — *Select*, where we wait on *several* channels at once and add a timeout, so a slow
operation can never hang your program forever.
