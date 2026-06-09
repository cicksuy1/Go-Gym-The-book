//go:build !solution

package di

import "io"

// Greet writes "Hello, <name>" to the given writer.
//
// MODULE 7 — DEPENDENCY INJECTION.  The destination is INJECTED: instead of
// reaching for os.Stdout, Greet writes to whatever io.Writer it is handed.
// Right now the body is empty, so nothing is written (that's the RED state).
func Greet(writer io.Writer, name string) {
	// TODO(you): write "Hello, "+name to writer (hint: fmt.Fprintf)
}

// RegisterUser welcomes a new user through whatever Notifier it is handed.
//
// The Notifier is INJECTED: RegisterUser doesn't care HOW the welcome is
// delivered (email, SMS, …), only that it CAN be. Right now the body is empty,
// so nothing is delivered (that's the RED state).
func RegisterUser(name string, notifier Notifier) {
	// TODO(you): send "Welcome, <name>!" through the notifier (hint: notifier.Notify)
}
