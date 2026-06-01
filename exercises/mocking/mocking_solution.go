//go:build solution

package mocking

import (
	"fmt"
	"io"
	"time"
)

// Reference solution — QA only. Build/run with:  go test -tags solution ./exercises/mocking/

// Sleeper is anything that can pause.
type Sleeper interface {
	Sleep()
}

// DefaultSleeper is the real Sleeper used by the actual program (never by the test).
type DefaultSleeper struct{}

func (d *DefaultSleeper) Sleep() {
	time.Sleep(1 * time.Second)
}

// Countdown sleeps before each number, prints 3, 2, 1, then "Go!".
func Countdown(out io.Writer, sleeper Sleeper) {
	for i := 3; i > 0; i-- {
		sleeper.Sleep()
		fmt.Fprintln(out, i)
	}
	fmt.Fprint(out, "Go!")
}
