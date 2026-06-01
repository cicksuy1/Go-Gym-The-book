//go:build !solution

package mocking

import (
	"io"
	"time"
)

// MODULE 8 — MOCKING.  Countdown's pause is INJECTED behind the Sleeper
// interface, so the test can swap in a fast fake (a spy) instead of a real
// one-second sleep. Right now Countdown's body is empty (that's the RED state).

// Sleeper is anything that can pause. The test injects a fake; main injects the
// real DefaultSleeper below.
type Sleeper interface {
	Sleep()
}

// DefaultSleeper is the real Sleeper used by the actual program (never by the
// test). It exists so the package compiles and main can pause for real.
type DefaultSleeper struct{}

func (d *DefaultSleeper) Sleep() {
	time.Sleep(1 * time.Second)
}

// Countdown writes "3\n2\n1\nGo!" to out, calling sleeper.Sleep() once before
// each of the three numbers (3 sleeps total, none before "Go!").
func Countdown(out io.Writer, sleeper Sleeper) {
	// TODO(you): sleep then print 3, 2, 1 (one sleep each), then print "Go!"
}
