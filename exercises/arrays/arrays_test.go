package arrays

import (
	"fmt"
	"testing"
)

// TestSum — table-driven. Note the empty-slice case: a nil/empty slice should
// sum to 0, and ranging over it just does nothing. Pinning that down matters.
func TestSum(t *testing.T) {
	cases := []struct {
		name string
		in   []int
		want int
	}{
		{name: "a few numbers", in: []int{1, 2, 3}, want: 6},
		{name: "empty slice is zero", in: []int{}, want: 0},
		{name: "with negatives", in: []int{5, -2, -3}, want: 0},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := Sum(c.in)
			if got != c.want {
				t.Errorf("Sum(%v) = %d; want %d", c.in, got, c.want)
			}
		})
	}
}

func ExampleSum() {
	fmt.Println(Sum([]int{10, 20, 30}))
	// Output: 60
}
