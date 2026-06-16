package api

import (
	"context"
	"net/http"
	"net/http/httptest"

	"github.com/jackc/pgx/v5/pgtype"
)

// 본 파일은 인증 관련 테스트 공통 헬퍼를 모은다. `_test.go` 접미사로 프로덕션 빌드에
// 포함되지 않으면서, 같은 패키지의 다른 *_test.go에서 자유롭게 호출할 수 있다.
//
// 컨벤션·사용 예시: _code_convention/BACKEND_TESTING.md § 인증 헬퍼

// NewFakeGoTrueServer creates an httptest server that mimics the Supabase
// GoTrue `/auth/v1/user` response. Pass the returned server's URL to
// AuthMiddleware as the supabaseURL to bypass real Supabase Auth in tests.
//
// The server responds to any request with the given uid/email/name so that
// AuthMiddleware can decode it into supabaseUser and inject the user ID into
// the request context.
func NewFakeGoTrueServer(uid, email, name string) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(
			`{"id":"` + uid +
				`","email":"` + email +
				`","user_metadata":{"full_name":"` + name + `"}}`,
		))
	}))
}

// WithUserContext injects userID into the context the same way AuthMiddleware
// does. Use in handler-level unit tests that need an authenticated context but
// don't want to set up the full middleware chain.
func WithUserContext(ctx context.Context, userID pgtype.UUID) context.Context {
	return context.WithValue(ctx, userIDContextKey, userID)
}

// WithEmailContext injects email into the context the same way AuthMiddleware
// does after a successful token verification. Use in AdminGuard tests.
func WithEmailContext(ctx context.Context, email string) context.Context {
	return context.WithValue(ctx, emailContextKey, email)
}

// NoopEnsureUser is a no-op EnsureUserFunc for tests that don't need to track
// JIT provisioning. Tests that care about call count or arguments should
// provide their own EnsureUserFunc.
var NoopEnsureUser EnsureUserFunc = func(_ context.Context, _ pgtype.UUID, _, _ string) error {
	return nil
}

// ctxWithUser is a shorthand for WithUserContext(context.Background(), userID).
// Widely used in handler-level tests that don't need a custom parent context.
func ctxWithUser(userID pgtype.UUID) context.Context {
	return WithUserContext(context.Background(), userID)
}
