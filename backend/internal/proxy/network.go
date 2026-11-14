package proxy

import (
	"context"
	"fmt"

	"github.com/docker/docker/api/types/network"
	dockerClient "github.com/docker/docker/client"
)

const (
	// DefaultNetworkName is the isolated Docker bridge network for all Akson services.
	DefaultNetworkName = "akson-bridge"
	// DefaultSubnet defines the fixed IP range for predictable service-to-service communication.
	DefaultSubnet = "172.20.0.0/16"
	// DefaultGateway is the gateway IP for the bridge.
	DefaultGateway = "172.20.0.1"
)

// NetworkManager manages Docker bridge networks for Akson containers.
type NetworkManager struct {
	cli *dockerClient.Client
}

// NewNetworkManager initializes a network manager.
func NewNetworkManager(cli *dockerClient.Client) *NetworkManager {
	return &NetworkManager{cli: cli}
}

// NetworkDetails provides a human-readable summary of the isolated bridge.
type NetworkDetails struct {
	ID         string            `json:"id"`
	Name       string            `json:"name"`
	Driver     string            `json:"driver"`
	Subnet     string            `json:"subnet"`
	Gateway    string            `json:"gateway"`
	Containers map[string]string `json:"containers"` // ContainerID -> IPv4 with mask
}

// EnsureNetwork checks if the akson-bridge network exists; if not, it automatically provisions it.
func (m *NetworkManager) EnsureNetwork(ctx context.Context) (string, error) {
	networks, err := m.cli.NetworkList(ctx, network.ListOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to list networks: %w", err)
	}

	for _, n := range networks {
		if n.Name == DefaultNetworkName {
			return n.ID, nil
		}
	}

	// Create akson-bridge network
	opts := network.CreateOptions{
		Driver: "bridge",
		IPAM: &network.IPAM{
			Config: []network.IPAMConfig{
				{
					Subnet:  DefaultSubnet,
					Gateway: DefaultGateway,
				},
			},
		},
		Options: map[string]string{
			"com.docker.network.bridge.enable_icc": "true",
			"com.docker.network.bridge.name":       "akson0",
		},
		Labels: map[string]string{
			"akson.managed": "true",
		},
	}

	resp, err := m.cli.NetworkCreate(ctx, DefaultNetworkName, opts)
	if err != nil {
		return "", fmt.Errorf("failed to create network %s: %w", DefaultNetworkName, err)
	}

	return resp.ID, nil
}

// GetNetworkDetails returns details of the akson-bridge network.
func (m *NetworkManager) GetNetworkDetails(ctx context.Context) (*NetworkDetails, error) {
	netID, err := m.EnsureNetwork(ctx)
	if err != nil {
		return nil, err
	}

	inspect, err := m.cli.NetworkInspect(ctx, netID, network.InspectOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to inspect network %s: %w", netID, err)
	}

	details := &NetworkDetails{
		ID:         inspect.ID,
		Name:       inspect.Name,
		Driver:     inspect.Driver,
		Containers: make(map[string]string),
	}

	if len(inspect.IPAM.Config) > 0 {
		details.Subnet = inspect.IPAM.Config[0].Subnet
		details.Gateway = inspect.IPAM.Config[0].Gateway
	}

	for cid, ep := range inspect.Containers {
		details.Containers[cid] = ep.IPv4Address
	}

	return details, nil
}

// ConnectContainer connects a container to the akson-bridge network.
func (m *NetworkManager) ConnectContainer(ctx context.Context, networkID, containerID string) error {
	return m.cli.NetworkConnect(ctx, networkID, containerID, nil)
}

// DisconnectContainer disconnects a container from the akson-bridge network.
func (m *NetworkManager) DisconnectContainer(ctx context.Context, networkID, containerID string, force bool) error {
	return m.cli.NetworkDisconnect(ctx, networkID, containerID, force)
}
