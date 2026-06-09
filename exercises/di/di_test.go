package di

import (
	"bytes"
	"fmt"
	"io"
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
		{name: "a name", in: "world", want: "Hello, world"},
		{name: "another name", in: "Go", want: "Hello, Go"},
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

// TestRegisterUser — the Notifier is INJECTED. We hand RegisterUser a notifier
// whose Out is a bytes.Buffer, so we read back exactly what was sent (same buffer
// trick as TestGreet — no fakes). Running the SAME RegisterUser call through two
// different notifiers, and seeing the prefix change, is dynamic dispatch in action.
func TestRegisterUser(t *testing.T) {
	cases := []struct {
		name     string
		notifier func(io.Writer) Notifier
		want     string
	}{
		{name: "email", notifier: func(w io.Writer) Notifier { return EmailNotifier{Out: w} }, want: "Sending email: Welcome, Alice!\n"},
		{name: "sms", notifier: func(w io.Writer) Notifier { return SMSNotifier{Out: w} }, want: "Sending SMS: Welcome, Alice!\n"},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			buffer := &bytes.Buffer{}
			RegisterUser("Alice", c.notifier(buffer))

			got := buffer.String()
			if got != c.want {
				t.Errorf("RegisterUser via %s notifier wrote %q; want %q", c.name, got, c.want)
			}
		})
	}
}

func ExampleGreet() {
	buffer := bytes.Buffer{}
	Greet(&buffer, "world")
	fmt.Println(buffer.String())
	// Output: Hello, world
}
