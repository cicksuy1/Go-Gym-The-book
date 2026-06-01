package iteration

import (
	"fmt"
	"testing"
)

// TestRepeat — table-driven, same shape you met in Chapter 1.
func TestRepeat(t *testing.T) {
	cases := []struct {
		name  string
		in    string
		count int
		want  string
	}{
		{name: "a few times", in: "a", count: 3, want: "aaa"},
		{name: "zero times is empty", in: "x", count: 0, want: ""},
		{name: "multi-character", in: "ab", count: 2, want: "abab"},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := Repeat(c.in, c.count)
			if got != c.want {
				t.Errorf("Repeat(%q, %d) = %q; want %q", c.in, c.count, got, c.want)
			}
		})
	}
}

// ExampleRepeat doubles as a runnable doc (Chapter 1's trick).
func ExampleRepeat() {
	fmt.Println(Repeat("=", 5))
	// Output: =====
}

// BenchmarkRepeat — your first benchmark. Run it with:
//
//	go test -bench=. ./iteration/
//
// Go calls this b.N times and reports ns/op. (The modern form is `for b.Loop()`.)
func BenchmarkRepeat(b *testing.B) {
	for i := 0; i < b.N; i++ {
		Repeat("a", 100)
	}
}
