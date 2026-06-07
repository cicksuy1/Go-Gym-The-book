# 4 · Structs, methods & interfaces 🟢

> *This is the chapter where Go's data gets a **shape** and your types get **behaviour**. It's also
> where Go's single most elegant idea lives: interfaces are satisfied **automatically** — there's no
> `implements` keyword, no inheritance tree. If a type has the right methods, it simply **is** the
> interface. Once that clicks, a huge amount of Go code suddenly reads like plain English.*

**What you'll build:** a `Shape` interface and two shapes — `Rectangle` and `Circle` — that count as
shapes just by having the right methods. Around it, the whole model of how Go organizes data and behaviour.

**Files for this chapter:** `exercises/structs/structs.go` (you fix this) · `exercises/structs/structs_test.go` (written for you).

---

## Where we're going

By the end of this chapter you'll be able to:

1. Define a **struct** — a named bundle of fields — and read its fields.
2. Attach a **method** to a type with a **value receiver**, and explain what the receiver is.
3. Define an **interface** as a list of methods a type must have.
4. Explain Go's headline idea: **automatic interface satisfaction** — "if it has the methods, it IS the interface."
5. Say *why* comparing floats needs a **tolerance**, not `==`.

That's a lot of new words in one chapter — struct, method, receiver, interface. We'll meet them **one at a
time**, each one resting on the one before. This is the heart of how Go programs are organized, so take it
slowly; it pays off in every chapter after.

---

## The big idea: data gets a shape, types get behaviour, and interfaces ask "can you?"

Three ideas stack here. The trick is to see them as a sequence, not a pile — each one is small on its own.

**A struct is a labelled box.** Up to now your values have been one type at a time — an `int`,
or a slice where every element is the *same* type. A **struct** lets you glue several values, even of
*different* types, together under one name, each value with its own label (a *field*):

```text
   Rectangle ┌───────────────┐
             │ Width   12.0  │
             │ Height   6.0  │
             └───────────────┘
```

That's it — a struct is just *"these fields, together, under one type name."*

**A method is a function stuck onto a type.** Instead of calling `Area(r)` and passing the
rectangle *in*, Go lets you write `r.Area()` — the rectangle comes *first*, then the dot, then the
action. It reads like "the rectangle's area," which is how we say it out loud anyway. We'll see exactly
how to write one in a moment.

**An interface is a question, not a thing.** An interface lists *methods* — capabilities — and
asks any type: *"do you have these?"* A `Shape` interface says "I need an `Area()` and a `Perimeter()`."
Any type that has both methods can be used wherever a `Shape` is wanted. Here's the headline:

> **You never declare that your type is a `Shape`. If it has the methods, it counts as one —
> automatically.** No `implements`, no inheritance. "If it has the methods, it IS the interface."

Don't worry if the interface idea feels abstract right now — it'll land once we've built the pieces.
Let's take the three ideas in order: structs first, then methods, then interfaces.

---

## Structs: defining and using them

```go
type Rectangle struct {
	Width, Height float64   // two fields sharing a type — shorthand, like func params
}

r := Rectangle{Width: 12, Height: 6}  // named fields — clearest, order-independent
r2 := Rectangle{12, 6}                // positional — terse, but order matters
fmt.Println(r.Width)                  // 12 — reach a field with a dot
```

`Width, Height float64` is the same shorthand you met for function parameters back in Chapter 1: when
neighbours share a type, you write the type once.

A struct is a **value**, just like an array from the last chapter: assign it or pass it to a function and
Go **copies the whole thing** — fields and all. And like everything in Go, it has a tidy **zero value**:
every field set to *its own* zero. So `Rectangle{}` is `{Width: 0, Height: 0}` — no `nil`, no surprises.

> **One naming trap, same as Chapter 1.** `Width` starts with a **capital** letter, which makes it
> **exported** — visible to code in other packages. A lowercase `width` would be hidden inside this
> package. Same capital-letter rule you saw for function names; it applies to struct fields too.

**Checkpoint:** a struct is a named bundle of fields, copied by value, with a zero-valued default. First
idea down. On to behaviour.

---

## Methods: behaviour with a value receiver

A method is just a function with **one extra piece** bolted on the front: a **receiver**. The receiver is
what ties the function to a type. Here's the anatomy:

```text
   func ( r Rectangle ) Area () float64 {
        └─────┬───────┘  └─┬─┘   └──┬───┘
              │            │        └─ return type (hands back a float64)
              │            └────────── method name
              └─────────────────────── the RECEIVER: "inside here, r is the Rectangle we were called on"
```

```go
func (r Rectangle) Area() float64 {
	return r.Width * r.Height
}
```

Compare it to an ordinary function. A plain function would be `func Area(r Rectangle) float64` — the
rectangle goes in the parentheses as a normal parameter. A **method** moves that parameter *out front*
into `(r Rectangle)`, and now you call it with a dot: `r.Area()` instead of `Area(r)`. Same idea, nicer
to read.

Inside the method, `r` is *that* rectangle, and you read its fields the same way as always: `r.Width`,
`r.Height`.

This is a **value receiver** — `r` is a **copy** of the rectangle (remember: structs copy by value).
Reading fields off a copy is exactly what value receivers are for, and it's all we need here.

> There's a *second* kind of receiver — the **pointer** receiver — the usual reason to reach for it being
> a method that needs to **change** the original instead of just reading it. That's a Chapter 5 story. For
> all of Chapter 4: value receivers, read-only. Nothing here changes a struct.

**Checkpoint:** a method is a function with a receiver in front; a value receiver gets a copy and reads
from it. Two ideas down, one to go.

---

## Interfaces: a set of capabilities

An interface is just a **list of methods** — their names, parameters, and return types, with no bodies:

```go
type Shape interface {
	Area() float64
	Perimeter() float64
}
```

Read it as a promise of **capability**: *"a `Shape` is anything that can give me an `Area()` and a
`Perimeter()`, both returning `float64`."* Notice what's **not** here: no fields, no actual code, no
mention of `Rectangle` or `Circle`. The interface doesn't know who has these methods — and that's the
whole point.

Does `Rectangle` count as a `Shape`? Look at the method we just wrote: a `Rectangle` has an `Area()
float64`. Give it a `Perimeter() float64` too, and it has *both* methods the interface asked for. So it
**is** a `Shape` — and we never had to say so anywhere.

Now watch a *second*, totally different type qualify the same way:

```go
type Circle struct {
	Radius float64
}

func (c Circle) Area() float64      { return math.Pi * c.Radius * c.Radius }
func (c Circle) Perimeter() float64 { return 2 * math.Pi * c.Radius }
```

(`math.Pi` is the constant π from the standard library's `math` package — the same `math` package you
peeked at in Chapter 1. You'll `import "math"` to use it.)

`Circle` never says `implements Shape`. It doesn't mention `Shape` at all. But because it *has* both
methods, **it counts as a `Shape` automatically** — exactly like `Rectangle` does. So now we can write one
function that accepts *any* `Shape` and feed it either type:

```go
func Describe(s Shape) string {
	return fmt.Sprintf("area=%.2f perimeter=%.2f", s.Area(), s.Perimeter())
}

Describe(Rectangle{Width: 12, Height: 6}) // works
Describe(Circle{Radius: 10})              // also works
```

Two small new things in that snippet, both from the `fmt` family you already know:

- **`fmt.Sprintf`** is like `fmt.Printf`, except instead of *printing* the formatted string it **returns**
  it as a `string` (the `S` is for "string"). Handy when you want the text, not the output.
- **`%.2f`** is a new format verb: print a `float64` with exactly **2 digits after the decimal point**
  (`72.00`). It's the float cousin of the `%d`, `%v`, `%T` verbs from Chapter 1.

> **The payoff.** `Describe` was written against the *capability* `Shape`, not against `Rectangle` or
> `Circle`. So it already works for any shape with the right methods — including ones nobody has written
> yet. This is the Go proverb **"accept interfaces"**: take the general capability as your parameter, and
> your code stays open. That's how Go stays flexible *without* inheritance.

**Checkpoint:** an interface is a list of required methods; any type that has them all qualifies,
automatically, no keyword. All three ideas are now on the table.

---

## Worked example — run it in your head

Here's where the three ideas pay off together. We can put **two different types** into the *same slice*,
as long as both count as `Shape`:

```go
shapes := []Shape{
	Rectangle{Width: 12, Height: 6},
	Circle{Radius: 10},
}

for _, s := range shapes {
	fmt.Printf("%.4f\n", s.Area())
}
// 72.0000
// 314.1593
```

Read it slowly, because `[]Shape` is the key move:

- It's a slice (Chapter 3) — but its element type is the **interface** `Shape`, not a concrete type. So
  each slot can hold *any* shape. The first slot holds a `Rectangle`, the second a `Circle`, side by side.
- The `range` loop (Chapter 2) walks them. For each one it calls `s.Area()` — **without knowing or caring**
  which shape `s` actually is. Go looks at the real value inside and runs *that* type's `Area()` method.
- `%.4f` is the same float verb as before, now asking for 4 digits after the point.

One loop, two completely different shapes, the right `Area()` each time. That's interfaces earning their
keep: you write the loop once, and it works for every shape — present and future.

---

## Prove it with a test (and why floats need a tolerance)

`structs_test.go` is table-driven, like every test in this book — but with one new wrinkle you must
understand: **you can't compare floats with `==` and trust it.**

Floating-point numbers are stored in binary, and most decimals can't be represented exactly — the same
way `1/3` can't be written exactly in decimal (`0.3333…` never ends). So a calculation that *should* give
`314.159…` might land a hair off, and `got == want` would fail for a number that's correct to fifteen
digits. The fix is to check that the two numbers are **close enough**:

```go
const tol = 1e-9 // tolerance: "close enough" for floats (0.000000001)

if math.Abs(got-want) > tol {
	t.Errorf("Area() = %v; want %v (diff > %v)", got, want, tol)
}
```

Walk through it: `got - want` is how far apart the two numbers are. `math.Abs(...)` drops any minus sign,
so we get the plain **distance** between them (a gap of `-0.0000001` and `+0.0000001` are equally "off").
If that distance is bigger than our tiny tolerance `tol`, the answer is genuinely wrong and we fail.
Otherwise we call it equal. This is the standard, idiomatic way to assert on floats — remember it, because
the day you write `gotFloat == wantFloat` is the day you get a baffling failure on a correct answer.

The table itself stores both shapes in a single slice — same `[]Shape` move as the worked example — and
checks each one's `Area()` and `Perimeter()`:

```go
cases := []struct {
	name      string
	shape     Shape
	wantArea  float64
	wantPerim float64
}{
	{name: "rectangle", shape: Rectangle{Width: 12, Height: 6}, wantArea: 72, wantPerim: 36},
	{name: "circle", shape: Circle{Radius: 10}, wantArea: 314.1592653589793, wantPerim: 62.83185307179586},
}
```

Because the `shape` field is typed `Shape`, the test exercises the *interface*, not the concrete types —
exactly the way real callers will use your code. (The test file also ships an `ExampleRectangle_Area` —
the test-that-doubles-as-documentation trick from Chapter 1.)

---

## 🏋️ Your rep — make it GREEN

Right now `structs.go` lies on purpose — every method returns `0`:

```go
func (r Rectangle) Area() float64      { return 0 } // TODO(you): Width * Height
func (r Rectangle) Perimeter() float64 { return 0 } // TODO(you): 2 * (Width + Height)
func (c Circle) Area() float64         { return 0 } // TODO(you): math.Pi * Radius * Radius  (import "math")
func (c Circle) Perimeter() float64    { return 0 } // TODO(you): 2 * math.Pi * Radius  (import "math")
```

1. Watch it fail (RED — this is supposed to happen):
   ```text
   go test ./exercises/structs/ -v
   ```
   *(run it from the `go-gym` folder)*
2. Fill in the four method bodies. You'll need to `import "math"` for `math.Pi`.
3. Run again. Watch RED turn **GREEN**. That little hit is the engine of this whole course.

Type it yourself. Reading builds recognition; *writing* builds skill — the muscle only grows when your
fingers move.

### Stretch goals (optional, ask your tutor to scaffold any)

- Add a `Triangle struct { Base, Height float64 }` with its own `Area()` and `Perimeter()`, and drop a
  row into the table. Notice you don't touch the `Shape` interface at all — it just works.
- Write a free function `TotalArea(shapes []Shape) float64` that sums every shape's area, and test it.
- Add a `String() string` method to `Rectangle` so it satisfies `fmt.Stringer` (see §Real code) and
  prints nicely with `%v`.

---

## 🧠 Active recall — answer out loud, no peeking

1. What is a **struct**, and what is the zero value of `Rectangle{}` — field by field?
2. What is a **receiver**, and where does it go in a method declaration?
3. What does an **interface** declaration contain — and just as important, what does it *not* contain?
4. How does `Circle` come to count as a `Shape` — what did you have to write to "register" it as one?
5. Why does the test compare floats with `math.Abs(got-want) > tol` instead of `got != want`?
6. Bonus: what does `[]Shape` let you do that `[]Rectangle` can't?

If any answer is fuzzy, scroll back up — that's the recall doing its job, not failure.

---

## 🔍 Real code in the wild

You've already met one interface without knowing it. Open the standard library's
[`fmt.Stringer`](https://pkg.go.dev/fmt#Stringer):

```go
type Stringer interface {
	String() string
}
```

That's the *entire* interface — one method. Any type that has a `String() string` method counts as a
`Stringer` **automatically**, and `fmt` will call that method for you when it prints the value with `%v`
or `Println`. Nobody wrote `implements Stringer` anywhere; types just *have* the method, and `fmt` accepts
the interface. The same shape powers [`io.Writer`](https://pkg.go.dev/io#Writer) (one method, `Write`) and
[`sort.Interface`](https://pkg.go.dev/sort#Interface) (three methods) — the whole standard library is
built on the exact idea you just learned: **if it has the methods, it IS the interface.**

---

## What you learned

- A **struct** bundles named **fields** under a type; it's a **value** (copied whole), with a tidy **zero
  value**.
- A **method** is a function with a **receiver**; a **value receiver** gets a *copy* and is perfect for
  read-only methods like `Area()`. (The pointer receiver — for changing the original — waits for Chapter 5.)
- An **interface** is a list of methods a type must have — a set of capabilities.
- Go satisfies interfaces **automatically**: no `implements`, no inheritance. **If a type has the methods,
  it IS the interface.** This lets you **accept interfaces** and stay open to types you haven't written yet.
- A slice of an interface type, like `[]Shape`, can hold **different concrete types together** — one loop
  handles them all.
- **Floats need a tolerance**, not `==`: compare with `math.Abs(got-want) > tol`.

✅ **Done when:** `go test ./exercises/structs/` is GREEN and you can answer the recall questions.

**Next:** Chapter 5 — *Pointers & errors*, where the *other* kind of receiver lets a method change the
original, and Go's "errors are values" philosophy replaces exceptions with something you can read.
