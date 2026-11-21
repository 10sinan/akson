package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"akson/internal/docker"
	"akson/internal/git"

	"github.com/docker/docker/api/types"
	"github.com/go-chi/chi/v5"
)

// Labels written on containers deployed from a git repository.
const (
	LabelGitURL        = "akson.git.url"
	LabelGitBranch     = "akson.git.branch"
	LabelGitCommit     = "akson.git.commit"
	LabelGitDockerfile = "akson.git.dockerfile"
)

// BranchInfo is one branch in GET /containers/{id}/branches.
type BranchInfo struct {
	Name     string `json:"name"`
	Commit   string `json:"commit"`
	Deployed bool   `json:"deployed"`
}

// BranchesResponse lists a deployed app's repository branches.
type BranchesResponse struct {
	Repo           string       `json:"repo"`
	DeployedBranch string       `json:"deployed_branch"`
	DeployedCommit string       `json:"deployed_commit"`
	Branches       []BranchInfo `json:"branches"`
}

// gitSource returns the repository URL recorded on an Akson-managed container.
func gitSource(in *types.ContainerJSON) (string, error) {
	if in == nil || in.Config == nil || in.Config.Labels["akson.managed"] != "true" {
		return "", fmt.Errorf("container is not managed by Akson")
	}
	url := strings.TrimSpace(in.Config.Labels[LabelGitURL])
	if url == "" {
		return "", fmt.Errorf("this app was not deployed from a git repository (or was deployed before branch tracking existed)")
	}
	return url, nil
}

// handleListBranches lists the branches of the repository a container was built from.
// The URL comes from the container's label, never from the request.
func (s *Server) handleListBranches(w http.ResponseWriter, r *http.Request) {
	if s.docker == nil {
		errorResponse(w, http.StatusServiceUnavailable, "Docker client is not configured")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	in, err := s.docker.InspectContainer(ctx, chi.URLParam(r, "id"))
	if err != nil {
		errorResponse(w, http.StatusNotFound, "Container not found: "+err.Error())
		return
	}
	url, err := gitSource(in)
	if err != nil {
		errorResponse(w, http.StatusNotFound, err.Error())
		return
	}
	branches, err := git.ListBranches(ctx, url)
	if err != nil {
		errorResponse(w, http.StatusBadGateway, err.Error())
		return
	}
	respond(w, http.StatusOK, buildBranchesResponse(url, in.Config.Labels, branches))
}

func buildBranchesResponse(url string, labels map[string]string, branches []git.Branch) BranchesResponse {
	res := BranchesResponse{
		Repo:           url,
		DeployedBranch: labels[LabelGitBranch],
		DeployedCommit: labels[LabelGitCommit],
		Branches:       make([]BranchInfo, 0, len(branches)),
	}
	for _, b := range branches {
		res.Branches = append(res.Branches, BranchInfo{Name: b.Name, Commit: b.Commit, Deployed: b.Name == res.DeployedBranch})
	}
	return res
}

// handleRedeployBranch rebuilds a git-deployed app from another branch, keeping its
// name, user env vars, ports, limits, network and Traefik labels. Progress is streamed
// as NDJSON exactly like POST /deployments/stream.
func (s *Server) handleRedeployBranch(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Branch string `json:"branch"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid JSON payload: "+err.Error())
		return
	}
	branch := strings.TrimSpace(body.Branch)
	if err := git.ValidateBranch(branch); err != nil {
		errorResponse(w, http.StatusBadRequest, err.Error())
		return
	}
	if s.docker == nil {
		errorResponse(w, http.StatusServiceUnavailable, "Docker client is not configured")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	in, err := s.docker.InspectContainer(ctx, chi.URLParam(r, "id"))
	if err != nil {
		errorResponse(w, http.StatusNotFound, "Container not found: "+err.Error())
		return
	}
	var imageEnv []string
	if in.Config != nil {
		// Best effort: without it every current env var is carried over.
		imageEnv, _ = s.docker.ImageEnv(ctx, in.Image)
	}
	req, err := branchRedeployRequest(in, branch, imageEnv)
	if err != nil {
		errorResponse(w, http.StatusNotFound, err.Error())
		return
	}
	s.streamDeployRun(w, r, req)
}

// branchRedeployRequest builds the deploy request that rebuilds container in from branch.
func branchRedeployRequest(in *types.ContainerJSON, branch string, imageEnv []string) (DeployContainerRequest, error) {
	url, err := gitSource(in)
	if err != nil {
		return DeployContainerRequest{}, err
	}
	cfg := docker.ConfigFromInspect(in)
	cfg.Image = "" // rebuilt from the branch
	cfg.Env = docker.UserEnv(cfg.Env, imageEnv)
	return DeployContainerRequest{
		DeployConfig: cfg,
		GitURL:       url,
		GitBranch:    branch,
		Dockerfile:   in.Config.Labels[LabelGitDockerfile],
	}, nil
}
