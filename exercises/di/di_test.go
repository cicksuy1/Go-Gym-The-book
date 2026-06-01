package di

import (
	"bytes"
	"fmt"
	"testing"
)

// TestGreet — the destination is INJECTED. We hand Greet a bytes.Buffer (which
// is an io.Writer) so we can read back exactly what it wrote. No console capture,
// no temp files — that ease is the whole point of dependency injection.
func TestGreet(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{name: "a name", in: "Chris", want: "Hello, Chris"},
		{name: "another name", in: "Dolores", want: "Hello, Dolores"},
		{name: "empty name", in: "", want: "Hello, "},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			buffer := bytes.Buffer{}
			Greet(&buffer, c.in)

			got := buffer.String()
			if got != c.want {
				t.Errorf("Greet(buffer, %q) wrote %q; want %q", c.in, got, c.want)
			}
		})
	}
}

func ExampleGreet() {
	buffer := bytes.Buffer{}
	Greet(&buffer, "Chris")
	fmt.Println(buffer.String())
	// Output: Hello, Chris
}
