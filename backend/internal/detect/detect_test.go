package detect

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func project(t *testing.T, files map[string]string) string {
	t.Helper()
	dir := t.TempDir()
	for name, content := range files {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	return dir
}

func TestDetect(t *testing.T) {
	cases := []struct {
		name     string
		files    map[string]string
		wantKind string
		contains string
	}{
		{"node start script", map[string]string{"package.json": `{"scripts":{"start":"node a.js"}}`}, "node", `CMD ["npm", "start"]`},
		{"node lockfile uses ci", map[string]string{"package.json": `{"scripts":{"start":"x"}}`, "package-lock.json": "{}"}, "node", "RUN npm ci"},
		{"node build script", map[string]string{"package.json": `{"scripts":{"start":"x","build":"y"}}`}, "node", "RUN npm run build"},
		{"node sets PORT", map[string]string{"package.json": `{"scripts":{"start":"x"}}`}, "node", "ENV PORT=3000"},
		{"node main field", map[string]string{"package.json": `{"main":"server.js"}`}, "node", `CMD ["node", "server.js"]`},
		{"python", map[string]string{"requirements.txt": "flask", "app.py": ""}, "python", `CMD ["python", "app.py"]`},
		{"go", map[string]string{"go.mod": "module x\n\ngo 1.23.4\n"}, "go", "golang:1.23-alpine"},
		{"static", map[string]string{"index.html": "<html>"}, "static", "nginx:alpine"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			p, err := Detect(project(t, c.files))
			if err != nil {
				t.Fatal(err)
			}
			if p.Kind != c.wantKind || !strings.Contains(p.Dockerfile, c.contains) {
				t.Fatalf("kind=%s, dockerfile:\n%s", p.Kind, p.Dockerfile)
			}
		})
	}
}

func TestDetectErrors(t *testing.T) {
	for name, files := range map[string]map[string]string{
		"empty":           {},
		"node no start":   {"package.json": `{"name":"x"}`},
		"node bad json":   {"package.json": `{`},
		"python no entry": {"requirements.txt": "flask"},
	} {
		if _, err := Detect(project(t, files)); err == nil {
			t.Errorf("%s: expected an error", name)
		}
	}
}

func TestHasDockerfile(t *testing.T) {
	if !HasDockerfile(project(t, map[string]string{"Dockerfile": "FROM x"})) {
		t.Fatal("expected Dockerfile to be found")
	}
	if HasDockerfile(project(t, nil)) {
		t.Fatal("expected no Dockerfile")
	}
}
