package docker

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"time"

	"github.com/docker/docker/api/types/container"
)

// ContainerStats holds calculated, user-friendly real-time telemetry metrics.
type ContainerStats struct {
	ContainerID     string    `json:"container_id"`
	CPUPercent      float64   `json:"cpu_percent"`
	MemoryUsage     uint64    `json:"memory_usage"`      // in bytes
	MemoryLimit     uint64    `json:"memory_limit"`      // in bytes
	MemoryPercent   float64   `json:"memory_percent"`
	NetRxBytes      uint64    `json:"net_rx_bytes"`      // total bytes received
	NetTxBytes      uint64    `json:"net_tx_bytes"`      // total bytes transmitted
	BlockReadBytes  uint64    `json:"block_read_bytes"`  // total disk read
	BlockWriteBytes uint64    `json:"block_write_bytes"` // total disk written
	ReadAt          time.Time `json:"read_at"`
}

// CalculateStats parses raw Docker StatsResponse into normalized ContainerStats.
func CalculateStats(containerID string, raw *container.StatsResponse) ContainerStats {
	stats := ContainerStats{
		ContainerID: containerID,
		ReadAt:      raw.Read,
	}

	// 1. Calculate CPU Percent
	cpuDelta := float64(raw.CPUStats.CPUUsage.TotalUsage) - float64(raw.PreCPUStats.CPUUsage.TotalUsage)
	systemDelta := float64(raw.CPUStats.SystemUsage) - float64(raw.PreCPUStats.SystemUsage)
	onlineCPUs := float64(raw.CPUStats.OnlineCPUs)
	if onlineCPUs == 0 {
		onlineCPUs = float64(len(raw.CPUStats.CPUUsage.PercpuUsage))
	}
	if onlineCPUs == 0 {
		onlineCPUs = 1.0
	}

	if systemDelta > 0.0 && cpuDelta > 0.0 {
		stats.CPUPercent = (cpuDelta / systemDelta) * onlineCPUs * 100.0
		stats.CPUPercent = math.Round(stats.CPUPercent*100) / 100
	}

	// 2. Calculate Memory
	usage := raw.MemoryStats.Usage
	// Linux cgroup cache accounting
	if cache, ok := raw.MemoryStats.Stats["inactive_file"]; ok && usage > cache {
		usage -= cache
	} else if cache, ok := raw.MemoryStats.Stats["cache"]; ok && usage > cache {
		usage -= cache
	}

	stats.MemoryUsage = usage
	stats.MemoryLimit = raw.MemoryStats.Limit
	if stats.MemoryLimit > 0 {
		stats.MemoryPercent = (float64(stats.MemoryUsage) / float64(stats.MemoryLimit)) * 100.0
		stats.MemoryPercent = math.Round(stats.MemoryPercent*100) / 100
	}

	// 3. Calculate Network I/O
	for _, net := range raw.Networks {
		stats.NetRxBytes += net.RxBytes
		stats.NetTxBytes += net.TxBytes
	}

	// 4. Calculate Block I/O
	for _, bio := range raw.BlkioStats.IoServiceBytesRecursive {
		switch bio.Op {
		case "Read", "read":
			stats.BlockReadBytes += bio.Value
		case "Write", "write":
			stats.BlockWriteBytes += bio.Value
		}
	}

	return stats
}

// GetContainerStats retrieves a single snapshot of container stats.
func (c *Client) GetContainerStats(ctx context.Context, containerID string) (*ContainerStats, error) {
	resp, err := c.cli.ContainerStatsOneShot(ctx, containerID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch stats for container %s: %w", containerID, err)
	}
	defer resp.Body.Close()

	var raw container.StatsResponse
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, fmt.Errorf("failed to decode stats for container %s: %w", containerID, err)
	}

	stats := CalculateStats(containerID, &raw)
	return &stats, nil
}

// StreamContainerStats opens a continuous stream of stats for a container.
// The stats channel emits updates; the error channel will emit non-EOF errors when the stream closes.
func (c *Client) StreamContainerStats(ctx context.Context, containerID string) (<-chan ContainerStats, <-chan error) {
	statsChan := make(chan ContainerStats)
	errChan := make(chan error, 1)

	go func() {
		defer close(statsChan)
		defer close(errChan)

		resp, err := c.cli.ContainerStats(ctx, containerID, true)
		if err != nil {
			errChan <- fmt.Errorf("failed to open stats stream for %s: %w", containerID, err)
			return
		}
		defer resp.Body.Close()

		decoder := json.NewDecoder(resp.Body)
		for {
			select {
			case <-ctx.Done():
				return
			default:
				var raw container.StatsResponse
				if err := decoder.Decode(&raw); err != nil {
					if err != io.EOF && ctx.Err() == nil {
						errChan <- fmt.Errorf("error reading stats stream: %w", err)
					}
					return
				}

				stats := CalculateStats(containerID, &raw)
				select {
				case statsChan <- stats:
				case <-ctx.Done():
					return
				}
			}
		}
	}()

	return statsChan, errChan
}
