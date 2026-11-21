package api

import (
	"net/http"
	"net/url"
	"strings"
)

// allowedOrigins are the dev/preview origins that may call the API cross-origin.
// Same-origin requests (the UI served by this server) are always allowed.
var allowedOrigins = []string{"http://localhost:5173", "http://localhost:3000", "http://localhost:4173"}

// OriginGuard blocks state-changing requests sent by other websites (CSRF).
// Without it, any page the user opens could POST to http://localhost:3001/api/v1/...
// with a "simple" request (no CORS preflight) and deploy or remove containers.
// Requests without an Origin header (curl, scripts) are not affected.
func OriginGuard(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet, http.MethodHead, http.MethodOptions:
			next.ServeHTTP(w, r)
			return
		}
		if strings.EqualFold(r.Header.Get("Sec-Fetch-Site"), "cross-site") || !originAllowed(r) {
			errorResponse(w, http.StatusForbidden, "Forbidden: cross-origin request")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func originAllowed(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return true
	}
	for _, o := range allowedOrigins {
		if origin == o {
			return true
		}
	}
	u, err := url.Parse(origin)
	if err != nil || u.Host == "" {
		return false
	}
	return strings.EqualFold(u.Host, r.Host)
}
