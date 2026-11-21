package api

import (
	"testing"

	"akson/internal/docker"
)

func TestApplyDefaultPublishIP(t *testing.T) {
	ports := []docker.PortMapping{
		{PrivatePort: 80, Type: "tcp"},
		{PrivatePort: 443, IP: "0.0.0.0", Type: "tcp"}, // explicit choice is kept
	}
	applyDefaultPublishIP(ports, "127.0.0.1")
	if ports[0].IP != "127.0.0.1" {
		t.Errorf("unset IP should default to 127.0.0.1, got %q", ports[0].IP)
	}
	if ports[1].IP != "0.0.0.0" {
		t.Errorf("explicit IP must not change, got %q", ports[1].IP)
	}
}

func TestEffectivePublishIP(t *testing.T) {
	s := NewServer(nil, nil, nil)
	if got := s.effectivePublishIP(); got != "127.0.0.1" {
		t.Errorf("default = %q, want 127.0.0.1", got)
	}
	s.SetPublishIP("0.0.0.0")
	if got := s.effectivePublishIP(); got != "0.0.0.0" {
		t.Errorf("override = %q, want 0.0.0.0", got)
	}
}
