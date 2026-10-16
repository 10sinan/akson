package db

import (
	"path/filepath"
	"testing"
	"time"
)

func TestDatabase_Lifecycle(t *testing.T) {
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "test_akson.db")

	database, err := New(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Verify WAL mode is active
	var journalMode string
	err = database.conn.QueryRow("PRAGMA journal_mode;").Scan(&journalMode)
	if err != nil {
		t.Fatalf("Failed to query journal_mode: %v", err)
	}
	if journalMode != "wal" {
		t.Errorf("Expected journal_mode to be 'wal', got: %s", journalMode)
	}

	// 1. Test Services CRUD
	srv := &Service{
		ID:          "srv-1",
		Name:        "api-gateway",
		Image:       "traefik:v3.1",
		Status:      "running",
		Ports:       "80:80,443:443",
		Env:         "ENV=production",
		TraefikRule: "Host(`api.akson.local`)",
	}

	if err := database.UpsertService(srv); err != nil {
		t.Fatalf("UpsertService failed: %v", err)
	}

	fetched, err := database.GetService("srv-1")
	if err != nil {
		t.Fatalf("GetService failed: %v", err)
	}
	if fetched == nil || fetched.Name != "api-gateway" {
		t.Fatalf("Expected service name 'api-gateway', got: %+v", fetched)
	}

	// Update service
	srv.Status = "restarting"
	if err := database.UpsertService(srv); err != nil {
		t.Fatalf("UpsertService update failed: %v", err)
	}
	updated, _ := database.GetService("srv-1")
	if updated.Status != "restarting" {
		t.Errorf("Expected updated status 'restarting', got: %s", updated.Status)
	}

	services, err := database.ListServices()
	if err != nil || len(services) != 1 {
		t.Fatalf("ListServices failed, count=%d, err=%v", len(services), err)
	}

	// 2. Test Deployments
	dep := &Deployment{
		ID:          "dep-101",
		ServiceID:   "srv-1",
		CommitHash:  "a1b2c3d",
		Branch:      "main",
		Status:      "building",
		LogExcerpt:  "Compiling Go source...",
		TriggeredAt: time.Now().UTC(),
	}
	if err := database.CreateDeployment(dep); err != nil {
		t.Fatalf("CreateDeployment failed: %v", err)
	}

	now := time.Now().UTC()
	if err := database.UpdateDeploymentStatus("dep-101", "success", "Build completed successfully", &now); err != nil {
		t.Fatalf("UpdateDeploymentStatus failed: %v", err)
	}

	deps, err := database.ListDeployments("srv-1", 10)
	if err != nil || len(deps) != 1 {
		t.Fatalf("ListDeployments failed, count=%d, err=%v", len(deps), err)
	}
	if deps[0].Status != "success" || deps[0].CompletedAt == nil {
		t.Errorf("Deployment status not updated correctly: %+v", deps[0])
	}

	// 3. Test Settings
	if err := database.SetSetting("server_domain", "akson.local"); err != nil {
		t.Fatalf("SetSetting failed: %v", err)
	}
	val, err := database.GetSetting("server_domain")
	if err != nil || val != "akson.local" {
		t.Fatalf("GetSetting failed: got %s, err=%v", val, err)
	}

	// 4. Test Cascade Delete
	if err := database.DeleteService("srv-1"); err != nil {
		t.Fatalf("DeleteService failed: %v", err)
	}
	delSrv, _ := database.GetService("srv-1")
	if delSrv != nil {
		t.Errorf("Expected service to be deleted")
	}
	delDeps, _ := database.ListDeployments("srv-1", 10)
	if len(delDeps) != 0 {
		t.Errorf("Expected cascade deletion of deployments, found: %d", len(delDeps))
	}
}

