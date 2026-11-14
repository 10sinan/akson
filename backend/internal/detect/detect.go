// Package detect generates a Dockerfile for projects that do not ship one.
package detect

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// GeneratedDockerfileName is the file written into the build context.
const GeneratedDockerfileName = "Dockerfile.akson"

// Plan describes a generated build for a detected project type.
type Plan struct {
	Kind       string // node, python, go, static
	Dockerfile string // file content
	Port       int    // port the app is expected to listen on
}

func exists(dir, name string) bool {
	_, err := os.Stat(filepath.Join(dir, name))
	return err == nil
}

// HasDockerfile reports whether the project already contains a Dockerfile.
func HasDockerfile(dir string) bool { return exists(dir, "Dockerfile") }

// Detect inspects dir and returns a build plan, or an error explaining why the project
// type is not supported.
func Detect(dir string) (*Plan, error) {
	switch {
	case exists(dir, "package.json"):
		return detectNode(dir)
	case exists(dir, "requirements.txt"):
		return detectPython(dir)
	case exists(dir, "go.mod"):
		return detectGo(dir)
	case exists(dir, "index.html"):
		return &Plan{
			Kind: "static",
			Port: 80,
			Dockerfile: `FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
`,
		}, nil
	}
	return nil, fmt.Errorf("no Dockerfile found and the project type could not be detected " +
		"(supported: Node.js with package.json, Python with requirements.txt, Go with go.mod, static sites with index.html)")
}

func detectNode(dir string) (*Plan, error) {
	data, err := os.ReadFile(filepath.Join(dir, "package.json"))
	if err != nil {
		return nil, err
	}
	var pkg struct {
		Main    string            `json:"main"`
		Scripts map[string]string `json:"scripts"`
	}
	if err := json.Unmarshal(data, &pkg); err != nil {
		return nil, fmt.Errorf("package.json is not valid JSON: %w", err)
	}

	var start string
	switch {
	case pkg.Scripts["start"] != "":
		start = `["npm", "start"]`
	case pkg.Main != "":
		start = fmt.Sprintf(`["node", %q]`, pkg.Main)
	case exists(dir, "index.js"):
		start = `["node", "index.js"]`
	case pkg.Scripts["build"] != "":
		return nodeStaticPlan(dir, pkg.Scripts["build"]), nil
	default:
		return nil, fmt.Errorf("Node.js project has no \"start\" or \"build\" script and no entry file; add a \"start\" script to package.json")
	}

	install := "npm install"
	if exists(dir, "package-lock.json") {
		install = "npm ci"
	}
	build := ""
	if pkg.Scripts["build"] != "" {
		build = "RUN npm run build\n"
	}

	return &Plan{
		Kind: "node",
		Port: 3000,
		Dockerfile: fmt.Sprintf(`FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN %s
COPY . .
%sENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD %s
`, install, build, start),
	}, nil
}

// nodeStaticPlan builds a front-end project (Vite, Create React App, ...) and serves the
// output folder with nginx.
func nodeStaticPlan(dir, buildScript string) *Plan {
	install := "npm install"
	if exists(dir, "package-lock.json") {
		install = "npm ci"
	}
	out := "dist" // Vite, Vue CLI, Parcel
	if strings.Contains(buildScript, "react-scripts") {
		out = "build" // Create React App
	}
	return &Plan{
		Kind: "node-static",
		Port: 80,
		Dockerfile: fmt.Sprintf(`FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN %s
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/%s /usr/share/nginx/html
EXPOSE 80
`, install, out),
	}
}

func detectPython(dir string) (*Plan, error) {
	entry := ""
	for _, c := range []string{"main.py", "app.py", "server.py", "run.py"} {
		if exists(dir, c) {
			entry = c
			break
		}
	}
	if entry == "" {
		return nil, fmt.Errorf("Python project has no main.py, app.py, server.py or run.py entry file")
	}
	reqs, _ := os.ReadFile(filepath.Join(dir, "requirements.txt"))
	lowerReqs := strings.ToLower(string(reqs))
	module := strings.TrimSuffix(entry, ".py")
	cmd := fmt.Sprintf(`["python", %q]`, entry)
	switch {
	case strings.Contains(lowerReqs, "fastapi") || strings.Contains(lowerReqs, "uvicorn"):
		cmd = fmt.Sprintf(`["sh", "-c", "pip show uvicorn >/dev/null 2>&1 || pip install uvicorn; exec uvicorn %s:app --host 0.0.0.0 --port 8000"]`, module)
	case strings.Contains(lowerReqs, "flask"):
		cmd = fmt.Sprintf(`["flask", "--app", %q, "run", "--host", "0.0.0.0", "--port", "8000"]`, module)
	}
	return &Plan{
		Kind: "python",
		Port: 8000,
		Dockerfile: fmt.Sprintf(`FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PORT=8000
EXPOSE 8000
CMD %s
`, cmd),
	}, nil
}

func detectGo(dir string) (*Plan, error) {
	data, _ := os.ReadFile(filepath.Join(dir, "go.mod"))
	goVersion := "1.22"
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "go ") {
			v := strings.Fields(line)[1]
			if parts := strings.Split(v, "."); len(parts) >= 2 {
				goVersion = parts[0] + "." + parts[1]
			}
			break
		}
	}
	return &Plan{
		Kind: "go",
		Port: 8080,
		Dockerfile: fmt.Sprintf(`FROM golang:%s-alpine AS build
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app .

FROM alpine:3.20
COPY --from=build /app /app
ENV PORT=8080
EXPOSE 8080
CMD ["/app"]
`, goVersion),
	}, nil
}

// Write stores the plan's Dockerfile in dir and returns its name.
func Write(dir string, p *Plan) (string, error) {
	if err := os.WriteFile(filepath.Join(dir, GeneratedDockerfileName), []byte(p.Dockerfile), 0o644); err != nil {
		return "", err
	}
	return GeneratedDockerfileName, nil
}
