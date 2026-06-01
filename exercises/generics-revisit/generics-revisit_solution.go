//go:build solution

package genericsrevisit

// Reference solution — QA only. Build/run with:  go test -tags solution ./exercises/generics-revisit/

// Reduce folds collection into one value of type B, starting from initialValue.
func Reduce[A, B any](collection []A, accumulator func(B, A) B, initialValue B) B {
	result := initialValue
	for _, item := range collection {
		result = accumulator(result, item)
	}
	return result
}

// Sum adds up a slice of ints, implemented on top of Reduce.
func Sum(numbers []int) int {
	return Reduce(numbers, func(acc, x int) int {
		return acc + x
	}, 0)
}
