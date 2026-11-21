package git

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestParseLsRemote(t *testing.T) {
	out := "1111111111111111111111111111111111111111\trefs/heads/feature/login\n" +
		"2222222222222222222222222222222222222222\trefs/heads/main\n" +
		"3333333333333333333333333333333333333333\trefs/heads/develop\n" +
		"4444444444444444444444444444444444444444\trefs/tags/v1.0\n" +
		"garbage line\n\n"
	got := parseLsRemote(out)
	var names []string
	for _, b := range got {
		names = append(names, b.Name)
	}
	if strings.Join(names, ",") != "main,develop,feature/login" {
		t.Fatalf("unexpected order/content: %v", names)
	}
	if got[0].Commit != strings.Repeat("2", 40) {
		t.Fatalf("wrong commit for main: %s", got[0].Commit)
	}
}

func TestParseLsRemote_Cap(t *testing.T) {
	var b strings.Builder
	for i := 0; i < maxBranches+50; i++ {
		fmt.Fprintf(&b, "%040d\trefs/heads/b%03d\n", i, i)
	}
	if got := parseLsRemote(b.String()); len(got) != maxBranches {
		t.Fatalf("expected %d branches, got %d", maxBranches, len(got))
	}
}

func TestLsRemoteHeads_LocalRepo(t *testing.T) {
	dir := t.TempDir()
	run := func(args ...string) {
		t.Helper()
		cmd := exec.Command("git", args...)
		cmd.Dir = dir
		cmd.Env = append(os.Environ(),
			"GIT_AUTHOR_NAME=t", "GIT_AUTHOR_EMAIL=t@example.com",
			"GIT_COMMITTER_NAME=t", "GIT_COMMITTER_EMAIL=t@example.com")
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v\n%s", args, err, out)
		}
	}
	run("init", "-q", "-b", "main")
	if err := os.WriteFile(filepath.Join(dir, "a.txt"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	run("add", ".")
	run("commit", "-q", "-m", "init")
	run("branch", "feature/galaxy")

	branches, err := lsRemoteHeads(context.Background(), dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(branches) != 2 || branches[0].Name != "main" || branches[1].Name != "feature/galaxy" {
		t.Fatalf("unexpected branches: %+v", branches)
	}
}

func TestListBranches_RejectsLocalTargets(t *testing.T) {
	for _, u := range []string{"/etc", "file:///tmp/x", "http://127.0.0.1/x.git", "http://169.254.169.254/x"} {
		if _, err := ListBranches(context.Background(), u); err == nil {
			t.Errorf("ListBranches(%q) should fail", u)
		}
	}
}
