# 2 · Iteration 🟢

> *Most languages give you a drawer full of loops: `for`, `while`, `do-while`, `foreach`. Go gives you
> one. Just `for`. That sounds like a limitation — it's actually one of the clearest examples of Go's
> whole personality: **fewer things, used well.** By the end of this chapter that one keyword will feel
> like plenty.*

**What you'll build:** `Repeat` — a function that writes a string out N times — and on the way you'll meet
all four shapes of `for`, plus your very first **benchmark**.

**Files for this chapter:** `exercises/iteration/iteration.go` (you fix this) · `exercises/iteration/iteration_test.go` (written for you).

---

## Where we're going

By the end you'll be able to:

1. Write a `for` loop in all four of its forms — and know which to reach for.
2. Use `break` and `continue`.
3. Understand the Go 1.22+ loop variable (and the classic bug it quietly killed).
4. Write and run a **benchmark** to measure how fast your code is.

---

## The big idea: one loop to rule them all

In Go, **`for` is the only loop keyword.** There is no `while`, no `do`, no `foreach`. This isn't Go being
stingy — it's Go noticing that every loop is really the same idea ("keep doing this until you're done") and
refusing to give you four spellings of one concept. The payoff: you read *any* Go loop and instantly know
it's a `for`. Less to learn, less to misread.

The trick is that `for` flexes into four shapes depending on how much of it you write. Hold this
picture for the chapter — it's the mental model: **one tool, four grips.** Same handle every time;
you just hold it differently depending on the job.

---

## The four shapes of `for`

**1. The full form** — init, condition, post. The classic counting loop:

```go
for i := 0; i < 3; i++ {
	fmt.Println(i) // 0, 1, 2
}
```

Read it left to right: *start* `i := 0`, *keep going while* `i < 3`, *after each pass* `i++`.

**2. Condition only** — this is Go's "while". Drop the init and post, keep the middle:

```go
n := 3
for n > 0 {
	fmt.Println(n) // 3, 2, 1
	n--
}
```

Same keyword, fewer parts. There's nothing to learn here beyond "leave bits out."

**3. Infinite** — drop everything. You exit with `break`:

```go
for {
	// runs forever until something breaks out
	break
}
```

**4. `range`** — walk over a collection (a string, slice, map, channel…):

```go
for i, ch := range "Go" {
	fmt.Println(i, string(ch)) // 0 G, 1 o
}
```

`range` hands you the **index** and the **value** each pass. Don't need the index? Use `_` to throw it
away: `for _, ch := range "Go"`. We'll lean on `range` heavily once we hit slices and maps.

> **`break` and `continue`:** `break` leaves the loop entirely; `continue` skips to the next pass. Both
> work in all four shapes.

**Checkpoint:** one tool, four grips — full (`init; cond; post`), condition-only (Go's "while"),
infinite (`for {}` + `break`), and `range` (index + value over a collection). If you can read one,
you can read them all: it's always `for`.

---

## One trap Go already fixed for you

You may read older Go articles warning about the "loop variable capture" bug — where every goroutine or
closure in a loop accidentally shared *one* `i` and they all saw the final value. As of **Go 1.22**, the
loop variable is **fresh each iteration**, so that whole class of bug is gone. You're on a modern Go, so
you simply don't have to think about it. (Mentioned only so the old scary blog posts don't confuse you.)

---

## Worked example: building a string in a loop

Here's the shape of what you're about to write:

```go
func twice(s string) string {
	result := ""
	for i := 0; i < 2; i++ {
		result += s // append a copy each pass
	}
	return result
}
// twice("ho") == "hoho"
```

Each pass glues one more copy onto `result`. Loop `count` times instead of twice and you've got `Repeat`.

> Note on `+=` with strings: it's perfectly fine here. (Later, for *big* loops, you'll meet
> `strings.Builder`, which is faster — and we'll *measure* the difference with a benchmark. Foreshadowing!)

---

## Prove it with a test

Open `iteration_test.go` — same table-driven shape from Chapter 1, now with three cases:

```go
cases := []struct {
	name  string
	in    string
	count int
	want  string
}{
	{name: "a few times", in: "a", count: 3, want: "aaa"},
	{name: "zero times is empty", in: "x", count: 0, want: ""},
	{name: "multi-character", in: "ab", count: 2, want: "abab"},
}
```

Notice the **"zero times"** case. That's a deliberately-chosen *edge case*: a good table doesn't just test
the happy path, it pins down the boundaries. What *should* `Repeat("x", 0)` be? Empty string. Writing that
expectation down means your loop can never silently get it wrong.

### New this chapter: the benchmark

At the bottom of the test file there's a third kind of function — a **benchmark**:

```go
func BenchmarkRepeat(b *testing.B) {
	for i := 0; i < b.N; i++ {
		Repeat("a", 100)
	}
}
```

A benchmark measures *speed*. Go runs your code `b.N` times (it picks `N` automatically, cranking it up
until the timing is stable) and reports **nanoseconds per operation**. You don't run benchmarks with a
plain `go test` — you opt in:

```text
go test -bench=. -tags solution ./exercises/iteration/
```

> 🪟 **On Windows PowerShell**, quote the flag — `go test "-bench=." -tags solution ./exercises/iteration/` —
> otherwise PowerShell splits the trailing dot off and the benchmark silently won't run.

(We pass `-tags solution` here only so there's a *working* `Repeat` to measure while the stub is still
red.) You'll see a line like `BenchmarkRepeat-8   ... 4514 ns/op`. That number is a **fact you can
improve** — and here's a taste of what that feels like, because this chapter's worked example has a
real inefficiency hiding in it.

Strings in Go are **immutable** — they can't be changed, only replaced. So every `result += s` builds
a brand-new, slightly longer string and copies everything across. Loop a hundred times and you copy
the growing string a hundred times. The standard library's answer is `strings.Builder`, which appends
into one growing buffer and makes the string once at the end:

```go
var b strings.Builder
for i := 0; i < count; i++ {
	b.WriteString(s)
}
return b.String()
```

Is it actually faster, or is that just a blog post's opinion? **Measure it.** Both versions,
repeating a string 100 times, benchmarked with `-benchmem` (which adds memory columns):

```text
BenchmarkRepeatConcat-8     297572    4514 ns/op    5664 B/op    99 allocs/op
BenchmarkRepeatBuilder-8   4060437     313 ns/op     248 B/op     5 allocs/op
```

Read the columns: the `+=` version takes ~4,500 nanoseconds and performs **99 separate memory
allocations** per call — one per copy, exactly as the immutability story predicts. The `Builder`
version: ~14× faster, 5 allocations. No opinions, no faith — a measurement. That's what benchmarks
are *for*: turning "I heard X is faster" into a number you watched appear.

(For your rep, plain `+=` is the right call — clearest code first, optimize when a measurement says
so. The stretch goal lets you reproduce this experiment yourself.)

**Checkpoint:** a benchmark (`func BenchmarkX(b *testing.B)`, run with `go test -bench=.`) measures
ns/op; add `-benchmem` for allocations. Strings are immutable, so `+=` in a loop copies — and the
benchmark is how you *know* `strings.Builder` beats it (~14×) instead of believing it.

---

## 🏋️ Your rep — make it GREEN

`iteration.go` returns the wrong thing on purpose:

```go
func Repeat(s string, count int) string {
	return "" // TODO(you): loop count times, adding s each pass
}
```

1. Run it and watch it fail (RED):
   ```text
   go test ./exercises/iteration/ -v
   ```
   ```text
   --- FAIL: TestRepeat/a_few_times
       iteration_test.go:25: Repeat("a", 3) = ""; want "aaa"
   ```
   Same anatomy as chapter 1's failure: the call, what you got, what was wanted.
2. Replace the body with a `for` loop that builds up the answer — full grip:
   start `i := 0`, while `i < count`, `i++`, and glue on one copy of `s` each pass.
3. Run again → **GREEN**. Then, for fun, measure it:
   ```text
   go test -bench=. ./exercises/iteration/
   ```

Type it yourself. You're not looking for the "right answer" — you're growing the reflex.

### Stretch goals (ask your tutor to scaffold any)

- Reproduce this chapter's measurement: write a `strings.Builder` version of `Repeat` alongside your
  `+=` one, benchmark both with `go test -bench=. -benchmem`, and see the ns/op and allocs/op gap
  with your own numbers.
- Write `Reverse(s string) string` using `range` (careful: ranging a string gives you *runes*).
- Use `continue` to write `SumEvens(nums []int) int` that skips odd numbers.

---

## 🧠 Active recall — no peeking

1. How many loop keywords does Go have, and what are the four grips?
2. How do you write a "while" loop in Go?
3. In `for i, v := range xs`, what are `i` and `v`? How do you ignore the index?
4. What's the difference between `break` and `continue`?
5. What does a benchmark measure, and how do you actually run one (it doesn't run with plain `go test`)?
6. Why is `+=` on a string in a long loop slow — and what did the benchmark numbers show
   `strings.Builder` doing about it?

---

## 🔍 Real code in the wild

You just hand-wrote `Repeat`. Go's standard library ships the same idea as
[`strings.Repeat`](https://pkg.go.dev/strings#Repeat) — open its docs and you'll see the exact signature
you just built, `func Repeat(s string, count int) string`. Real Go is *full* of small focused functions
like this, almost all powered by a humble `for`. The loop you just learned is the engine under most of the
standard library.

---

## What you learned

- Go has **one loop keyword, `for`**, in four shapes: full, condition-only ("while"), infinite, and `range`.
- `range` gives you **index + value**; `_` discards what you don't need.
- `break` exits, `continue` skips a pass.
- The Go 1.22+ **per-iteration loop variable** killed the classic capture bug — one less thing to fear.
- A **benchmark** (`func BenchmarkX(b *testing.B)`, run with `go test -bench=.`) measures speed in
  ns/op; `-benchmem` adds allocations.
- Strings are **immutable**, so looped `+=` copies the whole string every pass — and a benchmark
  *proved* `strings.Builder` ~14× faster instead of asking you to believe it.

✅ **Done when:** `go test ./exercises/iteration/` is GREEN and you can answer the recall questions.

**Next:** Chapter 3 — *Arrays & slices*, where `range` earns its keep and we meet Go's most-used
collection.
