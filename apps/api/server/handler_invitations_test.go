// handler_invitations_test — 6 endpoint × auth/권한/에러 매핑 검증.
//
// 책임:
//   - GetInvitation: public, NotFound → 404.
//   - CreateInvitation: auth + IsHost + SlugConflict → 409.
//   - UpdateInvitation/DeleteInvitation: auth + IsHost + NotFound 매핑.
//   - DeleteInvitation: Forbidden(=마지막 invitation 보호) → 400.
//   - HeartInvitation: public, 에러는 그대로 전파.
//   - ShareInvitation: auth + IsHost + invitation NotFound.

package api

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgtype"
	openapi_types "github.com/oapi-codegen/runtime/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- Mock InvitationService ---

type mockInvitationService struct {
	GetBySlugFn        func(ctx context.Context, slug string) (*InvitationPublic, error)
	CreateFn           func(ctx context.Context, weddingID openapi_types.UUID, req *CreateInvitationRequest) (*Invitation, error)
	UpdateFn           func(ctx context.Context, invitationID openapi_types.UUID, req *UpdateInvitationRequest) (*Invitation, error)
	DeleteFn           func(ctx context.Context, weddingID openapi_types.UUID, invitationID openapi_types.UUID) error
	IncrementHeartFn   func(ctx context.Context, slug string) (int, error)
	GetShareLinkFn     func(ctx context.Context, invitationID openapi_types.UUID) (*ShareLinkResponse, error)
	ListByWeddingIDFn  func(ctx context.Context, weddingID pgtype.UUID) ([]InvitationSummary, error)
}

func (m *mockInvitationService) GetBySlug(ctx context.Context, slug string) (*InvitationPublic, error) {
	return m.GetBySlugFn(ctx, slug)
}
func (m *mockInvitationService) Create(ctx context.Context, weddingID openapi_types.UUID, req *CreateInvitationRequest) (*Invitation, error) {
	return m.CreateFn(ctx, weddingID, req)
}
func (m *mockInvitationService) Update(ctx context.Context, invitationID openapi_types.UUID, req *UpdateInvitationRequest) (*Invitation, error) {
	return m.UpdateFn(ctx, invitationID, req)
}
func (m *mockInvitationService) Delete(ctx context.Context, weddingID openapi_types.UUID, invitationID openapi_types.UUID) error {
	return m.DeleteFn(ctx, weddingID, invitationID)
}
func (m *mockInvitationService) IncrementHeart(ctx context.Context, slug string) (int, error) {
	return m.IncrementHeartFn(ctx, slug)
}
func (m *mockInvitationService) GetShareLink(ctx context.Context, invitationID openapi_types.UUID) (*ShareLinkResponse, error) {
	return m.GetShareLinkFn(ctx, invitationID)
}
func (m *mockInvitationService) ListByWeddingID(ctx context.Context, weddingID pgtype.UUID) ([]InvitationSummary, error) {
	return m.ListByWeddingIDFn(ctx, weddingID)
}

// ---------- GetInvitation (public, no auth) ----------

func TestGetInvitation_Success_200(t *testing.T) {
	srv := &Server{
		Invitations: &mockInvitationService{
			GetBySlugFn: func(_ context.Context, _ string) (*InvitationPublic, error) {
				return &InvitationPublic{}, nil
			},
		},
	}
	resp, err := srv.GetInvitation(context.Background(), GetInvitationRequestObject{Slug: "my-wed"})
	require.NoError(t, err)
	assert.IsType(t, GetInvitation200JSONResponse{}, resp)
}

func TestGetInvitation_NotFound_404(t *testing.T) {
	srv := &Server{
		Invitations: &mockInvitationService{
			GetBySlugFn: func(_ context.Context, _ string) (*InvitationPublic, error) {
				return nil, ErrNotFound
			},
		},
	}
	resp, err := srv.GetInvitation(context.Background(), GetInvitationRequestObject{Slug: "x"})
	require.NoError(t, err)
	assert.IsType(t, GetInvitation404JSONResponse{}, resp)
}

// ---------- CreateInvitation ----------

func TestCreateInvitation_Unauthorized(t *testing.T) {
	srv := &Server{}
	resp, err := srv.CreateInvitation(context.Background(), CreateInvitationRequestObject{
		WeddingId: testOpenapiUUID(),
		Body:      &CreateInvitationRequest{},
	})
	require.NoError(t, err)
	assert.IsType(t, CreateInvitation401JSONResponse{}, resp)
}

func TestCreateInvitation_WeddingNotFound_400(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Weddings: &mockWeddingService{
			IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
				return false, ErrNotFound
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.CreateInvitation(ctx, CreateInvitationRequestObject{
		WeddingId: testOpenapiUUID(),
		Body:      &CreateInvitationRequest{},
	})
	require.NoError(t, err)
	assert.IsType(t, CreateInvitation400JSONResponse{}, resp)
}

func TestCreateInvitation_NotHost_403(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Weddings: &mockWeddingService{
			IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
				return false, nil
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.CreateInvitation(ctx, CreateInvitationRequestObject{
		WeddingId: testOpenapiUUID(),
		Body:      &CreateInvitationRequest{},
	})
	require.NoError(t, err)
	assert.IsType(t, CreateInvitation403JSONResponse{}, resp)
}

func TestCreateInvitation_SlugConflict_409(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Weddings: &mockWeddingService{
			IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
				return true, nil
			},
		},
		Invitations: &mockInvitationService{
			CreateFn: func(_ context.Context, _ openapi_types.UUID, _ *CreateInvitationRequest) (*Invitation, error) {
				return nil, ErrSlugConflict
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.CreateInvitation(ctx, CreateInvitationRequestObject{
		WeddingId: testOpenapiUUID(),
		Body:      &CreateInvitationRequest{},
	})
	require.NoError(t, err)
	assert.IsType(t, CreateInvitation409JSONResponse{}, resp)
}

func TestCreateInvitation_Success_201(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Weddings: &mockWeddingService{
			IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
				return true, nil
			},
		},
		Invitations: &mockInvitationService{
			CreateFn: func(_ context.Context, _ openapi_types.UUID, _ *CreateInvitationRequest) (*Invitation, error) {
				return &Invitation{}, nil
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.CreateInvitation(ctx, CreateInvitationRequestObject{
		WeddingId: testOpenapiUUID(),
		Body:      &CreateInvitationRequest{},
	})
	require.NoError(t, err)
	assert.IsType(t, CreateInvitation201JSONResponse{}, resp)
}

// ---------- UpdateInvitation ----------

func TestUpdateInvitation_Unauthorized(t *testing.T) {
	srv := &Server{}
	resp, err := srv.UpdateInvitation(context.Background(), UpdateInvitationRequestObject{
		WeddingId:    testOpenapiUUID(),
		InvitationId: testOpenapiUUID(),
		Body:         &UpdateInvitationRequest{},
	})
	require.NoError(t, err)
	assert.IsType(t, UpdateInvitation401JSONResponse{}, resp)
}

func TestUpdateInvitation_WeddingNotFound_404(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Weddings: &mockWeddingService{
			IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
				return false, ErrNotFound
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.UpdateInvitation(ctx, UpdateInvitationRequestObject{
		WeddingId:    testOpenapiUUID(),
		InvitationId: testOpenapiUUID(),
		Body:         &UpdateInvitationRequest{},
	})
	require.NoError(t, err)
	assert.IsType(t, UpdateInvitation404JSONResponse{}, resp)
}

func TestUpdateInvitation_NotHost_403(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Weddings: &mockWeddingService{
			IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
				return false, nil
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.UpdateInvitation(ctx, UpdateInvitationRequestObject{
		WeddingId:    testOpenapiUUID(),
		InvitationId: testOpenapiUUID(),
		Body:         &UpdateInvitationRequest{},
	})
	require.NoError(t, err)
	assert.IsType(t, UpdateInvitation403JSONResponse{}, resp)
}

func TestUpdateInvitation_InvitationNotFound_404(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Weddings: &mockWeddingService{
			IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
				return true, nil
			},
		},
		Invitations: &mockInvitationService{
			UpdateFn: func(_ context.Context, _ openapi_types.UUID, _ *UpdateInvitationRequest) (*Invitation, error) {
				return nil, ErrNotFound
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.UpdateInvitation(ctx, UpdateInvitationRequestObject{
		WeddingId:    testOpenapiUUID(),
		InvitationId: testOpenapiUUID(),
		Body:         &UpdateInvitationRequest{},
	})
	require.NoError(t, err)
	assert.IsType(t, UpdateInvitation404JSONResponse{}, resp)
}

func TestUpdateInvitation_Success_200(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Weddings: &mockWeddingService{
			IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
				return true, nil
			},
		},
		Invitations: &mockInvitationService{
			UpdateFn: func(_ context.Context, _ openapi_types.UUID, _ *UpdateInvitationRequest) (*Invitation, error) {
				return &Invitation{}, nil
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.UpdateInvitation(ctx, UpdateInvitationRequestObject{
		WeddingId:    testOpenapiUUID(),
		InvitationId: testOpenapiUUID(),
		Body:         &UpdateInvitationRequest{},
	})
	require.NoError(t, err)
	assert.IsType(t, UpdateInvitation200JSONResponse{}, resp)
}

// ---------- DeleteInvitation ----------

func TestDeleteInvitation_LastInvitationForbidden_400(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Weddings: &mockWeddingService{
			IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
				return true, nil
			},
		},
		Invitations: &mockInvitationService{
			DeleteFn: func(_ context.Context, _ openapi_types.UUID, _ openapi_types.UUID) error {
				return ErrForbidden
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.DeleteInvitation(ctx, DeleteInvitationRequestObject{
		WeddingId:    testOpenapiUUID(),
		InvitationId: testOpenapiUUID(),
	})
	require.NoError(t, err)
	assert.IsType(t, DeleteInvitation400JSONResponse{}, resp)
}

func TestDeleteInvitation_Success_204(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Weddings: &mockWeddingService{
			IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
				return true, nil
			},
		},
		Invitations: &mockInvitationService{
			DeleteFn: func(_ context.Context, _ openapi_types.UUID, _ openapi_types.UUID) error {
				return nil
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.DeleteInvitation(ctx, DeleteInvitationRequestObject{
		WeddingId:    testOpenapiUUID(),
		InvitationId: testOpenapiUUID(),
	})
	require.NoError(t, err)
	assert.IsType(t, DeleteInvitation204Response{}, resp)
}

// ---------- HeartInvitation (public) ----------

func TestHeartInvitation_Success_200_HeartCount(t *testing.T) {
	srv := &Server{
		Invitations: &mockInvitationService{
			IncrementHeartFn: func(_ context.Context, _ string) (int, error) {
				return 42, nil
			},
		},
	}
	resp, err := srv.HeartInvitation(context.Background(), HeartInvitationRequestObject{Slug: "x"})
	require.NoError(t, err)
	r, ok := resp.(HeartInvitation200JSONResponse)
	require.True(t, ok)
	assert.Equal(t, 42, r.HeartCount)
}

func TestHeartInvitation_NotFound_PropagatesError(t *testing.T) {
	srv := &Server{
		Invitations: &mockInvitationService{
			IncrementHeartFn: func(_ context.Context, _ string) (int, error) {
				return 0, ErrNotFound
			},
		},
	}
	// 핸들러는 ErrNotFound도 그대로 err로 반환(현 코드 동작 — 별도 404 분기 없음)
	_, err := srv.HeartInvitation(context.Background(), HeartInvitationRequestObject{Slug: "x"})
	assert.Error(t, err)
}

// ---------- ShareInvitation ----------

func TestShareInvitation_Unauthorized(t *testing.T) {
	srv := &Server{}
	resp, err := srv.ShareInvitation(context.Background(), ShareInvitationRequestObject{
		WeddingId:    testOpenapiUUID(),
		InvitationId: testOpenapiUUID(),
	})
	require.NoError(t, err)
	assert.IsType(t, ShareInvitation401JSONResponse{}, resp)
}

func TestShareInvitation_InvitationNotFound_404(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Weddings: &mockWeddingService{
			IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
				return true, nil
			},
		},
		Invitations: &mockInvitationService{
			GetShareLinkFn: func(_ context.Context, _ openapi_types.UUID) (*ShareLinkResponse, error) {
				return nil, ErrNotFound
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.ShareInvitation(ctx, ShareInvitationRequestObject{
		WeddingId:    testOpenapiUUID(),
		InvitationId: testOpenapiUUID(),
	})
	require.NoError(t, err)
	assert.IsType(t, ShareInvitation404JSONResponse{}, resp)
}

func TestShareInvitation_Success_200(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Weddings: &mockWeddingService{
			IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
				return true, nil
			},
		},
		Invitations: &mockInvitationService{
			GetShareLinkFn: func(_ context.Context, _ openapi_types.UUID) (*ShareLinkResponse, error) {
				return &ShareLinkResponse{}, nil
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.ShareInvitation(ctx, ShareInvitationRequestObject{
		WeddingId:    testOpenapiUUID(),
		InvitationId: testOpenapiUUID(),
	})
	require.NoError(t, err)
	assert.IsType(t, ShareInvitation200JSONResponse{}, resp)
}
