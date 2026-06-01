//go:build !solution

package generics

// Stack is a last-in-first-out collection that works for ANY element type T.
//
// MODULE 18 — GENERICS.  The methods don't work yet, so the test stays RED.
type Stack[T any] struct {
	values []T
}

// Push adds v to the top of the stack.
func (s *Stack[T]) Push(v T) {
	// TODO(you): append v to s.values.
}

// Pop removes and returns the top value. The bool is false if the stack was empty.
func (s *Stack[T]) Pop() (T, bool) {
	// TODO(you): if empty return the zero value and false; otherwise return the last
	// element, shrink the slice, and return true.
	var zero T
	return zero, false
}

// IsEmpty reports whether the stack has no values.
func (s *Stack[T]) IsEmpty() bool {
	// TODO(you): a stack is empty when it holds no values.
	return true
}
