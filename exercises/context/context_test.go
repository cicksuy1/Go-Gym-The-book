package ctxserver

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

// SpyStore returns its canned response and never errors — the happy path.
type SpyStore struct {
	response string
}

func (s *SpyStore) Fetch(ctx context.Context) (string, error) {
	return s.response, nil
}

// CancellingStore blocks until the context is cancelled, then reports why it
// stopped. It lets us drive the cancellation path deterministically.
type CancellingStore struct{}

func (s *CancellingStore) Fetch(ctx context.Context) (string, error) {
	<-ctx.Done()
	// Return non-empty data ALONGSIDE the error: a handler that ignores the
	// error would wrongly write this, which is exactly what the test must catch.
	return "you should not see this", ctx.Err()
}

// On the happy path, the handler writes the store's data.
func TestServerWritesData(t *testing.T) {
	data := "hello, world"
	svr := Server(&SpyStore{response: data})

	request := httptest.NewRequest(http.MethodGet, "/", nil)
	response := httptest.NewRecorder()

	svr.ServeHTTP(response, request)

	if got := response.Body.String(); got != data {
		t.Errorf("handler wrote %q; want %q", got, data)
	}
}

// When the request is already cancelled, the handler must write NOTHING.
func TestServerHonoursCancellation(t *testing.T) {
	svr := Server(&CancellingStore{})

	request := httptest.NewRequest(http.MethodGet, "/", nil)

	// Derive a cancelled context and attach it to the request.
	ctx, cancel := context.WithCancel(request.Context())
	cancel() // cancel immediately — fully deterministic, no sleeps
	request = request.WithContext(ctx)

	response := httptest.NewRecorder()
	svr.ServeHTTP(response, request)

	if got := response.Body.String(); got != "" {
		t.Errorf("on cancellation the handler wrote %q; want it to write nothing", got)
	}
}
