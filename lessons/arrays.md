# 3 · Arrays & slices 🟢

> *You will use **slices** constantly in Go and **arrays** almost never — yet they're easy to confuse,
> and the confusion causes real bugs. This chapter makes the difference click: an array is a fixed,
> self-contained box; a slice is a flexible **window** onto a box somewhere else. Get that mental
> picture and slices stop being scary.*

**What you'll build:** a three-step ladder — `Sum` (add up a slice), `SumAll` (sum *several* slices
with a variadic function and `append`), and `SumAllTails` (sum each slice's tail, and face the
empty-slice question head-on) — and around them, the model of how Go's collections actually work.

**Files for this chapter:** `exercises/arrays/arrays.go` (you fix this) · `exercises/arrays/arrays_test.go` (written for you).

---

## Where we're going

By the end you'll be able to:

1. Tell an **array** from a **slice**, and know why you'll almost always reach for the slice.
2. Use `len`, `range`, and `append`.
3. Write a **variadic** function (`...[]int`) and slice off a head with `numbers[1:]`.
4. Understand the **"slices share their backing array"** gotcha — the #1 slice bug.
5. Compare slices correctly (spoiler: not with `==`).

---

## The big idea: a box vs. a window onto a box

**An array has a fixed size that's part of its type.** `[3]int` and `[4]int` are *different types*. An
array is a **value**: assign it or pass it to a function and Go **copies the whole thing**.

```go
var a [3]int        // [0 0 0] — fixed at 3, zero-valued
a[0] = 10           // [10 0 0]
b := a              // b is a COPY
b[0] = 99           // a is still [10 0 0]; b is [99 0 0]
```

Because the size is baked into the type, arrays are rigid — you can't grow one. That's why you rarely
use them directly.

**A slice is a flexible window onto an array.** Written `[]int` (no number), a slice is really three
things under the hood: a **pointer** to some backing array, a **length**, and a **capacity**.

```text
   slice  ─▶ ┌──────────┬─────┬─────┐
             │ pointer  │ len │ cap │
             └────┬─────┴─────┴─────┘
                  ▼
   backing array: [ 10 , 20 , 30 , _ , _ ]   ← the slice "sees" the first len elements
```

That's the whole secret. A slice doesn't *own* its data — it *points at* it. This is what makes slices
cheap to pass around (you copy the little 3-field header, not the data) and it's the source of the one
gotcha we'll cover below.

---

## Making and growing slices

```go
s := []int{10, 20, 30}     // a slice literal
len(s)                     // 3
s = append(s, 40)          // [10 20 30 40] — append returns a NEW slice header

t := make([]int, 0, 8)     // len 0, cap 8 — preallocate when you know the size
```

Two things beginners trip on:

1. **Always reassign the result of `append`.** `append` may need a bigger backing array, so it returns a
   (possibly new) slice header. `append(s, x)` *alone* throws the result away — you must write
   `s = append(s, x)`.
2. **The zero value of a slice is `nil`** — and that's fine. A `nil` slice has `len == 0`, you can
   `range` over it (zero passes), and you can `append` to it. You rarely need to special-case "empty".

---

## Walking a slice with `range`

You met `range` in Chapter 2. For a slice it hands you the **index** and a **copy of the value**:

```go
total := 0
for _, n := range s {   // _ ignores the index
	total += n
}
```

That's *exactly* the loop you're about to write for `Sum`.

---

## Variadic functions and slicing off a head

Two more tools and you have everything this chapter's reps need.

**Variadic parameters.** `func SumAll(numbersToSum ...[]int) []int` — the `...` means "any number of
arguments". Inside the function, `numbersToSum` is just a slice of them (here a `[][]int`), so you
`range` over it like any other slice:

```go
SumAll([]int{1, 2}, []int{0, 9})   // call it with as many slices as you like
SumAll()                            // ...including none
```

(You've already *used* one: `fmt.Println` is variadic. Now you get to write one.)

**Slice expressions.** `numbers[1:]` is a new window onto the same data, starting at index 1 — the
"tail". The general form is `s[low:high]` (half-open: includes `low`, excludes `high`), and either end
can be omitted:

```go
s := []int{1, 2, 3, 4}
s[1:]    // [2 3 4] — everything but the head
s[:2]    // [1 2]
```

⚠️ **Trap:** `numbers[1:]` on an *empty* slice panics — there's no index 1 to start from. Whenever you
take a tail, ask "what if it's empty?" first. Your `SumAllTails` rep makes you answer that question.

Because a slice is a window onto an array, two slices can look at the **same** data. Mutating through one
is visible through the other:

```go
original := []int{1, 2, 3, 4}
view := original[0:2]   // window onto the first two: [1 2]
view[0] = 99
// original is now [99 2 3 4]  ← we changed it through `view`!
```

You don't need to memorize the edge cases yet. Just hold the rule: **slicing doesn't copy — it shares.**
When that surprises you one day, you'll remember "ah, the window." (Need a real copy? Go's builtin
`copy(dst, src)`, or `slices.Clone(s)`.)

---

## Comparing slices: not with `==`

This one bites everyone: you **cannot** compare two slices with `==` (it doesn't compile, except against
`nil`). So in tests you use a helper:

```go
import "slices"
slices.Equal([]int{1, 2}, []int{1, 2}) // true   (Go 1.21+)
```

(Older code uses `reflect.DeepEqual`, which works but is slower and not type-safe.) Our `Sum` returns a
plain `int`, so we just use `!=` — but the moment a function returns a *slice*, reach for `slices.Equal`.

---

## Prove it with a test

`arrays_test.go` is table-driven again, and the case to notice is **the empty slice**:

```go
{name: "empty slice is zero", in: []int{}, want: 0},
```

`Sum([]int{})` must be `0`. With a `range`-and-add approach you get that **for free** — the loop just runs
zero times. That's the elegance: handle the general case well and the edge case often handles itself.

`TestSumAll` and `TestSumAllTails` return a **slice** — so `==` won't compile, and the tests reach for
exactly the helper you just met:

```go
if !slices.Equal(got, c.want) {
	t.Errorf("SumAll(%v) = %v; want %v", c.in, got, c.want)
}
```

Two cases earn their keep here. `SumAll()` with **no arguments** passes because `slices.Equal` treats a
`nil` slice and an empty one as equal — the "nil behaves like empty" rule, working for you. And
`SumAllTails` gets an **empty slice** on purpose: `numbers[1:]` would panic, so the test forces you to
decide the empty case *now*, not discover it in production.

---

## 🏋️ Your rep — make it GREEN

`arrays.go` stubs **three functions**, each returning the wrong thing on purpose. Climb the ladder in
order — each rung uses the previous one:

1. Watch all of it fail (RED): `go test ./exercises/arrays/ -v`
2. **`Sum`** — start a running total at `0`, `range` over `numbers`, add each one, return it.
   Run the tests: `TestSum` goes GREEN.
3. **`SumAll`** — it's variadic, so `numbersToSum` is a `[][]int`. Start with a `nil` slice of totals,
   `range` over the slices, and `append` each one's `Sum` (reuse the function you just wrote!).
   Remember: **reassign** the result of `append`. `TestSumAll` goes GREEN.
4. **`SumAllTails`** — same shape as `SumAll`, but sum `numbers[1:]` instead. First ask: what if the
   slice is empty? (The test demands `0` — and `numbers[1:]` on an empty slice panics, so guard it
   with `len`.) Run once more → **everything GREEN**.

### Stretch goals (ask your tutor to scaffold any)

- `Tail(s []int) []int` — return the tail as a **copy** (use `slices.Clone`), then prove with a test
  that mutating the returned tail does **not** change the original. (Try it *without* `Clone` first and
  watch the test catch the shared-backing-array bug — the gotcha from this chapter, made real.)
- Rewrite `SumAllTails` so the empty-slice case has **no** `if` — hint: `s[1:]` only panics when
  `len(s) == 0`, but `s[min(1, len(s)):]` never does. Is the cleverness worth the readability? Decide.

---

## 🧠 Active recall — no peeking

1. What's the difference between `[3]int` and `[]int`? Which one gets *copied* when you pass it to a function?
2. What three things is a slice made of under the hood?
3. Why must you write `s = append(s, x)` instead of just `append(s, x)`?
4. Why can't you write `sliceA == sliceB`, and what do you use instead?
5. What does `...[]int` in a function signature mean, and what *is* the parameter inside the function?
   And why does `numbers[1:]` panic on an empty slice?

---

## 🔍 Real code in the wild

Open the standard library's [`slices`](https://pkg.go.dev/slices) package. It's a whole toolbox built on
the model you just learned — `slices.Contains`, `slices.Index`, `slices.Sort`, `slices.Equal`,
`slices.Clone`. Every one of them takes a `[]T` and walks it with a `for ... range`, exactly like your
`Sum`. You now read those signatures fluently.

---

## What you learned

- An **array** (`[N]T`) has a fixed, type-level size and is **copied** by value.
- A **slice** (`[]T`) is a **window** onto a backing array: pointer + len + cap. Cheap to pass; it
  **shares**, it doesn't copy.
- Grow with `append`, and **always reassign** the result. The zero value is `nil` and behaves like empty.
- A **variadic** parameter (`...[]int`) is just a slice of the arguments inside the function.
- Slice expressions (`s[1:]`) make a new window onto the **same** data — and panic past the end, so
  guard the empty case.
- Slicing **shares** the backing array — mutating one view can change another.
- You **can't `==` slices**; use `slices.Equal` (or `reflect.DeepEqual`).

✅ **Done when:** `go test ./exercises/arrays/` is GREEN (all three functions) and you can answer the
five recall questions.

**Next:** Chapter 4 — *Structs, methods & interfaces*, where we give our data a shape and our types
behaviour — the heart of how Go programs are organized.
