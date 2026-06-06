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

1. Explain what an **array** actually *is* — from the memory up — and what a **slice** really is, and
   know why you'll almost always reach for the slice.
2. Use `len`, `range`, and `append`.
3. Write a **variadic** function (`...[]int`) and slice off a head with `numbers[1:]`.
4. Understand the **"slices share their backing array"** gotcha — the #1 slice bug.
5. Compare slices correctly (spoiler: not with `==`).

---

## First, the why: one variable, many values

So far every variable you've written holds **one** value — one `int`, one `string`. But almost every
real program juggles *collections*: the lines of a file, the players on a server, the prices in a
cart. You could try a variable per value — `price1`, `price2`, `price3` — but that collapses the
moment you have a hundred prices, or you don't know *how many* you'll have until the program runs.

Every language needs a way to say "**many values, one name**". In Go, the ground-level answer is the
**array**, and the everyday answer built on top of it is the **slice**. The big idea to hold for this
whole chapter: an array is a **fixed row of boxes**; a slice is a flexible **window** onto such a row.
Let's build both pictures properly.

---

## So what exactly *is* an array?

Picture your computer's memory as one enormous street of numbered storage units. An **array** is a row
of **identical units side by side**: Go reserves one *contiguous* block of that street, splits it into
equal boxes, and every box holds one value of the same type.

```text
   var a [5]int — five int boxes, touching each other, in one block of memory:

   index:      0      1      2      3      4
             ┌──────┬──────┬──────┬──────┬──────┐
   a:        │  0   │  0   │  0   │  0   │  0   │   ← every box starts at the zero value
             └──────┴──────┴──────┴──────┴──────┘
```

You reach a box by its **index** — its position in the row, **counting from 0**. Why 0 and not 1?
Because an index is really "*how many boxes do I skip from the start?*" — and the first box skips
none. Since every box is the same size, Go can compute exactly where box `i` lives (start + `i` × box
size) without touching any other box. That's why reading `a[3]` costs the same in an array of five
elements as in an array of five million.

```go
var a [5]int          // declare: five ints, all 0 — Go never leaves memory un-initialized
a[0] = 10             // write the first box
a[4] = 50             // write the last box
fmt.Println(a[0])     // read it back → 10
fmt.Println(len(a))   // 5 — len asks: how many boxes?
fmt.Println(a)        // [10 0 0 0 50]
```

Ask for a box that doesn't exist — `a[5]` — and Go refuses: a compile error if it can see the mistake,
a **panic** (`index out of range`) at runtime if it can't. There is no box 5; the row has exactly five
boxes, indexes 0 through 4.

Three properties fall straight out of "one fixed block of memory", and together they *define* arrays:

1. **The size is part of the type.** `[3]int` and `[4]int` are *different types* — a function that
   takes a `[3]int` won't accept a `[4]int`. The compiler must know each block's exact size up front.
2. **You can't grow one.** The memory next door may belong to something else; there's no room to bolt
   on a sixth box. Need more? You'd have to allocate a whole new, bigger array and copy everything.
3. **It's a value — copied whole.** Assign it, or pass it to a function, and Go copies *every box*:

```go
b := a                // b is a full COPY of all five boxes
b[0] = 99             // a is untouched — a[0] is still 10; b[0] is 99
```

Rigid size, whole-thing copies: that's why you'll *almost never* use a bare array in day-to-day Go.
So why learn it? Because the thing you **will** use every day is built directly on top of it.

---

## Enter the slice — a window onto the boxes

Real programs rarely know their sizes up front — *how many lines does the file have?* What you want
day-to-day is a collection that can **grow**. That's the **slice**, written `[]int` — no number
between the brackets, which is exactly the tell that it's not an array.

Here's the trick: **a slice holds no data at all.** It's a tiny descriptor — three fields — that
*points into* an array somewhere else (called its **backing array**):

```text
   slice  ─▶ ┌──────────┬─────┬─────┐
             │ pointer  │ len │ cap │
             └────┬─────┴─────┴─────┘
                  ▼
   backing array: [ 10 , 20 , 30 , _ , _ ]   ← the slice "sees" the first len elements
```

- **pointer** — *where in memory does my window start?*
- **len** — *how many elements can I currently see?* (`len(s)`; indexing past it panics)
- **cap** — *how much room does the backing array have* before a bigger one is needed?

So when you write:

```go
s := []int{10, 20, 30}     // a slice literal
```

Go quietly allocates a hidden 3-box array for you **and** hands you the window onto it. You then use
it exactly like an array — `s[0]`, `s[1] = 7`, `len(s)` — but you're always working *through* the
window.

A slice doesn't *own* its data — it *points at* it. Two consequences follow, and they explain half
this chapter:

1. Passing a slice around is **cheap** — Go copies the little 3-field header, never the data.
2. Two slices can point at the **same** backing array — the gotcha we'll meet below.

One more fact you'll lean on constantly: **the zero value of a slice is `nil`** — a window onto
nothing. And that's fine! A `nil` slice has `len == 0`, you can `range` over it (zero passes), and you
can `append` to it. You rarely need to special-case "empty".

---

## Growing a slice: what `append` actually does

`append` is how a slice grows — and seeing what it *really* does protects you from Go's most common
beginner bug.

```go
s := []int{10, 20, 30}     // len 3, cap 3 — the backing array is FULL
s = append(s, 40)          // no room! so append:
                           //   1. allocates a new, bigger backing array
                           //   2. copies 10, 20, 30 across
                           //   3. writes 40 — and returns a window onto the NEW array
fmt.Println(s)             // [10 20 30 40]
```

The old window still points at the old, small array — only the **returned** slice sees the new one.
That's why you must **always reassign**: `append(s, x)` alone builds the grown slice and throws the
new window away; `s = append(s, x)` keeps it. (When there *is* spare capacity, `append` simply writes
into the existing array — no copy. You don't need to track which case you're in, as long as you always
reassign.)

Know the size in advance? Pre-book the room once and skip the grow-and-copy cycles:

```go
t := make([]int, 0, 8)     // len 0 (sees nothing yet), cap 8 (room for 8 before growing)
```

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

---

## The one gotcha: slices share their backing array

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
3. What does `append` do when the backing array is full — and why must you write `s = append(s, x)`
   instead of just `append(s, x)`?
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

- An **array** (`[N]T`) is one **contiguous block** of equal boxes; the index counts from 0 because
  it means "boxes to skip", and an out-of-range index panics.
- An array has a fixed, type-level size and is **copied** by value.
- A **slice** (`[]T`) is a **window** onto a backing array: pointer + len + cap. Cheap to pass; it
  **shares**, it doesn't copy.
- When the backing array is full, `append` allocates a bigger one, copies, and returns a window onto
  the **new** array — so **always reassign** the result. The zero value is `nil` and behaves like empty.
- A **variadic** parameter (`...[]int`) is just a slice of the arguments inside the function.
- Slice expressions (`s[1:]`) make a new window onto the **same** data — and panic past the end, so
  guard the empty case.
- Slicing **shares** the backing array — mutating one view can change another.
- You **can't `==` slices**; use `slices.Equal` (or `reflect.DeepEqual`).

✅ **Done when:** `go test ./exercises/arrays/` is GREEN (all three functions) and you can answer the
five recall questions.

**Next:** Chapter 4 — *Structs, methods & interfaces*, where we give our data a shape and our types
behaviour — the heart of how Go programs are organized.
