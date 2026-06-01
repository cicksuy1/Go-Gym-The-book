# 6 · Maps 🟢

> *Slices are great when you want the third thing, or the tenth thing. But real programs constantly ask a
> different question: "what's the value **for this key**?" — the price for a product code, the user for a
> session ID, the definition for a word. That's a **map**, and once it clicks you'll reach for it every
> single day.*

**What you'll build:** a `Dictionary` — a `map[string]string` that can `Search`, `Add`, `Update`, and
`Delete` words — and around it, the model of how Go's key→value lookups really work.

**Files for this chapter:** `exercises/maps/maps.go` (you fix this) · `exercises/maps/maps_test.go` (written for you).

---

## Where we're going

By the end of this chapter you'll be able to:

1. Declare and use a map (`map[K]V`) and explain when it beats a slice.
2. Use the **comma-ok idiom** (`v, ok := m[k]`) and say *why* it matters.
3. Avoid the classic crash: **writing to a `nil` map panics** — you must `make` it first.
4. Know that **map iteration order is random**, and design around it.
5. Define **methods on your own map type**, and return **sentinel errors** with `errors.New`.

---

## The big idea: a map is a labelled lookup

A slice answers questions by **position**: "give me element 3." A **map** answers questions by **key**:
"give me the value labelled `"banana"`." You hand it a key, it hands you back the value — fast, no
scanning.

Written `map[K]V`: `K` is the **key** type, `V` is the **value** type. For our dictionary, the key is the
word and the value is its definition, so the type is `map[string]string`:

```text
   key            value
   "go"     ──▶   "a statically typed, compiled language"
   "rust"   ──▶   "a language focused on safety and speed"
   "slice"  ──▶   "a window onto a backing array"
```

You don't search this thing by walking it. You ask it directly: `m["go"]`. Under the hood Go uses a hash
table, so that lookup is fast no matter how many entries you have. That's the whole appeal: **direct
access by a meaningful label instead of a numeric position.**

A small rule that saves grief: the key type must be **comparable** (you can use `==` on it). Strings,
numbers, and booleans are fine. Slices are *not* comparable, so `map[[]int]string` won't compile.

---

## The details (with the traps called out)

### Reading a key that isn't there returns the zero value

This is the trap that bites everyone. Read a missing key and Go does **not** error — it quietly hands
back the **zero value** for the value type:

```go
m := map[string]string{"go": "a language"}
fmt.Println(m["python"]) // prints "" — NOT an error, just the zero value
```

So `""` could mean "the definition is the empty string" *or* "this word isn't here at all." You can't
tell the two apart from the value alone. That ambiguity is exactly what the next idea fixes.

### The comma-ok idiom: did the key actually exist?

A map read has a **second, optional return value** — a boolean that's `true` only if the key was really
present:

```go
value, ok := m["python"]
if !ok {
    // the key was NOT in the map
}
```

This is *the* idiomatic way to read a map when "missing" matters. The name `ok` is a Go convention
(you'll see it everywhere). Read the line as: *"give me the value, and tell me whether it was actually
there."* For a dictionary, that boolean is the difference between "no such word" and "a word with an
empty definition" — so `Search` will lean on it.

### Writing to a `nil` map panics

A map's zero value is `nil`, and a `nil` map is **read-only**. Reading from it is fine (every key is
"missing"), but **writing to it panics at run time**:

```go
var m map[string]string // nil
v := m["go"]            // OK — returns "", false
m["go"] = "a language"  // 💥 panic: assignment to entry in nil map
```

The fix is to create the map before you write to it, with the builtin `make` or a literal:

```go
m := make(map[string]string) // empty, ready to write
n := map[string]string{}     // same thing, literal form
```

> Why does Go allow a `nil` map to exist at all if you can't write to it? Because reading is safe and
> common, and a `nil` map is a perfectly good "empty" to range over or look up in. You only have to
> remember to `make` it before the **first write**.

### Iteration order is random — on purpose

Range over a map and the keys come out in a **random order**, and a *different* order each run:

```go
for word, definition := range m {
    fmt.Println(word, definition)
}
```

Go deliberately randomizes this so you never accidentally write code that depends on map order — because
there is no order to depend on. If you need sorted output, pull the keys into a slice and sort them; the
modern one-liner is `slices.Sorted(maps.Keys(m))` (Go 1.23+). Never assume "the first one I added comes
out first." It won't.

### Maps are reference-like — no pointer needed to mutate

One convenient surprise: a map value already refers to the underlying data, so a function (or a method)
that receives a map can add to and delete from it, and the caller sees the change — no pointer required.
That's why every method on our `Dictionary` below takes a plain `Dictionary` receiver, not a `*Dictionary`,
and can still modify it.

---

## Worked, runnable code

```go
package main

import "fmt"

func main() {
    // make a map and fill it
    capitals := make(map[string]string)
    capitals["France"] = "Paris"
    capitals["Japan"] = "Tokyo"

    // direct lookup by key
    fmt.Println(capitals["Japan"]) // Tokyo

    // comma-ok: distinguish "missing" from "empty"
    city, ok := capitals["Mars"]
    fmt.Printf("city=%q ok=%v\n", city, ok) // city="" ok=false

    // delete a key (builtin)
    delete(capitals, "France")
    _, stillThere := capitals["France"]
    fmt.Println("France still there?", stillThere) // false

    fmt.Println("entries:", len(capitals)) // 1
}
```

Output:

```text
Tokyo
city="" ok=false
France still there? false
entries: 1
```

Notice `delete` is a **builtin** — you call `delete(m, key)`, not `m.delete(key)`. Deleting a key that
isn't there is a harmless no-op, so you never have to check first.

---

## Defining methods on a map type, and sentinel errors

Here's the Go move that makes this chapter more than "maps 101." You can give a `map` type a **name** and
hang **methods** on it:

```go
type Dictionary map[string]string

func (d Dictionary) Search(word string) (string, error) {
    definition, ok := d[word]
    if !ok {
        return "", ErrNotFound
    }
    return definition, nil
}
```

`Dictionary` *is* a map — you can still index it, range it, `len` it — but now it also has behaviour.
This is the same "give your data a type, give the type methods" idea from the structs chapter, applied to
a map.

`Search` returns `(string, error)` — the value, plus an error that's `nil` on success. But what error do
we return when the word is missing? We use a **sentinel error**: a single, package-level error value
created once with `errors.New`, that callers can check for by identity.

```go
import "errors"

var ErrNotFound = errors.New("could not find the word you were looking for")
```

Why a shared variable instead of a fresh `errors.New("not found")` each time? Because callers need to
**recognize** the error, not just print it:

```go
_, err := d.Search("ghost")
if errors.Is(err, ErrNotFound) {
    // handle "missing word" specifically
}
```

`errors.Is` compares against the sentinel by identity. A new error string built on the fly couldn't be
matched this way. Sentinel errors give your package a small, stable vocabulary of failure modes — and
`Add` and `Update` will each get their own:

```go
var ErrWordExists       = errors.New("cannot add word because it already exists")
var ErrWordDoesNotExist = errors.New("cannot update word because it does not exist")
```

Each method uses comma-ok to decide which sentinel (if any) to return:

- **`Add`** must *not* overwrite an existing word — so it checks `_, ok := d[word]`; if `ok`, return
  `ErrWordExists`, otherwise set the key.
- **`Update`** must only change a word that's *already there* — the mirror image: if `!ok`, return
  `ErrWordDoesNotExist`, otherwise set the key.
- **`Delete`** just calls the builtin `delete(d, word)` — no error to report.

---

## Prove it with a test

`maps_test.go` is table-flavoured again, but with a twist: some cases check a **returned value** and some
check a **returned error**. So it leans on two tiny helpers, `assertStrings` and `assertError`, to keep
each case readable:

```go
func assertStrings(t testing.TB, got, want string) {
    t.Helper()
    if got != want {
        t.Errorf("got %q want %q", got, want)
    }
}

func assertError(t testing.TB, got, want error) {
    t.Helper()
    if !errors.Is(got, want) {
        t.Errorf("got error %q want %q", got, want)
    }
}
```

Two things worth noticing:

- **`t.Helper()`** tells Go "this is a helper, not the test itself," so when an assertion fails the line
  number points at the *calling test case*, not at the helper. It makes failures readable.
- The error assertion uses **`errors.Is`**, exactly the matching you just met — proving the sentinels are
  checkable by identity, which is the whole reason we made them package-level values.

The interesting case is `Add` on a word that already exists: it must return `ErrWordExists` **and leave
the original definition untouched**. A test that only checked the error would miss a buggy `Add` that
errored *but overwrote anyway*. Good tests pin down both the signal and the side effect.

---

## 🏋️ Your rep — make it GREEN

`maps.go` returns the wrong things on purpose:

```go
func (d Dictionary) Search(word string) (string, error) {
    return "", nil // TODO(you): use comma-ok; return ErrNotFound when missing
}
```

1. Watch it fail (RED): `go test ./exercises/maps/ -v`  *(run it from the `go-gym` folder)*
2. Fill in the four methods:
   - `Search` — comma-ok the word; return its definition, or `ErrNotFound`.
   - `Add` — comma-ok; if present return `ErrWordExists`, else `d[word] = definition`.
   - `Update` — comma-ok; if absent return `ErrWordDoesNotExist`, else set it.
   - `Delete` — call the builtin `delete(d, word)`.
3. Run again → **GREEN**. That RED→GREEN flip is the engine of this whole course.

Type it yourself. Reading builds recognition; *writing* builds skill.

### Stretch goals (ask your tutor to scaffold any)

- Add a `Count() int` method that returns `len(d)`, with its own test.
- Make `Add` accept a word that already maps to the *same* definition without erroring (idempotent add) —
  and write the test first.
- Add a `Words() []string` that returns the keys **sorted** (`sort.Strings`), proving you understand that
  map order is random and must be imposed.

---

## 🧠 Active recall — answer out loud, no peeking

1. What does `m["missing"]` return when the key isn't in the map — an error, or something else?
2. Write the comma-ok line that tells you whether `"go"` is a key in `m`. What is `ok` for?
3. Why does `var m map[string]string; m["x"] = "y"` panic, and what one builtin fixes it?
4. Why do we make `ErrNotFound` a package-level variable instead of building a fresh error each call?

If any answer is fuzzy, scroll back up — that's the recall doing its job.

---

## 🔍 Real code in the wild

Open the standard library's [`maps`](https://pkg.go.dev/maps) package. It's a toolbox built on exactly
the model you just learned: `maps.Keys` and `maps.Values` give you the keys/values of any `map[K]V`,
`maps.Clone` makes a shallow copy, `maps.Equal` compares two maps — all generic over `K` and `V`. Since
**Go 1.23**, `maps.Keys` returns an *iterator* (map order is random, remember), so to get sorted keys you
write `slices.Sorted(maps.Keys(m))`. You now read those signatures fluently. The comma-ok
idiom you wrote in `Search` is the same one the standard library uses internally everywhere it asks "is
this key present?"

---

## What you learned

- A **map** (`map[K]V`) is a fast **key→value lookup** — direct access by a meaningful label, not a
  position. The key type must be **comparable**.
- Reading a missing key returns the **zero value**, not an error — so use the **comma-ok idiom**
  (`v, ok := m[k]`) when "missing" matters; `ok` tells you if the key was really there.
- A `nil` map is read-only: **writing to it panics**. `make` (or a literal) before the first write.
- **Iteration order is random** by design — sort keys yourself if you need order.
- You can name a map type and give it **methods**; a map receiver can mutate the map without a pointer.
- **Sentinel errors** (`errors.New`, package-level) give callers a stable vocabulary they match with
  `errors.Is`.

✅ **Done when:** `go test ./exercises/maps/` is GREEN and you can answer the four recall questions.

**Next:** Chapter 7 — *Dependency Injection*, where we stop hard-wiring our dependencies and start passing
them in — making code testable without touching the real world.
