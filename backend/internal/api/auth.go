package api

import (
	"crypto/subtle"
	"net/http"
	"strings"
)

// AuthMiddleware protects the API with a shared token (AKSON_TOKEN).
// If token is empty, authentication is disabled (local development).
// The token is read from the "Authorization: Bearer <token>" header, or from the
// "token" query parameter because EventSource (SSE) cannot set headers.
func AuthMiddleware(token string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		if token == "" {
			return next
		}
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodOptions {
				next.ServeHTTP(w, r)
				return
			}
			got := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
			if got == "" {
				got = r.URL.Query().Get("token")
			}
			if subtle.ConstantTimeCompare([]byte(got), []byte(token)) != 1 {
				errorResponse(w, http.StatusUnauthorized, "Unauthorized: missing or invalid token")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
