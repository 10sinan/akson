package api

import (
	"encoding/json"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"akson/internal/db"
)

func TestHealth_DoesNotLeakErrorDetails(t *testing.T) {
	database, err := db.New(filepath.Join(t.TempDir(), "h.db"))
	if err != nil {
		t.Fatal(err)
	}
	database.Close() // Ping now fails with "sql: database is closed"

	rec := httptest.NewRecorder()
	NewServer(database, nil, nil).NewRouter().ServeHTTP(rec, httptest.NewRequest("GET", "/health", nil))
	if rec.Code != 200 {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var body map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["docker"] != "unavailable" || body["db"] != "unavailable" {
		t.Fatalf("expected plain 'unavailable' values, got %+v", body)
	}
}
