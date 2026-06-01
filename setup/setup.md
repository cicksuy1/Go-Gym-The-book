# 0 · Setup — Install Go & Understand a Go Project 🟢

> *Before you can write Go, you need two things: Go on your machine, and a mental model of how a Go
> project is shaped. Most courses rush this and you spend the next month vaguely confused about
> `package`, `go.mod`, and why your files can suddenly see each other. We're going to make it click in
> ten minutes — and you'll build a tiny project with your own hands.*

**This module is hands-on.** Unlike every later chapter, there's no test to make pass here — you'll
*create a Go project yourself* in a scratch folder. That muscle (start a project from nothing) is worth
owning before we lean on the pre-made exercises.

---

## Where we're going

By the end you'll be able to:

1. Install Go and confirm it works.
2. Explain the three layers of every Go project: **module → package → files**.
3. Create a new project with `go mod init` and run it with `go run`.
4. Split code across **multiple files** and understand why they can see each other.
5. Make a **second package** and import it.
6. Know the handful of `go` commands you'll use every day.

---

## Step 1 — Install Go

Get Go from **<https://go.dev/dl/>** (the official installer for Windows/macOS/Linux), then open a fresh
terminal and check:

```text
go version
```

You should see something like `go version go1.26.x windows/amd64`. If you do — Go is installed and on
your `PATH`. That's the whole installation. 🎉

> No output / "command not found"? Close and reopen your terminal (the installer updates your `PATH`, but
> open terminals don't pick it up until restarted).

---

## The big idea: module → package → files

This is the model that makes everything else make sense. A Go project has **three nested layers**:

```text
   MODULE   ── your whole project. Defined by a go.mod file. Has a name + a Go version.
     │
     ├── PACKAGE  ── one folder = one package. The unit you import and reuse.
     │     │
     │     ├── file_a.go   ┐  all .go files in the folder share the SAME package,
     │     ├── file_b.go   ┘  so they can call each other's functions freely —
     │     └── file_c.go      no imports needed between files in the same package.
     │
     └── PACKAGE (another folder) ── imported by path from the module root.
```

Three rules to burn in:

1. **A module is your project.** Its `go.mod` file (created by `go mod init`) names it and pins a Go
   version. Everything below lives inside it.
2. **A folder is a package.** Every `.go` file in a folder must declare the *same* `package` name on its
   first line. The folder *is* the package.
3. **Files in the same package see each other automatically.** No imports, no `#include`, no ordering.
   If `file_a.go` and `file_b.go` are both `package shapes`, a function in one can call a function in the
   other directly. This surprises everyone at first — and then you love it.

---

## Step 2 — Make your first project

In a scratch folder (anywhere — *not* inside this course), run:

```text
mkdir hello && cd hello
go mod init example/hello
```

That second command creates a **`go.mod`** file:

```text
module example/hello

go 1.26
```

That's it — you now have a module named `example/hello`. The name is just an identifier (for real
projects it's usually a repo URL like `github.com/you/hello`, but anything works locally).

---

## Step 3 — `package main` and `func main`

Create **`main.go`** in that folder:

```go
package main

import "fmt"

func main() {
	fmt.Println("Hello, Go Gym!")
}
```

Run it:

```text
go run .
```

Output: `Hello, Go Gym!`

Two special names just did a lot of work:

- **`package main`** is the magic package name that means "this is a runnable program," not a library.
- **`func main()`** is the entry point — where a `main` program starts. Exactly one is required.

`go run .` compiled the package in the current folder and ran it. (For a permanent binary you'd use
`go build`, but `go run` is perfect while learning.)

---

## Step 4 — Multiple files, one package

Here's the part the question was really about. Add a **second file**, `greeting.go`, *next to* `main.go`:

```go
package main

func greeting(name string) string {
	return "Hello, " + name + "!"
}
```

Now change `main.go` to use it — **no import needed**:

```go
package main

import "fmt"

func main() {
	fmt.Println(greeting("Go Gym"))
}
```

`go run .` again → `Hello, Go Gym!`

Notice what just happened: `main.go` called `greeting()` from `greeting.go` with **zero ceremony**.
They're both `package main`, in the same folder, so they're literally the same package split across two
files. Go stitches them together for you. This is how real projects keep files small and focused without
a tangle of imports.

> Rule of thumb: split a package into multiple files when it helps *readability* (one file per topic).
> The compiler treats them as one anyway.

---

## Step 5 — A second package (and importing it)

When code is reusable, it goes in its own folder = its own package. Make a subfolder `mathx`:

```text
hello/
├── go.mod
├── main.go
├── greeting.go
└── mathx/
    └── mathx.go
```

`mathx/mathx.go`:

```go
package mathx

// Double returns n times two. Capital D = exported (visible outside the package).
func Double(n int) int {
	return n * 2
}
```

Use it from `main.go` by importing `module-name/folder`:

```go
package main

import (
	"fmt"

	"example/hello/mathx"
)

func main() {
	fmt.Println(greeting("Go Gym"))
	fmt.Println("double 21 =", mathx.Double(21))
}
```

`go run .` → 
```text
Hello, Go Gym!
double 21 = 42
```

You import a package by its **path from the module root** (`example/hello` + `/mathx`), and call its
functions with the package name as a prefix: `mathx.Double(...)`.

### Exported vs unexported — the capital-letter rule

You just used it: **`Double` starts with a capital letter, so it's *exported*** — other packages can see
it. A lowercase name like `greeting` is *unexported* — visible only inside its own package. That single
rule (Capitalized = public) is Go's entire access-control system. No `public`/`private` keywords.

---

## The `go` commands you'll actually use

| Command | What it does |
|---------|--------------|
| `go version` | Check your Go install. |
| `go mod init <name>` | Start a new module (creates `go.mod`). |
| `go run .` | Compile & run the package in this folder. |
| `go build` | Compile to an executable. |
| `go test ./...` | Run tests in this module (you'll live in this one from Module 1). |
| `go fmt ./...` | Auto-format your code to standard Go style. |

---

## 🏋️ Your rep — build it yourself

No test this time — *you* are the proof. From scratch, in a throwaway folder:

1. `go mod init example/playground`
2. Write `main.go` with `package main` + `func main` that prints something.
3. `go run .` and see your output.
4. Add a **second file** in the same package with a helper function; call it from `main` (no import).
5. Add a **subfolder package** with one **exported** (capitalized) function; import and call it.

If all five run, you understand Go project structure better than most people who've written Go for a
month. When you're done, tell your tutor and we'll roll into **Module 1 — Integers**, where the pre-made
exercise folders take over and you start the test-driven rhythm.

---

## 🧠 Active recall — answer without peeking

1. What file defines a **module**, and what does `go mod init` put in it?
2. What's the relationship between a **folder** and a **package**?
3. Two files in the same folder both say `package main`. Does one need to `import` the other to call its
   functions? Why / why not?
4. You wrote `func double(...)` in package `mathx` and another package can't see it. What one-character
   change fixes that, and what's the rule?

---

## 🔍 Real code in the wild — *this very course*

Look at the course you're in right now. The `integers/` folder is a package (`package integers`) made of
several `.go` files — `integers.go`, `integers_solution.go`, `integers_test.go` — all cooperating without
importing each other, exactly like you just learned. The whole `go-gym` folder is one **module** (open its
`go.mod`). You already understand the shape of the thing you're learning inside. That's the goal.

---

## What you learned

- **Install check:** `go version`.
- A Go project is **module → package → files**: `go.mod` defines the module; a **folder is a package**;
  files in the same package **see each other with no imports**.
- **`package main` + `func main`** make a runnable program; `go run .` runs it.
- Other packages are imported by **path from the module root** and used as `pkg.Func(...)`.
- **Capitalized names are exported** (public); lowercase are package-private.

✅ **Done when:** you've created a project from scratch, split it across files and a second package, and
run it — and can answer the four recall questions.

**Next:** Chapter 1 — *Integers*, where we meet Go's type system and write our first test.
