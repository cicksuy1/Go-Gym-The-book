//go:build solution

package reflection

import "reflect"

// Reference solution — QA only. Build/run with:  go test -tags solution ./exercises/reflection/
func Walk(x interface{}, fn func(input string)) {
	walkValue(reflect.ValueOf(x), fn)
}

func walkValue(val reflect.Value, fn func(input string)) {
	switch val.Kind() {
	case reflect.String:
		fn(val.String())
	case reflect.Struct:
		for i := 0; i < val.NumField(); i++ {
			walkValue(val.Field(i), fn)
		}
	case reflect.Pointer, reflect.Interface:
		walkValue(val.Elem(), fn)
	case reflect.Slice, reflect.Array:
		for i := 0; i < val.Len(); i++ {
			walkValue(val.Index(i), fn)
		}
	case reflect.Map:
		for _, key := range val.MapKeys() {
			walkValue(val.MapIndex(key), fn)
		}
	}
}
