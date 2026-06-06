//go:build solution

package arrays

// Reference solution — QA only. Build/run with:  go test -tags solution ./exercises/arrays/

// Sum adds up all the numbers in a slice and returns the total.
func Sum(numbers []int) int {
	sum := 0
	for _, n := range numbers {
		sum += n
	}
	return sum
}

// SumAll takes any number of slices and returns a slice holding each one's total.
func SumAll(numbersToSum ...[]int) []int {
	var sums []int
	for _, numbers := range numbersToSum {
		sums = append(sums, Sum(numbers))
	}
	return sums
}

// SumAllTails returns the sum of each slice's tail (everything but the first
// element). The tail of an empty slice is empty, so its sum is 0.
func SumAllTails(numbersToSum ...[]int) []int {
	var sums []int
	for _, numbers := range numbersToSum {
		if len(numbers) == 0 {
			sums = append(sums, 0)
			continue
		}
		sums = append(sums, Sum(numbers[1:]))
	}
	return sums
}
