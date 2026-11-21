package proxy

import (
	"strings"
	"testing"
)

func TestTraefikDefaultArgs_NoInsecureAPI(t *testing.T) {
	for _, email := range []string{"", "ops@example.com"} {
		args := TraefikDefaultArgs(email)
		for _, a := range args {
			if strings.HasPrefix(a, "--api.insecure") {
				t.Fatalf("args must not enable the unauthenticated API/dashboard: %v", args)
			}
		}
		if !contains(args, "--providers.docker.exposedbydefault=false") {
			t.Fatalf("containers must not be exposed by default: %v", args)
		}
	}
}

func contains(list []string, s string) bool {
	for _, v := range list {
		if v == s {
			return true
		}
	}
	return false
}
