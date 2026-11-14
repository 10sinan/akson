package git

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"
)

var (
	// scp-like syntax: user@host:path/to/repo.git
	scpLikeRe = regexp.MustCompile(`^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+:[A-Za-z0-9._/~-]+$`)
	// Conservative git ref name: no spaces, no leading dash, no "..".
	branchRe = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._/-]*$`)
)

// ValidateRepoURL accepts only remote repository URLs (https, http, ssh, git, or scp-like).
// It rejects local paths, file:// URLs, git "ext::" transports and anything that could be
// interpreted as a command-line option.
func ValidateRepoURL(raw string) error {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return fmt.Errorf("git repository URL is required")
	}
	if strings.HasPrefix(raw, "-") {
		return fmt.Errorf("invalid git URL: must not start with '-'")
	}
	if strings.ContainsAny(raw, " \t\r\n\x00") {
		return fmt.Errorf("invalid git URL: must not contain whitespace")
	}
	if scpLikeRe.MatchString(raw) {
		return nil
	}
	u, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("invalid git URL: %w", err)
	}
	switch u.Scheme {
	case "https", "http", "ssh", "git":
	default:
		return fmt.Errorf("unsupported git URL scheme %q (use https, ssh or git)", u.Scheme)
	}
	if u.Host == "" {
		return fmt.Errorf("invalid git URL: host is missing")
	}
	return nil
}

// ValidateBranch checks that a branch name is a safe git ref.
func ValidateBranch(branch string) error {
	if !branchRe.MatchString(branch) || strings.Contains(branch, "..") {
		return fmt.Errorf("invalid git branch name %q", branch)
	}
	return nil
}
