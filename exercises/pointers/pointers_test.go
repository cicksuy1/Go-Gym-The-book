package pointers

import (
	"errors"
	"testing"
)

// TestWallet exercises the three halves of the contract: deposits add, withdraws
// within funds subtract, and an over-draw returns ErrInsufficientFunds while
// leaving the balance UNCHANGED. The helpers keep each case readable.
func TestWallet(t *testing.T) {
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
}

func assertBalance(t *testing.T, wallet Wallet, want Bitcoin) {
	t.Helper()
	got := wallet.Balance()
	if got != want {
		t.Errorf("balance = %d; want %d", got, want)
	}
}

func assertNoError(t *testing.T, got error) {
	t.Helper()
	if got != nil {
		t.Fatalf("got an error but didn't want one: %v", got)
	}
}

func assertError(t *testing.T, got, want error) {
	t.Helper()
	if got == nil {
		t.Fatal("wanted an error but didn't get one")
	}
	if !errors.Is(got, want) {
		t.Errorf("got error %q; want %q", got, want)
	}
}
