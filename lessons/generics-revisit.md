# 19 · Revisiting arrays & slices with generics 🟡

> *Back in the arrays chapter you wrote `Sum` — a loop that folded a slice of numbers into one total. Then
> you'd write another loop to multiply them, another to join strings, another to count matches… the same
> shape, over and over. **Generics let you capture that shape once.** Meet `Reduce`: a single
> higher-order function that folds *any* collection into *any* result. Once you see it, you'll recognize it
> as the engine behind `Sum`, `Map`, `Filter`, and half the standard library.*

**What you'll build:** a generic `Reduce`, and a `Sum` that's just one line of it — proving the same fold
works across types and operations.

**Files for this chapter:** `exercises/generics-revisit/generics-revisit.go` (you fix this) · `exercises/generics-revisit/generics-revisit_test.go` (written for you).

---

## Where we're going

By the end of this chapter you'll be able to:

1. Recognize the **fold/reduce** pattern hiding inside every "loop and accumulate."
2. Write a function with **two** type parameters (`[A, B any]`) where input and output types differ.
3. Pass **functions as arguments** (higher-order functions) to make behaviour pluggable.
4. Re-implement `Sum` — and more — in terms of one reusable primitive.
5. See how this connects to the standard library's generic slice helpers.

---

## The big idea: every accumulate loop is the same loop

Look at three "different" tasks:

```go
// sum
total := 0
for _, n := range nums { total = total + n }

// product
product := 1
for _, n := range nums { product = product * n }

// join
joined := ""
for _, s := range words { joined = joined + s }
```

Squint and they're **identical** except for two things: the **starting value** and the **combining step**.
That repeated skeleton is the *fold* (also called *reduce*): start with an initial value, then walk the
collection combining each element into a running result.

```text
   Reduce:   result = initial
             for each item:  result = combine(result, item)
             return result

   Sum      = Reduce with initial 0  and combine = add
   Product  = Reduce with initial 1  and combine = multiply
   Join     = Reduce with initial "" and combine = concatenate
```

Capture that skeleton **once** as `Reduce`, and `Sum`/`Product`/`Join` become one-liners that just supply
the two parts that actually differ. That's the DRY principle realized at the level of *control flow*, which
only became possible in Go once generics arrived.

---

## Two type parameters: input vs. output

Here's the signature, and it's worth reading slowly:

```go
func Reduce[A, B any](collection []A, accumulator func(B, A) B, initialValue B) B
```

- **`A`** is the element type of the collection (`int`, `string`, …).
- **`B`** is the type of the **result** — which can be *different* from `A`.

Why two parameters instead of one? Because the result type isn't always the element type. Summing `[]int`
gives an `int` (A and B both `int`). But reducing `[]int` into a *new* `[]int` of doubled values means A is
`int` and B is `[]int` — different types. Two parameters make `Reduce` general enough for both. Most folds
use `A == B`, but the freedom matters.

The **`accumulator func(B, A) B`** is the pluggable part: "given the running result and the next element,
produce the new running result." This is a **higher-order function** — `Reduce` takes a *function* as an
argument. You met functions-as-values earlier; here they're what make one `Reduce` behave like a dozen
different loops.

---

## The implementation is tiny

The whole engine is the skeleton from the big-idea box, typed generically:

```go
func Reduce[A, B any](collection []A, accumulator func(B, A) B, initialValue B) B {
	result := initialValue
	for _, item := range collection {
		result = accumulator(result, item)
	}
	return result
}
```

And `Sum` becomes a one-liner that supplies "start at 0, combine by adding":

```go
func Sum(numbers []int) int {
	return Reduce(numbers, func(acc, x int) int {
		return acc + x
	}, 0)
}
```

> **Notice the empty-slice gift, again.** Just like the original `Sum`, an empty collection makes the loop
> run zero times, so `Reduce` returns `initialValue` untouched — `Sum([]int{})` is `0` for free. Handle the
> general case well and the edge case handles itself. (Type inference is also working here: you didn't have
> to write `Reduce[int, int]` — Go figured out `A` and `B` from the arguments.)

---

## Prove it with a test

`generics-revisit_test.go` keeps the original `Sum` table (it must still pass — refactoring shouldn't change
behaviour), then adds `TestReduce` showing the **same** function doing wildly different jobs:

```go
Reduce([]int{1,2,3,4}, multiply, 1)        // 24   — product
Reduce([]string{"a","b","c"}, concat, "")  // "abc" — join
Reduce([]int{1,2,3}, double, []int{})      // [2 4 6] — int slice → int slice
```

That third case is the payoff of two type parameters: input is `[]int`, output is `[]int` *built up from
scratch* — `A` and `B` differ, and `Reduce` handles it without blinking. The comparison uses
`slices.Equal`, because (remember the slices chapter) you can't compare slices with `==`.

---

## 🏋️ Your rep — make it GREEN

Right now both functions lie:

```go
func Reduce[A, B any](collection []A, accumulator func(B, A) B, initialValue B) B {
	return initialValue
}
func Sum(numbers []int) int { return 0 }
```

1. Watch it fail (RED): `go test ./exercises/generics-revisit/`
2. Implement both:
   1. **`Reduce`:** set `result` to `initialValue`; `range` over the collection; for each item,
      `result = accumulator(result, item)`; return `result`.
   2. **`Sum`:** `return Reduce(numbers, ...)` passing an accumulator that adds the element to the running
      total, with an initial value of `0`.
3. Run again → **GREEN**. The original `Sum` cases pass *and* the same `Reduce` multiplies, concatenates,
   and builds slices. One primitive, many uses.

### Stretch goals (ask your tutor to scaffold any)

- Write `Filter[A any](s []A, keep func(A) bool) []A` (you can build it *with* `Reduce`).
- Write `Map[A, B any](s []A, f func(A) B) []B` on top of `Reduce` — now you've rebuilt the functional trio.

---

## 🧠 Active recall — no peeking

1. What two things differ between a sum loop, a product loop, and a join loop — and what does `Reduce` do with them?
2. Why does `Reduce` need **two** type parameters `[A, B any]` instead of one?
3. What is a "higher-order function," and which argument of `Reduce` is one?
4. Why is `Sum([]int{})` correctly `0` without any special-casing?

---

## 🔍 Real code in the wild

Open the standard library's [`slices`](https://pkg.go.dev/slices) package and look at the higher-order
helpers: `slices.IndexFunc`, `slices.ContainsFunc`, `slices.SortFunc` — each takes a **function** and is
generic over the element type, exactly like your `Reduce`. The functional patterns you just built
(`Reduce`, and the `Map`/`Filter` stretch goals) are the same ideas Go's own toolbox is built from. You're
no longer *using* the standard library — you can see how you'd *write* it.

---

## What you learned

- Every "loop and accumulate" is the **fold/reduce** pattern: an initial value plus a combining step.
- `Reduce[A, B any]` captures that skeleton once; `Sum`, product, join become one-liners.
- **Two type parameters** let the result type (`B`) differ from the element type (`A`).
- A **higher-order function** takes a function as an argument — that's how `Reduce` stays pluggable.
- An empty collection returns `initialValue` for free — no special case needed.
- Compare slice results with **`slices.Equal`**, never `==`.

✅ **Done when:** `go test ./exercises/generics-revisit/` is GREEN and you can answer the four recall questions.

**Next:** Part 2 — *Testing Fundamentals*, where the course shifts from learning Go to mastering how Go
teams test, mock, and design for change.
