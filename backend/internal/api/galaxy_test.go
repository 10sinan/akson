package api

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"akson/internal/docker"
	"akson/internal/git"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/go-connections/nat"
)

func gitContainer(labels map[string]string) *types.ContainerJSON {
	return &types.ContainerJSON{
		ContainerJSONBase: &types.ContainerJSONBase{
			Name:  "/shop",
			Image: "sha256:abc",
			HostConfig: &container.HostConfig{
				Resources:     container.Resources{Memory: 128 * 1024 * 1024},
				RestartPolicy: container.RestartPolicy{Name: "unless-stopped"},
				NetworkMode:   "akson-bridge",
				PortBindings:  nat.PortMap{"3000/tcp": {{HostIP: "127.0.0.1", HostPort: "49200"}}},
			},
		},
		Config: &container.Config{
			Image:  "akson/shop:latest",
			Env:    []string{"PATH=/usr/bin", "PORT=3000", "API_KEY=k"},
			Labels: labels,
		},
	}
}

func TestGitSource(t *testing.T) {
	if _, err := gitSource(gitContainer(map[string]string{"akson.managed": "true"})); err == nil {
		t.Error("container without git label must be rejected")
	}
	if _, err := gitSource(gitContainer(map[string]string{LabelGitURL: "https://github.com/a/b"})); err == nil {
		t.Error("container not managed by Akson must be rejected")
	}
	url, err := gitSource(gitContainer(map[string]string{"akson.managed": "true", LabelGitURL: "https://github.com/a/b"}))
	if err != nil || url != "https://github.com/a/b" {
		t.Errorf("got %q, %v", url, err)
	}
}

func TestBuildBranchesResponse(t *testing.T) {
	res := buildBranchesResponse("https://github.com/a/b",
		map[string]string{LabelGitBranch: "develop", LabelGitCommit: "abc"},
		[]git.Branch{{Name: "main", Commit: "111"}, {Name: "develop", Commit: "abc"}})
	if res.DeployedBranch != "develop" || len(res.Branches) != 2 {
		t.Fatalf("unexpected: %+v", res)
	}
	if res.Branches[0].Deployed || !res.Branches[1].Deployed {
		t.Fatalf("only develop should be marked deployed: %+v", res.Branches)
	}
	if empty := buildBranchesResponse("u", nil, nil); empty.Branches == nil {
		t.Fatal("branches must encode as [] not null")
	}
}

func TestBranchRedeployRequest_KeepsSettings(t *testing.T) {
	in := gitContainer(map[string]string{
		"akson.managed":                  "true",
		LabelGitURL:                      "https://github.com/a/shop",
		LabelGitBranch:                   "main",
		LabelGitDockerfile:               "docker/prod.Dockerfile",
		"traefik.http.routers.shop.rule": "Host(`shop.example.com`)",
	})
	req, err := branchRedeployRequest(in, "feature/cart", []string{"PATH=/usr/bin"})
	if err != nil {
		t.Fatal(err)
	}
	if req.GitURL != "https://github.com/a/shop" || req.GitBranch != "feature/cart" || req.Name != "shop" {
		t.Fatalf("wrong source: %+v", req)
	}
	if req.Image != "" {
		t.Fatalf("image must be rebuilt, got %q", req.Image)
	}
	if req.Dockerfile != "docker/prod.Dockerfile" {
		t.Fatalf("custom Dockerfile lost: %q", req.Dockerfile)
	}
	if _, ok := req.Env["PATH"]; ok || req.Env["PORT"] != "3000" || req.Env["API_KEY"] != "k" {
		t.Fatalf("env should keep only user vars: %v", req.Env)
	}
	if len(req.Ports) != 1 || req.Ports[0].PublicPort != 49200 || req.Ports[0].IP != "127.0.0.1" {
		t.Fatalf("ports not kept: %+v", req.Ports)
	}
	if req.MemoryLimitMB != 128 || req.NetworkName != "akson-bridge" || req.RestartPolicy != "unless-stopped" {
		t.Fatalf("limits/network not kept: %+v", req.DeployConfig)
	}
	if req.Labels["traefik.http.routers.shop.rule"] == "" {
		t.Fatal("Traefik route lost")
	}

	if _, err := branchRedeployRequest(gitContainer(map[string]string{"akson.managed": "true"}), "main", nil); err == nil {
		t.Fatal("non-git container must be rejected")
	}
}

func TestRedeployBranch_RejectsInvalidBranch(t *testing.T) {
	for _, b := range []string{"", "-x", "a..b", "a b", "--upload-pack=x"} {
		body := []byte(`{"branch":"` + b + `"}`)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/containers/abc/redeploy-branch", bytes.NewReader(body))
		rec := httptest.NewRecorder()
		NewServer(nil, nil, nil).NewRouter().ServeHTTP(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("branch %q: expected 400, got %d", b, rec.Code)
		}
	}
}

func TestListBranches_NoDocker(t *testing.T) {
	rec := httptest.NewRecorder()
	NewServer(nil, nil, nil).NewRouter().ServeHTTP(rec, httptest.NewRequest("GET", "/api/v1/containers/abc/branches", nil))
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", rec.Code)
	}
}

func TestListBranches_UnknownContainer_Live(t *testing.T) {
	cli, err := docker.NewClient()
	if err != nil {
		t.Skip("docker client unavailable")
	}
	defer cli.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := cli.Ping(ctx); err != nil {
		t.Skip("docker daemon unreachable")
	}
	rec := httptest.NewRecorder()
	NewServer(nil, cli, nil).NewRouter().ServeHTTP(rec, httptest.NewRequest("GET", "/api/v1/containers/akson-no-such-container-xyz/branches", nil))
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", rec.Code, rec.Body.String())
	}
}
