package redact

import (
	"strings"
	"testing"
)

func TestURLCredentials(t *testing.T) {
	cases := map[string]string{
		"https://user:pa55@github.com/a/b.git":                    "https://***@github.com/a/b.git",
		"Cloning repository https://ghp_abc123@github.com/a/b...": "Cloning repository https://***@github.com/a/b...",
		"HTTP://u:p@host/x and http://t@h2/y":                     "HTTP://***@host/x and http://***@h2/y",
		"https://github.com/a/b.git":                              "https://github.com/a/b.git",
		"git@github.com:a/b.git":                                  "git@github.com:a/b.git",
		"ssh://git@host/a.git":                                    "ssh://git@host/a.git",
		"mail me at a@b.com":                                      "mail me at a@b.com",
	}
	for in, want := range cases {
		if got := URLCredentials(in); got != want {
			t.Errorf("URLCredentials(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestEnvValues(t *testing.T) {
	got := EnvValues(`{"DB_PASSWORD":"hunter2","PORT":"3000"}`)
	if strings.Contains(got, "hunter2") || strings.Contains(got, "3000") {
		t.Fatalf("value leaked: %s", got)
	}
	if !strings.Contains(got, `"DB_PASSWORD":"***"`) || !strings.Contains(got, `"PORT":"***"`) {
		t.Fatalf("keys should be kept: %s", got)
	}

	if got := EnvValues("B=2\nA=secret=with=equals\n"); got != "A=***\nB=***" {
		t.Fatalf("KEY=VAL form: got %q", got)
	}
	if got := EnvValues("not an env list"); got != Mask {
		t.Fatalf("unknown format should be fully masked, got %q", got)
	}
	for _, empty := range []string{"", "null", "  "} {
		if got := EnvValues(empty); got != empty {
			t.Fatalf("EnvValues(%q) = %q, want unchanged", empty, got)
		}
	}
	// Idempotent: running the migration twice changes nothing.
	once := EnvValues(`{"K":"v"}`)
	if twice := EnvValues(once); twice != once {
		t.Fatalf("not idempotent: %q -> %q", once, twice)
	}
}
