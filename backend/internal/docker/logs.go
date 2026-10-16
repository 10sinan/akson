package docker

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/pkg/stdcopy"
)

// LogEntry represents an individual stdout or stderr line emitted by a container.
type LogEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Stream    string    `json:"stream"` // "stdout" or "stderr"
	Message   string    `json:"message"`
}

// parseLogLine extracts the timestamp prefix added by Docker and returns the clean message.
func parseLogLine(rawLine string, defaultStream string) LogEntry {
	trimmed := strings.TrimRight(rawLine, "\r\n")
	entry := LogEntry{
		Timestamp: time.Now().UTC(),
		Stream:    defaultStream,
		Message:   trimmed,
	}

	parts := strings.SplitN(trimmed, " ", 2)
	if len(parts) == 2 {
		if t, err := time.Parse(time.RFC3339Nano, parts[0]); err == nil {
			entry.Timestamp = t
			entry.Message = parts[1]
		}
	}

	return entry
}

// GetContainerLogs returns recent logs up to the requested tail limit (e.g. "100").
func (c *Client) GetContainerLogs(ctx context.Context, containerID string, tail string) ([]LogEntry, error) {
	if tail == "" {
		tail = "100"
	}

	opts := container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Timestamps: true,
		Follow:     false,
		Tail:       tail,
	}

	reader, err := c.cli.ContainerLogs(ctx, containerID, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch logs for container %s: %w", containerID, err)
	}
	defer reader.Close()

	inspect, err := c.InspectContainer(ctx, containerID)
	if err != nil {
		return nil, err
	}

	var entries []LogEntry

	if inspect.Config != nil && inspect.Config.Tty {
		scanner := bufio.NewScanner(reader)
		for scanner.Scan() {
			entries = append(entries, parseLogLine(scanner.Text(), "stdout"))
		}
		return entries, scanner.Err()
	}

	// For non-TTY containers, demultiplex stdout & stderr using stdcopy
	stdoutPipeReader, stdoutPipeWriter := io.Pipe()
	stderrPipeReader, stderrPipeWriter := io.Pipe()

	done := make(chan struct{})
	go func() {
		defer close(done)
		scanner := bufio.NewScanner(stdoutPipeReader)
		for scanner.Scan() {
			entries = append(entries, parseLogLine(scanner.Text(), "stdout"))
		}
	}()

	errDone := make(chan struct{})
	go func() {
		defer close(errDone)
		scanner := bufio.NewScanner(stderrPipeReader)
		for scanner.Scan() {
			entries = append(entries, parseLogLine(scanner.Text(), "stderr"))
		}
	}()

	_, copyErr := stdcopy.StdCopy(stdoutPipeWriter, stderrPipeWriter, reader)
	stdoutPipeWriter.Close()
	stderrPipeWriter.Close()
	<-done
	<-errDone

	if copyErr != nil && copyErr != io.EOF {
		return nil, fmt.Errorf("demuxing logs error: %w", copyErr)
	}

	return entries, nil
}

// StreamContainerLogs streams container logs in real time over channels.
func (c *Client) StreamContainerLogs(ctx context.Context, containerID string, tail string, follow bool) (<-chan LogEntry, <-chan error) {
	logsChan := make(chan LogEntry, 50)
	errChan := make(chan error, 1)

	if tail == "" {
		tail = "100"
	}

	go func() {
		defer close(logsChan)
		defer close(errChan)

		inspect, err := c.InspectContainer(ctx, containerID)
		if err != nil {
			errChan <- err
			return
		}

		opts := container.LogsOptions{
			ShowStdout: true,
			ShowStderr: true,
			Timestamps: true,
			Follow:     follow,
			Tail:       tail,
		}

		reader, err := c.cli.ContainerLogs(ctx, containerID, opts)
		if err != nil {
			errChan <- fmt.Errorf("failed to open logs stream: %w", err)
			return
		}
		defer reader.Close()

		if inspect.Config != nil && inspect.Config.Tty {
			scanner := bufio.NewScanner(reader)
			for scanner.Scan() {
				select {
				case <-ctx.Done():
					return
				case logsChan <- parseLogLine(scanner.Text(), "stdout"):
				}
			}
			if err := scanner.Err(); err != nil && ctx.Err() == nil {
				errChan <- err
			}
			return
		}

		// Non-TTY demuxing
		stdoutR, stdoutW := io.Pipe()
		stderrR, stderrW := io.Pipe()

		go func() {
			defer stdoutR.Close()
			scanner := bufio.NewScanner(stdoutR)
			for scanner.Scan() {
				select {
				case <-ctx.Done():
					return
				case logsChan <- parseLogLine(scanner.Text(), "stdout"):
				}
			}
		}()

		go func() {
			defer stderrR.Close()
			scanner := bufio.NewScanner(stderrR)
			for scanner.Scan() {
				select {
				case <-ctx.Done():
					return
				case logsChan <- parseLogLine(scanner.Text(), "stderr"):
				}
			}
		}()

		_, copyErr := stdcopy.StdCopy(stdoutW, stderrW, reader)
		stdoutW.Close()
		stderrW.Close()

		if copyErr != nil && copyErr != io.EOF && ctx.Err() == nil {
			errChan <- copyErr
		}
	}()

	return logsChan, errChan
}
