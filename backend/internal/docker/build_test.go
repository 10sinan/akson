package docker

import (
	"archive/tar"
	"io"
	"os"
	"path/filepath"
	"testing"
)

func TestCreateTarStream_Success(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "akson-tar-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create test files
	_ = os.WriteFile(filepath.Join(tempDir, "Dockerfile"), []byte("FROM alpine\nCMD [\"echo\", \"hello\"]"), 0644)
	_ = os.WriteFile(filepath.Join(tempDir, "index.js"), []byte("console.log('hello world')"), 0644)

	// Create .git directory with dummy files (should be excluded)
	gitDir := filepath.Join(tempDir, ".git")
	_ = os.MkdirAll(gitDir, 0755)
	_ = os.WriteFile(filepath.Join(gitDir, "config"), []byte("[core]"), 0644)

	stream, err := CreateTarStream(tempDir)
	if err != nil {
		t.Fatalf("CreateTarStream failed: %v", err)
	}

	// Read tar stream back and check included files
	tr := tar.NewReader(stream)
	includedFiles := make(map[string]bool)

	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			t.Fatalf("tar read error: %v", err)
		}
		includedFiles[hdr.Name] = true
	}

	if !includedFiles["Dockerfile"] {
		t.Errorf("expected Dockerfile in tar, got %v", includedFiles)
	}
	if !includedFiles["index.js"] {
		t.Errorf("expected index.js in tar, got %v", includedFiles)
	}
	for f := range includedFiles {
		if f == ".git" || f == ".git/config" {
			t.Errorf(".git directory should NOT be included in tar context: found %s", f)
		}
	}
}
