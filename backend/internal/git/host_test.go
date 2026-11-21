package git

import (
	"context"
	"fmt"
	"net"
	"testing"
)

func TestRepoHost(t *testing.T) {
	cases := map[string]string{
		"https://github.com/a/b.git":       "github.com",
		"https://user:pw@gitea.lan:3000/x": "gitea.lan",
		"ssh://git@10.0.0.5:2222/a/b.git":  "10.0.0.5",
		"git@github.com:a/b.git":           "github.com",
		"http://[::1]:8080/repo":           "::1",
	}
	for in, want := range cases {
		got, err := RepoHost(in)
		if err != nil || got != want {
			t.Errorf("RepoHost(%q) = %q, %v; want %q", in, got, err, want)
		}
	}
}

func TestCheckRepoHost(t *testing.T) {
	orig := lookupIP
	defer func() { lookupIP = orig }()
	fake := map[string][]net.IP{
		"github.com":        {net.ParseIP("140.82.121.3")},
		"gitea.lan":         {net.ParseIP("192.168.1.20")},
		"metadata.internal": {net.ParseIP("169.254.169.254")},
		"sneaky.example":    {net.ParseIP("93.184.216.34"), net.ParseIP("127.0.0.1")},
	}
	lookupIP = func(_ context.Context, host string) ([]net.IP, error) {
		if ips, ok := fake[host]; ok {
			return ips, nil
		}
		return nil, fmt.Errorf("no such host")
	}

	allowed := []string{
		"https://github.com/a/b.git",
		"git@github.com:a/b.git",
		"http://gitea.lan:3000/me/app.git", // private LAN is fine
		"ssh://git@10.0.0.5/a/b.git",
	}
	for _, u := range allowed {
		if err := CheckRepoHost(context.Background(), u); err != nil {
			t.Errorf("CheckRepoHost(%q) = %v, want nil", u, err)
		}
	}
	blocked := []string{
		"http://169.254.169.254/latest/meta-data",
		"http://metadata.internal/x.git",
		"http://127.0.0.1:3001/x.git",
		"http://[::1]/x.git",
		"http://0.0.0.0/x.git",
		"https://sneaky.example/x.git", // any blocked address in the answer is rejected
		"https://unknown.invalid/x.git",
	}
	for _, u := range blocked {
		if err := CheckRepoHost(context.Background(), u); err == nil {
			t.Errorf("CheckRepoHost(%q) = nil, want error", u)
		}
	}
}
