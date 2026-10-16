package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
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
	okResponse(w, fmt.Sprintf("Container %s action '%s' completed", id[:12], action))
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
