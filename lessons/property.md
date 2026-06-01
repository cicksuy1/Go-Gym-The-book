# 14 · Property-based tests 🔴

> *Every test you've written so far has been an **example**: "given *this* input, expect *that* output."
> Examples are great, but they only check the cases you happened to think of. **Property-based testing**
> flips the script: instead of checking specific answers, you state a **rule** that must hold for *every*
> input, and let the machine fire hundreds of random values at it. It finds the edge cases you'd never
> dream up — and Go ships the tool for it in the standard library.*

**What you'll build:** a Roman-numeral converter (`ConvertToRoman` / `ConvertFromRoman`) — and a test
that proves it correct over a thousand random numbers at once.

**Files for this chapter:** `exercises/property/property.go` (you fix this) · `exercises/property/property_test.go` (written for you).

---

## Where we're going

By the end of this chapter you'll be able to:

1. Explain the difference between **example-based** and **property-based** tests.
2. Spot a good **property** — a rule that's true for *all* valid inputs.
3. Use `testing/quick` to check a property against many random inputs.
4. **Constrain** the random inputs so `quick` only tests the range you actually support.
5. Build a small **lookup-table** algorithm (the Roman numeral table) that's easy to read and extend.

---

## The big idea: test the rule, not the example

A normal test says "`ConvertToRoman(4)` should be `"IV"`." Useful — but you can only write so many of those
by hand, and you'll miss the weird ones. A **property** is a statement that's true for *every* input, for
example:

> For any number `n` between 1 and 3999, converting it to Roman and back must give you `n` again.

That single sentence is worth a thousand hand-written cases, because a tool can generate a thousand random
`n`s and check the rule on each. This particular property has a name — a **round trip**: encode then decode
should return the original. Round trips are the easiest properties to find, and they catch an astonishing
number of bugs.

```text
   example test:   "4  →  IV"                 (one case you chose)
   property test:  "for ALL n: from(to(n)) == n"   (the rule itself, checked at random)
```

You don't replace examples with properties — you use **both**. Examples document the obvious cases and
make failures readable; properties hunt for the cases you didn't think of.

---

## The tool: `testing/quick`

Go's standard library has [`testing/quick`](https://pkg.go.dev/testing/quick). Its `quick.Check` function
takes a boolean-returning function — your property — and calls it with **randomly generated arguments**,
many times. If your function ever returns `false`, `Check` reports the input that broke it.

```go
assertion := func(n uint16) bool {
	return n+0 == n        // a trivially true property
}
quick.Check(assertion, nil) // runs it ~100 times with random uint16s
```

`quick` reads the *types* of your function's parameters and generates random values of those types — no
generator code required for the common cases. That's reflection (Chapter 11) working for you again.

> **The constraint trap.** Our converter only handles **1..3999** (classic Roman numerals don't go higher,
> and there's no zero). But `quick` will happily generate `0` or `70000`. We solve this two ways at once:
> we make the parameter a `uint16` (so it's already 0..65535, never negative), and inside the property we
> **skip** anything outside 1..3999 by returning `true` (a rule is vacuously satisfied for inputs it
> doesn't apply to). That keeps the test honest *and* in-range.

---

## The algorithm: a value→symbol table

The cleanest way to convert numbers to Roman numerals is a **lookup table**, ordered from largest to
smallest, including the "subtractive" pairs like `CM` (900) and `IV` (4):

```go
type romanNumeral struct {
	Value  int
	Symbol string
}

var allRomanNumerals = []romanNumeral{
	{1000, "M"}, {900, "CM"}, {500, "D"}, {400, "CD"},
	{100, "C"}, {90, "XC"}, {50, "L"}, {40, "XL"},
	{10, "X"}, {9, "IX"}, {5, "V"}, {4, "IV"}, {1, "I"},
}
```

**To Roman:** walk the table top to bottom; while the number is still `>=` the current value, append the
symbol and subtract the value. `1984` → `M` (984 left) → `CM` (84) → `L` (34) → `XXX` (4) → `IV` → done:
`MCMLXXXIV`.

**From Roman:** walk the same table; while the string *starts with* the current symbol, add the value and
strip that symbol off the front. The table order (longest/biggest first) makes `CM` get matched before `C`,
which is exactly what you want.

One table drives both directions — that's the elegance, and it's why the round-trip property holds.

---

## Prove it with a test

`property_test.go` has two parts:

1. **A small example table** — known pairs like `{4, "IV"}`, `{1984, "MCMLXXXIV"}` — checked **both ways**.
   These are your readable anchors: if one breaks, you see *exactly* which number and symbol disagree.
2. **The property test** using `quick.Check`:

```go
assertion := func(arabic uint16) bool {
	if arabic < 1 || arabic > 3999 {
		return true // out of range: rule doesn't apply, so it "passes"
	}
	roman := ConvertToRoman(int(arabic))
	return ConvertFromRoman(roman) == int(arabic)
}
quick.Check(assertion, &quick.Config{MaxCount: 1000})
```

`MaxCount: 1000` asks `quick` to try a thousand random numbers. Every one must round-trip. If your table
has a hole — say you forgot the `XL` row — `quick` will find a number that breaks and print it for you.

---

## 🏋️ Your rep — make it GREEN

Right now both functions lie:

```go
func ConvertToRoman(arabic int) string { return "" }
func ConvertFromRoman(roman string) int { return 0 }
```

1. Watch it fail (RED): `go test ./exercises/property/`
2. Implement both, using the table approach:
   1. Define the `romanNumeral` table (value + symbol), ordered **largest to smallest**, including the
      subtractive pairs (`CM`, `CD`, `XC`, `XL`, `IX`, `IV`).
   2. **`ConvertToRoman`:** for each table row, *while* `arabic >= row.Value`, append `row.Symbol` and
      subtract `row.Value`. (A `strings.Builder` keeps it tidy.)
   3. **`ConvertFromRoman`:** for each table row, *while* the string starts with `row.Symbol`
      (`strings.HasPrefix`), add `row.Value` and trim that prefix off (`strings.TrimPrefix`).
3. Run again → **GREEN**, including the thousand-case property. That green is hard-won confidence.

### Stretch goals (ask your tutor to scaffold any)

- Add a property that the Roman output **never** contains four identical symbols in a row (`IIII`, `XXXX`).
- Write your own `quick.Generator` so `quick` only ever generates numbers in 1..3999 (no skipping needed).

---

## 🧠 Active recall — no peeking

1. In one sentence, what's the difference between an example-based test and a property-based test?
2. What is the "round trip" property for the Roman converter, and why is it so good at finding bugs?
3. `quick` will generate `0` and `70000`. Name the two things this test does to stay within 1..3999.
4. Why is the numeral table ordered **largest to smallest** — what breaks if `C` comes before `CM`?

---

## 🔍 Real code in the wild

Open [`testing/quick`](https://pkg.go.dev/testing/quick) in the standard library. It's small, and now you
can read it: `Check` takes your property function, uses reflection to learn its argument types, calls
`quick.Value` to generate random inputs of those types, and runs your function `MaxCount` times. Property
testing isn't a heavyweight framework you bolt on — in Go it's a few hundred lines that ship with the
language. You just used a real, production testing tool.

---

## What you learned

- **Example tests** check specific cases; **property tests** check a *rule* over many random inputs.
- A great starter property is the **round trip**: `decode(encode(x)) == x`.
- `testing/quick`'s `quick.Check` generates random arguments from your function's types and runs it repeatedly.
- **Constrain** random inputs to your supported range (narrow the type, and skip out-of-range as vacuously true).
- A single **value→symbol lookup table**, ordered largest-first, can drive conversion in *both* directions.

✅ **Done when:** `go test ./exercises/property/` is GREEN and you can answer the four recall questions.

**Next:** Chapter 15 — *Maths*, where we use the `math` package and radians to model a clock face.
