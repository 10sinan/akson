package git

import "testing"

func TestValidateRepoURL(t *testing.T) {
	good := []string{
		"https://github.com/user/repo.git",
		"http://example.com/repo",
		"ssh://git@github.com/user/repo.git",
		"git@github.com:user/repo.git",
		"git://example.com/repo.git",
	}
	bad := []string{
		"",
		"   ",
		"-uupload-pack=touch /tmp/x",
		"--upload-pack=evil",
		"file:///etc",
		"/etc/passwd",
		"../repo",
		"ext::sh -c touch% /tmp/x",
		"https://",
		"https://host/a b",
		"ftp://example.com/repo",
	}
	for _, u := range good {
		if err := ValidateRepoURL(u); err != nil {
			t.Errorf("expected %q to be valid, got %v", u, err)
		}
	}
	for _, u := range bad {
		if err := ValidateRepoURL(u); err == nil {
			t.Errorf("expected %q to be rejected", u)
		}
	}
}

func TestValidateBranch(t *testing.T) {
	for _, b := range []string{"main", "feature/x", "v1.2.3", "release-1"} {
		if err := ValidateBranch(b); err != nil {
			t.Errorf("expected %q valid, got %v", b, err)
		}
	}
	for _, b := range []string{"-x", "--upload-pack=x", "a..b", "a b", ""} {
		if err := ValidateBranch(b); err == nil {
			t.Errorf("expected %q rejected", b)
		}
	}
}
