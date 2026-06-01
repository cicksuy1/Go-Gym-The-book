# 5 · Pointers & errors 🟢

> *Two ideas that look unrelated turn out to be the backbone of everyday Go. **Pointers** are how a
> method changes the *real* thing instead of a throwaway copy. **Errors** are how Go says "this went
> wrong" — not by throwing, but by handing back a plain value you check. Master both here and Go's
> daily rhythm — `if err != nil` — stops being a mystery and starts being a comfort.*

**What you'll build:** a `Wallet` you can `Deposit` into and `Withdraw` from — where withdrawing too
much returns a real, checkable **error**.

**Files for this chapter:** `exercises/pointers/pointers.go` (you fix this) · `exercises/pointers/pointers_test.go` (written for you).

---

## Where we're going

By the end of this chapter you'll be able to:

1. Explain what a **pointer** is (`*T`, `&x`) without flinching.
2. Say *why* a method that needs to change its receiver must take a **pointer receiver** — and what
   silently goes wrong if it doesn't.
3. Treat an **error as a value**: returned, stored, compared — not thrown.
4. Create a **sentinel error** with `errors.New` and check for it with `errors.Is`.

One mental model carries the whole chapter: **a pointer receiver lets a method change the real thing,
not a copy.**

---

## The big idea: a copy can't change the original

You met this with arrays in Chapter 3: pass a value to a function and Go **copies** it. That copy is a
brand-new, separate thing. Scribble on the copy and the original is untouched.

This is usually exactly what you want — until you write a method whose *whole job* is to change
something. Picture a `Wallet`:

```go
type Wallet struct {
	balance int
}

func (w Wallet) Deposit(amount int) { // VALUE receiver — copies the wallet!
	w.balance += amount
}
```

Call `wallet.Deposit(10)` and... nothing happens. The balance stays `0`. Why? Because `(w Wallet)`
means `w` is a **copy** of your wallet. `Deposit` faithfully adds `10` — to the copy — and then the
copy is thrown away the instant the method returns. The real wallet never heard about it.

This is the single most common surprise for people new to Go methods. The fix is a **pointer**.

---

## What a pointer actually is

A value lives at some address in memory. A **pointer** is a value that *holds that address* — it
points at where the real thing lives, instead of being a copy of it.

```text
   balance (the real value)        a pointer to it
   ┌──────────────┐                ┌────────────┐
   │  10          │  ◀──────────── │  0xc000014 │
   └──────────────┘   "points at"  └────────────┘
     at address 0xc000014
```

Two operators are all you need:

- `&x` — "the **address of** `x`." It hands you a pointer to `x`.
- `*p` — "**follow** the pointer `p`" to read or write the value it points at. (This is called
  *dereferencing*.)

And the **type** of a pointer-to-`T` is written `*T`:

```go
x := 10
p := &x        // p is a *int — a pointer to x
fmt.Println(*p) // 10   — follow the pointer, read the value
*p = 20         // follow the pointer, WRITE through it
fmt.Println(x)  // 20   — we changed the real x!
```

That last line is the whole point. Because `p` *points at* `x`, writing through `p` changes `x`
itself — no copy in sight.

> **Coming from C?** Same `*` and `&`, but Go has no pointer arithmetic and a garbage collector, so
> the foot-guns are mostly gone. Coming from Python or JavaScript? You've used references the whole
> time without naming them; Go just makes the pointer *visible* so you can reason about it.

---

## Pointer receivers: letting a method change the real thing

Now back to the wallet. Put a `*` in front of the receiver type and the method receives a **pointer to
your wallet**, not a copy:

```go
func (w *Wallet) Deposit(amount int) { // POINTER receiver
	w.balance += amount                // changes the REAL wallet
}
```

`(w *Wallet)` means *"`w` is the address of the wallet I was called on."* So `w.balance += amount`
reaches through the pointer and updates the actual balance. Now `wallet.Deposit(10)` sticks.

One small grace from Go: you might expect to write `(*w).balance` to follow the pointer first. You
*can*, but Go lets you write plain `w.balance` and follows the pointer for you. Method calls work the
same way — you write `wallet.Deposit(10)`, not `(&wallet).Deposit(10)`; Go takes the address
automatically when the method needs one.

The rule of thumb you'll carry for the rest of the course:

> **If a method needs to change its receiver — or the receiver is big and you'd rather not copy it —
> use a pointer receiver.** When in doubt on a type that has *any* such method, make them all pointer
> receivers for consistency.

---

## Errors are values, not explosions

Many languages signal failure by **throwing** an exception that flies up the call stack until
something catches it. Go takes a deliberately different path: **a function that can fail returns an
`error` as an ordinary return value, and the caller checks it.**

```go
func (w *Wallet) Withdraw(amount int) error {
	if amount > w.balance {
		return errors.New("cannot withdraw, insufficient funds")
	}
	w.balance -= amount
	return nil // nil means "no error — all good"
}
```

`error` is just a type (an interface, which you met in Chapter 4 — anything with an
`Error() string` method satisfies it). A `nil` error means success. So the caller's job is the most
recognisable line in all of Go:

```go
err := wallet.Withdraw(100)
if err != nil {
	// handle it — log, return it upward, tell the user
}
```

Why values instead of exceptions? Because an error you *return* is impossible to ignore by accident —
it's right there in the signature, staring at every caller. The trade-off is those `if err != nil`
blocks. Go's bet is that **explicit and a little verbose beats invisible and surprising**, especially
in systems that must not silently swallow failures.

---

## Sentinel errors: a named error you can check for

Returning a fresh `errors.New("...")` string is fine until a caller needs to *react differently* to a
specific failure — "if it failed because of insufficient funds, show a top-up button." Comparing error
*strings* is fragile (reword the message and every check breaks). The idiomatic fix is a **sentinel
error**: a single named error value, declared once at package level.

```go
var ErrInsufficientFunds = errors.New("cannot withdraw, insufficient funds")

func (w *Wallet) Withdraw(amount int) error {
	if amount > w.balance {
		return ErrInsufficientFunds // return the SAME value every time
	}
	w.balance -= amount
	return nil
}
```

The `Err...` prefix is a strong Go convention — you'll see `io.EOF`, `sql.ErrNoRows`, and friends all
over the standard library. Now a caller checks for it with **`errors.Is`**:

```go
if errors.Is(err, ErrInsufficientFunds) {
	// definitely this specific failure — react precisely
}
```

> **Why `errors.Is` and not `==`?** For a bare sentinel, `err == ErrInsufficientFunds` would actually
> work. But Go lets errors be *wrapped* (one error carrying another inside it for context), and
> `errors.Is` knows how to unwrap and check the whole chain. So `errors.Is` is the habit to build — it
> keeps working when errors get wrapped later, and `==` does not.

---

## Worked example — run it in your head

```go
package main

import (
	"errors"
	"fmt"
)

type Wallet struct {
	balance int
}

var ErrInsufficientFunds = errors.New("cannot withdraw, insufficient funds")

func (w *Wallet) Deposit(amount int) { w.balance += amount }

func (w *Wallet) Withdraw(amount int) error {
	if amount > w.balance {
		return ErrInsufficientFunds
	}
	w.balance -= amount
	return nil
}

func main() {
	wallet := Wallet{}
	wallet.Deposit(100)

	if err := wallet.Withdraw(50); err != nil {
		fmt.Println("error:", err)
	}
	fmt.Println("balance:", wallet.balance)

	err := wallet.Withdraw(1000)
	fmt.Println("too much?", errors.Is(err, ErrInsufficientFunds))
	fmt.Println("balance:", wallet.balance)
}
```

```text
balance: 50
too much? true
balance: 50
```

Notice the balance stays `50` after the failed withdrawal: because we checked *before* subtracting,
the over-draw changed nothing. That "don't mutate on the error path" instinct is worth keeping.

---

## Prove it with a test

`pointers_test.go` pins down three things, and the third is the one that catches real bugs:

```go
t.Run("withdraw insufficient funds", func(t *testing.T) {
	wallet := Wallet{balance: 20}
	err := wallet.Withdraw(100)

	assertError(t, err, ErrInsufficientFunds) // the RIGHT error came back
	assertBalance(t, wallet, 20)              // and the balance DIDN'T change
})
```

Two small helpers (`assertBalance`, `assertError`) keep each case readable — a very common Go test
style. The error case asserts **both** halves of the contract: that you get `ErrInsufficientFunds`
back *and* that the wallet is untouched. Checking the error alone would let a buggy `Withdraw` (one
that subtracts *then* fails) slip through. A good test pins down the whole promise, not just the happy
path.

---

## 🏋️ Your rep — make it GREEN

`pointers.go` ships with empty/placeholder bodies on purpose:

```go
func (w *Wallet) Deposit(amount Bitcoin) {
	// TODO(you)
}

func (w *Wallet) Withdraw(amount Bitcoin) error {
	return nil // TODO(you)
}

func (w *Wallet) Balance() Bitcoin {
	return 0 // TODO(you)
}
```

1. Watch it fail (RED): `go test ./exercises/pointers/ -v` *(run it from the `go-gym` folder)*
2. Fill in the bodies:
   - `Deposit` adds `amount` to the balance.
   - `Withdraw` returns `ErrInsufficientFunds` if `amount` is more than the balance; otherwise
     subtracts and returns `nil`.
   - `Balance` returns the current balance.
   - They're all **pointer receivers** already — that's deliberate, so your changes actually stick.
3. Run again → **GREEN**.

> `Bitcoin` here is just `type Bitcoin int` — a named integer type, so `Deposit(10)` reads as money,
> not a bare number. It behaves exactly like an `int`.

### Stretch goals (ask your tutor to scaffold any)

- Add a `String() string` method on `Bitcoin` so it prints like `10 BTC` (Chapter 4's `Stringer` idea
  meets this chapter's pointers).
- Wrap the error with extra context using `fmt.Errorf("withdraw failed: %w", ErrInsufficientFunds)`
  and confirm `errors.Is` *still* finds the sentinel through the wrapping.

---

## 🧠 Active recall — no peeking

1. What do `&x` and `*p` each do? What's the *type* of `&x` when `x` is an `int`?
2. Why does a `Deposit` method with a **value** receiver leave the real balance unchanged?
3. In Go, how does a function signal that it failed — and what does a `nil` error mean?
4. What is a **sentinel error**, and why check it with `errors.Is` instead of `==`?

---

## 🔍 Real code in the wild

You just learned the rule "if a method changes its receiver, use a pointer receiver." The standard
library lives by it. Open [`sync.Mutex`](https://pkg.go.dev/sync#Mutex): its methods are
`func (m *Mutex) Lock()` and `func (m *Mutex) Unlock()` — **pointer receivers**, because locking has
to flip state on the *one real* mutex, never a copy (in fact, copying a `Mutex` after use is a bug the
`go vet` tool warns about). Same story with [`bytes.Buffer`](https://pkg.go.dev/bytes#Buffer): its `Write` method —
`func (b *Buffer) Write(p []byte) (int, error)` — has a pointer receiver, so the bytes accumulate in the
actual buffer.

And the error half is everywhere too: [`io.EOF`](https://pkg.go.dev/io#EOF) is the canonical sentinel —
`var EOF = errors.New("EOF")` — and idiomatic readers stop their loop with
`if errors.Is(err, io.EOF)`. The exact two patterns from this chapter, holding up real systems.

---

## What you learned

- A **pointer** (`*T`) holds the *address* of a value; `&x` takes an address, `*p` follows one.
- Passing a value **copies** it — so a method that must change its receiver needs a **pointer
  receiver** (`func (w *Wallet)`), which lets it change the **real** thing, not a copy.
- In Go, **errors are values**: a failing function *returns* an `error`; `nil` means success; callers
  check with `if err != nil`.
- A **sentinel error** is a named, package-level `errors.New(...)` value (`Err...` by convention) that
  callers can recognise — check it with **`errors.Is`**, which also sees through wrapped errors.

✅ **Done when:** `go test ./exercises/pointers/` is GREEN and you can answer the four recall questions.

**Next:** Chapter 6 — *Maps*, where we give our data keys and values, and meet Go's built-in
dictionary (plus the one initialization trap that catches everyone).
