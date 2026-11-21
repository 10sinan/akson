package api

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestLimitBody_RejectsHugeJSON(t *testing.T) {
	huge := `{"service_name":"x","domain":"` + strings.Repeat("a", maxBodyBytes+10) + `"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/network/labels", bytes.NewReader([]byte(huge)))
	rec := httptest.NewRecorder()
	NewServer(nil, nil, nil).NewRouter().ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), "too large") {
		t.Fatalf("expected 400 body too large, got %d: %.200s", rec.Code, rec.Body.String())
	}
}

func TestLimitBody_AllowsNormalJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/network/labels",
		bytes.NewReader([]byte(`{"service_name":"web","domain":"app.example.com","port":8080}`)))
	rec := httptest.NewRecorder()
	NewServer(nil, nil, nil).NewRouter().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
}
