package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"akson/internal/db"
	"akson/internal/docker"
	"akson/internal/git"
	"akson/internal/proxy"

	"github.com/go-chi/chi/v5"
)

// Server holds all dependencies needed to serve API requests.
type Server struct {
	db         *db.DB
	docker     *docker.Client
	networkMgr *proxy.NetworkManager
	authToken  string
}

// SetAuthToken enables token authentication on /api/v1. An empty token disables it.
func (s *Server) SetAuthToken(token string) {
	s.authToken = token
}

// NewServer initializes the API server with all required dependencies.
func NewServer(database *db.DB, dockerClient *docker.Client, networkMgr *proxy.NetworkManager) *Server {
	return &Server{
		db:         database,
		docker:     dockerClient,
		networkMgr: networkMgr,
	}
}

// --- Container Handlers ---

// handleListContainers returns all containers (running + stopped).
func (s *Server) handleListContainers(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	containers, err := s.docker.ListContainers(ctx, true)
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, "Failed to list containers: "+err.Error())
		return
	}
	respond(w, http.StatusOK, containers)
}

// DeployContainerRequest defines the HTTP payload for deploying a container from scratch.
type DeployContainerRequest struct {
	docker.DeployConfig
	Domain     string `json:"domain,omitempty"`
	Port       int    `json:"port,omitempty"`
	PathPrefix string `json:"path_prefix,omitempty"`
	EnableTLS  bool   `json:"enable_tls,omitempty"`
	Branch     string `json:"branch,omitempty"`
	CommitHash string `json:"commit_hash,omitempty"`
	GitURL     string `json:"git_url,omitempty"`
	GitBranch  string `json:"git_branch,omitempty"`
	Dockerfile string `json:"dockerfile,omitempty"`
}

// handleDeployContainer pulls/builds an image, creates, networks, and runs a container from scratch.
func (s *Server) handleDeployContainer(w http.ResponseWriter, r *http.Request) {
	var req DeployContainerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid JSON payload: "+err.Error())
		return
	}

	depID := fmt.Sprintf("dep-%d", time.Now().UnixMilli())
	now := time.Now().UTC()
	var allLogs []string

	// Check if this is a Git-based build & deploy
	if strings.TrimSpace(req.GitURL) != "" {
		if strings.TrimSpace(req.Name) == "" {
			// Auto derive name from git url
			base := filepath.Base(strings.TrimSuffix(strings.TrimSpace(req.GitURL), ".git"))
			req.Name = proxy.SanitizeName(base)
		}

		tempDir, err := os.MkdirTemp("", "akson-git-*")
		if err != nil {
			errorResponse(w, http.StatusInternalServerError, "Failed to create temp build directory: "+err.Error())
			return
		}
		defer os.RemoveAll(tempDir)

		gitBranch := req.GitBranch
		if gitBranch == "" {
			gitBranch = req.Branch
		}
		if gitBranch == "" {
			gitBranch = "main"
		}

		// 1. Clone repository
		gitInfo, cloneLogs, err := git.CloneRepo(r.Context(), req.GitURL, gitBranch, tempDir)
		allLogs = append(allLogs, cloneLogs...)
		if err != nil {
			s.recordFailedDeployment(depID, req.Name, req.GitURL, "unknown", gitBranch, allLogs, err, now)
			errorResponse(w, http.StatusBadRequest, "Git clone failed: "+err.Error())
			return
		}

		req.Branch = gitInfo.Branch
		req.CommitHash = gitInfo.CommitHash

		// 2. Build Docker Image
		builtTag := fmt.Sprintf("akson/%s:latest", proxy.SanitizeName(req.Name))
		allLogs = append(allLogs, fmt.Sprintf("Building Docker image %s from source...", builtTag))

		buildRes, err := s.docker.BuildImage(r.Context(), docker.BuildOptions{
			ContextDir: tempDir,
			Dockerfile: req.Dockerfile,
			Tag:        builtTag,
		})
		if err != nil {
			s.recordFailedDeployment(depID, req.Name, builtTag, req.CommitHash, req.Branch, allLogs, err, now)
			errorResponse(w, http.StatusInternalServerError, "Docker build failed: "+err.Error())
			return
		}

		allLogs = append(allLogs, buildRes.Logs...)
		allLogs = append(allLogs, fmt.Sprintf("Successfully built image %s", builtTag))
		req.Image = builtTag
	}

	if strings.TrimSpace(req.Name) == "" {
		errorResponse(w, http.StatusBadRequest, "Container name is required")
		return
	}
	if strings.TrimSpace(req.Image) == "" {
		errorResponse(w, http.StatusBadRequest, "Image name is required")
		return
	}

	// 1. Prepare default isolated network
	if req.NetworkName == "" {
		req.NetworkName = proxy.DefaultNetworkName
	}
	if s.networkMgr != nil {
		_, _ = s.networkMgr.EnsureNetwork(r.Context())
	}

	// 2. Prepare Traefik labels if domain/prefix specified
	if req.Labels == nil {
		req.Labels = make(map[string]string)
	}
	if req.Domain != "" {
		port := req.Port
		if port == 0 && len(req.Ports) > 0 {
			port = int(req.Ports[0].PrivatePort)
		}
		if port == 0 {
			port = 80
		}
		labels := proxy.GenerateLabels(proxy.RouteConfig{
			ServiceName: req.Name,
			Domain:      req.Domain,
			Port:        port,
			EnableTLS:   req.EnableTLS,
			PathPrefix:  req.PathPrefix,
		})
		for k, v := range labels {
			if _, exists := req.Labels[k]; !exists {
				req.Labels[k] = v
			}
		}
	}

	branch := req.Branch
	if branch == "" {
		branch = "main"
	}
	commit := req.CommitHash
	if commit == "" {
		commit = "latest"
	}

	// 3. Deploy container via Docker SDK (pull -> create -> network -> start)
	result, err := s.docker.DeployContainer(r.Context(), req.DeployConfig)
	if err != nil {
		s.recordFailedDeployment(depID, req.Name, req.Image, commit, branch, allLogs, err, now)
		errorResponse(w, http.StatusInternalServerError, "Container deploy failed: "+err.Error())
		return
	}

	// Combine build logs and deploy logs
	if len(allLogs) > 0 {
		result.Logs = append(allLogs, result.Logs...)
	}

	// 4. Save service state and deployment log in DB
	if s.db != nil {
		portsJSON, _ := json.Marshal(req.Ports)
		envJSON, _ := json.Marshal(req.Env)
		var traefikRule string
		if req.Labels != nil {
			traefikRule = req.Labels["traefik.http.routers."+proxy.SanitizeName(req.Name)+".rule"]
		}

		_ = s.db.UpsertService(&db.Service{
			ID:          req.Name,
			Name:        req.Name,
			Image:       req.Image,
			Status:      "running",
			Ports:       string(portsJSON),
			Env:         string(envJSON),
			TraefikRule: traefikRule,
			CreatedAt:   now,
			UpdatedAt:   now,
		})

		logExcerpt := strings.Join(result.Logs, "\n")
		_ = s.db.CreateDeployment(&db.Deployment{
			ID:          depID,
			ServiceID:   req.Name,
			CommitHash:  commit,
			Branch:      branch,
			Status:      "success",
			LogExcerpt:  logExcerpt,
			TriggeredAt: now,
			CompletedAt: &now,
		})
	}

	respond(w, http.StatusCreated, result)
}

// recordFailedDeployment stores a failed deployment in the history.
// deployments.service_id is a foreign key to services, so when this name has never been
// deployed before, a service row with status "failed" is created first; otherwise the
// insert is rejected. An existing service row is left untouched (its container may still run).
func (s *Server) recordFailedDeployment(depID, name, image, commit, branch string, stepLogs []string, deployErr error, triggeredAt time.Time) {
	if s.db == nil {
		return
	}
	existing, err := s.db.GetService(name)
	if err != nil {
		log.Printf("⚠️  could not record failed deployment %s: %v", depID, err)
		return
	}
	if existing == nil {
		if err := s.db.UpsertService(&db.Service{ID: name, Name: name, Image: image, Status: "failed"}); err != nil {
			log.Printf("⚠️  could not record failed deployment %s: %v", depID, err)
			return
		}
	}
	completedAt := time.Now().UTC()
	excerpt := strings.Join(append(append([]string{}, stepLogs...), deployErr.Error()), "\n")
	if err := s.db.CreateDeployment(&db.Deployment{
		ID:          depID,
		ServiceID:   name,
		CommitHash:  commit,
		Branch:      branch,
		Status:      "failed",
		LogExcerpt:  excerpt,
		TriggeredAt: triggeredAt,
		CompletedAt: &completedAt,
	}); err != nil {
		log.Printf("⚠️  could not record failed deployment %s: %v", depID, err)
	}
}

// handleGetContainer returns details of a single container.
func (s *Server) handleGetContainer(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	info, err := s.docker.InspectContainer(ctx, id)
	if err != nil {
		errorResponse(w, http.StatusNotFound, "Container not found: "+err.Error())
		return
	}
	respond(w, http.StatusOK, info)
}

// handleContainerAction performs start/stop/restart on a container.
func (s *Server) handleContainerAction(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	action := chi.URLParam(r, "action")

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	var err error
	switch action {
	case "start":
		err = s.docker.StartContainer(ctx, id)
	case "stop":
		err = s.docker.StopContainer(ctx, id, nil)
	case "restart":
		err = s.docker.RestartContainer(ctx, id, nil)
	default:
		errorResponse(w, http.StatusBadRequest, "Unknown action: "+action)
		return
	}

	if err != nil {
		errorResponse(w, http.StatusInternalServerError, fmt.Sprintf("Action %s failed: %s", action, err.Error()))
		return
	}
	okResponse(w, fmt.Sprintf("Container %s action '%s' completed", docker.ShortID(id), action))
}

// handleRemoveContainer force-removes a container (stopping it first if it runs).
func (s *Server) handleRemoveContainer(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	if err := s.docker.RemoveContainer(ctx, id, true); err != nil {
		errorResponse(w, http.StatusInternalServerError, "Remove failed: "+err.Error())
		return
	}
	okResponse(w, fmt.Sprintf("Container %s removed", docker.ShortID(id)))
}

// handleContainerStats returns a single snapshot of container resource usage.
func (s *Server) handleContainerStats(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	stats, err := s.docker.GetContainerStats(ctx, id)
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, "Failed to get stats: "+err.Error())
		return
	}
	respond(w, http.StatusOK, stats)
}

// handleStreamLogs streams container logs via SSE (Server-Sent Events).
func (s *Server) handleStreamLogs(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	tail := r.URL.Query().Get("tail")
	if tail == "" {
		tail = "100"
	}

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	flusher, ok := w.(http.Flusher)
	if !ok {
		errorResponse(w, http.StatusInternalServerError, "Streaming not supported")
		return
	}

	ctx := r.Context()
	logsChan, errChan := s.docker.StreamContainerLogs(ctx, id, tail, true)

	for {
		select {
		case <-ctx.Done():
			return
		case err, ok := <-errChan:
			if !ok {
				return
			}
			fmt.Fprintf(w, "event: error\ndata: %s\n\n", err.Error())
			flusher.Flush()
			return
		case entry, ok := <-logsChan:
			if !ok {
				return
			}
			data, _ := json.Marshal(entry)
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		}
	}
}

// handleStreamStats streams container telemetry via SSE.
func (s *Server) handleStreamStats(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	flusher, ok := w.(http.Flusher)
	if !ok {
		errorResponse(w, http.StatusInternalServerError, "Streaming not supported")
		return
	}

	ctx := r.Context()
	statsChan, errChan := s.docker.StreamContainerStats(ctx, id)

	for {
		select {
		case <-ctx.Done():
			return
		case err, ok := <-errChan:
			if !ok {
				return
			}
			fmt.Fprintf(w, "event: error\ndata: %s\n\n", err.Error())
			flusher.Flush()
			return
		case stats, ok := <-statsChan:
			if !ok {
				return
			}
			data, _ := json.Marshal(stats)
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		}
	}
}

// --- Service Handlers (DB-backed) ---

// handleListServices returns all services from the database.
func (s *Server) handleListServices(w http.ResponseWriter, r *http.Request) {
	services, err := s.db.ListServices()
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, "Failed to list services: "+err.Error())
		return
	}
	if services == nil {
		services = []db.Service{}
	}
	respond(w, http.StatusOK, services)
}

// handleGetService returns a specific service by ID.
func (s *Server) handleGetService(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	svc, err := s.db.GetService(id)
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}
	if svc == nil {
		errorResponse(w, http.StatusNotFound, "Service not found")
		return
	}
	respond(w, http.StatusOK, svc)
}

// handleUpsertService creates or updates a service record.
func (s *Server) handleUpsertService(w http.ResponseWriter, r *http.Request) {
	var svc db.Service
	if err := json.NewDecoder(r.Body).Decode(&svc); err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid JSON payload: "+err.Error())
		return
	}
	if svc.ID == "" || svc.Name == "" {
		errorResponse(w, http.StatusBadRequest, "Service 'id' and 'name' are required")
		return
	}
	if err := s.db.UpsertService(&svc); err != nil {
		errorResponse(w, http.StatusInternalServerError, "Failed to save service: "+err.Error())
		return
	}
	respond(w, http.StatusOK, svc)
}

// handleDeleteService removes a service and its deployments.
func (s *Server) handleDeleteService(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := s.db.DeleteService(id); err != nil {
		errorResponse(w, http.StatusInternalServerError, "Failed to delete service: "+err.Error())
		return
	}
	okResponse(w, "Service deleted")
}

// --- Deployment Handlers ---

// handleListDeployments returns recent deployments (optionally filtered by service).
func (s *Server) handleListDeployments(w http.ResponseWriter, r *http.Request) {
	serviceID := r.URL.Query().Get("service_id")
	deps, err := s.db.ListDeployments(serviceID, 50)
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, "Failed to list deployments: "+err.Error())
		return
	}
	if deps == nil {
		deps = []db.Deployment{}
	}
	respond(w, http.StatusOK, deps)
}

// --- Network Handler ---

// handleGetNetwork returns the current akson-bridge topology.
func (s *Server) handleGetNetwork(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	details, err := s.networkMgr.GetNetworkDetails(ctx)
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, "Failed to inspect network: "+err.Error())
		return
	}
	respond(w, http.StatusOK, details)
}

// --- Traefik Label Helper Handler ---

// handleGenerateTraefikLabels generates Traefik routing labels for a service config.
func (s *Server) handleGenerateTraefikLabels(w http.ResponseWriter, r *http.Request) {
	var cfg proxy.RouteConfig
	if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid JSON: "+err.Error())
		return
	}
	labels := proxy.GenerateLabels(cfg)
	respond(w, http.StatusOK, labels)
}

// --- Health ---

// handleHealth returns a simple health check response.
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	dockerOK := "ok"
	if err := s.docker.Ping(ctx); err != nil {
		dockerOK = "unavailable: " + err.Error()
	}

	dbOK := "ok"
	if err := s.db.Ping(); err != nil {
		dbOK = "unavailable: " + err.Error()
	}

	respond(w, http.StatusOK, map[string]string{
		"status": "ok",
		"docker": dockerOK,
		"db":     dbOK,
		"time":   time.Now().UTC().Format(time.RFC3339),
	})
}
