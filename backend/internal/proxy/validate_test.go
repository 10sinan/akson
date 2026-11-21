package proxy

import "testing"

func TestValidateRoute(t *testing.T) {
	good := []RouteConfig{
		{},
		{Domain: "app.example.com"},
		{Domain: "my-app.localhost", PathPrefix: "/api/v1"},
		{Domain: "a.b-c.io", PathPrefix: "/static/%20x", CertResolver: "letsencrypt"},
	}
	for _, cfg := range good {
		if err := ValidateRoute(cfg); err != nil {
			t.Errorf("ValidateRoute(%+v) = %v, want nil", cfg, err)
		}
	}
	bad := []RouteConfig{
		{Domain: "evil.com`) || PathPrefix(`/"},
		{Domain: "a b.com"},
		{Domain: "-a.com"},
		{Domain: "a..com"},
		{Domain: "*.example.com"},
		{Domain: "example.com/"},
		{PathPrefix: "api"},
		{PathPrefix: "/x`) || Host(`y"},
		{PathPrefix: "/a b"},
		{CertResolver: "le`"},
	}
	for _, cfg := range bad {
		if err := ValidateRoute(cfg); err == nil {
			t.Errorf("ValidateRoute(%+v) = nil, want error", cfg)
		}
	}
}
