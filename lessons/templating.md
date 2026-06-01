# 17 · Templating 🟡

> *Building HTML by gluing strings together — `"<h1>" + title + "</h1>"` — is one of the oldest mistakes
> in web programming. It's tedious, and worse, it's a **security hole**: if `title` contains a `<script>`
> tag from a malicious user, you've just shipped an attack. Go's `html/template` package solves both
> problems at once: it separates *layout* from *data*, and it **auto-escapes** every value so untrusted
> input can't break out. This chapter shows you the safe, clean way.*

**What you'll build:** `Render` — turn a `Post` struct into HTML using a template, with escaping handled
for you.

**Files for this chapter:** `exercises/templating/templating.go` (you fix this) · `exercises/templating/templating_test.go` (written for you).

---

## Where we're going

By the end of this chapter you'll be able to:

1. Explain what a **template** is and why it beats string concatenation.
2. Parse a template and **execute** it against a struct, writing to an `io.Writer`.
3. Use the `{{.Field}}` action to pull data out of the value you pass in.
4. Understand **auto-escaping** and why `html/template` is safer than `text/template`.
5. Write to *any* `io.Writer` — a buffer in tests, a network connection in production.

---

## The big idea: layout with holes in it

A **template** is a chunk of text with **placeholders** that get filled in from data. Instead of building
HTML piece by piece, you write the *shape* once and hand it a value to pour in:

```text
   template:  <h1>{{.Title}}</h1><p>{{.Body}}</p>
                    └──┬───┘          └──┬──┘
   data (a Post): Title="Hello"     Body="World"
                              ▼
   output:    <h1>Hello</h1><p>World</p>
```

The `{{...}}` bits are **actions**. The most common is `{{.Field}}` — the dot (`.`) means "the value I was
given," so `{{.Title}}` means "the `Title` field of the data." You write the layout as plain HTML, mark the
holes, and the template engine fills them. Layout and data stay cleanly separate, which is exactly what
makes templates pleasant to read and edit.

---

## Two steps: parse, then execute

Using a template is always two moves:

1. **Parse** the template text into a `*template.Template`. This happens once and checks the syntax.
2. **Execute** it against your data, writing the result to an `io.Writer`.

```go
import "html/template"

tmpl, err := template.New("post").Parse(postTemplate)
if err != nil {
	return err
}
return tmpl.Execute(w, p)
```

`template.New("post")` names the template (handy in errors); `.Parse(...)` compiles it; `.Execute(w, p)`
runs it, pushing the filled-in HTML into `w` and pulling fields from `p`.

> **Keeping it self-contained.** Real apps often keep templates in separate `.html` files and load them
> with `ParseFiles`. Here we keep the template as an **inline string constant** so the whole exercise lives
> in one Go file with no extra files to ship. The mechanics are identical.

You'll also see `template.Must(...)` in real code — it wraps `Parse` and **panics** if the template is
broken. That's fine for templates defined as constants at startup (a broken constant template is a bug you
want to crash on immediately), but in a function that returns an `error`, checking the error explicitly is
the cleaner habit.

---

## Writing to any `io.Writer`

Notice `Execute(w io.Writer, ...)`. That `io.Writer` is the same interface you met earlier — *anything you
can write bytes to*. In production you'd pass an `http.ResponseWriter` (the HTTP connection). In a test you
pass a `bytes.Buffer` and then inspect what got written. **Same `Render`, different destination** — that's
the payoff of programming to `io.Writer` instead of hard-coding where the output goes.

---

## The safety feature: `html/template` auto-escapes

Here's the part that matters most. There are *two* template packages:

- `text/template` — fills in placeholders verbatim. Fine for config files, emails, code generation.
- `html/template` — same syntax, but it **understands HTML** and automatically **escapes** any value that
  would otherwise be dangerous.

Why that matters: imagine a user sets their post body to `<script>steal()</script>`. With naive string
building (or `text/template`), that script tag lands in your page and *runs* — a classic XSS attack. With
`html/template`, the engine knows it's putting that value into HTML and rewrites it to harmless text
(`&lt;script&gt;...`), so it displays as characters instead of executing.

```text
   data Body = "<script>alert('x')</script>"
   html/template output: &lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;   ← inert, safe
```

**Use `html/template` for anything that becomes a web page.** The escaping is automatic and context-aware —
you get it for free just by importing the right package. That single import choice is a real security
decision.

---

## Prove it with a test

`templating_test.go` renders into a `bytes.Buffer` and checks **substrings** rather than an exact match:

```go
var buf bytes.Buffer
Render(&buf, Post{Title: "Hello", Body: "World"})
got := buf.String()
strings.Contains(got, "<h1>Hello</h1>")  // true
strings.Contains(got, "<p>World</p>")    // true
```

Asserting "contains the heading and the paragraph" instead of comparing every byte keeps the test from
breaking over trivial whitespace — it checks what actually matters. There's also a second test that proves
the **escaping**: it renders a `<script>` in the body and asserts the output does **not** contain a live
`<script>` tag. That test *is* the security guarantee, written down and runnable.

---

## 🏋️ Your rep — make it GREEN

Right now `Render` writes nothing:

```go
func Render(w io.Writer, p Post) error {
	return nil // TODO(you)
}
```

1. Watch it fail (RED): `go test ./exercises/templating/`
2. Implement `Render` with a recipe:
   1. Define the template string (a `const`), e.g. `<h1>{{.Title}}</h1><p>{{.Body}}</p>`.
   2. `template.New("post").Parse(...)` it. If parsing errors, return that error.
   3. Call `.Execute(w, p)` and return whatever it returns (nil on success).
   4. Make sure you import `html/template`, **not** `text/template` — the escaping test depends on it.
3. Run again → **GREEN**, including the auto-escape test. You just rendered safe HTML.

### Stretch goals (ask your tutor to scaffold any)

- Add a `{{range .Tags}}#{{.}} {{end}}` section to render a list of tags from a `[]string` field.
- Switch the import to `text/template` and watch the escaping test **fail** — proof the package choice matters.

---

## 🧠 Active recall — no peeking

1. What does `{{.Title}}` mean inside a template — what is the `.`?
2. What are the two steps to use a template, and what does `Execute`'s first argument accept?
3. Why use `html/template` instead of `text/template` for a web page? What attack does it prevent?
4. Why does the test check `strings.Contains` instead of comparing the full output byte-for-byte?

---

## 🔍 Real code in the wild

Open [`html/template`](https://pkg.go.dev/html/template) and its sibling
[`text/template`](https://pkg.go.dev/text/template). The docs spell out the key line: `html/template` "is
the same as `text/template` but it automatically secures HTML output against certain attacks." Nearly every
Go web server renders pages through `html/template`, executing straight into the `http.ResponseWriter`.
The `Render` you wrote is the exact shape of that production code — minus a few thousand requests per
second.

---

## What you learned

- A **template** is layout with `{{...}}` placeholders filled from data — far better than string concatenation.
- Use templates in two steps: **Parse** the text, then **Execute** it against your value.
- `{{.Field}}` reads a field from the data; the `.` is "the value passed in."
- `Execute` writes to any **`io.Writer`** — a buffer in tests, an HTTP connection in production.
- **`html/template` auto-escapes** untrusted data, preventing XSS; `text/template` does not. Choose deliberately.

✅ **Done when:** `go test ./exercises/templating/` is GREEN and you can answer the four recall questions.

**Next:** Chapter 18 — *Generics*, where one function or type can serve many types safely.
