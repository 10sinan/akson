package main

import "testing"

func TestIsLoopbackHost(t *testing.T) {
	cases := map[string]bool{
		"127.0.0.1": true, "::1": true, "localhost": true,
		"0.0.0.0": false, "": false, "192.168.1.5": false, "example.com": false,
	}
	for host, want := range cases {
		if got := isLoopbackHost(host); got != want {
			t.Errorf("isLoopbackHost(%q) = %v, want %v", host, got, want)
		}
	}
}
