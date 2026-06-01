//go:build solution

package templating

import (
	"html/template"
	"io"
)

// Reference solution — QA only. Build/run with:  go test -tags solution ./exercises/templating/

const postTemplate = `<h1>{{.Title}}</h1><p>{{.Body}}</p>`

// Post is the data we render into HTML.
type Post struct {
	Title string
	Body  string
}

// Render writes p to w as HTML, using a template.
func Render(w io.Writer, p Post) error {
	tmpl, err := template.New("post").Parse(postTemplate)
	if err != nil {
		return err
	}
	return tmpl.Execute(w, p)
}
