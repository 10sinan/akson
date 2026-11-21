package docker

import "testing"

func TestUserEnv(t *testing.T) {
	container := map[string]string{
		"PATH":         "/usr/local/bin:/usr/bin", // from image, unchanged -> dropped
		"NODE_VERSION": "22.1.0",                  // from image -> dropped
		"PORT":         "3000",                    // set by Akson/user -> kept
		"NODE_ENV":     "production",              // image says "development": user override -> kept
		"API_KEY":      "x=y",                     // user -> kept
	}
	image := []string{"PATH=/usr/local/bin:/usr/bin", "NODE_VERSION=22.1.0", "NODE_ENV=development"}
	got := UserEnv(container, image)
	want := map[string]string{"PORT": "3000", "NODE_ENV": "production", "API_KEY": "x=y"}
	if len(got) != len(want) {
		t.Fatalf("got %v, want %v", got, want)
	}
	for k, v := range want {
		if got[k] != v {
			t.Fatalf("got %v, want %v", got, want)
		}
	}
	if len(UserEnv(map[string]string{"A": "1"}, nil)) != 1 {
		t.Fatal("no image env: everything is user env")
	}
}
