package api

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgtype"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

type mockSharedPhotoGroupsService struct {
	GetFn func(ctx context.Context, weddingID openapi_types.UUID) (*SharedPhotoGroupsResponse, error)
}

func (m *mockSharedPhotoGroupsService) Get(ctx context.Context, weddingID openapi_types.UUID) (*SharedPhotoGroupsResponse, error) {
	return m.GetFn(ctx, weddingID)
}

func newSharedPhotoGroupsTestServer(wed WeddingService, svc SharedPhotoGroupsService) *Server {
	return &Server{Weddings: wed, SharedPhotoGroups: svc}
}

func TestGetWeddingSharedPhotoGroups_Unauthenticated(t *testing.T) {
	srv := newSharedPhotoGroupsTestServer(nil, nil)
	resp, err := srv.GetWeddingSharedPhotoGroups(context.Background(), GetWeddingSharedPhotoGroupsRequestObject{
		WeddingId: testOpenapiUUID(),
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if _, ok := resp.(GetWeddingSharedPhotoGroups403JSONResponse); !ok {
		t.Fatalf("expected 403, got %T", resp)
	}
}

func TestGetWeddingSharedPhotoGroups_NotHost(t *testing.T) {
	wedMock := &mockWeddingService{
		IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
			return false, nil
		},
	}
	srv := newSharedPhotoGroupsTestServer(wedMock, nil)
	resp, err := srv.GetWeddingSharedPhotoGroups(ctxWithUser(testUserPg()), GetWeddingSharedPhotoGroupsRequestObject{
		WeddingId: testOpenapiUUID(),
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if _, ok := resp.(GetWeddingSharedPhotoGroups403JSONResponse); !ok {
		t.Fatalf("expected 403, got %T", resp)
	}
}

func TestGetWeddingSharedPhotoGroups_NotFound(t *testing.T) {
	wedMock := &mockWeddingService{
		IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
			return false, ErrNotFound
		},
	}
	srv := newSharedPhotoGroupsTestServer(wedMock, nil)
	resp, err := srv.GetWeddingSharedPhotoGroups(ctxWithUser(testUserPg()), GetWeddingSharedPhotoGroupsRequestObject{
		WeddingId: testOpenapiUUID(),
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if _, ok := resp.(GetWeddingSharedPhotoGroups404JSONResponse); !ok {
		t.Fatalf("expected 404, got %T", resp)
	}
}

func TestGetWeddingSharedPhotoGroups_EmptyGroups(t *testing.T) {
	wedMock := &mockWeddingService{
		IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
			return true, nil
		},
	}
	svcMock := &mockSharedPhotoGroupsService{
		GetFn: func(_ context.Context, _ openapi_types.UUID) (*SharedPhotoGroupsResponse, error) {
			return &SharedPhotoGroupsResponse{Groups: []SharedPhotoGroup{}}, nil
		},
	}
	srv := newSharedPhotoGroupsTestServer(wedMock, svcMock)
	resp, err := srv.GetWeddingSharedPhotoGroups(ctxWithUser(testUserPg()), GetWeddingSharedPhotoGroupsRequestObject{
		WeddingId: testOpenapiUUID(),
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	r, ok := resp.(GetWeddingSharedPhotoGroups200JSONResponse)
	if !ok {
		t.Fatalf("expected 200, got %T", resp)
	}
	if len(r.Groups) != 0 {
		t.Errorf("expected 0 groups, got %d", len(r.Groups))
	}
}

func TestGetWeddingSharedPhotoGroups_WithGroups(t *testing.T) {
	wedMock := &mockWeddingService{
		IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
			return true, nil
		},
	}
	groomSide := SharedPhotoGroupSide("groom")
	groomSlot := "groom_father"
	svcMock := &mockSharedPhotoGroupsService{
		GetFn: func(_ context.Context, _ openapi_types.UUID) (*SharedPhotoGroupsResponse, error) {
			return &SharedPhotoGroupsResponse{
				Groups: []SharedPhotoGroup{
					{
						UserId:        testOpenapiUUID(),
						GuestName:     "박철수",
						Side:          &groomSide,
						RecipientSlot: &groomSlot,
						Photos:        []SharedPhotoInGroup{{Id: testOpenapiUUID(), StoragePath: "p1"}, {Id: testOpenapiUUID(), StoragePath: "p2"}},
						PhotoCount:    2,
					},
				},
			}, nil
		},
	}
	srv := newSharedPhotoGroupsTestServer(wedMock, svcMock)
	resp, err := srv.GetWeddingSharedPhotoGroups(ctxWithUser(testUserPg()), GetWeddingSharedPhotoGroupsRequestObject{
		WeddingId: testOpenapiUUID(),
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	r, ok := resp.(GetWeddingSharedPhotoGroups200JSONResponse)
	if !ok {
		t.Fatalf("expected 200, got %T", resp)
	}
	if len(r.Groups) != 1 || r.Groups[0].GuestName != "박철수" || r.Groups[0].PhotoCount != 2 {
		t.Errorf("unexpected body: %+v", r.Groups)
	}
	if r.Groups[0].Side == nil || *r.Groups[0].Side != "groom" {
		t.Errorf("side mismatch: %+v", r.Groups[0].Side)
	}
}
