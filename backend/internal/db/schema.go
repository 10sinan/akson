package db

import "time"

// Service represents a registered application or container managed by Akson.
type Service struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Image       string    `json:"image"`
	Status      string    `json:"status"`
	Ports       string    `json:"ports"`        // e.g. "8080:80,443:443"
	Env         string    `json:"env"`          // JSON encoded or KEY=VAL list
	TraefikRule string    `json:"traefik_rule"` // e.g. "Host(`api.example.com`)"
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Deployment represents a CI/CD build or deployment execution event.
type Deployment struct {
	ID          string     `json:"id"`
	ServiceID   string     `json:"service_id"`
	CommitHash  string     `json:"commit_hash"`
	Branch      string     `json:"branch"`
	Status      string     `json:"status"` // queued, building, success, failed
	LogExcerpt  string     `json:"log_excerpt"`
	TriggeredAt time.Time  `json:"triggered_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

// Setting represents a key-value system configuration entry.
type Setting struct {
	Key       string    `json:"key"`
	Value     string    `json:"value"`
	UpdatedAt time.Time `json:"updated_at"`
}

// schemaDDL defines the core SQLite tables required by Akson.
const schemaDDL = `
CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    image TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'stopped',
    ports TEXT NOT NULL DEFAULT '',
    env TEXT NOT NULL DEFAULT '',
    traefik_rule TEXT NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deployments (
    id TEXT PRIMARY KEY,
    service_id TEXT NOT NULL,
    commit_hash TEXT NOT NULL DEFAULT '',
    branch TEXT NOT NULL DEFAULT 'main',
    status TEXT NOT NULL DEFAULT 'queued',
    log_excerpt TEXT NOT NULL DEFAULT '',
    triggered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY(service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_deployments_service_id ON deployments(service_id);
CREATE INDEX IF NOT EXISTS idx_deployments_triggered_at ON deployments(triggered_at DESC);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`

