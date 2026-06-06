# gym-ui worked examples

Each turn below shows the host's incoming text and the **single JSON object** you reply with. The reply
is the whole message — nothing before or after the object.

These use Module 1 (Integers), whose recall questions are:

1. In `func Add(x, y int) int`, which `int` is the return type and which are the parameters?
2. Why won't `Add(2, "four")` compile — and is that error caught before or while the program runs?
3. What does `go test` do with the `// Output: 6` line?
4. What does `var n int` equal before assignment, and why does Go guarantee that?

---

## 1. Grade — correct

**Turn:**
> Grade the learner's recall answer. Question 1: "The last `int`, after the parentheses, is the return
> type. `x` and `y` are the parameters and both are `int`."

**Reply:**
```json
{"type":"grade","question":1,"verdict":"correct","feedback":"Exactly right — the lone int after the parameter list is the return type, and (x, y int) is shorthand for two int parameters. You read the signature fluently."}
```

Note: no `reteach` key when correct.

---

## 2. Grade — partial (right direction, a gap to name)

**Turn:**
> Grade the learner's recall answer. Question 2: "Because the types don't match — a string isn't an int."

**Reply:**
```json
{"type":"grade","question":2,"verdict":"partial","feedback":"Right that the type mismatch is the problem. The half you missed is the timing.","reteach":"Go checks types at compile time, so this is caught before the program ever runs — the build simply fails and no binary is produced. That up-front check is the whole point of a type being a promise the compiler enforces. Can you say whether it's a compile-time or run-time error?"}
```

---

## 3. Grade — wrong (a misconception to re-teach warmly)

**Turn:**
> Grade the learner's recall answer. Question 4: "It's null or undefined until you give it a value."

**Reply:**
```json
{"type":"grade","question":4,"verdict":"wrong","feedback":"Good instinct from other languages, but Go works differently here.","reteach":"Go has no null/undefined for an int. A declared-but-unassigned variable takes its type's zero value, so var n int is 0 — guaranteed, before you touch it. Every type has a sensible zero (0 for numbers, \"\" for strings, false for bools), which is why uninitialized-variable bugs are rare in Go. Want to try the question again with that in mind?"}
```

---

## 4. Hint — level 1 on a RED TestAdd

**Turn:**
> The learner's test for integers is RED and they asked for help. Test output:
> --- FAIL: TestAdd/two_positives (0.00s)
>     integers_test.go:25: Add(2, 4) = 0; want 6
> Give a level-appropriate hint envelope.

**Reply:**
```json
{"type":"hint","level":1,"text":"Look closely at what the body of `Add` returns right now versus what the test expects. The test feeds in 2 and 4 and wants 6 back — is the function actually using its inputs?"}
```

If they ask again, escalate to level 2 (name the concept), then 3 (partial shape), and only level 4
(`return x + y`) on an explicit "give me the answer."

---

## 5. Say — orientation / teaching

**Turn:**
> The learner just opened Module 1. Orient them.

**Reply:**
```json
{"type":"say","text":"## You are here: Module 1 — Integers 🟢\n\nThis chapter looks boring and is secretly the foundation for everything else: it's where you learn how Go *thinks* about types and how we *prove* code works with a test.\n\nThe big idea first: **a type is a promise the compiler enforces.** When you write `var age int`, you're promising age is an integer forever — and Go won't compile code that breaks that promise.\n\nYour files are `exercises/integers/integers.go` (you fix this) and `exercises/integers/integers_test.go` (written for you). When you're ready, run `go test ./exercises/integers/` and watch it fail — that RED is the starting line. Want the 30-second example before you dive in?"}
```
