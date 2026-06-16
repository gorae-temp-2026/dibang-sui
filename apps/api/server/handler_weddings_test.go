package api

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	openapi_types "github.com/oapi-codegen/runtime/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- Mock WeddingService ---

type mockWeddingService struct {
	CreateFn                    func(ctx context.Context, hostUserID pgtype.UUID, req *CreateWeddingRequest) (*Wedding, error)
	GetMyWeddingsFn             func(ctx context.Context, userID pgtype.UUID) ([]WeddingSummary, error)
	GetByIDFn                   func(ctx context.Context, id openapi_types.UUID) (*Wedding, error)
	IsHostFn                    func(ctx context.Context, weddingID openapi_types.UUID, userID pgtype.UUID) (bool, error)
	UpdateFn                    func(ctx context.Context, weddingID openapi_types.UUID, req *UpdateWeddingRequest) (*Wedding, error)
	GetMyParticipatedWeddingsFn func(ctx context.Context, userID pgtype.UUID) ([]ParticipatedWedding, error)
}

func (m *mockWeddingService) Create(ctx context.Context, hostUserID pgtype.UUID, req *CreateWeddingRequest) (*Wedding, error) {
	return m.CreateFn(ctx, hostUserID, req)
}

func (m *mockWeddingService) GetMyWeddings(ctx context.Context, userID pgtype.UUID) ([]WeddingSummary, error) {
	return m.GetMyWeddingsFn(ctx, userID)
}

func (m *mockWeddingService) GetByID(ctx context.Context, id openapi_types.UUID) (*Wedding, error) {
	return m.GetByIDFn(ctx, id)
}

func (m *mockWeddingService) IsHost(ctx context.Context, weddingID openapi_types.UUID, userID pgtype.UUID) (bool, error) {
	return m.IsHostFn(ctx, weddingID, userID)
}

func (m *mockWeddingService) Update(ctx context.Context, weddingID openapi_types.UUID, req *UpdateWeddingRequest) (*Wedding, error) {
	return m.UpdateFn(ctx, weddingID, req)
}

func (m *mockWeddingService) GetMyParticipatedWeddings(ctx context.Context, userID pgtype.UUID) ([]ParticipatedWedding, error) {
	return m.GetMyParticipatedWeddingsFn(ctx, userID)
}

// --- Helpers ---

func testUUID() pgtype.UUID {
	u := uuid.New()
	return pgtype.UUID{Bytes: u, Valid: true}
}

func testOpenapiUUID() openapi_types.UUID {
	return openapi_types.UUID(uuid.New())
}

func newTestServer(weddings WeddingService) *Server {
	return &Server{Weddings: weddings}
}

// ========================================
// #9: IsHost policy tests (handler level)
// ========================================

func TestUpdateWedding_Unauthorized(t *testing.T) {
	srv := newTestServer(&mockWeddingService{})
	resp, err := srv.UpdateWedding(context.Background(), UpdateWeddingRequestObject{
		WeddingId: testOpenapiUUID(),
		Body:      &UpdateWeddingRequest{},
	})
	require.NoError(t, err)
	assert.IsType(t, UpdateWedding401JSONResponse{}, resp)
}

func TestUpdateWedding_NotHost(t *testing.T) {
	uid := testUUID()
	wid := testOpenapiUUID()

	mock := &mockWeddingService{
		IsHostFn: func(ctx context.Context, weddingID openapi_types.UUID, userID pgtype.UUID) (bool, error) {
			return false, nil
		},
	}

	srv := newTestServer(mock)
	resp, err := srv.UpdateWedding(ctxWithUser(uid), UpdateWeddingRequestObject{
		WeddingId: wid,
		Body:      &UpdateWeddingRequest{},
	})
	require.NoError(t, err)
	assert.IsType(t, UpdateWedding403JSONResponse{}, resp)
}

func TestUpdateWedding_NotFound(t *testing.T) {
	uid := testUUID()
	wid := testOpenapiUUID()

	mock := &mockWeddingService{
		IsHostFn: func(ctx context.Context, weddingID openapi_types.UUID, userID pgtype.UUID) (bool, error) {
			return false, ErrNotFound
		},
	}

	srv := newTestServer(mock)
	resp, err := srv.UpdateWedding(ctxWithUser(uid), UpdateWeddingRequestObject{
		WeddingId: wid,
		Body:      &UpdateWeddingRequest{},
	})
	require.NoError(t, err)
	assert.IsType(t, UpdateWedding404JSONResponse{}, resp)
}

func TestUpdateWedding_Success(t *testing.T) {
	uid := testUUID()
	wid := testOpenapiUUID()
	newName := "Updated Groom"

	mock := &mockWeddingService{
		IsHostFn: func(ctx context.Context, weddingID openapi_types.UUID, userID pgtype.UUID) (bool, error) {
			return true, nil
		},
		UpdateFn: func(ctx context.Context, weddingID openapi_types.UUID, req *UpdateWeddingRequest) (*Wedding, error) {
			return &Wedding{
				Id:     wid,
				Status: "active",
				Info:   WeddingInfo{GroomName: newName, BrideName: "Bride"},
				Hosts:  HostSlots{},
				Lounge: LoungeSummary{},
				Invitations: []InvitationSummary{},
			}, nil
		},
	}

	srv := newTestServer(mock)
	resp, err := srv.UpdateWedding(ctxWithUser(uid), UpdateWeddingRequestObject{
		WeddingId: wid,
		Body:      &UpdateWeddingRequest{Info: &WeddingInfo{GroomName: newName}},
	})
	require.NoError(t, err)
	assert.IsType(t, UpdateWedding200JSONResponse{}, resp)
	assert.Equal(t, newName, resp.(UpdateWedding200JSONResponse).Info.GroomName)
}

// ========================================
// #10: GetWedding tests (handler level)
// ========================================

func TestGetWedding_Public_NoAuth(t *testing.T) {
	wid := testOpenapiUUID()

	mock := &mockWeddingService{
		GetByIDFn: func(ctx context.Context, id openapi_types.UUID) (*Wedding, error) {
			return &Wedding{
				Id:         wid,
				Status:     "active",
				Info:       WeddingInfo{GroomName: "Groom", BrideName: "Bride"},
				Hosts:      HostSlots{},
				Lounge:     LoungeSummary{},
				Invitations: []InvitationSummary{},
			}, nil
		},
	}

	srv := newTestServer(mock)
	// No user in context — getWedding is now public
	resp, err := srv.GetWedding(context.Background(), GetWeddingRequestObject{
		WeddingId: wid,
	})
	require.NoError(t, err)
	assert.IsType(t, GetWedding200JSONResponse{}, resp)
	assert.Equal(t, "Groom", resp.(GetWedding200JSONResponse).Info.GroomName)
}

func TestGetWedding_NotFound(t *testing.T) {
	mock := &mockWeddingService{
		GetByIDFn: func(ctx context.Context, id openapi_types.UUID) (*Wedding, error) {
			return nil, ErrNotFound
		},
	}

	srv := newTestServer(mock)
	resp, err := srv.GetWedding(context.Background(), GetWeddingRequestObject{
		WeddingId: testOpenapiUUID(),
	})
	require.NoError(t, err)
	assert.IsType(t, GetWedding404JSONResponse{}, resp)
}

func TestGetWedding_Success(t *testing.T) {
	wid := testOpenapiUUID()

	mock := &mockWeddingService{
		GetByIDFn: func(ctx context.Context, id openapi_types.UUID) (*Wedding, error) {
			return &Wedding{
				Id:         wid,
				Status:     "active",
				Info:       WeddingInfo{GroomName: "Groom", BrideName: "Bride"},
				Hosts:      HostSlots{},
				Lounge:     LoungeSummary{},
				Invitations: []InvitationSummary{},
			}, nil
		},
	}

	srv := newTestServer(mock)
	resp, err := srv.GetWedding(context.Background(), GetWeddingRequestObject{
		WeddingId: wid,
	})
	require.NoError(t, err)
	assert.IsType(t, GetWedding200JSONResponse{}, resp)
	assert.Equal(t, "Groom", resp.(GetWedding200JSONResponse).Info.GroomName)
}

// ========================================
// GetMyParticipatedWeddings tests (handler level)
// ========================================

func TestGetMyParticipatedWeddings_Unauthorized(t *testing.T) {
	srv := newTestServer(&mockWeddingService{})
	resp, err := srv.GetMyParticipatedWeddings(context.Background(), GetMyParticipatedWeddingsRequestObject{})
	require.NoError(t, err)
	assert.IsType(t, GetMyParticipatedWeddings401JSONResponse{}, resp)
}

func TestGetMyParticipatedWeddings_Empty(t *testing.T) {
	uid := testUUID()

	mock := &mockWeddingService{
		GetMyParticipatedWeddingsFn: func(ctx context.Context, userID pgtype.UUID) ([]ParticipatedWedding, error) {
			return []ParticipatedWedding{}, nil
		},
	}

	srv := newTestServer(mock)
	resp, err := srv.GetMyParticipatedWeddings(ctxWithUser(uid), GetMyParticipatedWeddingsRequestObject{})
	require.NoError(t, err)
	assert.IsType(t, GetMyParticipatedWeddings200JSONResponse{}, resp)
	assert.Len(t, resp.(GetMyParticipatedWeddings200JSONResponse), 0)
}

func TestGetMyParticipatedWeddings_Success(t *testing.T) {
	uid := testUUID()
	wid := testOpenapiUUID()
	lid := testOpenapiUUID()

	mock := &mockWeddingService{
		GetMyParticipatedWeddingsFn: func(ctx context.Context, userID pgtype.UUID) ([]ParticipatedWedding, error) {
			return []ParticipatedWedding{
				{
					Id:        wid,
					GroomName: "Groom",
					BrideName: "Bride",
					Date:      openapi_types.Date{},
					LoungeId:  lid,
				},
			}, nil
		},
	}

	srv := newTestServer(mock)
	resp, err := srv.GetMyParticipatedWeddings(ctxWithUser(uid), GetMyParticipatedWeddingsRequestObject{})
	require.NoError(t, err)
	assert.IsType(t, GetMyParticipatedWeddings200JSONResponse{}, resp)
	result := resp.(GetMyParticipatedWeddings200JSONResponse)
	assert.Len(t, result, 1)
	assert.Equal(t, "Groom", result[0].GroomName)
	assert.Equal(t, "Bride", result[0].BrideName)
	assert.Equal(t, lid, result[0].LoungeId)
}
