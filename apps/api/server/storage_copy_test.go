package api

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Supabase Storage 객체 복사:
//   POST /storage/v1/object/copy {bucketId, sourceKey, destinationBucket, destinationKey}
// draft(v3-tmp) → wedding 경로 이동의 1단계. 선례: cmd/rebucket-photos.
func TestSupabaseStorage_Copy_Happy(t *testing.T) {
	var gotBody map[string]string
	var gotPath, gotAuth string
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotAuth = r.Header.Get("Authorization")
		b, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(b, &gotBody)
		w.WriteHeader(http.StatusOK)
	}))
	defer ts.Close()

	s := NewSupabaseStorage(ts.URL, "svc-key")
	err := s.Copy(context.Background(), "v3-uploads-public", "v3-tmp/U1/a.jpg", "v3-uploads-public", "v3-mobile-invitation/W1/cover/a.jpg")
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if !strings.HasSuffix(gotPath, "/storage/v1/object/copy") {
		t.Errorf("path = %s", gotPath)
	}
	if gotAuth != "Bearer svc-key" {
		t.Errorf("auth = %s", gotAuth)
	}
	want := map[string]string{
		"bucketId":          "v3-uploads-public",
		"sourceKey":         "v3-tmp/U1/a.jpg",
		"destinationBucket": "v3-uploads-public",
		"destinationKey":    "v3-mobile-invitation/W1/cover/a.jpg",
	}
	for k, v := range want {
		if gotBody[k] != v {
			t.Errorf("body[%s] = %s, want %s", k, gotBody[k], v)
		}
	}
}

func TestSupabaseStorage_Copy_ServerErrorAndEmptyArgs(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "boom", http.StatusInternalServerError)
	}))
	defer ts.Close()
	s := NewSupabaseStorage(ts.URL, "k")
	if err := s.Copy(context.Background(), "b", "s", "b", "d"); err == nil {
		t.Error("server error: want err")
	}
	if err := s.Copy(context.Background(), "", "s", "b", "d"); err == nil {
		t.Error("empty bucket: want err")
	}
	if err := s.Copy(context.Background(), "b", "s", "b", ""); err == nil {
		t.Error("empty dst: want err")
	}
}

func TestLocalDiskStorage_Copy_DuplicatesWithinBuckets(t *testing.T) {
	dir := t.TempDir()
	l := newLocalDiskStorageAt(dir)
	if _, err := l.Upload(context.Background(), "bkt", "tmp/a.jpg", "image/jpeg", strings.NewReader("data")); err != nil {
		t.Fatal(err)
	}

	if err := l.Copy(context.Background(), "bkt", "tmp/a.jpg", "bkt", "wedding/W1/cover/a.jpg"); err != nil {
		t.Fatalf("copy err: %v", err)
	}
	for _, p := range []string{
		filepath.Join(dir, "bkt", "tmp", "a.jpg"),
		filepath.Join(dir, "bkt", "wedding", "W1", "cover", "a.jpg"),
	} {
		b, err := os.ReadFile(p)
		if err != nil || string(b) != "data" {
			t.Errorf("%s: %v %q", p, err, b)
		}
	}

	// 버킷 경계 탈출은 src/dst 모두 거부
	if err := l.Copy(context.Background(), "bkt", "../escape.jpg", "bkt", "x.jpg"); err == nil {
		t.Error("src escape: want err")
	}
	if err := l.Copy(context.Background(), "bkt", "tmp/a.jpg", "bkt", "../escape.jpg"); err == nil {
		t.Error("dst escape: want err")
	}
}
