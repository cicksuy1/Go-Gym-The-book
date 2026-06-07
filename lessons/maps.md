# 6 · Maps 🟢

> *Slices are great when you want the third thing, or the tenth thing. But real programs constantly ask a
> different question: "what's the value **for this key**?" — the price for a product code, the user for a
> session ID, the definition for a word. That's a **map**, and once it clicks you'll reach for it every
> single day.*

**What you'll build:** a `Dictionary` — a `map[string]string` that can `Search`, `Add`, `Update`, and
`Delete` words — and around it, the model of how Go's key→value lookups really work. Along the way you'll
watch this chapter's nastiest trap turn into its most useful idiom.

**Files for this chapter:** `exercises/maps/maps.go` (you fix this) · `exercises/maps/maps_test.go` (written for you).

---

## Where we're going

By the end of this chapter you'll be able to:

1. Declare and use a map (`map[K]V`), and apply the rule of thumb: **fields known at compile time →
   struct; keys that arrive at runtime → map**.
2. Use the **comma-ok idiom** (`v, ok := m[k]`) and say *why* the language gives reads a second answer.
3. Name the **three update semantics** — overwrite, insert-if-absent, combine — and say which one each
   `Dictionary` method implements.
4. Avoid the classic crash: **writing to a `nil` map panics** — and explain *why* from the map's nature.
5. Know that **map iteration order is random**, and design around it.
6. Define **methods on your own map type**, and give your package a **vocabulary of sentinel errors**.

A few new words here — comma-ok, nil map, sentinel vocabulary — but they all hang off **one mental
picture** we'll build first. Get the picture and every trap in this chapter becomes obvious instead of
surprising.

---

## The big idea: a labelled lookup you hold by a handle

Three ideas stack here. The first is what a map *is*, the second is how it *answers*, the third is what
you're actually *holding* — and that third one quietly explains every gotcha in this chapter.

**A map answers by label, not by position.** A slice answers "give me element 3." A **map** answers
"give me the value labelled `"dana"`." You hand it a key, it hands you back the value — no scanning, no
walking. Written `map[K]V`: `K` is the **key** type, `V` is the **value** type. A scoreboard mapping
player names to points is a `map[string]int`:

```text
   key            value
   "dana"   ──▶   14
   "rob"    ──▶    9
   "ken"    ──▶    5
```

Under the hood Go uses a hash table, so lookup stays fast no matter how many entries there are. One rule
falls straight out of that: looking up a key means finding the **equal** key — so the key type must be
**comparable** (usable with `==`). Strings, numbers, booleans: fine. Slices are *not* comparable, so
`map[[]int]string` won't compile.

**A map never says no — it says zero.** Ask a map for a key it doesn't have and it does **not** error,
panic, or complain. It answers *something*, always: the **zero value** of the value type (`0` for an
`int`, `""` for a `string`). That's a deliberate design choice — reads can't fail, so reading stays
one short expression. The cost is ambiguity: did `"dave"` score zero, or has he never played? For the
times that distinction matters, Go gives reads an *optional second answer* — a boolean — and that's the
comma-ok idiom you'll meet in the details.

**A map variable is a handle, not the table.** The variable you hold is *not* the hash table itself —
it's a small **handle** (internally, a pointer to the runtime's table structure) that *refers* to the
table living elsewhere. Assign a map to another variable, or pass it into a function, and you copy the
*handle* — never the data. Both copies point at the **same table**.

```text
   scores ──┐
            ├──▶  [ the one real table: "dana"→14, "rob"→9, ... ]
   backup ──┘     (backup := scores copies the handle, not the data)
```

Hold onto that picture. A handle can point at nothing, a handle is cheap to copy, and everyone who
copies it shares the same table — those three sentences *are* the next section's traps, before you've
even read them.

---

## The details (with the traps called out)

### Missing keys, comma-ok — and the flip

The "never says no" behaviour is the trap that bites everyone first. Read a missing key, get a quiet
zero value:

```go
scores := map[string]int{"dana": 14}
fmt.Println(scores["dave"]) // prints 0 — NOT an error. Zero points, or never played?
```

You can't tell "stored zero" from "not there" by the value alone. So a map read offers a **second,
optional return value** — a boolean that's `true` only if the key was really present:

```go
points, ok := scores["dave"]
if !ok {
	// "dave" was NOT in the map
}
```

This is *the* idiomatic way to read a map when "missing" matters, and `ok` is a Go convention you'll see
everywhere. Read the line as: *"give me the value, and tell me whether it was actually there."* When you
only care about membership — not the value — drop the value with the blank identifier:

```go
_, ok := scores["dana"] // is "dana" a key at all?
```

Your `Dictionary.Search` will lean on comma-ok: that boolean is the difference between "no such word"
and "a word whose definition happens to be empty."

And now the flip. The same behaviour that just bit you is also Go's best one-liner:

> **The trap, used on purpose, is the idiom.** Because a missing key reads as zero, you can update a key
> that *doesn't exist yet* without checking first:
>
> ```go
> scores["ken"] += 5   // "ken" missing → reads 0 → stores 5. No check, no crash.
> counts[word]++       // the entire word-frequency counter, in one line
> ```
>
> In many languages a counter needs "if the key is absent, insert 0 first." In Go, the zero value
> already *is* the starting point. Missing-reads-as-zero isn't a bug to route around — it's a feature
> you'll deliberately use within the week.

### Three ways to update — and which one you mean

Writing `m[k] = v` is easy. The interesting question is **what you intend** when the key might already
be there. There are exactly three answers, and naming them now will make your rep's methods feel
inevitable instead of arbitrary:

- **Overwrite.** Replace whatever was there; don't care about the old value. That's the raw write:

  ```go
  scores["dana"] = 14 // whatever dana had before, it's 14 now
  ```

  A map holds **one value per key** — writing an existing key always replaces. (Two keys can happily
  hold the same *value*, though.)

- **Insert-if-absent.** Only add the key if it's *new*; an existing entry must survive untouched.
  There's no special syntax — you compose it from comma-ok and a write:

  ```go
  if _, ok := scores["rob"]; !ok {
  	scores["rob"] = 9 // only runs if rob wasn't there
  }
  ```

- **Combine.** Fold the new value into the old one — and thanks to the flip above, the old one is a
  ready-to-use zero even when the key is brand new:

  ```go
  scores["ken"] += 5
  ```

Here's why this triad matters for the rep: **`Add` is insert-if-absent with a name for the failure**
(`ErrWordExists` instead of silently keeping the old definition), and **`Update` is
overwrite-only-if-present** (`ErrWordDoesNotExist` when there's nothing to update). The methods you're
about to write aren't new mechanics — they're these three intentions, given names and error reporting.

> **Map or struct?** Both group values. The rule of thumb: if the field names are **known when you
> write the program** (`Width`, `Height`), use a struct from chapter 4. If the keys **arrive while the
> program runs** (player names, words typed by a user), that's a map. A struct is a fixed form; a map
> is an open ledger.

### The nil map: a handle pointing at nothing

What's the zero value of a handle? A handle pointing at **nothing** — `nil`. Declare a map without
initializing it and that's exactly what you hold:

```go
var scores map[string]int // a nil handle — there is NO table behind it
```

Now apply the model. *Reading* from a nil map is safe — there's no table, so every key is simply
"missing," and missing reads return zero. Ranging over it is safe too: zero entries. But **writing**
needs a table to write *into*, and there isn't one — so Go panics at run time:

```go
v := scores["dana"]   // OK — 0, false: every key is missing
scores["dana"] = 14   // 💥 panic: assignment to entry in nil map
```

The rule: **never hold a nil map you intend to write to.** Create the table first, either way:

```go
scores := make(map[string]int) // empty table, ready to write
scores := map[string]int{}     // same thing, literal form
```

> Why does Go allow a `nil` map to exist at all if you can't write to it? Because reading is safe and
> common, and a `nil` map is a perfectly good "empty" to range over or look up in. You only have to
> remember to `make` it before the **first write**.

### Mutation without pointers, deletion, and order

The handle model pays off once more. Pass a map to a function and the function receives a *copy of the
handle* — which points at the **same table**. So the function can add, change, and delete entries and
the caller sees every change, no pointer required:

```go
func award(s map[string]int, player string) {
	s[player] += 10 // the caller's table changes — s is a handle to it
}
```

That's why every method on your `Dictionary` takes a plain `Dictionary` receiver — not `*Dictionary` —
and can still mutate it. (One nuance so the model stays honest: maps are reference-*like*, not reference
variables — reassigning the whole parameter, `s = anotherMap`, only repoints the *copy* of the handle;
the caller still holds the old one.)

Removing an entry is a **builtin**, not a method — `delete(m, key)`:

```go
delete(scores, "rob") // remove rob; a no-op if he was never there
```

Deleting a missing key is harmless — the same "never says no" philosophy as reads: you never have to
check first. And `len(m)` tells you how many entries the table currently holds.

Last trap: range over a map and the keys come out in a **random order — a different order each run**.
Go randomizes it *on purpose*, so nobody can accidentally ship code that depends on an order that was
never guaranteed. Need sorted output? Impose the order yourself — pull the keys out and sort them; the
modern one-liner is `slices.Sorted(maps.Keys(m))` (Go 1.23+). Never assume "first added comes out
first." It won't.

> One small struct cross-link: map *values* aren't addressable — if `m` is a `map[string]Rectangle`,
> then `m["a"].Width = 5` won't compile (the table is allowed to shuffle entries around in memory, so
> Go refuses to hand out their addresses). Read the whole value out, change it, store it back.

---

## Worked, runnable code

The scoreboard, end to end — all three update semantics, the flip, comma-ok, `delete`, `len`, and the
random order, in one program:

```go
package main

import "fmt"

func main() {
	scores := make(map[string]int) // empty table, ready to write

	scores["dana"] = 12 // overwrite semantics: set, no questions asked
	scores["dana"] = 14 // ...and writing again replaces: one value per key

	scores["ken"] += 5 // combine semantics — and the flip: "ken" was missing,
	//                    reads as 0, becomes 5. No check, no panic.

	if _, ok := scores["rob"]; !ok { // insert-if-absent semantics
		scores["rob"] = 9 // runs only because rob was new
	}

	// comma-ok: zero points, or never played?
	points, ok := scores["dave"]
	fmt.Printf("dave: points=%d ok=%v\n", points, ok)

	delete(scores, "rob") // builtin; harmless no-op if the key is absent
	fmt.Println("players:", len(scores))

	for player, points := range scores { // random order — varies between runs!
		fmt.Println(player, points)
	}
}
```

Output:

```text
dave: points=0 ok=false
players: 2
ken 5
dana 14
```

Run it twice and the last two lines may swap — that's the deliberate order randomization, live. And
notice `delete` is a **builtin** — you call `delete(m, key)`, not `m.delete(key)`.

---

## Methods on a map type, and a vocabulary of errors

Here's the Go move that makes this chapter more than "maps 101." You can give a `map` type a **name**
and hang **methods** on it:

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
It's the same "give your data a type, give the type methods" idea from the structs chapter, applied to a
map. And because a map receiver is a handle, these methods mutate the caller's dictionary with no
pointer in sight.

What error does `Search` return for a missing word? You built this exact tool last chapter: a
**sentinel error** — a package-level value created once with `errors.New`, matched by callers with
`errors.Is` (your `ErrInsufficientFunds`). This chapter adds the next step: not one sentinel, but a
**vocabulary** of them, one per distinct failure:

```go
var (
	ErrNotFound         = errors.New("could not find the word you were looking for")
	ErrWordExists       = errors.New("cannot add word because it already exists")
	ErrWordDoesNotExist = errors.New("cannot update word because it does not exist")
)
```

Why three errors instead of reusing one generic "not found"? Because **callers react differently to
different failures**. Picture a web app built on your dictionary: when a lookup hits `ErrNotFound` it
shows a "want to add this word?" page, but when an edit hits `ErrWordDoesNotExist` it shows an error
banner on the edit form. One vague error couldn't support either behaviour; a precise vocabulary makes
both a one-line `errors.Is` check.

Each method is one of the update semantics from the details, wearing a name and reporting its failure:

- **`Add` is insert-if-absent.** Comma-ok first; if the word is present return `ErrWordExists` (an
  existing definition must survive), otherwise set the key.
- **`Update` is overwrite-only-if-present.** The mirror image: if the word is *absent* return
  `ErrWordDoesNotExist`, otherwise set the key.
- **`Delete` just calls the builtin** `delete(d, word)` — deleting a missing key is already a safe
  no-op, so there's no failure to name.

The scoreboard showed you raw map mechanics; the rep is the next rung — giving a map a name, behaviour,
and a failure vocabulary of its own.

---

## Prove it with a test

`maps_test.go` is table-flavoured again, but with a twist: some cases check a **returned value** and
some check a **returned error**. So it leans on small helpers — `assertStrings`, `assertError`,
`assertNoError`, and `assertDefinition` — to keep each case readable:

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

Three things worth noticing:

- **`t.Helper()`** tells Go "this is a helper, not the test itself," so when an assertion fails the line
  number points at the *calling test case*, not at the helper. It makes failures readable.
- The error assertion uses **`errors.Is`**, exactly the matching you just met — proving the sentinels
  are checkable by identity, which is the whole reason we made them package-level values.
- **`assertDefinition` uses `Search` to verify `Add`** — a helper that checks one method *through*
  another. Once `Search` is trustworthy, it becomes the lens the rest of the suite looks through.

The interesting case is `Add` on a word that already exists: it must return `ErrWordExists` **and leave
the original definition untouched**. A test that only checked the error would miss a buggy `Add` that
errored *but overwrote anyway*. Good tests pin down both the signal and the side effect.

---

## 🏋️ Your rep — make it GREEN

`maps.go` returns the wrong things on purpose:

```go
func (d Dictionary) Search(word string) (string, error) {
	return "", nil // TODO(you): comma-ok the word; return ErrNotFound when missing
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

- Add a `Words() []string` method that returns the keys **sorted** — `slices.Sorted(maps.Keys(d))` —
  proving you understand that map order is random and must be imposed.
- Write `func CountWords(words []string) map[string]int` using nothing but `counts[w]++`, with a test.
  That's the flip from the details, now in your fingers. Bonus question: why does it never panic on a
  word it hasn't seen?
- Upgrade the three sentinel `var`s to **constants**: define `type DictionaryErr string` with an
  `Error() string` method, then declare the three errors as a `const` block of that type. The existing
  tests stay GREEN (the names don't change, and `errors.Is` still matches) — but now the errors are
  immutable. This is how *Learn Go with Tests* ships its dictionary.
- Make `Add` accept a word that already maps to the *same* definition without erroring (idempotent
  add) — and write the test first.

---

## 🧠 Active recall — answer out loud, no peeking

1. What does `m["missing"]` return when the key isn't in the map — and why is that a *design choice*
   rather than an error?
2. Write the comma-ok line that checks whether `"go"` is a key in `m` when you don't need its value.
   When is a plain `m[k]` read (no `ok`) actually fine?
3. `var scores map[string]int` — which of these is safe and which panics: reading `scores["dana"]`,
   ranging over `scores`, writing `scores["dana"] = 3`? What's the one-line rule that prevents the panic?
4. Name the three update semantics. Which one is the dictionary's `Add`? Which is `Update`?
5. Why does `counts[word]++` work even for a word that's never been seen? Which "trap" makes it possible?
6. A function receives a map and adds a key — the caller sees the change, with no pointer in sight.
   What, about what a map variable *is*, makes that true?
7. The dictionary has three sentinel errors instead of one generic `errors.New("error")`. Give a
   concrete situation where a caller needs to tell `ErrNotFound` apart from `ErrWordDoesNotExist`.

If any answer is fuzzy, scroll back up — that's the recall doing its job.

---

## 🔍 Real code in the wild

**The comma-ok idiom, fossilized into a real API.** The standard library's `os` package reads
environment variables two ways:

```go
func Getenv(key string) string          // "" for unset — OR for set-but-empty!
func LookupEnv(key string) (string, bool) // the bool says which
```

[`os.Getenv`](https://pkg.go.dev/os#Getenv) has exactly the ambiguity you met in the details — an empty
result might mean *unset* or *set to empty* — and [`os.LookupEnv`](https://pkg.go.dev/os#LookupEnv) is
the cure: it's the comma-ok idiom promoted to a function signature. You now know precisely why both
functions exist.

**Your Dictionary move, behind every Go web server.** [`net/http.Header`](https://pkg.go.dev/net/http#Header)
is declared as `type Header map[string][]string` — a *named map type with methods*, exactly what you
just built. And its methods are the update triad wearing HTTP clothes: `Set` is overwrite, `Add` is
combine (it appends to the values already there), `Get` is the read. The pattern you wrote in a teaching
exercise ships in the package that serves most of the Go web.

**The `maps` package.** The standard library's [`maps`](https://pkg.go.dev/maps) package is a toolbox
over exactly the model you learned: `maps.Keys` and `maps.Values` (iterators since Go 1.23),
`maps.Clone` for a shallow copy — of the *table*, this time, not just the handle — and `maps.Equal` to
compare two maps. And because iteration order is random (still, always), the sorted-keys one-liner you'll
type for the rest of your Go life is `slices.Sorted(maps.Keys(m))`.

---

## What you learned

- A **map** (`map[K]V`) answers by **label, not position**; keys must be **comparable**. Fields known at
  compile time → struct; runtime keys → map.
- A map **never says no — it says zero**: missing reads return the zero value. When "missing" matters,
  the **comma-ok idiom** (`v, ok := m[k]`) gives you the second answer.
- The same behaviour, flipped, is the idiom: `counts[word]++` works on unseen keys *because* missing
  reads as zero.
- A map variable is a **handle to the table**, not the table — which explains all three traps: a `nil`
  handle reads safely but **panics on write** (`make` first); functions **mutate without pointers**
  (they share the table); copying a map copies the handle.
- Every write means one of **three semantics** — overwrite, insert-if-absent, combine — and the
  dictionary's `Add`/`Update` are the middle two with names and errors.
- **Iteration order is random** by design; impose order with `slices.Sorted(maps.Keys(m))`.
- A named map type carries **methods**, and a **vocabulary of sentinel errors** (matched with
  `errors.Is`) lets callers react differently to different failures.

✅ **Done when:** `go test ./exercises/maps/` is GREEN and you can answer the seven recall questions.

**Next:** Chapter 7 — *Dependency Injection*, where we stop hard-wiring our dependencies and start passing
them in — making code testable without touching the real world.
