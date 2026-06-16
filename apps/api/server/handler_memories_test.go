// handler_memories_test — 3 endpoint × (auth gate + 에러 매핑) 검증.
//
// 컨벤션: _code_convention/BACKEND_TESTING.md § 빠른 사이클(mock service).

package api

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgtype"
	openapi_types "github.com/oapi-codegen/runtime/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- Mock MemoryService ---

type mockMemoryService struct {
	CreateFn       func(ctx context.Context, loungeID openapi_types.UUID, authorUserID pgtype.UUID, text string, photoURL *string) (*Memory, error)
	ListByLoungeFn func(ctx context.Context, loungeID openapi_types.UUID, limit int32) ([]Memory, error)
	SoftDeleteFn   func(ctx context.Context, memoryID openapi_types.UUID, authorUserID pgtype.UUID) error
}

func (m *mockMemoryService) Create(ctx context.Context, loungeID openapi_types.UUID, authorUserID pgtype.UUID, text string, photoURL *string) (*Memory, error) {
	return m.CreateFn(ctx, loungeID, authorUserID, text, photoURL)
}
func (m *mockMemoryService) ListByLounge(ctx context.Context, loungeID openapi_types.UUID, limit int32) ([]Memory, error) {
	return m.ListByLoungeFn(ctx, loungeID, limit)
}
func (m *mockMemoryService) SoftDelete(ctx context.Context, memoryID openapi_types.UUID, authorUserID pgtype.UUID) error {
	return m.SoftDeleteFn(ctx, memoryID, authorUserID)
}

// ---------- CreateMemory ----------

func TestCreateMemory_Unauthorized(t *testing.T) {
	srv := &Server{}
	resp, err := srv.CreateMemory(context.Background(), CreateMemoryRequestObject{
		Body: &CreateMemoryRequest{},
	})
	require.NoError(t, err)
	assert.IsType(t, CreateMemory401JSONResponse{}, resp)
}

func TestCreateMemory_MissingBody_Error(t *testing.T) {
	uid := testUUID()
	srv := &Server{}
	ctx := WithUserContext(context.Background(), uid)
	_, err := srv.CreateMemory(ctx, CreateMemoryRequestObject{Body: nil})
	assert.Error(t, err)
}

func TestCreateMemory_Success_201(t *testing.T) {
	uid := testUUID()
	called := false
	srv := &Server{
		Memories: &mockMemoryService{
			CreateFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID, _ string, _ *string) (*Memory, error) {
				called = true
				return &Memory{}, nil
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.CreateMemory(ctx, CreateMemoryRequestObject{
		Body: &CreateMemoryRequest{LoungeId: testOpenapiUUID(), Text: "hi"},
	})
	require.NoError(t, err)
	assert.IsType(t, CreateMemory201JSONResponse{}, resp)
	assert.True(t, called)
}

// ---------- ListMemories ----------

func TestListMemories_Unauthorized(t *testing.T) {
	srv := &Server{}
	resp, err := srv.ListMemories(context.Background(), ListMemoriesRequestObject{
		LoungeId: testOpenapiUUID(),
	})
	require.NoError(t, err)
	assert.IsType(t, ListMemories401JSONResponse{}, resp)
}

func TestListMemories_DefaultLimit100(t *testing.T) {
	uid := testUUID()
	var captured int32
	srv := &Server{
		Memories: &mockMemoryService{
			ListByLoungeFn: func(_ context.Context, _ openapi_types.UUID, limit int32) ([]Memory, error) {
				captured = limit
				return []Memory{}, nil
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.ListMemories(ctx, ListMemoriesRequestObject{
		LoungeId: testOpenapiUUID(),
		Params:   ListMemoriesParams{Limit: nil},
	})
	require.NoError(t, err)
	assert.IsType(t, ListMemories200JSONResponse{}, resp)
	assert.Equal(t, int32(100), captured)
}

func TestListMemories_ExplicitLimit(t *testing.T) {
	uid := testUUID()
	var captured int32
	srv := &Server{
		Memories: &mockMemoryService{
			ListByLoungeFn: func(_ context.Context, _ openapi_types.UUID, limit int32) ([]Memory, error) {
				captured = limit
				return []Memory{}, nil
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	lim := 50
	resp, err := srv.ListMemories(ctx, ListMemoriesRequestObject{
		LoungeId: testOpenapiUUID(),
		Params:   ListMemoriesParams{Limit: &lim},
	})
	require.NoError(t, err)
	assert.IsType(t, ListMemories200JSONResponse{}, resp)
	assert.Equal(t, int32(50), captured)
}

// ---------- DeleteMemory ----------

func TestDeleteMemory_Unauthorized(t *testing.T) {
	srv := &Server{}
	resp, err := srv.DeleteMemory(context.Background(), DeleteMemoryRequestObject{
		MemoryId: testOpenapiUUID(),
	})
	require.NoError(t, err)
	assert.IsType(t, DeleteMemory401JSONResponse{}, resp)
}

func TestDeleteMemory_ErrorMapping(t *testing.T) {
	uid := testUUID()
	cases := []struct {
		name     string
		retErr   error
		wantType any
	}{
		{"not_found_404", ErrNotFound, DeleteMemory404JSONResponse{}},
		{"forbidden_403", ErrForbidden, DeleteMemory403JSONResponse{}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			srv := &Server{
				Memories: &mockMemoryService{
					SoftDeleteFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) error {
						return c.retErr
					},
				},
			}
			ctx := WithUserContext(context.Background(), uid)
			resp, err := srv.DeleteMemory(ctx, DeleteMemoryRequestObject{MemoryId: testOpenapiUUID()})
			require.NoError(t, err)
			assert.IsType(t, c.wantType, resp)
		})
	}
}

func TestDeleteMemory_Success_204(t *testing.T) {
	uid := testUUID()
	srv := &Server{
		Memories: &mockMemoryService{
			SoftDeleteFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) error {
				return nil
			},
		},
	}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.DeleteMemory(ctx, DeleteMemoryRequestObject{MemoryId: testOpenapiUUID()})
	require.NoError(t, err)
	assert.IsType(t, DeleteMemory204Response{}, resp)
}
