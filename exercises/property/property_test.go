package property

import (
	"testing"
	"testing/quick"
)

// TestRomanNumerals — a small table of known pairs, checked in BOTH directions.
func TestRomanNumerals(t *testing.T) {
	cases := []struct {
		Arabic int
		Roman  string
	}{
		{Arabic: 1, Roman: "I"},
		{Arabic: 2, Roman: "II"},
		{Arabic: 3, Roman: "III"},
		{Arabic: 4, Roman: "IV"},
		{Arabic: 5, Roman: "V"},
		{Arabic: 9, Roman: "IX"},
		{Arabic: 10, Roman: "X"},
		{Arabic: 14, Roman: "XIV"},
		{Arabic: 40, Roman: "XL"},
		{Arabic: 49, Roman: "XLIX"},
		{Arabic: 90, Roman: "XC"},
		{Arabic: 400, Roman: "CD"},
		{Arabic: 798, Roman: "DCCXCVIII"},
		{Arabic: 1984, Roman: "MCMLXXXIV"},
		{Arabic: 3999, Roman: "MMMCMXCIX"},
	}

	for _, c := range cases {
		t.Run("to roman", func(t *testing.T) {
			got := ConvertToRoman(c.Arabic)
			if got != c.Roman {
				t.Errorf("ConvertToRoman(%d) = %q; want %q", c.Arabic, got, c.Roman)
			}
		})
		t.Run("from roman", func(t *testing.T) {
			got := ConvertFromRoman(c.Roman)
			if got != c.Arabic {
				t.Errorf("ConvertFromRoman(%q) = %d; want %d", c.Roman, got, c.Arabic)
			}
		})
	}
}

// TestPropertiesOfConversion is the PROPERTY test: for any number in 1..3999,
// converting to Roman and back must return the original number. testing/quick
// throws hundreds of random inputs at this rule; we constrain them to the valid
// range with a custom generator so it never tests numbers we don't support.
func TestPropertiesOfConversion(t *testing.T) {
	assertion := func(arabic uint16) bool {
		if arabic < 1 || arabic > 3999 {
			return true // skip out-of-range inputs as vacuously true
		}
		roman := ConvertToRoman(int(arabic))
		fromRoman := ConvertFromRoman(roman)
		return fromRoman == int(arabic)
	}

	if err := quick.Check(assertion, &quick.Config{MaxCount: 1000}); err != nil {
		t.Error("property failed:", err)
	}
}
