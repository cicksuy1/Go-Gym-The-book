//go:build solution

package concurrency

// Reference solution — QA only. Build/run with:  go test -tags solution ./exercises/concurrency/

// A WebsiteChecker reports whether a single URL is "up" (true) or not (false).
type WebsiteChecker func(string) bool

// result is a tiny carrier for "this url got this answer". The two fields are
// unnamed, so they're addressed by their type names: r.string and r.bool.
type result struct {
	string
	bool
}

// CheckWebsites checks every url concurrently and collects the answers safely.
// Each goroutine SENDS its result on a channel; one collector RECEIVES them all
// and writes the map — so there is exactly one writer and no data race.
func CheckWebsites(wc WebsiteChecker, urls []string) map[string]bool {
	results := make(map[string]bool)
	resultChannel := make(chan result)

	for _, url := range urls {
		go func(u string) {
			resultChannel <- result{u, wc(u)}
		}(url)
	}

	for i := 0; i < len(urls); i++ {
		r := <-resultChannel
		results[r.string] = r.bool
	}

	return results
}
