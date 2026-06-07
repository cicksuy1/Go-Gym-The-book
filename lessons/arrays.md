# 3 · Arrays & slices 🟢

> *You will use **slices** constantly in Go and **arrays** almost never — yet they're easy to confuse,
> and the confusion causes real bugs. This chapter earns the difference instead of stating it: we'll
> write a function so rigid it refuses to compile for perfectly good input, fix it by discovering the
> slice, and then watch an innocent-looking expression crash a running program. By the end, one mental
> picture — the **window** — will explain every behavior and every trap in the chapter.*

**What you'll build:** a three-step ladder — `Sum` (add up a slice), `SumAll` (sum *several* slices
with a variadic function and `append`), and `SumAllTails` (sum each slice's tail, and face the
empty-slice question head-on) — and around them, the model of how Go's collections actually work.

**Files for this chapter:** `exercises/arrays/arrays.go` (you fix this) · `exercises/arrays/arrays_test.go` (written for you).

---

## Where we're going

By the end you'll be able to:

1. Explain what an **array** actually *is* — from the memory up — and why its rigidity makes the
   compiler reject a `[4]int` where a `[5]int` is expected.
2. Explain what a **slice** really is (pointer + len + cap), and why you'll reach for it daily.
3. Use `len`, `range`, and `append` — and say what `append` *really* does when the room runs out.
4. Write a **variadic** function (`...[]int`), slice off a head with `numbers[1:]`, and guard the
   empty-slice panic.
5. Spot the **shared backing array** gotcha — the #1 slice bug — and compare slices correctly
   (spoiler: not with `==`).

One picture carries the whole chapter: **the window**. An array is a fixed row of boxes; a slice is
a window onto a row of boxes — it *sees* the data, it doesn't *own* it.

---

## The big idea: rows of boxes, and the window onto them

So far every variable you've written holds **one** value — one `int`, one `string`. But almost every
real program juggles *collections*: the lines of a file, the players on a server, the prices in a
cart. You could try a variable per value — `price1`, `price2`, `price3` — but that collapses the
moment you have a hundred prices, or you don't know *how many* until the program runs.

Every language needs a way to say "**many values, one name**". In Go, the ground-level answer is the
**array**, and the everyday answer built on top of it is the **slice**. Build the array picture
first — the slice makes no sense without it.

### The array: a fixed row of boxes

Picture your computer's memory as one enormous street of numbered storage units. An **array** is a
row of **identical units side by side**: Go reserves one *contiguous* block of that street, splits
it into equal boxes, and every box holds one value of the same type.

```text
   var a [5]int — five int boxes, touching each other, in one block of memory:

   index:      0      1      2      3      4
             ┌──────┬──────┬──────┬──────┬──────┐
   a:        │  0   │  0   │  0   │  0   │  0   │   ← every box starts at the zero value
             └──────┴──────┴──────┴──────┴──────┘
```

You reach a box by its **index** — its position in the row, **counting from 0**. Why 0 and not 1?
Because an index is really "*how many boxes do I skip from the start?*" — and the first box skips
none. Since every box is the same size, Go can compute exactly where box `i` lives (start + `i` ×
box size) without touching any other box. That's why reading `a[3]` costs the same in an array of
five elements as in an array of five million.

```go
var a [5]int          // declare: five ints, all 0 — Go never leaves memory un-initialized
a[0] = 10             // write the first box
a[4] = 50             // write the last box
fmt.Println(a[0])     // read it back → 10
fmt.Println(len(a))   // 5 — len asks: how many boxes?
fmt.Println(a)        // [10 0 0 0 50]
```

Ask for a box that doesn't exist — `a[5]` — and Go refuses: a compile error if it can see the
mistake, a **panic** (`index out of range`) at runtime if it can't. There is no box 5.

### Where the array's rigidity bites

Now write something useful with one. `Sum` adds up five numbers:

```go
func Sum(numbers [5]int) int {
	sum := 0
	for _, n := range numbers {
		sum += n
	}
	return sum
}
```

(That loop is chapter 2's `range`, handing you the index and a copy of each value; `_` discards the
index we don't need.) It works. Test goes green. Then someone hands you *four* numbers:

```go
four := [4]int{1, 2, 3, 4}
Sum(four)
```

```text
cannot use four (variable of type [4]int) as [5]int value in argument to Sum
```

It doesn't even compile. **The size of an array is part of its type** — `[4]int` and `[5]int` are
as different to the compiler as `string` and `int`. That's not pedantry; it follows from the
memory picture: the compiler must know each block's exact size up front. Two more properties fall
out of the same picture:

- **You can't grow one.** The memory next door may belong to something else; there's no room to
  bolt on a sixth box. Need more? Allocate a whole new, bigger array and copy everything.
- **It's a value — copied whole.** Assign it or pass it to a function, and Go copies *every box*:
  `b := a; b[0] = 99` leaves `a[0]` untouched.

A collection that can't change size and won't even accept a different size as input — that's why
you'll *almost never* use a bare array in day-to-day Go. So why learn it? Because the thing you
**will** use every day is a window onto one.

### Enter the slice — the window

What you want day-to-day is a collection that takes **any size** and can **grow**. That's the
**slice**, written `[]int` — no number between the brackets, which is exactly the tell. Change one
line of `Sum`:

```go
func Sum(numbers []int) int {   // []int — a slice. Same body. Every size welcome.
```

and the four-number call compiles, the five-number call compiles, and so does the five-million.

Here's the trick that makes it work: **a slice holds no data at all.** It's a tiny descriptor —
three fields — that *points into* an array somewhere else (called its **backing array**):

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

**Hold onto that picture — it's the chapter's mental model. A slice is a window onto a row of
boxes: it *sees* the data, it doesn't *own* it.** Every convenience and every trap below is that
one sentence playing out.

When you write `s := []int{10, 20, 30}`, Go quietly allocates a hidden 3-box array for you **and**
hands you the window onto it. You then use it exactly like an array — `s[0]`, `s[1] = 7`, `len(s)`
— but you're always working *through* the window. Two consequences follow immediately:

1. Passing a slice around is **cheap** — Go copies the little 3-field header, never the data.
2. Two windows can look at the **same** backing array — the gotcha we'll meet below.

And one fact you'll lean on constantly: **the zero value of a slice is `nil`** — a window onto
nothing. That's fine! A `nil` slice has `len == 0`, you can `range` over it (zero passes), and you
can `append` to it. You rarely need to special-case "empty".

**Checkpoint:** an array is one contiguous row of boxes whose size is baked into its type — rigid,
copied whole. A slice is a **window** onto such a row: pointer + len + cap, cheap to pass, any
size. The window sees; it doesn't own.

---

## The details (with the traps called out)

### `append`: how the window moves house

`append` is how a slice grows — and seeing what it *really* does protects you from Go's most
common beginner bug:

```go
s := []int{10, 20, 30}     // len 3, cap 3 — the backing array is FULL
s = append(s, 40)          // no room! so append:
                           //   1. allocates a new, bigger backing array
                           //   2. copies 10, 20, 30 across
                           //   3. writes 40 — and returns a window onto the NEW array
fmt.Println(s)             // [10 20 30 40]
```

The old window still points at the old, small array — only the **returned** slice sees the new
one. That's why you must **always reassign**: `append(s, x)` alone builds the grown slice and
throws the new window away; `s = append(s, x)` keeps it. (When there *is* spare capacity, `append`
simply writes into the existing array — no copy. You don't need to track which case you're in, as
long as you always reassign.)

Know the size in advance? Pre-book the room once and skip the grow-and-copy cycles:

```go
t := make([]int, 0, 8)     // len 0 (sees nothing yet), cap 8 (room for 8 before growing)
```

### Variadic functions, and windows onto windows

Two more tools and you have everything this chapter's reps need.

**Variadic parameters.** `func SumAll(numbersToSum ...[]int) []int` — the `...` means "any number
of arguments". Inside the function, `numbersToSum` is just a slice of them (here a `[][]int`), so
you `range` over it like any other slice:

```go
SumAll([]int{1, 2}, []int{0, 9})   // call it with as many slices as you like
SumAll()                            // ...including none
```

(You've already *used* one: `fmt.Println` is variadic. Now you get to write one.)

**Slice expressions.** `numbers[1:]` is a **new window onto the same data**, starting at index 1 —
the "tail". The general form is `s[low:high]` (half-open: includes `low`, excludes `high`), and
either end can be omitted:

```go
s := []int{1, 2, 3, 4}
s[1:]    // [2 3 4] — everything but the head
s[:2]    // [1 2]
```

### Trap: the shared backing array

Read "a new window onto the **same** data" again, because it's the #1 slice bug in real code. Two
windows, one row of boxes — mutate through either and both see it:

```go
original := []int{1, 2, 3, 4}
view := original[0:2]   // window onto the first two: [1 2]
view[0] = 99
fmt.Println(original)   // [99 2 3 4]  ← we changed it through `view`!
```

Nothing here is broken — it's the model working exactly as drawn: the window sees, it doesn't own,
so neither window owns, and both see. Hold the rule: **slicing doesn't copy — it shares.** When
this surprises you one day (it will), you'll remember "ah, the window." Need a real copy? Go's
builtin `copy(dst, src)`, or `slices.Clone(s)`.

### Trap: the tail of nothing

What happens when you take the tail of an *empty* slice? Don't reason about it — run it:

```go
empty := []int{}
fmt.Println(empty[1:])
```

```text
panic: runtime error: slice bounds out of range [1:0]
```

A **panic** — the program dies at run time. There's no index 1 to start a window from when the
data has zero boxes. And notice something important about *when* you found out: the `[4]int`
mistake earlier was caught by the **compiler**, before the program ever ran; this one **compiled
happily** and exploded on a user. Compile-time errors are your friends — they fail in your editor.
Runtime errors fail in production. Whenever you take a tail, ask "what if it's empty?" *first* —
your `SumAllTails` rep forces you to answer with a `len` guard, and its test makes the question
impossible to skip.

### Trap: comparing slices

This one bites everyone. Your tests will want to ask "is the result `[3, 9]`?" — so you reach for
`==`:

```go
got := []int{3, 9}
want := []int{3, 9}
fmt.Println(got != want)
```

```text
invalid operation: got != want (slice can only be compared to nil)
```

It doesn't compile — and the model says why: a slice is a *window*. Should `==` mean "same
window" (same pointer) or "same contents"? The two answers disagree, so Go refuses to guess; the
only comparison allowed is against `nil`. When you mean "same contents," say so:

```go
import "slices"
slices.Equal([]int{1, 2}, []int{1, 2}) // true   (Go 1.21+)
```

Older code uses `reflect.DeepEqual`, which works but gives up type safety —
`reflect.DeepEqual(got, "dave")` **compiles** and just returns false, so a typo becomes a silently
failing test instead of a compile error. Prefer `slices.Equal`; it won't let you compare a slice
to a string by accident.

**Checkpoint:** `append` may move the window to a bigger house — always reassign. A slice
expression is a second window on the *same* boxes (mutations show through; the empty tail
panics at runtime, so guard with `len`). And windows can't be `==`-compared — `slices.Equal`
asks the question you actually mean.

---

## Worked, runnable code

The whole model in one small program — growth, a second window, and the share, all visible:

```go
package main

import "fmt"

func main() {
	scores := []int{10, 20, 30}            // window onto a hidden 3-box array (len 3, cap 3)
	scores = append(scores, 40)            // full! append moves house — and we reassign
	fmt.Println(scores, len(scores))

	top := scores[:2]                      // second window onto the SAME boxes
	top[0] = 99                            // write through the second window…
	fmt.Println(scores)                    // …and the first window sees it

	var empty []int                        // nil — a window onto nothing
	fmt.Println(len(empty), empty == nil)  // 0 true — and still safe to range/append
}
```

Output:

```text
[10 20 30 40] 4
[99 20 30 40]
0 true
```

Trace each line against the picture: the append moved the window to a new backing array; `top`
and `scores` share boxes, so the `99` shows through both; and the `nil` window is a fine,
zero-length citizen.

---

## Prove it with a test

`arrays_test.go` is table-driven again, and the case to notice is **the empty slice**:

```go
{name: "empty slice is zero", in: []int{}, want: 0},
```

`Sum([]int{})` must be `0`. With a `range`-and-add approach you get that **for free** — the loop
just runs zero times. That's the elegance: handle the general case well and the edge case often
handles itself.

`TestSumAll` and `TestSumAllTails` return a **slice** — so `==` won't compile (you watched it
refuse), and the tests reach for exactly the helper you just met:

```go
if !slices.Equal(got, c.want) {
	t.Errorf("SumAll(%v) = %v; want %v", c.in, got, c.want)
}
```

Two cases earn their keep here. `SumAll()` with **no arguments** passes because `slices.Equal`
treats a `nil` slice and an empty one as equal — the "nil behaves like empty" rule, working for
you. And `SumAllTails` gets an **empty slice** on purpose: `numbers[1:]` would panic with the
exact `slice bounds out of range` you saw above, so the test forces you to decide the empty case
*now*, not discover it in production.

One more tool while we're here: Go can tell you how much of your code your tests actually
exercise. From the `go-gym` folder:

```text
go test -cover ./exercises/arrays/
```

A coverage percentage isn't a goal in itself — every test has a cost, and confidence is the real
prize — but when it's low it points straight at the paths nothing checks. The empty-slice case is
exactly the kind of branch coverage catches you skipping.

---

## 🏋️ Your rep — make it GREEN

`arrays.go` stubs **three functions**, each returning the wrong thing on purpose. Climb the ladder
in order — each rung uses the previous one:

```go
func Sum(numbers []int) int {
	return 0 // TODO(you): range over numbers and add them up
}

func SumAll(numbersToSum ...[]int) []int {
	return nil // TODO(you): build the totals with append — one Sum per slice
}

func SumAllTails(numbersToSum ...[]int) []int {
	return nil // TODO(you): slice off the head with numbers[1:], guard the empty case
}
```

Your job, in plain language:

1. Watch it all fail (RED): `go test ./exercises/arrays/ -v` (run from the `go-gym` folder).
2. **`Sum`** — start a running total at `0`, `range` over `numbers`, add each one, return it.
   `TestSum` goes GREEN.
3. **`SumAll`** — it's variadic, so `numbersToSum` is a `[][]int`. Start with a `nil` slice of
   totals, `range` over the slices, and `append` each one's `Sum` (reuse the function you just
   wrote!). Remember: **reassign** the result of `append`. `TestSumAll` goes GREEN.
4. **`SumAllTails`** — same shape as `SumAll`, but sum `numbers[1:]` instead. First ask: what if
   the slice is empty? (The test demands `0` — and you've seen the panic — so guard with `len`.)
   Run once more → **everything GREEN**.

### Stretch goals (ask your tutor to scaffold any)

- `Tail(s []int) []int` — return the tail as a **copy** (use `slices.Clone`), then prove with a
  test that mutating the returned tail does **not** change the original. (Try it *without* `Clone`
  first and watch the test catch the shared-backing-array bug — the gotcha from this chapter, made
  real.)
- Rewrite `SumAllTails` so the empty-slice case has **no** `if` — hint: `s[1:]` only panics when
  `len(s) == 0`, but `s[min(1, len(s)):]` never does. Is the cleverness worth the readability?
  Decide.
- Run `go test -cover ./exercises/arrays/`, then comment out the empty-slice guard in your
  `SumAllTails` and watch which test catches you — and what the coverage number does.

---

## 🧠 Active recall — answer out loud, no peeking

1. What's the difference between `[3]int` and `[]int`? Which one gets *copied whole* when you pass
   it to a function?
2. `Sum` took a `[5]int` and someone passed a `[4]int`. What happened, and what fact about array
   types explains it?
3. What three things is a slice made of under the hood — and what does "the window sees, it
   doesn't own" mean for passing slices around?
4. What does `append` do when the backing array is full — and why must you write
   `s = append(s, x)` instead of just `append(s, x)`?
5. `view := original[0:2]; view[0] = 99` — what does `original` look like now, and why?
6. `empty[1:]` compiled fine and then crashed the program. Quote (roughly) the panic, and explain
   why this failure is worse than the `[4]int` one.
7. Why won't `sliceA == sliceB` compile, what do you use instead, and what does `slices.Equal` do
   better than `reflect.DeepEqual`?

If any answer is fuzzy, scroll back up — that's the recall doing its job.

---

## 🔍 Real code in the wild

Open the standard library's [`slices`](https://pkg.go.dev/slices) package. It's a whole toolbox
built on the model you just learned — `slices.Contains`, `slices.Index`, `slices.Sort`,
`slices.Equal`, `slices.Clone`. Every one of them takes a `[]T` and walks it with a
`for ... range`, exactly like your `Sum`. And notice which two made this chapter personally:
`Equal` exists because `==` won't compile, and `Clone` exists because slicing shares. The standard
library is, in part, a catalog of answers to the traps you just met. You now read those signatures
fluently.

---

## What you learned

- An **array** (`[N]T`) is one **contiguous block** of equal boxes; the index counts from 0
  because it means "boxes to skip", and an out-of-range index panics.
- The array's size is **part of its type** — you watched `[4]int` refuse to fit a `[5]int`
  parameter — and it's **copied whole** by value.
- A **slice** (`[]T`) is a **window** onto a backing array: pointer + len + cap. Cheap to pass; it
  **sees**, it doesn't **own**. The zero value is `nil` and behaves like empty.
- When the backing array is full, `append` allocates a bigger one, copies, and returns a window
  onto the **new** array — so **always reassign** the result.
- A **variadic** parameter (`...[]int`) is just a slice of the arguments inside the function.
- Slice expressions (`s[1:]`) make a new window onto the **same** data — mutations show through
  both windows, and the empty tail **panics at runtime** (`slice bounds out of range`), so guard
  with `len`. Compile-time failures beat runtime failures every day.
- You **can't `==` slices**; `slices.Equal` compares contents — and unlike `reflect.DeepEqual`, it
  keeps the compiler on your side.

✅ **Done when:** `go test ./exercises/arrays/` is GREEN (all three functions) and you can answer
the recall questions.

**Next:** Chapter 4 — *Structs, methods & interfaces*, where we give our data a shape and our types
behaviour — the heart of how Go programs are organized.
