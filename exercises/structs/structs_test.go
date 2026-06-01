package structs

import (
	"fmt"
	"math"
	"testing"
)

// tol is our float tolerance: "close enough". You CANNOT compare floats with
// == and trust it — binary can't store most decimals exactly, so a correct
// answer can land a hair off. The fix is math.Abs(got-want) > tol.
const tol = 1e-9

// TestShapes is table-driven over the Shape INTERFACE. Each row stores a
// concrete shape in a Shape-typed field, so the test exercises the interface
// exactly the way a real caller would — without caring which shape it holds.
func TestShapes(t *testing.T) {
	cases := []struct {
		name      string
		shape     Shape
		wantArea  float64
		wantPerim float64
	}{
		{name: "rectangle", shape: Rectangle{Width: 12, Height: 6}, wantArea: 72, wantPerim: 36},
		{name: "circle", shape: Circle{Radius: 10}, wantArea: 314.1592653589793, wantPerim: 62.83185307179586},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := c.shape.Area(); math.Abs(got-c.wantArea) > tol {
				t.Errorf("Area() = %v; want %v (diff > %v)", got, c.wantArea, tol)
			}
			if got := c.shape.Perimeter(); math.Abs(got-c.wantPerim) > tol {
				t.Errorf("Perimeter() = %v; want %v (diff > %v)", got, c.wantPerim, tol)
			}
		})
	}
}

func ExampleRectangle_Area() {
	r := Rectangle{Width: 5, Height: 4}
	fmt.Println(r.Area())
	// Output: 20
}
