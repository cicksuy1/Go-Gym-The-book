//go:build !solution

package arrays

// MODULE 3 — ARRAYS & SLICES.  Three reps, in order: Sum (range), SumAll
// (variadic + append), SumAllTails (slicing + the empty-slice decision).
// Each returns the wrong thing right now (that's the RED state).

// Sum adds up all the numbers in a slice and returns the total.
func Sum(numbers []int) int {
	return 0 // TODO(you): range over numbers and add them up
}

// SumAll takes any number of slices and returns a slice holding each one's total.
func SumAll(numbersToSum ...[]int) []int {
	return nil // TODO(you): build the totals with append — one Sum per slice
}

// SumAllTails returns the sum of each slice's tail (everything but the first
// element). The tail of an empty slice is empty, so its sum is 0.
func SumAllTails(numbersToSum ...[]int) []int {
	return nil // TODO(you): slice off the head with numbers[1:], guard the empty case
}
