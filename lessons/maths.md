# 15 · Maths 🟡

> *Programmers love to joke that they got into code to **avoid** maths. But every game, chart, animation,
> and clock face is built on a little trigonometry — and Go's `math` package makes it painless. This
> chapter uses a friendly, concrete problem (where do the hands of a clock point?) to teach the `math`
> package, **radians**, and the one rule that trips everyone up: **never compare floats with `==`.***

**What you'll build:** three functions that compute the angle of a clock's second, minute, and hour hands
for any given time.

**Files for this chapter:** `exercises/maths/maths.go` (you fix this) · `exercises/maths/maths_test.go` (written for you).

---

## Where we're going

By the end of this chapter you'll be able to:

1. Use the `math` package — `math.Pi`, and the idea of `math.Sin`/`math.Cos` for later.
2. Think in **radians** instead of degrees, and know why maths code prefers them.
3. Turn "a fraction of the way around a circle" into an angle.
4. Compare floating-point numbers **safely**, with a tolerance instead of `==`.
5. Build each hand's angle on top of the previous one (seconds feed minutes feed hours).

---

## The big idea: an angle is "how far around the circle"

A clock face is a circle, and a full circle is **2π radians** (about 6.28). Forget degrees for a moment —
maths libraries everywhere speak radians, because the formulas come out clean. The whole problem reduces
to one question per hand: **what fraction of the way around the circle is it?** Multiply that fraction by
`2π` and you have the angle.

```text
   12 o'clock = 0 radians  (we measure CLOCKWISE from the top)
        │
        │  a full turn = 2π
   9 ───┼─── 3            quarter turn = π/2
        │
        6  = π  (half turn)
```

- The **second hand** sweeps a full circle every **60 seconds**. At 30 seconds it's halfway round — that's
  `π` radians (pointing straight down at the 6). At 15 seconds it's a quarter round — `π/2`.
- The **minute hand** sweeps a full circle every **60 minutes** — *plus* it creeps forward a tiny bit with
  every passing second (a real clock's minute hand isn't frozen between minutes).
- The **hour hand** sweeps a full circle every **12 hours** — *plus* it creeps forward with the minutes.

That "plus it creeps forward" is the elegant part: each hand's angle is built on the hand below it.

---

## The `math` package and `math.Pi`

You only need one thing from `math` for this chapter: the constant `math.Pi`. (The package also has
`math.Sin`, `math.Cos`, `math.Sqrt`, and dozens more — we'll lean on `Sin`/`Cos` only if you take the
stretch goal of turning an angle into an actual `(x, y)` point.)

```go
import "math"

fmt.Println(math.Pi)        // 3.141592653589793
fmt.Println(2 * math.Pi)    // a full circle in radians
```

One quiet Go detail you'll hit: `t.Second()` returns an `int`, but angles are `float64`. Go will **not**
auto-convert between numeric types (remember Chapter 1 — a type is a promise). So you must convert
explicitly: `float64(t.Second())`. Forget the conversion and the compiler stops you — which is the
compiler doing its job.

---

## Building the formulas

The cleanest way to write "fraction of the circle" for the second hand is:

```go
func secondsInRadians(t time.Time) float64 {
	return (math.Pi / (30 / float64(t.Second())))
}
```

That looks odd, so read it carefully. There are 30 seconds in *half* a circle (`π`). So the angle is
`π` divided by "how many half-circle-chunks fit before now." At 30 seconds: `30/30 = 1`, so `π/1 = π`.
At 15 seconds: `30/15 = 2`, so `π/2`. It's the same as `float64(t.Second()) * (math.Pi / 30)` — just
written a different way. (Both are *float* arithmetic: `t.Second()` is converted to `float64` first, so
nothing here is integer division.)

> **Float division by zero doesn't panic.** At `0` seconds you'd compute `30 / 0` — but because
> `t.Second()` is wrapped in `float64(...)`, the whole expression is float arithmetic, and IEEE-754 floats
> define `30.0 / 0.0` as `+Inf` (not a panic). Then `math.Pi / +Inf` is `0`, so the 0-seconds case
> correctly gives `0` radians. (Integer division by zero *would* panic — floats don't. Surprising the
> first time you see it.)

Each hand builds on the one below:

- `minutesInRadians` = the minute's own angle **plus** `secondsInRadians(t) / 60` (the seconds nudge it
  1/60th of the way to the next minute).
- `hoursInRadians` = the hour's own angle **plus** `minutesInRadians(t) / 12` (the minutes nudge it 1/12th
  of the way to the next hour). And the hour uses `t.Hour() % 12`, because a clock face wraps at 12.

---

## The float trap: never compare with `==`

This is the heart of the chapter. Floating-point numbers are **approximations**. `0.1 + 0.2` is not
exactly `0.3` in any language that uses IEEE 754 floats — it's `0.30000000000000004`. So if your test did
`if got == want`, it would fail on rounding dust even when your maths is right.

The fix is to compare with a **tolerance**: are the two numbers *close enough*?

```go
func roughlyEqual(a, b float64) bool {
	const tolerance = 1e-7
	return math.Abs(a-b) < tolerance
}
```

`math.Abs` gives the distance between the two numbers (always positive); if that distance is smaller than a
tiny threshold, we call them equal. **Any time you test float results, you need a helper like this.** It's
not a hack — it's the correct way to compare floats.

---

## Prove it with a test

`maths_test.go` is table-driven, with a `simpleTime(h, m, s)` helper that builds a `time.Time`, and it uses
`roughlyEqual` for every comparison. The cases are chosen to be *checkable by hand*:

```go
{simpleTime(0, 0, 30), math.Pi},       // 30s → half a circle → π
{simpleTime(0, 0, 0), 0},              // top of the minute → 0
{simpleTime(0, 0, 45), (math.Pi/2)*3}, // 45s → three-quarters round
```

Picking times whose angles you already know (30s = π, 15s = π/2) is what makes the test trustworthy: you're
checking the code against arithmetic you can verify in your head, not against the code's own output.

---

## 🏋️ Your rep — make it GREEN

Right now all three functions return `0`:

```go
func secondsInRadians(t time.Time) float64 { return 0 }
```

1. Watch it fail (RED): `go test ./exercises/maths/`
2. Implement the three functions:
   1. **`secondsInRadians`:** the second hand goes all the way round in 60 seconds. Compute the fraction of
      the circle and multiply by `2*math.Pi` (or use the `math.Pi / (30 / seconds)` form above). Remember
      `float64(t.Second())`.
   2. **`minutesInRadians`:** same idea for 60 minutes, **plus** `secondsInRadians(t) / 60` so the hand
      creeps with the seconds.
   3. **`hoursInRadians`:** same idea for 12 hours (use `t.Hour() % 12`), **plus** `minutesInRadians(t) / 12`.
3. Run again → **GREEN**. Watch the hand-checked cases (30s → π) pass exactly.

### Stretch goals (ask your tutor to scaffold any)

- Add `secondHandPoint(t time.Time) (x, y float64)` using `math.Sin(angle)` and `math.Cos(angle)` to turn
  the angle into a coordinate on the unit circle.
- Add a row proving the minute hand has *moved* at `0:00:30` (it's no longer exactly `0`).

---

## 🧠 Active recall — no peeking

1. A full circle is how many radians? What angle (in radians) does the second hand make at 30 seconds?
2. Why does the test use `roughlyEqual` instead of `==`? Give a concrete example of why `==` fails for floats.
3. `t.Second()` is an `int` and angles are `float64`. What must you write, and why won't Go do it for you?
4. Why does `minutesInRadians` add `secondsInRadians(t) / 60` instead of ignoring the seconds?

---

## 🔍 Real code in the wild

Open the standard library's [`math`](https://pkg.go.dev/math) package. You'll see `math.Pi`, `math.Sin`,
`math.Cos`, `math.Sqrt`, `math.Abs` — the exact toolkit real graphics, physics, and charting code reaches
for. Notice every function takes and returns `float64`: the whole package commits to one float type, which
is why your conversions (`float64(t.Second())`) were necessary. You just used the same package that powers
plotting libraries and game engines.

---

## What you learned

- A full circle is **2π radians**; an angle is just **"what fraction of the way around"** × 2π.
- The `math` package gives you `math.Pi` (and `Sin`/`Cos`/`Abs` for more).
- Go **won't auto-convert** numeric types — write `float64(t.Second())` explicitly.
- Each clock hand's angle **builds on the one below it** (seconds nudge minutes nudge hours).
- **Never compare floats with `==`** — use a tolerance via `math.Abs(a-b) < epsilon`.
- Float division by zero yields **±Inf**, not a panic (IEEE 754).

✅ **Done when:** `go test ./exercises/maths/` is GREEN and you can answer the four recall questions.

**Next:** Chapter 16 — *Reading files*, where `io/fs` lets us read a filesystem without ever touching a disk.
