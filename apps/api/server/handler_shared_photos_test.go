// handler_shared_photos_test — auth/permission 가드만 unit-test.
//
// 본 핸들러는 `db.New(s.Pool)` 직접 호출 + `isLoungeHost`/`userIsLoungeEntrant`가 Pool에 의존.
// 200/201/quota 분기는 service 통합 테스트(로컬 Supabase 필요) 단계로 보낸다.

package api

import (
	"context"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestListSharedPhotos_Unauthorized(t *testing.T) {
	srv := &Server{}
	resp, err := srv.ListSharedPhotos(context.Background(), ListSharedPhotosRequestObject{
		LoungeId: testOpenapiUUID(),
	})
	require.NoError(t, err)
	assert.IsType(t, listSP401{}, resp)

	rec := httptest.NewRecorder()
	require.NoError(t, resp.(listSP401).VisitListSharedPhotosResponse(rec))
	assert.Equal(t, 401, rec.Code)
}

func TestListSharedPhotos_NotHostNotEntrant_403(t *testing.T) {
	uid := testUUID()
	srv := &Server{} // Pool=nil → isLoungeHost false, entrant 도 false
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.ListSharedPhotos(ctx, ListSharedPhotosRequestObject{LoungeId: testOpenapiUUID()})
	require.NoError(t, err)
	assert.IsType(t, listSP403{}, resp)
}

func TestCreateSharedPhoto_Unauthorized(t *testing.T) {
	srv := &Server{}
	resp, err := srv.CreateSharedPhoto(context.Background(), CreateSharedPhotoRequestObject{
		LoungeId: testOpenapiUUID(),
		Body:     &CreateSharedPhotoRequest{},
	})
	require.NoError(t, err)
	assert.IsType(t, createSP401{}, resp)
}

func TestCreateSharedPhoto_NotHostNotEntrant_403(t *testing.T) {
	uid := testUUID()
	srv := &Server{}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.CreateSharedPhoto(ctx, CreateSharedPhotoRequestObject{
		LoungeId: testOpenapiUUID(),
		Body:     &CreateSharedPhotoRequest{},
	})
	require.NoError(t, err)
	assert.IsType(t, createSP403{}, resp)
}

// 400 응답 객체 단독 검증
func TestCreateSharedPhoto400_Write(t *testing.T) {
	rec := httptest.NewRecorder()
	require.NoError(t, createSP400{detail: "test detail"}.VisitCreateSharedPhotoResponse(rec))
	assert.Equal(t, 400, rec.Code)
	assert.Equal(t, "application/json", rec.Header().Get("Content-Type"))
	assert.Contains(t, rec.Body.String(), "test detail")
}
