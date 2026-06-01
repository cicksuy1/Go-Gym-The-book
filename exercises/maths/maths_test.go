package maths

import (
	"math"
	"testing"
	"time"
)

// Floats are inexact, so we never compare with ==. roughlyEqual checks that two
// angles are within a tiny tolerance of each other.
func roughlyEqual(a, b float64) bool {
	const tolerance = 1e-7
	return math.Abs(a-b) < tolerance
}

func simpleTime(hours, minutes, seconds int) time.Time {
	return time.Date(2024, time.January, 1, hours, minutes, seconds, 0, time.UTC)
}

func TestSecondsInRadians(t *testing.T) {
	cases := []struct {
		time  time.Time
		angle float64
	}{
		{simpleTime(0, 0, 30), math.Pi},
		{simpleTime(0, 0, 0), 0},
		{simpleTime(0, 0, 45), (math.Pi / 2) * 3},
		{simpleTime(0, 0, 15), math.Pi / 2},
	}

	for _, c := range cases {
		t.Run(c.time.Format("15:04:05"), func(t *testing.T) {
			got := secondsInRadians(c.time)
			if !roughlyEqual(got, c.angle) {
				t.Errorf("secondsInRadians(%v) = %v; want %v", c.time, got, c.angle)
			}
		})
	}
}

func TestMinutesInRadians(t *testing.T) {
	cases := []struct {
		time  time.Time
		angle float64
	}{
		{simpleTime(0, 30, 0), math.Pi},
		{simpleTime(0, 0, 7), 7 * (math.Pi / (30 * 60))},
	}

	for _, c := range cases {
		t.Run(c.time.Format("15:04:05"), func(t *testing.T) {
			got := minutesInRadians(c.time)
			if !roughlyEqual(got, c.angle) {
				t.Errorf("minutesInRadians(%v) = %v; want %v", c.time, got, c.angle)
			}
		})
	}
}

func TestHoursInRadians(t *testing.T) {
	cases := []struct {
		time  time.Time
		angle float64
	}{
		{simpleTime(6, 0, 0), math.Pi},
		{simpleTime(0, 0, 0), 0},
		{simpleTime(21, 0, 0), math.Pi * 1.5},
		{simpleTime(0, 1, 30), math.Pi / ((6 * 60 * 60) / 90)},
	}

	for _, c := range cases {
		t.Run(c.time.Format("15:04:05"), func(t *testing.T) {
			got := hoursInRadians(c.time)
			if !roughlyEqual(got, c.angle) {
				t.Errorf("hoursInRadians(%v) = %v; want %v", c.time, got, c.angle)
			}
		})
	}
}
