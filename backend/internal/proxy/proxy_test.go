package proxy

import (
	"context"
	"testing"
	"time"

	dockerClient "github.com/docker/docker/client"
)

func TestSanitizeName(t *testing.T) {
	cases := []struct {
		input    string
		expected string
	}{
		{"my_web_app", "my-web-app"},
		{"My App (v2)", "My-App--v2"},
		{"--test--", "test"},
		{"", "service"},
		{"service-123", "service-123"},
	}

	for _, c := range cases {
		actual := SanitizeName(c.input)
		if actual != c.expected {
			t.Errorf("SanitizeName(%q) = %q, expected %q", c.input, actual, c.expected)
		}
	}
}

func TestGenerateLabels_HTTP(t *testing.T) {
	cfg := RouteConfig{
		ServiceName: "frontend-app",
		Domain:      "app.example.com",
		Port:        3000,
		EnableTLS:   false,
	}

	labels := GenerateLabels(cfg)

	if labels["traefik.enable"] != "true" {
		t.Errorf("Expected traefik.enable=true")
	}
	if labels["traefik.docker.network"] != "akson-bridge" {
		t.Errorf("Expected traefik.docker.network=akson-bridge")
	}
	if labels["traefik.http.routers.frontend-app.rule"] != "Host(`app.example.com`)" {
		t.Errorf("Unexpected rule: %s", labels["traefik.http.routers.frontend-app.rule"])
	}
	if labels["traefik.http.routers.frontend-app.entrypoints"] != "web" {
		t.Errorf("Expected web entrypoint")
	}
	if labels["traefik.http.services.frontend-app.loadbalancer.server.port"] != "3000" {
		t.Errorf("Expected port 3000")
	}
}

func TestGenerateLabels_HTTPS(t *testing.T) {
	cfg := RouteConfig{
		ServiceName:  "api-service",
		Domain:       "api.example.com",
		Port:         8080,
		EnableTLS:    true,
		CertResolver: "letsencrypt",
		PathPrefix:   "/v1",
	}

	labels := GenerateLabels(cfg)

	if labels["traefik.http.routers.api-service.entrypoints"] != "websecure" {
		t.Errorf("Expected websecure entrypoint")
	}
	if labels["traefik.http.routers.api-service.tls"] != "true" {
		t.Errorf("Expected tls=true")
	}
	if labels["traefik.http.routers.api-service.tls.certresolver"] != "letsencrypt" {
		t.Errorf("Expected letsencrypt certresolver")
	}
	if labels["traefik.http.routers.api-service.rule"] != "Host(`api.example.com`) && PathPrefix(`/v1`)" {
		t.Errorf("Unexpected rule: %s", labels["traefik.http.routers.api-service.rule"])
	}
}

func TestLiveNetworkEnsure(t *testing.T) {
	cli, err := dockerClient.NewClientWithOpts(dockerClient.FromEnv, dockerClient.WithAPIVersionNegotiation())
	if err != nil {
		t.Skipf("Skipping live network test: docker client creation failed: %v", err)
	}
	defer cli.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if _, err := cli.Ping(ctx); err != nil {
		t.Skipf("Skipping live network test: docker daemon not reachable: %v", err)
	}

	mgr := NewNetworkManager(cli)
	details, err := mgr.GetNetworkDetails(ctx)
	if err != nil {
		t.Fatalf("GetNetworkDetails failed: %v", err)
	}

	t.Logf("Akson bridge active: ID=%s Name=%s Subnet=%s Gateway=%s",
		details.ID[:12], details.Name, details.Subnet, details.Gateway)

	if details.Name != DefaultNetworkName {
		t.Errorf("Expected network name %s, got %s", DefaultNetworkName, details.Name)
	}
}
