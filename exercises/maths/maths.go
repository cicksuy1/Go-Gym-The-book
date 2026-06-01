//go:build !solution

package maths

import "time"

// These functions return the angle (in radians, measured clockwise from the
// 12 o'clock position) of each hand of an analogue clock for the given time.
//
// MODULE 15 — MATHS.  Each returns 0 right now, so the test stays RED.

// secondsInRadians returns the angle of the second hand.
func secondsInRadians(t time.Time) float64 {
	// TODO(you): fraction of the way around the clock * 2*math.Pi.
	return 0
}

// minutesInRadians returns the angle of the minute hand (including the seconds fraction).
func minutesInRadians(t time.Time) float64 {
	// TODO(you): the minute hand also creeps forward with the seconds.
	return 0
}

// hoursInRadians returns the angle of the hour hand (including the minutes fraction).
func hoursInRadians(t time.Time) float64 {
	// TODO(you): the hour hand creeps forward with the minutes; remember 12-hour wrap.
	return 0
}
