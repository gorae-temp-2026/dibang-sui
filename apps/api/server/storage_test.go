package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLocalDiskStorage_SavesAndReturnsRelativeURL(t *testing.T) {
	dir := t.TempDir()
	s := newLocalDiskStorageAt(dir)

	url, err := s.Upload(context.Background(), "", "u1/abc.png", "image/png", strings.NewReader("data"))
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}
	if url != "/uploads/u1/abc.png" {
		t.Fatalf("expected relative /uploads/u1/abc.png, got %q", url)
	}
	b, err := os.ReadFile(filepath.Join(dir, "u1", "abc.png"))
	if err != nil || string(b) != "data" {
		t.Fatalf("file not saved correctly: b=%q err=%v", string(b), err)
	}
}

func TestServeUploadFile_ServesSingleFile(t *testing.T) {
	dir := t.TempDir()
	_ = os.MkdirAll(filepath.Join(dir, "u1"), 0o755)
	_ = os.WriteFile(filepath.Join(dir, "u1", "abc.png"), []byte("imgbytes"), 0o644)
	h := newServeUploadFileAt(dir)

	req := httptest.NewRequest(http.MethodGet, "/uploads/u1/abc.png", nil)
	rr := httptest.NewRecorder()
	h(rr, req)
	if rr.Code != http.StatusOK || rr.Body.String() != "imgbytes" {
		t.Fatalf("expected 200 imgbytes, got %d %q", rr.Code, rr.Body.String())
	}
}

func TestServeUploadFile_RejectsTraversal(t *testing.T) {
	dir := t.TempDir()
	h := newServeUploadFileAt(dir)
	for _, p := range []string{"/uploads/../../etc/passwd", "/uploads/../secret", "/uploads/u1/../../x"} {
		req := httptest.NewRequest(http.MethodGet, p, nil)
		rr := httptest.NewRecorder()
		h(rr, req)
		if rr.Code == http.StatusOK {
			t.Fatalf("traversal %q must be rejected, got 200", p)
		}
	}
}

func TestServeUploadFile_DirAndMissing404_NoListing(t *testing.T) {
	dir := t.TempDir()
	_ = os.MkdirAll(filepath.Join(dir, "u1"), 0o755)
	_ = os.WriteFile(filepath.Join(dir, "u1", "x.png"), []byte("z"), 0o644)
	h := newServeUploadFileAt(dir)

	// directory must NOT list contents
	req := httptest.NewRequest(http.MethodGet, "/uploads/u1", nil)
	rr := httptest.NewRecorder()
	h(rr, req)
	if rr.Code == http.StatusOK && strings.Contains(rr.Body.String(), "x.png") {
		t.Fatalf("directory listing leaked: %q", rr.Body.String())
	}
	if rr.Code != http.StatusNotFound {
		t.Fatalf("dir expected 404, got %d", rr.Code)
	}

	// missing file
	req2 := httptest.NewRequest(http.MethodGet, "/uploads/u1/missing.png", nil)
	rr2 := httptest.NewRecorder()
	h(rr2, req2)
	if rr2.Code != http.StatusNotFound {
		t.Fatalf("missing expected 404, got %d", rr2.Code)
	}
}

// (구 NewUploadHandler 테스트는 POST /uploads 폐기와 함께 삭제 — 2026-06-10 STORAGE.md)
