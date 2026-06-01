//go:build !solution

package files

import "io/fs"

// Post is one parsed blog post: a Title line and the Body that follows it.
type Post struct {
	Title string
	Body  string
}

// NewPostsFromFS reads every file in the given filesystem and parses each into a Post.
//
// MODULE 16 — READING FILES.  Returns nil right now, so the test stays RED.
func NewPostsFromFS(fileSystem fs.FS) ([]Post, error) {
	// TODO(you): fs.ReadDir the filesystem, then open and parse each file into a Post.
	return nil, nil
}
