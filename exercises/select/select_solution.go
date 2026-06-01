//go:build solution

package racer

// Reference solution — QA only. Build/run with:  go test -tags solution ./exercises/select/

import (
	"fmt"
	"net/http"
	"time"
)

const tenSecondTimeout = 10 * time.Second

// Racer returns whichever of a or b responds first, with a 10-second default.
func Racer(a, b string) (string, error) {
	return ConfigurableRacer(a, b, tenSecondTimeout)
}

// ping starts a GET in a goroutine and returns a channel that is CLOSED once
// the request finishes — a pure "done" signal carrying no data.
func ping(url string) chan struct{} {
	ch := make(chan struct{})
	go func() {
		http.Get(url)
		close(ch)
	}()
	return ch
}

// ConfigurableRacer selects over the two pings and a timeout: it returns the
// faster URL, or an error if neither answers within timeout — so it can never
// block forever.
func ConfigurableRacer(a, b string, timeout time.Duration) (string, error) {
	select {
	case <-ping(a):
		return a, nil
	case <-ping(b):
		return b, nil
	case <-time.After(timeout):
		return "", fmt.Errorf("timed out waiting for %s and %s", a, b)
	}
}
