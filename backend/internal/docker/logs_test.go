package docker

import (
	"context"
	"testing"
	"time"
)

func TestParseLogLine(t *testing.T) {
	// 1. With RFC3339Nano timestamp
	raw := "2026-10-16T18:30:00.123456789Z [INFO] Server listening on :8080"
	entry := parseLogLine(raw, "stdout")

	expectedTime, _ := time.Parse(time.RFC3339Nano, "2026-10-16T18:30:00.123456789Z")
	if !entry.Timestamp.Equal(expectedTime) {
		t.Errorf("Expected timestamp %v, got: %v", expectedTime, entry.Timestamp)
	}
	if entry.Message != "[INFO] Server listening on :8080" {
		t.Errorf("Unexpected message: %s", entry.Message)
	}
	if entry.Stream != "stdout" {
		t.Errorf("Unexpected stream: %s", entry.Stream)
	}

	// 2. Without timestamp prefix
	plain := "Just a raw log line"
	entry2 := parseLogLine(plain, "stderr")
	if entry2.Message != "Just a raw log line" {
		t.Errorf("Unexpected plain message: %s", entry2.Message)
	}
	if entry2.Stream != "stderr" {
		t.Errorf("Unexpected stream: %s", entry2.Stream)
	}
}

func TestLiveContainerLogs(t *testing.T) {
	client, err := NewClient()
	if err != nil {
		t.Skipf("Skipping live logs: %v", err)
	}
	defer client.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	containers, err := client.ListContainers(ctx, false)
	if err != nil || len(containers) == 0 {
		t.Skipf("No running containers for live log test")
	}

	target := containers[0]
	entries, err := client.GetContainerLogs(ctx, target.ID, "10")
	if err != nil {
		t.Fatalf("GetContainerLogs failed on %s: %v", target.ID[:12], err)
	}

	t.Logf("Retrieved %d log lines from container %s (%s)", len(entries), target.Name, target.ID[:12])
	for i, entry := range entries {
		if i < 3 {
			t.Logf("  [%s] [%s] %s", entry.Timestamp.Format("15:04:05"), entry.Stream, entry.Message)
		}
	}
}

