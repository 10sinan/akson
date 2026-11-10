package docker

import (
	"context"
	"testing"
	"time"

	"github.com/docker/docker/api/types/container"
)

func TestDockerClient_DeployContainer_Live(t *testing.T) {
	client, err := NewClient()
	if err != nil {
		t.Skipf("Skipping live deploy test: docker client creation failed: %v", err)
	}
	defer client.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := client.Ping(ctx); err != nil {
		t.Skipf("Skipping live deploy test: daemon not reachable: %v", err)
	}

	testContainerName := "akson-test-deploy-alpine"
	// Clean up any lingering container from previous test runs
	_ = client.RemoveContainer(ctx, testContainerName, true)

	cfg := DeployConfig{
		Name:  testContainerName,
		Image: "alpine:latest",
		Labels: map[string]string{
			"akson.managed": "true",
			"akson.test":    "true",
		},
	}

	res, err := client.DeployContainer(ctx, cfg)
	if err != nil {
		t.Fatalf("DeployContainer failed: %v", err)
	}

	defer func() {
		cleanCtx, cleanCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cleanCancel()
		_ = client.RemoveContainer(cleanCtx, testContainerName, true)
	}()

	if res.Container.ID == "" {
		t.Errorf("expected container ID in deploy result, got empty string")
	}
	if len(res.Logs) == 0 {
		t.Errorf("expected deployment logs, got empty list")
	}

	// Redeploying with the same name must replace the old container, not fail with a name conflict.
	res2, err := client.DeployContainer(ctx, cfg)
	if err != nil {
		t.Fatalf("redeploy with same name failed: %v", err)
	}
	if res2.Container.ID == res.Container.ID {
		t.Errorf("expected a new container on redeploy, got the same ID %s", res.Container.ID)
	}
	if _, err := client.InspectContainer(ctx, res.Container.ID); err == nil {
		t.Errorf("old container %s should have been removed on redeploy", ShortID(res.Container.ID))
	}
}

func TestDockerClient_DeployContainer_RefusesUnmanagedName(t *testing.T) {
	client, err := NewClient()
	if err != nil {
		t.Skipf("Skipping live deploy test: docker client creation failed: %v", err)
	}
	defer client.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := client.Ping(ctx); err != nil {
		t.Skipf("Skipping live deploy test: daemon not reachable: %v", err)
	}

	name := "akson-test-unmanaged"
	_ = client.RemoveContainer(ctx, name, true)
	defer func() {
		cleanCtx, cleanCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cleanCancel()
		_ = client.RemoveContainer(cleanCtx, name, true)
	}()

	// Create a container without the akson.managed label, as if made outside Akson.
	if _, err := client.cli.ContainerCreate(ctx, &container.Config{Image: "alpine:latest"}, nil, nil, nil, name); err != nil {
		t.Skipf("Skipping: could not create unmanaged container (alpine image missing?): %v", err)
	}

	if _, err := client.DeployContainer(ctx, DeployConfig{Name: name, Image: "alpine:latest"}); err == nil {
		t.Fatalf("expected deploy over an unmanaged container to fail, got success")
	}
}

func TestShortID(t *testing.T) {
	if got := ShortID("web"); got != "web" {
		t.Errorf("ShortID(\"web\") = %q, want %q", got, "web")
	}
	if got := ShortID("0123456789abcdef"); got != "0123456789ab" {
		t.Errorf("ShortID long = %q, want %q", got, "0123456789ab")
	}
}
