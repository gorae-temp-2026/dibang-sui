// handler_mobile_invitation_photos_test — auth/permission 가드만 unit-test.
//
// 본 핸들러는 `db.New(s.Pool)` 직접 호출 + `userIsWeddingOwner`가 Pool에 의존.
// 200/201/409 success 분기는 **service 통합 테스트(로컬 Supabase 필요)** 단계로 보낸다.
//
// 여기서는 DB 미접근 path만 검증:
//   - UserIDFromContext nil → 401
//   - Pool=nil이면 userIsWeddingOwner=false → 403
//   - CreateMobileInvitationPhoto body=nil → 403 (현 코드 동작)

package api

import (
	"context"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestListMobileInvitationPhotos_Unauthorized(t *testing.T) {
	srv := &Server{}
	resp, err := srv.ListMobileInvitationPhotos(context.Background(), ListMobileInvitationPhotosRequestObject{
		WeddingId:    testOpenapiUUID(),
		InvitationId: testOpenapiUUID(),
	})
	require.NoError(t, err)
	assert.IsType(t, listMIP401{}, resp)

	rec := httptest.NewRecorder()
	require.NoError(t, resp.(listMIP401).VisitListMobileInvitationPhotosResponse(rec))
	assert.Equal(t, 401, rec.Code)
}

func TestListMobileInvitationPhotos_NotOwner_403(t *testing.T) {
	uid := testUUID()
	srv := &Server{} // Pool=nil → userIsWeddingOwner false
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.ListMobileInvitationPhotos(ctx, ListMobileInvitationPhotosRequestObject{
		WeddingId:    testOpenapiUUID(),
		InvitationId: testOpenapiUUID(),
	})
	require.NoError(t, err)
	assert.IsType(t, listMIP403{}, resp)

	rec := httptest.NewRecorder()
	require.NoError(t, resp.(listMIP403).VisitListMobileInvitationPhotosResponse(rec))
	assert.Equal(t, 403, rec.Code)
}

func TestCreateMobileInvitationPhoto_Unauthorized(t *testing.T) {
	srv := &Server{}
	resp, err := srv.CreateMobileInvitationPhoto(context.Background(), CreateMobileInvitationPhotoRequestObject{
		WeddingId:    testOpenapiUUID(),
		InvitationId: testOpenapiUUID(),
		Body:         &CreateMobileInvitationPhotoRequest{},
	})
	require.NoError(t, err)
	assert.IsType(t, createMIP401{}, resp)
}

func TestCreateMobileInvitationPhoto_NotOwner_403(t *testing.T) {
	uid := testUUID()
	srv := &Server{}
	ctx := WithUserContext(context.Background(), uid)
	resp, err := srv.CreateMobileInvitationPhoto(ctx, CreateMobileInvitationPhotoRequestObject{
		WeddingId:    testOpenapiUUID(),
		InvitationId: testOpenapiUUID(),
		Body:         &CreateMobileInvitationPhotoRequest{},
	})
	require.NoError(t, err)
	assert.IsType(t, createMIP403{}, resp)
}

// 409 conflict 응답 객체의 write는 단독 검증 가능 (DB 미접근).
func TestCreateMobileInvitationPhoto409_Write(t *testing.T) {
	rec := httptest.NewRecorder()
	require.NoError(t, createMIP409{}.VisitCreateMobileInvitationPhotoResponse(rec))
	assert.Equal(t, 409, rec.Code)
	assert.Equal(t, "application/json", rec.Header().Get("Content-Type"))
	assert.Contains(t, rec.Body.String(), "Conflict")
}
