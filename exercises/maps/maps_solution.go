//go:build solution

package maps

import "errors"

// Reference solution — QA only. Build/run with:  go test -tags solution ./exercises/maps/

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
	definition, ok := d[word]
	if !ok {
		return "", ErrNotFound
	}
	return definition, nil
}

// Add inserts word→definition, or returns ErrWordExists if the word is present.
func (d Dictionary) Add(word, definition string) error {
	_, ok := d[word]
	if ok {
		return ErrWordExists
	}
	d[word] = definition
	return nil
}

// Update changes an existing word, or returns ErrWordDoesNotExist if absent.
func (d Dictionary) Update(word, definition string) error {
	_, ok := d[word]
	if !ok {
		return ErrWordDoesNotExist
	}
	d[word] = definition
	return nil
}

// Delete removes word from the dictionary.
func (d Dictionary) Delete(word string) {
	delete(d, word)
}
