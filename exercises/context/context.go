//go:build !solution

// Package ctxserver holds a context-aware HTTP handler.
//
// NOTE: the chapter slug is "context", but this package imports the stdlib
// `context` package, so it can't itself be named `context` — it's named
// `ctxserver`. The folder is still exercises/context/.
package ctxserver

import (
	"context"
	"fmt"
	"net/http"
)

// MODULE 13 — CONTEXT.

// Store is anything that can fetch some data, honouring the given context.
// If the context is cancelled, Fetch returns an error (e.g. ctx.Err()).
type Store interface {
	Fetch(ctx context.Context) (string, error)
}

// Server returns a handler that fetches data from store and writes it.
//
// Right now it IGNORES the error from Fetch and always writes — so when a
// request is cancelled it wrongly writes a useless response (that's the RED
// state).
func Server(store Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		data, _ := store.Fetch(r.Context())
		fmt.Fprint(w, data) // TODO(you): capture the error from Fetch instead of
		// discarding it; if it's non-nil (e.g. the request was cancelled),
		// return WITHOUT writing anything to w.
	}
}
