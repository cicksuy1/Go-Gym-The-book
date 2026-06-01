package templating

import (
	"bytes"
	"strings"
	"testing"
)

// TestRender renders a Post into a buffer and checks the HTML contains the title
// and body. We assert on substrings (not an exact byte match) so the test stays
// robust to harmless whitespace differences.
func TestRender(t *testing.T) {
	post := Post{Title: "Hello", Body: "World"}

	var buf bytes.Buffer
	if err := Render(&buf, post); err != nil {
		t.Fatalf("Render returned an unexpected error: %v", err)
	}

	got := buf.String()

	if !strings.Contains(got, "<h1>Hello</h1>") {
		t.Errorf("rendered HTML %q does not contain the title heading", got)
	}
	if !strings.Contains(got, "<p>World</p>") {
		t.Errorf("rendered HTML %q does not contain the body paragraph", got)
	}
}

// TestRenderEscapes proves html/template auto-escapes dangerous input: a <script>
// tag in the data must NOT appear as a live tag in the output.
func TestRenderEscapes(t *testing.T) {
	post := Post{Title: "Hi", Body: "<script>alert('x')</script>"}

	var buf bytes.Buffer
	if err := Render(&buf, post); err != nil {
		t.Fatalf("Render returned an unexpected error: %v", err)
	}

	got := buf.String()
	if strings.Contains(got, "<script>") {
		t.Errorf("rendered HTML %q contains an unescaped <script> tag", got)
	}
}
