package docker

import (
	"archive/tar"
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/docker/docker/api/types"
)

// BuildOptions defines the configuration for building a Docker image.
type BuildOptions struct {
	ContextDir string            `json:"context_dir"`
	Dockerfile string            `json:"dockerfile"` // relative to ContextDir, defaults to "Dockerfile"
	Tag        string            `json:"tag"`        // e.g. "akson/my-app:latest"
	BuildArgs  map[string]string `json:"build_args"`
}

// BuildResult holds the output tag and build log lines.
type BuildResult struct {
	Tag  string   `json:"tag"`
	Logs []string `json:"logs"`
}

type buildProgressLine struct {
	Stream      string `json:"stream"`
	Error       string `json:"error"`
	ErrorDetail struct {
		Message string `json:"message"`
	} `json:"errorDetail"`
}

// CreateTarStream packages a directory into an in-memory tar archive, ignoring .git directory.
func CreateTarStream(srcDir string) (io.Reader, error) {
	buf := new(bytes.Buffer)
	tw := tar.NewWriter(buf)
	defer tw.Close()

	srcDir = filepath.Clean(srcDir)

	err := filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(srcDir, path)
		if err != nil {
			return err
		}

		// Skip root directory
		if relPath == "." {
			return nil
		}

		// Skip .git directory and contents
		if relPath == ".git" || strings.HasPrefix(relPath, ".git"+string(filepath.Separator)) {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// Create tar header
		header, err := tar.FileInfoHeader(info, info.Name())
		if err != nil {
			return fmt.Errorf("failed to create tar header for %s: %w", relPath, err)
		}

		// Tar uses forward slashes
		header.Name = filepath.ToSlash(relPath)

		if err := tw.WriteHeader(header); err != nil {
			return fmt.Errorf("failed to write tar header for %s: %w", relPath, err)
		}

		// If regular file, write contents
		if info.Mode().IsRegular() {
			file, err := os.Open(path)
			if err != nil {
				return fmt.Errorf("failed to open file %s: %w", path, err)
			}
			defer file.Close()

			if _, err := io.Copy(tw, file); err != nil {
				return fmt.Errorf("failed to write file %s to tar: %w", path, err)
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return buf, nil
}

// BuildImage compiles a Docker image from a local context directory using Docker Engine API.
func (c *Client) BuildImage(ctx context.Context, opts BuildOptions) (*BuildResult, error) {
	if strings.TrimSpace(opts.ContextDir) == "" {
		return nil, fmt.Errorf("context directory is required")
	}
	if strings.TrimSpace(opts.Tag) == "" {
		return nil, fmt.Errorf("image tag is required")
	}

	dockerfile := strings.TrimSpace(opts.Dockerfile)
	if dockerfile == "" {
		dockerfile = "Dockerfile"
	}

	// Verify Dockerfile exists in contextDir
	dockerfilePath := filepath.Join(opts.ContextDir, dockerfile)
	if _, err := os.Stat(dockerfilePath); err != nil {
		return nil, fmt.Errorf("Dockerfile not found at %s: %w", dockerfilePath, err)
	}

	tarStream, err := CreateTarStream(opts.ContextDir)
	if err != nil {
		return nil, fmt.Errorf("failed to create tar context: %w", err)
	}

	// Convert buildArgs
	var buildArgsMap map[string]*string
	if len(opts.BuildArgs) > 0 {
		buildArgsMap = make(map[string]*string)
		for k, v := range opts.BuildArgs {
			val := v
			buildArgsMap[k] = &val
		}
	}

	buildOpts := types.ImageBuildOptions{
		Tags:        []string{opts.Tag},
		Dockerfile:  dockerfile,
		Remove:      true,
		ForceRemove: true,
		BuildArgs:   buildArgsMap,
	}

	resp, err := c.cli.ImageBuild(ctx, tarStream, buildOpts)
	if err != nil {
		return nil, fmt.Errorf("failed to initiate docker image build: %w", err)
	}
	defer resp.Body.Close()

	var logs []string
	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Bytes()
		var p buildProgressLine
		if err := json.Unmarshal(line, &p); err == nil {
			if p.Error != "" {
				return nil, fmt.Errorf("docker build failed: %s", p.Error)
			}
			if p.Stream != "" {
				trimmed := strings.TrimRight(p.Stream, "\r\n")
				if trimmed != "" {
					logs = append(logs, trimmed)
				}
			}
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading build logs: %w", err)
	}

	return &BuildResult{
		Tag:  opts.Tag,
		Logs: logs,
	}, nil
}
