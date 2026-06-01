package racer

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// makeDelayedServer returns a fake server that sleeps for delay before replying
// 200 OK. We control the timing, so the tests are fast and deterministic.
func makeDelayedServer(delay time.Duration) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			time.Sleep(delay)
			w.WriteHeader(http.StatusOK)
		}))
}

// TestRacer: the faster server's URL should win.
func TestRacer(t *testing.T) {
	slowServer := makeDelayedServer(20 * time.Millisecond)
	fastServer := makeDelayedServer(0 * time.Millisecond)
	defer slowServer.Close()
	defer fastServer.Close()

	want := fastServer.URL
	got, err := Racer(slowServer.URL, fastServer.URL)

	if err != nil {
		t.Fatalf("did not expect an error but got one: %v", err)
	}
	if got != want {
		t.Errorf("Racer(...) = %q; want %q", got, want)
	}
}

// TestRacerTimeout: if both servers are slower than the configured timeout,
// ConfigurableRacer must return an error rather than hang.
func TestRacerTimeout(t *testing.T) {
	server := makeDelayedServer(25 * time.Millisecond)
	defer server.Close()

	timeout := 20 * time.Millisecond
	_, err := ConfigurableRacer(server.URL, server.URL, timeout)

	if err == nil {
		t.Error("expected a timeout error but got nil")
	}
}
