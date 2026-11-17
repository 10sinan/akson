package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"akson/internal/docker"
)

func getSystemInfo(t *testing.T, s *Server) SystemInfo {
	t.Helper()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/system", nil)
	s.NewRouter().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var info SystemInfo
	if err := json.Unmarshal(rec.Body.Bytes(), &info); err != nil {
		t.Fatalf("decode: %v", err)
	}
	return info
}

func TestSystemInfo_NoDocker(t *testing.T) {
	s := NewServer(nil, nil, nil)
	s.SetSystemConfig(SystemConfig{DBPath: "/data/akson.db", ACMEEmailSet: true})

	info := getSystemInfo(t, s)
	if info.DockerError == "" || info.Docker != nil {
		t.Errorf("expected a docker error without a client, got %+v", info)
	}
	if !info.ACMEEmailSet || info.DBPath != "/data/akson.db" || info.AuthEnabled {
		t.Errorf("config not reported correctly: %+v", info)
	}
}

func TestSystemInfo_NeverLeaksToken(t *testing.T) {
	s := NewServer(nil, nil, nil)
	s.SetAuthToken("super-secret")

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/system", nil)
	req.Header.Set("Authorization", "Bearer super-secret")
	s.NewRouter().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	if body := rec.Body.String(); strings.Contains(body, "super-secret") {
		t.Fatalf("token leaked in response: %s", body)
	}
}

func TestPruneImages_NoDocker(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/system/prune-images", nil)
	NewServer(nil, nil, nil).NewRouter().ServeHTTP(rec, req)
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503", rec.Code)
	}
}

func TestSystemInfo_LiveDocker(t *testing.T) {
	client, err := docker.NewClient()
	if err != nil {
		t.Skipf("docker client: %v", err)
	}
	defer client.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := client.Ping(ctx); err != nil {
		t.Skipf("docker not reachable: %v", err)
	}

	info := getSystemInfo(t, NewServer(nil, client, nil))
	if info.Docker == nil || info.Docker.Version == "" {
		t.Fatalf("expected docker version, got %+v", info)
	}
	if info.UnusedImages == nil {
		t.Fatalf("expected unused image count, got %+v", info)
	}
}
