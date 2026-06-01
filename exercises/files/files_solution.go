//go:build solution

package files

import (
	"bufio"
	"bytes"
	"fmt"
	"io"
	"io/fs"
	"strings"
)

// Reference solution — QA only. Build/run with:  go test -tags solution ./exercises/files/

const (
	titlePrefix = "Title: "
)

// Post is one parsed blog post: a Title line and the Body that follows it.
type Post struct {
	Title string
	Body  string
}

// NewPostsFromFS reads every file in the given filesystem and parses each into a Post.
func NewPostsFromFS(fileSystem fs.FS) ([]Post, error) {
	dir, err := fs.ReadDir(fileSystem, ".")
	if err != nil {
		return nil, err
	}

	var posts []Post
	for _, f := range dir {
		post, err := newPost(fileSystem, f.Name())
		if err != nil {
			return nil, err
		}
		posts = append(posts, post)
	}
	return posts, nil
}

func newPost(fileSystem fs.FS, fileName string) (Post, error) {
	postFile, err := fileSystem.Open(fileName)
	if err != nil {
		return Post{}, err
	}
	defer postFile.Close()

	return parsePost(postFile)
}

func parsePost(postFile io.Reader) (Post, error) {
	scanner := bufio.NewScanner(postFile)

	readMetaLine := func(prefix string) string {
		scanner.Scan()
		return strings.TrimPrefix(scanner.Text(), prefix)
	}

	title := readMetaLine(titlePrefix)

	scanner.Scan() // skip the blank separator line

	buf := bytes.Buffer{}
	for scanner.Scan() {
		fmt.Fprintln(&buf, scanner.Text())
	}
	body := strings.TrimSuffix(buf.String(), "\n")

	return Post{Title: title, Body: body}, nil
}
