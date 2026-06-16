package api

import (
	"archive/zip"
	"context"
	"io"
	"path/filepath"
)

// WriteSharedPhotosZip: 공유 사진 그룹을 ZIP으로 스트리밍 패킹.
// w는 HTTP ResponseWriter, fetch는 storage_path → ReadCloser.
// 시나리오 §10·§14 s04_ledger_group_zip:
//   - 각 객체는 받자마자 zip.Writer로 io.Copy → 메모리 한도 = 한 객체
//   - fetch 실패한 항목은 skip하고 나머지 진행 (전체 실패로 보지 않음)
//   - 파일명은 storage_path의 basename. 중복 시 prefix(idx_) 부여.
type SharedPhotoZipItem struct {
	StoragePath string
	FileName    string // optional — 비어있으면 storage_path basename 사용
}

func WriteSharedPhotosZip(
	ctx context.Context,
	w io.Writer,
	items []SharedPhotoZipItem,
	fetch func(ctx context.Context, objectPath string) (io.ReadCloser, error),
) error {
	zw := zip.NewWriter(w)
	defer zw.Close()

	seen := make(map[string]int)
	for i, it := range items {
		if err := ctx.Err(); err != nil {
			return err
		}
		name := it.FileName
		if name == "" {
			name = filepath.Base(it.StoragePath)
		}
		// 동일 basename 중복 시 prefix 부여 (1_x.jpg, 2_x.jpg ...)
		if n, dup := seen[name]; dup {
			seen[name] = n + 1
			name = appendIdxPrefix(name, n+1)
		} else {
			seen[name] = 1
		}

		rc, err := fetch(ctx, it.StoragePath)
		if err != nil {
			// skip — 다른 객체는 계속
			_ = i
			continue
		}
		f, err := zw.Create(name)
		if err != nil {
			_ = rc.Close()
			return err
		}
		if _, err := io.Copy(f, rc); err != nil {
			_ = rc.Close()
			return err
		}
		_ = rc.Close()
	}
	return nil
}

func appendIdxPrefix(name string, idx int) string {
	// "x.jpg" → "x__2.jpg"
	ext := filepath.Ext(name)
	base := name[:len(name)-len(ext)]
	return base + "__" + itoa(idx) + ext
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}
