//go:build !solution

package reflection

// Walk inspects x at runtime and calls fn once for every string it can find —
// inside struct fields, nested structs, pointers, slices, arrays, and map values.
//
// MODULE 11 — REFLECTION.  Right now it does nothing, so the test stays RED.
func Walk(x interface{}, fn func(input string)) {
	// TODO(you): use reflect.ValueOf(x) and recurse over its Kind().
	// Handle String, Struct, Pointer/Interface (Elem), Slice/Array (Index), Map (MapIndex).
}
