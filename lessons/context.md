# 13 · Context 🔵

> *Here's a problem every server has. A user requests a page; behind that one request your code kicks
> off a database query, an API call, maybe more. Then the user closes the tab. Now you're doing work for
> an answer **nobody is waiting for** — burning CPU, holding a database connection, all for nothing. You
> need a way to say "the caller gave up; everyone downstream, **stop**." That's exactly what
> `context.Context` is for: it carries **cancellation** across every boundary in a call chain.*

**What you'll build:** an HTTP handler that asks a store for data — but if the request is cancelled mid-flight,
it stops cleanly and writes nothing instead of plowing ahead.

**Files for this chapter:** `exercises/context/context.go` (you fix this) · `exercises/context/context_test.go` (written for you).

---

## Where we're going

By the end of this chapter you'll be able to:

1. Explain what a **`context.Context`** is and why it's threaded through so much Go code.
2. Pull a request's context with **`r.Context()`** and pass it down to the work you start.
3. Respect cancellation: when downstream returns an error, **don't write a useless response**.
4. Drive cancellation **deterministically** in a test with `context.WithCancel` — no sleeps.

A 🔵 chapter that ties the whole concurrency cluster together: now your concurrent work can be *told to
stop*.

---

## The big idea: a context is a cancellation signal you pass along

A **`context.Context`** is a small value that travels **down** a call chain — from the handler, into the
store, into whatever the store calls — carrying two things: optional deadlines, and a **cancellation
signal**. Every function that might do slow or concurrent work takes a `ctx context.Context` as its
**first parameter**, by convention, and passes it onward.

The key piece is a channel hiding inside it: **`ctx.Done()`** returns a channel that is **closed** when
the context is cancelled (or its deadline passes). Recognize that shape? It's the closed-channel "done"
signal from the Select chapter, generalized so it can flow through an entire program.

```text
   client request ──▶ handler ──r.Context()──▶ store.Fetch(ctx) ──ctx──▶ deeper work…
                          │
   client disconnects ────┘  ──▶ ctx is cancelled ──▶ ctx.Done() closes ──▶ everyone stops
```

When the client disconnects, Go cancels the request's context for you. Anything still listening on
`ctx.Done()` learns it should quit — *if* you bothered to pass `ctx` down and check it.

---

## In an HTTP handler: `r.Context()`

Every `*http.Request` carries a context, reachable with `r.Context()`. It's cancelled automatically when
the client goes away. So the handler's job is simple: **take that context and hand it to the work you
start.**

```go
func Server(store Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		data, err := store.Fetch(r.Context())   // pass the request's context down
		// ...
	}
}
```

`Store` is an interface, so the handler doesn't care *what* the store is — only that it can `Fetch` given
a context:

```go
type Store interface {
	Fetch(ctx context.Context) (string, error)
}
```

(Notice the proverb from Chapter 4 again — *accept interfaces*. The handler is testable precisely because
`Store` is an interface we can fake.)

---

## Respecting cancellation: don't write a useless answer

Here's the crux, and the bug the stub deliberately has. When `Fetch` is cancelled, it returns an
**error** — typically `ctx.Err()`, which is `context.Canceled` once the context is cancelled. A handler
that *ignores* that error and writes the (empty or stale) data anyway is doing exactly the wrong thing: it
sends a meaningless response on behalf of a client who already left.

The correct handler **checks the error and bails out without writing the body**:

```go
func Server(store Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		data, err := store.Fetch(r.Context())
		if err != nil {
			return // cancelled or failed — write nothing
		}
		fmt.Fprint(w, data)
	}
}
```

That `if err != nil { return }` is the whole lesson in miniature: *cancellation is an error you must
honour, not ignore.* (In a real service you might also `http.Error(w, ...)` or log it — but the essential
move is **don't write the success body when the work didn't succeed**.)

---

## Worked example — the pieces together

```go
type Store interface {
	Fetch(ctx context.Context) (string, error)
}

func Server(store Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		data, err := store.Fetch(r.Context())
		if err != nil {
			return
		}
		fmt.Fprint(w, data)
	}
}
```

Tiny — and that's the point. Context's power isn't in *this* code; it's in the discipline of **passing
`ctx` down and respecting it** at every layer. Get that habit and cancellation just works through your
whole stack.

---

## Prove it with a test (deterministic — no sleeps)

How do you test cancellation without flaky timers? You **drive it directly**. `context_test.go` uses a
spy store and the `context.WithCancel` function, which hands you a context **and** a `cancel` function you
call to cancel it on demand.

**The happy path** uses a spy that just returns data:

```go
type SpyStore struct{ response string }

func (s *SpyStore) Fetch(ctx context.Context) (string, error) {
	return s.response, nil
}
```

The test runs the handler with `httptest.NewRequest` + `httptest.NewRecorder` and asserts the recorder's
body equals the response — proving the handler writes data on success.

**The cancellation path** uses a spy whose `Fetch` waits on `ctx.Done()` and then reports the
cancellation:

```go
func (s *CancellingStore) Fetch(ctx context.Context) (string, error) {
	<-ctx.Done()              // block until cancelled
	return "", ctx.Err()      // report why we stopped
}
```

The test builds a request, derives a **cancelled** context from it (`ctx, cancel := context.WithCancel(...)`
then calls `cancel()` immediately), attaches it with `r.WithContext(ctx)`, and runs the handler. Because
the context is already cancelled, `ctx.Done()` is closed, `Fetch` returns an error, and the handler must
write **nothing**. The test asserts the recorder body is empty. No `time.Sleep` anywhere — the `cancel()`
call makes it fully deterministic.

---

## 🏋️ Your rep — make it GREEN

Right now `context.go` ignores the error and always writes — so it fails the cancellation test:

```go
func Server(store Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		data, _ := store.Fetch(r.Context())
		fmt.Fprint(w, data) // TODO(you): check the error from Fetch first;
		// if it's non-nil (e.g. the request was cancelled), return WITHOUT writing.
	}
}
```

1. Watch it fail (RED — this is supposed to happen):
   ```text
   go test ./exercises/context/ -v
   ```
   *(run it from the `go-gym` folder)*
2. Fix it:
   1. Capture **both** return values: `data, err := store.Fetch(r.Context())`.
   2. If `err != nil`, `return` immediately — write nothing to `w`.
   3. Otherwise, `fmt.Fprint(w, data)` as before.
3. Run again → **GREEN**. Both the success and cancellation tests now pass.

Type it yourself. Reading builds recognition; *writing* builds skill — the muscle only grows when your
fingers move.

### Stretch goals (optional, ask your tutor to scaffold any)

- On error, respond with `http.Error(w, err.Error(), http.StatusInternalServerError)` and add a test that
  checks the status code — then decide whether a *cancellation* really deserves a 500 (it often doesn't).
- Make `Fetch` do the work in a goroutine and `select` between its result channel and `ctx.Done()`, so a
  slow store is *actually* abandoned on cancel (not just reported).
- Add a deadline with `context.WithTimeout` and a test using a tiny millisecond timeout.

---

## 🧠 Active recall — answer out loud, no peeking

1. What does a `context.Context` carry, and where do you get one inside an HTTP handler?
2. What is `ctx.Done()`, and what happens to it when the context is cancelled?
3. In the handler, *why* must you check the error from `Fetch` before writing the response?
4. How does the test cancel the context **deterministically**, without sleeping?

If any answer is fuzzy, scroll back up — that's the recall doing its job, not failure.

---

## 🔍 Real code in the wild

Open [`net/http`](https://pkg.go.dev/net/http#Request.Context) and read `Request.Context`: *"For incoming
server requests, the context is canceled when the client's connection closes, the request is canceled
(with HTTP/2), or when the ServeHTTP method returns."* That's the machinery you just used — Go wires
cancellation into every request for free; your only job is to *pass it down and honour it*. Then skim the
[`context`](https://pkg.go.dev/context) package itself: `WithCancel`, `WithTimeout`, `WithDeadline`, and
the convention printed right at the top — *"Do not store Contexts inside a struct type; instead, pass a
Context explicitly to each function that needs it, as the first parameter."* You now read that advice as
common sense.

---

## What you learned

- A **`context.Context`** carries **cancellation** (and deadlines) down a call chain; by convention it's
  the **first parameter** of functions that do slow or concurrent work.
- **`r.Context()`** gives a handler the request's context, auto-cancelled when the client disconnects.
- **`ctx.Done()`** is a channel that **closes** on cancellation — the Select chapter's "done" signal,
  scaled to a whole program.
- Honour cancellation: when downstream returns an error, **return without writing** a meaningless response.
- Test cancellation **deterministically** with `context.WithCancel` + `cancel()` — no sleeps, no flakiness.

✅ **Done when:** `go test ./exercises/context/` is GREEN and you can answer the four recall questions.

**Next:** Chapter 14 — *Property-based tests*, where instead of hand-picking example cases we let the
testing tool throw *hundreds of random inputs* at our code to flush out the cases we'd never think of.
