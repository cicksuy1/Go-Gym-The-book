package reflection

import (
	"reflect"
	"testing"
)

// TestWalk — table-driven. Each case feeds Walk a different shape of value and
// records every string it visits, then we compare the collected strings.
func TestWalk(t *testing.T) {
	type Person struct {
		Name string
		City string
	}

	type Profile struct {
		Age    int
		Person Person
	}

	cases := []struct {
		name          string
		input         interface{}
		expectedCalls []string
	}{
		{
			name:          "struct with one string field",
			input:         struct{ Name string }{"Chris"},
			expectedCalls: []string{"Chris"},
		},
		{
			name:          "struct with two string fields",
			input:         Person{"Chris", "London"},
			expectedCalls: []string{"Chris", "London"},
		},
		{
			name:          "nested struct",
			input:         Profile{33, Person{"Chris", "London"}},
			expectedCalls: []string{"Chris", "London"},
		},
		{
			name:          "pointer to struct",
			input:         &Profile{33, Person{"Chris", "London"}},
			expectedCalls: []string{"Chris", "London"},
		},
		{
			name:          "slice of structs",
			input:         []Person{{"Chris", "London"}, {"Ruth", "Paris"}},
			expectedCalls: []string{"Chris", "London", "Ruth", "Paris"},
		},
		{
			name:          "array of structs",
			input:         [2]Person{{"Chris", "London"}, {"Ruth", "Paris"}},
			expectedCalls: []string{"Chris", "London", "Ruth", "Paris"},
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			var got []string
			Walk(c.input, func(input string) {
				got = append(got, input)
			})

			if !reflect.DeepEqual(got, c.expectedCalls) {
				t.Errorf("got %v, want %v", got, c.expectedCalls)
			}
		})
	}
}

// Map ordering is not guaranteed, so we check membership rather than order.
func TestWalkWithMaps(t *testing.T) {
	input := map[string]string{
		"Cow":   "Moo",
		"Sheep": "Baa",
	}

	var got []string
	Walk(input, func(input string) {
		got = append(got, input)
	})

	assertContains(t, got, "Moo")
	assertContains(t, got, "Baa")
}

func assertContains(t *testing.T, haystack []string, needle string) {
	t.Helper()
	for _, x := range haystack {
		if x == needle {
			return
		}
	}
	t.Errorf("expected %v to contain %q but it didn't", haystack, needle)
}
