//go:build !solution

// Package racer races two URLs and returns whichever responds first.
//
// NOTE: the chapter slug is "select", but `select` is a Go keyword and can't be
// a package name — so this package is named `racer`. The folder is still
// exercises/select/.
package racer

import "time"

// MODULE 10 — SELECT.

const tenSecondTimeout = 10 * time.Second

// Racer returns whichever of a or b responds first, using a 10-second default
// timeout. It just delegates to ConfigurableRacer — already wired up for you.
func Racer(a, b string) (string, error) {
	return ConfigurableRacer(a, b, tenSecondTimeout)
}

// ConfigurableRacer returns the faster of a or b, or an error if neither
// responds within timeout. Right now it lies (that's the RED state).
func ConfigurableRacer(a, b string, timeout time.Duration) (string, error) {
	return "", nil // TODO(you): select over ping(a), ping(b), and time.After(timeout)
}
