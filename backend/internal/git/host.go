package git

import (
	"context"
	"fmt"
	"net"
	"net/url"
	"strings"
)

// lookupIP resolves a host name. Replaced in tests.
var lookupIP = func(ctx context.Context, host string) ([]net.IP, error) {
	addrs, err := net.DefaultResolver.LookupIPAddr(ctx, host)
	if err != nil {
		return nil, err
	}
	ips := make([]net.IP, 0, len(addrs))
	for _, a := range addrs {
		ips = append(ips, a.IP)
	}
	return ips, nil
}

// RepoHost returns the host name of an already validated repository URL
// (https://host/..., ssh://user@host:22/..., or scp-like user@host:path).
func RepoHost(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if scpLikeRe.MatchString(raw) {
		_, rest, _ := strings.Cut(raw, "@")
		host, _, _ := strings.Cut(rest, ":")
		return host, nil
	}
	u, err := url.Parse(raw)
	if err != nil {
		return "", fmt.Errorf("invalid git URL: %w", err)
	}
	if u.Hostname() == "" {
		return "", fmt.Errorf("invalid git URL: host is missing")
	}
	return u.Hostname(), nil
}

// CheckRepoHost blocks clones from addresses that only make sense as an SSRF target:
// loopback (Akson itself / the host), link-local (cloud metadata such as
// 169.254.169.254), unspecified and multicast addresses. Private LAN ranges stay
// allowed so self-hosted Git servers (Gitea, GitLab) keep working.
func CheckRepoHost(ctx context.Context, raw string) error {
	host, err := RepoHost(raw)
	if err != nil {
		return err
	}
	var ips []net.IP
	if ip := net.ParseIP(host); ip != nil {
		ips = []net.IP{ip}
	} else {
		ips, err = lookupIP(ctx, host)
		if err != nil {
			return fmt.Errorf("could not resolve git host %q: %w", host, err)
		}
	}
	for _, ip := range ips {
		if blockedIP(ip) {
			return fmt.Errorf("git host %q points to a local or link-local address (%s), which is not allowed", host, ip)
		}
	}
	return nil
}

func blockedIP(ip net.IP) bool {
	return ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() ||
		ip.IsInterfaceLocalMulticast() || ip.IsMulticast() || ip.IsUnspecified()
}
