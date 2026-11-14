package db

import (
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"
)

// DB wraps the SQL connection pool and exposes high-level database operations.
type DB struct {
	conn *sql.DB
}

// New opens or creates an SQLite database at dbPath and initializes the schema in WAL mode.
func New(dbPath string) (*DB, error) {
	// Ensure parent directory exists if a path with directories was provided
	dir := filepath.Dir(dbPath)
	if dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create database directory: %w", err)
		}
	}

	conn, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite database: %w", err)
	}

	// Optimize connection pool for SQLite single-writer semantics
	conn.SetMaxOpenConns(1)
	conn.SetMaxIdleConns(1)
	conn.SetConnMaxLifetime(0)

	db := &DB{conn: conn}

	// Enable WAL mode and performance optimizations
	pragmas := []string{
		"PRAGMA journal_mode = WAL;",
		"PRAGMA synchronous = NORMAL;",
		"PRAGMA foreign_keys = ON;",
		"PRAGMA busy_timeout = 5000;",
	}
	for _, pragma := range pragmas {
		if _, err := conn.Exec(pragma); err != nil {
			conn.Close()
			return nil, fmt.Errorf("failed to apply %s: %w", pragma, err)
		}
	}

	// Run initial schema migration
	if _, err := conn.Exec(schemaDDL); err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to initialize schema: %w", err)
	}

	return db, nil
}

// Close gracefully closes the database connection.
func (db *DB) Close() error {
	return db.conn.Close()
}

// Ping verifies that the database connection is alive.
func (db *DB) Ping() error {
	return db.conn.Ping()
}

// ListServices returns all registered services ordered by creation time descending.
func (db *DB) ListServices() ([]Service, error) {
	query := `SELECT id, name, image, status, ports, env, traefik_rule, created_at, updated_at FROM services ORDER BY created_at DESC`
	rows, err := db.conn.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var services []Service
	for rows.Next() {
		var s Service
		if err := rows.Scan(&s.ID, &s.Name, &s.Image, &s.Status, &s.Ports, &s.Env, &s.TraefikRule, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		services = append(services, s)
	}
	return services, rows.Err()
}

// GetService retrieves a single service by ID.
func (db *DB) GetService(id string) (*Service, error) {
	query := `SELECT id, name, image, status, ports, env, traefik_rule, created_at, updated_at FROM services WHERE id = ?`
	row := db.conn.QueryRow(query, id)

	var s Service
	if err := row.Scan(&s.ID, &s.Name, &s.Image, &s.Status, &s.Ports, &s.Env, &s.TraefikRule, &s.CreatedAt, &s.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

// UpsertService creates or updates a service entry.
func (db *DB) UpsertService(s *Service) error {
	now := time.Now().UTC()
	if s.CreatedAt.IsZero() {
		s.CreatedAt = now
	}
	s.UpdatedAt = now

	query := `
	INSERT INTO services (id, name, image, status, ports, env, traefik_rule, created_at, updated_at)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	ON CONFLICT(id) DO UPDATE SET
		name = excluded.name,
		image = excluded.image,
		status = excluded.status,
		ports = excluded.ports,
		env = excluded.env,
		traefik_rule = excluded.traefik_rule,
		updated_at = excluded.updated_at
	`
	_, err := db.conn.Exec(query, s.ID, s.Name, s.Image, s.Status, s.Ports, s.Env, s.TraefikRule, s.CreatedAt, s.UpdatedAt)
	return err
}

// DeleteService removes a service by ID (cascades to related deployments).
func (db *DB) DeleteService(id string) error {
	_, err := db.conn.Exec("DELETE FROM services WHERE id = ?", id)
	return err
}

// ListDeployments returns recent deployment events. If serviceID is provided, it filters by service.
func (db *DB) ListDeployments(serviceID string, limit int) ([]Deployment, error) {
	if limit <= 0 {
		limit = 50
	}

	var rows *sql.Rows
	var err error

	if serviceID != "" {
		query := `SELECT id, service_id, commit_hash, branch, status, log_excerpt, triggered_at, completed_at FROM deployments WHERE service_id = ? ORDER BY triggered_at DESC LIMIT ?`
		rows, err = db.conn.Query(query, serviceID, limit)
	} else {
		query := `SELECT id, service_id, commit_hash, branch, status, log_excerpt, triggered_at, completed_at FROM deployments ORDER BY triggered_at DESC LIMIT ?`
		rows, err = db.conn.Query(query, limit)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []Deployment
	for rows.Next() {
		var d Deployment
		var completedAt sql.NullTime
		if err := rows.Scan(&d.ID, &d.ServiceID, &d.CommitHash, &d.Branch, &d.Status, &d.LogExcerpt, &d.TriggeredAt, &completedAt); err != nil {
			return nil, err
		}
		if completedAt.Valid {
			d.CompletedAt = &completedAt.Time
		}
		list = append(list, d)
	}
	return list, rows.Err()
}

// CreateDeployment registers a new deployment run.
func (db *DB) CreateDeployment(d *Deployment) error {
	if d.TriggeredAt.IsZero() {
		d.TriggeredAt = time.Now().UTC()
	}
	query := `INSERT INTO deployments (id, service_id, commit_hash, branch, status, log_excerpt, triggered_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := db.conn.Exec(query, d.ID, d.ServiceID, d.CommitHash, d.Branch, d.Status, d.LogExcerpt, d.TriggeredAt, d.CompletedAt)
	return err
}

// UpdateDeploymentStatus updates the progress, status, and log excerpt of a deployment.
func (db *DB) UpdateDeploymentStatus(id string, status string, logExcerpt string, completedAt *time.Time) error {
	query := `UPDATE deployments SET status = ?, log_excerpt = ?, completed_at = ? WHERE id = ?`
	_, err := db.conn.Exec(query, status, logExcerpt, completedAt, id)
	return err
}

// GetSetting retrieves a configuration value by key.
func (db *DB) GetSetting(key string) (string, error) {
	row := db.conn.QueryRow("SELECT value FROM settings WHERE key = ?", key)
	var val string
	if err := row.Scan(&val); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", nil
		}
		return "", err
	}
	return val, nil
}

// SetSetting saves or updates a configuration value.
func (db *DB) SetSetting(key, val string) error {
	query := `
	INSERT INTO settings (key, value, updated_at)
	VALUES (?, ?, ?)
	ON CONFLICT(key) DO UPDATE SET
		value = excluded.value,
		updated_at = excluded.updated_at
	`
	_, err := db.conn.Exec(query, key, val, time.Now().UTC())
	return err
}

