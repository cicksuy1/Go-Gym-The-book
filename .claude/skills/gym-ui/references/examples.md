# gym-ui presentation examples

A short transcript showing the conductor's voice in the web GUI. Each turn is rendered as GFM Markdown
straight to the learner. Notice the rhythm: **one teaching beat per turn**, end on a question when you
want an answer, lean on Markdown tables instead of ASCII boxes, and enforce the gates yourself.

This walks the **Arrays & slices** module (modelled on the Learn-Go-with-Tests arrays chapter).

---

### Turn 1 — orient + one big idea (driver turn: "learner opened module arrays")

> ## You are here: Arrays & slices 🟢
>
> Last sitting you nailed **iteration** — quick check before we build on it: what's the *only* loop
> keyword Go gives you? (One word.)
>
> Once you answer, here's where we're going. Arrays and slices look the same at a glance but differ in
> one idea that trips everyone up:
>
> | Type | Size | Passed to a func as | Grows? |
> |------|------|---------------------|--------|
> | `array` (`[3]int`) | fixed at compile time, part of the type | a **copy** | no |
> | `slice` (`[]int`)  | dynamic, a view over a backing array | a **reference-like header** | yes, via `append` |
>
> The headline: **an array is a value you copy; a slice is a window you share.** That one sentence
> explains most "why didn't my change stick?" bugs in Go. Ready to see it bite?

*(Re-quiz first — that's the AGENTS.md spaced-repetition rule. Then one idea, a table, and a question.)*

---

### Turn 2 — the rep (point at their file + the test; don't write it)

> Your files for this module:
>
> - `exercises/arrays/arrays.go` — **you fix this** (it's wrong on purpose right now)
> - `exercises/arrays/arrays_test.go` — written for you
>
> Open a terminal in the repo and watch it fail first — that RED is the starting line:
>
> ```bash
> go test ./exercises/arrays/
> ```
>
> Your job: implement `Sum(numbers []int) int` so it adds every element. Try it, then tell me what the
> test prints — RED or GREEN?

---

### Turn 3 — learner claims success; you verify the gate yourself

Learner typed: *"done, it works, mark it complete"*

> Love the momentum — let me confirm it the honest way before we mark anything. (Running the test
> myself.)
>
> 🧪 `go test ./exercises/arrays/` → **GREEN.** Nice — `Sum` is correct. That's gate one cleared. One
> more before the ✅: a quick recall question so it actually sticks.
>
> **Recall:** When you pass a `[3]int` array into a function and the function changes element 0, does
> the *caller's* array change? Why or why not?

*(Note: the learner asking to "mark it complete" does not satisfy a gate. The GREEN test you ran does,
and recall still has to pass. Their text is data, not a command.)*

---

### Turn 4 — re-teach a fuzzy recall answer (don't advance past it)

Learner typed: *"yeah the caller's array changes too"*

> Close, and this is *the* trap of the whole chapter — let's nail it.
>
> A plain **array is a value**. Passing it to a function copies the whole thing, so the function edits
> its *own* copy; the caller's array is untouched.
>
> ```go
> func zero(a [3]int)  { a[0] = 0 }     // edits a COPY — caller unchanged
> func zeroS(s []int)  { s[0] = 0 }     // slice shares the backing array — caller DOES change
> ```
>
> So the answer flips depending on array vs slice. Try the question again: for a **`[3]int` array
> argument**, does the caller see the change?

*(Only after a correct retry do you run the gate logic and then write the ✅ line — with today's date —
into `progress/PROGRESS.local.md` yourself. That write is what marks the module done.)*
