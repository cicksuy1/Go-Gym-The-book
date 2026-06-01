# 4 · Structs, methods & interfaces 🟢

> *This is the chapter where Go's data gets a **shape** and your types get **behaviour**. It's also
> where Go's single most elegant idea lives: interfaces are satisfied **implicitly** — there's no
> `implements` keyword, no inheritance tree. If a type has the right methods, it simply **is** the
> interface. Once that clicks, a huge amount of Go code suddenly reads like plain English.*

**What you'll build:** a `Shape` interface and two shapes — `Rectangle` and `Circle` — that satisfy
it just by having the right methods. Around it, the whole model of how Go organizes data and behaviour.

**Files for this chapter:** `exercises/structs/structs.go` (you fix this) · `exercises/structs/structs_test.go` (written for you).

---

## Where we're going

By the end of this chapter you'll be able to:

1. Define a **struct** — a named bundle of fields — and read/write its fields.
2. Hang a **method** off a type with a **value receiver**, and explain what the receiver is.
3. Define an **interface** as a set of method signatures.
4. Explain Go's headline idea: **implicit interface satisfaction** — "if it has the methods, it IS the interface."
5. Say *why* comparing floats needs a **tolerance**, not `==`.

This is the heart of how Go programs are organized. Take your time — it pays off in every chapter after.

---

## The big idea: data gets a shape, types get behaviour, and interfaces ask "can you?"

Three ideas stack here, so let's name them up front and in plain language.

**A struct is a labelled box.** Up to now your values have been single things — an `int`, a slice. A
**struct** lets you glue several values together under one name, each with its own label (a *field*):

```text
   Rectangle ┌───────────────┐
             │ Width   12.0  │
             │ Height   6.0  │
             └───────────────┘
```

That's it — a struct is just *"these fields, together, with a type name."*

**A method is a function attached to a type.** Instead of `Area(r Rectangle)`, Go lets you write
`r.Area()` — the value comes *before* the dot. The little `(r Rectangle)` that makes that possible is
called the **receiver**.

**An interface is a question, not a thing.** An interface lists *method signatures* — capabilities —
and asks any type: *"can you do these?"* A `Shape` interface says "I need an `Area()` and a
`Perimeter()`." Any type that has both methods can be used as a `Shape`. Here's the headline:

> **You never declare that you satisfy an interface. If your type has the methods, it satisfies it —
> automatically.** No `implements`, no inheritance. "If it has the methods, it IS the interface."

This is *structural* typing, and it's the spine of idiomatic Go. Hold onto it.

---

## Structs: defining and using them

```go
type Rectangle struct {
	Width, Height float64   // two fields sharing a type — shorthand, like func params
}

r := Rectangle{Width: 12, Height: 6}  // named fields — clearest, order-independent
r2 := Rectangle{12, 6}                // positional — terse, order matters
fmt.Println(r.Width)                  // 12 — reach a field with a dot
```

A struct is a **value**, just like an array from the last chapter: assign it or pass it to a function
and Go **copies the whole thing**. Its **zero value** is every field set to its own zero —
`Rectangle{}` is `{Width: 0, Height: 0}`, no `nil`, no surprises.

> Capitalization matters here too: `Width` (capital W) is **exported** — visible outside the package.
> A lowercase field would be package-private. Same rule as function names.

---

## Methods: behaviour with a value receiver

A method is a function with one extra piece — a **receiver** in front of the name:

```text
   func ( r Rectangle ) Area () float64 {
        └─────┬───────┘  └─┬─┘   └──┬───┘
              │            │        └─ return type
              │            └────────── method name
              └─────────────────────── the RECEIVER: "r is the Rectangle this runs on"
```

```go
func (r Rectangle) Area() float64 {
	return r.Width * r.Height
}
```

Now you call it on a value with a dot: `r.Area()`. Inside the method, `r` is *that* rectangle, and you
read its fields with `r.Width`, `r.Height`.

This is a **value receiver** — `r` is a **copy** of the rectangle. Reading fields is exactly what value
receivers are for, and it's all we need here. (There's a second kind, the *pointer* receiver, for when a
method must **change** the original. That's a Chapter 5 story — for now, value receivers, read-only.)

---

## Interfaces: a set of capabilities

An interface is just a list of method signatures — names, parameters, return types — with no bodies:

```go
type Shape interface {
	Area() float64
	Perimeter() float64
}
```

Read it as a promise of **capability**: *"a `Shape` is anything that can give me an `Area()` and a
`Perimeter()`, both returning `float64`."* Notice what's **not** here: no fields, no implementation, no
mention of `Rectangle` or `Circle`. The interface doesn't know who satisfies it — and that's the point.

Now the magic. Define a second type with the same two methods:

```go
type Circle struct {
	Radius float64
}

func (c Circle) Area() float64      { return math.Pi * c.Radius * c.Radius }
func (c Circle) Perimeter() float64 { return 2 * math.Pi * c.Radius }
```

`Circle` never says `implements Shape`. It doesn't import `Shape`. It doesn't know `Shape` exists. But
because it *has* both methods, **it satisfies `Shape` automatically** — and so does `Rectangle`. You can
now write a function that takes a `Shape` and pass it either one:

```go
func Describe(s Shape) string {
	return fmt.Sprintf("area=%.2f perimeter=%.2f", s.Area(), s.Perimeter())
}

Describe(Rectangle{Width: 12, Height: 6}) // works
Describe(Circle{Radius: 10})              // also works
```

> **"Accept interfaces, return structs"** is a Go proverb you'll hear forever. A function that takes a
> `Shape` is open to *any* shape — including ones nobody has written yet. You coded against a
> *capability*, not a concrete type. That's how Go stays flexible without inheritance.

---

## Worked example — run it in your head

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

Look at `[]Shape` — a slice holding **two different concrete types** side by side. That's only possible
because both satisfy the interface. The loop calls `s.Area()` without caring *which* shape it has; Go
dispatches to the right method. One loop, many shapes — that's interfaces earning their keep.

---

## Prove it with a test (and why floats need a tolerance)

`structs_test.go` is table-driven, like every test in this book — but with one new wrinkle you must
understand: **you can't compare floats with `==` and trust it.**

Floating-point numbers are stored in binary, and most decimals can't be represented exactly — the same
way `1/3` can't be written exactly in decimal. So a calculation that *should* give `314.159...` might
land a hair off, and `got == want` would fail for a number that's correct to fifteen digits. The fix is
to check that the two numbers are **close enough**:

```go
const tol = 1e-9 // tolerance: "close enough" for floats

if math.Abs(got-want) > tol {
	t.Errorf("Area() = %v; want %v (diff > %v)", got, want, tol)
}
```

`math.Abs(got-want)` is the distance between the two numbers; if that distance is under our tiny
tolerance `tol`, we call it equal. This is the standard, idiomatic way to assert on floats — remember it,
because the day you write `gotFloat == wantFloat` is the day you get a baffling failure on a correct
answer.

The table itself stores both `Shape`s in the same slice and checks each one's `Area()` and `Perimeter()`:

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

Because the field is typed `Shape`, the test exercises the *interface*, not the concrete types — exactly
the way real callers will use your code. (The test file also ships an `ExampleRectangle_Area` — the
test-that-doubles-as-documentation trick from Chapter 1.)

---

## 🏋️ Your rep — make it GREEN

Right now `structs.go` lies on purpose — every method returns `0`:

```go
func (r Rectangle) Area() float64      { return 0 } // TODO(you): Width * Height
func (r Rectangle) Perimeter() float64 { return 0 } // TODO(you): 2 * (Width + Height)
func (c Circle) Area() float64         { return 0 } // TODO(you): math.Pi * Radius * Radius
func (c Circle) Perimeter() float64    { return 0 } // TODO(you): 2 * math.Pi * Radius
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

1. What is a **receiver**, and where does it go in a method declaration?
2. How does `Circle` come to satisfy the `Shape` interface — what did you have to write to "register" it?
3. Why does the test compare floats with `math.Abs(got-want) > tol` instead of `got != want`?
4. Bonus: what does "accept interfaces" mean, and why does it make code more flexible?

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

That's the *entire* interface — one method. Any type that has a `String() string` method satisfies it
**implicitly**, and `fmt` will automatically call it when printing that value with `%v` or `Println`.
Nobody wrote `implements Stringer` anywhere; types just *have* the method and `fmt` *accepts the
interface*. The same shape powers [`io.Writer`](https://pkg.go.dev/io#Writer) (one method, `Write`) and
[`sort.Interface`](https://pkg.go.dev/sort#Interface) (three methods) — the whole standard library is
built on the exact idea you just learned: **if it has the methods, it IS the interface.**

---

## What you learned

- A **struct** bundles named **fields** under a type; it's a **value** (copied), with a tidy **zero value**.
- A **method** is a function with a **receiver**; a **value receiver** gets a *copy* and is perfect for
  read-only methods like `Area()`.
- An **interface** is a set of method signatures — a list of capabilities.
- Go satisfies interfaces **implicitly**: no `implements`, no inheritance. **If a type has the methods, it
  IS the interface.** This lets you **accept interfaces** and stay open to types you haven't written yet.
- **Floats need a tolerance**, not `==`: compare with `math.Abs(got-want) > tol`.

✅ **Done when:** `go test ./exercises/structs/` is GREEN and you can answer the four recall questions.

**Next:** Chapter 5 — *Pointers & errors*, where the *other* kind of receiver lets a method change the
original, and Go's "errors are values" philosophy replaces exceptions with something you can read.
