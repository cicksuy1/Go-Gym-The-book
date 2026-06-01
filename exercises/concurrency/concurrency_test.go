package concurrency

import (
	"reflect"
	"testing"
)

// mockWebsiteChecker is a FAKE WebsiteChecker so the test never touches the
// real network. It reports every url as "up" except one known-bad address.
func mockWebsiteChecker(url string) bool {
	return url != "waat://furhurterwe.geds"
}

// TestCheckWebsites builds the url -> bool map and checks it matches.
//
// This chapter is about CONCURRENCY correctness, so also run it under the race
// detector:  go test -race ./exercises/concurrency/
func TestCheckWebsites(t *testing.T) {
	urls := []string{
		"https://example.com",
		"https://example.org",
		"waat://furhurterwe.geds",
	}

	want := map[string]bool{
		"https://example.com":     true,
		"https://example.org":     true,
		"waat://furhurterwe.geds": false,
	}

	got := CheckWebsites(mockWebsiteChecker, urls)

	if !reflect.DeepEqual(want, got) {
		t.Errorf("CheckWebsites(...) = %v; want %v", got, want)
	}
}

// TestCheckWebsitesEmpty pins down the edge case: no urls -> an empty map.
func TestCheckWebsitesEmpty(t *testing.T) {
	got := CheckWebsites(mockWebsiteChecker, []string{})

	if len(got) != 0 {
		t.Errorf("CheckWebsites(..., []) = %v; want an empty map", got)
	}
}
