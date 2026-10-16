package docker

import (
	"context"
	"testing"
	"time"
)

func TestDockerClient_PingAndList(t *testing.T) {
	client, err := NewClient()
	if err != nil {
		t.Skipf("Skipping live docker test: docker client creation failed: %v", err)
	}
	defer client.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx); err != nil {
		t.Skipf("Skipping live docker test: daemon not reachable: %v", err)
	}

	containers, err := client.ListContainers(ctx, true)
	if err != nil {
		t.Fatalf("ListContainers failed: %v", err)
	}

	t.Logf("Successfully connected to Docker! Found %d containers on host.", len(containers))
	for _, c := range containers {
		t.Logf("Container: ID=%s Name=%s Image=%s State=%s", c.ID[:12], c.Name, c.Image, c.State)
	}
}
