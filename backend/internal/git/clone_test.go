package git

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestCloneRepo_Validation(t *testing.T) {
	ctx := context.Background()
	_, _, err := CloneRepo(ctx, "", "main", "/tmp/fake")
	if err == nil {
		t.Fatal("expected error for empty git URL, got nil")
	}
}

func TestCloneRepo_LocalRepo(t *testing.T) {
	// Clone current repo locally to a temp dir
	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to get current dir: %v", err)
	}

	// Go up to the root of the git repo
	repoRoot := filepath.Clean(filepath.Join(cwd, "../../.."))

	tempDir, err := os.MkdirTemp("", "akson-git-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	info, logs, err := CloneRepo(ctx, repoRoot, "", tempDir)
	if err != nil {
		t.Fatalf("failed to clone local repo: %v. Logs: %v", err, logs)
	}

	if info.CommitHash == "" || info.CommitHash == "unknown" {
		t.Errorf("expected valid commit hash, got %s", info.CommitHash)
	}

	if len(logs) == 0 {
		t.Errorf("expected clone logs, got empty")
	}
}
