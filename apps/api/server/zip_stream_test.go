package api

import (
	"archive/zip"
	"bytes"
	"context"
	"errors"
	"io"
	"testing"
)

func makeFetcher(data map[string][]byte, errs map[string]error) func(ctx context.Context, p string) (io.ReadCloser, error) {
	return func(_ context.Context, p string) (io.ReadCloser, error) {
		if e, ok := errs[p]; ok {
			return nil, e
		}
		if b, ok := data[p]; ok {
			return io.NopCloser(bytes.NewReader(b)), nil
		}
		return nil, errors.New("not found")
	}
}

func readZipEntries(t *testing.T, buf *bytes.Buffer) map[string][]byte {
	t.Helper()
	zr, err := zip.NewReader(bytes.NewReader(buf.Bytes()), int64(buf.Len()))
	if err != nil {
		t.Fatalf("zip open: %v", err)
	}
	out := make(map[string][]byte, len(zr.File))
	for _, f := range zr.File {
		rc, err := f.Open()
		if err != nil {
			t.Fatalf("zip entry open: %v", err)
		}
		b, _ := io.ReadAll(rc)
		_ = rc.Close()
		out[f.Name] = b
	}
	return out
}

func TestWriteSharedPhotosZip_ThreePhotos(t *testing.T) {
	items := []SharedPhotoZipItem{
		{StoragePath: "share/L/U/a.jpg"},
		{StoragePath: "share/L/U/b.jpg"},
		{StoragePath: "share/L/U/c.jpg"},
	}
	fetcher := makeFetcher(map[string][]byte{
		"share/L/U/a.jpg": []byte("AAA"),
		"share/L/U/b.jpg": []byte("BBBB"),
		"share/L/U/c.jpg": []byte("CCCCC"),
	}, nil)

	var buf bytes.Buffer
	if err := WriteSharedPhotosZip(context.Background(), &buf, items, fetcher); err != nil {
		t.Fatalf("WriteSharedPhotosZip: %v", err)
	}
	entries := readZipEntries(t, &buf)
	if len(entries) != 3 {
		t.Fatalf("expected 3 entries, got %d (%v)", len(entries), keys(entries))
	}
	if string(entries["a.jpg"]) != "AAA" {
		t.Errorf("a.jpg = %q", entries["a.jpg"])
	}
	if string(entries["b.jpg"]) != "BBBB" {
		t.Errorf("b.jpg = %q", entries["b.jpg"])
	}
	if string(entries["c.jpg"]) != "CCCCC" {
		t.Errorf("c.jpg = %q", entries["c.jpg"])
	}
}

func TestWriteSharedPhotosZip_FetchErrorSkipsOnly(t *testing.T) {
	items := []SharedPhotoZipItem{
		{StoragePath: "share/L/U/a.jpg"},
		{StoragePath: "share/L/U/broken.jpg"},
		{StoragePath: "share/L/U/c.jpg"},
	}
	fetcher := makeFetcher(
		map[string][]byte{
			"share/L/U/a.jpg": []byte("AAA"),
			"share/L/U/c.jpg": []byte("CCC"),
		},
		map[string]error{
			"share/L/U/broken.jpg": errors.New("boom"),
		},
	)

	var buf bytes.Buffer
	if err := WriteSharedPhotosZip(context.Background(), &buf, items, fetcher); err != nil {
		t.Fatalf("WriteSharedPhotosZip: %v", err)
	}
	entries := readZipEntries(t, &buf)
	if len(entries) != 2 {
		t.Fatalf("expected 2 entries (skip broken), got %d (%v)", len(entries), keys(entries))
	}
}

func TestWriteSharedPhotosZip_DuplicateBasename(t *testing.T) {
	items := []SharedPhotoZipItem{
		{StoragePath: "share/L/U1/x.jpg"},
		{StoragePath: "share/L/U2/x.jpg"}, // 같은 basename
	}
	fetcher := makeFetcher(map[string][]byte{
		"share/L/U1/x.jpg": []byte("ONE"),
		"share/L/U2/x.jpg": []byte("TWO"),
	}, nil)

	var buf bytes.Buffer
	if err := WriteSharedPhotosZip(context.Background(), &buf, items, fetcher); err != nil {
		t.Fatalf("WriteSharedPhotosZip: %v", err)
	}
	entries := readZipEntries(t, &buf)
	if len(entries) != 2 {
		t.Fatalf("expected 2 entries, got %d (%v)", len(entries), keys(entries))
	}
	// 두 번째 항목은 prefix가 붙어야 함 (x.jpg + x__2.jpg)
	if _, ok := entries["x.jpg"]; !ok {
		t.Errorf("missing x.jpg")
	}
	if _, ok := entries["x__2.jpg"]; !ok {
		t.Errorf("missing x__2.jpg (duplicate suffix)")
	}
}

func TestWriteSharedPhotosZip_Empty(t *testing.T) {
	var buf bytes.Buffer
	if err := WriteSharedPhotosZip(context.Background(), &buf, nil, makeFetcher(nil, nil)); err != nil {
		t.Fatalf("err: %v", err)
	}
	// 빈 ZIP도 유효한 ZIP 헤더가 있어야 한다
	zr, err := zip.NewReader(bytes.NewReader(buf.Bytes()), int64(buf.Len()))
	if err != nil {
		t.Fatalf("empty zip not readable: %v", err)
	}
	if len(zr.File) != 0 {
		t.Errorf("expected 0 entries, got %d", len(zr.File))
	}
}

func keys(m map[string][]byte) []string {
	ks := make([]string, 0, len(m))
	for k := range m {
		ks = append(ks, k)
	}
	return ks
}
