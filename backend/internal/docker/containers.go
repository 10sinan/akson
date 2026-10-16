package docker

import (
	"context"
	"fmt"
	"strings"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
)

// PortMapping represents an exposed container port and its host binding.
type PortMapping struct {
	IP          string `json:"ip,omitempty"`
	PrivatePort uint16 `json:"private_port"`
	PublicPort  uint16 `json:"public_port,omitempty"`
	Type        string `json:"type"`
}

// ContainerInfo is a simplified, standardized representation of a Docker container for Akson.
type ContainerInfo struct {
	ID      string            `json:"id"`
	Name    string            `json:"name"`
	Image   string            `json:"image"`
	State   string            `json:"state"`  // "running", "exited", "paused", "restarting"
	Status  string            `json:"status"` // e.g. "Up 2 hours", "Exited (0) 5 minutes ago"
	Created int64             `json:"created"`
	Ports   []PortMapping     `json:"ports"`
	Labels  map[string]string `json:"labels"`
}

// ListContainers returns all containers or only running ones based on the 'all' flag.
func (c *Client) ListContainers(ctx context.Context, all bool) ([]ContainerInfo, error) {
	containers, err := c.cli.ContainerList(ctx, container.ListOptions{All: all})
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	result := make([]ContainerInfo, 0, len(containers))
	for _, ct := range containers {
		// Clean leading slash from container name
		name := ""
		if len(ct.Names) > 0 {
			name = strings.TrimPrefix(ct.Names[0], "/")
		}

		ports := make([]PortMapping, 0, len(ct.Ports))
		for _, p := range ct.Ports {
			ports = append(ports, PortMapping{
				IP:          p.IP,
				PrivatePort: p.PrivatePort,
				PublicPort:  p.PublicPort,
				Type:        p.Type,
			})
		}

		result = append(result, ContainerInfo{
			ID:      ct.ID,
			Name:    name,
			Image:   ct.Image,
			State:   ct.State,
			Status:  ct.Status,
			Created: ct.Created,
			Ports:   ports,
			Labels:  ct.Labels,
		})
	}

	return result, nil
}

// InspectContainer returns full detailed metadata for a specific container.
func (c *Client) InspectContainer(ctx context.Context, containerID string) (*types.ContainerJSON, error) {
	info, err := c.cli.ContainerInspect(ctx, containerID)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect container %s: %w", containerID, err)
	}
	return &info, nil
}

// StartContainer starts an existing stopped or created container.
func (c *Client) StartContainer(ctx context.Context, containerID string) error {
	err := c.cli.ContainerStart(ctx, containerID, container.StartOptions{})
	if err != nil {
		return fmt.Errorf("failed to start container %s: %w", containerID, err)
	}
	return nil
}

// StopContainer stops a running container. If timeoutSeconds is nil, a default 10s grace period is used.
func (c *Client) StopContainer(ctx context.Context, containerID string, timeoutSeconds *int) error {
	opts := container.StopOptions{}
	if timeoutSeconds != nil {
		opts.Timeout = timeoutSeconds
	}
	err := c.cli.ContainerStop(ctx, containerID, opts)
	if err != nil {
		return fmt.Errorf("failed to stop container %s: %w", containerID, err)
	}
	return nil
}

// RestartContainer restarts a container gracefully.
func (c *Client) RestartContainer(ctx context.Context, containerID string, timeoutSeconds *int) error {
	opts := container.StopOptions{}
	if timeoutSeconds != nil {
		opts.Timeout = timeoutSeconds
	}
	err := c.cli.ContainerRestart(ctx, containerID, opts)
	if err != nil {
		return fmt.Errorf("failed to restart container %s: %w", containerID, err)
	}
	return nil
}

// RemoveContainer deletes a container. If force is true, running containers are stopped and removed.
func (c *Client) RemoveContainer(ctx context.Context, containerID string, force bool) error {
	err := c.cli.ContainerRemove(ctx, containerID, container.RemoveOptions{
		Force: force,
	})
	if err != nil {
		return fmt.Errorf("failed to remove container %s: %w", containerID, err)
	}
	return nil
}
