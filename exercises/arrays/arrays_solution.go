//go:build solution

package arrays

// Reference solution — QA only. Build/run with:  go test -tags solution ./arrays/
func Sum(numbers []int) int {
	sum := 0
	for _, n := range numbers {
		sum += n
	}
	return sum
}
