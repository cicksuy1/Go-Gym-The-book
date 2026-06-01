//go:build solution

package generics

// Reference solution — QA only. Build/run with:  go test -tags solution ./exercises/generics/

// Stack is a last-in-first-out collection that works for ANY element type T.
type Stack[T any] struct {
	values []T
}

// Push adds v to the top of the stack.
func (s *Stack[T]) Push(v T) {
	s.values = append(s.values, v)
}

// Pop removes and returns the top value. The bool is false if the stack was empty.
func (s *Stack[T]) Pop() (T, bool) {
	if s.IsEmpty() {
		var zero T
		return zero, false
	}
	index := len(s.values) - 1
	top := s.values[index]
	s.values = s.values[:index]
	return top, true
}

// IsEmpty reports whether the stack has no values.
func (s *Stack[T]) IsEmpty() bool {
	return len(s.values) == 0
}
