# 9 · Concurrency 🔵

> *This is where Go earns its reputation. Concurrency — making progress on several things at once —
> is built into the **language**, not bolted on as a library. Two tiny pieces do almost all the work:
> the word `go`, and **channels**. But this chapter won't hand them to you as finished facts. We'll
> start from working, tested, **slow** code, measure exactly how slow, and then try to speed it up —
> and break it twice in two different ways before we get it right. The bugs are the lesson: by the
> end you'll have made one function about a hundred times faster and you'll know precisely why the
> safe version is shaped the way it is.*

**What you'll build:** `CheckWebsites` — check a whole list of URLs *at the same time* instead of one
after another — and, around it, the mental model that makes Go concurrency safe instead of scary.

**Files for this chapter:** `exercises/concurrency/concurrency.go` (you fix this) · `exercises/concurrency/concurrency_test.go` (written for you).

---

## Where we're going

By the end of this chapter you'll be able to:

1. Start a **goroutine** with `go f()` and explain what just happened — and what *didn't*.
2. Prove, with a **benchmark**, why the sequential version was too slow to live with.
3. Explain why the obvious concurrent attempt returns an **empty map**, and why "just wait a bit"
   makes it worse, not better.
4. Recognize a **data race** — the #1 concurrency bug — catch it with the **race detector**
   (`go test -race`), and explain why many goroutines writing one map is broken.
5. Fix it with a **channel**, and say why the fix works: *exactly one writer*.

This is a 🔵 chapter — a genuine step up. Go slowly; the payoff is huge. And everything in it hangs
off one picture: **readers and the notebook.**

---

## The big idea: `go` hires another reader

So far, every program you've written is read by a single reader. Picture it literally: one reader
moving down the page of your code, statement by statement, stepping inside each function it calls
and not coming back out until it's done. That's **sequential** execution. Each statement *blocks* —
makes the reader wait — until it finishes.

The keyword `go` hires **another reader**:

```go
go doSomething()   // a NEW reader starts inside doSomething() — yours moves on immediately
```

Your original reader doesn't step inside `doSomething()` and wait. A second reader appears, starts
reading there, and your reader carries on down the page in the very same instant. The function call
became a **goroutine** — a piece of work in progress alongside you.

```text
   sequential:   check A ──▶ check B ──▶ check C        (one reader; each waits for the last)

   concurrent:   check A ─┐
                 check B ─┼─▶ three readers, all in flight at once
                 check C ─┘
```

Why is this so valuable? Because most real work is *waiting*. A program that checks websites spends
almost all its time waiting for the network to answer — and one reader waiting on website A is a
reader who can't even *ask* website B yet. Hire a reader per website and all the waiting overlaps.

Goroutines are **cheap** — you can start thousands. The Go runtime multiplexes them onto a handful
of operating-system threads for you. You don't manage threads; you just say `go`.

> A goroutine is *not* guaranteed to run in parallel on separate CPU cores (though it often will).
> The guarantee is **concurrency** — progress on several tasks in overlapping time — which is
> exactly what you want when each task spends most of its time waiting.

**Checkpoint:** one reader, top to bottom — that's everything you've written so far. `go f()` hires
a second reader to read `f` while yours moves on. More readers, more waiting overlapped, more speed
— and, as you're about to see, more ways to trip.

---

## Make it work: the sequential version, measured

Here's the function this chapter is about, in its honest first form — already written, already
tested, already **correct**:

```go
type WebsiteChecker func(string) bool

func CheckWebsites(wc WebsiteChecker, urls []string) map[string]bool {
	results := make(map[string]bool)

	for _, url := range urls {
		results[url] = wc(url)
	}

	return results
}
```

Two familiar moves are hiding in that signature. `WebsiteChecker` is a **function type** — and
passing one in is the chapter 7 socket trick with a function instead of an interface: `CheckWebsites`
doesn't know *how* a URL gets checked (real HTTP? a fake?), it just calls whatever checker it was
handed. Which means the test can inject a stand-in — chapter 8's move — and never touch the real
network.

So it works, and it's testable. Is it done? Time to measure. Go's testing package can **benchmark**
as well as test — hand it a deliberately slow fake checker (20 milliseconds per URL, a believable
network delay) and a hundred URLs:

```go
func slowStubWebsiteChecker(_ string) bool {
	time.Sleep(20 * time.Millisecond)
	return true
}

func BenchmarkCheckWebsites(b *testing.B) {
	urls := make([]string, 100)
	for i := 0; i < len(urls); i++ {
		urls[i] = "a url"
	}
	for b.Loop() {
		CheckWebsites(slowStubWebsiteChecker, urls)
	}
}
```

```text
BenchmarkCheckWebsites    1    2249228637 ns/op
```

That's nanoseconds: **about 2.25 seconds** to check a hundred sites. Of course it is — one reader,
a hundred 20-millisecond waits, served strictly one after another. The arithmetic is the diagnosis:
100 × 20ms ≈ 2 seconds of *pure queuing*. The reader spends the whole time standing in line.

We made it work. Now let's make it fast — and watch what goes wrong.

---

## Breaking it, round one: the goroutines outrun you

The obvious move: hire a reader per URL. Put `go` in front of the work:

```go
// WRONG — first attempt.
func CheckWebsites(wc WebsiteChecker, urls []string) map[string]bool {
	results := make(map[string]bool)

	for _, url := range urls {
		go func() {
			results[url] = wc(url)
		}()
	}

	return results
}
```

(The `func(){ ... }()` is an **anonymous function** — defined and launched on the spot. Since `go`
needs a function call to its right, wrapping a little unit of work this way is the standard idiom.)

Run the test:

```text
--- FAIL: TestCheckWebsites
    CheckWebsites(...) = map[]; want map[https://example.com:true
        https://example.org:true waat://furhurterwe.geds:false]
```

An **empty map**. Not wrong answers — *no* answers. Think in readers and it's obvious: your original
reader hit the loop, hired a hundred new readers… and kept walking. Two lines later it reached
`return results` and handed back the map — while the hundred readers were still out checking
websites. Nobody waits for a goroutine unless somebody *arranges* to wait.

Here's the first thing every newcomer reaches for, and it's a trap with a friendly face:

```go
	// WRONG — round two: "just give them time to finish".
	time.Sleep(2 * time.Second)
	return results
```

Sometimes this passes. Sometimes the answers are incomplete. And sometimes the program dies with
something far more interesting:

```text
fatal error: concurrent map writes
```

Welcome to concurrency: handled wrong, it doesn't even fail *consistently*. The sleep papered over
the timing and exposed something deeper — and this one is the most important bug in the chapter.

---

## The data race: many hands, one notebook

The `results` map is **one notebook**. The sequential version was safe for a boring reason: one
reader held the pen. Our concurrent version sends a hundred readers at the same notebook, all
trying to write their line at once — and two of them *will* eventually grab the pen in the same
instant.

That's a **data race**: two or more goroutines touch the same memory at the same time, and at least
one of them is writing. The outcome depends on accidents of scheduling — which is why the sleep
version passed, failed, and crashed on different runs *without changing a line of code*. Go's maps
(chapter 6's handle, remember — every goroutine's copy of the handle points at the **same table**)
are not built for simultaneous writers, and when the runtime catches it in the act it stops the
whole program: `fatal error: concurrent map writes`.

You will not always be lucky enough to crash. Races can silently corrupt instead. So Go ships a
bug-finder for exactly this — the **race detector**. Run your tests with one extra flag:

```text
go test -race ./exercises/concurrency/

==================
WARNING: DATA RACE
Write at 0x00c420084d20 by goroutine 8:
  runtime.mapassign_faststr()

Previous write at 0x00c420084d20 by goroutine 7:
  runtime.mapassign_faststr()
==================
```

Read it like a detective report: goroutine 8 wrote an address, and goroutine 7 had written the
*same address*, with nothing ordering the two. Two hands, one notebook, no agreement about turns.

The rule that falls out is the design principle of this whole chapter:

**A shared thing wants exactly one writer.** Don't give a hundred readers the pen. Let them hand
their notes to *one* writer who does all the writing.

**Checkpoint:** `go` doesn't wait — the function that launches goroutines returns before they
finish unless something makes it wait. Sleeping is not waiting; it's hoping. And many goroutines
writing one map is a data race — run `go test -race` and the detector will name the two hands that
collided.

---

## Make it right: channels, the tray for the notes

So the readers must hand their notes to one writer. The hand-off mechanism is Go's second
concurrency piece: the **channel** — a typed conduit you **send** values into and **receive**
values from. The arrow `<-` always points the way the data flows:

```go
ch := make(chan int)   // a channel that carries ints

ch <- 42               // SEND 42 into the channel   (arrow points INTO ch)
x := <-ch              // RECEIVE from the channel   (arrow points OUT of ch)
```

The crucial property: **an unbuffered channel synchronizes.** A send blocks until someone is ready
to receive; a receive blocks until someone sends. Each hand-off is a real meeting between two
goroutines — that blocking is not a limitation, it's the *coordination you were missing*. No shared
pen, no locks: the note physically changes hands.

In the notebook picture, the channel is **the tray**. Readers don't touch the notebook at all
anymore — each one drops a note on the tray. One collector takes notes off the tray, one at a time,
and writes the notebook alone.

A note needs two facts on it — *which URL*, *what answer* — so we make a tiny struct for the pair:

```go
type result struct {
	string
	bool
}
```

The fields are **unnamed** — when names would add nothing ("the string", "the bool"), Go lets you
omit them, and you address the fields *by their types*: `r.string`, `r.bool`. A niche trick, but a
perfect fit for a two-field carrier with nothing meaningful to call its halves.

Now the whole machine:

```go
func CheckWebsites(wc WebsiteChecker, urls []string) map[string]bool {
	results := make(map[string]bool)
	resultChannel := make(chan result)

	for _, url := range urls {
		go func(u string) {
			resultChannel <- result{u, wc(u)}
		}(url)
	}

	for i := 0; i < len(urls); i++ {
		r := <-resultChannel
		results[r.string] = r.bool
	}

	return results
}
```

Walk it in readers and notes:

- The first loop hires one reader per URL. Each reader checks its site and **drops a note on the
  tray** — `resultChannel <- result{u, wc(u)}`. No reader ever touches the map.
- The second loop is the **collector** — your original reader, who now has a real job instead of
  leaving early: receive exactly `len(urls)` notes, and write each one into the notebook. **One
  writer.** No race *by construction* — there is no moment at which two hands can hold the pen.
- And the waiting problem from round one? Solved by the same stroke. Each receive **blocks** until
  a note arrives, so the function physically cannot reach `return` until all hundred notes are in.
  The channel is the "arranging to wait" we were missing — that's what the sleep was a fake of.

One detail deserves its own paragraph: `go func(u string) { ... }(url)`. We pass `url` in as an
argument instead of letting the anonymous function reach out and use the loop variable directly.
The parameter makes each goroutine's URL an explicit, private **snapshot** — handed over at launch,
immune to whatever the loop does next. (Older versions of Go *required* this — all goroutines used
to see the loop variable's final value. Modern Go gives each iteration a fresh variable, but the
explicit parameter remains the clearest way to say "this one is yours.")

Did we make it fast? Re-run the benchmark:

```text
BenchmarkCheckWebsites    100    23406615 ns/op
```

**0.023 seconds.** About a hundred times faster than the 2.25 seconds we started from — because a
hundred 20-millisecond waits now all happen *at the same time*, and the total cost is roughly one
wait plus change.

That arc has a name, usually credited to Kent Beck: **make it work, make it right, make it fast** —
in that order. The sequential version worked; the tests and the benchmark let us refactor toward
fast *while proving we never broke right*. Trying to start from "fast" is how you ship the empty
map.

**Checkpoint:** a channel is a typed tray: sends put notes on it, receives take them off, and each
unbuffered hand-off blocks until both sides meet. Readers drop notes; one collector writes the
notebook — exactly one writer, no race, and the blocking receives are what make the function wait
for all its goroutines.

---

## Prove it with a test (and the tool that catches races)

The test never touches the real network — it injects a fake checker, chapter 8's stand-in pattern
with a function instead of an interface:

```go
func mockWebsiteChecker(url string) bool {
	return url != "waat://furhurterwe.geds"
}

func TestCheckWebsites(t *testing.T) {
	urls := []string{
		"https://example.com",
		"https://example.org",
		"waat://furhurterwe.geds",
	}

	want := map[string]bool{
		"https://example.com":     true,
		"https://example.org":     true,
		"waat://furhurterwe.geds": false,
	}

	got := CheckWebsites(mockWebsiteChecker, urls)

	if !reflect.DeepEqual(want, got) {
		t.Errorf("CheckWebsites(...) = %v; want %v", got, want)
	}
}
```

Worth noticing:

- The fake answers instantly, so the test is fast even though the function is "about" slow network
  calls — the same reason the mocking chapter swapped the real sleeper out.
- `reflect.DeepEqual` compares the whole map at once (maps, like slices, can't be compared with
  `==` — the chapter 8 move again).
- A second test pins the edge case: no URLs in → an empty map out, not `nil`, not a hang.
- And one assertion lives *outside* the file: this chapter's test isn't fully passed until it's
  also clean under the race detector. `go test -race ./exercises/concurrency/` is part of "GREEN"
  here — the detector is the only assertion that can see scheduling bugs.

---

## 🏋️ Your rep — make it GREEN

Right now `CheckWebsites` in `concurrency.go` builds an empty map and returns it — RED:

```go
func CheckWebsites(wc WebsiteChecker, urls []string) map[string]bool {
	results := make(map[string]bool)
	// TODO(you): one goroutine per url; each SENDS its result on a channel;
	// collect them into results. Do NOT write the map from the goroutines.
	return results
}
```

Your job, in plain language:

1. Watch it fail (RED): `go test ./exercises/concurrency/` (run from the `go-gym` folder).
2. Define the little `result` carrier struct (two unnamed fields: `string`, `bool`) and make a
   `chan result`.
3. Loop over `urls`, launching one goroutine per URL — `go func(u string) { ... }(url)` — and have
   each **send** `result{u, wc(u)}` on the channel. The goroutines never touch the map.
4. Collect: loop `len(urls)` times, **receive** a note, write it into `results` — the single
   writer.
5. Run again → **GREEN**. Then the real exam: `go test -race ./exercises/concurrency/` — GREEN
   *and* silent.

### Stretch goals (ask your tutor to scaffold any)

- Write the benchmark from this chapter yourself (`BenchmarkCheckWebsites` with a
  `slowStubWebsiteChecker` that sleeps 20ms), run `go test -bench=. ./exercises/concurrency/`
  against your channel version, then temporarily swap in the sequential body and feel the
  difference first-hand.
- Recreate round one on purpose: write the map directly from the goroutines and run
  `go test -race`. Read the DATA RACE report — which two goroutines collided, at what line? —
  then put the channel back. (You'll meet this report again in real life; better to have read one
  calmly first.)
- Cap the crowd: instead of one goroutine per URL, try a fixed pool of, say, 5 worker goroutines
  fed by a channel of URLs. (Real systems do this so ten thousand URLs don't mean ten thousand
  simultaneous connections.)

---

## 🧠 Active recall — answer out loud, no peeking

1. In the readers-and-the-page picture, what does `go f()` do — and what does the reader who said
   `go` do next?
2. The first concurrent attempt returned an empty map. Walk the timeline: who returned, who was
   still working, and why did nothing force them to meet?
3. Why is `time.Sleep` not a fix — what two different failures can it still produce?
4. Define a data race in one sentence. Why is "many goroutines write one map" the textbook case,
   and what's the one-writer rule that prevents it?
5. What does it mean that an unbuffered channel "synchronizes"? How does that property solve *both*
   round-one problems — the not-waiting and the racing?
6. In `go func(u string) { ... }(url)`, why pass `url` as an argument instead of just using it
   inside the function?
7. What does `go test -race` add that ordinary `go test` cannot see, even in principle?

If any answer is fuzzy, scroll back up — that's the recall doing its job.

---

## 🔍 Real code in the wild

You've been using this chapter's pattern since before you knew it existed: Go's `net/http` server
launches **a goroutine per incoming request**. Every web service you've ever called from a Go
program was many readers on the same page — which is precisely why the data race you just learned
to catch is the most common serious bug in real Go services: two request-goroutines touching one
shared map. Your tray-and-collector reflex is the production fix, not a teaching toy.

When you do need shared state instead of message passing, the standard library's
[`sync`](https://pkg.go.dev/sync) package has the vocabulary you'll meet in chapter 12:
`sync.Mutex` (one pen, taken in turns), `sync.WaitGroup` (wait for N goroutines to finish — the
honest version of our `time.Sleep` hack). And the Go team's own proverb compresses this chapter
into one line — *"Don't communicate by sharing memory; share memory by communicating."* You now
know exactly which bug each half of that sentence is about.

---

## What you learned

- **`go f()` hires another reader**: the function runs concurrently, your code moves on instantly,
  and *nothing waits for it unless you arrange the waiting*.
- The sequential version wasn't wrong — it was **slow**, and the **benchmark proved it**: 100
  sequential 20ms waits ≈ 2.25s. Make it work, make it right, *then* make it fast.
- The naive `go` version returns an **empty map** (the launcher outruns its goroutines), and
  patching it with `time.Sleep` exposes the real monster: the **data race** — many goroutines
  writing **one notebook**. `fatal error: concurrent map writes` is Go catching it red-handed;
  `go test -race` catches it even when you're not lucky enough to crash.
- The fix is a design rule, not a trick: **exactly one writer**. Goroutines send `result` notes on
  a **channel** (the tray); one collector receives `len(urls)` times and writes the map alone.
- **Unbuffered channels synchronize** — every send meets its receive — which solves the waiting
  problem and the racing problem with the same stroke. Result: ~0.023s, about **100× faster**.
- `go func(u string){...}(url)` hands each goroutine an explicit snapshot of its URL; `result`'s
  unnamed fields (`r.string`, `r.bool`) name a pair whose halves need no names.

✅ **Done when:** `go test ./exercises/concurrency/` is GREEN (and clean under
`go test -race ./exercises/concurrency/`) and you can answer the recall questions.

**Next:** Chapter 10 — *Select*, where we wait on *several* channels at once and add a timeout, so a
slow operation can never hang your program forever.
