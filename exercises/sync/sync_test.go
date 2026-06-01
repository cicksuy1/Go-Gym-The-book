package counter

import (
	"sync"
	"testing"
)

// TestCounterInc: three increments should leave the value at 3.
func TestCounterInc(t *testing.T) {
	counter := &Counter{}

	counter.Inc()
	counter.Inc()
	counter.Inc()

	if got := counter.Value(); got != 3 {
		t.Errorf("after 3 Inc() calls, Value() = %d; want 3", got)
	}
}

// TestCounterConcurrent fires many goroutines at the same Counter and checks
// none of the increments are lost. Run it with the race detector:
//
//	go test -race ./exercises/sync/
func TestCounterConcurrent(t *testing.T) {
	const wantedCount = 1000
	counter := &Counter{}

	var wg sync.WaitGroup
	wg.Add(wantedCount)

	for i := 0; i < wantedCount; i++ {
		go func() {
			defer wg.Done()
			counter.Inc()
		}()
	}

	wg.Wait()

	if got := counter.Value(); got != wantedCount {
		t.Errorf("Value() = %d; want %d (increments were lost — is the count guarded by a mutex?)", got, wantedCount)
	}
}
