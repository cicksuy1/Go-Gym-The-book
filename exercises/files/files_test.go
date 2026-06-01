package files

import (
	"testing"
	"testing/fstest"
)

// TestNewPostsFromFS uses an in-memory filesystem (fstest.MapFS) so the test
// never touches a real disk. MapFS returns entries sorted by name, so the parsed
// posts come back in a predictable order.
func TestNewPostsFromFS(t *testing.T) {
	fileSystem := fstest.MapFS{
		"hello world.md":  {Data: []byte("Title: Post 1\n\nbody1")},
		"hello-world2.md": {Data: []byte("Title: Post 2\n\nbody2")},
	}

	posts, err := NewPostsFromFS(fileSystem)
	if err != nil {
		t.Fatalf("NewPostsFromFS returned an unexpected error: %v", err)
	}

	if len(posts) != len(fileSystem) {
		t.Fatalf("got %d posts; want %d", len(posts), len(fileSystem))
	}

	wantTitles := []string{"Post 1", "Post 2"}
	for i, want := range wantTitles {
		if posts[i].Title != want {
			t.Errorf("posts[%d].Title = %q; want %q", i, posts[i].Title, want)
		}
	}

	wantBodies := []string{"body1", "body2"}
	for i, want := range wantBodies {
		if posts[i].Body != want {
			t.Errorf("posts[%d].Body = %q; want %q", i, posts[i].Body, want)
		}
	}
}
