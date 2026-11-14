package api

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestSPAHandler(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "index.html"), []byte("<html>akson</html>"), 0o644)
	os.MkdirAll(filepath.Join(dir, "assets"), 0o755)
	os.WriteFile(filepath.Join(dir, "assets", "app.js"), []byte("console.log(1)"), 0o644)

	h := spaHandler(dir)
	cases := map[string]struct {
		code int
		body string
	}{
		"/":                 {200, "akson"},
		"/assets/app.js":    {200, "console.log"},
		"/deploy":           {200, "akson"},
		"/api/v1/missing":   {404, ""},
		"/../../etc/passwd": {400, ""},
	}
	for path, want := range cases {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
		if rec.Code != want.code || !strings.Contains(rec.Body.String(), want.body) {
			t.Errorf("%s: got %d %q", path, rec.Code, rec.Body.String())
		}
	}
}
