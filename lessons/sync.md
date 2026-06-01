# 12 · Sync 🔵

> *In the Concurrency chapter you met the data race and dodged it by **communicating** — passing
> results over channels so only one goroutine ever touched the map. That's the Go-preferred way. But
> sometimes the simplest, clearest thing really is **shared state** — a counter, a cache — touched by
> many goroutines. For that, Go gives you a **lock**: `sync.Mutex`. This chapter is the other half of
> "don't race": when you *do* share memory, guard it.*

**What you'll build:** a `Counter` that thousands of goroutines can safely increment at once, using a
mutex to protect its single integer.

**Files for this chapter:** `exercises/sync/sync.go` (you fix this) · `exercises/sync/sync_test.go` (written for you).

---

## Where we're going

By the end of this chapter you'll be able to:

1. Use a **`sync.Mutex`** to make shared state safe under concurrent access.
2. Pair `Lock`/`Unlock` correctly — and use `defer` so you never forget to unlock.
3. Use a **`sync.WaitGroup`** to wait for a batch of goroutines to finish.
4. Explain why you must **never copy** a `Counter` after use — and how `go vet` catches it.
5. Prove safety with the **race detector** (`go test -race`).

The shortest 🔵 chapter, and a tool you'll reach for constantly.

---

## The big idea: a mutex is a "one at a time" turnstile

Recall the rule from Chapter 9: a **data race** is two goroutines touching the same memory with at least
one writing and no coordination. Channels coordinate by *moving* the data. A **mutex** coordinates by
*guarding* it — letting only **one** goroutine into the critical section at a time.

> **Mutex** is short for **mut**ual **ex**clusion. Think of it as a turnstile in front of the shared
> data: a goroutine must `Lock()` to go through, do its work, then `Unlock()` to let the next one in.
> While one holds the lock, everyone else **waits**.

```text
   goroutine A ─Lock()─▶ [ count++ ] ─Unlock()─┐
   goroutine B ───────── waiting… ─────────────┴─Lock()─▶ [ count++ ] ─Unlock()─▶ …
```

Because only one goroutine is ever inside the locked region, the increment can't be interleaved with
another, and there's no race.

---

## Why a plain `count++` races

`count++` looks atomic, but it isn't — it's really *read the value, add one, write it back*. Two
goroutines can both read `5`, both compute `6`, and both write `6` — so two increments produce one. With
1000 goroutines that's how you end up with a total of, say, 973 instead of 1000, **differently every run**.
A mutex turns those three steps into one indivisible operation as far as other goroutines are concerned.

---

## The Counter, guarded

Here's the type. The mutex is a **field** named `mu`, sitting right next to the data it protects:

```go
type Counter struct {
	mu    sync.Mutex
	value int
}
```

And the two methods. Note **`defer c.mu.Unlock()`**: it schedules the unlock to run when the method
returns, so the lock is always released even if the body grows more complex later:

```go
func (c *Counter) Inc() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.value++
}

func (c *Counter) Value() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.value
}
```

> **Why lock `Value()` too?** Reading shared memory while another goroutine writes it is *also* a race.
> Both reads and writes of `value` must hold the lock. (Convention: keep the `mu` field declared directly
> above the fields it guards, so the relationship is obvious to the next reader.)

---

## The gotcha you must respect: never copy a Counter

This is the one rule that bites people. **Pass a `Counter` by value and you copy its mutex** — and a copy
of a mutex is a *separate lock*, so the copy and the original no longer exclude each other. The protection
silently evaporates.

That's why both methods use a **pointer receiver** (`*Counter`), and why you pass `*Counter` around — not
`Counter`:

```go
func work(c *Counter) { c.Inc() }   // ✅ everyone shares the SAME counter & lock

func bad(c Counter)   { c.Inc() }    // ❌ c is a COPY — its mutex protects nothing useful
```

The good news: you don't have to remember this by willpower. **`go vet` catches it** — it flags any code
that copies a value containing a `sync.Mutex` ("call of work copies lock value"). Run `go vet ./...` and
let the tool watch your back. (`go test` runs `go vet` automatically by default.)

---

## Waiting for goroutines: `sync.WaitGroup`

To *prove* the counter is safe, the test fires 1000 goroutines that each call `Inc()` once, then checks
the total is exactly 1000. But the test must **wait** for all 1000 to finish before reading the value —
otherwise it reads too early. That's what a **`sync.WaitGroup`** is for: a countdown latch.

```go
var wg sync.WaitGroup
wg.Add(1000)              // we're waiting for 1000 things

for i := 0; i < 1000; i++ {
	go func() {
		defer wg.Done()   // each goroutine signals "I'm finished" (counts down by 1)
		counter.Inc()
	}()
}

wg.Wait()                 // blocks until the counter hits 0 — all goroutines done
```

`Add(n)` sets the count, each `Done()` decrements it, and `Wait()` blocks until it reaches zero. It's the
"join" half of "fork a bunch of goroutines, then wait for them all."

---

## Prove it with a test (and run it with `-race`)

`sync_test.go` has two tests:

1. **A simple one:** call `Inc()` three times, assert `Value()` is `3`. This catches a counter that does
   nothing.
2. **A concurrency one:** the 1000-goroutine `WaitGroup` test above, asserting `Value() == 1000`.

The concurrency test is the real point — and it's most powerful under the **race detector**:

```text
go test -race ./exercises/sync/
```

With a correct mutex, `-race` is silent and the total is 1000. Strip the lock out and `-race` reports a
`DATA RACE` on `value` with two goroutine stacks, *and* the total comes out wrong. That's the chapter's
lesson made runnable: the lock is what makes the shared counter correct.

---

## 🏋️ Your rep — make it GREEN

Right now `sync.go` has an empty `Counter` and methods that do nothing useful:

```go
type Counter struct {
	// TODO(you): add a sync.Mutex (call it mu) and an int to hold the count
}

func (c *Counter) Inc()       { /* TODO(you): lock, increment the count, unlock */ }
func (c *Counter) Value() int { return 0 /* TODO(you): lock, read the count, unlock */ }
```

1. Watch it fail (RED — this is supposed to happen):
   ```text
   go test ./exercises/sync/ -v
   ```
   *(run it from the `go-gym` folder)*
2. Build it:
   1. Give `Counter` two fields: `mu sync.Mutex` and an `int` (e.g. `value`). Import `"sync"`.
   2. In `Inc`: `c.mu.Lock()`, then `defer c.mu.Unlock()`, then `c.value++`.
   3. In `Value`: `c.mu.Lock()`, `defer c.mu.Unlock()`, then `return c.value`.
   4. Keep **pointer receivers** (`*Counter`) on both — never copy the counter.
3. Run again → **GREEN**. Then run `go test -race ./exercises/sync/` and watch it stay clean.

Type it yourself. Reading builds recognition; *writing* builds skill — the muscle only grows when your
fingers move.

### Stretch goals (optional, ask your tutor to scaffold any)

- Add a constructor `NewCounter() *Counter` and use it in the tests.
- Deliberately change a method to a **value** receiver and run `go vet ./...` to watch it complain about
  copying the lock.
- Add a `sync.Once`-guarded `init()` so some setup runs exactly once no matter how many goroutines call it.

---

## 🧠 Active recall — answer out loud, no peeking

1. What does a `sync.Mutex` guarantee, and why must `Value()` lock as well as `Inc()`?
2. Why is `defer c.mu.Unlock()` a good habit?
3. What goes wrong if you **copy** a `Counter`, and which tool catches that mistake?
4. What do `Add`, `Done`, and `Wait` do on a `sync.WaitGroup`?

If any answer is fuzzy, scroll back up — that's the recall doing its job, not failure.

---

## 🔍 Real code in the wild

Open the [`sync`](https://pkg.go.dev/sync) package docs and read the top: *"Values containing the types
defined in this package should not be copied."* That single sentence is the gotcha you just learned,
straight from the source. Skim [`sync.Once`](https://pkg.go.dev/sync#Once) — its whole job is to run a
function *exactly once* even if many goroutines call `Do` at the same time, used everywhere for one-time
lazy initialization. And notice the standard library itself uses mutexes the same way you just did — open
[`sync.Map`](https://pkg.go.dev/sync#Map) (a concurrency-safe map) and you'll see locks guarding shared
state, the exact pattern from your `Counter`, scaled up.

---

## What you learned

- A **`sync.Mutex`** is a "one goroutine at a time" lock; `Lock()`/`Unlock()` bracket the **critical
  section** that touches shared state. **Both** reads and writes must hold the lock.
- **`defer c.mu.Unlock()`** guarantees the lock is released no matter how the method returns.
- **Never copy** a value containing a mutex — the copy gets a *separate* lock and protection vanishes. Use
  **pointer receivers** and pass `*Counter`. **`go vet`** catches accidental copies.
- A **`sync.WaitGroup`** (`Add`/`Done`/`Wait`) waits for a batch of goroutines to finish.
- **`go test -race`** proves the mutex actually fixed the race.

✅ **Done when:** `go test ./exercises/sync/` is GREEN (and clean under `go test -race ./exercises/sync/`) and you can answer the four recall questions.

**Next:** Chapter 13 — *Context*, where we learn to **cancel** work in flight — telling a slow operation
"stop, the caller gave up" so you don't waste effort on a result nobody's waiting for anymore.
