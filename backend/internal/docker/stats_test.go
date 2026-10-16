package docker

import (
	"context"
	"testing"
	"time"

	"github.com/docker/docker/api/types/container"
)

func TestCalculateStats_Math(t *testing.T) {
	now := time.Now().UTC()
	raw := &container.StatsResponse{
		Stats: container.Stats{
			Read: now,
			CPUStats: container.CPUStats{
				CPUUsage: container.CPUUsage{
					TotalUsage: 200000000, // 200ms
				},
				SystemUsage: 2000000000, // 2s
				OnlineCPUs:  2,
			},
			PreCPUStats: container.CPUStats{
				CPUUsage: container.CPUUsage{
					TotalUsage: 100000000, // 100ms
				},
				SystemUsage: 1000000000, // 1s
				OnlineCPUs:  2,
			},
			MemoryStats: container.MemoryStats{
				Usage: 512 * 1024 * 1024, // 512 MB
				Limit: 1024 * 1024 * 1024, // 1024 MB
				Stats: map[string]uint64{
					"cache": 12 * 1024 * 1024, // 12 MB cache
				},
			},
			BlkioStats: container.BlkioStats{
				IoServiceBytesRecursive: []container.BlkioStatEntry{
					{Op: "Read", Value: 4096},
					{Op: "Write", Value: 8192},
				},
			},
		},
		Networks: map[string]container.NetworkStats{
			"eth0": {
				RxBytes: 15000,
				TxBytes: 25000,
			},
		},
	}

	stats := CalculateStats("test-container", raw)

	// CPU calculation:
	// cpuDelta = 100,000,000
	// systemDelta = 1,000,000,000
	// onlineCPUs = 2
	// expected = (100,000,000 / 1,000,000,000) * 2 * 100 = 20.00%
	if stats.CPUPercent != 20.00 {
		t.Errorf("Expected CPUPercent 20.00, got: %f", stats.CPUPercent)
	}

	// Memory calculation:
	// usage = 512MB - 12MB = 500MB
	// limit = 1024MB
	// expected = (500 / 1024) * 100 = 48.83%
	expectedUsage := uint64((512 - 12) * 1024 * 1024)
	if stats.MemoryUsage != expectedUsage {
		t.Errorf("Expected MemoryUsage %d, got: %d", expectedUsage, stats.MemoryUsage)
	}
	if stats.MemoryPercent < 48.80 || stats.MemoryPercent > 48.85 {
		t.Errorf("Expected MemoryPercent ~48.83, got: %f", stats.MemoryPercent)
	}

	// Network I/O
	if stats.NetRxBytes != 15000 || stats.NetTxBytes != 25000 {
		t.Errorf("Unexpected network bytes: rx=%d, tx=%d", stats.NetRxBytes, stats.NetTxBytes)
	}

	// Block I/O
	if stats.BlockReadBytes != 4096 || stats.BlockWriteBytes != 8192 {
		t.Errorf("Unexpected block I/O bytes: read=%d, write=%d", stats.BlockReadBytes, stats.BlockWriteBytes)
	}
}

func TestLiveContainerStats(t *testing.T) {
	client, err := NewClient()
	if err != nil {
		t.Skipf("Skipping live stats: %v", err)
	}
	defer client.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	containers, err := client.ListContainers(ctx, false)
	if err != nil || len(containers) == 0 {
		t.Skipf("No running containers available for live stats test")
	}

	target := containers[0]
	stats, err := client.GetContainerStats(ctx, target.ID)
	if err != nil {
		t.Fatalf("GetContainerStats failed on container %s: %v", target.ID[:12], err)
	}

	t.Logf("Live stats for container %s (%s): CPU=%.2f%%, RAM=%dMB (%.2f%%)",
		target.Name, target.ID[:12], stats.CPUPercent, stats.MemoryUsage/(1024*1024), stats.MemoryPercent)

	if stats.MemoryLimit == 0 {
		t.Errorf("Expected non-zero memory limit for container %s", target.ID)
	}
}
