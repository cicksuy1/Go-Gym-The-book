//go:build solution

package integers

// Reference solution — used by QA mode only, never shown to the learner.
// Build/run it with:  go test -tags solution ./integers/
//
// The stub the learner edits lives in integers.go (//go:build !solution).
// Exactly one of the two files compiles per build, so Add is never declared twice.
func Add(x, y int) int {
	return x + y
}
