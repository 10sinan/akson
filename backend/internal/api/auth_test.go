package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestAuthMiddleware(t *testing.T) {
	ok := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })

	cases := []struct {
		name   string
		token  string
		header string
		query  string
		want   int
	}{
		{"disabled when no token configured", "", "", "", 200},
		{"missing token", "secret", "", "", 401},
		{"wrong token", "secret", "Bearer nope", "", 401},
		{"valid header", "secret", "Bearer secret", "", 200},
		{"valid query token for SSE", "secret", "", "?token=secret", 200},
		{"wrong query token", "secret", "", "?token=bad", 401},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			h := AuthMiddleware(c.token)(ok)
			req := httptest.NewRequest(http.MethodGet, "/api/v1/containers"+c.query, nil)
			if c.header != "" {
				req.Header.Set("Authorization", c.header)
			}
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)
			if rec.Code != c.want {
				t.Fatalf("got %d, want %d", rec.Code, c.want)
			}
		})
	}
}
