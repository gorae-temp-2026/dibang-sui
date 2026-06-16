package api

import (
	"context"
	"errors"
)

func (s *Server) GetMe(ctx context.Context, req GetMeRequestObject) (GetMeResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return GetMe401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	user, err := s.Users.GetByID(ctx, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return GetMe401JSONResponse{UnauthorizedJSONResponse{
				Type:   "about:blank",
				Title:  "Unauthorized",
				Status: 401,
				Detail: strPtr("user not found"),
			}}, nil
		}
		return nil, err
	}

	// _scenario/2026-05-26-user-consent-onboarding/ — GetMe 응답에 게이트 판정·마케팅 상태 포함.
	// ConsentService 미주입(테스트 등)이면 안전 디폴트: 게이트 통과 + 마케팅 false.
	user.ConsentsRequired = []UserConsentsRequired{}
	user.MarketingAgreed = false
	if s.Consents != nil {
		if req, err := s.Consents.GetConsentsRequired(ctx, userID); err == nil {
			user.ConsentsRequired = req
		}
		if agreed, err := s.Consents.GetMarketingAgreed(ctx, userID); err == nil {
			user.MarketingAgreed = agreed
		}
	}

	return GetMe200JSONResponse(*user), nil
}

func (s *Server) UpdateMe(ctx context.Context, req UpdateMeRequestObject) (UpdateMeResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return UpdateMe401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	user, err := s.Users.Update(ctx, userID, req.Body)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return UpdateMe401JSONResponse{UnauthorizedJSONResponse{
				Type:   "about:blank",
				Title:  "Unauthorized",
				Status: 401,
				Detail: strPtr("user not found"),
			}}, nil
		}
		return nil, err
	}

	return UpdateMe200JSONResponse(*user), nil
}
