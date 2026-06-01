//go:build solution

package iteration

// Reference solution — QA only. Build/run with:  go test -tags solution ./iteration/
func Repeat(s string, count int) string {
	var repeated string
	for i := 0; i < count; i++ {
		repeated += s
	}
	return repeated
}
