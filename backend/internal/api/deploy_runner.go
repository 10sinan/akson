package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"akson/internal/db"
	"akson/internal/detect"
	"akson/internal/docker"
	"akson/internal/git"
	"akson/internal/proxy"
	"akson/internal/redact"
)

// Deploy steps reported to the UI, in order.
const (
	StepClone  = "clone"
	StepDetect = "detect"
	StepBuild  = "build"
	StepPull   = "pull"
	StepStart  = "start"
	StepReady  = "ready"
)

// DeployEvent is one line of the live deploy stream.
type DeployEvent struct {
	Type      string                `json:"type"` // step, log, result, error
	Step      string                `json:"step,omitempty"`
	Status    string                `json:"status,omitempty"` // running, done, error
	Detail    string                `json:"detail,omitempty"`
	Line      string                `json:"line,omitempty"`
	Message   string                `json:"message,omitempty"`
	Container *docker.ContainerInfo `json:"container,omitempty"`
	URL       string                `json:"url,omitempty"`
}

// deployError carries the HTTP status the classic JSON endpoint should answer with.
type deployError struct {
	code int
	msg  string
}

func (e *deployError) Error() string { return e.msg }

// deployRun holds the state of one deployment while it runs.
type deployRun struct {
	s     *Server
	emit  func(DeployEvent)
	logs  []string
	depID string
	now   time.Time
}

func (d *deployRun) log(line string) {
	d.logs = append(d.logs, line)
	d.emit(DeployEvent{Type: "log", Line: line})
}

func (d *deployRun) step(name, status, detail string) {
	d.emit(DeployEvent{Type: "step", Step: name, Status: status, Detail: detail})
}

// fail records the failed deployment, reports the failing step and returns the error.
func (d *deployRun) fail(step string, code int, msg string, cause error, name, image, commit, branch string) error {
	d.s.recordFailedDeployment(d.depID, name, image, commit, branch, d.logs, cause, d.now)
	d.step(step, "error", msg)
	return &deployError{code: code, msg: msg}
}

// runDeploy clones/builds (for git_url) or uses req.Image, then creates and starts the
// container. Progress is reported through emit; every outcome is recorded in the DB.
func (s *Server) runDeploy(ctx context.Context, req DeployContainerRequest, emit func(DeployEvent)) (*docker.DeployResult, error) {
	if emit == nil {
		emit = func(DeployEvent) {}
	}
	d := &deployRun{s: s, emit: emit, depID: fmt.Sprintf("dep-%d", time.Now().UnixMilli()), now: time.Now().UTC()}

	// Domain and path prefix end up inside a Traefik rule: reject anything that is not a
	// plain host name / path before doing any work.
	if err := proxy.ValidateRoute(proxy.RouteConfig{Domain: req.Domain, PathPrefix: req.PathPrefix}); err != nil {
		return nil, &deployError{code: http.StatusBadRequest, msg: err.Error()}
	}
	if err := docker.ValidateDockerfilePath(strings.TrimSpace(req.Dockerfile)); err != nil {
		return nil, &deployError{code: http.StatusBadRequest, msg: err.Error()}
	}
	if err := validateEnvKeys(req.Env); err != nil {
		return nil, &deployError{code: http.StatusBadRequest, msg: err.Error()}
	}

	if strings.TrimSpace(req.GitURL) != "" {
		if strings.TrimSpace(req.Name) == "" {
			base := filepath.Base(strings.TrimSuffix(strings.TrimSpace(req.GitURL), ".git"))
			req.Name = proxy.SanitizeName(base)
		}

		d.step(StepClone, "running", req.GitURL)
		if err := git.ValidateRepoURL(req.GitURL); err != nil {
			d.log("Git URL rejected: " + err.Error())
			return nil, d.fail(StepClone, http.StatusBadRequest, err.Error(), err, req.Name, req.GitURL, "unknown", req.GitBranch)
		}
		if err := git.CheckRepoHost(ctx, req.GitURL); err != nil {
			d.log("Git URL rejected: " + err.Error())
			return nil, d.fail(StepClone, http.StatusBadRequest, err.Error(), err, req.Name, req.GitURL, "unknown", req.GitBranch)
		}

		tempDir, err := os.MkdirTemp("", "akson-git-*")
		if err != nil {
			return nil, d.fail(StepClone, http.StatusInternalServerError, "Failed to create temp build directory: "+err.Error(), err, req.Name, req.GitURL, "unknown", req.GitBranch)
		}
		defer os.RemoveAll(tempDir)

		gitBranch := req.GitBranch
		if gitBranch == "" {
			gitBranch = req.Branch
		}
		if gitBranch == "" {
			gitBranch = "main"
		}

		gitInfo, cloneLogs, err := git.CloneRepo(ctx, req.GitURL, gitBranch, tempDir)
		for _, l := range cloneLogs {
			d.log(l)
		}
		if err != nil {
			return nil, d.fail(StepClone, http.StatusBadRequest, "Git clone failed: "+err.Error(), err, req.Name, req.GitURL, "unknown", gitBranch)
		}
		req.Branch = gitInfo.Branch
		req.CommitHash = gitInfo.CommitHash
		d.step(StepClone, "done", shortCommit(gitInfo.CommitHash))

		// No Dockerfile in the repo: generate one from the project type.
		// The UI may send "Dockerfile" by default, so that name also counts as "not chosen".
		d.step(StepDetect, "running", "")
		requested := strings.TrimSpace(req.Dockerfile)
		if (requested == "" || requested == "Dockerfile") && !detect.HasDockerfile(tempDir) {
			plan, derr := detect.Detect(tempDir)
			if derr != nil {
				d.log(derr.Error())
				return nil, d.fail(StepDetect, http.StatusBadRequest, derr.Error(), derr, req.Name, req.GitURL, req.CommitHash, req.Branch)
			}
			name, werr := detect.Write(tempDir, plan)
			if werr != nil {
				return nil, d.fail(StepDetect, http.StatusInternalServerError, "Failed to write generated Dockerfile: "+werr.Error(), werr, req.Name, req.GitURL, req.CommitHash, req.Branch)
			}
			req.Dockerfile = name
			d.log(fmt.Sprintf("No Dockerfile found: detected a %s project and generated one (expected port %d).", plan.Kind, plan.Port))
			// The generated image listens on plan.Port, so point the container side of every
			// mapping (and the PORT env var) at it. With no mapping, publish it on a free host port.
			if len(req.Ports) == 0 {
				req.Ports = []docker.PortMapping{{PrivatePort: uint16(plan.Port), Type: "tcp"}}
			}
			for i := range req.Ports {
				req.Ports[i].PrivatePort = uint16(plan.Port)
			}
			if req.Env == nil {
				req.Env = map[string]string{}
			}
			req.Env["PORT"] = fmt.Sprintf("%d", plan.Port)
			req.Port = plan.Port
			d.step(StepDetect, "done", plan.Kind)
		} else {
			// The repo brings its own Dockerfile: publish its EXPOSE port on a free host port.
			if len(req.Ports) == 0 {
				if p := detect.ExposedPort(tempDir, requested); p > 0 {
					req.Ports = []docker.PortMapping{{PrivatePort: uint16(p), Type: "tcp"}}
					req.Port = p
					d.log(fmt.Sprintf("Using the repository's Dockerfile (EXPOSE %d).", p))
				} else {
					d.log("Using the repository's Dockerfile (no EXPOSE line: the app will not be published on a host port).")
				}
			}
			d.step(StepDetect, "done", "dockerfile")
		}

		builtTag := fmt.Sprintf("akson/%s:latest", proxy.SanitizeName(req.Name))
		d.step(StepBuild, "running", builtTag)
		d.log(fmt.Sprintf("Building Docker image %s from source...", builtTag))
		if s.docker == nil {
			return nil, d.fail(StepBuild, http.StatusInternalServerError, "Docker is not available", fmt.Errorf("docker client is nil"), req.Name, builtTag, req.CommitHash, req.Branch)
		}
		_, err = s.docker.BuildImage(ctx, docker.BuildOptions{
			ContextDir: tempDir,
			Dockerfile: req.Dockerfile,
			Tag:        builtTag,
			OnLog:      d.log,
		})
		if err != nil {
			return nil, d.fail(StepBuild, http.StatusInternalServerError, "Docker build failed: "+err.Error(), err, req.Name, builtTag, req.CommitHash, req.Branch)
		}
		d.log(fmt.Sprintf("Successfully built image %s", builtTag))
		d.step(StepBuild, "done", builtTag)
		req.Image = builtTag

		// Remember where the image came from, so the Galaxy view can list the repo's
		// branches and redeploy another one. Credentials never go into labels.
		if req.Labels == nil {
			req.Labels = make(map[string]string)
		}
		req.Labels[LabelGitURL] = redact.URLCredentials(strings.TrimSpace(req.GitURL))
		req.Labels[LabelGitBranch] = req.Branch
		req.Labels[LabelGitCommit] = req.CommitHash
		if requested != "" && requested != "Dockerfile" {
			req.Labels[LabelGitDockerfile] = requested
		} else {
			delete(req.Labels, LabelGitDockerfile)
		}
	}

	if strings.TrimSpace(req.Name) == "" {
		return nil, &deployError{code: http.StatusBadRequest, msg: "Container name is required"}
	}
	if strings.TrimSpace(req.Image) == "" {
		return nil, &deployError{code: http.StatusBadRequest, msg: "Image name is required"}
	}
	if s.docker == nil {
		return nil, &deployError{code: http.StatusInternalServerError, msg: "Docker is not available"}
	}

	if req.NetworkName == "" {
		req.NetworkName = proxy.DefaultNetworkName
	}
	if s.networkMgr != nil {
		_, _ = s.networkMgr.EnsureNetwork(ctx)
	}

	// Traefik labels if a domain is given.
	if req.Labels == nil {
		req.Labels = make(map[string]string)
	}
	if req.Domain != "" {
		port := req.Port
		if port == 0 && len(req.Ports) > 0 {
			port = int(req.Ports[0].PrivatePort)
		}
		if port == 0 {
			port = 80
		}
		labels := proxy.GenerateLabels(proxy.RouteConfig{
			ServiceName: req.Name,
			Domain:      req.Domain,
			Port:        port,
			EnableTLS:   req.EnableTLS,
			PathPrefix:  req.PathPrefix,
		})
		for k, v := range labels {
			if _, exists := req.Labels[k]; !exists {
				req.Labels[k] = v
			}
		}
		// Labels only take effect when a Traefik container is running; say so honestly.
		if s.traefikRunning(ctx) {
			d.log(fmt.Sprintf("Traefik route added: %s", req.Domain))
		} else {
			d.log(fmt.Sprintf("Traefik is not running: the domain %s will not work yet. Use the localhost address below.", req.Domain))
		}
	}

	branch := req.Branch
	if branch == "" {
		branch = "main"
	}
	commit := req.CommitHash
	if commit == "" {
		commit = "latest"
	}

	// Pull (or use the image just built), create, network and start.
	isGit := strings.TrimSpace(req.GitURL) != ""
	if !isGit {
		d.step(StepPull, "running", req.Image)
	}
	d.step(StepStart, "running", req.Name)
	applyDefaultPublishIP(req.Ports, s.effectivePublishIP())
	result, err := s.docker.DeployContainer(ctx, req.DeployConfig)
	if err != nil {
		if !isGit {
			d.step(StepPull, "error", "")
		}
		return nil, d.fail(StepStart, http.StatusInternalServerError, "Container deploy failed: "+err.Error(), err, req.Name, req.Image, commit, branch)
	}
	for _, l := range result.Logs {
		d.log(l)
	}
	if !isGit {
		d.step(StepPull, "done", req.Image)
	}

	// "Started" is not "healthy": make sure the app stays up for a few seconds.
	d.step(StepStart, "running", "Uygulamanın ayakta kaldığı kontrol ediliyor")
	if crashErr := s.checkStaysUp(ctx, result.Container.ID, d); crashErr != nil {
		return nil, d.fail(StepStart, http.StatusInternalServerError, crashErr.Error(), crashErr, req.Name, req.Image, commit, branch)
	}
	d.step(StepStart, "done", shortCommit(result.Container.ID))
	result.Logs = d.logs

	if s.db != nil {
		portsJSON, _ := json.Marshal(req.Ports)
		envJSON, _ := json.Marshal(req.Env)
		traefikRule := req.Labels["traefik.http.routers."+proxy.SanitizeName(req.Name)+".rule"]
		_ = s.db.UpsertService(&db.Service{
			ID:          req.Name,
			Name:        req.Name,
			Image:       req.Image,
			Status:      "running",
			Ports:       string(portsJSON),
			Env:         string(envJSON),
			TraefikRule: traefikRule,
			CreatedAt:   d.now,
			UpdatedAt:   d.now,
		})
		_ = s.db.CreateDeployment(&db.Deployment{
			ID:          d.depID,
			ServiceID:   req.Name,
			CommitHash:  commit,
			Branch:      branch,
			Status:      "success",
			LogExcerpt:  strings.Join(d.logs, "\n"),
			TriggeredAt: d.now,
			CompletedAt: &d.now,
		})
	}

	d.step(StepReady, "done", accessURL(&result.Container))
	return result, nil
}

// defaultPublishIP is where new deployments publish their ports unless the request names
// an IP or AKSON_PUBLISH_IP says otherwise. Docker's own default (all interfaces) would
// expose every deployed app to the network and bypass host firewalls such as ufw.
const defaultPublishIP = "127.0.0.1"

// SetPublishIP sets the host IP new deployments publish ports on ("" = 127.0.0.1).
func (s *Server) SetPublishIP(ip string) {
	s.publishIP = ip
}

func (s *Server) effectivePublishIP() string {
	if s.publishIP == "" {
		return defaultPublishIP
	}
	return s.publishIP
}

// applyDefaultPublishIP fills in ip for every port mapping that does not name one.
func applyDefaultPublishIP(ports []docker.PortMapping, ip string) {
	for i := range ports {
		if ports[i].IP == "" {
			ports[i].IP = ip
		}
	}
}

// accessURL returns http://localhost:<port> for the first published port, or "".
func accessURL(c *docker.ContainerInfo) string {
	for _, p := range c.Ports {
		if p.PublicPort > 0 {
			return fmt.Sprintf("http://localhost:%d", p.PublicPort)
		}
	}
	return ""
}

func shortCommit(h string) string {
	if len(h) > 8 {
		return h[:8]
	}
	return h
}

// handleDeployContainer runs a deployment and answers once with the final JSON result.
func (s *Server) handleDeployContainer(w http.ResponseWriter, r *http.Request) {
	var req DeployContainerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid JSON payload: "+err.Error())
		return
	}
	result, err := s.runDeploy(r.Context(), req, nil)
	if err != nil {
		code := http.StatusInternalServerError
		if de, ok := err.(*deployError); ok {
			code = de.code
		}
		errorResponse(w, code, err.Error())
		return
	}
	respond(w, http.StatusCreated, result)
}

// handleDeployStream runs a deployment and streams its progress as NDJSON, one DeployEvent
// per line. The deployment keeps running if the client disconnects.
func (s *Server) handleDeployStream(w http.ResponseWriter, r *http.Request) {
	var req DeployContainerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid JSON payload: "+err.Error())
		return
	}
	s.streamDeployRun(w, r, req)
}

// streamDeployRun runs req through runDeploy and writes its events as NDJSON.
// The deployment keeps running (up to 15 minutes) if the client disconnects.
func (s *Server) streamDeployRun(w http.ResponseWriter, r *http.Request, req DeployContainerRequest) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		errorResponse(w, http.StatusInternalServerError, "Streaming not supported")
		return
	}

	w.Header().Set("Content-Type", "application/x-ndjson")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	var mu sync.Mutex
	gone := false
	enc := json.NewEncoder(w)
	emit := func(ev DeployEvent) {
		mu.Lock()
		defer mu.Unlock()
		if gone {
			return
		}
		if err := enc.Encode(ev); err != nil {
			gone = true // client went away; keep deploying anyway
			return
		}
		flusher.Flush()
	}

	ctx, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), 15*time.Minute)
	defer cancel()

	result, err := s.runDeploy(ctx, req, emit)
	if err != nil {
		emit(DeployEvent{Type: "error", Message: err.Error()})
		return
	}
	emit(DeployEvent{Type: "result", Container: &result.Container, URL: accessURL(&result.Container)})
}

// stayUpWindow is how long a new container must keep running to count as started.
var stayUpWindow = 5 * time.Second

// checkStaysUp watches a freshly started container for stayUpWindow. If it exits or
// restarts, its last log lines are added to the deploy log, it is stopped (so it does not
// restart forever) and an error is returned.
func (s *Server) checkStaysUp(ctx context.Context, id string, d *deployRun) error {
	deadline := time.Now().Add(stayUpWindow)
	for {
		info, err := s.docker.InspectContainer(ctx, id)
		if err != nil {
			return fmt.Errorf("could not check the container: %w", err)
		}
		st := info.State
		if st == nil || !st.Running || st.Restarting || info.RestartCount > 0 {
			exit := 0
			if st != nil {
				exit = st.ExitCode
			}
			if entries, lerr := s.docker.GetContainerLogs(ctx, id, "20"); lerr == nil {
				d.log("--- application output ---")
				for _, e := range entries {
					d.log(e.Message)
				}
			}
			timeout := 5
			_ = s.docker.StopContainer(ctx, id, &timeout)
			return fmt.Errorf("Application exited right after starting (exit code %d). See the application output in the logs.", exit)
		}
		if time.Now().After(deadline) {
			return nil
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(time.Second):
		}
	}
}
