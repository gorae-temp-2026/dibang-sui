package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5/pgtype"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

func (s *Server) CreateWedding(ctx context.Context, req CreateWeddingRequestObject) (CreateWeddingResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return CreateWedding401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	wedding, err := s.Weddings.Create(ctx, userID, req.Body)
	if err != nil {
		if errors.Is(err, ErrHostSelfRequired) {
			return CreateWedding400JSONResponse{BadRequestJSONResponse{
				Type:   "about:blank",
				Title:  "Bad Request",
				Status: 400,
				Detail: strPtr("at least one host slot must contain the current user"),
			}}, nil
		}
		if errors.Is(err, ErrSlugConflict) {
			return CreateWedding409JSONResponse{ConflictJSONResponse{
				Type:   "about:blank",
				Title:  "Conflict",
				Status: http.StatusConflict,
				Detail: strPtr("slug already exists"),
			}}, nil
		}
		return nil, err
	}

	return CreateWedding201JSONResponse(*wedding), nil
}

func (s *Server) GetMyWeddings(ctx context.Context, req GetMyWeddingsRequestObject) (GetMyWeddingsResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return GetMyWeddings401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	summaries, err := s.Weddings.GetMyWeddings(ctx, userID)
	if err != nil {
		return nil, err
	}

	// 청첩장 cover는 DB에 object key — 조회 시 URL 조립 (STORAGE.md)
	for i := range summaries {
		for j := range summaries[i].Invitations {
			if summaries[i].Invitations[j].CoverImage != nil {
				*summaries[i].Invitations[j].CoverImage = s.storageURLFromRef(*summaries[i].Invitations[j].CoverImage)
			}
		}
	}
	return GetMyWeddings200JSONResponse(summaries), nil
}

func (s *Server) GetMyParticipatedWeddings(ctx context.Context, req GetMyParticipatedWeddingsRequestObject) (GetMyParticipatedWeddingsResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return GetMyParticipatedWeddings401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	weddings, err := s.Weddings.GetMyParticipatedWeddings(ctx, userID)
	if err != nil {
		return nil, err
	}

	for i := range weddings {
		if weddings[i].CoverImage != nil {
			*weddings[i].CoverImage = s.storageURLFromRef(*weddings[i].CoverImage)
		}
	}
	return GetMyParticipatedWeddings200JSONResponse(weddings), nil
}

func (s *Server) GetWedding(ctx context.Context, req GetWeddingRequestObject) (GetWeddingResponseObject, error) {
	wedding, err := s.Weddings.GetByID(ctx, req.WeddingId)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return GetWedding404JSONResponse{NotFoundJSONResponse{
				Type:   "about:blank",
				Title:  "Not Found",
				Status: 404,
				Detail: strPtr("wedding not found"),
			}}, nil
		}
		return nil, err
	}

	// 청첩장 요약의 cover는 DB에 object key — 조회 시 URL 조립 (STORAGE.md)
	for i := range wedding.Invitations {
		if wedding.Invitations[i].CoverImage != nil {
			*wedding.Invitations[i].CoverImage = s.storageURLFromRef(*wedding.Invitations[i].CoverImage)
		}
	}
	return GetWedding200JSONResponse(*wedding), nil
}

func (s *Server) UpdateWedding(ctx context.Context, req UpdateWeddingRequestObject) (UpdateWeddingResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return UpdateWedding401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	isHost, err := s.Weddings.IsHost(ctx, req.WeddingId, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return UpdateWedding404JSONResponse{NotFoundJSONResponse{
				Type:   "about:blank",
				Title:  "Not Found",
				Status: 404,
				Detail: strPtr("wedding not found"),
			}}, nil
		}
		return nil, err
	}
	if !isHost {
		return UpdateWedding403JSONResponse{ForbiddenJSONResponse{
			Type:   "about:blank",
			Title:  "Forbidden",
			Status: 403,
			Detail: strPtr("host permission required"),
		}}, nil
	}

	wedding, err := s.Weddings.Update(ctx, req.WeddingId, req.Body)
	if err != nil {
		if errors.Is(err, ErrConflict) {
			return UpdateWedding409JSONResponse{conflict("다른 곳에서 먼저 수정됐어요. 새로고침 후 다시 시도해주세요.")}, nil
		}
		if errors.Is(err, ErrNotFound) {
			return UpdateWedding404JSONResponse{NotFoundJSONResponse{
				Type:   "about:blank",
				Title:  "Not Found",
				Status: 404,
				Detail: strPtr("wedding not found"),
			}}, nil
		}
		return nil, err
	}

	// GetWedding과 동일 — 청첩장 cover key를 URL로 조립 (STORAGE.md)
	for i := range wedding.Invitations {
		if wedding.Invitations[i].CoverImage != nil {
			*wedding.Invitations[i].CoverImage = s.storageURLFromRef(*wedding.Invitations[i].CoverImage)
		}
	}
	return UpdateWedding200JSONResponse(*wedding), nil
}

// --- Conversion helpers ---

func textFromPtr(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: *s, Valid: true}
}

func ptrFromText(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	return &t.String
}

func uuidFromPtr(u *openapi_types.UUID) pgtype.UUID {
	if u == nil {
		return pgtype.UUID{Valid: false}
	}
	return pgtype.UUID{Bytes: *u, Valid: true}
}

func uuidToOpenapi(u pgtype.UUID) openapi_types.UUID {
	return u.Bytes
}

func uuidPtrToOpenapi(u pgtype.UUID) *openapi_types.UUID {
	if !u.Valid {
		return nil
	}
	id := openapi_types.UUID(u.Bytes)
	return &id
}

func pgDateFromOpenapiDate(d openapi_types.Date) pgtype.Date {
	return pgtype.Date{
		Time:  d.Time,
		Valid: true,
	}
}

func openapiDateFromPg(d pgtype.Date) openapi_types.Date {
	return openapi_types.Date{Time: d.Time}
}

func accountToJSON(a *Account) []byte {
	if a == nil {
		return nil
	}
	b, _ := json.Marshal(a)
	return b
}

func accountFromJSON(data []byte) *Account {
	if len(data) == 0 {
		return nil
	}
	var a Account
	if err := json.Unmarshal(data, &a); err != nil {
		return nil
	}
	return &a
}

func pgUUIDToOpenapi(p pgtype.UUID) openapi_types.UUID {
	return openapi_types.UUID(p.Bytes)
}

func jsonToStringSlicePtr(data []byte) *[]string {
	if len(data) == 0 {
		return nil
	}
	var ss []string
	if err := json.Unmarshal(data, &ss); err != nil {
		return nil
	}
	return &ss
}

func strPtr(s string) *string {
	return &s
}

func boolValFromPtr(b *bool) bool {
	if b == nil {
		return false
	}
	return *b
}
