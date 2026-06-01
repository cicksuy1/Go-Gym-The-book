//go:build solution

package maths

import (
	"math"
	"time"
)

// Reference solution — QA only. Build/run with:  go test -tags solution ./exercises/maths/

// secondsInRadians returns the angle of the second hand.
func secondsInRadians(t time.Time) float64 {
	return (math.Pi / (30 / float64(t.Second())))
}

// minutesInRadians returns the angle of the minute hand (including the seconds fraction).
func minutesInRadians(t time.Time) float64 {
	return (secondsInRadians(t) / 60) +
		(math.Pi / (30 / float64(t.Minute())))
}

// hoursInRadians returns the angle of the hour hand (including the minutes fraction).
func hoursInRadians(t time.Time) float64 {
	return (minutesInRadians(t) / 12) +
		(math.Pi / (6 / float64(t.Hour()%12)))
}
