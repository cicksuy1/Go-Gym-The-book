# 11 · Reflection 🔴

> *Most of the time, Go knows the type of everything at compile time — that's the whole "a type is a
> promise" idea. **Reflection** is the escape hatch: it lets your code look at a value it has never seen
> before, at run time, and ask "what are you? what's inside you?" It's powerful, a little dangerous, and
> it quietly powers tools you already use — like `encoding/json`. This chapter demystifies it.*

**What you'll build:** `Walk` — a function that takes *any* value and finds every string buried
anywhere inside it, no matter the shape.

**Files for this chapter:** `exercises/reflection/reflection.go` (you fix this) · `exercises/reflection/reflection_test.go` (written for you).

---

## Where we're going

By the end of this chapter you'll be able to:

1. Explain what `interface{}` (a.k.a. `any`) really means and why it loses type information.
2. Use `reflect.ValueOf` to inspect a value whose type you don't know in advance.
3. Switch on a value's **`Kind`** to handle strings, structs, pointers, slices, arrays, and maps.
4. Write a **recursive** walk over an arbitrarily nested value.
5. Say *when not to* reach for reflection — because that judgement matters as much as the mechanics.

---

## The big idea: asking a value "what are you?"

Normally Go code is fully typed. If you have a `Person`, the compiler knows it's a `Person` and lets you
write `p.Name`. But sometimes you want to write code that works on values whose type you **can't** know
when you're writing it — think of a function that serializes *anything* to JSON, or prints *any* struct
nicely. Those tools accept `interface{}`:

```go
func Walk(x interface{}, fn func(input string)) { ... }
```

`interface{}` (the empty interface, written `any` since Go 1.18) means **"a value of any type at all."**
The catch: once a value is inside an `interface{}`, the compiler no longer knows its real shape. You
can't write `x.Name` — the compiler has no idea `x` has a `Name`. The type information isn't *gone*, it's
just hidden at run time. **Reflection is how you ask for it back.**

```text
   compile time:  the compiler knows the type  →  you use it directly (p.Name)
   inside any:    the type is hidden            →  you must REFLECT to discover it
```

> A type is still a promise — reflection just reads the promise at run time instead of compile time. You
> trade the compiler's help for flexibility. That trade is the whole story of this chapter.

---

## The two doors: `Type` and `Value`

The `reflect` package gives you two ways to look at a value:

- `reflect.TypeOf(x)` — describes the **type** (its name, its kind, its fields).
- `reflect.ValueOf(x)` — wraps the **value** so you can read what's actually inside.

We mostly want `ValueOf`, because we want the data. The most important method on a `reflect.Value` is
**`Kind()`** — the *category* of the value:

```go
val := reflect.ValueOf("hello")
fmt.Println(val.Kind()) // string
```

Don't confuse **Kind** with **Type**. `Type` is specific (`Person`, `main.Account`); **Kind** is the
broad family: `String`, `Struct`, `Slice`, `Map`, `Pointer`, `Int`, and so on. To walk *any* value, we
don't care that it's a `Person` — we care that its Kind is `Struct`, so we can loop its fields. Kind is
the right level of abstraction here.

---

## Reading inside each Kind (the traps)

Each Kind unlocks different methods on the `reflect.Value`. These are the ones we need:

| Kind | How to read inside it |
|------|------------------------|
| `String` | `val.String()` — the actual string |
| `Struct` | `val.NumField()` count, `val.Field(i)` for each field (itself a `reflect.Value`) |
| `Pointer` / `Interface` | `val.Elem()` — follow it to the thing it points at |
| `Slice` / `Array` | `val.Len()` count, `val.Index(i)` for each element |
| `Map` | `val.MapKeys()`, then `val.MapIndex(key)` for each value |

The pattern to notice: **every one of these hands you back another `reflect.Value`.** A struct field is a
`reflect.Value`. A slice element is a `reflect.Value`. That's the hint that we'll **recurse** — each piece
is the same kind of thing we started with, so the same function can handle it.

> **Trap — pointers hide one level down.** If you pass `&Person{...}`, the Kind is `Pointer`, not
> `Struct`. You have to call `.Elem()` to step *through* the pointer to the struct it points at, then
> handle that. Forget this and your walk silently finds nothing. (Interfaces behave the same way — also
> `.Elem()`.)

---

## Worked example: a tiny reflective printer

Here's the shape of the whole idea in miniature — a function that prints the Kind of whatever you hand it:

```go
package main

import (
	"fmt"
	"reflect"
)

func describe(x interface{}) {
	val := reflect.ValueOf(x)
	fmt.Printf("%v is a %s\n", x, val.Kind())
}

func main() {
	describe("hello")
	describe(42)
	describe([]int{1, 2, 3})
	describe(struct{ Name string }{"Chris"})
}
```

Output:

```text
hello is a string
42 is a int
[1 2 3] is a slice
{Chris} is a struct
```

One function, four wildly different types, no casting. That's reflection earning its keep. Now we just
need to *recurse* instead of merely printing the Kind.

---

## Prove it with a test

`reflection_test.go` is table-driven, and the cases are chosen to force you through **every Kind**: a
flat struct, a nested struct, a pointer to a struct, a slice of structs, an array of structs — and a
separate test for a map. Each case runs `Walk` and collects every string the callback receives:

```go
var got []string
Walk(c.input, func(input string) {
	got = append(got, input)
})
```

Passing a `fn` that *appends to a slice* is a neat testing trick: it turns "did you call me with the right
strings?" into "compare these two slices." For most cases we check exact order with `reflect.DeepEqual`.
The **map** case is special — Go map iteration order is **random**, so we assert *membership* ("contains
Moo", "contains Baa") rather than order. Pinning that down teaches you a real Go fact: never depend on map
order.

---

## 🏋️ Your rep — make it GREEN

Right now `reflection.go` does nothing:

```go
func Walk(x interface{}, fn func(input string)) {
	// TODO(you): use reflect.ValueOf(x) and recurse over its Kind().
}
```

1. Watch it fail (RED): `go test ./exercises/reflection/`
2. Implement `Walk`. A plain-language recipe:
   1. Turn `x` into a `reflect.Value` with `reflect.ValueOf`. (Tip: write a small helper that takes a
      `reflect.Value` so you can call it recursively — `Walk` itself only gets an `interface{}`.)
   2. `switch` on `val.Kind()`.
   3. **String:** call `fn(val.String())`. Done — this is the only place a string is actually emitted.
   4. **Struct:** loop `i` from `0` to `val.NumField()`, recurse into `val.Field(i)`.
   5. **Pointer / Interface:** recurse into `val.Elem()` (step *through* it).
   6. **Slice / Array:** loop `i` from `0` to `val.Len()`, recurse into `val.Index(i)`.
   7. **Map:** loop over `val.MapKeys()`, recurse into `val.MapIndex(key)`.
3. Run again → **GREEN**. Watch the nested and pointer cases pass — that's recursion doing the heavy lifting.

### Stretch goals (ask your tutor to scaffold any)

- Handle a `chan` (receive values until it closes) or a `func` (call it and walk the result).
- Make the map case deterministic by sorting the keys before you visit them.

---

## 🧠 Active recall — no peeking

1. What's the difference between a value's **Kind** and its **Type**? Which does `Walk` switch on, and why?
2. You pass `&Person{Name: "Ana"}` to `Walk` and it finds nothing. What did you forget to handle?
3. Why does the map test check *membership* instead of comparing the exact slice of results?
4. Reflection lets you bypass the compiler's type checks. Name one cost you pay for that flexibility.

---

## 🔍 Real code in the wild

Open the standard library's [`encoding/json`](https://pkg.go.dev/encoding/json). When you call
`json.Marshal(anyValue)`, it has no idea what type you'll pass — so under the hood it does *exactly* what
you just built: it reflects over the value, switches on Kind, walks struct fields (reading their tags),
ranges slices, and visits map entries. The `Walk` you wrote is a stripped-down version of the engine
inside one of Go's most-used packages. Reflection felt abstract; now you've seen where it actually lives.

---

## What you learned

- `interface{}` / `any` accepts **any** value but **hides its type** from the compiler.
- **Reflection** (`reflect.ValueOf`) reads that hidden type back at run time.
- Switch on **`Kind()`** — the broad family (String, Struct, Slice, Map, Pointer) — not the specific Type.
- Each Kind exposes its insides as *more* `reflect.Value`s, which is why a **recursive** walk fits perfectly.
- **Pointers and interfaces** need `.Elem()` to step through; forget it and you find nothing.
- Reflection is powerful but costs you compile-time safety, speed, and readability — **use it sparingly.**

✅ **Done when:** `go test ./exercises/reflection/` is GREEN and you can answer the four recall questions.

**Next:** Chapter 12 — *Sync*, where we make shared state safe across goroutines with mutexes.
