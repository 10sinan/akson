# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Akson is a local Docker + service control panel (container list, live logs/stats, Git→Dockerfile build & deploy, Traefik routing). Go backend in `backend/`, React/Vite frontend in `frontend/`. The README and user-facing strings are in Turkish.

## Commands

From the repo root:

- `npm run dev` — runs `scripts/dev.sh`: Go backend on :3001 and Vite on :5173 together (Ctrl+C stops both). The script finds `go` on PATH or in `~/.local/go/bin`, `/tmp/go/bin`, `/usr/local/go/bin`.
- `npm run dev:backend` / `npm run dev:frontend` — run one side only.
- `npm run test:backend` — `go test ./...` in `backend/`.
- `docker compose up -d --build` — single-container install: the root `Dockerfile` builds the frontend and backend into one image that serves the UI and API on :3001 and talks to the host Docker via the mounted socket.

Backend (`cd backend`):
- Run a single test: `go test ./internal/docker -run TestCalculateStats_Math -v`
- Tests that need a live Docker daemon (deploy, containers, logs, stats, proxy network) call `t.Skip` when the daemon can't be reached. If Docker is running they create real containers and networks.
- Env vars: `PORT` (default 3001), `DB_PATH` (default `./data/akson.db`), `STATIC_DIR` (optional; serves the built frontend, used by the Docker image), `ACME_EMAIL` (optional, Traefik Let's Encrypt), `AKSON_TOKEN` (optional; when set, `/api/v1` requires `Authorization: Bearer <token>` or `?token=`).
- The server exits at startup if it can't ping the Docker daemon.

Frontend (`cd frontend`):
- `npm run build` — `tsc -b && vite build` (this is the type check).
- `npm run lint` — oxlint (config in `.oxlintrc.json`). There is no frontend test suite.

## Architecture

**Backend** (`backend/`, Go module `akson`, chi router):
- `cmd/server/main.go` wires everything: opens SQLite (`internal/db`, pure-Go `modernc.org/sqlite`, WAL mode, schema in `schema.go` applied with `CREATE IF NOT EXISTS`), connects the Docker client, makes sure the `akson-bridge` network exists, then starts the HTTP server. `WriteTimeout` is 0 on purpose so SSE streams aren't cut off.
- `internal/api`: `routes.go` lists all routes under `/api/v1` plus `/health`. `handlers.go` holds the `Server` struct (db, docker, networkMgr). Write responses with the `respond`/`errorResponse`/`okResponse` helpers in `helpers.go`. CORS allows only the localhost dev/preview origins.
- `internal/docker`: wraps the Docker Engine SDK. Container CRUD and actions, `DeployContainer` (pull, falling back to a locally cached image, then create with ports/limits/network/labels, then start), `BuildImage` (tars a directory and builds it), and log/stats streaming that returns `(<-chan T, <-chan error)` pairs.
- `internal/git`: `CloneRepo` runs the system `git` binary via `exec.CommandContext`, so `git` must be installed.
- `internal/proxy`: `akson-bridge` network management and Traefik label generation (`GenerateLabels`, `SanitizeName`).

**Deploy flow** (`handleDeployContainer`, used by both `POST /containers/deploy` and `POST /deployments`): if `git_url` is set, it clones into a temp dir (if the repo has no Dockerfile, `internal/detect` generates `Dockerfile.akson` for Node/Python/Go/static projects), builds the image as `akson/<name>:latest`, then deploys it. Otherwise it deploys `image` directly. Every outcome, success or failure, is recorded as a row in the `deployments` table, and the step logs are returned in the response.

**Streaming**: logs and stats go over Server-Sent Events (`/containers/{id}/logs/stream`, `/containers/{id}/stats/stream`). The frontend reads them with `EventSource` in `src/api/client.ts`.

**Frontend** (`frontend/src`, React 19, Tailwind v4 via `@tailwindcss/vite`, framer-motion, lucide-react):
- `api/client.ts` holds all backend calls and the API types (snake_case, matching Go JSON tags). `mapApiContainerToItem` converts them to the UI's `ContainerItem` (`types/container.ts`). `API_BASE` is `''`, and the Vite dev server proxies `/api` and `/health` to `localhost:3001`.
- `App.tsx` owns the top-level state (active tab, container list, modals, toasts). On mount it calls `/health`. If the backend or Docker is unreachable, the UI switches to **demo mode** (`dockerStatus: 'demo'`, `isLiveBackend: false`) instead of failing, so UI changes need to work in both modes.
- Each tab (dashboard/deploy/storage/logs/network) is rendered by a switch in `App.tsx` that picks a component from `components/views/`. Dashboard sub-panels live in `components/dashboard/`.
