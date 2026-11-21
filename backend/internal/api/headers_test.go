package api

import (
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestSecurityHeaders(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "index.html"), []byte("<html></html>"), 0o644); err != nil {
		t.Fatal(err)
	}
	s := NewServer(nil, nil, nil)
	s.SetStaticDir(dir)
	router := s.NewRouter()

	// UI page, API error and unknown API path all get the headers.
	for _, path := range []string{"/", "/api/v1/containers/x/actions/bogus", "/api/nope"} {
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, httptest.NewRequest("GET", path, nil))
		want := map[string]string{
			"X-Content-Type-Options":  "nosniff",
			"X-Frame-Options":         "DENY",
			"Content-Security-Policy": "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
			"Referrer-Policy":         "no-referrer",
		}
		for k, v := range want {
			if got := rec.Header().Get(k); got != v {
				t.Errorf("%s: header %s = %q, want %q", path, k, got, v)
			}
		}
	}
}
