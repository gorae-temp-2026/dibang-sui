// handler_host_invites_test — 5 endpoint × (auth gate + 권한 + 에러 매핑) 검증.
//
// 컨벤션: _code_convention/BACKEND_TESTING.md § 빠른 사이클(mock service).
// 책임:
//   - UserIDFromContext 없으면 401.
//   - WeddingService.IsHost 결과/에러에 따라 403·404 분기.
//   - HostInviteService 호출 후 에러 매핑 (NotFound·AlreadyAccepted·SlotTaken·CannotAcceptOwn·Forbidden).
//   - 성공 시 200/201/204 응답.
//
// 기존 mockWeddingService·testUUID·testOpenapiUUID(handler_weddings_test.go) 재사용.

package api

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgtype"
	openapi_types "github.com/oapi-codegen/runtime/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- Mock HostInviteService ---

type mockHostInviteService struct {
	CreateFn     func(ctx context.Context, weddingID openapi_types.UUID, slot string) (*HostInvite, error)
	GetByTokenFn func(ctx context.Context, token string) (*HostInvitePublic, error)
	AcceptFn     func(ctx context.Context, token string, userID pgtype.UUID) (*HostInvite, error)
	CancelFn     func(ctx context.Context, inviteID openapi_types.UUID) error
	ListFn       func(ctx context.Context, weddingID openapi_types.UUID) ([]HostInvite, error)
}

func (m *mockHostInviteService) Create(ctx context.Context, weddingID openapi_types.UUID, slot string) (*HostInvite, error) {
	return m.CreateFn(ctx, weddingID, slot)
}
func (m *mockHostInviteService) GetByToken(ctx context.Context, token string) (*HostInvitePublic, error) {
	return m.GetByTokenFn(ctx, token)
}
func (m *mockHostInviteService) Accept(ctx context.Context, token string, userID pgtype.UUID) (*HostInvite, error) {
	return m.AcceptFn(ctx, token, userID)
}
func (m *mockHostInviteService) Cancel(ctx context.Context, inviteID openapi_types.UUID) error {
	return m.CancelFn(ctx, inviteID)
}
func (m *mockHostInviteService) List(ctx context.Context, weddingID openapi_types.UUID) ([]HostInvite, error) {
	return m.ListFn(ctx, weddingID)
}

// ---------- ListHostInvites ----------

func TestListHostInvites_Unauthorized(t *testing.T) {
	srv := &Server{}
	resp, err := srv.ListHostInvites(context.Background(), ListHostInvitesRequestObject{
		WeddingId: testOpenapiUUID(),
	})
	require.NoError(t, err)
	assert.IsType(t, ListHostInvites401JSONResponse{}, resp)
}

func TestListHostInvites_WeddingNotFound_403(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Weddings: &mockWeddingService{
			IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
				return false, ErrNotFound
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.ListHostInvites(ctx, ListHostInvitesRequestObject{WeddingId: testOpenapiUUID()})
	require.NoError(t, err)
	assert.IsType(t, ListHostInvites403JSONResponse{}, resp)
}

func TestListHostInvites_NotHost_403(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Weddings: &mockWeddingService{
			IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
				return false, nil
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.ListHostInvites(ctx, ListHostInvitesRequestObject{WeddingId: testOpenapiUUID()})
	require.NoError(t, err)
	assert.IsType(t, ListHostInvites403JSONResponse{}, resp)
}

func TestListHostInvites_Success_200(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Weddings: &mockWeddingService{
			IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
				return true, nil
			},
		},
		HostInvites: &mockHostInviteService{
			ListFn: func(_ context.Context, _ openapi_types.UUID) ([]HostInvite, error) {
				return []HostInvite{}, nil
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.ListHostInvites(ctx, ListHostInvitesRequestObject{WeddingId: testOpenapiUUID()})
	require.NoError(t, err)
	assert.IsType(t, ListHostInvites200JSONResponse{}, resp)
}

// ---------- CreateHostInvite ----------

func TestCreateHostInvite_Unauthorized(t *testing.T) {
	srv := &Server{}
	resp, err := srv.CreateHostInvite(context.Background(), CreateHostInviteRequestObject{
		WeddingId: testOpenapiUUID(),
		Body:      &CreateHostInviteRequest{},
	})
	require.NoError(t, err)
	assert.IsType(t, CreateHostInvite401JSONResponse{}, resp)
}

func TestCreateHostInvite_WeddingNotFound_400(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Weddings: &mockWeddingService{
			IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
				return false, ErrNotFound
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.CreateHostInvite(ctx, CreateHostInviteRequestObject{
		WeddingId: testOpenapiUUID(),
		Body:      &CreateHostInviteRequest{},
	})
	require.NoError(t, err)
	assert.IsType(t, CreateHostInvite400JSONResponse{}, resp)
}

func TestCreateHostInvite_NotHost_403(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Weddings: &mockWeddingService{
			IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
				return false, nil
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.CreateHostInvite(ctx, CreateHostInviteRequestObject{
		WeddingId: testOpenapiUUID(),
		Body:      &CreateHostInviteRequest{},
	})
	require.NoError(t, err)
	assert.IsType(t, CreateHostInvite403JSONResponse{}, resp)
}

func TestCreateHostInvite_Success_201(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Weddings: &mockWeddingService{
			IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
				return true, nil
			},
		},
		HostInvites: &mockHostInviteService{
			CreateFn: func(_ context.Context, _ openapi_types.UUID, _ string) (*HostInvite, error) {
				return &HostInvite{}, nil
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.CreateHostInvite(ctx, CreateHostInviteRequestObject{
		WeddingId: testOpenapiUUID(),
		Body:      &CreateHostInviteRequest{},
	})
	require.NoError(t, err)
	assert.IsType(t, CreateHostInvite201JSONResponse{}, resp)
}

// ---------- GetHostInvite ----------

func TestGetHostInvite_Success_200(t *testing.T) {
	srv := &Server{
		HostInvites: &mockHostInviteService{
			GetByTokenFn: func(_ context.Context, _ string) (*HostInvitePublic, error) {
				return &HostInvitePublic{}, nil
			},
		},
	}
	resp, err := srv.GetHostInvite(context.Background(), GetHostInviteRequestObject{Token: "tok-1"})
	require.NoError(t, err)
	assert.IsType(t, GetHostInvite200JSONResponse{}, resp)
}

func TestGetHostInvite_NotFound_404(t *testing.T) {
	srv := &Server{
		HostInvites: &mockHostInviteService{
			GetByTokenFn: func(_ context.Context, _ string) (*HostInvitePublic, error) {
				return nil, ErrNotFound
			},
		},
	}
	resp, err := srv.GetHostInvite(context.Background(), GetHostInviteRequestObject{Token: "tok-x"})
	require.NoError(t, err)
	assert.IsType(t, GetHostInvite404JSONResponse{}, resp)
}

// ---------- AcceptHostInvite (에러 매핑이 핵심) ----------

func TestAcceptHostInvite_Unauthorized(t *testing.T) {
	srv := &Server{}
	resp, err := srv.AcceptHostInvite(context.Background(), AcceptHostInviteRequestObject{Token: "t"})
	require.NoError(t, err)
	assert.IsType(t, AcceptHostInvite401JSONResponse{}, resp)
}

func TestAcceptHostInvite_ErrorMapping(t *testing.T) {
	uid := testUUID()
	cases := []struct {
		name     string
		retErr   error
		wantType any
	}{
		{"not_found_404", ErrNotFound, AcceptHostInvite404JSONResponse{}},
		{"already_accepted_409", ErrAlreadyAccepted, AcceptHostInvite409JSONResponse{}},
		{"slot_taken_409", ErrSlotAlreadyTaken, AcceptHostInvite409JSONResponse{}},
		{"cannot_accept_own_400", ErrCannotAcceptOwn, AcceptHostInvite400JSONResponse{}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			srv := &Server{
				HostInvites: &mockHostInviteService{
					AcceptFn: func(_ context.Context, _ string, _ pgtype.UUID) (*HostInvite, error) {
						return nil, c.retErr
					},
				},
			}
			ctx := WithUserContext(context.Background(), uid)
			resp, err := srv.AcceptHostInvite(ctx, AcceptHostInviteRequestObject{Token: "t"})
			require.NoError(t, err)
			assert.IsType(t, c.wantType, resp)
		})
	}
}

func TestAcceptHostInvite_Success_200(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		HostInvites: &mockHostInviteService{
			AcceptFn: func(_ context.Context, _ string, _ pgtype.UUID) (*HostInvite, error) {
				return &HostInvite{}, nil
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.AcceptHostInvite(ctx, AcceptHostInviteRequestObject{Token: "t"})
	require.NoError(t, err)
	assert.IsType(t, AcceptHostInvite200JSONResponse{}, resp)
}

// ---------- CancelHostInvite ----------

func TestCancelHostInvite_Unauthorized(t *testing.T) {
	srv := &Server{}
	resp, err := srv.CancelHostInvite(context.Background(), CancelHostInviteRequestObject{
		WeddingId: testOpenapiUUID(),
		InviteId:  testOpenapiUUID(),
	})
	require.NoError(t, err)
	assert.IsType(t, CancelHostInvite401JSONResponse{}, resp)
}

func TestCancelHostInvite_NotHost_403(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Weddings: &mockWeddingService{
			IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
				return false, nil
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.CancelHostInvite(ctx, CancelHostInviteRequestObject{
		WeddingId: testOpenapiUUID(),
		InviteId:  testOpenapiUUID(),
	})
	require.NoError(t, err)
	assert.IsType(t, CancelHostInvite403JSONResponse{}, resp)
}

func TestCancelHostInvite_InviteNotFound_404(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Weddings: &mockWeddingService{
			IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
				return true, nil
			},
		},
		HostInvites: &mockHostInviteService{
			CancelFn: func(_ context.Context, _ openapi_types.UUID) error {
				return ErrNotFound
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.CancelHostInvite(ctx, CancelHostInviteRequestObject{
		WeddingId: testOpenapiUUID(),
		InviteId:  testOpenapiUUID(),
	})
	require.NoError(t, err)
	assert.IsType(t, CancelHostInvite404JSONResponse{}, resp)
}

func TestCancelHostInvite_Forbidden_400(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Weddings: &mockWeddingService{
			IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
				return true, nil
			},
		},
		HostInvites: &mockHostInviteService{
			CancelFn: func(_ context.Context, _ openapi_types.UUID) error {
				return ErrForbidden
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.CancelHostInvite(ctx, CancelHostInviteRequestObject{
		WeddingId: testOpenapiUUID(),
		InviteId:  testOpenapiUUID(),
	})
	require.NoError(t, err)
	assert.IsType(t, CancelHostInvite400JSONResponse{}, resp)
}

func TestCancelHostInvite_Success_204(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Weddings: &mockWeddingService{
			IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
				return true, nil
			},
		},
		HostInvites: &mockHostInviteService{
			CancelFn: func(_ context.Context, _ openapi_types.UUID) error {
				return nil
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.CancelHostInvite(ctx, CancelHostInviteRequestObject{
		WeddingId: testOpenapiUUID(),
		InviteId:  testOpenapiUUID(),
	})
	require.NoError(t, err)
	assert.IsType(t, CancelHostInvite204Response{}, resp)
}
