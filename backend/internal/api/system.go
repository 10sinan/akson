package api

import (
	"context"
	"net/http"
	"time"

	"akson/internal/docker"
)

// SystemConfig holds startup settings that the settings page shows read-only.
type SystemConfig struct {
	DBPath       string
	ACMEEmailSet bool
}

// SetSystemConfig records startup settings for GET /system.
func (s *Server) SetSystemConfig(cfg SystemConfig) {
	s.sysConfig = cfg
}

// SystemInfo is the response of GET /api/v1/system. Secrets are never included, only whether they are set.
type SystemInfo struct {
	Docker         *docker.EngineInfo   `json:"docker,omitempty"`
	DockerError    string               `json:"docker_error,omitempty"`
	UnusedImages   *docker.UnusedImages `json:"unused_images,omitempty"`
	TraefikRunning bool                 `json:"traefik_running"`
	AuthEnabled    bool                 `json:"auth_enabled"`
	ACMEEmailSet   bool                 `json:"acme_email_set"`
	DBPath         string               `json:"db_path"`
	ServesFrontend bool                 `json:"serves_frontend"`
}

func (s *Server) handleSystemInfo(w http.ResponseWriter, r *http.Request) {
	info := SystemInfo{
		AuthEnabled:    s.authToken != "",
		ACMEEmailSet:   s.sysConfig.ACMEEmailSet,
		DBPath:         s.sysConfig.DBPath,
		ServesFrontend: s.staticDir != "",
	}

	if s.docker == nil {
		info.DockerError = "Docker client is not configured"
		respond(w, http.StatusOK, info)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if engine, err := s.docker.Engine(ctx); err != nil {
		info.DockerError = err.Error()
	} else {
		info.Docker = &engine
	}
	if unused, err := s.docker.UnusedImages(ctx); err == nil {
		info.UnusedImages = &unused
	}
	info.TraefikRunning = s.traefikRunning(ctx)

	respond(w, http.StatusOK, info)
}

func (s *Server) handlePruneImages(w http.ResponseWriter, r *http.Request) {
	if s.docker == nil {
		errorResponse(w, http.StatusServiceUnavailable, "Docker client is not configured")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Minute)
	defer cancel()

	result, err := s.docker.PruneUnusedImages(ctx)
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}
	respond(w, http.StatusOK, result)
}
