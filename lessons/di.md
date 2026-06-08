# 7 · Dependency Injection 🟢

> *"Dependency injection" sounds like enterprise jargon invented to make standups longer. It isn't.
> Strip the buzzwords away and it's one humble idea: **don't hard-wire what your function talks to —
> hand it in.** This chapter earns that idea the honest way: we'll write a function that's impossible
> to test, watch it fail in a genuinely surprising place, and let the failure push us — one compiler
> error at a time — to the fix. By the end you'll see that Go's standard library is built out of
> these hand-in points everywhere.*

**What you'll build:** `Greet` — a function that writes a greeting — written so it can print to the
screen, into a buffer, or straight down an HTTP connection **without changing a line**.

**Files for this chapter:** `exercises/di/di.go` (you fix this) · `exercises/di/di_test.go` (written for you).

---

## Where we're going

By the end of this chapter you'll be able to:

1. Explain what dependency injection actually *is*, minus the jargon — *passing in* a dependency
   instead of reaching for it.
2. Use `io.Writer` — one of the most important interfaces in Go — and explain *why* a buffer, the
   terminal, and a web response all satisfy it (chapter 4's "if it has the methods, it IS").
3. Tell the story of **why** a hard-wired `fmt.Printf` is untestable — not because someone said so,
   but because you watched the output land somewhere the test couldn't see.
4. Write one function and drive it from a test, a terminal, and an HTTP server with zero changes.
5. Answer the question everyone asks next — *if several types satisfy one interface, how does Go
   know which one to run?* — and put a name to it: **dynamic dispatch**.
6. Define your **own** one-method interface (not just borrow a standard-library one) and inject it.

A couple of new faces show up — `io.Writer`, `bytes.Buffer`, `fmt.Fprintf` — but they all hang off
**one mental picture** we build first and keep for the whole chapter. Halfway through we'll define
our own socket — a `Notifier` — to prove the idea was never about `io.Writer` in the first place.

---

## The big idea: hand it in, don't reach for it

Imagine a function that prints a greeting. The obvious first try reaches straight for the screen:

```go
func Greet(name string) {
	fmt.Printf("Hello, %s", name)
}
```

It works. Run it, and `Hello, world` appears in the terminal. But it has a hidden cost: it
**decided for you** where the output goes. The function reached out and grabbed a dependency — the
screen — without asking. That feels harmless right up until you ask one question: *how would you
test it?*

Sit with that for a second, because the honest answer is uncomfortable. The test would have to
somehow capture what gets printed to the console. Go's testing package has no "read the terminal"
helper, and for good reason — the terminal is shared, global, outside your control.

So you reason your way to a fair first attempt: *"fine — instead of the screen, I'll make `Greet`
write into something the test can hold and read back."* The standard library has exactly that:
`bytes.Buffer`, an in-memory bucket of bytes. Hand the buffer in as a parameter:

```go
func Greet(writer *bytes.Buffer, name string) {
	fmt.Printf("Hello, %s", name) // ← the body didn't change. Watch what happens.
}
```

The test passes a buffer in, lets `Greet` run, then reads the buffer back. Run it, and something
genuinely strange happens — read this output slowly:

```text
Hello, world
--- FAIL: TestGreet
    Greet(buffer, "world") wrote ""; want "Hello, world"
```

The greeting **printed** — there it is, first line of the output, sitting in your terminal. And the
test **failed**, because the buffer it handed in is empty. The function greeted the world and
ignored the destination it was given: `fmt.Printf` doesn't know about your buffer; it *always*
writes to the terminal. The output and the test went to two different places.

That double image — *it printed AND it failed* — is the whole argument for dependency injection,
compressed into three lines of test output. A hard-wired dependency doesn't make testing
inconvenient. It makes the thing you want to observe land somewhere your test can't reach.

The fix is to actually *use* what we were handed. `fmt` has a sibling of `Printf` that takes the
destination as its first argument:

```go
func Greet(writer *bytes.Buffer, name string) {
	fmt.Fprintf(writer, "Hello, %s", name) // write to the writer we were GIVEN
}
```

Now the bytes land in the buffer, the test reads them back, and it goes green. Done?

Not quite — we've over-corrected. Try to use this `Greet` in a real program:

```go
func main() {
	Greet(os.Stdout, "world")
}
```

```text
cannot use os.Stdout (variable of type *os.File) as *bytes.Buffer value in argument to Greet
```

The compiler is telling us we painted ourselves into a corner: by demanding a `*bytes.Buffer`, we
built a function that's great for the test and useless for the terminal. We swapped one hard-wired
destination for another.

Here's where it pays to read Go's own source. What is `fmt.Printf`, really? Its entire body is one
line:

```go
func Printf(format string, a ...any) (n int, err error) {
	return Fprintf(os.Stdout, format, a...)
}
```

`Printf` is just `Fprintf` with the destination pre-chosen for you. And look at `Fprintf`'s first
parameter: it isn't `*os.File`, and it isn't `*bytes.Buffer` — it's `io.Writer`. The standard
library hit our exact problem years ago and answered it with an **interface**: a parameter type
that means *"anything you can write bytes to."* Make `Greet` ask for the same thing:

```go
func Greet(writer io.Writer, name string) {
	fmt.Fprintf(writer, "Hello, %s", name)
}
```

And now both callers compile: the test hands in its buffer, `main` hands in `os.Stdout`, and
`Greet` serves them both without knowing the difference. Hold onto this picture — it's the
chapter's mental model:

```text
        ┌──────────────────────────────┐
        │  Greet(writer io.Writer, …)  │   ← a socket the shape of io.Writer
        └──────────────┬───────────────┘
                       │  any plug that fits:
       ┌───────────────┼────────────────────┐
  bytes.Buffer     os.Stdout        http.ResponseWriter
  (the test)       (the terminal)   (a web response)
```

**`Greet` exposes a socket. Anything with the right plug fits — and `Greet` never knows what's on
the other end.** That's dependency injection, the whole of it: the caller plugs in the destination;
the function writes to whatever it's handed. No framework, no container, no annotations — in Go,
dependency injection is **passing an argument**.

**Checkpoint:** a function that *reaches for* its dependency picks the destination for you and
hides its output from your tests; a function that takes an `io.Writer` lets the caller plug one
in. The socket is the whole idea.

One more thing that picture quietly hides — and it's the question everyone asks next. When the
caller plugs `os.Stdout` in, the `writer` parameter doesn't just hold *"a destination."* It
remembers *which concrete type* went in — a `*os.File` this time, a `*bytes.Buffer` the next —
carried alongside the value itself. So when `Greet` runs `writer.Write(...)`, Go looks at the type
riding inside `writer` and calls *that type's* `Write`. The choice is made while the program runs,
not when it compiles — the name for that is **dynamic dispatch**. *(Under the hood an interface
value is a pair: the concrete type plus the value — and that pairing is exactly how the call finds
the right method.)* It stays abstract here because both plugs do the same job; you'll *feel* it in a
moment, when two of your own types answer the same call differently.

---

## The details (with the traps called out)

### `io.Writer`: the socket's exact shape

What *is* the socket, precisely? Its entire definition in the standard library is four lines:

```go
type Writer interface {
	Write(p []byte) (n int, err error)
}
```

One method. That's the plug. Remember the headline idea from chapter 4 — **if it has the methods,
it IS the interface.** `bytes.Buffer` never declares `implements io.Writer` anywhere; it simply
*has* a `Write([]byte) (int, error)` method, so it *is* an `io.Writer`. So does `os.Stdout`. So
does an HTTP response. None of them know about each other, none of them know about `Greet`, and
yet they all fit the same socket — because fitting the socket only ever meant one thing: having
that one method.

### `fmt.Fprintf`: `Printf` that takes a destination

You've used `fmt.Printf` since chapter 1. `fmt.Fprintf` is the same machine with one extra knob —
the `F` historically stands for "file," but read it as "**first argument says where**":

```go
fmt.Printf("Hello, %s", name)            // always goes to os.Stdout
fmt.Fprintf(writer, "Hello, %s", name)   // goes to whatever `writer` is
```

Same `%s` verbs, same formatting rules you already know — one extra argument in front. And as you
saw above, `Printf` literally *is* `Fprintf(os.Stdout, ...)` under the hood. The whole `fmt` family
has `F` variants (`Fprintf`, `Fprintln`, `Fprint`) because writing-to-a-destination is that common
a shape. `Fprintf` is the general case; `Printf` is the special case that picked the socket's plug
for you.

### Trap: the concrete-type parameter

You already lived this one in the big idea, but it deserves its name, because it's the most common
way DI goes wrong in real code: typing the parameter as the *concrete thing you happen to test
with*.

```go
func Greet(writer *bytes.Buffer, name string) // works in the test…
Greet(os.Stdout, "world")                     // …breaks in main:
// cannot use os.Stdout (variable of type *os.File) as *bytes.Buffer value
```

A `*bytes.Buffer` parameter is a socket that accepts exactly one brand of plug. The rule that falls
out: **type the parameter as the interface, not the concrete type.** Ask for the capability you
need (`io.Writer` — "I need to write bytes somewhere"), not the gadget you first tested with.

### Trap: write to the writer, or return a string?

A fair question at this point: why doesn't `Greet` just *return* a string and let the caller print
it? Sometimes that's exactly right — a pure string-builder needs no writer at all, and chapter 4's
`fmt.Sprintf` move covers it. The difference shows up when the destination matters: returning a
string forces the caller to hold the whole result and then ship it somewhere, while writing to an
injected `io.Writer` streams the bytes straight to the terminal, the buffer, or the network
connection — whichever is plugged in. The exercise deliberately uses the *write* shape: that's why
the test reads a buffer back instead of comparing a return value.

### Trap: a socket with nothing plugged in

`io.Writer` is an interface value, and like the nil map in chapter 6, it has a treacherous zero
state: `Greet(nil, "world")` compiles without complaint and panics at the `Write` call. A socket
with nothing plugged in has nowhere to send the bytes. You won't hit this in the exercise — the
test always hands in a real buffer — but in larger programs the rule is the same as the nil map's:
the zero value of a handed-in dependency is something to check at the boundary, not to discover in
a stack trace.

**Checkpoint:** the socket is one method (`Write`); `Fprintf` is `Printf` plus a destination; type
the parameter as the interface or it works in the test and breaks in `main`; and never write to a
socket with nothing plugged in.

---

## Worked, runnable code: one socket, many plugs

Here's the finished shape, driven from two destinations in one program:

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
	// Plug 1: the terminal.
	Greet(os.Stdout, "world")

	fmt.Println() // just a newline to separate the two

	// Plug 2: an in-memory buffer we can inspect.
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

One `Greet`, two completely different destinations — and `Greet` neither knows nor cares which is
which. (Note the `&buf`: `bytes.Buffer`'s `Write` method has a pointer receiver — it has to mutate
the buffer's insides, the chapter 5 story — so we hand in the address.)

And the sockets don't stop at two. Every one of these is a plug that fits:

| This value… | …is an `io.Writer`, so it can be the `writer` in `Greet` |
|-------------|----------------------------------------------------------|
| `os.Stdout` | writes to your terminal |
| `bytes.Buffer` | writes into an in-memory buffer (perfect for tests) |
| `http.ResponseWriter` | writes the body of an HTTP response |
| a file from `os.Create` | writes to disk |

That third row is worth slowing down for, because it's the payoff of the whole chapter. This is a
complete HTTP handler:

```go
func greetHandler(w http.ResponseWriter, r *http.Request) {
	Greet(w, "world") // http.ResponseWriter has a Write method — same socket
}
```

You wrote `Greet` to escape a failing test. You never thought about the web while writing it. And
it serves an HTTP response **unchanged**, because `http.ResponseWriter` has a `Write` method, and
having the method is all the socket ever asked for.

```text
   bytes.Buffer ───────┐
   os.Stdout ──────────┼──▶  Greet(writer io.Writer, name)  ──▶  "Hello, " + name
   http.ResponseWriter ┘          (one function, never changed)
```

**Checkpoint:** one `Greet`, written against the socket, drives a test buffer, the terminal, and a
web response. You wrote one function and let the caller choose the destination.

---

## A socket you define yourself: `Notifier`

So far the socket has been `io.Writer` — the standard library's, handed to us ready-made. That's
convenient for learning, but it can also mislead: it's easy to walk away thinking dependency
injection is an `io.Writer` *thing*, tangled up with bytes and `Write` and `&buf`. It isn't. DI is a
*shape-of-function* idea, and the surest way to see that is to throw `io.Writer` away and build a
socket of your own — one with no bytes in sight.

Say a program registers users and wants to welcome them. The welcome might go out by email, or by
SMS, or by something not invented yet. So we don't hard-wire *how* — we define the capability and
ask for it:

```go
package main

import "fmt"

// The contract — anything that can notify.
type Notifier interface {
	Notify(message string)
}

// One real implementation — sends an email.
type EmailNotifier struct{}

func (e EmailNotifier) Notify(msg string) {
	fmt.Println("Sending email:", msg)
}

// Another real implementation — sends an SMS.
type SMSNotifier struct{}

func (s SMSNotifier) Notify(msg string) {
	fmt.Println("Sending SMS:", msg)
}

// The function — doesn't care HOW you notify, just that you can.
func RegisterUser(name string, notifier Notifier) {
	// ... registration logic ...
	notifier.Notify("Welcome, " + name + "!")
}

func main() {
	RegisterUser("Alice", EmailNotifier{})
	RegisterUser("Bob", SMSNotifier{})
}
```

```text
Sending email: Welcome, Alice!
Sending SMS: Welcome, Bob!
```

Same `Greet` move, zero bytes: `RegisterUser` exposes a socket shaped like `Notifier`, and the
caller plugs in whichever notifier it wants. `RegisterUser` writes its welcome and never learns
which channel carried it.

### How does it *know* which one to run?

Here's the question that trips everyone — worth asking out loud. `RegisterUser` was compiled long
before that first line of `main` ever named `EmailNotifier`. Its body says only `notifier.Notify(…)`.
So when it runs, **how does it know to send an email for Alice and an SMS for Bob?**

This is the dynamic dispatch from the big idea, now standing in front of you. The `notifier`
parameter carries whichever concrete type the caller passed — `EmailNotifier` for Alice,
`SMSNotifier` for Bob — riding along inside the interface value. When `RegisterUser` calls
`notifier.Notify(…)`, Go follows that carried-along type to *its* `Notify` method, and runs that one.
The same line of code reaches two different methods on two different calls, decided each time at
runtime by what was plugged in.

> You never chose the implementation *inside* `RegisterUser`. The caller chose it, and Go
> remembered. That's the whole trick: the function commits to the *capability*, the caller commits
> to the *implementation*, and dispatch wires them together while the program runs.

### No `implements` — having the method *is* the membership

Notice what's missing. Neither `EmailNotifier` nor `SMSNotifier` says anywhere that it's a
`Notifier`. There's no declaration of intent. Compare a language like Java, where the type has to
announce the relationship up front:

```java
// Java: you must declare it
class EmailNotifier implements Notifier { … }
```

```go
// Go: there is no "implements". Having the method IS implementing it.
type EmailNotifier struct{}
func (e EmailNotifier) Notify(msg string) { … }   // ← this method, and nothing else, makes it a Notifier
```

This is chapter 4's headline doing real work — *if it has the methods, it IS the interface.*
`EmailNotifier` became a `Notifier` the instant it had a `Notify(string)` method, with no ceremony
and no link back to the interface. That's why you can make a type from someone else's package
satisfy *your* interface: the interface only ever asked for a method, not a promise.

And to head off a common mix-up: this is **not** generics. There's no `[T any]`, no type parameter —
`RegisterUser` takes one fixed interface that many concrete types happen to satisfy. (Generics —
writing one function over *many* types via type parameters — are a later chapter and a different
tool.) What you're seeing here is **interface polymorphism**: one socket, many plugs.

### Making it testable — the same move, one level deeper

There's a quiet flaw in that tidy example, and it's the very flaw this chapter opened with.
`EmailNotifier.Notify` reaches straight for the screen with `fmt.Println` — exactly the hard-wiring
that made the first `Greet` impossible to test. Hand `RegisterUser` an `EmailNotifier` in a test and
the welcome prints to the console, where the test can't read it back.

The fix is the move you already know: don't let the notifier reach for `os.Stdout` — *inject* the
destination too. Give each notifier an `io.Writer` to write to:

```go
type EmailNotifier struct{ Out io.Writer }

func (e EmailNotifier) Notify(msg string) {
	fmt.Fprintln(e.Out, "Sending email:", msg)
}
```

Now a test can hand in a `bytes.Buffer` as `Out`, run `RegisterUser`, and read back exactly what was
sent — the same buffer trick that made `Greet` testable, nested one level in. The exercise's
notifiers are written this way, and that's how their test reads them. Two sockets stacked: inject
*which* notifier, and inject *where it writes*.

**Checkpoint:** this time you defined the socket (`Notifier`), two of your own types fit it just by
having the method, and the caller picked the plug — Go dispatched `Notify` to the right one at
runtime. Swap `fmt.Println` for an injected `io.Writer` and the whole thing is testable with a plain
buffer. No bytes were required to understand any of it; DI was never about `io.Writer`.

---

## Prove it with a test

Here's the actual test from `exercises/di/di_test.go` — the very journey from the big idea, now in
table-driven form:

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

			got := buffer.String()
			if got != c.want {
				t.Errorf("Greet(buffer, %q) wrote %q; want %q", c.in, got, c.want)
			}
		})
	}
}
```

Look at the third case: greeting the empty string must produce exactly `"Hello, "` — a comma, a
space, and *nothing after*. That case pins the format string down to `"Hello, %s"` with no trailing
`!` or `.` — add punctuation and this case goes red. Edge cases like this aren't pedantry; they're
the test writing the spec more precisely than prose could.

And notice how *clean* the whole thing is. No console capture, no temp files, no mocking framework
— just a buffer you write into and read back. **That ease is not an accident; it's the reward for
injecting the dependency.** You watched the alternative fail at the top of this chapter: the
hard-wired version greeted the terminal while the test stared at an empty buffer. Testability is
the canary — if something is painful to test, a dependency is usually hard-wired instead of handed
in.

The test file also carries an `ExampleGreet` — the example-that-doubles-as-documentation pattern
from chapter 1 — asserting that greeting `"world"` into a buffer reads back `Hello, world`.

`TestRegisterUser` works the exact same way, which is the point. It builds an `EmailNotifier` (then
an `SMSNotifier`) with its `Out` set to a `bytes.Buffer`, runs `RegisterUser("Alice", …)`, and reads
the buffer back — no console capture, no fake, just the buffer. And because it runs the *same*
`RegisterUser` call through both notifiers and checks that the email case reads `Sending email: …`
while the SMS case reads `Sending SMS: …`, the test is literally watching dynamic dispatch pick the
right method. The clean test is, again, the reward for injecting instead of hard-wiring.

---

## 🏋️ Your rep — make it GREEN

This chapter has **two** small functions to fill in, one for each socket you met.

**Rep 1 — `Greet` (the `io.Writer` socket).** Right now `di.go` has an empty body on purpose — it
writes nothing, so the test sees `""` instead of `"Hello, world"` (that's the RED state):

```go
func Greet(writer io.Writer, name string) {
	// TODO(you): write "Hello, "+name to writer (hint: fmt.Fprintf)
}
```

Your job, in plain language:

1. Watch it fail (RED): `go test ./exercises/di/` (run from the `go-gym` folder).
2. Inside `Greet`, call `fmt.Fprintf` with **three** things: the `writer` you were handed, the
   format string `"Hello, %s"`, and the `name`. (`%s` is the placeholder the `name` slots into.)
3. Make sure `fmt` is imported.
4. Run again → **GREEN**.

That's the entire function — one line. The lesson isn't the line; it's *why* the writer is a
parameter. You're filling in the socket's one job: write the bytes to whatever is plugged in.

**Rep 2 — `RegisterUser` (your own `Notifier` socket).** The same shape, no bytes. The `Notifier`
interface and the two notifiers (`EmailNotifier`, `SMSNotifier`, each writing to an injected
`io.Writer`) are written for you; `RegisterUser` is the empty one:

```go
func RegisterUser(name string, notifier Notifier) {
	// TODO(you): send "Welcome, <name>!" through the notifier (hint: notifier.Notify)
}
```

Your job: inside `RegisterUser`, call `notifier.Notify` with the string `"Welcome, " + name + "!"`.
One line again. The test runs your `RegisterUser` through *both* notifiers and checks that the email
case reads back `Sending email: Welcome, Alice!` and the SMS case `Sending SMS: …` — so the moment it
goes GREEN, you've watched dynamic dispatch send one call to two different methods.

### Stretch goals (ask your tutor to scaffold any)

- Write a `main` that calls `Greet(os.Stdout, "world")` so you see it print for real.
- Wire `Greet` into a real web server: an `http.HandlerFunc` that calls `Greet(w, "world")`, served
  with `http.ListenAndServe`, and hit it with your browser — the same function, now answering HTTP.
- Change your `Fprintf` to `Fprintln` and run the test. Watch which case goes red, and explain why
  — then change it back. (A safe way to *feel* how precisely the empty-name case pins the format.)
- Add a third notifier of your own (a `ConsoleNotifier`, say) and pass it to `RegisterUser` without
  touching `RegisterUser` at all — the proof that the socket is open to plugs it's never heard of.

---

## 🧠 Active recall — answer out loud, no peeking

1. In one sentence, what *is* dependency injection in Go — what do you do instead of reaching for a
   dependency?
2. What single method must a type have to be an `io.Writer` — and how does Go decide whether a type
   satisfies it, given there's no `implements` keyword?
3. Name three different things you can plug into `Greet` as the `writer`, and what each does with
   the output.
4. The first version of `Greet` called `fmt.Printf` and the test failed *even though the greeting
   visibly printed*. Where did the output go, and why couldn't the test see it?
5. If you type the parameter as `*bytes.Buffer` instead of `io.Writer`, the test passes but
   `Greet(os.Stdout, …)` won't compile. Why — and what's the rule that prevents it?
6. What's the relationship between `fmt.Printf` and `fmt.Fprintf`? Say (or write) the one line that
   makes `Greet` write `"Hello, "+name` to its writer.
7. You pass `EmailNotifier{}` to `RegisterUser`, and later `SMSNotifier{}`. The body of
   `RegisterUser` never changes. How does Go know to run the *email* `Notify` one time and the *SMS*
   `Notify` the next — and what's that mechanism called?
8. Go has no `implements` keyword. So what, exactly, makes `EmailNotifier` count as a `Notifier` —
   and why does that let a type from someone else's package satisfy an interface you wrote?

If any answer is fuzzy, scroll back up — that's the recall doing its job.

---

## 🔍 Real code in the wild

Open the standard library's [`fmt`](https://pkg.go.dev/fmt) package docs and look at the
signatures. You'll see the socket pattern everywhere: `Fprintf(w io.Writer, format string, a
...any)`, `Fprintln(w io.Writer, ...)`, `Fprint(w io.Writer, ...)` — the whole `F`-family takes
the destination as its first argument. The proof that this isn't a teaching metaphor: `fmt.Printf`'s
real body is the one-liner you read earlier — `return Fprintf(os.Stdout, format, a...)`. Go's own
print family is dependency injection with a default plugged in.

Then peek at [`io`](https://pkg.go.dev/io) itself: `io.Copy(dst Writer, src Reader)`,
`io.WriteString(w Writer, s string)`. Small interfaces, handed in as arguments — Go's plumbing is
sockets all the way down.

And the web: every HTTP handler you'll ever write receives an `http.ResponseWriter` — an
`io.Writer` by another name. The `Greet(w, …)` you wrote in this chapter is, structurally, a tiny
web handler. The function you debugged into existence to satisfy one test is the same shape that
serves most of the Go web.

---

## What you learned

- **Dependency injection** is just **passing in** what a function depends on, instead of the
  function reaching for it itself. No framework needed — in Go it's a parameter.
- A hard-wired dependency doesn't merely make testing awkward — it sends the output somewhere your
  test **can't see**. You watched it: the greeting printed *and* the test failed.
- **`io.Writer`** is the socket: "anything you can write bytes to," one method,
  `Write([]byte) (int, error)`, satisfied implicitly — if it has the method, it IS the interface
  (chapter 4's headline, now load-bearing).
- `os.Stdout`, `bytes.Buffer`, `http.ResponseWriter`, and files all fit the same socket — write
  `Greet` once and let the caller choose the plug.
- **Type the parameter as the interface, not the concrete type** — a `*bytes.Buffer` parameter
  works in the test and breaks in `main`.
- **`fmt.Fprintf`** is `Printf` plus a destination; `Printf` is the special case that picked
  `os.Stdout` for you — literally, in its one-line body.
- DI was never an **`io.Writer`** trick. You defined your *own* one-method socket — `Notifier` — and
  injected it the same way; the standard library's interfaces and yours work by identical rules.
- When several types satisfy one interface, Go decides *which* method to run **at runtime**, from the
  concrete type the caller plugged in — **dynamic dispatch**. The caller picks the implementation;
  the function only ever commits to the capability.

✅ **Done when:** `go test ./exercises/di/` is GREEN (both `Greet` and `RegisterUser`) and you can
answer the eight recall questions.

**Next:** Chapter 8 — *Mocking*, where we inject a dependency that does *nothing* — a stand-in we
control — so we can test code that would otherwise be slow, flaky, or talk to the real world.
