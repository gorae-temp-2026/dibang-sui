package api

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"gorae-api/db"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// ── 시나리오 §10·§9: 청첩장 사진 list/create. host(owner) 강제 ──

// 401/403 typed responses
type listMIP401 struct{}

func (listMIP401) VisitListMobileInvitationPhotosResponse(w http.ResponseWriter) error {
	w.WriteHeader(http.StatusUnauthorized)
	return nil
}

type listMIP403 struct{}

func (listMIP403) VisitListMobileInvitationPhotosResponse(w http.ResponseWriter) error {
	w.WriteHeader(http.StatusForbidden)
	return nil
}

type createMIP401 struct{}

func (createMIP401) VisitCreateMobileInvitationPhotoResponse(w http.ResponseWriter) error {
	w.WriteHeader(http.StatusUnauthorized)
	return nil
}

type createMIP403 struct{}

func (createMIP403) VisitCreateMobileInvitationPhotoResponse(w http.ResponseWriter) error {
	w.WriteHeader(http.StatusForbidden)
	return nil
}

type createMIP409 struct{}

func (createMIP409) VisitCreateMobileInvitationPhotoResponse(w http.ResponseWriter) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusConflict)
	_, _ = fmt.Fprint(w, `{"type":"about:blank","title":"Conflict","status":409,"detail":"cover already exists for this invitation"}`)
	return nil
}

func (s *Server) ListMobileInvitationPhotos(ctx context.Context, req ListMobileInvitationPhotosRequestObject) (ListMobileInvitationPhotosResponseObject, error) {
	userIDPg, ok := UserIDFromContext(ctx)
	if !ok {
		return listMIP401{}, nil
	}
	userID := openapi_types.UUID(userIDPg.Bytes)
	if !s.userIsWeddingOwner(ctx, req.WeddingId, userID) {
		return listMIP403{}, nil
	}

	q := db.New(s.Pool)
	rows, err := q.ListMobileInvitationPhotosByInvitation(ctx, pgtype.UUID{Bytes: req.InvitationId, Valid: true})
	if err != nil {
		return nil, err
	}
	out := make([]MobileInvitationPhoto, 0, len(rows))
	for _, r := range rows {
		out = append(out, photoRowToAPI(r))
	}
	return ListMobileInvitationPhotos200JSONResponse{Data: out}, nil
}

func (s *Server) CreateMobileInvitationPhoto(ctx context.Context, req CreateMobileInvitationPhotoRequestObject) (CreateMobileInvitationPhotoResponseObject, error) {
	userIDPg, ok := UserIDFromContext(ctx)
	if !ok {
		return createMIP401{}, nil
	}
	userID := openapi_types.UUID(userIDPg.Bytes)
	if !s.userIsWeddingOwner(ctx, req.WeddingId, userID) {
		return createMIP403{}, nil
	}
	if req.Body == nil {
		return createMIP403{}, nil // 400 정의 없음 → 권한 외 거부도 403으로 갈음하지 않고
	}
	body := *req.Body

	q := db.New(s.Pool)
	params := db.CreateMobileInvitationPhotoParams{
		InvitationID: pgtype.UUID{Bytes: req.InvitationId, Valid: true},
		SubKind:      string(body.SubKind),
		StoragePath:  body.StoragePath,
		FileName:     textPtr(body.FileName),
		FileSize:     int4Ptr(body.FileSize),
		MimeType:     textPtr(body.MimeType),
		SortOrder:    int32Or(body.SortOrder, 0),
	}
	row, err := q.CreateMobileInvitationPhoto(ctx, params)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" { // unique_violation
			// cover partial UNIQUE 위반
			return createMIP409{}, nil
		}
		return nil, err
	}

	api := photoRowToAPI(row)
	return CreateMobileInvitationPhoto201JSONResponse(api), nil
}

// ── helpers ──

func photoRowToAPI(r db.V3MobileInvitationPhoto) MobileInvitationPhoto {
	out := MobileInvitationPhoto{
		Id:           openapi_types.UUID(r.ID.Bytes),
		InvitationId: openapi_types.UUID(r.InvitationID.Bytes),
		SubKind:      MobileInvitationPhotoSubKind(r.SubKind),
		StoragePath:  r.StoragePath,
		SortOrder:    int(r.SortOrder),
		CreatedAt:    r.CreatedAt.Time,
	}
	if r.FileName.Valid {
		v := r.FileName.String
		out.FileName = &v
	}
	if r.FileSize.Valid {
		v := int(r.FileSize.Int32)
		out.FileSize = &v
	}
	if r.MimeType.Valid {
		v := r.MimeType.String
		out.MimeType = &v
	}
	return out
}

// optional helpers
func textPtr(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{}
	}
	return pgtype.Text{String: *s, Valid: true}
}

func int4Ptr(v *int) pgtype.Int4 {
	if v == nil {
		return pgtype.Int4{}
	}
	return pgtype.Int4{Int32: int32(*v), Valid: true}
}

func int32Or(v *int, def int32) int32 {
	if v == nil {
		return def
	}
	return int32(*v)
}
