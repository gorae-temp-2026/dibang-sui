package api

import (
	"context"
	"errors"
)

func (s *Server) ListHostInvites(ctx context.Context, req ListHostInvitesRequestObject) (ListHostInvitesResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return ListHostInvites401JSONResponse{UnauthorizedJSONResponse{
			Type: "about:blank", Title: "Unauthorized", Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	isHost, err := s.Weddings.IsHost(ctx, req.WeddingId, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return ListHostInvites403JSONResponse{ForbiddenJSONResponse{
				Type: "about:blank", Title: "Forbidden", Status: 403,
				Detail: strPtr("wedding not found"),
			}}, nil
		}
		return nil, err
	}
	if !isHost {
		return ListHostInvites403JSONResponse{ForbiddenJSONResponse{
			Type: "about:blank", Title: "Forbidden", Status: 403,
			Detail: strPtr("host permission required"),
		}}, nil
	}

	invites, err := s.HostInvites.List(ctx, req.WeddingId)
	if err != nil {
		return nil, err
	}

	return ListHostInvites200JSONResponse(invites), nil
}

func (s *Server) CreateHostInvite(ctx context.Context, req CreateHostInviteRequestObject) (CreateHostInviteResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return CreateHostInvite401JSONResponse{UnauthorizedJSONResponse{
			Type: "about:blank", Title: "Unauthorized", Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	// Only groom/bride can create invites
	isHost, err := s.Weddings.IsHost(ctx, req.WeddingId, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return CreateHostInvite400JSONResponse{BadRequestJSONResponse{
				Type: "about:blank", Title: "Bad Request", Status: 400,
				Detail: strPtr("wedding not found"),
			}}, nil
		}
		return nil, err
	}
	if !isHost {
		return CreateHostInvite403JSONResponse{ForbiddenJSONResponse{
			Type: "about:blank", Title: "Forbidden", Status: 403,
			Detail: strPtr("host permission required"),
		}}, nil
	}

	inv, err := s.HostInvites.Create(ctx, req.WeddingId, string(req.Body.Slot))
	if err != nil {
		return nil, err
	}

	return CreateHostInvite201JSONResponse(*inv), nil
}

func (s *Server) GetHostInvite(ctx context.Context, req GetHostInviteRequestObject) (GetHostInviteResponseObject, error) {
	inv, err := s.HostInvites.GetByToken(ctx, req.Token)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return GetHostInvite404JSONResponse{NotFoundJSONResponse{
				Type: "about:blank", Title: "Not Found", Status: 404,
				Detail: strPtr("invite not found"),
			}}, nil
		}
		return nil, err
	}

	return GetHostInvite200JSONResponse(*inv), nil
}

func (s *Server) AcceptHostInvite(ctx context.Context, req AcceptHostInviteRequestObject) (AcceptHostInviteResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return AcceptHostInvite401JSONResponse{UnauthorizedJSONResponse{
			Type: "about:blank", Title: "Unauthorized", Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	inv, err := s.HostInvites.Accept(ctx, req.Token, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return AcceptHostInvite404JSONResponse{NotFoundJSONResponse{
				Type: "about:blank", Title: "Not Found", Status: 404,
				Detail: strPtr("invite not found or already processed"),
			}}, nil
		}
		if errors.Is(err, ErrAlreadyAccepted) || errors.Is(err, ErrSlotAlreadyTaken) {
			return AcceptHostInvite409JSONResponse{ConflictJSONResponse{
				Type: "about:blank", Title: "Conflict", Status: 409,
				Detail: strPtr(err.Error()),
			}}, nil
		}
		if errors.Is(err, ErrCannotAcceptOwn) {
			return AcceptHostInvite400JSONResponse{BadRequestJSONResponse{
				Type: "about:blank", Title: "Bad Request", Status: 400,
				Detail: strPtr("cannot accept invite to your own wedding"),
			}}, nil
		}
		return nil, err
	}

	return AcceptHostInvite200JSONResponse(*inv), nil
}

func (s *Server) CancelHostInvite(ctx context.Context, req CancelHostInviteRequestObject) (CancelHostInviteResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return CancelHostInvite401JSONResponse{UnauthorizedJSONResponse{
			Type: "about:blank", Title: "Unauthorized", Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	// Check host permission
	isHost, err := s.Weddings.IsHost(ctx, req.WeddingId, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return CancelHostInvite404JSONResponse{NotFoundJSONResponse{
				Type: "about:blank", Title: "Not Found", Status: 404,
				Detail: strPtr("wedding not found"),
			}}, nil
		}
		return nil, err
	}
	if !isHost {
		return CancelHostInvite403JSONResponse{ForbiddenJSONResponse{
			Type: "about:blank", Title: "Forbidden", Status: 403,
			Detail: strPtr("host permission required"),
		}}, nil
	}

	err = s.HostInvites.Cancel(ctx, req.InviteId)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return CancelHostInvite404JSONResponse{NotFoundJSONResponse{
				Type: "about:blank", Title: "Not Found", Status: 404,
				Detail: strPtr("invite not found"),
			}}, nil
		}
		if errors.Is(err, ErrForbidden) {
			return CancelHostInvite400JSONResponse{BadRequestJSONResponse{
				Type: "about:blank", Title: "Bad Request", Status: 400,
				Detail: strPtr("cannot cancel accepted invite"),
			}}, nil
		}
		return nil, err
	}

	return CancelHostInvite204Response{}, nil
}
