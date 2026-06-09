package di

import (
	"fmt"
	"io"
)

// MODULE 7 — DEPENDENCY INJECTION, second rep.
//
// io.Writer is the standard library's socket. But dependency injection isn't an
// io.Writer thing — it's a shape-of-function thing. Here we define our OWN
// one-method socket and inject it, exactly the same move.

// Notifier is the contract: anything that can deliver a message.
type Notifier interface {
	Notify(message string)
}

// EmailNotifier and SMSNotifier are two REAL implementations of Notifier. Neither
// declares "implements Notifier" — having the Notify method IS satisfying it
// (chapter 4's "if it has the methods, it IS the interface").
//
// Each writes to an INJECTED destination (Out) instead of reaching for os.Stdout,
// so a test can hand in a *bytes.Buffer and read back exactly what was sent — the
// same buffer trick that makes Greet testable. No fakes, no framework.
type EmailNotifier struct{ Out io.Writer }

func (e EmailNotifier) Notify(msg string) { fmt.Fprintln(e.Out, "Sending email:", msg) }

type SMSNotifier struct{ Out io.Writer }

func (s SMSNotifier) Notify(msg string) { fmt.Fprintln(s.Out, "Sending SMS:", msg) }
