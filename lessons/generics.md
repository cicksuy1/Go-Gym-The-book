# 18 · Generics 🟡

> *For most of Go's life it had no generics, and writing a "stack of anything" meant one of two bad
> options: copy-paste a `StackOfInt`, a `StackOfString`, and so on — or use `interface{}` and litter your
> code with risky type casts. Go 1.18 fixed this with **type parameters**: write the data structure
> **once**, and let the compiler specialize it for `int`, `string`, or any type — with full type safety
> and zero casting. This chapter makes generics click by building the classic example: a stack.*

**What you'll build:** a generic `Stack[T]` with `Push`, `Pop`, and `IsEmpty` — and you'll watch the
*same* type serve both `int`s and `string`s.

**Files for this chapter:** `exercises/generics/generics.go` (you fix this) · `exercises/generics/generics_test.go` (written for you).

---

## Where we're going

By the end of this chapter you'll be able to:

1. Read and write a **type parameter**: `[T any]`.
2. Define a generic *type* (a struct) and methods on it.
3. Explain why generics beat both copy-paste and `interface{}`-with-casts.
4. Return a type parameter's **zero value** safely with `var zero T`.
5. Use the multi-return `(T, bool)` pattern to signal "empty" without panicking.

---

## The big idea: write it once, for every type

Before generics, "a stack of things" forced a bad trade:

- **Copy-paste:** write `IntStack`, then `StringStack`, then `FloatStack`… identical code, three places to
  fix every bug. That violates DRY badly.
- **`interface{}`:** store `[]interface{}` and cast on the way out. It compiles, but the compiler can no
  longer protect you — push a `string`, pop it as an `int`, and you get a **runtime panic** instead of a
  compile error. You've thrown away the whole "a type is a promise" guarantee.

**Generics** give you the best of both: one definition, full type safety. You write the stack with a
**placeholder type** called `T`, and the caller fills it in:

```go
type Stack[T any] struct {
	values []T
}
```

```text
   Stack[T any]          ← T is a "type parameter": a stand-in for a real type
        │
        ├── Stack[int]    → values is []int     (compiler-checked)
        └── Stack[string] → values is []string  (compiler-checked)
```

`[T any]` reads as "for any type `T`." `any` here is a **constraint** — it says "T can be literally any
type." (Constraints can be narrower, like "any type you can order with `<`" — more on that in a moment.)
Inside the type and its methods, `T` behaves like a real type you just don't know the name of yet.

---

## Generic methods and the zero-value trick

Methods on a generic type repeat the parameter in the receiver — `(s *Stack[T])` — and can then use `T`
freely:

```go
func (s *Stack[T]) Push(v T) {
	s.values = append(s.values, v)
}
```

`Pop` is where one subtlety shows up. We want to return the top value, but also signal whether the stack
was empty — so it returns `(T, bool)`, the same comma-ok shape you've seen on maps. When the stack *is*
empty, what do we return as the value? We can't write `return 0` (T might be a string) or `return ""` (T
might be an int). The answer is the **zero value of T**:

```go
func (s *Stack[T]) Pop() (T, bool) {
	if s.IsEmpty() {
		var zero T      // the zero value of WHATEVER T is: 0, "", nil, ...
		return zero, false
	}
	...
}
```

`var zero T` is the idiom: declare a variable of the parameter type and let Go give it the right zero (`0`
for `int`, `""` for `string`, `nil` for pointers). It's the generic way to say "return nothing meaningful."

> **Trap — `Pop` must shrink the slice.** Popping isn't just reading the last element; you also have to
> remove it: grab `s.values[len-1]`, then reslice with `s.values = s.values[:len-1]`. Forget the reslice
> and your stack never shrinks — `IsEmpty` stays false and you'd pop the same value forever.

---

## A word on constraints

`any` is the loosest constraint. Sometimes you need more: a `Max[T]` function needs to compare values with
`<`, which not every type supports. For that, Go's standard library provides the
[`cmp`](https://pkg.go.dev/cmp) package's `cmp.Ordered` constraint ("any type with `< <= >= >`"). You don't
need it for a stack — a stack never compares its elements, so `any` is exactly right — but it's worth
knowing constraints exist on a spectrum from "literally anything" to "only orderable types."

---

## Prove it with a test

`generics_test.go` has **two** tests that are almost identical — one with `int`, one with `string`:

```go
intStack := new(Stack[int])
intStack.Push(1); intStack.Push(2)
v, ok := intStack.Pop()   // v == 2, ok == true

strStack := new(Stack[string])
strStack.Push("go"); strStack.Push("gym")
v2, ok2 := strStack.Pop() // v2 == "gym", ok2 == true
```

That duplication is *the point*: **one `Stack` definition serves both**, and the compiler type-checks each
one separately. Try `intStack.Push("nope")` and it won't compile — the safety the `interface{}` version
threw away is back. Each test also pops the stack empty and checks `Pop()` returns the zero value and
`false`, pinning down the empty-stack behaviour.

---

## 🏋️ Your rep — make it GREEN

Right now the methods are hollow:

```go
func (s *Stack[T]) Push(v T)        { /* TODO */ }
func (s *Stack[T]) Pop() (T, bool)  { var zero T; return zero, false }
func (s *Stack[T]) IsEmpty() bool   { return true }
```

1. Watch it fail (RED): `go test ./exercises/generics/`
2. Implement the three methods:
   1. **`Push`:** `append` the new value onto `s.values` (and reassign — remember the slices chapter).
   2. **`IsEmpty`:** true when `len(s.values) == 0`.
   3. **`Pop`:** if empty, return `var zero T` and `false`. Otherwise read the last element, reslice
      `s.values` to drop it, and return `(thatElement, true)`.
3. Run again → **GREEN** for *both* the int and string tests. One type, two element types — that's generics.

### Stretch goals (ask your tutor to scaffold any)

- Add `Peek() (T, bool)` that returns the top **without** removing it.
- Write a free function `Map[A, B any](s []A, f func(A) B) []B` that transforms a slice of one type into
  another — generics on a *function*, not just a type.

---

## 🧠 Active recall — no peeking

1. What does `[T any]` mean, and what is `any` doing in that bracket?
2. Why can't `Pop` just `return 0, false` when the stack is empty — and what do you write instead?
3. Give two reasons generics beat storing `[]interface{}` and casting.
4. What two steps does `Pop` take to actually *remove* the top element (not just read it)?

---

## 🔍 Real code in the wild

Open the standard library's [`slices`](https://pkg.go.dev/slices) and [`cmp`](https://pkg.go.dev/cmp)
packages — both added once Go got generics. `slices.Max[S ~[]E, E cmp.Ordered](s S) E`,
`slices.Contains[S ~[]E, E comparable](s S, v E) bool` — those `[...]` brackets are exactly the type
parameters you just used, with real **constraints** (`cmp.Ordered`, `comparable`) instead of plain `any`.
The generic `Stack` you wrote is the same machinery that now powers Go's own collection toolbox.

---

## What you learned

- **Type parameters** (`[T any]`) let you write a type or function **once** for many element types.
- A generic type carries its parameter into its methods: `func (s *Stack[T]) Push(v T)`.
- Return a parameter's zero value with **`var zero T`** — works whatever `T` is.
- Generics give **compile-time type safety** — unlike `interface{}` + casts, which fail at runtime.
- **Constraints** range from `any` (anything) to narrower ones like `cmp.Ordered` (only orderable types).
- `Pop` must **read and reslice** to actually remove an element.

✅ **Done when:** `go test ./exercises/generics/` is GREEN and you can answer the four recall questions.

**Next:** Chapter 19 — *Revisiting arrays & slices with generics*, where we rebuild `Sum` as a reusable
higher-order `Reduce`.
