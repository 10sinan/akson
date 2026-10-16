package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

// NewRouter creates and returns a fully configured HTTP router with all API routes.
func (s *Server) NewRouter() http.Handler {
	r := chi.NewRouter()

	// --- Middleware ---
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:3000", "http://localhost:4173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// --- Health ---
	r.Get("/health", s.handleHealth)

	// --- API v1 ---
	r.Route("/api/v1", func(r chi.Router) {

		// Containers
		r.Route("/containers", func(r chi.Router) {
			r.Get("/", s.handleListContainers)
			r.Get("/{id}", s.handleGetContainer)
			r.Post("/{id}/actions/{action}", s.handleContainerAction)
			r.Get("/{id}/stats", s.handleContainerStats)
			r.Get("/{id}/logs/stream", s.handleStreamLogs)
			r.Get("/{id}/stats/stream", s.handleStreamStats)
		})

		// Services (DB-backed)
		r.Route("/services", func(r chi.Router) {
			r.Get("/", s.handleListServices)
			r.Post("/", s.handleUpsertService)
			r.Get("/{id}", s.handleGetService)
			r.Put("/{id}", s.handleUpsertService)
			r.Delete("/{id}", s.handleDeleteService)
		})

		// Deployments
		r.Get("/deployments", s.handleListDeployments)

		// Network & Proxy
		r.Get("/network", s.handleGetNetwork)
		r.Post("/network/labels", s.handleGenerateTraefikLabels)
	})

	return r
}
