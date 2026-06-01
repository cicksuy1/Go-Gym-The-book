package integers

import (
	"fmt"
	"testing"
)

// TestAdd is a table-driven test: one list of cases, one loop.
// This is THE idiomatic Go test shape — get comfortable reading it.
func TestAdd(t *testing.T) {
	cases := []struct {
		name string
		x, y int
		want int
	}{
		{name: "two positives", x: 2, y: 4, want: 6},
		{name: "with zero", x: 9, y: 0, want: 9},
		{name: "a negative", x: 5, y: -3, want: 2},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := Add(c.x, c.y)
			if got != c.want {
				t.Errorf("Add(%d, %d) = %d; want %d", c.x, c.y, got, c.want)
			}
		})
	}
}

// ExampleAdd is special: it is a TEST *and* documentation at once.
// `go test` runs it and checks that what it prints matches the
// "// Output:" comment below. It also shows up in `go doc`.
// This is the Integers chapter's real lesson.
func ExampleAdd() {
	fmt.Println(Add(1, 5))
	// Output: 6
}
