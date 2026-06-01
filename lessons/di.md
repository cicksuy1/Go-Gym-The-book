# 7 · Dependency Injection 🟢

> *"Dependency injection" sounds like enterprise jargon invented to make standups longer. It isn't.
> Strip the buzzwords away and it's one humble idea: **don't hard-wire what your function talks to —
> hand it in.** That single move is what makes Go code testable, reusable, and ready for the real
> world. Once it clicks, you'll see it everywhere in the standard library.*

**What you'll build:** `Greet` — a function that writes a greeting — written so it can print to the
screen, into a buffer, or straight down an HTTP connection **without changing a line**.

**Files for this chapter:** `exercises/di/di.go` (you fix this) · `exercises/di/di_test.go` (written for you).

---

## Where we're going

By the end of this chapter you'll be able to:

1. Explain what dependency injection actually *is*, minus the jargon.
2. Use `io.Writer` — one of the most important interfaces in Go.
3. Write a function that's **testable** because it doesn't reach out to the world on its own.
4. See why `os.Stdout`, a `bytes.Buffer`, and an HTTP response all fit the same hole.

---

## The big idea: hand in the dependency, don't reach for it

Imagine a function that prints a greeting. The obvious first try reaches straight for the screen:

```go
func Greet(name string) {
	fmt.Printf("Hello, %s", name)
}
```

It works — but it has a hidden problem. It **decided for you** where the output goes: standard out, the
terminal. How would you *test* it? You'd have to somehow capture what gets printed to the console, which
is awkward and fragile. The function reached out and grabbed a dependency (the screen) instead of letting
you choose one.

**Dependency injection** is the fix, and it's almost embarrassingly simple: instead of the function
*reaching for* the thing it writes to, you **pass that thing in as a parameter.**

```go
func Greet(writer io.Writer, name string) {
	fmt.Fprintf(writer, "Hello, %s", name)
}
```

Now *the caller* decides where the greeting goes. The function just writes to "whatever you handed me."
That handing-in is the whole idea. No framework, no container, no annotations — in Go, dependency
injection is just **passing an argument**.

---

## The star of the show: `io.Writer`

What *is* that `io.Writer` type? It's an **interface** — a contract that says "I am anything you can
write bytes to." Its entire definition in the standard library is four lines:

```go
type Writer interface {
	Write(p []byte) (n int, err error)
}
```

That's it. **Anything** with a `Write([]byte) (int, error)` method *is* an `io.Writer` — Go figures that
out for you, no "implements" keyword required. And a surprising number of things in the standard library
satisfy it:

| This value… | …is an `io.Writer`, so it can be the `writer` in `Greet` |
|-------------|----------------------------------------------------------|
| `os.Stdout` | writes to your terminal |
| `bytes.Buffer` | writes into an in-memory buffer (perfect for tests) |
| `http.ResponseWriter` | writes the body of an HTTP response |
| a file from `os.Create` | writes to disk |

This is the power of dependency injection meeting interfaces: write `Greet` **once**, against the
`io.Writer` contract, and the same function can print to the screen in `main`, capture into a buffer in
a test, and serve a web response — just by handing in a different writer. You didn't write three
functions. You wrote one, and let the caller plug in the destination.

---

## `fmt.Fprintf`: `Printf` that takes a destination

You already know `fmt.Printf`. Meet its cousin `fmt.Fprintf` — the `F` stands for "file," but really it
means "this version takes a **writer** as its first argument":

```go
fmt.Printf("Hello, %s", name)            // always goes to os.Stdout
fmt.Fprintf(writer, "Hello, %s", name)   // goes to whatever `writer` is
```

In fact, `fmt.Printf(...)` is just `fmt.Fprintf(os.Stdout, ...)` under the hood. The whole `fmt` family
has these `F` variants (`Fprintln`, `Fprint`, `Fprintf`) precisely *because* writing-to-a-destination is
such a common, useful shape. Learning `Fprintf` is learning the general case; `Printf` is the special
case that picked the destination for you.

---

## Worked example: same function, two destinations

```go
package main

import (
	"bytes"
	"fmt"
	"io"
	"os"
)

func Greet(writer io.Writer, name string) {
	fmt.Fprintf(writer, "Hello, %s", name)
}

func main() {
	// Destination 1: the terminal.
	Greet(os.Stdout, "world")

	fmt.Println() // just a newline to separate the two

	// Destination 2: an in-memory buffer we can inspect.
	var buf bytes.Buffer
	Greet(&buf, "buffer")
	fmt.Println("captured:", buf.String())
}
```

Output:

```text
Hello, world
captured: Hello, buffer
```

One `Greet`, two completely different destinations — and `Greet` neither knows nor cares which is which.
(Note the `&buf`: `bytes.Buffer`'s `Write` method has a pointer receiver, so we pass its address. You'll
meet receivers properly in the structs chapter; for now, just hand in `&buf`.)

---

## Prove it with a test

Here's where injection pays off immediately. Because `Greet` writes to *whatever you give it*, the test
hands it a `bytes.Buffer` — a writer you can read back — and checks the captured string:

```go
func TestGreet(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{name: "a name", in: "world", want: "Hello, world"},
		{name: "another name", in: "Go", want: "Hello, Go"},
		{name: "empty name", in: "", want: "Hello, "},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			buffer := bytes.Buffer{}
			Greet(&buffer, c.in)
			if got := buffer.String(); got != c.want {
				t.Errorf("Greet(buffer, %q) wrote %q; want %q", c.in, got, c.want)
			}
		})
	}
}
```

Notice how clean that is. No capturing of console output, no temp files, no mocking framework — just a
buffer you write into and read back. **That ease is not an accident; it's the reward for injecting the
dependency.** A function that reaches for `os.Stdout` on its own is hard to test. A function that takes a
writer is trivial to test. Testability is the canary: if something is painful to test, it's usually
because a dependency is hard-wired instead of handed in.

---

## 🏋️ Your rep — make it GREEN

Right now `di.go` has an empty body on purpose — it writes nothing, so the test sees an empty string
instead of `"Hello, world"` (that's the RED state):

```go
func Greet(writer io.Writer, name string) {
	// TODO(you): write "Hello, "+name to writer (hint: fmt.Fprintf)
}
```

Your job, in plain language:

1. Watch it fail (RED): `go test ./exercises/di/`
2. Inside `Greet`, call `fmt.Fprintf` with **three** things: the `writer` you were handed, the format
   string `"Hello, %s"`, and the `name`. (`%s` is the placeholder the `name` slots into.)
3. Make sure `fmt` is imported.
4. Run again → **GREEN**.

That's the entire function — one line. The lesson isn't the line; it's *why* the writer is a parameter.

### Stretch goals (ask your tutor to scaffold any)

- Write a `main` that calls `Greet(os.Stdout, "world")` so you see it print for real.
- Add a tiny HTTP handler: `func MyGreeterHandler(w http.ResponseWriter, r *http.Request) { Greet(w, "world") }`
  — and notice you reused `Greet` unchanged, because `http.ResponseWriter` is also an `io.Writer`.

---

## 🧠 Active recall — no peeking

1. In one sentence, what *is* dependency injection in Go — what do you do instead of reaching for a
   dependency?
2. What single method must a type have to be an `io.Writer`?
3. Name two different things you can pass as the `writer` to `Greet`, and what each one does with the output.
4. Why is a function that takes an `io.Writer` easier to test than one that calls `fmt.Printf` directly?

---

## 🔍 Real code in the wild

Open the standard library's [`fmt`](https://pkg.go.dev/fmt) package docs and look at the signatures.
You'll see the pattern you just learned, everywhere: `Fprintf(w io.Writer, format string, a ...any)`,
`Fprintln(w io.Writer, ...)`, `Fprint(w io.Writer, ...)`. The whole `F`-family is dependency injection
baked into the standard library — every one takes the destination as its first argument. Then peek at
[`io`](https://pkg.go.dev/io) itself: `io.Copy(dst Writer, src Reader)`, `io.WriteString(w Writer, ...)`.
Go's plumbing is built out of small interfaces handed in as arguments — exactly what you just did.

---

## What you learned

- **Dependency injection** is just **passing in** what a function depends on, instead of the function
  reaching for it itself. No framework needed — in Go it's a parameter.
- **`io.Writer`** is the "anything you can write bytes to" interface — one method, `Write([]byte) (int, error)`.
- `os.Stdout`, `bytes.Buffer`, `http.ResponseWriter`, and files **all** satisfy `io.Writer`, so one
  function works with all of them.
- **`fmt.Fprintf`** is `Printf` with a writer as its first argument; `Printf` is just the special case
  that picked `os.Stdout` for you.
- Injected dependencies make code **testable**: hand in a `bytes.Buffer` and read the result back.

✅ **Done when:** `go test ./exercises/di/` is GREEN and you can answer the four recall questions.

**Next:** Chapter 8 — *Mocking*, where we inject a dependency that does *nothing* — a stand-in we control
— so we can test code that would otherwise be slow, flaky, or talk to the real world.
