package api

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// spaHandler serves the built frontend from dir. Unknown paths fall back to index.html
// so client-side routes keep working.
func spaHandler(dir string) http.HandlerFunc {
	fileServer := http.FileServer(http.Dir(dir))
	return func(w http.ResponseWriter, r *http.Request) {
		clean := filepath.Clean("/" + r.URL.Path)
		if info, err := os.Stat(filepath.Join(dir, clean)); err == nil && !info.IsDir() {
			fileServer.ServeHTTP(w, r)
			return
		}
		if strings.HasPrefix(clean, "/api/") {
			http.NotFound(w, r)
			return
		}
		http.ServeFile(w, r, filepath.Join(dir, "index.html"))
	}
}
