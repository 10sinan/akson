package main

import (
	"context"
	"log"
	"net"
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
	// Listen on loopback by default: the API controls the Docker daemon, so it must not be
	// reachable from the network unless the operator opts in (HOST=0.0.0.0, ideally with AKSON_TOKEN).
	host := envOr("HOST", "127.0.0.1")
	dbPath := envOr("DB_PATH", "./data/akson.db")
	acmeEmail := envOr("ACME_EMAIL", "")
	authToken := envOr("AKSON_TOKEN", "")
	staticDir := envOr("STATIC_DIR", "")

	log.Printf("🚀 Akson Backend starting on %s", net.JoinHostPort(host, port))

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
	server.SetAuthToken(authToken)
	server.SetSystemConfig(api.SystemConfig{DBPath: dbPath, ACMEEmailSet: acmeEmail != ""})
	if authToken == "" {
		log.Printf("⚠️  AKSON_TOKEN is not set: API is open without authentication")
		if !isLoopbackHost(host) {
			log.Printf("🚨 HOST=%s exposes an unauthenticated Docker control API to the network. Set AKSON_TOKEN.", host)
		}
	} else {
		log.Printf("🔒 API token authentication enabled")
	}
	if staticDir != "" {
		server.SetStaticDir(staticDir)
		log.Printf("🖥️  Serving frontend from %s", staticDir)
	}
	router := server.NewRouter()

	httpServer := &http.Server{
		Addr:         net.JoinHostPort(host, port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 0, // 0 = no timeout, needed for SSE streaming
		IdleTimeout:  60 * time.Second,
	}

	// Start in a goroutine so we can handle signals
	serverErr := make(chan error, 1)
	go func() {
		log.Printf("🟢 HTTP API listening on http://%s", net.JoinHostPort(host, port))
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

// isLoopbackHost reports whether host only accepts connections from the local machine.
func isLoopbackHost(host string) bool {
	if host == "localhost" {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}
