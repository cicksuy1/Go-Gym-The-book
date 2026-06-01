# 16 · Reading files 🔴

> *Reading files sounds mundane — until you try to **test** it. Do you scatter sample files across your
> repo? Create temp directories in every test? Go's answer is one of its most elegant ideas: an
> **interface for "a filesystem."** Code that reads through that interface doesn't know or care whether the
> files live on a disk, inside your binary, or purely in memory. Suddenly file-reading code is as easy to
> test as a pure function.*

**What you'll build:** `NewPostsFromFS` — read every file in a filesystem and parse each into a `Post`
struct — tested entirely in memory, with no real files at all.

**Files for this chapter:** `exercises/files/files.go` (you fix this) · `exercises/files/files_test.go` (written for you).

---

## Where we're going

By the end of this chapter you'll be able to:

1. Explain why depending on the **`fs.FS` interface** beats hard-coding "read from the disk."
2. Use `fs.ReadDir` to list a filesystem and `Open` to read a single file.
3. Test file-reading code with `testing/fstest.MapFS` — an in-memory fake filesystem.
4. Parse a simple structured file into a struct, handling errors at each step.
5. Recognize where `embed` fits (bundling files *into* your binary).

---

## The big idea: depend on an interface, not the disk

The naive way to read files is to call `os.ReadFile("posts/hello.md")` directly. It works — but now your
code is welded to the real disk. To test it, you'd have to create actual files, clean them up, and hope the
test environment matches. Painful and flaky.

Go's fix: the standard library defines an **interface** for a filesystem, [`fs.FS`](https://pkg.go.dev/io/fs):

```go
type FS interface {
	Open(name string) (File, error)
}
```

Anything that can `Open` a file *by name* is an `fs.FS`. A real directory on disk is one (`os.DirFS`).
Files baked into your binary are one (`embed.FS`). And — crucially for testing — a map of fake files in
memory is one (`fstest.MapFS`). Your function takes the *interface*:

```go
func NewPostsFromFS(fileSystem fs.FS) ([]Post, error)
```

```text
   NewPostsFromFS(fs.FS) ──────────────┐
                                        │  "give me anything that can Open files"
        ┌──────────────┬────────────────┴───────────────┐
   os.DirFS (real disk)   embed.FS (in binary)   fstest.MapFS (in memory, for tests)
```

This is the **dependency-inversion** idea from the interfaces chapter, applied to the filesystem: your
logic depends on an abstraction, and *you* choose what to plug in. In production you pass a real directory;
in tests you pass a map. Same code, zero disk.

---

## Reading a filesystem: `ReadDir` and `Open`

Two calls do most of the work:

- `fs.ReadDir(fileSystem, ".")` — list the entries in a directory (`"."` is the root of the FS). It returns
  a slice of `DirEntry`, each with a `.Name()`.
- `fileSystem.Open(name)` — open one file, giving you something you can read (an `fs.File`, which is an
  `io.Reader`).

```go
dir, err := fs.ReadDir(fileSystem, ".")
// for each entry: fileSystem.Open(entry.Name()), read it, parse it
```

> **Trap — always close what you open, and check every error.** File operations fail for real reasons
> (missing file, permission denied). Each `Open` and `ReadDir` returns an `error` you must check and return
> up the chain. And after opening a file, `defer postFile.Close()` so it's released even if parsing fails.
> Sloppy file code leaks handles; careful file code closes them.

---

## Parsing one file

Our post files have a tiny, fixed format:

```text
Title: Post 1

body1
```

Line 1 is `Title: ` followed by the title. Then a blank line. Then everything else is the body. A
`bufio.Scanner` reads line by line, which makes this clean: read the first line and strip the `Title: `
prefix, skip the blank line, then collect the rest as the body. Putting that in a small helper —
`newPost(fileSystem, fileName)` — keeps `NewPostsFromFS` focused on *looping*, while `newPost` handles
*one* file. Small functions, one job each.

---

## Worked example: the fake filesystem

Here's the whole testing trick in a few lines — a filesystem that exists only in memory:

```go
fileSystem := fstest.MapFS{
	"hello world.md":  {Data: []byte("Title: Post 1\n\nbody1")},
	"hello-world2.md": {Data: []byte("Title: Post 2\n\nbody2")},
}
```

`fstest.MapFS` is a `map` from filename to file contents — and it satisfies `fs.FS`. Pass it straight to
`NewPostsFromFS` and your code reads it exactly as if it were a real directory, but with no setup, no
cleanup, and no disk. One more gift: `MapFS` lists its entries **sorted by name**, so results come back in
a predictable order you can assert against.

---

## Prove it with a test

`files_test.go` builds the `MapFS` above, calls `NewPostsFromFS`, and checks three things:

```go
if len(posts) != len(fileSystem) { ... }  // one Post per file
// posts[0].Title == "Post 1", posts[1].Title == "Post 2"
// posts[0].Body  == "body1",  posts[1].Body  == "body2"
```

Notice it uses `t.Fatalf` for the error and length checks (no point comparing titles if we got the wrong
number of posts) but `t.Errorf` for the individual fields (report *all* the mismatches at once). Choosing
`Fatal` vs `Error` deliberately is a small mark of a careful test.

---

## 🏋️ Your rep — make it GREEN

Right now `NewPostsFromFS` returns nil:

```go
func NewPostsFromFS(fileSystem fs.FS) ([]Post, error) {
	return nil, nil // TODO(you)
}
```

1. Watch it fail (RED): `go test ./exercises/files/`
2. Implement it with a recipe:
   1. Call `fs.ReadDir(fileSystem, ".")`. If it errors, return `nil, err`.
   2. Make an empty `[]Post`. Loop over the directory entries.
   3. For each entry, parse it into a `Post` (a `newPost(fileSystem, f.Name())` helper keeps this tidy):
      open the file with `fileSystem.Open(name)`, `defer` its `Close`, then read it.
   4. To parse: use a `bufio.Scanner` — first line gives the title (strip the `"Title: "` prefix), skip the
      blank line, and gather the remaining lines as the body.
   5. Append each `Post` and return the slice with a `nil` error.
   6. Bubble up any error from `Open` instead of ignoring it.
3. Run again → **GREEN**. You just read "files" without a single real file.

### Stretch goals (ask your tutor to scaffold any)

- Add a `Tags: ...` metadata line after the title and parse it into a `[]string` on `Post`.
- Bundle real `.md` files into the binary with `//go:embed posts` and pass that `embed.FS` to your function.

---

## 🧠 Active recall — no peeking

1. Why does `NewPostsFromFS` take an `fs.FS` interface instead of just reading from the disk directly?
2. Name three different things that satisfy `fs.FS` — including the one that makes testing easy.
3. What two `defer`/error habits keep file-reading code from leaking handles or swallowing failures?
4. Why can the test assert posts come back in a *specific order* when reading from `fstest.MapFS`?

---

## 🔍 Real code in the wild

Open [`io/fs`](https://pkg.go.dev/io/fs), [`embed`](https://pkg.go.dev/embed), and
[`testing/fstest`](https://pkg.go.dev/testing/fstest) in the standard library. They're three sides of one
idea: `io/fs` defines the *interface*, `embed` lets you bake real files into your binary as an `fs.FS`, and
`testing/fstest` gives you a fake `fs.FS` for tests. Web servers serve embedded assets through exactly this
interface. You just used the same abstraction that ships static sites inside a single Go binary.

---

## What you learned

- Depend on the **`fs.FS` interface**, not the disk — your code stops caring *where* files live.
- `fs.ReadDir(fsys, ".")` lists a filesystem; `fsys.Open(name)` reads one file.
- **`testing/fstest.MapFS`** is an in-memory filesystem, so file code is testable with zero disk and zero cleanup.
- **Check every error** from `Open`/`ReadDir`, and **`defer Close()`** what you open.
- Split looping (`NewPostsFromFS`) from parsing one file (`newPost`) — small functions, one job each.
- `embed` bundles real files *into* your binary as an `fs.FS`.

✅ **Done when:** `go test ./exercises/files/` is GREEN and you can answer the four recall questions.

**Next:** Chapter 17 — *Templating*, where `html/template` turns a `Post` into safe HTML.
