package docker

import (
	"context"
	"testing"
	"time"
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
}
