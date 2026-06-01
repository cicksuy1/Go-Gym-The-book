//go:build !solution

package pointers

import "errors"

// MODULE 5 — POINTERS & ERRORS.  A Wallet you can Deposit into and Withdraw from.
// The receivers are POINTERS on purpose, so your changes hit the REAL wallet, not a copy.
// Right now the bodies are empty/placeholder (that's the RED state) — make the test pass.

// Bitcoin is a named integer type, so amounts read as money rather than bare numbers.
type Bitcoin int

// Wallet holds a balance. The field is unexported — callers go through the methods.
type Wallet struct {
	balance Bitcoin
}

// ErrInsufficientFunds is the sentinel error returned when a withdrawal exceeds the balance.
var ErrInsufficientFunds = errors.New("cannot withdraw, insufficient funds")

// Deposit adds amount to the wallet's balance.
func (w *Wallet) Deposit(amount Bitcoin) {
	// TODO(you)
}

// Withdraw subtracts amount from the balance, or returns ErrInsufficientFunds if there isn't enough.
func (w *Wallet) Withdraw(amount Bitcoin) error {
	return nil // TODO(you)
}

// Balance returns the wallet's current balance.
func (w *Wallet) Balance() Bitcoin {
	return 0 // TODO(you)
}
