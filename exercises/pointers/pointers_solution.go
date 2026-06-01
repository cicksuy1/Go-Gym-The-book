//go:build solution

package pointers

import "errors"

// Reference solution — QA only. Build/run with:  go test -tags solution ./exercises/pointers/

// Bitcoin is a named integer type, so amounts read as money rather than bare numbers.
type Bitcoin int

// Wallet holds a balance. The field is unexported — callers go through the methods.
type Wallet struct {
	balance Bitcoin
}

// ErrInsufficientFunds is the sentinel error returned when a withdrawal exceeds the balance.
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
