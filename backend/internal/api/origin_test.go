package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestOriginGuard(t *testing.T) {
	ok := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })
	h := OriginGuard(ok)

	cases := []struct {
		name, method, host, origin, fetchSite string
		want                                  int
	}{
		{"get from other site is allowed (read-only)", "GET", "localhost:3001", "https://evil.example", "", 200},
		{"post without origin (curl)", "POST", "localhost:3001", "", "", 200},
		{"post same origin", "POST", "localhost:3001", "http://localhost:3001", "same-origin", 200},
		{"post same origin on custom host", "POST", "akson.example.com", "https://akson.example.com", "", 200},
		{"post from vite dev server", "POST", "localhost:3001", "http://localhost:5173", "same-site", 200},
		{"post from other site", "POST", "localhost:3001", "https://evil.example", "", 403},
		{"delete from other site", "DELETE", "localhost:3001", "https://evil.example", "", 403},
		{"put with null origin", "PUT", "localhost:3001", "null", "", 403},
		{"cross-site fetch metadata without origin", "POST", "localhost:3001", "", "cross-site", 403},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, "http://"+tc.host+"/api/v1/containers/x/actions/stop", nil)
			req.Host = tc.host
			if tc.origin != "" {
				req.Header.Set("Origin", tc.origin)
			}
			if tc.fetchSite != "" {
				req.Header.Set("Sec-Fetch-Site", tc.fetchSite)
			}
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)
			if rec.Code != tc.want {
				t.Fatalf("got %d, want %d", rec.Code, tc.want)
			}
		})
	}
}
