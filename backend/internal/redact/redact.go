// Package redact removes secrets from text before it is logged, streamed or stored.
package redact

import (
	"encoding/json"
	"regexp"
	"sort"
	"strings"
)

// Mask replaces a secret value.
const Mask = "***"

// http(s)://<userinfo>@ : a user:password or access token embedded in a URL.
var urlUserinfoRe = regexp.MustCompile(`(?i)(https?://)[^/\s@]+@`)

// URLCredentials hides credentials embedded in http(s) URLs anywhere in s,
// e.g. "https://user:token@github.com/a/b" -> "https://***@github.com/a/b".
func URLCredentials(s string) string {
	return urlUserinfoRe.ReplaceAllString(s, "${1}"+Mask+"@")
}

// EnvValues keeps the variable names of a stored environment but masks every value.
// It accepts a JSON object ({"KEY":"value"}) or KEY=value lines; anything else is
// replaced by Mask entirely, since it may still contain secrets.
func EnvValues(env string) string {
	if strings.TrimSpace(env) == "" || strings.TrimSpace(env) == "null" {
		return env
	}
	var m map[string]any
	if err := json.Unmarshal([]byte(env), &m); err == nil {
		masked := make(map[string]string, len(m))
		for k := range m {
			masked[k] = Mask
		}
		out, _ := json.Marshal(masked)
		return string(out)
	}
	lines := strings.Split(env, "\n")
	var keys []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		k, _, ok := strings.Cut(line, "=")
		if !ok || k == "" || strings.ContainsAny(k, " \t") {
			return Mask
		}
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for i, k := range keys {
		keys[i] = k + "=" + Mask
	}
	return strings.Join(keys, "\n")
}
