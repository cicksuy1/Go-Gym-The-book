# 5 · Pointers & errors 🟢

> *Last chapter ended on a promise: there's a second kind of receiver, for methods that need to
> **change** the original instead of reading it. This is that story — and we'll let it ambush us
> properly. You'll write a method that looks perfectly correct, watch its test fail anyway, and then
> catch the culprit red-handed by printing two memory addresses. The fix is the pointer. And riding
> alongside it comes Go's other everyday backbone: **errors as values** — failure you return and
> check, not throw and hope. Master both and Go's daily rhythm — `if err != nil` — stops being a
> mystery and starts being a comfort.*

**What you'll build:** a `Wallet` you can `Deposit` into and `Withdraw` from — where withdrawing too
much returns a real, checkable **error** and leaves the money untouched.

**Files for this chapter:** `exercises/pointers/pointers.go` (you fix this) · `exercises/pointers/pointers_test.go` (written for you).

---

## Where we're going

By the end of this chapter you'll be able to:

1. Explain what a **pointer** is (`&x`, `*p`, `*T`) — and prove, with two printed addresses, why a
   method on a value receiver was changing a copy all along.
2. Use a **pointer receiver** so a method changes the *real* thing — and say when each kind of
   receiver is right.
3. Give a bare number domain meaning with a **named type** (`type Bitcoin int`).
4. Treat an **error as a value**: returned, stored, compared — never thrown.
5. Declare a **sentinel error** (`ErrInsufficientFunds`) and check for it with `errors.Is`.

One image carries the pointer half of this chapter: **the photocopy and the address card.** By
default, Go hands your method a *photocopy* of the wallet. A pointer is the wallet's *address
card* — hand that over instead, and the method can walk to the real thing.

---

## The big idea: the wallet that wouldn't fill

Build the wallet the honest way — test first. A wallet starts empty; deposit ten; the balance
should read ten:

```go
func TestWallet(t *testing.T) {
	wallet := Wallet{}
	wallet.Deposit(10)

	got := wallet.Balance()
	if got != 10 {
		t.Errorf("balance = %d; want %d", got, 10)
	}
}
```

The wallet itself is a struct from chapter 4 — one field, kept **unexported** on purpose. A
lowercase name is private outside its package, so nobody can reach in and scribble on `balance`
directly; the only doors are the methods we choose to provide. That's encapsulation, and it's the
whole reason this type exists:

```go
type Wallet struct {
	balance int
}

func (w Wallet) Deposit(amount int) {
	w.balance += amount
}

func (w Wallet) Balance() int {
	return w.balance
}
```

Value receivers, just like chapter 4 taught. The code reads perfectly: deposit adds to the
balance; balance returns it. Run the test:

```text
--- FAIL: TestWallet
    balance = 0; want 10
```

The balance is still **zero**. Read the `Deposit` body again — it *does* add `amount` to
`w.balance`. The code looks right, the logic is right, and the money is gone. This is the single
most common surprise in all of Go, so don't take my word for what's happening — let's catch it in
the act. Print the **memory address** of the balance in two places: inside `Deposit`, and back in
the test. (`&x` means "the address of `x`"; the `%p` verb prints an address.)

```go
func (w Wallet) Deposit(amount int) {
	fmt.Printf("address of balance in Deposit is %p\n", &w.balance)
	w.balance += amount
}
```

```go
wallet.Deposit(10)
fmt.Printf("address of balance in test    is %p\n", &wallet.balance)
```

Run it:

```text
address of balance in Deposit is 0x3960bd6d0220
address of balance in test    is 0x3960bd6d0218
```

**Two different addresses.** The balance `Deposit` added ten to does not live in the same place as
the balance the test reads. There were two wallets all along.

Here's why. In Go, **when you call a function or a method, the arguments are copied** — and the
receiver is an argument. `func (w Wallet) Deposit(...)` means: *make a photocopy of the caller's
wallet, name it `w`, run the body on that.* Deposit faithfully added ten — to the photocopy —
and the photocopy was thrown away the instant the method returned. The real wallet never heard
about it. Chapter 4 even told you this ("structs copy by value") — but a value receiver is where
that fact stops being trivia and silently eats your money.

So the question becomes: how do you hand a method the *real* wallet? You don't mail the wallet —
you mail its **address card**.

**Checkpoint:** calling a method copies the receiver — a value receiver works on a photocopy, so
its changes vanish with the copy. You proved it: same balance, two addresses. The fix is to hand
over the wallet's address instead.

---

## The details (with the traps called out)

### `&` and `*`: writing the card, following the card

A **pointer** is a value that holds an address — a card with directions to where something lives.
Two operators do all the work, and they're mirror images:

```go
x := 10
p := &x         // & WRITES the card: p holds the address of x (p's type is *int)
fmt.Println(*p) // * FOLLOWS the card: read what lives at that address → 10

*p = 99         // follow the card and WRITE there
fmt.Println(x)  // 99 — the real x changed, because p pointed at the real x
```

```text
        x ┌──────┐                 p ┌───────────────┐
          │  10  │ ◀───────────────│  address of x  │
          └──────┘    *p follows    └───────────────┘
         the value                  the address card
```

The **type** of a pointer-to-`T` is written `*T` — a `*int` is "a card with an int's address on
it," a `*Wallet` is "a card with a wallet's address on it." That's the whole mechanism. No
arithmetic, no manual memory management — Go's pointers are deliberately tame; they're the address
card and nothing more.

### Pointer receivers: hand the method the card

Now apply it to the wallet. One character changes:

```go
func (w *Wallet) Deposit(amount int) {
	w.balance += amount
}
```

`(w *Wallet)` — *a pointer to a wallet*. The method no longer receives a photocopy; it receives
the address card, follows it, and adds ten to the **real** balance. Run the test: GREEN, first
try. Print the addresses again and they're the same place.

Two conveniences are hiding in that tiny body, and both are Go being kind:

- You wrote `w.balance`, not `(*w).balance`. Technically you're holding a card, and you'd have to
  *follow* it before reading a field. Go's designers found that so tedious for struct pointers
  that the language dereferences them **automatically** — `w.balance` quietly means "follow `w`,
  then take `.balance`."
- At the call site you wrote `wallet.Deposit(10)`, not `(&wallet).Deposit(10)`. Go sees the
  method wants a `*Wallet`, sees you have a `Wallet`, and takes the address for you.

So the syntax barely changes — which is exactly why the *receiver type* is the thing to read
carefully in Go code. `(w Wallet)` and `(w *Wallet)` look like siblings and behave like
strangers: photocopy versus address card.

**The rule of thumb:** if a method needs to **change** its receiver — or the receiver is large and
copying it would be wasteful — use a pointer receiver. And one convention on top: **keep all of a
type's receivers the same kind.** `Balance` doesn't need a pointer (reading a copy is fine), but
mixing `(w Wallet)` and `(w *Wallet)` on one type invites exactly the bug you just debugged — so
the wallet uses pointer receivers throughout.

### A named type: `Bitcoin`, not just `int`

We said this was a Bitcoin wallet, and so far it's an *int* wallet. `int` works, but it says
nothing — and Go has a one-line fix with outsized payoff:

```go
type Bitcoin int
```

A **named type** built on an existing one. A `Bitcoin` *is* an int underneath (create one with a
conversion: `Bitcoin(10)`), but it's a distinct type to the compiler and to the reader —
`Deposit(amount Bitcoin)` now reads as money, not arithmetic. Better still, named types can carry
**methods**, which means they can satisfy interfaces — that's how the stretch goal will teach
`Bitcoin` to print itself as `"10 BTC"`. Wrapping a primitive in a domain name this way is
everyday Go; you'll see `time.Duration` (an int64 underneath) doing exactly this in every program
with a clock.

### Trap: the card to nowhere

A pointer is a value, so it has a zero value — `nil`, a card with no address written on it.
Following a nil card doesn't fail politely; it **panics** at runtime, and the compiler can't
warn you. You won't hit this in the exercise, but the rule travels well: when a function hands
you a pointer (or an interface — same caution), check it before you follow it. Speaking of
interfaces being nillable —

**Checkpoint:** `&` writes the address card, `*` follows it, `*T` is the card's type. A pointer
receiver `(w *Wallet)` hands the method the card, so changes land on the real wallet — and Go
auto-dereferences (`w.balance`) and auto-addresses (`wallet.Deposit(10)`) to keep the syntax
clean. Named types like `Bitcoin` give bare numbers domain meaning. Never follow a nil card.

---

## Errors are values, not explosions

Time for `Withdraw` — and withdrawing introduces something deposits never had: a way to **fail**.
What if the wallet holds 20 and someone withdraws 100? There's no overdraft here; the operation
must be refused. The question is *how code says no*.

Many languages answer by **throwing** an exception that flies up the call stack until something
catches it — invisible in the function's signature, easy to forget, impossible to see at the call
site. Go takes a deliberately different path: **a function that can fail returns an `error` as an
ordinary value, and the caller checks it.**

```go
func (w *Wallet) Withdraw(amount Bitcoin) error {
	if amount > w.balance {
		return errors.New("cannot withdraw, insufficient funds")
	}
	w.balance -= amount
	return nil // nil means "no error — all good"
}
```

`errors.New` makes an error from a message. Returning `nil` means success — `error` is an
interface, and like any interface value it can be nil (that's also why you check errors before
poking at them). The caller's side is the most famous three lines in Go:

```go
err := wallet.Withdraw(100)
if err != nil {
	// it failed — react: log it, return it, show the user
}
```

Why values instead of exceptions? Because an error you *return* is **in the signature**, staring
at every caller — the compiler makes you receive it, and ignoring it is a visible, greppable
decision instead of an invisible accident. Failure becomes data: you can store it, compare it,
pass it on. Verbose? A little. But explicit-and-boring beats invisible-and-surprising every day of
the week, and you'll come to read `if err != nil` the way you read punctuation.

One more detail in that `Withdraw` body deserves a sentence: on the error path, the balance is
**untouched** — we refuse *before* mutating. Fail without breaking anything; the test will hold us
to it.

### Sentinel errors: a failure with a name

Now put yourself in the caller's shoes. They got an error — but *which* failure was it? Maybe
they want to show a "top up?" button **only** when the problem is insufficient funds. Their first
instinct might be to compare the message text… and that's a trap: reword the message ("not enough
funds") and every check in every caller silently breaks. Error *strings* are for humans. Code
needs something sturdier to grab.

The idiomatic fix: create the error **once**, at package level, give it a name, and return that
same value every time. A **sentinel error**:

```go
var ErrInsufficientFunds = errors.New("cannot withdraw, insufficient funds")

func (w *Wallet) Withdraw(amount Bitcoin) error {
	if amount > w.balance {
		return ErrInsufficientFunds // the SAME value, every time
	}
	w.balance -= amount
	return nil
}
```

The `Err…` prefix is a strong Go convention — the standard library is full of these: `io.EOF`,
`sql.ErrNoRows`. And the caller checks for it with **`errors.Is`**:

```go
if errors.Is(err, ErrInsufficientFunds) {
	// definitely THIS failure — react precisely
}
```

Why `errors.Is` instead of `==`? For a bare sentinel, `==` would actually work today. But Go
errors can be **wrapped** — one error carrying another inside it for context — and `errors.Is`
knows how to unwrap and check the whole chain. Build the `errors.Is` habit now and your checks
keep working the day someone adds wrapping; `==` quietly stops matching. (The stretch goal lets
you wrap one and watch `errors.Is` still find it.)

**Checkpoint:** failure in Go is a returned value — `error` in the signature, `nil` for success,
`if err != nil` at the call site. When callers need to react to a *specific* failure, don't make
them read message strings: declare one package-level sentinel (`ErrInsufficientFunds`) and let
them match it with `errors.Is`.

---

## Worked example — run it in your head

The whole wallet, assembled — pointers on the left half, errors on the right:

```go
package main

import (
	"errors"
	"fmt"
)

type Bitcoin int

type Wallet struct {
	balance Bitcoin
}

var ErrInsufficientFunds = errors.New("cannot withdraw, insufficient funds")

func (w *Wallet) Deposit(amount Bitcoin) {
	w.balance += amount
}

func (w *Wallet) Withdraw(amount Bitcoin) error {
	if amount > w.balance {
		return ErrInsufficientFunds
	}
	w.balance -= amount
	return nil
}

func (w *Wallet) Balance() Bitcoin {
	return w.balance
}

func main() {
	wallet := Wallet{}
	wallet.Deposit(Bitcoin(50))
	fmt.Println("after deposit:", wallet.Balance())

	if err := wallet.Withdraw(Bitcoin(100)); err != nil {
		fmt.Println("withdraw failed:", err)
	}
	fmt.Println("after failed withdraw:", wallet.Balance())
}
```

Output:

```text
after deposit: 50
withdraw failed: cannot withdraw, insufficient funds
after failed withdraw: 50
```

Trace it with the model: `Deposit` got the address card, so the real balance became 50. The
oversized withdrawal returned the sentinel — and the last line is the quiet hero: **still 50**.
Refused *and* unharmed.

---

## Prove it with a test

The exercise's test pins down all three halves of the contract — and reads almost like the spec:

```go
t.Run("deposit increases balance", func(t *testing.T) {
	wallet := Wallet{}
	wallet.Deposit(10)
	assertBalance(t, wallet, 10)
})

t.Run("withdraw within funds", func(t *testing.T) {
	wallet := Wallet{}
	wallet.Deposit(20)

	err := wallet.Withdraw(8)

	assertNoError(t, err)
	assertBalance(t, wallet, 12)
})

t.Run("withdraw insufficient funds", func(t *testing.T) {
	wallet := Wallet{}
	wallet.Deposit(20)

	err := wallet.Withdraw(100)

	assertError(t, err, ErrInsufficientFunds)
	assertBalance(t, wallet, 20) // balance must be untouched on the error path
})
```

Three helpers (`assertBalance`, `assertNoError`, `assertError`) keep each case readable — the
`t.Helper()` move you know from earlier chapters. Two details are worth slowing down for:

- Inside `assertError`, a missing error is reported with **`t.Fatal`**, not `t.Errorf`. `Fatal`
  stops the test on the spot. Why? Because the next line wants to inspect the error — and
  inspecting an error that doesn't exist would panic. `Error` says "note this and continue";
  `Fatal` says "there's no point continuing." Reaching for `Fatal` exactly when later assertions
  *depend* on this one is a habit worth copying.
- The error check is `errors.Is(got, want)` — the same future-proof match the lesson taught, used
  by the test that grades you.
- And notice the second test asserts **no** error on the happy path. Success needs checking too —
  a `Withdraw` that always returned `ErrInsufficientFunds` should not pass.

---

## 🏋️ Your rep — make it GREEN

Open `exercises/pointers/pointers.go`. The types are built for you — `Bitcoin`, `Wallet`,
`ErrInsufficientFunds` are all declared, and the receivers are already pointers *on purpose*. You
fill in three method bodies:

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

Your job, in plain language:

1. Watch it fail (RED): `go test ./exercises/pointers/` (run from the `go-gym` folder).
2. `Deposit`: add `amount` to `w.balance`. (One line — and it lands on the real wallet because
   the receiver is a pointer.)
3. `Withdraw`: if `amount` is more than `w.balance`, return `ErrInsufficientFunds` — *before*
   touching the balance. Otherwise subtract and return `nil`.
4. `Balance`: return `w.balance`.
5. Run again → **GREEN**, all three subtests.

### Stretch goals (ask your tutor to scaffold any)

- Teach `Bitcoin` to print itself: give it a `String() string` method returning something like
  `"10 BTC"` (`fmt.Sprintf("%d BTC", b)`). That satisfies the `fmt.Stringer` interface — chapter
  4's automatic satisfaction again — and `%s` will use it everywhere.
- Re-create this chapter's detective scene: change `Deposit` to a **value** receiver, watch the
  test fail with `balance = 0; want 10`, add the two `%p` prints, and see the two different
  addresses with your own eyes. Then put the pointer back.
- Wrap the sentinel — return `fmt.Errorf("withdraw %d: %w", amount, ErrInsufficientFunds)` — and
  confirm the test *still* passes, because `errors.Is` checks the whole chain. (Then try `==` in
  your head: it would have broken.)

---

## 🧠 Active recall — answer out loud, no peeking

1. The first `Deposit` looked correct but the balance stayed 0. What exactly did the method
   receive, and what proof did the two `%p` prints give you?
2. What do `&x` and `*p` each do, and what does the type `*Wallet` mean?
3. Why can you write `w.balance` inside a pointer-receiver method instead of `(*w).balance` — and
   `wallet.Deposit(10)` instead of `(&wallet).Deposit(10)`?
4. When should a method take a pointer receiver, and why does the wallet use pointer receivers
   even on `Balance`, which only reads?
5. What does `type Bitcoin int` buy you over plain `int` — name two things.
6. Why does Go return errors as values instead of throwing exceptions — what does the caller gain?
7. Why is comparing error *message strings* fragile, and what do a sentinel error plus `errors.Is`
   give you instead?

If any answer is fuzzy, scroll back up — that's the recall doing its job.

---

## 🔍 Real code in the wild

Open [`sync.Mutex`](https://pkg.go.dev/sync#Mutex) — chapter 12's star. Every one of its methods
(`Lock`, `Unlock`) takes a **pointer receiver**, for exactly the wallet's reason: a lock that gets
photocopied is two locks, and two locks protect nothing. Same story for `bytes.Buffer.Write` —
which is why chapter 7 will have you pass `&buf`.

For the errors half, the standard library's most famous sentinel is [`io.EOF`](https://pkg.go.dev/io#pkg-variables)
— "the read is over" — declared once, package-level, `Err`-style, and checked by every file-reading
loop in the language with exactly your pattern: `errors.Is(err, io.EOF)`. The shape you built today
(`ErrInsufficientFunds` + `errors.Is`) is the shape Go itself runs on; next chapter you'll grow it
from one sentinel into a whole vocabulary of them.

---

## What you learned

- Method arguments — **including the receiver** — are copied. A value receiver works on a
  photocopy, and you caught it: `balance = 0; want 10`, two different addresses in the prints.
- A **pointer** is an address card: `&` writes it, `*` follows it, `*T` is its type. A **pointer
  receiver** `(w *Wallet)` hands the method the card, so changes hit the real thing — with Go
  auto-dereferencing fields and auto-taking addresses at call sites to keep the code clean.
- Keep a type's receivers **consistent**, and never follow a `nil` card.
- `type Bitcoin int` — a **named type** gives a bare number domain meaning and can carry methods
  (and therefore satisfy interfaces, like `fmt.Stringer`).
- **Errors are values**: returned in the signature, `nil` on success, checked with
  `if err != nil` — explicit where exceptions are invisible. Refuse *before* mutating, so failure
  leaves no damage.
- A **sentinel error** (`var ErrInsufficientFunds = errors.New(…)`) gives a failure a name;
  callers match it with **`errors.Is`**, which keeps working even when errors get wrapped.

✅ **Done when:** `go test ./exercises/pointers/` is GREEN and you can answer the recall questions.

**Next:** Chapter 6 — *Maps*, where we give our data keys and values, and meet Go's built-in
dictionary (plus the one initialization trap that catches everyone).
