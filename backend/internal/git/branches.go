package git

import (
	"bytes"
	"context"
	"fmt"
	"sort"
	"strings"
	"time"
)

// Branch is one remote branch head.
type Branch struct {
	Name   string `json:"name"`
	Commit string `json:"commit"`
}

// maxBranches caps how many branches are returned for one repository.
const maxBranches = 200

// ListBranches returns the branches of a remote repository using `git ls-remote --heads`.
// It needs no token, so it works for public repositories only. The URL is validated
// and its host checked against local/link-local addresses first.
func ListBranches(ctx context.Context, repoURL string) ([]Branch, error) {
	if err := ValidateRepoURL(repoURL); err != nil {
		return nil, err
	}
	if err := CheckRepoHost(ctx, repoURL); err != nil {
		return nil, err
	}
	return lsRemoteHeads(ctx, strings.TrimSpace(repoURL))
}

// lsRemoteHeads runs git ls-remote without URL checks (tests use a local repository).
func lsRemoteHeads(ctx context.Context, repoURL string) ([]Branch, error) {
	ctx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()

	cmd := gitCommand(ctx, "ls-remote", "--heads", "--", repoURL)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		msg := strings.TrimSpace(stderr.String())
		if msg == "" {
			msg = err.Error()
		}
		return nil, fmt.Errorf("could not read branches (only public repositories are supported): %s", msg)
	}
	return parseLsRemote(stdout.String()), nil
}

// parseLsRemote turns "<sha>\trefs/heads/<name>" lines into branches. main/master come
// first, the rest alphabetically; at most maxBranches are returned.
func parseLsRemote(out string) []Branch {
	var branches []Branch
	for _, line := range strings.Split(out, "\n") {
		sha, ref, ok := strings.Cut(strings.TrimSpace(line), "\t")
		if !ok || len(sha) < 7 {
			continue
		}
		name, ok := strings.CutPrefix(ref, "refs/heads/")
		if !ok || name == "" {
			continue
		}
		branches = append(branches, Branch{Name: name, Commit: sha})
	}
	rank := func(name string) int {
		switch name {
		case "main":
			return 0
		case "master":
			return 1
		}
		return 2
	}
	sort.SliceStable(branches, func(i, j int) bool {
		ri, rj := rank(branches[i].Name), rank(branches[j].Name)
		if ri != rj {
			return ri < rj
		}
		return branches[i].Name < branches[j].Name
	})
	if len(branches) > maxBranches {
		branches = branches[:maxBranches]
	}
	return branches
}
