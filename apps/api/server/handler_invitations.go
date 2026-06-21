package api

import (
	"context"
	"errors"
)

func (s *Server) GetInvitation(ctx context.Context, req GetInvitationRequestObject) (GetInvitationResponseObject, error) {
	inv, err := s.Invitations.GetBySlug(ctx, req.Slug)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return GetInvitation404JSONResponse{NotFoundJSONResponse{
				Type:   "about:blank",
				Title:  "Not Found",
				Status: 404,
				Detail: strPtr("invitation not found"),
			}}, nil
		}
		return nil, err
	}

	s.assembleInvitationPublicRefs(inv)
	return GetInvitation200JSONResponse(*inv), nil
}

func (s *Server) CreateInvitation(ctx context.Context, req CreateInvitationRequestObject) (CreateInvitationResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return CreateInvitation401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	isHost, err := s.Weddings.IsHost(ctx, req.WeddingId, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return CreateInvitation400JSONResponse{BadRequestJSONResponse{
				Type:   "about:blank",
				Title:  "Bad Request",
				Status: 400,
				Detail: strPtr("wedding not found"),
			}}, nil
		}
		return nil, err
	}
	if !isHost {
		return CreateInvitation403JSONResponse{ForbiddenJSONResponse{
			Type:   "about:blank",
			Title:  "Forbidden",
			Status: 403,
			Detail: strPtr("host permission required"),
		}}, nil
	}

	// DB에는 object key만 저장 (STORAGE.md, 양형식 수용)
	s.normalizeCreateInvitationRefs(req.Body)
	inv, err := s.Invitations.Create(ctx, req.WeddingId, req.Body)
	if err != nil {
		if errors.Is(err, ErrSlugConflict) {
			return CreateInvitation409JSONResponse{ConflictJSONResponse{
				Type:   "about:blank",
				Title:  "Conflict",
				Status: 409,
				Detail: strPtr("slug already exists"),
			}}, nil
		}
		return nil, err
	}

	s.assembleInvitationRefs(inv)
	return CreateInvitation201JSONResponse(*inv), nil
}

func (s *Server) UpdateInvitation(ctx context.Context, req UpdateInvitationRequestObject) (UpdateInvitationResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return UpdateInvitation401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	isHost, err := s.Weddings.IsHost(ctx, req.WeddingId, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return UpdateInvitation404JSONResponse{NotFoundJSONResponse{
				Type:   "about:blank",
				Title:  "Not Found",
				Status: 404,
				Detail: strPtr("wedding not found"),
			}}, nil
		}
		return nil, err
	}
	if !isHost {
		return UpdateInvitation403JSONResponse{ForbiddenJSONResponse{
			Type:   "about:blank",
			Title:  "Forbidden",
			Status: 403,
			Detail: strPtr("host permission required"),
		}}, nil
	}

	// 저장 확정: Create 흐름에서 v3-tmp(draft)로 올라간 이미지를 wedding 경로로
	// 이동(copy)하고 참조를 재작성. tmp 원본 삭제는 Update 성공 후에만 —
	// Update가 실패하면 wedding 경로 사본은 미참조 고아로 남아 sweep이 정리한다.
	draftTmpKeys := s.relocateInvitationDraftRefs(ctx, userID, req.WeddingId, req.Body)
	// DB에는 object key만 저장 — 절대 URL은 여기서 정규화 (STORAGE.md, 양형식 수용)
	s.normalizeInvitationRefs(req.Body)

	inv, err := s.Invitations.Update(ctx, req.InvitationId, req.Body)
	if err != nil {
		if errors.Is(err, ErrConflict) {
			return UpdateInvitation409JSONResponse{conflict("다른 곳에서 먼저 수정됐어요. 새로고침 후 다시 시도해주세요.")}, nil
		}
		if errors.Is(err, ErrNotFound) {
			return UpdateInvitation404JSONResponse{NotFoundJSONResponse{
				Type:   "about:blank",
				Title:  "Not Found",
				Status: 404,
				Detail: strPtr("invitation not found"),
			}}, nil
		}
		return nil, err
	}
	s.cleanupDraftTmp(ctx, draftTmpKeys)

	s.assembleInvitationRefs(inv)
	return UpdateInvitation200JSONResponse(*inv), nil
}

func (s *Server) DeleteInvitation(ctx context.Context, req DeleteInvitationRequestObject) (DeleteInvitationResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return DeleteInvitation401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	isHost, err := s.Weddings.IsHost(ctx, req.WeddingId, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return DeleteInvitation404JSONResponse{NotFoundJSONResponse{
				Type:   "about:blank",
				Title:  "Not Found",
				Status: 404,
				Detail: strPtr("wedding not found"),
			}}, nil
		}
		return nil, err
	}
	if !isHost {
		return DeleteInvitation403JSONResponse{ForbiddenJSONResponse{
			Type:   "about:blank",
			Title:  "Forbidden",
			Status: 403,
			Detail: strPtr("host permission required"),
		}}, nil
	}

	err = s.Invitations.Delete(ctx, req.WeddingId, req.InvitationId)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return DeleteInvitation404JSONResponse{NotFoundJSONResponse{
				Type:   "about:blank",
				Title:  "Not Found",
				Status: 404,
				Detail: strPtr("invitation not found"),
			}}, nil
		}
		if errors.Is(err, ErrForbidden) {
			return DeleteInvitation400JSONResponse{BadRequestJSONResponse{
				Type:   "about:blank",
				Title:  "Bad Request",
				Status: 400,
				Detail: strPtr("cannot delete the last invitation"),
			}}, nil
		}
		return nil, err
	}

	return DeleteInvitation204Response{}, nil
}

func (s *Server) HeartInvitation(ctx context.Context, req HeartInvitationRequestObject) (HeartInvitationResponseObject, error) {
	heartCount, err := s.Invitations.IncrementHeart(ctx, req.Slug)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil, err
		}
		return nil, err
	}

	return HeartInvitation200JSONResponse{
		HeartCount: heartCount,
	}, nil
}

func (s *Server) ShareInvitation(ctx context.Context, req ShareInvitationRequestObject) (ShareInvitationResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return ShareInvitation401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	isHost, err := s.Weddings.IsHost(ctx, req.WeddingId, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return ShareInvitation404JSONResponse{NotFoundJSONResponse{
				Type:   "about:blank",
				Title:  "Not Found",
				Status: 404,
				Detail: strPtr("wedding not found"),
			}}, nil
		}
		return nil, err
	}
	if !isHost {
		return ShareInvitation403JSONResponse{ForbiddenJSONResponse{
			Type:   "about:blank",
			Title:  "Forbidden",
			Status: 403,
			Detail: strPtr("host permission required"),
		}}, nil
	}

	link, err := s.Invitations.GetShareLink(ctx, req.InvitationId)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return ShareInvitation404JSONResponse{NotFoundJSONResponse{
				Type:   "about:blank",
				Title:  "Not Found",
				Status: 404,
				Detail: strPtr("invitation not found"),
			}}, nil
		}
		return nil, err
	}

	return ShareInvitation200JSONResponse(*link), nil
}
