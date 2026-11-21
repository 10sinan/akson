package api

import (
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/go-chi/chi/v5/middleware"
)

// requestLogger is chi's default request logger, except that the "token" query
// parameter (used by SSE streams for AKSON_TOKEN) is replaced with "REDACTED" so the
// API token never ends up in stdout / docker logs.
var requestLogger = middleware.RequestLogger(redactingFormatter{
	&middleware.DefaultLogFormatter{Logger: log.New(os.Stdout, "", log.LstdFlags), NoColor: false},
})

type redactingFormatter struct {
	middleware.LogFormatter
}

func (f redactingFormatter) NewLogEntry(r *http.Request) middleware.LogEntry {
	return f.LogFormatter.NewLogEntry(redactTokenInRequest(r))
}

// redactTokenInRequest returns r itself when there is no token in the query string,
// otherwise a shallow copy whose URL and RequestURI hide the token value.
func redactTokenInRequest(r *http.Request) *http.Request {
	q := r.URL.Query()
	if _, ok := q["token"]; !ok {
		return r
	}
	q.Set("token", "REDACTED")
	u := *r.URL
	u.RawQuery = q.Encode()
	r2 := r.Clone(r.Context())
	r2.URL = &u
	r2.RequestURI = redactRequestURI(r.RequestURI, u.RawQuery)
	return r2
}

func redactRequestURI(requestURI, rawQuery string) string {
	path, _, _ := strings.Cut(requestURI, "?")
	if path == "" {
		path = "/"
	}
	if _, err := url.ParseRequestURI(path); err != nil {
		return "/"
	}
	return path + "?" + rawQuery
}
