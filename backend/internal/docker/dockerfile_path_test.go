package docker

import "testing"

func TestValidateDockerfilePath(t *testing.T) {
	for _, ok := range []string{"", "Dockerfile", "Dockerfile.akson", "docker/prod.Dockerfile", "./Dockerfile", "a/../Dockerfile"} {
		if err := ValidateDockerfilePath(ok); err != nil {
			t.Errorf("ValidateDockerfilePath(%q) = %v, want nil", ok, err)
		}
	}
	for _, bad := range []string{"../Dockerfile", "../../etc/passwd", "/etc/passwd", "a/../../x", "..", ".", "a\\..\\b", "x\x00y"} {
		if err := ValidateDockerfilePath(bad); err == nil {
			t.Errorf("ValidateDockerfilePath(%q) = nil, want error", bad)
		}
	}
}
