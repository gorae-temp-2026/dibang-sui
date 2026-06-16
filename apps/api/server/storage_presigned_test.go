package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// Supabase Storage signed upload URL:
//   POST /storage/v1/object/upload/sign/{bucket}/{path}
//   → { url: "/object/upload/sign/{bucket}/{path}?token=..." }
// 우리 구현은 절대 URL로 합쳐 반환해야 한다.
func TestSupabaseStorage_IssueSignedUploadURL_Happy(t *testing.T) {
	var (
		gotMethod  string
		gotPath    string
		gotAuth    string
		gotAPIKey  string
		gotExpires string
	)
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotMethod = r.Method
		gotPath = r.URL.Path
		gotAuth = r.Header.Get("Authorization")
		gotAPIKey = r.Header.Get("apikey")
		gotExpires = r.URL.Query().Get("expires_in")
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{
			"url":  "/object/upload/sign/uploads/share/L1/U1/x.jpg?token=xyz",
			"path": "share/L1/U1/x.jpg",
		})
	}))
	defer ts.Close()

	s := NewSupabaseStorage(ts.URL, "svc-key")
	url, err := s.IssueSignedUploadURL(context.Background(), "uploads", "share/L1/U1/x.jpg", "image/jpeg", 900)
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if gotMethod != http.MethodPost {
		t.Errorf("method = %s, want POST", gotMethod)
	}
	if !strings.HasSuffix(gotPath, "/storage/v1/object/upload/sign/uploads/share/L1/U1/x.jpg") {
		t.Errorf("path = %s", gotPath)
	}
	if gotAuth != "Bearer svc-key" {
		t.Errorf("auth = %s, want Bearer svc-key", gotAuth)
	}
	if gotAPIKey != "svc-key" {
		t.Errorf("apikey = %s", gotAPIKey)
	}
	if gotExpires != "900" {
		t.Errorf("expires_in = %s, want 900", gotExpires)
	}
	want := ts.URL + "/storage/v1/object/upload/sign/uploads/share/L1/U1/x.jpg?token=xyz"
	if url != want {
		t.Errorf("url = %s, want %s", url, want)
	}
}

func TestSupabaseStorage_IssueSignedUploadURL_ServerError(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "boom", http.StatusInternalServerError)
	}))
	defer ts.Close()

	s := NewSupabaseStorage(ts.URL, "k")
	_, err := s.IssueSignedUploadURL(context.Background(), "uploads", "p", "image/jpeg", 0)
	if err == nil {
		t.Fatal("want err, got nil")
	}
	if !strings.Contains(err.Error(), "supabase signed upload url failed") {
		t.Errorf("err = %v", err)
	}
}

func TestSupabaseStorage_IssueSignedUploadURL_EmptyURL(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{})
	}))
	defer ts.Close()
	s := NewSupabaseStorage(ts.URL, "k")
	_, err := s.IssueSignedUploadURL(context.Background(), "uploads", "p", "image/jpeg", 0)
	if err == nil {
		t.Fatal("want err, got nil")
	}
}

func TestLocalDiskStorage_IssueSignedUploadURL_NotSupported(t *testing.T) {
	l := NewLocalDiskStorage()
	_, err := l.IssueSignedUploadURL(context.Background(), "uploads", "p", "image/jpeg", 0)
	if !errors.Is(err, ErrSignedUploadURLNotSupported) {
		t.Fatalf("want ErrSignedUploadURLNotSupported, got %v", err)
	}
}
