package api

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newFakeAuthAdminServer(t *testing.T, perID func(id string) (int, string)) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// API key/Bearer header sanity
		if r.Header.Get("apikey") == "" || !strings.HasPrefix(r.Header.Get("Authorization"), "Bearer ") {
			http.Error(w, "missing auth", http.StatusUnauthorized)
			return
		}
		// Expect /auth/v1/admin/users/{id}
		parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/"), "/")
		if len(parts) < 4 || parts[0] != "auth" || parts[1] != "v1" || parts[2] != "admin" || parts[3] != "users" {
			http.NotFound(w, r)
			return
		}
		if len(parts) < 5 {
			http.NotFound(w, r)
			return
		}
		id := parts[4]
		status, body := perID(id)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_, _ = w.Write([]byte(body))
	}))
}

func TestSupabaseAdminGetAuthUser(t *testing.T) {
	uid := uuid.New().String()
	ts := newFakeAuthAdminServer(t, func(id string) (int, string) {
		if id != uid {
			return 404, ""
		}
		return 200, fmt.Sprintf(`{"id":"%s","email":"alice@example.com","last_sign_in_at":"2026-05-20T12:00:00Z","created_at":"2026-04-01T00:00:00Z","app_metadata":{"provider":"google"}}`, uid)
	})
	defer ts.Close()

	c := NewSupabaseAdminClient(ts.URL, "service_role_key")
	meta, err := c.GetAuthUser(context.Background(), uid)
	require.NoError(t, err)
	assert.Equal(t, uid, meta.ID)
	assert.Equal(t, "alice@example.com", meta.Email)
	assert.Equal(t, "google", meta.Provider, "app_metadata.provider 폴백 적용")
	require.NotNil(t, meta.LastSignInAt)
	assert.Equal(t, "2026-05-20T12:00:00Z", *meta.LastSignInAt)
}

func TestSupabaseAdminGetAuthUserNotFound(t *testing.T) {
	ts := newFakeAuthAdminServer(t, func(_ string) (int, string) {
		return 404, ""
	})
	defer ts.Close()
	c := NewSupabaseAdminClient(ts.URL, "key")
	meta, err := c.GetAuthUser(context.Background(), uuid.New().String())
	assert.NoError(t, err, "404는 에러 아님")
	assert.Empty(t, meta.ID)
}

func TestSupabaseAdminGetAuthUserMissingKey(t *testing.T) {
	c := NewSupabaseAdminClient("http://localhost", "")
	_, err := c.GetAuthUser(context.Background(), uuid.New().String())
	assert.Error(t, err)
}

func TestSupabaseAdminListAuthUsersConcurrencyBounded(t *testing.T) {
	var inFlight int32
	var maxInFlight int32
	ts := newFakeAuthAdminServer(t, func(id string) (int, string) {
		n := atomic.AddInt32(&inFlight, 1)
		defer atomic.AddInt32(&inFlight, -1)
		for {
			cur := atomic.LoadInt32(&maxInFlight)
			if n <= cur || atomic.CompareAndSwapInt32(&maxInFlight, cur, n) {
				break
			}
		}
		return 200, fmt.Sprintf(`{"id":"%s","email":"u@x.com","created_at":"2026-01-01T00:00:00Z","app_metadata":{"provider":"email"}}`, id)
	})
	defer ts.Close()

	c := NewSupabaseAdminClient(ts.URL, "key")
	c.Concurrency = 3

	ids := make([]string, 30)
	for i := range ids {
		ids[i] = uuid.New().String()
	}
	result, err := c.ListAuthUsers(context.Background(), ids)
	require.NoError(t, err)
	assert.Len(t, result, 30, "모든 id에 대해 메타 반환")
	assert.LessOrEqual(t, int(atomic.LoadInt32(&maxInFlight)), 3, "동시 실행 수가 Concurrency 한도 안")
}

func TestSupabaseAdminListAuthUsersPartialFailure(t *testing.T) {
	failID := uuid.New().String()
	okID := uuid.New().String()
	ts := newFakeAuthAdminServer(t, func(id string) (int, string) {
		if id == failID {
			return 500, `{"error":"boom"}`
		}
		return 200, fmt.Sprintf(`{"id":"%s","email":"ok@x.com","created_at":"2026-01-01T00:00:00Z"}`, id)
	})
	defer ts.Close()
	c := NewSupabaseAdminClient(ts.URL, "key")
	result, err := c.ListAuthUsers(context.Background(), []string{okID, failID})
	require.NoError(t, err, "부분 실패는 에러 아님")
	assert.Len(t, result, 1, "성공한 id만 결과에 포함")
	_, ok := result[okID]
	assert.True(t, ok)
}

func TestSupabaseAdminListAuthUsersEmpty(t *testing.T) {
	c := NewSupabaseAdminClient("http://localhost", "key")
	result, err := c.ListAuthUsers(context.Background(), nil)
	assert.NoError(t, err)
	assert.Empty(t, result)
}
