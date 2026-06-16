package api

import (
	"context"
	"errors"
)

// Admin write 핸들러 (수정·삭제). 얇은 wrapper — AdminMutationService에 위임.
// 권한검증은 AdminGuard 미들웨어(/admin/* 이메일 allowlist)가 담당하므로 핸들러엔 없음.
// 응답: 성공 204 / 본문없음 400 / 없음 404 / unique충돌 409.

func conflict(detail string) ConflictJSONResponse {
	return ConflictJSONResponse{Type: "about:blank", Title: "Conflict", Status: 409, Detail: strPtr(detail)}
}

// ──────────── CashGifts ────────────

func (s *Server) AdminUpdateCashGift(ctx context.Context, req AdminUpdateCashGiftRequestObject) (AdminUpdateCashGiftResponseObject, error) {
	if req.Body == nil {
		return AdminUpdateCashGift400JSONResponse{badRequest("request body required")}, nil
	}
	switch err := s.AdminMutations.UpdateCashGift(ctx, req.Id, req.Body); {
	case err == nil:
		return AdminUpdateCashGift204Response{}, nil
	case errors.Is(err, ErrNotFound):
		return AdminUpdateCashGift404JSONResponse{notFound("cash gift not found")}, nil
	case errors.Is(err, ErrValidation):
		return AdminUpdateCashGift400JSONResponse{badRequest("invalid cash gift update")}, nil
	default:
		return nil, err
	}
}

func (s *Server) AdminDeleteCashGift(ctx context.Context, req AdminDeleteCashGiftRequestObject) (AdminDeleteCashGiftResponseObject, error) {
	switch err := s.AdminMutations.DeleteCashGift(ctx, req.Id); {
	case err == nil:
		return AdminDeleteCashGift204Response{}, nil
	case errors.Is(err, ErrNotFound):
		return AdminDeleteCashGift404JSONResponse{notFound("cash gift not found")}, nil
	default:
		return nil, err
	}
}

// ──────────── Rsvps ────────────

func (s *Server) AdminUpdateRsvp(ctx context.Context, req AdminUpdateRsvpRequestObject) (AdminUpdateRsvpResponseObject, error) {
	if req.Body == nil {
		return AdminUpdateRsvp400JSONResponse{badRequest("request body required")}, nil
	}
	switch err := s.AdminMutations.UpdateRsvp(ctx, req.Id, req.Body); {
	case err == nil:
		return AdminUpdateRsvp204Response{}, nil
	case errors.Is(err, ErrNotFound):
		return AdminUpdateRsvp404JSONResponse{notFound("rsvp not found")}, nil
	case errors.Is(err, ErrValidation):
		return AdminUpdateRsvp400JSONResponse{badRequest("invalid rsvp update")}, nil
	default:
		return nil, err
	}
}

func (s *Server) AdminDeleteRsvp(ctx context.Context, req AdminDeleteRsvpRequestObject) (AdminDeleteRsvpResponseObject, error) {
	switch err := s.AdminMutations.DeleteRsvp(ctx, req.Id); {
	case err == nil:
		return AdminDeleteRsvp204Response{}, nil
	case errors.Is(err, ErrNotFound):
		return AdminDeleteRsvp404JSONResponse{notFound("rsvp not found")}, nil
	default:
		return nil, err
	}
}

// ──────────── HostInvites ────────────

func (s *Server) AdminUpdateHostInvite(ctx context.Context, req AdminUpdateHostInviteRequestObject) (AdminUpdateHostInviteResponseObject, error) {
	if req.Body == nil {
		return AdminUpdateHostInvite400JSONResponse{badRequest("request body required")}, nil
	}
	switch err := s.AdminMutations.UpdateHostInvite(ctx, req.Id, req.Body); {
	case err == nil:
		return AdminUpdateHostInvite204Response{}, nil
	case errors.Is(err, ErrNotFound):
		return AdminUpdateHostInvite404JSONResponse{notFound("host invite not found")}, nil
	case errors.Is(err, ErrValidation):
		return AdminUpdateHostInvite400JSONResponse{badRequest("invalid host invite update")}, nil
	default:
		return nil, err
	}
}

func (s *Server) AdminDeleteHostInvite(ctx context.Context, req AdminDeleteHostInviteRequestObject) (AdminDeleteHostInviteResponseObject, error) {
	switch err := s.AdminMutations.DeleteHostInvite(ctx, req.Id); {
	case err == nil:
		return AdminDeleteHostInvite204Response{}, nil
	case errors.Is(err, ErrNotFound):
		return AdminDeleteHostInvite404JSONResponse{notFound("host invite not found")}, nil
	default:
		return nil, err
	}
}

// ──────────── Memories (soft delete) ────────────

func (s *Server) AdminUpdateMemory(ctx context.Context, req AdminUpdateMemoryRequestObject) (AdminUpdateMemoryResponseObject, error) {
	if req.Body == nil {
		return AdminUpdateMemory400JSONResponse{badRequest("request body required")}, nil
	}
	switch err := s.AdminMutations.UpdateMemory(ctx, req.Id, req.Body); {
	case err == nil:
		return AdminUpdateMemory204Response{}, nil
	case errors.Is(err, ErrNotFound):
		return AdminUpdateMemory404JSONResponse{notFound("memory not found")}, nil
	case errors.Is(err, ErrValidation):
		return AdminUpdateMemory400JSONResponse{badRequest("invalid memory update")}, nil
	default:
		return nil, err
	}
}

func (s *Server) AdminDeleteMemory(ctx context.Context, req AdminDeleteMemoryRequestObject) (AdminDeleteMemoryResponseObject, error) {
	switch err := s.AdminMutations.DeleteMemory(ctx, req.Id); {
	case err == nil:
		return AdminDeleteMemory204Response{}, nil
	case errors.Is(err, ErrNotFound):
		return AdminDeleteMemory404JSONResponse{notFound("memory not found")}, nil
	default:
		return nil, err
	}
}

// ──────────── GuestbookMessages ────────────

func (s *Server) AdminUpdateGuestbookMessage(ctx context.Context, req AdminUpdateGuestbookMessageRequestObject) (AdminUpdateGuestbookMessageResponseObject, error) {
	if req.Body == nil {
		return AdminUpdateGuestbookMessage400JSONResponse{badRequest("request body required")}, nil
	}
	switch err := s.AdminMutations.UpdateGuestbookMessage(ctx, req.Id, req.Body); {
	case err == nil:
		return AdminUpdateGuestbookMessage204Response{}, nil
	case errors.Is(err, ErrNotFound):
		return AdminUpdateGuestbookMessage404JSONResponse{notFound("guestbook message not found")}, nil
	case errors.Is(err, ErrValidation):
		return AdminUpdateGuestbookMessage400JSONResponse{badRequest("invalid guestbook message update")}, nil
	default:
		return nil, err
	}
}

func (s *Server) AdminDeleteGuestbookMessage(ctx context.Context, req AdminDeleteGuestbookMessageRequestObject) (AdminDeleteGuestbookMessageResponseObject, error) {
	switch err := s.AdminMutations.DeleteGuestbookMessage(ctx, req.Id); {
	case err == nil:
		return AdminDeleteGuestbookMessage204Response{}, nil
	case errors.Is(err, ErrNotFound):
		return AdminDeleteGuestbookMessage404JSONResponse{notFound("guestbook message not found")}, nil
	default:
		return nil, err
	}
}

// ──────────── GuestbookEntries (cascade messages) ────────────

func (s *Server) AdminUpdateGuestbookEntry(ctx context.Context, req AdminUpdateGuestbookEntryRequestObject) (AdminUpdateGuestbookEntryResponseObject, error) {
	if req.Body == nil {
		return AdminUpdateGuestbookEntry400JSONResponse{badRequest("request body required")}, nil
	}
	switch err := s.AdminMutations.UpdateGuestbookEntry(ctx, req.Id, req.Body); {
	case err == nil:
		return AdminUpdateGuestbookEntry204Response{}, nil
	case errors.Is(err, ErrNotFound):
		return AdminUpdateGuestbookEntry404JSONResponse{notFound("guestbook entry not found")}, nil
	case errors.Is(err, ErrValidation):
		return AdminUpdateGuestbookEntry400JSONResponse{badRequest("invalid guestbook entry update")}, nil
	default:
		return nil, err
	}
}

func (s *Server) AdminDeleteGuestbookEntry(ctx context.Context, req AdminDeleteGuestbookEntryRequestObject) (AdminDeleteGuestbookEntryResponseObject, error) {
	switch err := s.AdminMutations.DeleteGuestbookEntry(ctx, req.Id); {
	case err == nil:
		return AdminDeleteGuestbookEntry204Response{}, nil
	case errors.Is(err, ErrNotFound):
		return AdminDeleteGuestbookEntry404JSONResponse{notFound("guestbook entry not found")}, nil
	default:
		return nil, err
	}
}

// ──────────── MobileInvitations (slug unique → 409) ────────────

func (s *Server) AdminUpdateMobileInvitation(ctx context.Context, req AdminUpdateMobileInvitationRequestObject) (AdminUpdateMobileInvitationResponseObject, error) {
	if req.Body == nil {
		return AdminUpdateMobileInvitation400JSONResponse{badRequest("request body required")}, nil
	}
	// DB에는 object key만 저장 — 절대 URL은 정규화 (STORAGE.md, 양형식 수용)
	if req.Body.CoverImage != nil {
		k := s.storageKeyFromRef(*req.Body.CoverImage)
		req.Body.CoverImage = &k
	}
	switch err := s.AdminMutations.UpdateMobileInvitation(ctx, req.Id, req.Body); {
	case err == nil:
		return AdminUpdateMobileInvitation204Response{}, nil
	case errors.Is(err, ErrNotFound):
		return AdminUpdateMobileInvitation404JSONResponse{notFound("mobile invitation not found")}, nil
	case errors.Is(err, ErrConflict):
		return AdminUpdateMobileInvitation409JSONResponse{conflict("slug already exists")}, nil
	case errors.Is(err, ErrValidation):
		return AdminUpdateMobileInvitation400JSONResponse{badRequest("invalid mobile invitation update")}, nil
	default:
		return nil, err
	}
}

func (s *Server) AdminDeleteMobileInvitation(ctx context.Context, req AdminDeleteMobileInvitationRequestObject) (AdminDeleteMobileInvitationResponseObject, error) {
	switch err := s.AdminMutations.DeleteMobileInvitation(ctx, req.Id); {
	case err == nil:
		return AdminDeleteMobileInvitation204Response{}, nil
	case errors.Is(err, ErrNotFound):
		return AdminDeleteMobileInvitation404JSONResponse{notFound("mobile invitation not found")}, nil
	default:
		return nil, err
	}
}

// ──────────── Users (수정만, email unique → 409) ────────────

func (s *Server) AdminUpdateUser(ctx context.Context, req AdminUpdateUserRequestObject) (AdminUpdateUserResponseObject, error) {
	if req.Body == nil {
		return AdminUpdateUser400JSONResponse{badRequest("request body required")}, nil
	}
	switch err := s.AdminMutations.UpdateUser(ctx, req.UserId, req.Body); {
	case err == nil:
		return AdminUpdateUser204Response{}, nil
	case errors.Is(err, ErrNotFound):
		return AdminUpdateUser404JSONResponse{notFound("user not found")}, nil
	case errors.Is(err, ErrConflict):
		return AdminUpdateUser409JSONResponse{conflict("email already exists")}, nil
	case errors.Is(err, ErrValidation):
		return AdminUpdateUser400JSONResponse{badRequest("invalid user update")}, nil
	default:
		return nil, err
	}
}

// ──────────── WeddingLounges (수정만) ────────────

func (s *Server) AdminUpdateLounge(ctx context.Context, req AdminUpdateLoungeRequestObject) (AdminUpdateLoungeResponseObject, error) {
	if req.Body == nil {
		return AdminUpdateLounge400JSONResponse{badRequest("request body required")}, nil
	}
	switch err := s.AdminMutations.UpdateLounge(ctx, req.Id, req.Body); {
	case err == nil:
		return AdminUpdateLounge204Response{}, nil
	case errors.Is(err, ErrNotFound):
		return AdminUpdateLounge404JSONResponse{notFound("wedding lounge not found")}, nil
	case errors.Is(err, ErrValidation):
		return AdminUpdateLounge400JSONResponse{badRequest("invalid lounge update")}, nil
	default:
		return nil, err
	}
}

// ──────────── Weddings (수정 + soft delete) ────────────

func (s *Server) AdminUpdateWedding(ctx context.Context, req AdminUpdateWeddingRequestObject) (AdminUpdateWeddingResponseObject, error) {
	if req.Body == nil {
		return AdminUpdateWedding400JSONResponse{badRequest("request body required")}, nil
	}
	switch err := s.AdminMutations.UpdateWedding(ctx, req.Id, req.Body); {
	case err == nil:
		return AdminUpdateWedding204Response{}, nil
	case errors.Is(err, ErrNotFound):
		return AdminUpdateWedding404JSONResponse{notFound("wedding not found")}, nil
	case errors.Is(err, ErrValidation):
		return AdminUpdateWedding400JSONResponse{badRequest("invalid wedding update")}, nil
	default:
		return nil, err
	}
}

func (s *Server) AdminDeleteWedding(ctx context.Context, req AdminDeleteWeddingRequestObject) (AdminDeleteWeddingResponseObject, error) {
	switch err := s.AdminMutations.DeleteWedding(ctx, req.Id); {
	case err == nil:
		return AdminDeleteWedding204Response{}, nil
	case errors.Is(err, ErrNotFound):
		return AdminDeleteWedding404JSONResponse{notFound("wedding not found")}, nil
	default:
		return nil, err
	}
}

// AdminClearWeddingHostSlot: 호스트 슬롯 등록 해제 (host_*_id NULL + 같은 슬롯 accepted 초대 정리).
// slot enum은 oapi가 path에서 1차 검증하나, 방어적으로 Valid() 재확인.
func (s *Server) AdminClearWeddingHostSlot(ctx context.Context, req AdminClearWeddingHostSlotRequestObject) (AdminClearWeddingHostSlotResponseObject, error) {
	if !req.Slot.Valid() {
		return AdminClearWeddingHostSlot400JSONResponse{badRequest("invalid host slot")}, nil
	}
	switch err := s.AdminMutations.ClearWeddingHostSlot(ctx, req.Id, string(req.Slot)); {
	case err == nil:
		return AdminClearWeddingHostSlot204Response{}, nil
	case errors.Is(err, ErrNotFound):
		return AdminClearWeddingHostSlot404JSONResponse{notFound("host slot already empty or wedding not found")}, nil
	case errors.Is(err, ErrValidation):
		return AdminClearWeddingHostSlot400JSONResponse{badRequest("invalid host slot")}, nil
	default:
		return nil, err
	}
}

// AdminMoveWeddingHostSlot: 호스트 슬롯 이동(빈 대상 슬롯으로 + 수락 초대 함께 이동).
// 본문(to_slot) 필수. 출발/대상 slot은 oapi가 path/body에서 1차 검증하나 방어적으로 Valid() 재확인.
func (s *Server) AdminMoveWeddingHostSlot(ctx context.Context, req AdminMoveWeddingHostSlotRequestObject) (AdminMoveWeddingHostSlotResponseObject, error) {
	if req.Body == nil {
		return AdminMoveWeddingHostSlot400JSONResponse{badRequest("request body required")}, nil
	}
	if !req.Slot.Valid() || !req.Body.ToSlot.Valid() {
		return AdminMoveWeddingHostSlot400JSONResponse{badRequest("invalid host slot")}, nil
	}
	switch err := s.AdminMutations.MoveWeddingHostSlot(ctx, req.Id, string(req.Slot), string(req.Body.ToSlot)); {
	case err == nil:
		return AdminMoveWeddingHostSlot204Response{}, nil
	case errors.Is(err, ErrConflict):
		return AdminMoveWeddingHostSlot409JSONResponse{conflict("target host slot already occupied")}, nil
	case errors.Is(err, ErrNotFound):
		return AdminMoveWeddingHostSlot404JSONResponse{notFound("source host slot empty or wedding not found")}, nil
	case errors.Is(err, ErrValidation):
		return AdminMoveWeddingHostSlot400JSONResponse{badRequest("invalid host slot")}, nil
	default:
		return nil, err
	}
}

// AdminCreateHostInvite: 호스트 초대 발급. admin write 중 유일하게 201+본문(token)을 반환한다.
func (s *Server) AdminCreateHostInvite(ctx context.Context, req AdminCreateHostInviteRequestObject) (AdminCreateHostInviteResponseObject, error) {
	if req.Body == nil {
		return AdminCreateHostInvite400JSONResponse{badRequest("request body required")}, nil
	}
	switch inv, err := s.AdminMutations.CreateHostInvite(ctx, req.Id, string(req.Body.Slot)); {
	case err == nil:
		return AdminCreateHostInvite201JSONResponse(*inv), nil
	case errors.Is(err, ErrNotFound):
		return AdminCreateHostInvite404JSONResponse{notFound("wedding not found")}, nil
	case errors.Is(err, ErrValidation):
		return AdminCreateHostInvite400JSONResponse{badRequest("invalid host slot")}, nil
	default:
		return nil, err
	}
}

// ──────────── 삭제 전용 ────────────

func (s *Server) AdminDeleteMemoryBookPhoto(ctx context.Context, req AdminDeleteMemoryBookPhotoRequestObject) (AdminDeleteMemoryBookPhotoResponseObject, error) {
	switch err := s.AdminMutations.DeleteMemoryBookPhoto(ctx, req.Id); {
	case err == nil:
		return AdminDeleteMemoryBookPhoto204Response{}, nil
	case errors.Is(err, ErrNotFound):
		return AdminDeleteMemoryBookPhoto404JSONResponse{notFound("memory book photo not found")}, nil
	default:
		return nil, err
	}
}

func (s *Server) AdminDeleteSharedPhoto(ctx context.Context, req AdminDeleteSharedPhotoRequestObject) (AdminDeleteSharedPhotoResponseObject, error) {
	switch err := s.AdminMutations.DeleteSharedPhoto(ctx, req.Id); {
	case err == nil:
		return AdminDeleteSharedPhoto204Response{}, nil
	case errors.Is(err, ErrNotFound):
		return AdminDeleteSharedPhoto404JSONResponse{notFound("shared photo not found")}, nil
	default:
		return nil, err
	}
}

func (s *Server) AdminDeleteLoungeCheckIn(ctx context.Context, req AdminDeleteLoungeCheckInRequestObject) (AdminDeleteLoungeCheckInResponseObject, error) {
	switch err := s.AdminMutations.DeleteLoungeCheckIn(ctx, req.Id); {
	case err == nil:
		return AdminDeleteLoungeCheckIn204Response{}, nil
	case errors.Is(err, ErrNotFound):
		return AdminDeleteLoungeCheckIn404JSONResponse{notFound("lounge check-in not found")}, nil
	default:
		return nil, err
	}
}
