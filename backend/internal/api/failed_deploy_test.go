package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"akson/internal/db"
)

// A failed deploy for a never-seen service name must still appear in the deployment history.
func TestFailedDeploymentIsRecorded(t *testing.T) {
	database, err := db.New(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("db init: %v", err)
	}
	defer database.Close()

	server := NewServer(database, nil, nil)
	router := server.NewRouter()

	// A local path is rejected by git URL validation, which must still be recorded as a failed deploy.
	body, _ := json.Marshal(map[string]any{
		"name":    "akson-failed-svc",
		"git_url": filepath.Join(t.TempDir(), "missing-repo.git"),
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/containers/deploy", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}

	deps, err := database.ListDeployments("akson-failed-svc", 10)
	if err != nil {
		t.Fatalf("list deployments: %v", err)
	}
	if len(deps) != 1 || deps[0].Status != "failed" {
		t.Fatalf("expected 1 failed deployment, got %+v", deps)
	}

	svc, err := database.GetService("akson-failed-svc")
	if err != nil || svc == nil || svc.Status != "failed" {
		t.Fatalf("expected placeholder service with status failed, got %+v (err %v)", svc, err)
	}
}
