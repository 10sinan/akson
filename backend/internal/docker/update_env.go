package docker

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/docker/docker/api/types"
)

// ConfigFromInspect rebuilds a DeployConfig from an inspected container so it can be
// recreated with a few fields changed. Pure function: no Docker daemon needed.
func ConfigFromInspect(in *types.ContainerJSON) DeployConfig {
	cfg := DeployConfig{
		Name:   strings.TrimPrefix(in.Name, "/"),
		Env:    map[string]string{},
		Labels: map[string]string{},
	}
	if in.Config != nil {
		cfg.Image = in.Config.Image
		for _, line := range in.Config.Env {
			k, v, _ := strings.Cut(line, "=")
			cfg.Env[k] = v
		}
		for k, v := range in.Config.Labels {
			cfg.Labels[k] = v
		}
	}
	if hc := in.HostConfig; hc != nil {
		cfg.MemoryLimitMB = hc.Memory / (1024 * 1024)
		cfg.CPULimit = float64(hc.NanoCPUs) / 1e9
		cfg.RestartPolicy = string(hc.RestartPolicy.Name)
		if mode := string(hc.NetworkMode); mode != "" && mode != "default" && mode != "bridge" {
			cfg.NetworkName = mode
		}
		for port, bindings := range hc.PortBindings {
			for _, b := range bindings {
				hp, _ := strconv.Atoi(b.HostPort)
				cfg.Ports = append(cfg.Ports, PortMapping{
					IP:          b.HostIP,
					PrivatePort: uint16(port.Int()),
					PublicPort:  uint16(hp),
					Type:        port.Proto(),
				})
			}
		}
	}
	return cfg
}

// ImageEnv returns the ENV entries ("KEY=value") baked into an image.
func (c *Client) ImageEnv(ctx context.Context, imageRef string) ([]string, error) {
	img, _, err := c.cli.ImageInspectWithRaw(ctx, imageRef)
	if err != nil {
		return nil, err
	}
	if img.Config == nil {
		return nil, nil
	}
	return img.Config.Env, nil
}

// UserEnv removes from a container's environment the entries that come unchanged from
// its image (PATH, NODE_VERSION, ...), leaving what the user set. Used when the image is
// rebuilt from another branch, whose own ENV must not be overwritten by the old image's.
func UserEnv(containerEnv map[string]string, imageEnv []string) map[string]string {
	fromImage := make(map[string]string, len(imageEnv))
	for _, line := range imageEnv {
		k, v, _ := strings.Cut(line, "=")
		fromImage[k] = v
	}
	out := make(map[string]string, len(containerEnv))
	for k, v := range containerEnv {
		if iv, ok := fromImage[k]; ok && iv == v {
			continue
		}
		out[k] = v
	}
	return out
}

// UpdateEnv recreates an Akson-managed container with a new environment, keeping its
// image, ports, limits, network, restart policy and labels.
func (c *Client) UpdateEnv(ctx context.Context, id string, env map[string]string) (*DeployResult, error) {
	in, err := c.InspectContainer(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("container not found: %w", err)
	}
	if in.Config == nil || in.Config.Labels["akson.managed"] != "true" {
		return nil, fmt.Errorf("container is not managed by Akson")
	}
	cfg := ConfigFromInspect(in)
	cfg.Env = env
	return c.DeployContainer(ctx, cfg)
}
