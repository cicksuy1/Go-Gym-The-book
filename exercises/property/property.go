//go:build !solution

package property

// ConvertToRoman turns an Arabic number (1..3999) into a Roman numeral string,
// and ConvertFromRoman turns a Roman numeral back into its Arabic value.
//
// MODULE 14 — PROPERTY-BASED TESTS.  Both lie right now, so the test stays RED.

// ConvertToRoman converts an Arabic integer to a Roman numeral.
func ConvertToRoman(arabic int) string {
	// TODO(you): build the numeral with a table of value→symbol, subtracting as you go.
	return ""
}

// ConvertFromRoman converts a Roman numeral back to an Arabic integer.
func ConvertFromRoman(roman string) int {
	// TODO(you): walk the table, matching each symbol and adding its value.
	return 0
}
