package docker

import (
	"testing"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/go-connections/nat"
)

func TestConfigFromInspect(t *testing.T) {
	in := &types.ContainerJSON{
		ContainerJSONBase: &types.ContainerJSONBase{
			Name: "/web",
			HostConfig: &container.HostConfig{
				Resources:     container.Resources{Memory: 256 * 1024 * 1024, NanoCPUs: 5e8},
				RestartPolicy: container.RestartPolicy{Name: "always"},
				NetworkMode:   "akson-bridge",
				PortBindings:  nat.PortMap{"80/tcp": {{HostPort: "8080"}}},
			},
		},
		Config: &container.Config{
			Image:  "nginx:latest",
			Env:    []string{"A=1", "B=x=y"},
			Labels: map[string]string{"akson.managed": "true"},
		},
	}
	cfg := ConfigFromInspect(in)
	if cfg.Name != "web" || cfg.Image != "nginx:latest" || cfg.NetworkName != "akson-bridge" {
		t.Fatalf("unexpected cfg: %+v", cfg)
	}
	if cfg.Env["B"] != "x=y" || cfg.MemoryLimitMB != 256 || cfg.CPULimit != 0.5 || cfg.RestartPolicy != "always" {
		t.Fatalf("unexpected cfg: %+v", cfg)
	}
	if len(cfg.Ports) != 1 || cfg.Ports[0].PrivatePort != 80 || cfg.Ports[0].PublicPort != 8080 {
		t.Fatalf("unexpected ports: %+v", cfg.Ports)
	}
}
