//go:build solution

package di

import (
	"fmt"
	"io"
)

// Reference solution — QA only. Build/run with:  go test -tags solution ./exercises/di/
func Greet(writer io.Writer, name string) {
	fmt.Fprintf(writer, "Hello, %s", name)
}

func RegisterUser(name string, notifier Notifier) {
	notifier.Notify("Welcome, " + name + "!")
}
