package api

import (
	"bufio"
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"akson/internal/db"
)

func streamDeploy(t *testing.T, server *Server, payload map[string]any) []DeployEvent {
	t.Helper()
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/deployments/stream", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	server.NewRouter().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/x-ndjson" {
		t.Fatalf("unexpected content type %q", ct)
	}
	var events []DeployEvent
	sc := bufio.NewScanner(rec.Body)
	for sc.Scan() {
		var ev DeployEvent
		if err := json.Unmarshal(sc.Bytes(), &ev); err != nil {
			t.Fatalf("line is not valid JSON: %q (%v)", sc.Text(), err)
		}
		events = append(events, ev)
	}
	return events
}

func TestDeployStream_InvalidGitURL(t *testing.T) {
	database, err := db.New(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()

	events := streamDeploy(t, NewServer(database, nil, nil), map[string]any{
		"name":    "stream-bad-url",
		"git_url": "file:///etc",
	})

	if len(events) < 3 {
		t.Fatalf("expected at least 3 events, got %+v", events)
	}
	first, last := events[0], events[len(events)-1]
	if first.Type != "step" || first.Step != StepClone || first.Status != "running" {
		t.Errorf("first event should be clone running, got %+v", first)
	}
	if last.Type != "error" || last.Message == "" {
		t.Errorf("last event should be an error, got %+v", last)
	}
	sawCloneError := false
	for _, ev := range events {
		if ev.Type == "step" && ev.Step == StepClone && ev.Status == "error" {
			sawCloneError = true
		}
	}
	if !sawCloneError {
		t.Errorf("expected a clone error step, got %+v", events)
	}

	deps, err := database.ListDeployments("stream-bad-url", 10)
	if err != nil || len(deps) != 1 || deps[0].Status != "failed" {
		t.Fatalf("expected 1 failed deployment, got %+v (err %v)", deps, err)
	}
}

func TestDeployStream_InvalidJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/deployments/stream", bytes.NewReader([]byte("{")))
	rec := httptest.NewRecorder()
	NewServer(nil, nil, nil).NewRouter().ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestDeployStream_RejectsTraefikRuleInjection(t *testing.T) {
	events := streamDeploy(t, NewServer(nil, nil, nil), map[string]any{
		"name": "x", "image": "nginx:alpine", "domain": "a.com`) || PathPrefix(`/",
	})
	last := events[len(events)-1]
	if last.Type != "error" || !strings.Contains(last.Message, "invalid domain") {
		t.Fatalf("expected invalid domain error, got %+v", last)
	}
}

func TestDeployStream_RejectsDockerfileOutsideRepo(t *testing.T) {
	events := streamDeploy(t, NewServer(nil, nil, nil), map[string]any{
		"git_url": "https://github.com/a/b.git", "dockerfile": "../../etc/passwd",
	})
	last := events[len(events)-1]
	if last.Type != "error" || !strings.Contains(last.Message, "invalid Dockerfile path") {
		t.Fatalf("expected invalid Dockerfile path error, got %+v", last)
	}
	for _, ev := range events {
		if ev.Type == "step" && ev.Step == StepClone {
			t.Fatalf("nothing should be cloned, got %+v", ev)
		}
	}
}

func TestGenerateLabels_RejectsInvalidDomain(t *testing.T) {
	body := []byte(`{"service_name":"x","domain":"a.com` + "`" + `) || Host(` + "`" + `b.com","port":80}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/network/labels", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	NewServer(nil, nil, nil).NewRouter().ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestDeployStream_NoDocker(t *testing.T) {
	events := streamDeploy(t, NewServer(nil, nil, nil), map[string]any{"name": "x", "image": "nginx:alpine"})
	last := events[len(events)-1]
	if last.Type != "error" || last.Message != "Docker is not available" {
		t.Fatalf("expected docker unavailable error, got %+v", last)
	}
}
