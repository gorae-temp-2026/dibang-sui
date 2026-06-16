package api

// mock StorageUploader — 테스트 공용 (presigned·relocate·메모리북 ZIP 등).
// (구 upload_test.go에서 이전 — POST /uploads 폐기와 함께 핸들러 테스트는 삭제, 2026-06-10)

import (
	"bytes"
	"context"
	"io"
)

type mockUploader struct {
	called    bool
	gotBucket string
	gotPath   string
	gotCT     string
	returnURL string
	returnErr error
	// presigned 모킹
	signedURL       string
	signedErr       error
	signedGotBucket string
	signedGotPath   string
	signedGotCT     string
	signedGotTTL    int
	// Download 모킹
	downloadData      []byte
	downloadByPath    map[string][]byte
	downloadErr       error
	downloadGotBucket string
	downloadGotPath   string
	// Delete 모킹
	deleteErr    error
	deletedPaths []string // "{bucket}/{objectPath}" 누적
	// Copy 모킹
	copyErr     error
	copiedPairs []copiedPair
}

type copiedPair struct {
	srcBucket, srcKey, dstBucket, dstKey string
}

func (m *mockUploader) Delete(_ context.Context, bucket, objectPath string) error {
	m.deletedPaths = append(m.deletedPaths, bucket+"/"+objectPath)
	return m.deleteErr
}

func (m *mockUploader) Copy(_ context.Context, srcBucket, srcKey, dstBucket, dstKey string) error {
	if m.copyErr != nil {
		return m.copyErr
	}
	m.copiedPairs = append(m.copiedPairs, copiedPair{srcBucket, srcKey, dstBucket, dstKey})
	return nil
}

func (m *mockUploader) Upload(ctx context.Context, bucket, objectPath, contentType string, body io.Reader) (string, error) {
	m.called = true
	m.gotBucket = bucket
	m.gotPath = objectPath
	m.gotCT = contentType
	_, _ = io.Copy(io.Discard, body)
	if m.returnErr != nil {
		return "", m.returnErr
	}
	return m.returnURL, nil
}

func (m *mockUploader) IssueSignedUploadURL(_ context.Context, bucket, objectPath, contentType string, ttlSeconds int) (string, error) {
	m.signedGotBucket = bucket
	m.signedGotPath = objectPath
	m.signedGotCT = contentType
	m.signedGotTTL = ttlSeconds
	if m.signedErr != nil {
		return "", m.signedErr
	}
	return m.signedURL, nil
}

// Download mock — 경로별 데이터 매핑 또는 단일 응답.
func (m *mockUploader) Download(_ context.Context, bucket, objectPath string) (io.ReadCloser, error) {
	m.downloadGotBucket = bucket
	m.downloadGotPath = objectPath
	if m.downloadErr != nil {
		return nil, m.downloadErr
	}
	if m.downloadByPath != nil {
		if b, ok := m.downloadByPath[objectPath]; ok {
			return io.NopCloser(bytes.NewReader(b)), nil
		}
	}
	return io.NopCloser(bytes.NewReader(m.downloadData)), nil
}
