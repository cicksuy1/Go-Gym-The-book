package arrays

import (
	"fmt"
	"slices"
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

// TestSumAll — the result is a *slice*, so == won't compile; this is where
// slices.Equal earns its keep. Note it treats a nil result and an empty one
// as equal, so the "no arguments" case doesn't force a special case on you.
func TestSumAll(t *testing.T) {
	cases := []struct {
		name string
		in   [][]int
		want []int
	}{
		{name: "two slices", in: [][]int{{1, 2}, {0, 9}}, want: []int{3, 9}},
		{name: "one slice", in: [][]int{{1, 2, 3}}, want: []int{6}},
		{name: "no slices at all", in: nil, want: []int{}},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := SumAll(c.in...)
			if !slices.Equal(got, c.want) {
				t.Errorf("SumAll(%v) = %v; want %v", c.in, got, c.want)
			}
		})
	}
}

// TestSumAllTails — the case to notice is the empty slice: there's no head to
// drop, so its tail sums to 0. numbers[1:] on an empty slice would panic —
// the test forces you to decide, not discover it in production.
func TestSumAllTails(t *testing.T) {
	cases := []struct {
		name string
		in   [][]int
		want []int
	}{
		{name: "tails of two slices", in: [][]int{{1, 2, 3}, {0, 9}}, want: []int{5, 9}},
		{name: "safely sums empty slice", in: [][]int{{}, {3, 4, 5}}, want: []int{0, 9}},
		{name: "single element has empty tail", in: [][]int{{7}}, want: []int{0}},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := SumAllTails(c.in...)
			if !slices.Equal(got, c.want) {
				t.Errorf("SumAllTails(%v) = %v; want %v", c.in, got, c.want)
			}
		})
	}
}

func ExampleSum() {
	fmt.Println(Sum([]int{10, 20, 30}))
	// Output: 60
}
