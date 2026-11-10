package docker

import (
	"context"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/go-connections/nat"
)

// DeployConfig defines all parameters needed to pull, configure, create, and start a container.
type DeployConfig struct {
	Name          string            `json:"name"`
	Image         string            `json:"image"`
	Ports         []PortMapping     `json:"ports"`
	Env           map[string]string `json:"env"`
	Labels        map[string]string `json:"labels"`
	MemoryLimitMB int64             `json:"memory_limit_mb"`
	CPULimit      float64           `json:"cpu_limit"`
	NetworkName   string            `json:"network_name"`
	RestartPolicy string            `json:"restart_policy"`
}

// DeployResult represents the created container and deployment logs.
type DeployResult struct {
	Container ContainerInfo `json:"container"`
	Logs      []string      `json:"logs"`
}

// DeployContainer pulls the requested image (or uses cached local image), creates the container
// with specified ports, cgroups limits, network and environment variables, and starts it.
func (c *Client) DeployContainer(ctx context.Context, cfg DeployConfig) (*DeployResult, error) {
	if cfg.Image == "" {
		return nil, fmt.Errorf("image is required")
	}
	if cfg.Name == "" {
		return nil, fmt.Errorf("container name is required")
	}

	var deployLogs []string

	// Ensure tag
	imageRef := cfg.Image
	if !strings.Contains(imageRef, ":") {
		imageRef += ":latest"
	}

	// 1. Pull Image (with graceful fallback if image is already present locally)
	deployLogs = append(deployLogs, fmt.Sprintf("Pulling image %s...", imageRef))
	pullReader, err := c.cli.ImagePull(ctx, imageRef, image.PullOptions{})
	if err != nil {
		// Check if image exists locally before failing
		if _, _, inspectErr := c.cli.ImageInspectWithRaw(ctx, imageRef); inspectErr == nil {
			deployLogs = append(deployLogs, fmt.Sprintf("Using cached local image %s (pull fallback: %v)", imageRef, err))
		} else {
			return nil, fmt.Errorf("failed to pull image %s: %w", imageRef, err)
		}
	} else {
		defer pullReader.Close()
		_, _ = io.Copy(io.Discard, pullReader)
		deployLogs = append(deployLogs, fmt.Sprintf("Image %s ready", imageRef))
	}

	// 2. Prepare Port Mappings
	exposedPorts := nat.PortSet{}
	portBindings := nat.PortMap{}
	for _, p := range cfg.Ports {
		proto := strings.ToLower(p.Type)
		if proto == "" {
			proto = "tcp"
		}
		cPort := nat.Port(fmt.Sprintf("%d/%s", p.PrivatePort, proto))
		exposedPorts[cPort] = struct{}{}

		if p.PublicPort > 0 {
			binding := nat.PortBinding{
				HostIP:   p.IP,
				HostPort: fmt.Sprintf("%d", p.PublicPort),
			}
			portBindings[cPort] = append(portBindings[cPort], binding)
		}
	}

	// 3. Prepare Environment Variables
	var envList []string
	for k, v := range cfg.Env {
		envList = append(envList, fmt.Sprintf("%s=%s", k, v))
	}

	// 4. Prepare Labels (standard Akson labels)
	labels := make(map[string]string)
	for k, v := range cfg.Labels {
		labels[k] = v
	}
	labels["akson.managed"] = "true"
	labels["akson.service"] = cfg.Name

	// 5. Container Config
	containerConfig := &container.Config{
		Image:        imageRef,
		Env:          envList,
		ExposedPorts: exposedPorts,
		Labels:       labels,
	}

	// 6. Host Config (cgroups limits, port bindings, restart policy)
	resources := container.Resources{}
	if cfg.MemoryLimitMB > 0 {
		resources.Memory = cfg.MemoryLimitMB * 1024 * 1024
		deployLogs = append(deployLogs, fmt.Sprintf("Memory limit set to %d MB", cfg.MemoryLimitMB))
	}
	if cfg.CPULimit > 0 {
		resources.NanoCPUs = int64(cfg.CPULimit * 1e9)
		deployLogs = append(deployLogs, fmt.Sprintf("CPU limit set to %.2f cores", cfg.CPULimit))
	}

	restartMode := container.RestartPolicyMode(cfg.RestartPolicy)
	if restartMode == "" {
		restartMode = container.RestartPolicyUnlessStopped
	}

	hostConfig := &container.HostConfig{
		PortBindings:  portBindings,
		Resources:     resources,
		RestartPolicy: container.RestartPolicy{Name: restartMode},
	}

	// 7. Network Config
	var netConfig *network.NetworkingConfig
	if cfg.NetworkName != "" {
		netConfig = &network.NetworkingConfig{
			EndpointsConfig: map[string]*network.EndpointSettings{
				cfg.NetworkName: {},
			},
		}
		deployLogs = append(deployLogs, fmt.Sprintf("Assigned to network %s", cfg.NetworkName))
	}

	// 8. Create Container
	deployLogs = append(deployLogs, fmt.Sprintf("Creating container %s...", cfg.Name))
	createResp, err := c.cli.ContainerCreate(ctx, containerConfig, hostConfig, netConfig, nil, cfg.Name)
	if err != nil {
		return nil, fmt.Errorf("failed to create container %s: %w", cfg.Name, err)
	}
	deployLogs = append(deployLogs, fmt.Sprintf("Container created with ID %s", createResp.ID[:12]))

	// 9. Start Container
	deployLogs = append(deployLogs, fmt.Sprintf("Starting container %s...", cfg.Name))
	if err := c.cli.ContainerStart(ctx, createResp.ID, container.StartOptions{}); err != nil {
		// Remove the created-but-never-started container so a retry with the same name works.
		// Use a fresh context: the request context may already be cancelled.
		rmCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		if rmErr := c.cli.ContainerRemove(rmCtx, createResp.ID, container.RemoveOptions{Force: true}); rmErr != nil {
			return nil, fmt.Errorf("failed to start container %s: %w (cleanup also failed: %v)", cfg.Name, err, rmErr)
		}
		return nil, fmt.Errorf("failed to start container %s: %w", cfg.Name, err)
	}
	deployLogs = append(deployLogs, fmt.Sprintf("Container %s is running", cfg.Name))

	// 10. Inspect final container state
	inspect, err := c.InspectContainer(ctx, createResp.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect deployed container: %w", err)
	}

	// Build standardized ContainerInfo
	cPorts := make([]PortMapping, 0)
	if inspect.NetworkSettings != nil {
		for port, bindings := range inspect.NetworkSettings.Ports {
			for _, b := range bindings {
				hPort, _ := strconv.Atoi(b.HostPort)
				cPorts = append(cPorts, PortMapping{
					IP:          b.HostIP,
					PrivatePort: uint16(port.Int()),
					PublicPort:  uint16(hPort),
					Type:        port.Proto(),
				})
			}
		}
	}

	var createdUnix int64
	if t, err := time.Parse(time.RFC3339Nano, inspect.Created); err == nil {
		createdUnix = t.Unix()
	} else if t, err := time.Parse(time.RFC3339, inspect.Created); err == nil {
		createdUnix = t.Unix()
	}

	statusStr := inspect.State.Status
	if inspect.State.Running {
		statusStr = fmt.Sprintf("Up (started at %s)", inspect.State.StartedAt)
	}

	result := &DeployResult{
		Container: ContainerInfo{
			ID:      inspect.ID,
			Name:    cfg.Name,
			Image:   imageRef,
			State:   inspect.State.Status,
			Status:  statusStr,
			Created: createdUnix,
			Ports:   cPorts,
			Labels:  inspect.Config.Labels,
		},
		Logs: deployLogs,
	}

	return result, nil
}
