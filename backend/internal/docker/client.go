package docker

import (
	"context"
	"fmt"

	"github.com/docker/docker/client"
)

// Client wraps the official Docker Go SDK client.
type Client struct {
	cli *client.Client
}

// NewClient initializes a connection to the Docker daemon via /var/run/docker.sock.
// It automatically negotiates the API version with the running host daemon.
func NewClient() (*Client, error) {
	cli, err := client.NewClientWithOpts(
		client.FromEnv,
		client.WithAPIVersionNegotiation(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create docker client: %w", err)
	}

	return &Client{cli: cli}, nil
}

// Ping verifies that the Docker daemon is reachable and responding.
func (c *Client) Ping(ctx context.Context) error {
	_, err := c.cli.Ping(ctx)
	if err != nil {
		return fmt.Errorf("docker daemon ping failed: %w", err)
	}
	return nil
}

// Close closes the underlying transport connection to Docker.
func (c *Client) Close() error {
	return c.cli.Close()
}

// RawClient returns the underlying Docker client for low-level access when needed.
func (c *Client) RawClient() *client.Client {
	return c.cli
}
