package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"akson/internal/db"
	"akson/internal/docker"
	"akson/internal/proxy"

	"github.com/go-chi/chi/v5"
)

// Server holds all dependencies needed to serve API requests.
type Server struct {
	db         *db.DB
	docker     *docker.Client
	networkMgr *proxy.NetworkManager
	authToken  string
	staticDir  string
	sysConfig  SystemConfig
	publishIP  string
}

// SetStaticDir serves the built frontend from dir for all non-API routes.
func (s *Server) SetStaticDir(dir string) {
	s.staticDir = dir
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

// handleUpdateEnv recreates a managed container with a new set of environment variables.
func (s *Server) handleUpdateEnv(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body struct {
		Env map[string]string `json:"env"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid JSON: "+err.Error())
		return
	}
	for k := range body.Env {
		if k == "" || strings.ContainsAny(k, "= \t\n") {
			errorResponse(w, http.StatusBadRequest, "Invalid env key: "+k)
			return
		}
	}
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Minute)
	defer cancel()
	res, err := s.docker.UpdateEnv(ctx, id, body.Env)
	if err != nil {
		errorResponse(w, http.StatusBadRequest, err.Error())
		return
	}
	respond(w, http.StatusOK, res)
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
	if err := proxy.ValidateRoute(cfg); err != nil {
		errorResponse(w, http.StatusBadRequest, err.Error())
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

// traefikRunning reports whether a running container uses a Traefik image.
func (s *Server) traefikRunning(ctx context.Context) bool {
	if s.docker == nil {
		return false
	}
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	containers, err := s.docker.ListContainers(ctx, false)
	if err != nil {
		return false
	}
	for _, c := range containers {
		if strings.Contains(strings.ToLower(c.Image), "traefik") {
			return true
		}
	}
	return false
}
