package maps

import (
	"errors"
	"testing"
)

func TestSearch(t *testing.T) {
	dictionary := Dictionary{"go": "a statically typed, compiled language"}

	t.Run("known word", func(t *testing.T) {
		got, err := dictionary.Search("go")
		assertNoError(t, err)
		assertStrings(t, got, "a statically typed, compiled language")
	})

	t.Run("unknown word", func(t *testing.T) {
		_, err := dictionary.Search("ghost")
		assertError(t, err, ErrNotFound)
	})
}

func TestAdd(t *testing.T) {
	t.Run("new word", func(t *testing.T) {
		dictionary := Dictionary{}
		err := dictionary.Add("go", "a language")
		assertNoError(t, err)
		assertDefinition(t, dictionary, "go", "a language")
	})

	t.Run("existing word", func(t *testing.T) {
		dictionary := Dictionary{"go": "a language"}
		err := dictionary.Add("go", "something else")
		assertError(t, err, ErrWordExists)
		// the original definition must be left untouched
		assertDefinition(t, dictionary, "go", "a language")
	})
}

func TestUpdate(t *testing.T) {
	t.Run("existing word", func(t *testing.T) {
		dictionary := Dictionary{"go": "a language"}
		err := dictionary.Update("go", "a compiled language")
		assertNoError(t, err)
		assertDefinition(t, dictionary, "go", "a compiled language")
	})

	t.Run("missing word", func(t *testing.T) {
		dictionary := Dictionary{}
		err := dictionary.Update("go", "a language")
		assertError(t, err, ErrWordDoesNotExist)
	})
}

func TestDelete(t *testing.T) {
	dictionary := Dictionary{"go": "a language"}
	dictionary.Delete("go")

	_, err := dictionary.Search("go")
	assertError(t, err, ErrNotFound)
}

func assertStrings(t testing.TB, got, want string) {
	t.Helper()
	if got != want {
		t.Errorf("got %q want %q", got, want)
	}
}

func assertError(t testing.TB, got, want error) {
	t.Helper()
	if !errors.Is(got, want) {
		t.Errorf("got error %q want %q", got, want)
	}
}

func assertNoError(t testing.TB, got error) {
	t.Helper()
	if got != nil {
		t.Errorf("got an unexpected error %q", got)
	}
}

func assertDefinition(t testing.TB, dictionary Dictionary, word, definition string) {
	t.Helper()
	got, err := dictionary.Search(word)
	if err != nil {
		t.Fatalf("expected %q to be in the dictionary, but it was missing", word)
	}
	assertStrings(t, got, definition)
}
