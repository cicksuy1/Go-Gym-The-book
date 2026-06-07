package mocking

import (
	"bytes"
	"reflect"
	"testing"
)

// SpySleeper is a fake Sleeper that records how many times it was asked to
// sleep instead of actually pausing. This is the "spy" — it lets the test prove
// the sleeps happened, and keeps the test instant. The real DefaultSleeper is
// never used here. Note its limit: a count can prove HOW MANY sleeps happened,
// never WHERE they happened.
type SpySleeper struct {
	Calls int
}

func (s *SpySleeper) Sleep() {
	s.Calls++
}

// SpyCountdownOperations is the sharper spy: ONE struct that is BOTH an
// io.Writer and a Sleeper, so every print and every sleep lands on a single
// shared tape (Calls), in the order they really happened. Only this spy can
// catch an implementation that prints everything first and sleeps afterwards.
type SpyCountdownOperations struct {
	Calls []string
}

func (s *SpyCountdownOperations) Sleep() {
	s.Calls = append(s.Calls, sleep)
}

func (s *SpyCountdownOperations) Write(p []byte) (int, error) {
	s.Calls = append(s.Calls, write)
	return len(p), nil // an io.Writer must report how many bytes it accepted
}

const (
	write = "write"
	sleep = "sleep"
)

// TestCountdown checks THREE dimensions: the exact output, the behaviour
// (Sleep called exactly 3 times), and the ORDER of operations (sleep before
// each print, none before "Go!"). The order assertion is only possible because
// one spy plays both roles and records everything on one tape.
func TestCountdown(t *testing.T) {
	t.Run("prints 3 to Go!", func(t *testing.T) {
		buffer := &bytes.Buffer{}
		Countdown(buffer, &SpySleeper{})

		got := buffer.String()
		want := "3\n2\n1\nGo!"
		if got != want {
			t.Errorf("got %q want %q", got, want)
		}
	})

	t.Run("sleeps three times", func(t *testing.T) {
		spy := &SpySleeper{}
		Countdown(&bytes.Buffer{}, spy)

		if spy.Calls != 3 {
			t.Errorf("Sleep called %d times, want 3", spy.Calls)
		}
	})

	t.Run("sleeps before every print", func(t *testing.T) {
		spy := &SpyCountdownOperations{}
		Countdown(spy, spy) // the SAME spy is the io.Writer AND the Sleeper

		// [sleep, "3"] [sleep, "2"] [sleep, "1"] ["Go!" — no sleep before it]
		want := []string{sleep, write, sleep, write, sleep, write, write}
		if !reflect.DeepEqual(spy.Calls, want) {
			t.Errorf("wanted calls %v got %v", want, spy.Calls)
		}
	})
}
