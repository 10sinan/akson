package db

import (
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestUpsertService_DoesNotStoreSecrets(t *testing.T) {
	database, err := New(filepath.Join(t.TempDir(), "t.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()

	if err := database.UpsertService(&Service{
		ID: "app", Name: "app", Image: "https://user:tok3n@github.com/a/b", Status: "failed",
		Env: `{"DB_PASSWORD":"hunter2"}`,
	}); err != nil {
		t.Fatal(err)
	}
	if err := database.CreateDeployment(&Deployment{
		ID: "d1", ServiceID: "app", Status: "failed",
		LogExcerpt: "Cloning repository https://user:tok3n@github.com/a/b (branch: main)...",
	}); err != nil {
		t.Fatal(err)
	}

	svc, _ := database.GetService("app")
	deps, _ := database.ListDeployments("app", 10)
	all := svc.Env + svc.Image + deps[0].LogExcerpt
	if strings.Contains(all, "hunter2") || strings.Contains(all, "tok3n") {
		t.Fatalf("secret stored: %+v %+v", svc, deps[0])
	}
	if !strings.Contains(svc.Env, "DB_PASSWORD") {
		t.Fatalf("env key should be kept: %q", svc.Env)
	}
}

func TestNew_ScrubsSecretsWrittenByOlderVersions(t *testing.T) {
	path := filepath.Join(t.TempDir(), "old.db")
	database, err := New(path)
	if err != nil {
		t.Fatal(err)
	}
	// Write rows the way older versions did, bypassing UpsertService/CreateDeployment.
	now := time.Now().UTC()
	if _, err := database.conn.Exec(`INSERT INTO services (id, name, image, status, ports, env, traefik_rule, created_at, updated_at)
		VALUES ('old', 'old', 'https://ghp_secret@github.com/a/b', 'failed', '', '{"API_KEY":"s3cr3t"}', '', ?, ?)`, now, now); err != nil {
		t.Fatal(err)
	}
	if _, err := database.conn.Exec(`INSERT INTO deployments (id, service_id, commit_hash, branch, status, log_excerpt, triggered_at)
		VALUES ('d-old', 'old', 'x', 'main', 'failed', 'clone https://u:ghp_secret@github.com/a/b failed', ?)`, now); err != nil {
		t.Fatal(err)
	}
	database.Close()

	database, err = New(path)
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()
	svc, _ := database.GetService("old")
	deps, _ := database.ListDeployments("old", 10)
	all := svc.Env + svc.Image + deps[0].LogExcerpt
	if strings.Contains(all, "s3cr3t") || strings.Contains(all, "ghp_secret") {
		t.Fatalf("old secrets not scrubbed: %+v %+v", svc, deps[0])
	}
}
