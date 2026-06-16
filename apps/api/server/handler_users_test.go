// handler_users_test — GetMe / UpdateMe 검증.
//
// 책임:
//   - UserIDFromContext 없으면 401.
//   - GetMe: Users.GetByID 호출, NotFound → 401(user not found).
//   - GetMe: ConsentService nil이면 안전 디폴트(빈 배열·false).
//   - GetMe: ConsentService 주입 시 GetConsentsRequired/GetMarketingAgreed 결과 반영.
//   - UpdateMe: Users.Update 호출, NotFound → 401.
//
// 컨벤션: _code_convention/BACKEND_TESTING.md.

package api

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- Mocks ---

type mockUserService struct {
	GetByIDFn     func(ctx context.Context, id pgtype.UUID) (*User, error)
	UpdateFn      func(ctx context.Context, id pgtype.UUID, req *UpdateUserRequest) (*User, error)
	EnsureUserFn  func(ctx context.Context, id pgtype.UUID, email, name string) error
}

func (m *mockUserService) GetByID(ctx context.Context, id pgtype.UUID) (*User, error) {
	return m.GetByIDFn(ctx, id)
}
func (m *mockUserService) Update(ctx context.Context, id pgtype.UUID, req *UpdateUserRequest) (*User, error) {
	return m.UpdateFn(ctx, id, req)
}
func (m *mockUserService) EnsureUser(ctx context.Context, id pgtype.UUID, email, name string) error {
	if m.EnsureUserFn != nil {
		return m.EnsureUserFn(ctx, id, email, name)
	}
	return nil
}

// mockConsentService는 handler_consents_test.go에 이미 정의됨 — 같은 패키지에서 재사용.

// ---------- GetMe ----------

func TestGetMe_Unauthorized(t *testing.T) {
	srv := &Server{}
	resp, err := srv.GetMe(context.Background(), GetMeRequestObject{})
	require.NoError(t, err)
	assert.IsType(t, GetMe401JSONResponse{}, resp)
}

func TestGetMe_UserNotFound_401(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Users: &mockUserService{
			GetByIDFn: func(_ context.Context, _ pgtype.UUID) (*User, error) {
				return nil, ErrNotFound
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.GetMe(ctx, GetMeRequestObject{})
	require.NoError(t, err)
	assert.IsType(t, GetMe401JSONResponse{}, resp)
}

func TestGetMe_NoConsentService_DefaultsApplied(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Users: &mockUserService{
			GetByIDFn: func(_ context.Context, _ pgtype.UUID) (*User, error) {
				return &User{}, nil
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.GetMe(ctx, GetMeRequestObject{})
	require.NoError(t, err)
	r, ok := resp.(GetMe200JSONResponse)
	require.True(t, ok)
	assert.NotNil(t, r.ConsentsRequired)
	assert.Empty(t, r.ConsentsRequired)
	assert.False(t, r.MarketingAgreed)
}

func TestGetMe_WithConsentService_ReflectsValues(t *testing.T) {
	uid := testUUID()
	required := []UserConsentsRequired{"service", "privacy"}
	srv := &Server{
		Users: &mockUserService{
			GetByIDFn: func(_ context.Context, _ pgtype.UUID) (*User, error) {
				return &User{}, nil
			},
		},
		Consents: &mockConsentService{
			GetConsentsRequiredFn: func(_ context.Context, _ pgtype.UUID) ([]UserConsentsRequired, error) {
				return required, nil
			},
			GetMarketingAgreedFn: func(_ context.Context, _ pgtype.UUID) (bool, error) {
				return true, nil
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.GetMe(ctx, GetMeRequestObject{})
	require.NoError(t, err)
	r := resp.(GetMe200JSONResponse)
	assert.Equal(t, required, r.ConsentsRequired)
	assert.True(t, r.MarketingAgreed)
}

func TestGetMe_ConsentServiceError_FallsBackToDefault(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Users: &mockUserService{
			GetByIDFn: func(_ context.Context, _ pgtype.UUID) (*User, error) {
				return &User{}, nil
			},
		},
		Consents: &mockConsentService{
			GetConsentsRequiredFn: func(_ context.Context, _ pgtype.UUID) ([]UserConsentsRequired, error) {
				return nil, assert.AnError
			},
			GetMarketingAgreedFn: func(_ context.Context, _ pgtype.UUID) (bool, error) {
				return false, assert.AnError
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.GetMe(ctx, GetMeRequestObject{})
	require.NoError(t, err)
	r := resp.(GetMe200JSONResponse)
	// ConsentService err 발생 → 디폴트 유지(handler 코드의 if err == nil 분기 안 탐)
	assert.Empty(t, r.ConsentsRequired)
	assert.False(t, r.MarketingAgreed)
}

// ---------- UpdateMe ----------

func TestUpdateMe_Unauthorized(t *testing.T) {
	srv := &Server{}
	resp, err := srv.UpdateMe(context.Background(), UpdateMeRequestObject{Body: &UpdateUserRequest{}})
	require.NoError(t, err)
	assert.IsType(t, UpdateMe401JSONResponse{}, resp)
}

func TestUpdateMe_NotFound_401(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Users: &mockUserService{
			UpdateFn: func(_ context.Context, _ pgtype.UUID, _ *UpdateUserRequest) (*User, error) {
				return nil, ErrNotFound
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.UpdateMe(ctx, UpdateMeRequestObject{Body: &UpdateUserRequest{}})
	require.NoError(t, err)
	assert.IsType(t, UpdateMe401JSONResponse{}, resp)
}

func TestUpdateMe_Success_200(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Users: &mockUserService{
			UpdateFn: func(_ context.Context, _ pgtype.UUID, _ *UpdateUserRequest) (*User, error) {
				return &User{}, nil
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.UpdateMe(ctx, UpdateMeRequestObject{Body: &UpdateUserRequest{}})
	require.NoError(t, err)
	assert.IsType(t, UpdateMe200JSONResponse{}, resp)
}
