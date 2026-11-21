package api

import (
	"bytes"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5/middleware"
)

func TestRedactTokenInRequest(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/v1/containers/abc/logs/stream?tail=100&token=s3cr3t-value", nil)
	got := redactTokenInRequest(req)

	if strings.Contains(got.RequestURI, "s3cr3t-value") || strings.Contains(got.URL.String(), "s3cr3t-value") {
		t.Fatalf("token still visible: %q / %q", got.RequestURI, got.URL.String())
	}
	if !strings.Contains(got.RequestURI, "tail=100") || !strings.HasPrefix(got.RequestURI, "/api/v1/containers/abc/logs/stream?") {
		t.Fatalf("unexpected request URI %q", got.RequestURI)
	}
	// The original request (used by the auth middleware) keeps the real token.
	if req.URL.Query().Get("token") != "s3cr3t-value" {
		t.Fatal("original request was modified")
	}

	plain := httptest.NewRequest("GET", "/api/v1/containers/?all=1", nil)
	if redactTokenInRequest(plain) != plain {
		t.Fatal("request without token should be returned unchanged")
	}
}

func TestRequestLoggerDoesNotLogToken(t *testing.T) {
	var buf bytes.Buffer
	logger := middleware.RequestLogger(redactingFormatter{
		&middleware.DefaultLogFormatter{Logger: log.New(&buf, "", 0), NoColor: true},
	})
	h := logger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("token") != "s3cr3t-value" {
			t.Error("handler should still see the real token")
		}
		w.WriteHeader(http.StatusOK)
	}))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("GET", "/api/v1/containers/x/stats/stream?token=s3cr3t-value", nil))

	if strings.Contains(buf.String(), "s3cr3t-value") {
		t.Fatalf("token leaked into log: %s", buf.String())
	}
	if !strings.Contains(buf.String(), "REDACTED") {
		t.Fatalf("expected redacted marker in log: %s", buf.String())
	}
}
