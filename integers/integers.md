# 1 · Integers 🟢

> *"Integers" looks like the most boring chapter in any programming book. It is secretly the most
> important, because it's where you learn how Go **thinks** — about types, about values, and about
> proving your code works. Everything else in this book stands on what happens here.*

**What you'll build:** a one-line `Add` function — and around it, the four ideas that the rest of Go
is made of.

**Files for this chapter:** `integers.go` (you fix this) · `integers_test.go` (written for you).

---

## Where we're going

By the end of this chapter you'll be able to:

1. Explain why Go makes you write the *type* of everything.
2. Name Go's integer types and know the one that bites beginners (overflow).
3. Read and write a Go function signature without hesitating.
4. Write a **table-driven test** — the test shape you'll meet in every real Go codebase.
5. Say *why* we write the test first, not just *how*.

Take it slowly. This is the chapter that makes the next eighteen easier.

---

## Big idea: a type is a promise

In some languages a variable is a box you can throw anything into — a number now, a string later, who
knows. Go refuses to play that game. In Go, **every value has a type, and the type is a promise that
the compiler forces you to keep.**

When you write:

```go
var age int = 34
```

you are promising: *"`age` is an integer, forever."* If you later try `age = "old"`, the program
won't even compile. That feels strict coming from Python or JavaScript. It is strict — on purpose.
The strictness is the compiler doing work *for* you, before your program ever runs, so that a whole
category of bugs simply cannot happen.

> If you've touched Rust, this will feel familiar: `let age: i32 = 34;` is the same promise. Go and
> Rust disagree about many things, but they agree that **types catch bugs at compile time, for free.**

Hold onto this sentence, because it's the spine of the entire book:

> **A type is a contract. The compiler is the enforcer.**

---

## Go's integer family

"Integer" isn't one type in Go — it's a small family. You'll mostly use `int`, but it's worth meeting
the relatives so real code doesn't surprise you.

| Type | Size | Notes |
|------|------|-------|
| `int` | 32 or 64 bits (matches your CPU) | **Your default.** Use this unless you have a reason not to. |
| `int8` `int16` `int32` `int64` | fixed | Signed, exact width. |
| `uint`, `uint8` … `uint64` | fixed/CPU | **Un**signed — never negative. |
| `byte` | 8 bits | An alias for `uint8`. Used for raw data. |
| `rune` | 32 bits | An alias for `int32`. Represents one Unicode character. |

Two things beginners trip on:

**1. `int` size depends on the machine.** On the 64-bit PC you're on, `int` is 64 bits. Don't assume
a number — if you need an exact width (say, for a network packet), say so: `int32`, `uint64`, etc.
This is exactly what real systems code does.

**2. Integers *wrap around* silently.** A fixed-size integer can only hold so much. Push past the top
and it quietly rolls over to the bottom — no crash, no warning:

```text
   uint8 can hold 0 … 255
   255 + 1  ──▶  0        (wraps around, like a car odometer)
```

```go
var x uint8 = 255
x = x + 1
fmt.Println(x) // prints 0, not 256
```

Most of the time you won't hit this. But when a counter mysteriously resets to zero, you'll *know
why* — and that's the difference between a beginner and someone who can read real code.

> **Compile-time vs run-time:** if you overflow a *constant* the compiler catches it
> (`const x uint8 = 256` won't compile). If you overflow a *variable* at run time, it wraps. Go
> protects you where it can.

---

## Declaring integers three ways

```go
var count int = 10   // explicit: type and value
var count int        // explicit type, value defaults to the ZERO VALUE (0)
count := 10          // short form: Go infers the type from the value
```

That middle line introduces a lovely Go idea: **zero values.** A declared-but-unassigned `int` is not
"undefined" or "null" — it is `0`. Every type has a sensible zero (`0` for numbers, `""` for strings,
`false` for bools). You'll rarely fight uninitialized-variable bugs in Go.

The `:=` form is what you'll use most *inside functions* — it's "declare and assign in one go, infer the
type." (You can't use `:=` at the package level; there, you need `var`.)

---

## Doing arithmetic (and one trap)

The operators are unsurprising: `+ - * /` and `%` (remainder). The trap is **integer division
truncates** — it throws away the fraction, it does not round:

```go
fmt.Println(7 / 2)  // 3, not 3.5  — the .5 is discarded
fmt.Println(7 % 2)  // 1           — the remainder
```

If you wanted `3.5`, you needed floats (`7.0 / 2.0`). Forgetting this is one of the most common
"why is my average wrong?" bugs. Now it won't be yours.

---

## Showing your work: `fmt`

`fmt.Println` prints a value followed by a newline. `fmt.Printf` gives you a format string with
**verbs** — little `%` placeholders that say *how* to render a value:

```go
n := 255
fmt.Printf("decimal=%d  binary=%b  hex=%x  type=%T\n", n, n, n, n)
// decimal=255  binary=11111111  hex=ff  type=int
```

You don't need to memorize these. The ones worth knowing now: `%d` (decimal), `%v` (the value in its
default form — your Swiss-army verb), and `%T` (the value's *type*, great for debugging "wait, what is
this thing?").

---

## Functions are typed contracts

Now the star of the chapter. Read this slowly:

```go
func Add(x, y int) int {
	return x + y
}
```

Four things are happening in that first line, and they're the whole point of the Integers chapter:

```text
   func Add ( x , y  int )  int  {
   │    │     └──┬──┘ └┬┘   └┬┘
   │    │        │     │     └─ RETURN type: hands back one int
   │    │        │     └─────── both x and y are int (shared-type shorthand)
   │    │        └───────────── the parameters
   │    └────────────────────── the function's name (Capital A = exported, more on that later)
   └─────────────────────────── the keyword that starts a function
```

- **The types are part of the signature.** `Add` promises: give me two `int`s, I'll return one `int`.
- **`(x, y int)` is shorthand** for `(x int, y int)`. When neighbours share a type, you write it once.
- **The return type comes *after* the parameters**, before the `{`. That lonely `int` *is* the return
  type. If you're coming from C or Java, this ordering feels backwards for about a day, then never again.

That signature is a contract in the exact sense we said: *the compiler will reject any caller who
breaks it.* `Add(2, 4)` is fine. `Add(2, "four")` won't compile. You get that safety for free, before
the program ever runs.

---

## Proving it works: your first test

Here's where this book earns its name. We don't just *write* `Add` — we **prove** it with a test, and
we write the test *first*. Open `integers_test.go`:

```go
func TestAdd(t *testing.T) {
	cases := []struct {
		name string
		x, y int
		want int
	}{
		{name: "two positives", x: 2, y: 4, want: 6},
		{name: "with zero", x: 9, y: 0, want: 9},
		{name: "a negative", x: 5, y: -3, want: 2},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := Add(c.x, c.y)
			if got != c.want {
				t.Errorf("Add(%d, %d) = %d; want %d", c.x, c.y, got, c.want)
			}
		})
	}
}
```

This is a **table-driven test**, and it is the single most important pattern in this whole book. Learn
to read it:

- `cases` is a **slice of little anonymous structs** — a table. Each row is one scenario: some inputs
  and the answer we `want`. (Don't worry that you don't fully "get" structs yet — Chapter 4. For now:
  a row is just *"these inputs should give this answer."*)
- The `for ... range` loop walks the table.
- `t.Run(c.name, ...)` runs each row as its own **sub-test** with a name, so when one fails Go tells
  you *exactly which row* (`TestAdd/with_zero`), not just "something failed."
- `t.Errorf(...)` records a failure **but keeps going** to check the other rows. (Its angrier sibling,
  `t.Fatalf`, stops the test immediately — use that when continuing makes no sense.)

Why a table instead of three separate test functions? Because adding a new case is **one line**, and
every case gets the same checking logic. When you want to test a fourth scenario, you add a row, not a
function. Real Go code is *full* of this shape — once it's in your fingers, you'll read tests fluently.

### Why write the test *first*? (the heart of TDD)

You said you wanted to actually *understand* TDD, not just suffer it — so here's the honest version.

Writing the test first does three things that writing it second cannot:

1. **It forces you to design the contract before the code.** To write `TestAdd`, you had to decide
   `Add` takes two `int`s and returns one. You designed the *interface* by describing how you'd *use*
   it. That's a tiny taste of why TDD scales: it makes you think like a caller.
2. **It gives you a definition of "done."** Green = finished. No vague "I think it works." The test is
   an objective, runnable spec.
3. **You watch it fail first (RED), so you know the test actually tests something.** A test that's
   green from the start might be green because it checks nothing. Seeing RED → GREEN proves the test
   has teeth.

That's the whole cycle: **RED** (a failing test that describes what you want) → **GREEN** (the
simplest code that passes) → **REFACTOR** (clean it up, tests still green). You just did step one for
free, because we handed you a RED test.

> TDD is a *tool*, not a religion. There are places it's overkill (we'll talk about those in Part 2).
> But for learning a language? It's perfect: it turns every concept into something you can *run* and
> *prove*, which is exactly the active practice that makes things stick.

---

## A test that is also documentation

Go has one more trick that most languages lack — the **example function**:

```go
func ExampleAdd() {
	fmt.Println(Add(1, 5))
	// Output: 6
}
```

This is real and a little magical:

- `go test` **runs** it and checks that what it prints matches the `// Output:` comment. If `Add`
  printed `7`, this fails. So it's a genuine test.
- It also shows up in your generated documentation (`go doc`), as a runnable usage example.

One function, doing double duty as a test *and* a doc. That's very Go: practical, no ceremony.

---

## 🏋️ Your rep — make it GREEN

Right now `integers.go` lies on purpose:

```go
func Add(x, y int) int {
	return 0 // TODO: make this correct
}
```

1. Run the tests and **watch them fail** (this is RED — it's supposed to happen):
   ```text
   go test ./integers/ -v
   ```
   *(run it from the `go-gym` folder)*
2. Fix the one line so `Add` actually adds.
3. Run again. Watch RED turn **GREEN**. That little dopamine hit is the engine of this whole course.

Type it yourself. Reading code builds recognition; *writing* code builds skill. The muscle only grows
when your fingers move.

### Stretch goals (optional, ask me to scaffold any of them)

- Add a `Multiply(x, y int) int` with its own table-driven test.
- Add a test row that proves integer division truncates (`7 / 2 == 3`).
- Write an `ExampleAdd_negative` showing `Add(2, -5)` prints `-3`.

---

## 🧠 Active recall — answer out loud, no peeking

1. In `func Add(x, y int) int`, **which `int` is the return type**, and which are the parameters?
2. Why won't `Add(2, "four")` compile — and is that error caught *before* or *while* the program runs?
3. What does `go test` actually *do* with the `// Output: 6` line?
4. Bonus: what does `var n int` equal before you assign anything, and why does Go guarantee that?

If any answer is fuzzy, scroll back up — that's not failure, that's the recall doing its job.

---

## 🔍 Real code in the wild (your reward)

You just learned that real systems pin their integer types down *deliberately*. You can see it in Go's
own standard library: open the [`math`](https://pkg.go.dev/math#pkg-constants) package docs and notice
constants like `math.MaxInt8`, `math.MaxUint32`, `math.MaxInt64`. The language *ships* exact-width limits
because real code cares about them — the "a type is a promise" idea you just met, everywhere you look.

---

## What you learned

- A **type is a promise the compiler enforces** — Go's central idea.
- Go has a small **family of integer types**; `int` is your default, and fixed-size integers **wrap
  around** on overflow.
- **Zero values** mean a declared variable is never "undefined."
- **Integer division truncates.**
- A function signature is a **typed contract**: `func Name(params) returnType`.
- **Table-driven tests** + `t.Run` are the idiomatic way to test in Go.
- We write tests **first** to design the contract, define "done," and prove the test has teeth
  (**RED → GREEN → REFACTOR**).
- **Example functions** are tests and documentation at once.

✅ **Done when:** `go test ./integers/` is GREEN and you can answer the four recall questions.

**Next:** Chapter 2 — *Iteration*, where a single keyword (`for`) is Go's *only* loop, and we meet
benchmarks.
