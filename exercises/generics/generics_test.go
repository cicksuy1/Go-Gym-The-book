package generics

import "testing"

// TestIntStack drives the SAME generic Stack type with ints.
func TestIntStack(t *testing.T) {
	stack := new(Stack[int])

	if !stack.IsEmpty() {
		t.Error("a brand-new stack should be empty")
	}

	stack.Push(1)
	stack.Push(2)

	if stack.IsEmpty() {
		t.Error("stack with two items should not be empty")
	}

	value, ok := stack.Pop()
	if !ok || value != 2 {
		t.Errorf("Pop() = (%d, %v); want (2, true)", value, ok)
	}

	value, ok = stack.Pop()
	if !ok || value != 1 {
		t.Errorf("Pop() = (%d, %v); want (1, true)", value, ok)
	}

	if !stack.IsEmpty() {
		t.Error("stack should be empty after popping everything")
	}

	// Popping an empty stack returns the zero value and false.
	value, ok = stack.Pop()
	if ok || value != 0 {
		t.Errorf("Pop() on empty = (%d, %v); want (0, false)", value, ok)
	}
}

// TestStringStack drives the SAME generic Stack type with strings — proving one
// definition serves many types with no casting.
func TestStringStack(t *testing.T) {
	stack := new(Stack[string])

	stack.Push("go")
	stack.Push("gym")

	value, ok := stack.Pop()
	if !ok || value != "gym" {
		t.Errorf("Pop() = (%q, %v); want (\"gym\", true)", value, ok)
	}

	value, ok = stack.Pop()
	if !ok || value != "go" {
		t.Errorf("Pop() = (%q, %v); want (\"go\", true)", value, ok)
	}

	value, ok = stack.Pop()
	if ok || value != "" {
		t.Errorf("Pop() on empty = (%q, %v); want (\"\", false)", value, ok)
	}
}
