package api

import (
	"encoding/json"
	"net/http"
)

// respond serializes v as JSON and writes it to the response.
func respond(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	if v != nil {
		json.NewEncoder(w).Encode(v) //nolint:errcheck
	}
}

// errorResponse writes a standard JSON error payload.
func errorResponse(w http.ResponseWriter, code int, msg string) {
	respond(w, code, map[string]string{"error": msg})
}

// okResponse writes a standard JSON success payload with an optional message.
func okResponse(w http.ResponseWriter, msg string) {
	respond(w, http.StatusOK, map[string]string{"status": "ok", "message": msg})
}
