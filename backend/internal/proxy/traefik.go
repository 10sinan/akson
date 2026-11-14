package proxy

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

var nameSanitizer = regexp.MustCompile(`[^a-zA-Z0-9-]`)

// RouteConfig defines the parameters required to generate Traefik v3 routing labels for a service.
type RouteConfig struct {
	ServiceName  string `json:"service_name"`
	Domain       string `json:"domain"`
	Port         int    `json:"port"`
	EnableTLS    bool   `json:"enable_tls"`
	CertResolver string `json:"cert_resolver,omitempty"` // defaults to "letsencrypt"
	PathPrefix   string `json:"path_prefix,omitempty"`   // e.g. "/api"
}

// SanitizeName converts a service name to a valid Traefik router identifier.
func SanitizeName(name string) string {
	clean := nameSanitizer.ReplaceAllString(name, "-")
	clean = strings.Trim(clean, "-")
	if clean == "" {
		return "service"
	}
	return clean
}

// GenerateLabels generates standard Traefik v3 container labels for reverse proxying and SSL.
func GenerateLabels(cfg RouteConfig) map[string]string {
	routerName := SanitizeName(cfg.ServiceName)
	labels := make(map[string]string)

	labels["traefik.enable"] = "true"
	labels["traefik.docker.network"] = DefaultNetworkName

	// Build routing rule
	var rule string
	if cfg.Domain != "" {
		rule = fmt.Sprintf("Host(`%s`)", cfg.Domain)
	}
	if cfg.PathPrefix != "" {
		pathRule := fmt.Sprintf("PathPrefix(`%s`)", cfg.PathPrefix)
		if rule != "" {
			rule = fmt.Sprintf("%s && %s", rule, pathRule)
		} else {
			rule = pathRule
		}
	}
	if rule == "" {
		rule = fmt.Sprintf("Host(`%s.localhost`)", routerName)
	}

	labels[fmt.Sprintf("traefik.http.routers.%s.rule", routerName)] = rule

	// Entrypoints & TLS
	if cfg.EnableTLS {
		labels[fmt.Sprintf("traefik.http.routers.%s.entrypoints", routerName)] = "websecure"
		labels[fmt.Sprintf("traefik.http.routers.%s.tls", routerName)] = "true"

		resolver := cfg.CertResolver
		if resolver == "" {
			resolver = "letsencrypt"
		}
		labels[fmt.Sprintf("traefik.http.routers.%s.tls.certresolver", routerName)] = resolver
	} else {
		labels[fmt.Sprintf("traefik.http.routers.%s.entrypoints", routerName)] = "web"
	}

	// Service Port
	port := cfg.Port
	if port <= 0 {
		port = 80
	}
	labels[fmt.Sprintf("traefik.http.services.%s.loadbalancer.server.port", routerName)] = strconv.Itoa(port)

	return labels
}

// TraefikDefaultArgs returns standard command-line flags to run the Traefik v3 container.
func TraefikDefaultArgs(acmeEmail string) []string {
	args := []string{
		"--api.dashboard=true",
		"--api.insecure=true", // Exposed internally on 8080 for status/monitoring
		"--providers.docker=true",
		"--providers.docker.exposedbydefault=false",
		fmt.Sprintf("--providers.docker.network=%s", DefaultNetworkName),
		"--entrypoints.web.address=:80",
		"--entrypoints.websecure.address=:443",
	}

	if acmeEmail != "" {
		args = append(args,
			"--certificatesresolvers.letsencrypt.acme.tlschallenge=true",
			fmt.Sprintf("--certificatesresolvers.letsencrypt.acme.email=%s", acmeEmail),
			"--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json",
		)
	}

	return args
}
