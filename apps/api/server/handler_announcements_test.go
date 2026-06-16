package api

import (
	"context"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// --- mock ---

type mockAnnouncementService struct {
	CreateFn                  func(ctx context.Context, loungeID openapi_types.UUID, hostID pgtype.UUID, req *CreateAnnouncementRequest) (*Announcement, error)
	ListFn                    func(ctx context.Context, loungeID openapi_types.UUID, cursor *string, limit int) ([]Announcement, bool, *string, error)
	GetByIDFn                 func(ctx context.Context, id openapi_types.UUID) (*Announcement, error)
	UpdateFn                  func(ctx context.Context, id openapi_types.UUID, req *UpdateAnnouncementRequest) (*Announcement, error)
	SoftDeleteFn              func(ctx context.Context, id openapi_types.UUID) error
	GetWeddingIDByLoungeIDFn  func(ctx context.Context, loungeID openapi_types.UUID) (openapi_types.UUID, error)
}

func (m *mockAnnouncementService) Create(ctx context.Context, loungeID openapi_types.UUID, hostID pgtype.UUID, req *CreateAnnouncementRequest) (*Announcement, error) {
	return m.CreateFn(ctx, loungeID, hostID, req)
}

func (m *mockAnnouncementService) List(ctx context.Context, loungeID openapi_types.UUID, cursor *string, limit int) ([]Announcement, bool, *string, error) {
	return m.ListFn(ctx, loungeID, cursor, limit)
}

func (m *mockAnnouncementService) GetByID(ctx context.Context, id openapi_types.UUID) (*Announcement, error) {
	return m.GetByIDFn(ctx, id)
}

func (m *mockAnnouncementService) Update(ctx context.Context, id openapi_types.UUID, req *UpdateAnnouncementRequest) (*Announcement, error) {
	return m.UpdateFn(ctx, id, req)
}

func (m *mockAnnouncementService) SoftDelete(ctx context.Context, id openapi_types.UUID) error {
	return m.SoftDeleteFn(ctx, id)
}

func (m *mockAnnouncementService) GetWeddingIDByLoungeID(ctx context.Context, loungeID openapi_types.UUID) (openapi_types.UUID, error) {
	return m.GetWeddingIDByLoungeIDFn(ctx, loungeID)
}

// helper to build test server with announcement + wedding mocks
func newAnnouncementTestServer(ann AnnouncementService, wed WeddingService) *Server {
	return &Server{Announcements: ann, Weddings: wed}
}

// ========================================
// ListAnnouncements
// ========================================

func TestListAnnouncements_Success(t *testing.T) {
	loungeID := testOpenapiUUID()
	now := time.Now()

	mock := &mockAnnouncementService{
		ListFn: func(ctx context.Context, lid openapi_types.UUID, cursor *string, limit int) ([]Announcement, bool, *string, error) {
			return []Announcement{
				{Id: testOpenapiUUID(), LoungeId: lid, Message: "hello", IsPinned: true, CreatedAt: now},
			}, false, nil, nil
		},
	}

	srv := newAnnouncementTestServer(mock, nil)
	resp, err := srv.ListAnnouncements(context.Background(), ListAnnouncementsRequestObject{
		LoungeId: loungeID,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	r, ok := resp.(ListAnnouncements200JSONResponse)
	if !ok {
		t.Fatalf("expected 200 response, got %T", resp)
	}
	if len(r.Data) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(r.Data))
	}
}

// ========================================
// CreateAnnouncement
// ========================================

func TestCreateAnnouncement_Unauthorized(t *testing.T) {
	srv := newAnnouncementTestServer(&mockAnnouncementService{}, nil)
	resp, err := srv.CreateAnnouncement(context.Background(), CreateAnnouncementRequestObject{
		LoungeId: testOpenapiUUID(),
		Body:     &CreateAnnouncementRequest{Message: "test"},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(CreateAnnouncement401JSONResponse); !ok {
		t.Fatalf("expected 401, got %T", resp)
	}
}

func TestCreateAnnouncement_NotHost(t *testing.T) {
	uid := testUUID()
	loungeID := testOpenapiUUID()
	weddingID := testOpenapiUUID()

	annMock := &mockAnnouncementService{
		GetWeddingIDByLoungeIDFn: func(ctx context.Context, lid openapi_types.UUID) (openapi_types.UUID, error) {
			return weddingID, nil
		},
	}

	wedMock := &mockWeddingService{
		IsHostFn: func(ctx context.Context, wid openapi_types.UUID, userID pgtype.UUID) (bool, error) {
			return false, nil
		},
	}

	srv := newAnnouncementTestServer(annMock, wedMock)
	ctx := ctxWithUser(uid)

	resp, err := srv.CreateAnnouncement(ctx, CreateAnnouncementRequestObject{
		LoungeId: loungeID,
		Body:     &CreateAnnouncementRequest{Message: "test"},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(CreateAnnouncement403JSONResponse); !ok {
		t.Fatalf("expected 403, got %T", resp)
	}
}

func TestCreateAnnouncement_LoungeNotFound(t *testing.T) {
	uid := testUUID()
	loungeID := testOpenapiUUID()

	annMock := &mockAnnouncementService{
		GetWeddingIDByLoungeIDFn: func(ctx context.Context, lid openapi_types.UUID) (openapi_types.UUID, error) {
			return openapi_types.UUID{}, ErrNotFound
		},
	}

	srv := newAnnouncementTestServer(annMock, nil)
	ctx := ctxWithUser(uid)

	resp, err := srv.CreateAnnouncement(ctx, CreateAnnouncementRequestObject{
		LoungeId: loungeID,
		Body:     &CreateAnnouncementRequest{Message: "test"},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(CreateAnnouncement404JSONResponse); !ok {
		t.Fatalf("expected 404, got %T", resp)
	}
}

func TestCreateAnnouncement_Success(t *testing.T) {
	uid := testUUID()
	loungeID := testOpenapiUUID()
	weddingID := testOpenapiUUID()
	now := time.Now()

	annMock := &mockAnnouncementService{
		GetWeddingIDByLoungeIDFn: func(ctx context.Context, lid openapi_types.UUID) (openapi_types.UUID, error) {
			return weddingID, nil
		},
		CreateFn: func(ctx context.Context, lid openapi_types.UUID, hostID pgtype.UUID, req *CreateAnnouncementRequest) (*Announcement, error) {
			return &Announcement{
				Id:        testOpenapiUUID(),
				LoungeId:  lid,
				HostId:    uuidToOpenapi(hostID),
				Message:   req.Message,
				IsPinned:  false,
				CreatedAt: now,
			}, nil
		},
	}

	wedMock := &mockWeddingService{
		IsHostFn: func(ctx context.Context, wid openapi_types.UUID, userID pgtype.UUID) (bool, error) {
			return true, nil
		},
	}

	srv := newAnnouncementTestServer(annMock, wedMock)
	ctx := ctxWithUser(uid)

	resp, err := srv.CreateAnnouncement(ctx, CreateAnnouncementRequestObject{
		LoungeId: loungeID,
		Body:     &CreateAnnouncementRequest{Message: "hello world"},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	r, ok := resp.(CreateAnnouncement201JSONResponse)
	if !ok {
		t.Fatalf("expected 201, got %T", resp)
	}
	if r.Message != "hello world" {
		t.Fatalf("expected message 'hello world', got %q", r.Message)
	}
}

// ========================================
// DeleteAnnouncement
// ========================================

func TestDeleteAnnouncement_Unauthorized(t *testing.T) {
	srv := newAnnouncementTestServer(&mockAnnouncementService{}, nil)
	resp, err := srv.DeleteAnnouncement(context.Background(), DeleteAnnouncementRequestObject{
		AnnouncementId: testOpenapiUUID(),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(DeleteAnnouncement401JSONResponse); !ok {
		t.Fatalf("expected 401, got %T", resp)
	}
}

func TestDeleteAnnouncement_NotFound(t *testing.T) {
	uid := testUUID()

	annMock := &mockAnnouncementService{
		GetByIDFn: func(ctx context.Context, id openapi_types.UUID) (*Announcement, error) {
			return nil, ErrNotFound
		},
	}

	srv := newAnnouncementTestServer(annMock, nil)
	ctx := ctxWithUser(uid)

	resp, err := srv.DeleteAnnouncement(ctx, DeleteAnnouncementRequestObject{
		AnnouncementId: testOpenapiUUID(),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(DeleteAnnouncement404JSONResponse); !ok {
		t.Fatalf("expected 404, got %T", resp)
	}
}

func TestDeleteAnnouncement_Forbidden(t *testing.T) {
	uid := testUUID()
	annID := testOpenapiUUID()
	loungeID := testOpenapiUUID()
	weddingID := testOpenapiUUID()

	annMock := &mockAnnouncementService{
		GetByIDFn: func(ctx context.Context, id openapi_types.UUID) (*Announcement, error) {
			return &Announcement{Id: annID, LoungeId: loungeID, HostId: testOpenapiUUID()}, nil
		},
		GetWeddingIDByLoungeIDFn: func(ctx context.Context, lid openapi_types.UUID) (openapi_types.UUID, error) {
			return weddingID, nil
		},
	}

	wedMock := &mockWeddingService{
		IsHostFn: func(ctx context.Context, wid openapi_types.UUID, userID pgtype.UUID) (bool, error) {
			return false, nil
		},
	}

	srv := newAnnouncementTestServer(annMock, wedMock)
	ctx := ctxWithUser(uid)

	resp, err := srv.DeleteAnnouncement(ctx, DeleteAnnouncementRequestObject{
		AnnouncementId: annID,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(DeleteAnnouncement403JSONResponse); !ok {
		t.Fatalf("expected 403, got %T", resp)
	}
}

func TestDeleteAnnouncement_Success(t *testing.T) {
	uid := testUUID()
	annID := testOpenapiUUID()
	loungeID := testOpenapiUUID()
	weddingID := testOpenapiUUID()

	annMock := &mockAnnouncementService{
		GetByIDFn: func(ctx context.Context, id openapi_types.UUID) (*Announcement, error) {
			return &Announcement{Id: annID, LoungeId: loungeID, HostId: uuidToOpenapi(uid)}, nil
		},
		GetWeddingIDByLoungeIDFn: func(ctx context.Context, lid openapi_types.UUID) (openapi_types.UUID, error) {
			return weddingID, nil
		},
		SoftDeleteFn: func(ctx context.Context, id openapi_types.UUID) error {
			return nil
		},
	}

	wedMock := &mockWeddingService{
		IsHostFn: func(ctx context.Context, wid openapi_types.UUID, userID pgtype.UUID) (bool, error) {
			return true, nil
		},
	}

	srv := newAnnouncementTestServer(annMock, wedMock)
	ctx := ctxWithUser(uid)

	resp, err := srv.DeleteAnnouncement(ctx, DeleteAnnouncementRequestObject{
		AnnouncementId: annID,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(DeleteAnnouncement204Response); !ok {
		t.Fatalf("expected 204, got %T", resp)
	}
}

// ========================================
// UpdateAnnouncement
// ========================================

func TestUpdateAnnouncement_Unauthorized(t *testing.T) {
	srv := newAnnouncementTestServer(&mockAnnouncementService{}, nil)
	msg := "updated"
	resp, err := srv.UpdateAnnouncement(context.Background(), UpdateAnnouncementRequestObject{
		AnnouncementId: testOpenapiUUID(),
		Body:           &UpdateAnnouncementRequest{Message: &msg},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(UpdateAnnouncement401JSONResponse); !ok {
		t.Fatalf("expected 401, got %T", resp)
	}
}

func TestUpdateAnnouncement_NotFound(t *testing.T) {
	uid := testUUID()

	annMock := &mockAnnouncementService{
		GetByIDFn: func(ctx context.Context, id openapi_types.UUID) (*Announcement, error) {
			return nil, ErrNotFound
		},
	}

	srv := newAnnouncementTestServer(annMock, nil)
	ctx := ctxWithUser(uid)
	msg := "updated"

	resp, err := srv.UpdateAnnouncement(ctx, UpdateAnnouncementRequestObject{
		AnnouncementId: testOpenapiUUID(),
		Body:           &UpdateAnnouncementRequest{Message: &msg},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(UpdateAnnouncement404JSONResponse); !ok {
		t.Fatalf("expected 404, got %T", resp)
	}
}

func TestUpdateAnnouncement_Forbidden(t *testing.T) {
	uid := testUUID()
	annID := testOpenapiUUID()
	loungeID := testOpenapiUUID()
	weddingID := testOpenapiUUID()

	annMock := &mockAnnouncementService{
		GetByIDFn: func(ctx context.Context, id openapi_types.UUID) (*Announcement, error) {
			return &Announcement{Id: annID, LoungeId: loungeID, HostId: testOpenapiUUID()}, nil
		},
		GetWeddingIDByLoungeIDFn: func(ctx context.Context, lid openapi_types.UUID) (openapi_types.UUID, error) {
			return weddingID, nil
		},
	}

	wedMock := &mockWeddingService{
		IsHostFn: func(ctx context.Context, wid openapi_types.UUID, userID pgtype.UUID) (bool, error) {
			return false, nil
		},
	}

	srv := newAnnouncementTestServer(annMock, wedMock)
	ctx := ctxWithUser(uid)
	msg := "updated"

	resp, err := srv.UpdateAnnouncement(ctx, UpdateAnnouncementRequestObject{
		AnnouncementId: annID,
		Body:           &UpdateAnnouncementRequest{Message: &msg},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(UpdateAnnouncement403JSONResponse); !ok {
		t.Fatalf("expected 403, got %T", resp)
	}
}

func TestUpdateAnnouncement_Success(t *testing.T) {
	uid := testUUID()
	annID := testOpenapiUUID()
	loungeID := testOpenapiUUID()
	weddingID := testOpenapiUUID()
	now := time.Now()
	msg := "updated message"

	annMock := &mockAnnouncementService{
		GetByIDFn: func(ctx context.Context, id openapi_types.UUID) (*Announcement, error) {
			return &Announcement{Id: annID, LoungeId: loungeID, HostId: uuidToOpenapi(uid)}, nil
		},
		GetWeddingIDByLoungeIDFn: func(ctx context.Context, lid openapi_types.UUID) (openapi_types.UUID, error) {
			return weddingID, nil
		},
		UpdateFn: func(ctx context.Context, id openapi_types.UUID, req *UpdateAnnouncementRequest) (*Announcement, error) {
			return &Announcement{
				Id:        annID,
				LoungeId:  loungeID,
				HostId:    uuidToOpenapi(uid),
				Message:   *req.Message,
				IsPinned:  false,
				CreatedAt: now,
				UpdatedAt: &now,
			}, nil
		},
	}

	wedMock := &mockWeddingService{
		IsHostFn: func(ctx context.Context, wid openapi_types.UUID, userID pgtype.UUID) (bool, error) {
			return true, nil
		},
	}

	srv := newAnnouncementTestServer(annMock, wedMock)
	ctx := ctxWithUser(uid)

	resp, err := srv.UpdateAnnouncement(ctx, UpdateAnnouncementRequestObject{
		AnnouncementId: annID,
		Body:           &UpdateAnnouncementRequest{Message: &msg},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	r, ok := resp.(UpdateAnnouncement200JSONResponse)
	if !ok {
		t.Fatalf("expected 200, got %T", resp)
	}
	if r.Message != "updated message" {
		t.Fatalf("expected message 'updated message', got %q", r.Message)
	}
}
