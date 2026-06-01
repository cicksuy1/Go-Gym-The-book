//go:build !solution

package genericsrevisit

// Reduce folds a collection down to a single value by repeatedly applying an
// accumulator function — the generic engine behind Sum, Map, Filter, and more.
//
// MODULE 19 — REVISITING ARRAYS & SLICES WITH GENERICS.  Both lie right now (RED).

// Reduce folds collection into one value of type B, starting from initialValue.
func Reduce[A, B any](collection []A, accumulator func(B, A) B, initialValue B) B {
	// TODO(you): fold the accumulator over every item, threading the running result.
	return initialValue
}

// Sum adds up a slice of ints, implemented on top of Reduce.
func Sum(numbers []int) int {
	// TODO(you): call Reduce with an accumulator that adds.
	return 0
}
