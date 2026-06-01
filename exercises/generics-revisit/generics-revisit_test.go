package genericsrevisit

import (
	"slices"
	"testing"
)

// TestSum proves the Reduce-backed Sum still adds ints correctly.
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

// TestReduce shows the SAME Reduce works across types and operations.
func TestReduce(t *testing.T) {
	t.Run("multiplication of all elements", func(t *testing.T) {
		multiply := func(acc, x int) int { return acc * x }
		got := Reduce([]int{1, 2, 3, 4}, multiply, 1)
		if got != 24 {
			t.Errorf("Reduce multiply = %d; want 24", got)
		}
	})

	t.Run("concatenate strings", func(t *testing.T) {
		concat := func(acc, x string) string { return acc + x }
		got := Reduce([]string{"a", "b", "c"}, concat, "")
		if got != "abc" {
			t.Errorf("Reduce concat = %q; want %q", got, "abc")
		}
	})

	t.Run("build a slice (different input and output types)", func(t *testing.T) {
		double := func(acc []int, x int) []int { return append(acc, x*2) }
		got := Reduce([]int{1, 2, 3}, double, []int{})
		want := []int{2, 4, 6}
		if !slices.Equal(got, want) {
			t.Errorf("Reduce double = %v; want %v", got, want)
		}
	})
}
