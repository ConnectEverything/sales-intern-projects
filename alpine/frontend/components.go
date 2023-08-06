package frontend

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/ConnectEverything/sales-intern-projects/htmx/models"
	"github.com/ConnectEverything/sales-intern-projects/htmx/toolbelt"
	"github.com/benbjohnson/hashfs"
	"github.com/delaneyj/gomponents-iconify/iconify/mdi"
	g "github.com/maragudk/gomponents"
	c "github.com/maragudk/gomponents/components"
	h "github.com/maragudk/gomponents/html"
)

//go:embed static/*
var staticFS embed.FS

var staticSys = hashfs.NewFS(staticFS)

func staticPath(path string) string {
	return "/" + staticSys.HashName("static/"+path)
}

var (
	A           = h.A
	ATTR        = g.Attr
	DIV         = h.Div
	BUTTON      = h.Button
	SPAN        = h.Span
	CLS         = h.Class
	META        = h.Meta
	NAME        = h.Name
	CONTENT     = h.Content
	LINK        = h.Link
	REL         = h.Rel
	CHARSET     = h.Charset
	TITLE       = h.TitleEl
	HEAD        = h.Head
	HTML        = h.HTML
	DOCTYPE     = h.Doctype
	BODY        = h.Body
	LANG        = h.Lang
	HR          = h.Hr
	HREF        = h.Href
	IMG         = h.Img
	SRC         = h.Src
	SCRIPT      = h.Script
	LABEL       = h.Label
	PLACEHOLDER = h.Placeholder
	TEXTAREA    = h.Textarea
	SELECT      = h.Select
	OPTION      = h.Option
	TABLE       = h.Table
	CAPTION     = h.Caption
	THEAD       = h.THead
	TBODY       = h.TBody
	TR          = h.Tr
	TH          = h.Th
	TD          = h.Td

	DEFER    = h.Defer()
	REQUIRED = h.Required()
	DISABLED = h.Disabled()
	SELECTED = h.Selected()
	RAW      = g.Raw

	H1 = h.H1
	H2 = h.H2
	H3 = h.H3
	H4 = h.H4
	H5 = h.H5
	H6 = h.H6
	P  = h.P

	PRE = h.Pre

	UL = h.Ul
	LI = h.Li

	ID  = h.ID
	ALT = h.Alt

	FORM   = h.FormEl
	INPUT  = h.Input
	TYPE   = h.Type
	VALUE  = h.Value
	ACTION = h.Action
	METHOD = h.Method
)

type (
	CLSS  = c.Classes
	NODE  = g.Node
	NODES = []g.Node
)

func GRP(children ...NODE) NODE {
	return g.Group(children)
}

func Centerer(outerClasses, centeredClasses string, children ...NODE) NODE {
	return DIV(
		CLS("flex-1 flex min-h-screen justify-center "+outerClasses),
		DIV(
			CLS("flex items-center"),
			DIV(
				CLS(centeredClasses),
				GRP(children...),
			),
		),
	)
}

func COLSPAN(colspan int) NODE {
	return ATTR("colspan", strconv.Itoa(colspan))
}

func VALUEI[T uint | uint8 | uint16 | uint32 | uint64 | int | int8 | int16 | int32 | int64](v T) NODE {
	return VALUE(strconv.Itoa(int(v)))
}

func TXT(text string) NODE {
	return g.Text(text)
}

func TXTI[T uint | uint8 | uint16 | uint32 | uint64 | int | int8 | int16 | int32 | int64](v T) NODE {
	return TXT(strconv.Itoa(int(v)))
}

func TXTF(format string, args ...interface{}) NODE {
	return TXT(fmt.Sprintf(format, args...))
}

func SAFE(text string) NODE {
	return g.Raw(text)
}

type NodeFn func() NODE

func TERN(cond bool, ifTrue, ifFalse NodeFn) NODE {
	if cond {
		return ifTrue()
	}
	return ifFalse()
}

func EMPTY[T any](arr []T) bool {
	return len(arr) == 0
}

func PREJSON[T any](v T) NODE {
	b, err := json.MarshalIndent(v, "", " ")
	if err != nil {
		return TXT(err.Error())
	}
	return PRE(SAFE(string(b)))
}

func PAGE(title string, bodyChildren ...NODE) NODE {
	return c.HTML5(c.HTML5Props{
		Title: title,
		Head: NODES{
			META(CHARSET("utf-8")),
			META(NAME("viewport"), CONTENT("width=device-width, initial-scale=1")),
			LINK(REL("stylesheet"), HREF(staticPath("tailwind.css"))),
			LINK(REL("icon"), HREF(staticPath("favicon.png")), TYPE("image/png")),
			SCRIPT(DEFER, SRC("https://cdn.jsdelivr.net/npm/@imacrayon/alpine-ajax@0.2.1/dist/cdn.min.js")),
			SCRIPT(DEFER, SRC("https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js")),
		},
		Body: NODES{
			ID("body"),
			// HXBOOST,
			GRP(bodyChildren...),
		},
	})
}

func navbar(ctx context.Context) NODE {
	u := models.UserFromContext(ctx)

	return DIV(
		CLS("navbar bg-base-200 sticky top-0 z-50 shadow-xl"),
		DIV(
			CLS("flex-1 text-2xl font-bold"),
			TXT("SynadiaChat"),
		),
		DIV(
			CLS("flex items-center gap-1"),
			IMG(
				CLS("rounded-full w-12 h-12 shadow-xl"),
				SRC(u.AvatarURL),
			),
			A(
				CLS("btn btn-ghost"),
				HREF("/auth/logout"),
				mdi.Logout(),
				TXT("Logout"),
			),
		),
	)
}

func loggedInPage(ctx context.Context, title string, bodyChildren ...NODE) NODE {
	return PAGE(
		title,
		navbar(ctx),
		DIV(
			CLS("p-4 flex flex-col gap-2"),
			GRP(bodyChildren...),
		),
	)
}

func RANGE[T any](ts []T, cb func(item T) NODE) NODE {
	var nodes []NODE
	for _, t := range ts {
		nodes = append(nodes, cb(t))
	}
	return GRP(nodes...)
}

func RANGEI[T any](ts []T, cb func(i int, item T) NODE) NODE {
	var nodes []NODE
	for i, t := range ts {
		nodes = append(nodes, cb(i, t))
	}
	return GRP(nodes...)
}

func IF(cond bool, ifTrue NodeFn) NODE {
	if cond {
		return ifTrue()
	}
	return nil
}

func MINLEN(min int) NODE {
	return h.MinLength(strconv.Itoa(min))
}

func MAXLEN(max int) NODE {
	return h.MaxLength(strconv.Itoa(max))
}

var icons = map[string]string{}

func ICON(name string, children ...NODE) NODE {
	src, ok := icons[name]
	if !ok {
		parts := strings.Split(name, ":")
		if len(parts) != 2 {
			return TXT("unknown icon: " + name)
		}
		prefix := parts[0]
		icon := parts[1]
		src = fmt.Sprintf("https://api.iconify.design/%s/%s.svg", prefix, icon)

		icons[name] = src
	}

	return IMG(
		CLS("fill-white"),
		SRC(src),
		GRP(children...),
	)
}

func LabelText(label, text string) NODE {
	return GRP(
		LABEL(
			CLS("label"),
			SPAN(TXT(label)),
		),
		INPUT(
			CLS("input input-bordered w-full"),
			NAME(toolbelt.Snake(label)),
			VALUE(text),
		),
	)
}

func LabelTextarea(label string, rows int, text string) NODE {
	return GRP(
		LABEL(
			CLS("label"),
			SPAN(TXT(label)),
		),
		TEXTAREA(
			CLS("textarea textarea-bordered w-full"),
			ROWS(rows),
			NAME(toolbelt.Snake(label)),
			TXT(text),
		),
	)
}

func SubmitButton(nodes ...NODE) NODE {
	return DIV(
		BUTTON(
			CLS("btn btn-primary items-center"),
			GRP(nodes...),
		))
}

func INDICATOR(id string) NODE {
	return SPAN(
		ID(id),
		CLS("htmx-indicator loading loading-infinity loading-lg"),
	)
}

func ROWS(rows int) NODE {
	return h.Rows(strconv.Itoa(rows))
}

func Render(w http.ResponseWriter, node NODE) {
	err := node.Render(w)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
