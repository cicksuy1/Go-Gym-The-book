package mocking

import (
	"bytes"
	"testing"
)

// SpySleeper is a fake Sleeper that records how many times it was asked to
// sleep instead of actually pausing. This is the "spy" — it lets the test prove
// the sleeps happened, and keeps the test instant. The real DefaultSleeper is
// never used here.
type SpySleeper struct {
	Calls int
}

func (s *SpySleeper) Sleep() {
	s.Calls++
}

// TestCountdown checks BOTH dimensions: the exact output AND the behaviour
// (that Sleep was called exactly 3 times). The call-count assertion is only
// possible because we injected a spy.
func TestCountdown(t *testing.T) {
	buffer := &bytes.Buffer{}
	spy := &SpySleeper{}

	Countdown(buffer, spy)

	t.Run("prints 3 to Go!", func(t *testing.T) {
		got := buffer.String()
		want := "3\n2\n1\nGo!"
		if got != want {
			t.Errorf("got %q want %q", got, want)
		}
	})

	t.Run("sleeps three times", func(t *testing.T) {
		if spy.Calls != 3 {
			t.Errorf("Sleep called %d times, want 3", spy.Calls)
		}
	})
}
