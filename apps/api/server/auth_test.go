package api

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
)

// JIT: 인증 성공 시 EnsureUser가 호출되고, 같은 유저 반복 요청엔 가드로 1회만 호출.
func TestAuthMiddlewareJITProvisionGuarded(t *testing.T) {
	uid := uuid.New().String()
	ts := NewFakeGoTrueServer(uid, "alice@example.com", "앨리스")
	defer ts.Close()

	var calls int32
	var gotEmail, gotName string
	var gotID pgtype.UUID
	ensure := func(_ context.Context, id pgtype.UUID, email, name string) error {
		atomic.AddInt32(&calls, 1)
		gotID, gotEmail, gotName = id, email, name
		return nil
	}
	served := 0
	h := AuthMiddleware(ts.URL, "anon", ensure, false, "")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		served++
		_, ok := UserIDFromContext(r.Context())
		assert.True(t, ok, "userID가 컨텍스트에 있어야 함")
		w.WriteHeader(http.StatusOK)
	}))
	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodGet, "/x", nil)
		req.Header.Set("Authorization", "Bearer tkn")
		h.ServeHTTP(httptest.NewRecorder(), req)
	}
	assert.Equal(t, int32(1), atomic.LoadInt32(&calls), "가드로 EnsureUser 1회만")
	assert.Equal(t, "alice@example.com", gotEmail)
	assert.Equal(t, "앨리스", gotName)
	assert.True(t, gotID.Valid)
	assert.Equal(t, 2, served, "두 요청 모두 처리됨")
}

// EnsureUser 실패해도 요청은 막히지 않고 정상 진행(500 아님, userID 유지).
func TestAuthMiddlewareEnsureFailureNonBlocking(t *testing.T) {
	uid := uuid.New().String()
	ts := NewFakeGoTrueServer(uid, "alice@example.com", "앨리스")
	defer ts.Close()

	ensure := func(_ context.Context, _ pgtype.UUID, _, _ string) error {
		return errors.New("db down")
	}
	served := false
	h := AuthMiddleware(ts.URL, "anon", ensure, false, "")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		served = true
		_, ok := UserIDFromContext(r.Context())
		assert.True(t, ok)
		w.WriteHeader(http.StatusOK)
	}))
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	req.Header.Set("Authorization", "Bearer tkn")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	assert.True(t, served, "EnsureUser 실패에도 요청 진행")
	assert.Equal(t, http.StatusOK, rr.Code)
}

// JIT 프로비저닝 시 v3_users.name(NOT NULL)에 넣을 표시 이름 도출 규칙 검증.
// 우선순위: user_metadata.full_name → user_metadata.name → email local-part → "User".
func TestDeriveDisplayName(t *testing.T) {
	cases := []struct {
		name     string
		fullName string
		metaName string
		email    string
		want     string
	}{
		{"full_name 우선", "홍길동", "gildong", "gildong@example.com", "홍길동"},
		{"full_name 없으면 name", "", "길동", "gildong@example.com", "길동"},
		{"메타 없으면 email local-part", "", "", "alice@example.com", "alice"},
		{"공백은 비어있는 것으로 취급", "   ", "  ", "  bob@x.com ", "bob"},
		{"전부 없으면 기본값", "", "", "", "User"},
		{"email에 @ 없으면 통째로", "", "", "weird", "weird"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			assert.Equal(t, c.want, deriveDisplayName(c.fullName, c.metaName, c.email))
		})
	}
}

// Dev 우회: DEV_AUTH_BYPASS=true + X-Dev-Auth 헤더 시 Supabase 검증 없이 고정 dev user 주입.
func TestAuthMiddlewareDevBypass(t *testing.T) {
	devID := uuid.New().String()
	var ensuredID pgtype.UUID
	ensure := func(_ context.Context, id pgtype.UUID, email, _ string) error {
		ensuredID = id
		assert.Equal(t, "dev@localhost", email)
		return nil
	}
	served := false
	// Supabase URL이 invalid여도 우회 경로라 호출 자체가 일어나지 않아야 한다.
	h := AuthMiddleware("http://invalid.invalid", "anon", ensure, true, devID)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		served = true
		uid, ok := UserIDFromContext(r.Context())
		assert.True(t, ok, "dev 우회로 userID 주입")
		assert.True(t, uid.Valid)
		w.WriteHeader(http.StatusOK)
	}))
	req := httptest.NewRequest(http.MethodGet, "/weddings", nil)
	req.Header.Set("X-Dev-Auth", devID)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	assert.True(t, served, "dev 우회로 요청 처리됨")
	assert.True(t, ensuredID.Valid, "EnsureUser가 dev uid로 호출됨")
	assert.Equal(t, http.StatusOK, rr.Code)
}

// Dev 우회 비활성(devBypass=false)이면 X-Dev-Auth가 있어도 무시 — 토큰 없으니 soft 통과(userID 없음).
func TestAuthMiddlewareDevBypassDisabled(t *testing.T) {
	devID := uuid.New().String()
	served := false
	h := AuthMiddleware("http://invalid.invalid", "anon", nil, false, devID)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		served = true
		_, ok := UserIDFromContext(r.Context())
		assert.False(t, ok, "우회 비활성 + 토큰 없음 → userID 없음")
		w.WriteHeader(http.StatusOK)
	}))
	req := httptest.NewRequest(http.MethodGet, "/weddings", nil)
	req.Header.Set("X-Dev-Auth", devID)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	assert.True(t, served)
}
