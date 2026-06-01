//go:build !solution

// Package counter holds a concurrency-safe Counter.
//
// NOTE: the chapter slug is "sync", but this package imports the stdlib `sync`
// package, so it can't itself be named `sync` — it's named `counter`. The
// folder is still exercises/sync/.
package counter

// MODULE 12 — SYNC.
//
// Counter is a number that many goroutines can increment at once — SAFELY,
// once you add a mutex to guard it. Always use it via a *Counter (pointer):
// copying a Counter copies its mutex and breaks the protection (go vet warns).
//
// Right now Inc does nothing and Value is always 0 (that's the RED state).
type Counter struct {
	// TODO(you): add a sync.Mutex (call it mu) and an int to hold the count
}

// Inc should add one to the count, under the lock.
func (c *Counter) Inc() {
	// TODO(you): lock, increment the count, unlock (defer the unlock)
}

// Value should return the current count, under the lock.
func (c *Counter) Value() int {
	return 0 // TODO(you): lock, read the count, unlock (defer the unlock)
}
