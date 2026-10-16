package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"akson/internal/api"
	"akson/internal/db"
	"akson/internal/docker"
	"akson/internal/proxy"
)

func main() {
	// --- Configuration from environment (or defaults) ---
	port := envOr("PORT", "3001")
	dbPath := envOr("DB_PATH", "./data/akson.db")
	acmeEmail := envOr("ACME_EMAIL", "")

	log.Printf("🚀 Akson Backend starting on :%s", port)

	// --- Database ---
	log.Printf("📦 Opening database at %s", dbPath)
	database, err := db.New(dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()
	log.Printf("✅ Database ready (WAL mode)")

	// --- Docker ---
	log.Printf("🐳 Connecting to Docker daemon...")
	dockerClient, err := docker.NewClient()
	if err != nil {
		log.Fatalf("Failed to initialize Docker client: %v", err)
	}
	defer dockerClient.Close()

	pingCtx, pingCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer pingCancel()
	if err := dockerClient.Ping(pingCtx); err != nil {
		log.Fatalf("Docker daemon not reachable: %v", err)
	}
	log.Printf("✅ Docker daemon connected")

	// --- Proxy / Network ---
	log.Printf("🌐 Ensuring akson-bridge network exists...")
	networkMgr := proxy.NewNetworkManager(dockerClient.RawClient())
	netCtx, netCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer netCancel()
	netID, err := networkMgr.EnsureNetwork(netCtx)
	if err != nil {
		log.Printf("⚠️  Could not ensure akson-bridge: %v (continuing without dedicated network)", err)
	} else {
		log.Printf("✅ akson-bridge network ready (ID=%s)", netID[:12])
	}

	if acmeEmail != "" {
		traefikArgs := proxy.TraefikDefaultArgs(acmeEmail)
		log.Printf("🔐 Traefik ACME configured for %s (%d flags)", acmeEmail, len(traefikArgs))
	}

	// --- HTTP Server ---
	server := api.NewServer(database, dockerClient, networkMgr)
	router := server.NewRouter()

	httpServer := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 0, // 0 = no timeout, needed for SSE streaming
		IdleTimeout:  60 * time.Second,
	}

	// Start in a goroutine so we can handle signals
	serverErr := make(chan error, 1)
	go func() {
		log.Printf("🟢 HTTP API listening on http://localhost:%s", port)
		log.Printf("   Health: http://localhost:%s/health", port)
		log.Printf("   API:    http://localhost:%s/api/v1", port)
		serverErr <- httpServer.ListenAndServe()
	}()

	// --- Graceful Shutdown ---
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-serverErr:
		log.Fatalf("Server error: %v", err)
	case sig := <-quit:
		log.Printf("⏹️  Received signal %s, shutting down gracefully...", sig)
	}

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer shutdownCancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("⚠️  Forced shutdown: %v", err)
	} else {
		log.Printf("✅ Server stopped gracefully")
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
