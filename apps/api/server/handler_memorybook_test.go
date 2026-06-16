package api

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgtype"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// ── mockMemoryBookService ─────────────────────────────────────────────────

type mockMemoryBookService struct {
	GetFn          func(ctx context.Context, weddingID openapi_types.UUID) (*MemoryBookResponse, error)
	ReplacePhotosFn func(ctx context.Context, weddingID openapi_types.UUID, photoIDs []openapi_types.UUID, userID pgtype.UUID) (*ReplaceMemoryBookPhotosResult, error)
}

func (m *mockMemoryBookService) Get(ctx context.Context, weddingID openapi_types.UUID) (*MemoryBookResponse, error) {
	return m.GetFn(ctx, weddingID)
}

func (m *mockMemoryBookService) ReplacePhotos(ctx context.Context, weddingID openapi_types.UUID, photoIDs []openapi_types.UUID, userID pgtype.UUID) (*ReplaceMemoryBookPhotosResult, error) {
	return m.ReplacePhotosFn(ctx, weddingID, photoIDs, userID)
}

func newMemoryBookTestServer(wed WeddingService, mb MemoryBookService) *Server {
	return &Server{Weddings: wed, MemoryBook: mb}
}

func testUserPg() pgtype.UUID {
	return pgtype.UUID{Bytes: testOpenapiUUID(), Valid: true}
}

// ── GetWeddingMemoryBook ──────────────────────────────────────────────────

func TestGetWeddingMemoryBook_Unauthenticated(t *testing.T) {
	srv := newMemoryBookTestServer(nil, nil)
	resp, err := srv.GetWeddingMemoryBook(context.Background(), GetWeddingMemoryBookRequestObject{
		WeddingId: testOpenapiUUID(),
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if _, ok := resp.(GetWeddingMemoryBook403JSONResponse); !ok {
		t.Fatalf("expected 403, got %T", resp)
	}
}

func TestGetWeddingMemoryBook_NotHost(t *testing.T) {
	wedID := testOpenapiUUID()
	userID := testUserPg()
	wedMock := &mockWeddingService{
		IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
			return false, nil
		},
	}
	srv := newMemoryBookTestServer(wedMock, nil)
	resp, err := srv.GetWeddingMemoryBook(ctxWithUser(userID), GetWeddingMemoryBookRequestObject{
		WeddingId: wedID,
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if _, ok := resp.(GetWeddingMemoryBook403JSONResponse); !ok {
		t.Fatalf("expected 403, got %T", resp)
	}
}

func TestGetWeddingMemoryBook_WeddingNotFound(t *testing.T) {
	wedID := testOpenapiUUID()
	wedMock := &mockWeddingService{
		IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
			return false, ErrNotFound
		},
	}
	srv := newMemoryBookTestServer(wedMock, nil)
	resp, err := srv.GetWeddingMemoryBook(ctxWithUser(testUserPg()), GetWeddingMemoryBookRequestObject{
		WeddingId: wedID,
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if _, ok := resp.(GetWeddingMemoryBook404JSONResponse); !ok {
		t.Fatalf("expected 404, got %T", resp)
	}
}

func TestGetWeddingMemoryBook_ReadyUncurated(t *testing.T) {
	wedID := testOpenapiUUID()
	wedMock := &mockWeddingService{
		IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
			return true, nil
		},
	}
	mbMock := &mockMemoryBookService{
		GetFn: func(_ context.Context, _ openapi_types.UUID) (*MemoryBookResponse, error) {
			return &MemoryBookResponse{
				Status: MemoryBookStatus("ready_uncurated"),
				Data: &MemoryBookData{
					CuratedPhotos: []MemoryBookPhoto{},
					DisplayPhotos: []string{},
					MecMessages:   []MemoryBookMessage{},
					Stats:         MemoryBookStats{},
				},
			}, nil
		},
	}
	srv := newMemoryBookTestServer(wedMock, mbMock)
	resp, err := srv.GetWeddingMemoryBook(ctxWithUser(testUserPg()), GetWeddingMemoryBookRequestObject{
		WeddingId: wedID,
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	r, ok := resp.(GetWeddingMemoryBook200JSONResponse)
	if !ok {
		t.Fatalf("expected 200, got %T", resp)
	}
	if r.Status != "ready_uncurated" {
		t.Errorf("expected status ready_uncurated, got %s", r.Status)
	}
}

func TestGetWeddingMemoryBook_Ready(t *testing.T) {
	wedID := testOpenapiUUID()
	wedMock := &mockWeddingService{
		IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
			return true, nil
		},
	}
	mbMock := &mockMemoryBookService{
		GetFn: func(_ context.Context, _ openapi_types.UUID) (*MemoryBookResponse, error) {
			return &MemoryBookResponse{
				Status: MemoryBookStatus("ready"),
				Data: &MemoryBookData{
					CuratedPhotos: []MemoryBookPhoto{{Id: testOpenapiUUID(), StoragePath: "p1"}},
					DisplayPhotos: []string{},
					MecMessages:   []MemoryBookMessage{},
					Stats:         MemoryBookStats{TotalGuests: 10, TotalMessages: 12, PhotosUploaded: 50},
				},
			}, nil
		},
	}
	srv := newMemoryBookTestServer(wedMock, mbMock)
	resp, err := srv.GetWeddingMemoryBook(ctxWithUser(testUserPg()), GetWeddingMemoryBookRequestObject{
		WeddingId: wedID,
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	r, ok := resp.(GetWeddingMemoryBook200JSONResponse)
	if !ok {
		t.Fatalf("expected 200, got %T", resp)
	}
	if r.Status != "ready" {
		t.Errorf("expected status ready, got %s", r.Status)
	}
	if len(r.Data.CuratedPhotos) != 1 || r.Data.Stats.TotalMessages != 12 {
		t.Errorf("response body content wrong: %+v", r.Data)
	}
}

// ── ReplaceWeddingMemoryBookPhotos ────────────────────────────────────────

func TestReplaceMemoryBookPhotos_Unauthenticated(t *testing.T) {
	srv := newMemoryBookTestServer(nil, nil)
	resp, err := srv.ReplaceWeddingMemoryBookPhotos(context.Background(), ReplaceWeddingMemoryBookPhotosRequestObject{
		WeddingId: testOpenapiUUID(),
		Body:      &ReplaceMemoryBookPhotosRequest{PhotoIds: []openapi_types.UUID{}},
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if _, ok := resp.(replaceMemoryBookPhotosForbiddenResp); !ok {
		t.Fatalf("expected 403, got %T", resp)
	}
}

func TestReplaceMemoryBookPhotos_NotHost(t *testing.T) {
	wedMock := &mockWeddingService{
		IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
			return false, nil
		},
	}
	srv := newMemoryBookTestServer(wedMock, nil)
	resp, err := srv.ReplaceWeddingMemoryBookPhotos(ctxWithUser(testUserPg()), ReplaceWeddingMemoryBookPhotosRequestObject{
		WeddingId: testOpenapiUUID(),
		Body:      &ReplaceMemoryBookPhotosRequest{PhotoIds: []openapi_types.UUID{}},
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if _, ok := resp.(replaceMemoryBookPhotosForbiddenResp); !ok {
		t.Fatalf("expected 403, got %T", resp)
	}
}

func TestReplaceMemoryBookPhotos_Over30(t *testing.T) {
	wedMock := &mockWeddingService{
		IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
			return true, nil
		},
	}
	ids := make([]openapi_types.UUID, 31)
	for i := range ids {
		ids[i] = testOpenapiUUID()
	}
	srv := newMemoryBookTestServer(wedMock, nil)
	resp, err := srv.ReplaceWeddingMemoryBookPhotos(ctxWithUser(testUserPg()), ReplaceWeddingMemoryBookPhotosRequestObject{
		WeddingId: testOpenapiUUID(),
		Body:      &ReplaceMemoryBookPhotosRequest{PhotoIds: ids},
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if _, ok := resp.(ReplaceWeddingMemoryBookPhotos400JSONResponse); !ok {
		t.Fatalf("expected 400, got %T", resp)
	}
}

func TestReplaceMemoryBookPhotos_InvalidIDs(t *testing.T) {
	wedMock := &mockWeddingService{
		IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
			return true, nil
		},
	}
	invalid := []openapi_types.UUID{testOpenapiUUID()}
	mbMock := &mockMemoryBookService{
		ReplacePhotosFn: func(_ context.Context, _ openapi_types.UUID, _ []openapi_types.UUID, _ pgtype.UUID) (*ReplaceMemoryBookPhotosResult, error) {
			return &ReplaceMemoryBookPhotosResult{Count: 0, InvalidIDs: invalid}, nil
		},
	}
	srv := newMemoryBookTestServer(wedMock, mbMock)
	resp, err := srv.ReplaceWeddingMemoryBookPhotos(ctxWithUser(testUserPg()), ReplaceWeddingMemoryBookPhotosRequestObject{
		WeddingId: testOpenapiUUID(),
		Body:      &ReplaceMemoryBookPhotosRequest{PhotoIds: []openapi_types.UUID{invalid[0]}},
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	r, ok := resp.(ReplaceWeddingMemoryBookPhotos400JSONResponse)
	if !ok {
		t.Fatalf("expected 400, got %T", resp)
	}
	if r.InvalidIds == nil || len(*r.InvalidIds) != 1 {
		t.Errorf("expected invalid_ids populated, got %+v", r.InvalidIds)
	}
}

func TestReplaceMemoryBookPhotos_Duplicate(t *testing.T) {
	wedMock := &mockWeddingService{
		IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
			return true, nil
		},
	}
	mbMock := &mockMemoryBookService{
		ReplacePhotosFn: func(_ context.Context, _ openapi_types.UUID, _ []openapi_types.UUID, _ pgtype.UUID) (*ReplaceMemoryBookPhotosResult, error) {
			return nil, ErrDuplicatePhotoID
		},
	}
	id := testOpenapiUUID()
	srv := newMemoryBookTestServer(wedMock, mbMock)
	resp, err := srv.ReplaceWeddingMemoryBookPhotos(ctxWithUser(testUserPg()), ReplaceWeddingMemoryBookPhotosRequestObject{
		WeddingId: testOpenapiUUID(),
		Body:      &ReplaceMemoryBookPhotosRequest{PhotoIds: []openapi_types.UUID{id, id}},
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if _, ok := resp.(ReplaceWeddingMemoryBookPhotos400JSONResponse); !ok {
		t.Fatalf("expected 400, got %T", resp)
	}
}

func TestReplaceMemoryBookPhotos_Success(t *testing.T) {
	wedMock := &mockWeddingService{
		IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
			return true, nil
		},
	}
	mbMock := &mockMemoryBookService{
		ReplacePhotosFn: func(_ context.Context, _ openapi_types.UUID, ids []openapi_types.UUID, _ pgtype.UUID) (*ReplaceMemoryBookPhotosResult, error) {
			return &ReplaceMemoryBookPhotosResult{Count: len(ids)}, nil
		},
	}
	srv := newMemoryBookTestServer(wedMock, mbMock)
	resp, err := srv.ReplaceWeddingMemoryBookPhotos(ctxWithUser(testUserPg()), ReplaceWeddingMemoryBookPhotosRequestObject{
		WeddingId: testOpenapiUUID(),
		Body:      &ReplaceMemoryBookPhotosRequest{PhotoIds: []openapi_types.UUID{testOpenapiUUID(), testOpenapiUUID(), testOpenapiUUID()}},
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	r, ok := resp.(ReplaceWeddingMemoryBookPhotos200JSONResponse)
	if !ok {
		t.Fatalf("expected 200, got %T", resp)
	}
	if !r.Ok || r.Count != 3 {
		t.Errorf("unexpected body: ok=%v count=%d", r.Ok, r.Count)
	}
}

func TestReplaceMemoryBookPhotos_EmptyArrayClearsAll(t *testing.T) {
	wedMock := &mockWeddingService{
		IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
			return true, nil
		},
	}
	called := false
	mbMock := &mockMemoryBookService{
		ReplacePhotosFn: func(_ context.Context, _ openapi_types.UUID, ids []openapi_types.UUID, _ pgtype.UUID) (*ReplaceMemoryBookPhotosResult, error) {
			called = true
			if len(ids) != 0 {
				t.Errorf("expected empty ids, got %d", len(ids))
			}
			return &ReplaceMemoryBookPhotosResult{Count: 0}, nil
		},
	}
	srv := newMemoryBookTestServer(wedMock, mbMock)
	resp, err := srv.ReplaceWeddingMemoryBookPhotos(ctxWithUser(testUserPg()), ReplaceWeddingMemoryBookPhotosRequestObject{
		WeddingId: testOpenapiUUID(),
		Body:      &ReplaceMemoryBookPhotosRequest{PhotoIds: []openapi_types.UUID{}},
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	r, ok := resp.(ReplaceWeddingMemoryBookPhotos200JSONResponse)
	if !ok {
		t.Fatalf("expected 200, got %T", resp)
	}
	if !called {
		t.Error("service ReplacePhotos not called (empty array should still trigger DELETE)")
	}
	if r.Count != 0 {
		t.Errorf("expected count 0, got %d", r.Count)
	}
}
