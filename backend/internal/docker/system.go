package docker

import (
	"context"
	"fmt"

	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/image"
)

// EngineInfo is the part of the Docker daemon version shown on the settings page.
type EngineInfo struct {
	Version    string `json:"version"`
	APIVersion string `json:"api_version"`
	OS         string `json:"os"`
	Arch       string `json:"arch"`
}

// UnusedImages describes dangling images: old builds whose tag moved to a newer image.
type UnusedImages struct {
	Count     int   `json:"count"`
	SizeBytes int64 `json:"size_bytes"`
}

// PruneResult is what an image cleanup removed.
type PruneResult struct {
	Deleted        int    `json:"deleted"`
	SpaceReclaimed uint64 `json:"space_reclaimed"`
}

func danglingFilter() filters.Args {
	return filters.NewArgs(filters.Arg("dangling", "true"))
}

// Engine returns the Docker daemon version.
func (c *Client) Engine(ctx context.Context) (EngineInfo, error) {
	v, err := c.cli.ServerVersion(ctx)
	if err != nil {
		return EngineInfo{}, fmt.Errorf("docker version: %w", err)
	}
	return EngineInfo{Version: v.Version, APIVersion: v.APIVersion, OS: v.Os, Arch: v.Arch}, nil
}

// UnusedImages counts dangling images and their total size.
func (c *Client) UnusedImages(ctx context.Context) (UnusedImages, error) {
	list, err := c.cli.ImageList(ctx, image.ListOptions{Filters: danglingFilter()})
	if err != nil {
		return UnusedImages{}, fmt.Errorf("list images: %w", err)
	}
	out := UnusedImages{Count: len(list)}
	for _, img := range list {
		out.SizeBytes += img.Size
	}
	return out, nil
}

// PruneUnusedImages removes dangling images. Tagged images and images used by containers are kept.
func (c *Client) PruneUnusedImages(ctx context.Context) (PruneResult, error) {
	report, err := c.cli.ImagesPrune(ctx, danglingFilter())
	if err != nil {
		return PruneResult{}, fmt.Errorf("prune images: %w", err)
	}
	deleted := 0
	for _, d := range report.ImagesDeleted {
		if d.Deleted != "" {
			deleted++
		}
	}
	return PruneResult{Deleted: deleted, SpaceReclaimed: report.SpaceReclaimed}, nil
}
