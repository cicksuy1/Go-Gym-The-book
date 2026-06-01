//go:build solution

package ctxserver

// Reference solution — QA only. Build/run with:  go test -tags solution ./exercises/context/

import (
	"context"
	"fmt"
	"net/http"
)

// Store is anything that can fetch some data, honouring the given context.
type Store interface {
	Fetch(ctx context.Context) (string, error)
}

// Server returns a handler that passes the request's context to Fetch and
// honours cancellation: on any error it returns WITHOUT writing a response.
func Server(store Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		data, err := store.Fetch(r.Context())
		if err != nil {
			return // cancelled or failed — write nothing
		}
		fmt.Fprint(w, data)
	}
}
