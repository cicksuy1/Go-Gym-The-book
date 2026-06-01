//go:build !solution

package concurrency

// MODULE 9 — CONCURRENCY.
//
// A WebsiteChecker reports whether a single URL is "up" (true) or not (false).
type WebsiteChecker func(string) bool

// CheckWebsites checks every url with wc and returns a map of url -> result.
//
// The interesting version does this CONCURRENTLY: one goroutine per url, each
// sending its result back over a channel, with a single collector building the
// map. (Writing the map directly from many goroutines is a data race — run the
// tests with `go test -race ./exercises/concurrency/` to see why that matters.)
//
// Right now it returns an empty map (that's the RED state).
func CheckWebsites(wc WebsiteChecker, urls []string) map[string]bool {
	results := make(map[string]bool)
	// TODO(you): one goroutine per url; each SENDS its result on a channel;
	// collect them into results. Do NOT write the map from the goroutines.
	return results
}
