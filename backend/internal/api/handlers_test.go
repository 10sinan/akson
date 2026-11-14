package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHandleDeployContainer_Validation(t *testing.T) {
	server := NewServer(nil, nil, nil)
	router := server.NewRouter()

	tests := []struct {
		name       string
		payload    map[string]interface{}
		wantStatus int
	}{
		{
			name:       "Missing name",
			payload:    map[string]interface{}{"image": "nginx:alpine"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "Missing image",
			payload:    map[string]interface{}{"name": "my-service"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "Git URL clone failure",
			payload:    map[string]interface{}{"git_url": "https://invalid.example.com/nonexistent-repo-12345.git"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "Invalid JSON",
			payload:    nil,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			var body []byte
			if tc.payload != nil {
				body, _ = json.Marshal(tc.payload)
			} else {
				body = []byte("{invalid-json")
			}

			req := httptest.NewRequest(http.MethodPost, "/api/v1/containers/deploy", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()

			router.ServeHTTP(rec, req)

			if rec.Code != tc.wantStatus {
				t.Errorf("expected status %d, got %d. Body: %s", tc.wantStatus, rec.Code, rec.Body.String())
			}
		})
	}
}

func TestDeploymentsEndpointRoute(t *testing.T) {
	server := NewServer(nil, nil, nil)
	router := server.NewRouter()

	// Validation on /api/v1/deployments as well
	body := []byte(`{"image": "redis:alpine"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/deployments", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d. Body: %s", http.StatusBadRequest, rec.Code, rec.Body.String())
	}
}
