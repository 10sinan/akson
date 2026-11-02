package git

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"strings"
)

// GitInfo holds metadata about the cloned repository.
type GitInfo struct {
	CommitHash string `json:"commit_hash"`
	Author     string `json:"author"`
	Message    string `json:"message"`
	Branch     string `json:"branch"`
}

// CloneRepo clones a git repository into the target directory with depth 1.
// If branch is provided, it tries to clone that branch directly.
func CloneRepo(ctx context.Context, repoURL string, branch string, targetDir string) (*GitInfo, []string, error) {
	var logs []string
	repoURL = strings.TrimSpace(repoURL)
	if repoURL == "" {
		return nil, nil, fmt.Errorf("git repository URL is required")
	}

	branch = strings.TrimSpace(branch)
	if branch == "" {
		branch = "main"
	}

	logs = append(logs, fmt.Sprintf("Cloning repository %s (branch: %s)...", repoURL, branch))

	// Attempt 1: Clone specific branch with depth 1
	args := []string{"clone", "--depth", "1", "-b", branch, repoURL, targetDir}
	cmd := exec.CommandContext(ctx, "git", args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		// If cloning specified branch fails and branch was "main", try default clone
		if branch == "main" {
			logs = append(logs, fmt.Sprintf("Branch 'main' not found, falling back to default branch for %s...", repoURL))
			fallbackArgs := []string{"clone", "--depth", "1", repoURL, targetDir}
			fallbackCmd := exec.CommandContext(ctx, "git", fallbackArgs...)
			fallbackCmd.Stdout = &stdout
			fallbackCmd.Stderr = &stderr
			if fbErr := fallbackCmd.Run(); fbErr != nil {
				return nil, logs, fmt.Errorf("git clone failed: %s (%w)", strings.TrimSpace(stderr.String()), fbErr)
			}
		} else {
			return nil, logs, fmt.Errorf("git clone branch '%s' failed: %s (%w)", branch, strings.TrimSpace(stderr.String()), err)
		}
	}

	if stderr.Len() > 0 {
		for _, line := range strings.Split(stderr.String(), "\n") {
			trimmed := strings.TrimSpace(line)
			if trimmed != "" {
				logs = append(logs, trimmed)
			}
		}
	}

	// Read commit info: hash|author|message
	logCmd := exec.CommandContext(ctx, "git", "-C", targetDir, "log", "-1", "--format=%H|%an|%s")
	var logOut bytes.Buffer
	logCmd.Stdout = &logOut
	_ = logCmd.Run()

	info := &GitInfo{
		Branch: branch,
	}

	parts := strings.Split(strings.TrimSpace(logOut.String()), "|")
	if len(parts) >= 1 && parts[0] != "" {
		info.CommitHash = parts[0]
	} else {
		info.CommitHash = "unknown"
	}
	if len(parts) >= 2 {
		info.Author = parts[1]
	}
	if len(parts) >= 3 {
		info.Message = parts[2]
	}

	logs = append(logs, fmt.Sprintf("Repository cloned successfully. Commit %s (%s)", shortHash(info.CommitHash), info.Message))

	return info, logs, nil
}

func shortHash(h string) string {
	if len(h) > 8 {
		return h[:8]
	}
	return h
}
