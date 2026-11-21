package api

import "net/http"

// maxBodyBytes caps API request bodies. The largest legitimate body (a deploy request
// with env vars and labels) is a few kilobytes.
const maxBodyBytes = 1 << 20 // 1 MiB

// LimitBody stops a client from making the server read an unbounded request body.
// json.Decoder then fails with "http: request body too large" and the handler answers 400.
func LimitBody(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Body != nil {
			r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
		}
		next.ServeHTTP(w, r)
	})
}
