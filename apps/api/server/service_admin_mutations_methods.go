package api

import (
	"context"
	"encoding/json"
	"fmt"

	"gorae-api/db"

	"github.com/jackc/pgx/v5/pgtype"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// AdminMutationService: /admin/* 의 수정·삭제. 권한은 AdminGuard 미들웨어가 보장.
// 응답 본문은 FE가 Supabase로 재조회하므로 성공/실패(도메인 에러)만 반환.
type AdminMutationService interface {
	UpdateCashGift(ctx context.Context, id openapi_types.UUID, req *UpdateAdminCashGiftRequest) error
	DeleteCashGift(ctx context.Context, id openapi_types.UUID) error
	UpdateRsvp(ctx context.Context, id openapi_types.UUID, req *UpdateAdminRsvpRequest) error
	DeleteRsvp(ctx context.Context, id openapi_types.UUID) error
	UpdateHostInvite(ctx context.Context, id openapi_types.UUID, req *UpdateAdminHostInviteRequest) error
	DeleteHostInvite(ctx context.Context, id openapi_types.UUID) error
	UpdateMemory(ctx context.Context, id openapi_types.UUID, req *UpdateAdminMemoryRequest) error
	DeleteMemory(ctx context.Context, id openapi_types.UUID) error // soft
	UpdateGuestbookMessage(ctx context.Context, id openapi_types.UUID, req *UpdateAdminGuestbookMessageRequest) error
	DeleteGuestbookMessage(ctx context.Context, id openapi_types.UUID) error
	UpdateGuestbookEntry(ctx context.Context, id openapi_types.UUID, req *UpdateAdminGuestbookEntryRequest) error
	DeleteGuestbookEntry(ctx context.Context, id openapi_types.UUID) error
	UpdateMobileInvitation(ctx context.Context, id openapi_types.UUID, req *UpdateAdminMobileInvitationRequest) error
	DeleteMobileInvitation(ctx context.Context, id openapi_types.UUID) error
	UpdateUser(ctx context.Context, id openapi_types.UUID, req *UpdateAdminUserRequest) error
	UpdateLounge(ctx context.Context, id openapi_types.UUID, req *UpdateAdminLoungeRequest) error
	UpdateWedding(ctx context.Context, id openapi_types.UUID, req *UpdateAdminWeddingRequest) error
	DeleteWedding(ctx context.Context, id openapi_types.UUID) error                            // soft (status='deleted')
	ClearWeddingHostSlot(ctx context.Context, weddingID openapi_types.UUID, slot string) error                  // host_*_id=NULL + 같은 슬롯 accepted 초대 정리
	MoveWeddingHostSlot(ctx context.Context, weddingID openapi_types.UUID, fromSlot, toSlot string) error        // host_<from>_id→빈 host_<to>_id + 같은 슬롯 accepted 초대 함께 이동
	CreateHostInvite(ctx context.Context, weddingID openapi_types.UUID, slot string) (*HostInvite, error)        // 호스트 초대 발급 (201+token)
	DeleteMemoryBookPhoto(ctx context.Context, id openapi_types.UUID) error
	DeleteSharedPhoto(ctx context.Context, id openapi_types.UUID) error
	DeleteLoungeCheckIn(ctx context.Context, id openapi_types.UUID) error
}

var _ AdminMutationService = (*adminMutationService)(nil)

// ──────────── CashGifts ────────────

func (s *adminMutationService) UpdateCashGift(ctx context.Context, id openapi_types.UUID, req *UpdateAdminCashGiftRequest) error {
	rows, err := db.New(s.pool).AdminUpdateCashGift(ctx, db.AdminUpdateCashGiftParams{
		ID:               pgUUID(id),
		GuestName:        textFromPtr(req.GuestName),
		Amount:           int4FromPtr(req.Amount),
		RecipientSlot:    textFromPtr((*string)(req.RecipientSlot)),
		RelationCategory: textFromPtr(req.RelationCategory),
		RelationDetail:   textFromPtr(req.RelationDetail),
		PayMethod:        textFromPtr((*string)(req.PayMethod)),
	})
	return s.finishMutation(ctx, rows, err, auditOf("update", "cash_gift", id, req, "PATCH", "/admin/cash-gifts/"))
}

func (s *adminMutationService) DeleteCashGift(ctx context.Context, id openapi_types.UUID) error {
	rows, err := db.New(s.pool).AdminDeleteCashGift(ctx, pgUUID(id))
	return s.finishMutation(ctx, rows, err, auditOf("delete", "cash_gift", id, nil, "DELETE", "/admin/cash-gifts/"))
}

// ──────────── Rsvps ────────────

func (s *adminMutationService) UpdateRsvp(ctx context.Context, id openapi_types.UUID, req *UpdateAdminRsvpRequest) error {
	rows, err := db.New(s.pool).AdminUpdateRsvp(ctx, db.AdminUpdateRsvpParams{
		ID:             pgUUID(id),
		GuestName:      textFromPtr(req.GuestName),
		Attendance:     textFromPtr((*string)(req.Attendance)),
		CompanionCount: int4FromPtr(req.CompanionCount),
		Meal:           textFromPtr((*string)(req.Meal)),
		RecipientSlot:  textFromPtr((*string)(req.RecipientSlot)),
		PhoneLast4:     textFromPtr(req.PhoneLast4),
	})
	return s.finishMutation(ctx, rows, err, auditOf("update", "rsvp", id, req, "PATCH", "/admin/rsvps/"))
}

func (s *adminMutationService) DeleteRsvp(ctx context.Context, id openapi_types.UUID) error {
	rows, err := db.New(s.pool).AdminDeleteRsvp(ctx, pgUUID(id))
	return s.finishMutation(ctx, rows, err, auditOf("delete", "rsvp", id, nil, "DELETE", "/admin/rsvps/"))
}

// ──────────── HostInvites ────────────

func (s *adminMutationService) UpdateHostInvite(ctx context.Context, id openapi_types.UUID, req *UpdateAdminHostInviteRequest) error {
	rows, err := db.New(s.pool).AdminUpdateHostInvite(ctx, db.AdminUpdateHostInviteParams{
		ID:     pgUUID(id),
		Status: textFromPtr((*string)(req.Status)),
	})
	return s.finishMutation(ctx, rows, err, auditOf("update", "host_invite", id, req, "PATCH", "/admin/host-invites/"))
}

func (s *adminMutationService) DeleteHostInvite(ctx context.Context, id openapi_types.UUID) error {
	rows, err := db.New(s.pool).AdminDeleteHostInvite(ctx, pgUUID(id))
	return s.finishMutation(ctx, rows, err, auditOf("delete", "host_invite", id, nil, "DELETE", "/admin/host-invites/"))
}

// ──────────── Memories (soft delete) ────────────

func (s *adminMutationService) UpdateMemory(ctx context.Context, id openapi_types.UUID, req *UpdateAdminMemoryRequest) error {
	rows, err := db.New(s.pool).AdminUpdateMemory(ctx, db.AdminUpdateMemoryParams{
		ID:   pgUUID(id),
		Text: textFromPtr(req.Text),
	})
	return s.finishMutation(ctx, rows, err, auditOf("update", "memory", id, req, "PATCH", "/admin/memories/"))
}

func (s *adminMutationService) DeleteMemory(ctx context.Context, id openapi_types.UUID) error {
	rows, err := db.New(s.pool).AdminSoftDeleteMemory(ctx, pgUUID(id))
	return s.finishMutation(ctx, rows, err, auditOf("soft_delete", "memory", id, nil, "DELETE", "/admin/memories/"))
}

// ──────────── GuestbookMessages ────────────

func (s *adminMutationService) UpdateGuestbookMessage(ctx context.Context, id openapi_types.UUID, req *UpdateAdminGuestbookMessageRequest) error {
	rows, err := db.New(s.pool).AdminUpdateGuestbookMessage(ctx, db.AdminUpdateGuestbookMessageParams{
		ID:      pgUUID(id),
		Message: textFromPtr(req.Message),
	})
	return s.finishMutation(ctx, rows, err, auditOf("update", "guestbook_message", id, req, "PATCH", "/admin/guestbook-messages/"))
}

func (s *adminMutationService) DeleteGuestbookMessage(ctx context.Context, id openapi_types.UUID) error {
	rows, err := db.New(s.pool).AdminDeleteGuestbookMessage(ctx, pgUUID(id))
	return s.finishMutation(ctx, rows, err, auditOf("delete", "guestbook_message", id, nil, "DELETE", "/admin/guestbook-messages/"))
}

// ──────────── GuestbookEntries (cascade messages) ────────────

func (s *adminMutationService) UpdateGuestbookEntry(ctx context.Context, id openapi_types.UUID, req *UpdateAdminGuestbookEntryRequest) error {
	rows, err := db.New(s.pool).AdminUpdateGuestbookEntry(ctx, db.AdminUpdateGuestbookEntryParams{
		ID:               pgUUID(id),
		GuestName:        textFromPtr(req.GuestName),
		RecipientSlot:    textFromPtr((*string)(req.RecipientSlot)),
		RelationCategory: textFromPtr(req.RelationCategory),
		RelationDetail:   textFromPtr(req.RelationDetail),
	})
	return s.finishMutation(ctx, rows, err, auditOf("update", "guestbook_entry", id, req, "PATCH", "/admin/guestbook-entries/"))
}

func (s *adminMutationService) DeleteGuestbookEntry(ctx context.Context, id openapi_types.UUID) error {
	rows, err := db.New(s.pool).AdminDeleteGuestbookEntry(ctx, pgUUID(id))
	return s.finishMutation(ctx, rows, err, auditOf("delete", "guestbook_entry", id, nil, "DELETE", "/admin/guestbook-entries/"))
}

// ──────────── MobileInvitations (cascade photos, slug unique) ────────────

func (s *adminMutationService) UpdateMobileInvitation(ctx context.Context, id openapi_types.UUID, req *UpdateAdminMobileInvitationRequest) error {
	rows, err := db.New(s.pool).AdminUpdateMobileInvitation(ctx, db.AdminUpdateMobileInvitationParams{
		ID:               pgUUID(id),
		CustomMessage:    textFromPtr(req.CustomMessage),
		DesignTemplateID: textFromPtr(req.DesignTemplateId),
		Slug:             textFromPtr(req.Slug),
		CoverImage:       textFromPtr(req.CoverImage),
	})
	return s.finishMutation(ctx, rows, err, auditOf("update", "mobile_invitation", id, req, "PATCH", "/admin/mobile-invitations/"))
}

func (s *adminMutationService) DeleteMobileInvitation(ctx context.Context, id openapi_types.UUID) error {
	rows, err := db.New(s.pool).AdminDeleteMobileInvitation(ctx, pgUUID(id))
	return s.finishMutation(ctx, rows, err, auditOf("delete", "mobile_invitation", id, nil, "DELETE", "/admin/mobile-invitations/"))
}

// ──────────── Users (수정만, email unique) ────────────

func (s *adminMutationService) UpdateUser(ctx context.Context, id openapi_types.UUID, req *UpdateAdminUserRequest) error {
	rows, err := db.New(s.pool).AdminUpdateUser(ctx, db.AdminUpdateUserParams{
		ID:              pgUUID(id),
		Name:            textFromPtr(req.Name),
		Phone:           textFromPtr(req.Phone),
		Email:           textFromPtr((*string)(req.Email)),
		ProfileImageUrl: textFromPtr(req.ProfileImageUrl),
	})
	return s.finishMutation(ctx, rows, err, auditOf("update", "user", id, req, "PATCH", "/admin/users/"))
}

// ──────────── WeddingLounges (수정만) ────────────

func (s *adminMutationService) UpdateLounge(ctx context.Context, id openapi_types.UUID, req *UpdateAdminLoungeRequest) error {
	rows, err := db.New(s.pool).AdminUpdateLounge(ctx, db.AdminUpdateLoungeParams{
		ID:   pgUUID(id),
		Name: textFromPtr(req.Name),
	})
	return s.finishMutation(ctx, rows, err, auditOf("update", "wedding_lounge", id, req, "PATCH", "/admin/wedding-lounges/"))
}

// ──────────── Weddings (수정 + soft delete) ────────────

func (s *adminMutationService) UpdateWedding(ctx context.Context, id openapi_types.UUID, req *UpdateAdminWeddingRequest) error {
	rows, err := db.New(s.pool).AdminUpdateWedding(ctx, db.AdminUpdateWeddingParams{
		ID:           pgUUID(id),
		GroomName:    textFromPtr(req.GroomName),
		BrideName:    textFromPtr(req.BrideName),
		Date:         dateFromPtr(req.Date),
		Time:         textFromPtr(req.Time),
		VenueName:    textFromPtr(req.VenueName),
		VenueAddress: textFromPtr(req.VenueAddress),
		VenueHall:    textFromPtr(req.VenueHall),
		Status:       textFromPtr((*string)(req.Status)),
	})
	return s.finishMutation(ctx, rows, err, auditOf("update", "wedding", id, req, "PATCH", "/admin/weddings/"))
}

func (s *adminMutationService) DeleteWedding(ctx context.Context, id openapi_types.UUID) error {
	rows, err := db.New(s.pool).AdminSoftDeleteWedding(ctx, pgUUID(id))
	return s.finishMutation(ctx, rows, err, auditOf("soft_delete", "wedding", id, nil, "DELETE", "/admin/weddings/"))
}

// hostSlotColumn: 슬롯 키 → v3_weddings의 host_*_id 컬럼명.
// 화이트리스트라 동적 컬럼명을 SQL에 끼워넣어도 주입 안전.
func hostSlotColumn(slot string) (string, bool) {
	switch slot {
	case "groom":
		return "host_groom_id", true
	case "bride":
		return "host_bride_id", true
	case "groom_father":
		return "host_groom_father_id", true
	case "groom_mother":
		return "host_groom_mother_id", true
	case "bride_father":
		return "host_bride_father_id", true
	case "bride_mother":
		return "host_bride_mother_id", true
	}
	return "", false
}

// ClearWeddingHostSlot: 지정 호스트 슬롯(host_*_id)을 NULL로 비우고, 같은 슬롯의 accepted 초대를
// 한 트랜잭션에서 정리한다. 슬롯이 이미 비어 있거나 웨딩이 없으면 ErrNotFound, 잘못된 슬롯이면 ErrValidation.
func (s *adminMutationService) ClearWeddingHostSlot(ctx context.Context, weddingID openapi_types.UUID, slot string) error {
	col, ok := hostSlotColumn(slot)
	if !ok {
		return ErrValidation
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// 1) 슬롯 비우기. 컬럼명은 화이트리스트를 거친 상수라 주입 안전.
	//    이미 NULL이거나 웨딩이 없으면 0행 → ErrNotFound.
	ct, err := tx.Exec(ctx,
		fmt.Sprintf(`UPDATE v3_weddings SET %s = NULL WHERE id = $1 AND %s IS NOT NULL`, col, col),
		pgUUID(weddingID))
	if err != nil {
		return mapPgError(err)
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}

	// 2) 같은 슬롯의 accepted 초대 정리(하드 삭제). 0행이어도 정상(생성 시 직접 채운 슬롯엔 초대 없음).
	if _, err := db.New(tx).AdminDeleteAcceptedHostInvitesBySlot(ctx, db.AdminDeleteAcceptedHostInvitesBySlotParams{
		WeddingID: pgUUID(weddingID),
		Slot:      slot,
	}); err != nil {
		return mapPgError(err)
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	// 3) 감사 로그(커밋 후). resource_id는 wedding, 변경 내용에 슬롯을 남긴다.
	changes, _ := json.Marshal(map[string]any{"slot": slot, "cleared": true})
	return s.audit.Record(ctx, AuditEntry{
		Action:        "clear_host_slot",
		ResourceType:  "wedding_host_slot",
		ResourceID:    weddingID.String(),
		Changes:       changes,
		RequestMethod: "DELETE",
		RequestPath:   "/admin/weddings/" + weddingID.String() + "/host-slots/" + slot,
	})
}

// MoveWeddingHostSlot: 출발 슬롯(host_<from>_id)의 호스트를 비어 있는 대상 슬롯(host_<to>_id)으로 옮기고,
// 같은 슬롯의 accepted 초대의 slot도 한 트랜잭션에서 변경한다(빈 슬롯만 허용 정책).
// 잘못된/동일 슬롯=ErrValidation, 출발이 비었거나 웨딩 없음=ErrNotFound, 대상이 이미 차 있음=ErrConflict.
func (s *adminMutationService) MoveWeddingHostSlot(ctx context.Context, weddingID openapi_types.UUID, fromSlot, toSlot string) error {
	fromCol, ok := hostSlotColumn(fromSlot)
	if !ok {
		return ErrValidation
	}
	toCol, ok := hostSlotColumn(toSlot)
	if !ok {
		return ErrValidation
	}
	if fromSlot == toSlot {
		return ErrValidation
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// 1) 출발/대상 슬롯의 현재 상태를 행 잠금(FOR UPDATE)으로 확인. 컬럼명은 화이트리스트 상수라 주입 안전.
	//    웨딩이 없으면 ErrNoRows → mapPgError가 ErrNotFound로 변환.
	var fromID, toID pgtype.UUID
	if err := tx.QueryRow(ctx,
		fmt.Sprintf(`SELECT %s, %s FROM v3_weddings WHERE id = $1 FOR UPDATE`, fromCol, toCol),
		pgUUID(weddingID)).Scan(&fromID, &toID); err != nil {
		return mapPgError(err)
	}
	if !fromID.Valid {
		return ErrNotFound // 옮길 호스트가 없음(출발 슬롯 비어 있음)
	}
	if toID.Valid {
		return ErrConflict // 대상 슬롯이 이미 차 있음(빈 슬롯만 허용)
	}

	// 2) 슬롯 이동: 대상에 출발 값 복사, 출발은 NULL.
	if _, err := tx.Exec(ctx,
		fmt.Sprintf(`UPDATE v3_weddings SET %s = %s, %s = NULL WHERE id = $1`, toCol, fromCol, fromCol),
		pgUUID(weddingID)); err != nil {
		return mapPgError(err)
	}

	// 3) 같은 슬롯의 accepted 초대도 대상 슬롯으로 이동(0행이어도 정상).
	if _, err := db.New(tx).AdminMoveAcceptedHostInvitesBySlot(ctx, db.AdminMoveAcceptedHostInvitesBySlotParams{
		ToSlot:    toSlot,
		WeddingID: pgUUID(weddingID),
		FromSlot:  fromSlot,
	}); err != nil {
		return mapPgError(err)
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	// 4) 감사 로그(커밋 후). resource_id는 wedding, 변경 내용에 출발/대상 슬롯을 남긴다.
	changes, _ := json.Marshal(map[string]any{"from": fromSlot, "to": toSlot})
	return s.audit.Record(ctx, AuditEntry{
		Action:        "move_host_slot",
		ResourceType:  "wedding_host_slot",
		ResourceID:    weddingID.String(),
		Changes:       changes,
		RequestMethod: "PATCH",
		RequestPath:   "/admin/weddings/" + weddingID.String() + "/host-slots/" + fromSlot,
	})
}

// CreateHostInvite: 호스트 초대 발급. slot 화이트리스트 검증 후 기존 hostInviteService.Create
// 재사용(같은 슬롯 pending 있으면 그 token 재사용). 발급 결과를 감사로그에 남기고 token 포함 반환.
func (s *adminMutationService) CreateHostInvite(ctx context.Context, weddingID openapi_types.UUID, slot string) (*HostInvite, error) {
	if _, ok := hostSlotColumn(slot); !ok {
		return nil, ErrValidation
	}
	inv, err := NewHostInviteService(s.pool).Create(ctx, weddingID, slot)
	if err != nil {
		return nil, mapPgError(err)
	}
	changes, _ := json.Marshal(map[string]any{"slot": slot, "token": inv.Token})
	if err := s.audit.Record(ctx, AuditEntry{
		Action:        "create_host_invite",
		ResourceType:  "host_invite",
		ResourceID:    inv.Id.String(),
		Changes:       changes,
		RequestMethod: "POST",
		RequestPath:   "/admin/weddings/" + weddingID.String() + "/host-invites",
	}); err != nil {
		return nil, err
	}
	return inv, nil
}

// ──────────── 삭제 전용 (memory_book_photos, shared_photos, lounge_check_ins) ────────────

func (s *adminMutationService) DeleteMemoryBookPhoto(ctx context.Context, id openapi_types.UUID) error {
	rows, err := db.New(s.pool).AdminDeleteMemoryBookPhoto(ctx, pgUUID(id))
	return s.finishMutation(ctx, rows, err, auditOf("delete", "memory_book_photo", id, nil, "DELETE", "/admin/memory-book-photos/"))
}

func (s *adminMutationService) DeleteSharedPhoto(ctx context.Context, id openapi_types.UUID) error {
	rows, err := db.New(s.pool).AdminDeleteSharedPhoto(ctx, pgUUID(id))
	return s.finishMutation(ctx, rows, err, auditOf("delete", "shared_photo", id, nil, "DELETE", "/admin/shared-photos/"))
}

func (s *adminMutationService) DeleteLoungeCheckIn(ctx context.Context, id openapi_types.UUID) error {
	rows, err := db.New(s.pool).AdminDeleteLoungeCheckIn(ctx, pgUUID(id))
	return s.finishMutation(ctx, rows, err, auditOf("delete", "lounge_check_in", id, nil, "DELETE", "/admin/lounge-check-ins/"))
}

// ──────────── 헬퍼 ────────────

func pgUUID(id openapi_types.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: id, Valid: true}
}

func int4FromPtr(v *int) pgtype.Int4 {
	if v == nil {
		return pgtype.Int4{}
	}
	return pgtype.Int4{Int32: int32(*v), Valid: true}
}

func dateFromPtr(d *openapi_types.Date) pgtype.Date {
	if d == nil {
		return pgtype.Date{}
	}
	return pgtype.Date{Time: d.Time, Valid: true}
}

// auditOf: 변경 페이로드(req)를 changes.after로 직렬화한 감사 엔트리 구성. req=nil이면 changes=NULL.
func auditOf(action, resourceType string, id openapi_types.UUID, req any, method, pathPrefix string) AuditEntry {
	var changes []byte
	if req != nil {
		if b, err := json.Marshal(map[string]any{"after": req}); err == nil {
			changes = b
		}
	}
	return AuditEntry{
		Action:        action,
		ResourceType:  resourceType,
		ResourceID:    id.String(),
		Changes:       changes,
		RequestMethod: method,
		RequestPath:   pathPrefix + id.String(),
	}
}
