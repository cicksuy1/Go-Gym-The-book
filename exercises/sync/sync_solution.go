//go:build solution

package counter

// Reference solution — QA only. Build/run with:  go test -tags solution ./exercises/sync/

import "sync"

// Counter is a concurrency-safe integer. The mutex sits next to the value it
// guards. Always use it as a *Counter — copying it would copy the mutex.
type Counter struct {
	mu    sync.Mutex
	value int
}

// Inc adds one to the count inside the locked critical section.
func (c *Counter) Inc() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.value++
}

// Value reads the count under the lock (reads must be guarded too).
func (c *Counter) Value() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.value
}
