//go:build !solution

package structs

// MODULE 4 — STRUCTS, METHODS & INTERFACES.
//
// Shape is an interface: any type with both an Area() and a Perimeter()
// method (both returning float64) satisfies it — implicitly. There is no
// "implements" keyword in Go; if it has the methods, it IS the interface.
type Shape interface {
	Area() float64
	Perimeter() float64
}

// Rectangle is a shape with a Width and a Height.
type Rectangle struct {
	Width, Height float64
}

// Area should return the rectangle's area. Right now it lies (that's RED).
func (r Rectangle) Area() float64 {
	return 0 // TODO(you): Width * Height
}

// Perimeter should return the rectangle's perimeter. Right now it lies.
func (r Rectangle) Perimeter() float64 {
	return 0 // TODO(you): 2 * (Width + Height)
}

// Circle is a shape with a Radius.
type Circle struct {
	Radius float64
}

// Area should return the circle's area. Right now it lies (that's RED).
func (c Circle) Area() float64 {
	return 0 // TODO(you): math.Pi * Radius * Radius  (import "math")
}

// Perimeter should return the circle's circumference. Right now it lies.
func (c Circle) Perimeter() float64 {
	return 0 // TODO(you): 2 * math.Pi * Radius  (import "math")
}
