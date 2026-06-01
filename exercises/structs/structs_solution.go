//go:build solution

package structs

import "math"

// Reference solution — QA only. Build/run with:  go test -tags solution ./exercises/structs/

// Shape is satisfied implicitly by any type with both methods below.
type Shape interface {
	Area() float64
	Perimeter() float64
}

// Rectangle is a shape with a Width and a Height.
type Rectangle struct {
	Width, Height float64
}

func (r Rectangle) Area() float64 {
	return r.Width * r.Height
}

func (r Rectangle) Perimeter() float64 {
	return 2 * (r.Width + r.Height)
}

// Circle is a shape with a Radius.
type Circle struct {
	Radius float64
}

func (c Circle) Area() float64 {
	return math.Pi * c.Radius * c.Radius
}

func (c Circle) Perimeter() float64 {
	return 2 * math.Pi * c.Radius
}
