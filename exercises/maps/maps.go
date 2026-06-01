//go:build !solution

package maps

import "errors"

// MODULE 6 — MAPS.  Make the tests pass with the comma-ok idiom.
// Right now these methods return the wrong things (that's the RED state).

// Dictionary is a map of words to their definitions, with behaviour attached.
type Dictionary map[string]string

// Sentinel errors — package-level values callers match with errors.Is.
var (
	ErrNotFound         = errors.New("could not find the word you were looking for")
	ErrWordExists       = errors.New("cannot add word because it already exists")
	ErrWordDoesNotExist = errors.New("cannot update word because it does not exist")
)

// Search returns the definition for word, or ErrNotFound if it isn't there.
func (d Dictionary) Search(word string) (string, error) {
	return "", nil // TODO(you): comma-ok the word; return ErrNotFound when missing
}

// Add inserts word→definition, or returns ErrWordExists if the word is present.
func (d Dictionary) Add(word, definition string) error {
	return nil // TODO(you): if the word exists return ErrWordExists, else set it
}

// Update changes an existing word, or returns ErrWordDoesNotExist if absent.
func (d Dictionary) Update(word, definition string) error {
	return nil // TODO(you): if the word is missing return ErrWordDoesNotExist, else set it
}

// Delete removes word from the dictionary.
func (d Dictionary) Delete(word string) {
	// TODO(you): use the builtin delete(d, word)
}
