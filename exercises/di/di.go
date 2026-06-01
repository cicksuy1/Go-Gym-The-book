//go:build !solution

package di

import "io"

// Greet writes "Hello, <name>" to the given writer.
//
// MODULE 7 — DEPENDENCY INJECTION.  The destination is INJECTED: instead of
// reaching for os.Stdout, Greet writes to whatever io.Writer it is handed.
// Right now the body is empty, so nothing is written (that's the RED state).
func Greet(writer io.Writer, name string) {
	// TODO(you): write "Hello, "+name to writer (hint: fmt.Fprintf)
}
