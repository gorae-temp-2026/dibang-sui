package api

import (
	"context"
	"testing"

	openapi_types "github.com/oapi-codegen/runtime/types"
)

// mockAdminMutations: 모든 메서드가 설정된 err를 반환. 핸들러의 에러→응답 매핑만 검증.
type mockAdminMutations struct {
	err      error
	lastCall string
}

func (m *mockAdminMutations) rec(name string) error { m.lastCall = name; return m.err }

func (m *mockAdminMutations) UpdateCashGift(_ context.Context, _ openapi_types.UUID, _ *UpdateAdminCashGiftRequest) error {
	return m.rec("UpdateCashGift")
}
func (m *mockAdminMutations) DeleteCashGift(_ context.Context, _ openapi_types.UUID) error {
	return m.rec("DeleteCashGift")
}
func (m *mockAdminMutations) UpdateRsvp(_ context.Context, _ openapi_types.UUID, _ *UpdateAdminRsvpRequest) error {
	return m.rec("UpdateRsvp")
}
func (m *mockAdminMutations) DeleteRsvp(_ context.Context, _ openapi_types.UUID) error {
	return m.rec("DeleteRsvp")
}
func (m *mockAdminMutations) UpdateHostInvite(_ context.Context, _ openapi_types.UUID, _ *UpdateAdminHostInviteRequest) error {
	return m.rec("UpdateHostInvite")
}
func (m *mockAdminMutations) DeleteHostInvite(_ context.Context, _ openapi_types.UUID) error {
	return m.rec("DeleteHostInvite")
}
func (m *mockAdminMutations) UpdateMemory(_ context.Context, _ openapi_types.UUID, _ *UpdateAdminMemoryRequest) error {
	return m.rec("UpdateMemory")
}
func (m *mockAdminMutations) DeleteMemory(_ context.Context, _ openapi_types.UUID) error {
	return m.rec("DeleteMemory")
}
func (m *mockAdminMutations) UpdateGuestbookMessage(_ context.Context, _ openapi_types.UUID, _ *UpdateAdminGuestbookMessageRequest) error {
	return m.rec("UpdateGuestbookMessage")
}
func (m *mockAdminMutations) DeleteGuestbookMessage(_ context.Context, _ openapi_types.UUID) error {
	return m.rec("DeleteGuestbookMessage")
}
func (m *mockAdminMutations) UpdateGuestbookEntry(_ context.Context, _ openapi_types.UUID, _ *UpdateAdminGuestbookEntryRequest) error {
	return m.rec("UpdateGuestbookEntry")
}
func (m *mockAdminMutations) DeleteGuestbookEntry(_ context.Context, _ openapi_types.UUID) error {
	return m.rec("DeleteGuestbookEntry")
}
func (m *mockAdminMutations) UpdateMobileInvitation(_ context.Context, _ openapi_types.UUID, _ *UpdateAdminMobileInvitationRequest) error {
	return m.rec("UpdateMobileInvitation")
}
func (m *mockAdminMutations) DeleteMobileInvitation(_ context.Context, _ openapi_types.UUID) error {
	return m.rec("DeleteMobileInvitation")
}
func (m *mockAdminMutations) UpdateUser(_ context.Context, _ openapi_types.UUID, _ *UpdateAdminUserRequest) error {
	return m.rec("UpdateUser")
}
func (m *mockAdminMutations) UpdateLounge(_ context.Context, _ openapi_types.UUID, _ *UpdateAdminLoungeRequest) error {
	return m.rec("UpdateLounge")
}
func (m *mockAdminMutations) UpdateWedding(_ context.Context, _ openapi_types.UUID, _ *UpdateAdminWeddingRequest) error {
	return m.rec("UpdateWedding")
}
func (m *mockAdminMutations) DeleteWedding(_ context.Context, _ openapi_types.UUID) error {
	return m.rec("DeleteWedding")
}
func (m *mockAdminMutations) DeleteMemoryBookPhoto(_ context.Context, _ openapi_types.UUID) error {
	return m.rec("DeleteMemoryBookPhoto")
}
func (m *mockAdminMutations) DeleteSharedPhoto(_ context.Context, _ openapi_types.UUID) error {
	return m.rec("DeleteSharedPhoto")
}
func (m *mockAdminMutations) DeleteLoungeCheckIn(_ context.Context, _ openapi_types.UUID) error {
	return m.rec("DeleteLoungeCheckIn")
}
func (m *mockAdminMutations) ClearWeddingHostSlot(_ context.Context, _ openapi_types.UUID, _ string) error {
	return m.rec("ClearWeddingHostSlot")
}
func (m *mockAdminMutations) CreateHostInvite(_ context.Context, _ openapi_types.UUID, _ string) (*HostInvite, error) {
	if err := m.rec("CreateHostInvite"); err != nil {
		return nil, err
	}
	return &HostInvite{Token: "mock-token"}, nil
}
func (m *mockAdminMutations) MoveWeddingHostSlot(_ context.Context, _ openapi_types.UUID, _, _ string) error {
	return m.rec("MoveWeddingHostSlot")
}

func adminSrv(err error) (*Server, *mockAdminMutations) {
	m := &mockAdminMutations{err: err}
	return &Server{AdminMutations: m}, m
}

// ── Update: 성공 204 / 본문없음 400 / 없음 404 / 검증 400 ──

func TestAdminUpdateCashGift_Success204(t *testing.T) {
	srv, _ := adminSrv(nil)
	resp, err := srv.AdminUpdateCashGift(context.Background(), AdminUpdateCashGiftRequestObject{
		Id: testOpenapiUUID(), Body: &UpdateAdminCashGiftRequest{},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(AdminUpdateCashGift204Response); !ok {
		t.Fatalf("expected 204, got %T", resp)
	}
}

func TestAdminUpdateCashGift_NilBody400(t *testing.T) {
	srv, _ := adminSrv(nil)
	resp, _ := srv.AdminUpdateCashGift(context.Background(), AdminUpdateCashGiftRequestObject{Id: testOpenapiUUID()})
	if _, ok := resp.(AdminUpdateCashGift400JSONResponse); !ok {
		t.Fatalf("expected 400, got %T", resp)
	}
}

func TestAdminUpdateCashGift_NotFound404(t *testing.T) {
	srv, _ := adminSrv(ErrNotFound)
	resp, _ := srv.AdminUpdateCashGift(context.Background(), AdminUpdateCashGiftRequestObject{
		Id: testOpenapiUUID(), Body: &UpdateAdminCashGiftRequest{},
	})
	if _, ok := resp.(AdminUpdateCashGift404JSONResponse); !ok {
		t.Fatalf("expected 404, got %T", resp)
	}
}

func TestAdminUpdateCashGift_Validation400(t *testing.T) {
	srv, _ := adminSrv(ErrValidation)
	resp, _ := srv.AdminUpdateCashGift(context.Background(), AdminUpdateCashGiftRequestObject{
		Id: testOpenapiUUID(), Body: &UpdateAdminCashGiftRequest{},
	})
	if _, ok := resp.(AdminUpdateCashGift400JSONResponse); !ok {
		t.Fatalf("expected 400, got %T", resp)
	}
}

// ── Delete: 성공 204 / 없음 404 ──

func TestAdminDeleteCashGift_Success204(t *testing.T) {
	srv, m := adminSrv(nil)
	resp, _ := srv.AdminDeleteCashGift(context.Background(), AdminDeleteCashGiftRequestObject{Id: testOpenapiUUID()})
	if _, ok := resp.(AdminDeleteCashGift204Response); !ok {
		t.Fatalf("expected 204, got %T", resp)
	}
	if m.lastCall != "DeleteCashGift" {
		t.Fatalf("service not called: %s", m.lastCall)
	}
}

func TestAdminDeleteCashGift_NotFound404(t *testing.T) {
	srv, _ := adminSrv(ErrNotFound)
	resp, _ := srv.AdminDeleteCashGift(context.Background(), AdminDeleteCashGiftRequestObject{Id: testOpenapiUUID()})
	if _, ok := resp.(AdminDeleteCashGift404JSONResponse); !ok {
		t.Fatalf("expected 404, got %T", resp)
	}
}

// ── 삭제 전용 (lounge_check_ins) ──

func TestAdminDeleteLoungeCheckIn_Success204(t *testing.T) {
	srv, _ := adminSrv(nil)
	resp, _ := srv.AdminDeleteLoungeCheckIn(context.Background(), AdminDeleteLoungeCheckInRequestObject{Id: testOpenapiUUID()})
	if _, ok := resp.(AdminDeleteLoungeCheckIn204Response); !ok {
		t.Fatalf("expected 204, got %T", resp)
	}
}

// ── 충돌 409: mobile invitation slug, user email ──

func TestAdminUpdateMobileInvitation_Conflict409(t *testing.T) {
	srv, _ := adminSrv(ErrConflict)
	resp, _ := srv.AdminUpdateMobileInvitation(context.Background(), AdminUpdateMobileInvitationRequestObject{
		Id: testOpenapiUUID(), Body: &UpdateAdminMobileInvitationRequest{},
	})
	if _, ok := resp.(AdminUpdateMobileInvitation409JSONResponse); !ok {
		t.Fatalf("expected 409, got %T", resp)
	}
}

func TestAdminUpdateUser_Conflict409(t *testing.T) {
	srv, m := adminSrv(ErrConflict)
	resp, _ := srv.AdminUpdateUser(context.Background(), AdminUpdateUserRequestObject{
		UserId: testOpenapiUUID(), Body: &UpdateAdminUserRequest{},
	})
	if _, ok := resp.(AdminUpdateUser409JSONResponse); !ok {
		t.Fatalf("expected 409, got %T", resp)
	}
	if m.lastCall != "UpdateUser" {
		t.Fatalf("service not called: %s", m.lastCall)
	}
}

// ── soft delete (wedding) 핸들러는 204 ──

func TestAdminDeleteWedding_Success204(t *testing.T) {
	srv, m := adminSrv(nil)
	resp, _ := srv.AdminDeleteWedding(context.Background(), AdminDeleteWeddingRequestObject{Id: testOpenapiUUID()})
	if _, ok := resp.(AdminDeleteWedding204Response); !ok {
		t.Fatalf("expected 204, got %T", resp)
	}
	if m.lastCall != "DeleteWedding" {
		t.Fatalf("service not called: %s", m.lastCall)
	}
}

// ── 호스트 슬롯 해제 핸들러: 204 / 잘못된 슬롯 400 / 없음 404 ──

func TestAdminClearWeddingHostSlot_Success204(t *testing.T) {
	srv, m := adminSrv(nil)
	resp, _ := srv.AdminClearWeddingHostSlot(context.Background(), AdminClearWeddingHostSlotRequestObject{
		Id: testOpenapiUUID(), Slot: AdminClearWeddingHostSlotParamsSlotGroom,
	})
	if _, ok := resp.(AdminClearWeddingHostSlot204Response); !ok {
		t.Fatalf("expected 204, got %T", resp)
	}
	if m.lastCall != "ClearWeddingHostSlot" {
		t.Fatalf("service not called: %s", m.lastCall)
	}
}

func TestAdminClearWeddingHostSlot_InvalidSlot400(t *testing.T) {
	srv, m := adminSrv(nil)
	resp, _ := srv.AdminClearWeddingHostSlot(context.Background(), AdminClearWeddingHostSlotRequestObject{
		Id: testOpenapiUUID(), Slot: "bogus",
	})
	if _, ok := resp.(AdminClearWeddingHostSlot400JSONResponse); !ok {
		t.Fatalf("expected 400, got %T", resp)
	}
	if m.lastCall != "" {
		t.Fatalf("잘못된 슬롯이면 service 호출 안 함, got %q", m.lastCall)
	}
}

func TestAdminClearWeddingHostSlot_NotFound404(t *testing.T) {
	srv, _ := adminSrv(ErrNotFound)
	resp, _ := srv.AdminClearWeddingHostSlot(context.Background(), AdminClearWeddingHostSlotRequestObject{
		Id: testOpenapiUUID(), Slot: AdminClearWeddingHostSlotParamsSlotBride,
	})
	if _, ok := resp.(AdminClearWeddingHostSlot404JSONResponse); !ok {
		t.Fatalf("expected 404, got %T", resp)
	}
}

// ── 호스트 초대 발급 핸들러: 201 / 본문없음 400 / 없음 404 ──

func TestAdminCreateHostInvite_Success201(t *testing.T) {
	srv, m := adminSrv(nil)
	resp, _ := srv.AdminCreateHostInvite(context.Background(), AdminCreateHostInviteRequestObject{
		Id: testOpenapiUUID(), Body: &AdminCreateHostInviteJSONRequestBody{Slot: "groom"},
	})
	if _, ok := resp.(AdminCreateHostInvite201JSONResponse); !ok {
		t.Fatalf("expected 201, got %T", resp)
	}
	if m.lastCall != "CreateHostInvite" {
		t.Fatalf("service not called: %s", m.lastCall)
	}
}

func TestAdminCreateHostInvite_NoBody400(t *testing.T) {
	srv, _ := adminSrv(nil)
	resp, _ := srv.AdminCreateHostInvite(context.Background(), AdminCreateHostInviteRequestObject{
		Id: testOpenapiUUID(), Body: nil,
	})
	if _, ok := resp.(AdminCreateHostInvite400JSONResponse); !ok {
		t.Fatalf("expected 400, got %T", resp)
	}
}

func TestAdminCreateHostInvite_NotFound404(t *testing.T) {
	srv, _ := adminSrv(ErrNotFound)
	resp, _ := srv.AdminCreateHostInvite(context.Background(), AdminCreateHostInviteRequestObject{
		Id: testOpenapiUUID(), Body: &AdminCreateHostInviteJSONRequestBody{Slot: "groom"},
	})
	if _, ok := resp.(AdminCreateHostInvite404JSONResponse); !ok {
		t.Fatalf("expected 404, got %T", resp)
	}
}

// 모든 핸들러의 성공/없음 분기를 일괄 호출해 매핑을 검증(커버리지 포함).
func TestAdminHandlers_AllResources(t *testing.T) {
	id := testOpenapiUUID()
	run := func(t *testing.T, mockErr error) {
		srv, _ := adminSrv(mockErr)
		ctx := context.Background()
		check := func(name string, resp any, err error) {
			if err != nil {
				t.Fatalf("%s: unexpected err %v", name, err)
			}
			if resp == nil {
				t.Fatalf("%s: nil resp", name)
			}
		}
		var r any
		var e error
		r, e = srv.AdminUpdateRsvp(ctx, AdminUpdateRsvpRequestObject{Id: id, Body: &UpdateAdminRsvpRequest{}})
		check("UpdateRsvp", r, e)
		r, e = srv.AdminDeleteRsvp(ctx, AdminDeleteRsvpRequestObject{Id: id})
		check("DeleteRsvp", r, e)
		r, e = srv.AdminUpdateHostInvite(ctx, AdminUpdateHostInviteRequestObject{Id: id, Body: &UpdateAdminHostInviteRequest{}})
		check("UpdateHostInvite", r, e)
		r, e = srv.AdminDeleteHostInvite(ctx, AdminDeleteHostInviteRequestObject{Id: id})
		check("DeleteHostInvite", r, e)
		r, e = srv.AdminUpdateMemory(ctx, AdminUpdateMemoryRequestObject{Id: id, Body: &UpdateAdminMemoryRequest{}})
		check("UpdateMemory", r, e)
		r, e = srv.AdminDeleteMemory(ctx, AdminDeleteMemoryRequestObject{Id: id})
		check("DeleteMemory", r, e)
		r, e = srv.AdminUpdateGuestbookMessage(ctx, AdminUpdateGuestbookMessageRequestObject{Id: id, Body: &UpdateAdminGuestbookMessageRequest{}})
		check("UpdateGuestbookMessage", r, e)
		r, e = srv.AdminDeleteGuestbookMessage(ctx, AdminDeleteGuestbookMessageRequestObject{Id: id})
		check("DeleteGuestbookMessage", r, e)
		r, e = srv.AdminUpdateGuestbookEntry(ctx, AdminUpdateGuestbookEntryRequestObject{Id: id, Body: &UpdateAdminGuestbookEntryRequest{}})
		check("UpdateGuestbookEntry", r, e)
		r, e = srv.AdminDeleteGuestbookEntry(ctx, AdminDeleteGuestbookEntryRequestObject{Id: id})
		check("DeleteGuestbookEntry", r, e)
		r, e = srv.AdminUpdateMobileInvitation(ctx, AdminUpdateMobileInvitationRequestObject{Id: id, Body: &UpdateAdminMobileInvitationRequest{}})
		check("UpdateMobileInvitation", r, e)
		r, e = srv.AdminDeleteMobileInvitation(ctx, AdminDeleteMobileInvitationRequestObject{Id: id})
		check("DeleteMobileInvitation", r, e)
		r, e = srv.AdminUpdateUser(ctx, AdminUpdateUserRequestObject{UserId: id, Body: &UpdateAdminUserRequest{}})
		check("UpdateUser", r, e)
		r, e = srv.AdminUpdateLounge(ctx, AdminUpdateLoungeRequestObject{Id: id, Body: &UpdateAdminLoungeRequest{}})
		check("UpdateLounge", r, e)
		r, e = srv.AdminUpdateWedding(ctx, AdminUpdateWeddingRequestObject{Id: id, Body: &UpdateAdminWeddingRequest{}})
		check("UpdateWedding", r, e)
		r, e = srv.AdminDeleteWedding(ctx, AdminDeleteWeddingRequestObject{Id: id})
		check("DeleteWedding", r, e)
		r, e = srv.AdminDeleteMemoryBookPhoto(ctx, AdminDeleteMemoryBookPhotoRequestObject{Id: id})
		check("DeleteMemoryBookPhoto", r, e)
		r, e = srv.AdminDeleteSharedPhoto(ctx, AdminDeleteSharedPhotoRequestObject{Id: id})
		check("DeleteSharedPhoto", r, e)
		r, e = srv.AdminDeleteLoungeCheckIn(ctx, AdminDeleteLoungeCheckInRequestObject{Id: id})
		check("DeleteLoungeCheckIn", r, e)
		r, e = srv.AdminClearWeddingHostSlot(ctx, AdminClearWeddingHostSlotRequestObject{Id: id, Slot: AdminClearWeddingHostSlotParamsSlotGroom})
		check("ClearWeddingHostSlot", r, e)
		r, e = srv.AdminCreateHostInvite(ctx, AdminCreateHostInviteRequestObject{Id: id, Body: &AdminCreateHostInviteJSONRequestBody{Slot: "groom"}})
		check("CreateHostInvite", r, e)
	}
	t.Run("success_204", func(t *testing.T) { run(t, nil) })
	t.Run("not_found_404", func(t *testing.T) { run(t, ErrNotFound) })
}

// ── MoveWeddingHostSlot: 성공 204 / 본문없음 400 / 대상 점유 409 / 없음 404 ──

func TestAdminMoveWeddingHostSlot_Success204(t *testing.T) {
	srv, m := adminSrv(nil)
	resp, _ := srv.AdminMoveWeddingHostSlot(context.Background(), AdminMoveWeddingHostSlotRequestObject{
		Id:   testOpenapiUUID(),
		Slot: AdminMoveWeddingHostSlotParamsSlotGroom,
		Body: &AdminMoveWeddingHostSlotJSONRequestBody{ToSlot: MoveHostSlotRequestToSlotGroomFather},
	})
	if _, ok := resp.(AdminMoveWeddingHostSlot204Response); !ok {
		t.Fatalf("expected 204, got %T", resp)
	}
	if m.lastCall != "MoveWeddingHostSlot" {
		t.Fatalf("expected MoveWeddingHostSlot call, got %q", m.lastCall)
	}
}

func TestAdminMoveWeddingHostSlot_MissingBody400(t *testing.T) {
	srv, _ := adminSrv(nil)
	resp, _ := srv.AdminMoveWeddingHostSlot(context.Background(), AdminMoveWeddingHostSlotRequestObject{
		Id: testOpenapiUUID(), Slot: AdminMoveWeddingHostSlotParamsSlotGroom, Body: nil,
	})
	if _, ok := resp.(AdminMoveWeddingHostSlot400JSONResponse); !ok {
		t.Fatalf("expected 400, got %T", resp)
	}
}

func TestAdminMoveWeddingHostSlot_Conflict409(t *testing.T) {
	srv, _ := adminSrv(ErrConflict)
	resp, _ := srv.AdminMoveWeddingHostSlot(context.Background(), AdminMoveWeddingHostSlotRequestObject{
		Id:   testOpenapiUUID(),
		Slot: AdminMoveWeddingHostSlotParamsSlotGroom,
		Body: &AdminMoveWeddingHostSlotJSONRequestBody{ToSlot: MoveHostSlotRequestToSlotBride},
	})
	if _, ok := resp.(AdminMoveWeddingHostSlot409JSONResponse); !ok {
		t.Fatalf("expected 409, got %T", resp)
	}
}

func TestAdminMoveWeddingHostSlot_NotFound404(t *testing.T) {
	srv, _ := adminSrv(ErrNotFound)
	resp, _ := srv.AdminMoveWeddingHostSlot(context.Background(), AdminMoveWeddingHostSlotRequestObject{
		Id:   testOpenapiUUID(),
		Slot: AdminMoveWeddingHostSlotParamsSlotGroom,
		Body: &AdminMoveWeddingHostSlotJSONRequestBody{ToSlot: MoveHostSlotRequestToSlotGroomFather},
	})
	if _, ok := resp.(AdminMoveWeddingHostSlot404JSONResponse); !ok {
		t.Fatalf("expected 404, got %T", resp)
	}
}
