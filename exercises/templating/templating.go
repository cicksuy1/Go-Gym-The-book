//go:build !solution

package templating

import "io"

// Post is the data we render into HTML.
type Post struct {
	Title string
	Body  string
}

// Render writes p to w as HTML, using a template.
//
// MODULE 17 — TEMPLATING.  Writes nothing right now, so the test stays RED.
func Render(w io.Writer, p Post) error {
	// TODO(you): parse the postTemplate string and Execute it against p, writing to w.
	return nil
}
