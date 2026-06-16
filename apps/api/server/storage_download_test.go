package api

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestSupabaseStorage_Download_Happy(t *testing.T) {
	var (
		gotMethod string
		gotPath   string
		gotAuth   string
	)
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotMethod = r.Method
		gotPath = r.URL.Path
		gotAuth = r.Header.Get("Authorization")
		w.Header().Set("Content-Type", "image/jpeg")
		_, _ = w.Write([]byte("FAKEJPEG"))
	}))
	defer ts.Close()

	s := NewSupabaseStorage(ts.URL, "svc-key")
	rc, err := s.Download(context.Background(), "uploads", "share/L1/U1/x.jpg")
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	defer rc.Close()
	b, _ := io.ReadAll(rc)

	if gotMethod != http.MethodGet {
		t.Errorf("method = %s, want GET", gotMethod)
	}
	if !strings.HasSuffix(gotPath, "/storage/v1/object/uploads/share/L1/U1/x.jpg") {
		t.Errorf("path = %s", gotPath)
	}
	if gotAuth != "Bearer svc-key" {
		t.Errorf("auth = %s", gotAuth)
	}
	if string(b) != "FAKEJPEG" {
		t.Errorf("body = %q", string(b))
	}
}

func TestSupabaseStorage_Download_NotFound(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
	}))
	defer ts.Close()
	s := NewSupabaseStorage(ts.URL, "k")
	_, err := s.Download(context.Background(), "uploads", "missing.jpg")
	if err == nil {
		t.Fatal("want err")
	}
	if !strings.Contains(err.Error(), "404") {
		t.Errorf("err = %v", err)
	}
}

func TestLocalDiskStorage_Download_Happy(t *testing.T) {
	dir := t.TempDir()
	full := filepath.Join(dir, "sub", "x.txt")
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(full, []byte("hello"), 0o644); err != nil {
		t.Fatal(err)
	}
	l := newLocalDiskStorageAt(dir)
	rc, err := l.Download(context.Background(), "", "sub/x.txt")
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	defer rc.Close()
	b, _ := io.ReadAll(rc)
	if string(b) != "hello" {
		t.Errorf("body = %q", string(b))
	}
}

func TestLocalDiskStorage_Download_PathTraversalBlocked(t *testing.T) {
	l := newLocalDiskStorageAt(t.TempDir())
	_, err := l.Download(context.Background(), "", "../etc/passwd")
	if err == nil {
		t.Fatal("want err for path traversal")
	}
}
