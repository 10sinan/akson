package api

import (
	"strings"
	"testing"
)

func TestValidateEnvKeys(t *testing.T) {
	if err := validateEnvKeys(map[string]string{"PORT": "3000", "DB_URL": "postgres://a=b", "lower_case": ""}); err != nil {
		t.Fatalf("valid keys rejected: %v", err)
	}
	if err := validateEnvKeys(nil); err != nil {
		t.Fatalf("nil map rejected: %v", err)
	}
	for _, bad := range []string{"", "A=B", "A B", "A\tB", "A\nB", "A\x00B"} {
		if err := validateEnvKeys(map[string]string{bad: "x"}); err == nil {
			t.Errorf("key %q should be rejected", bad)
		}
	}
}

func TestDeployStream_RejectsInvalidEnvKey(t *testing.T) {
	events := streamDeploy(t, NewServer(nil, nil, nil), map[string]any{
		"name": "x", "image": "nginx:alpine", "env": map[string]string{"A=B": "c"},
	})
	last := events[len(events)-1]
	if last.Type != "error" || !strings.Contains(last.Message, "Invalid env key") {
		t.Fatalf("expected invalid env key error, got %+v", last)
	}
}
