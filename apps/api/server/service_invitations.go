package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"gorae-api/db"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

type invitationService struct {
	pool *pgxpool.Pool
}

func NewInvitationService(pool *pgxpool.Pool) InvitationService {
	return &invitationService{pool: pool}
}

func (s *invitationService) GetBySlug(ctx context.Context, slug string) (*InvitationPublic, error) {
	q := db.New(s.pool)

	row, err := q.GetInvitationBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	info := WeddingInfo{
		GroomName:           row.GroomName,
		BrideName:           row.BrideName,
		Date:                openapiDateFromPg(row.Date),
		Time:                row.Time,
		Venue: Venue{
			VenueName:    row.VenueName,
			VenueAddress: row.VenueAddress,
			VenueHall:    ptrFromText(row.VenueHall),
		},
		GroomFatherName:     ptrFromText(row.GroomFatherName),
		GroomMotherName:     ptrFromText(row.GroomMotherName),
		BrideFatherName:     ptrFromText(row.BrideFatherName),
		BrideMotherName:     ptrFromText(row.BrideMotherName),
		GroomFatherDeceased: &row.GroomFatherDeceased,
		GroomMotherDeceased: &row.GroomMotherDeceased,
		BrideFatherDeceased: &row.BrideFatherDeceased,
		BrideMotherDeceased: &row.BrideMotherDeceased,
		GroomAccount:        accountFromJSON(row.GroomAccount),
		BrideAccount:        accountFromJSON(row.BrideAccount),
		GroomFatherAccount:  accountFromJSON(row.GroomFatherAccount),
		GroomMotherAccount:  accountFromJSON(row.GroomMotherAccount),
		BrideFatherAccount:  accountFromJSON(row.BrideFatherAccount),
		BrideMotherAccount:  accountFromJSON(row.BrideMotherAccount),
	}

	loungePreview := LoungePreview{}
	var loungeID pgtype.UUID
	var loungeName string
	err = s.pool.QueryRow(ctx,
		`SELECT id, name FROM v3_wedding_lounges WHERE wedding_id = $1 LIMIT 1`,
		row.WeddingID,
	).Scan(&loungeID, &loungeName)
	if err == nil {
		loungePreview.LoungeId = uuidToOpenapi(loungeID)
		loungePreview.LoungeName = loungeName

		var visitorCount int
		err = s.pool.QueryRow(ctx,
			`SELECT COUNT(*) FROM v3_lounge_check_ins WHERE lounge_id = $1`,
			loungeID,
		).Scan(&visitorCount)
		if err == nil {
			loungePreview.VisitorCount = visitorCount
		}
	}

	pub := &InvitationPublic{
		WeddingId:        uuidToOpenapi(row.WeddingID),
		DesignTemplateId: row.DesignTemplateID,
		CustomMessage:    ptrFromText(row.CustomMessage),
		CoverImage:       ptrFromText(row.CoverImage),
		GalleryPhotos:    jsonToStringSlicePtr(row.GalleryPhotos),
		HeartCount:       int(row.HeartCount),
		VisitedCount:     int(row.VisitedCount),
		Info:             info,
		LoungePreview:    loungePreview,
	}
	if len(row.CoverTextConfig) > 0 {
		var cfg CoverTextConfig
		if err := json.Unmarshal(row.CoverTextConfig, &cfg); err == nil {
			pub.CoverTextConfig = &cfg
		}
	}
	if len(row.DesignConfig) > 0 {
		var cfg DesignConfig
		if err := json.Unmarshal(row.DesignConfig, &cfg); err == nil {
			pub.DesignConfig = &cfg
		}
	}
	return pub, nil
}

func (s *invitationService) Create(ctx context.Context, weddingID openapi_types.UUID, req *CreateInvitationRequest) (*Invitation, error) {
	q := db.New(s.pool)

	designTemplateID := "default"
	if req.DesignTemplateId != nil {
		designTemplateID = *req.DesignTemplateId
	}

	inv, err := q.InsertInvitation(ctx, db.InsertInvitationParams{
		WeddingID:        pgtype.UUID{Bytes: weddingID, Valid: true},
		Slug:             req.Slug,
		DesignTemplateID: designTemplateID,
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrSlugConflict
		}
		return nil, err
	}

	// If optional fields are provided, update them
	if req.CustomMessage != nil || req.CoverImage != nil || req.GalleryPhotos != nil || req.CoverTextConfig != nil || req.DesignConfig != nil {
		params := db.UpdateInvitationParams{
			ID: inv.ID,
		}
		if req.CustomMessage != nil {
			params.CustomMessage = pgtype.Text{String: *req.CustomMessage, Valid: true}
		}
		if req.CoverImage != nil {
			params.CoverImage = pgtype.Text{String: *req.CoverImage, Valid: true}
		}
		if req.GalleryPhotos != nil {
			data, jsonErr := json.Marshal(*req.GalleryPhotos)
			if jsonErr != nil {
				return nil, jsonErr
			}
			params.GalleryPhotos = data
		}
		if req.CoverTextConfig != nil {
			data, jsonErr := json.Marshal(req.CoverTextConfig)
			if jsonErr != nil {
				return nil, jsonErr
			}
			params.CoverTextConfig = data
		}
		if req.DesignConfig != nil {
			data, jsonErr := json.Marshal(req.DesignConfig)
			if jsonErr != nil {
				return nil, jsonErr
			}
			params.DesignConfig = data
		}

		inv, err = q.UpdateInvitation(ctx, params)
		if err != nil {
			return nil, err
		}
	}

	return toInvitation(inv), nil
}

func (s *invitationService) Update(ctx context.Context, invitationID openapi_types.UUID, req *UpdateInvitationRequest) (*Invitation, error) {
	q := db.New(s.pool)

	params := db.UpdateInvitationParams{
		ID: pgtype.UUID{Bytes: invitationID, Valid: true},
	}

	if req.DesignTemplateId != nil {
		params.DesignTemplateID = pgtype.Text{String: *req.DesignTemplateId, Valid: true}
	}
	if req.CustomMessage != nil {
		params.CustomMessage = pgtype.Text{String: *req.CustomMessage, Valid: true}
	}
	if req.CoverImage != nil {
		params.CoverImage = pgtype.Text{String: *req.CoverImage, Valid: true}
	}
	if req.GalleryPhotos != nil {
		data, err := json.Marshal(*req.GalleryPhotos)
		if err != nil {
			return nil, err
		}
		params.GalleryPhotos = data
	}
	if req.CoverTextConfig != nil {
		data, err := json.Marshal(req.CoverTextConfig)
		if err != nil {
			return nil, err
		}
		params.CoverTextConfig = data
	}
	if req.DesignConfig != nil {
		data, err := json.Marshal(req.DesignConfig)
		if err != nil {
			return nil, err
		}
		params.DesignConfig = data
	}

	inv, err := q.UpdateInvitation(ctx, params)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return toInvitation(inv), nil
}

func (s *invitationService) Delete(ctx context.Context, weddingID openapi_types.UUID, invitationID openapi_types.UUID) error {
	q := db.New(s.pool)

	pgWeddingID := pgtype.UUID{Bytes: weddingID, Valid: true}

	// Check minimum 1 invitation constraint
	count, err := q.CountInvitationsByWeddingID(ctx, pgWeddingID)
	if err != nil {
		return err
	}
	if count <= 1 {
		return fmt.Errorf("cannot delete the last invitation: %w", ErrForbidden)
	}

	pgInvitationID := pgtype.UUID{Bytes: invitationID, Valid: true}

	// Verify the invitation exists and belongs to this wedding
	inv, err := q.GetInvitationByID(ctx, pgInvitationID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if inv.WeddingID.Bytes != weddingID {
		return ErrNotFound
	}

	return q.DeleteInvitation(ctx, pgInvitationID)
}

func (s *invitationService) IncrementHeart(ctx context.Context, slug string) (int, error) {
	q := db.New(s.pool)

	heartCount, err := q.IncrementHeartCount(ctx, slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, ErrNotFound
		}
		return 0, err
	}

	return int(heartCount), nil
}

func (s *invitationService) GetShareLink(ctx context.Context, invitationID openapi_types.UUID) (*ShareLinkResponse, error) {
	q := db.New(s.pool)

	inv, err := q.GetInvitationByID(ctx, pgtype.UUID{Bytes: invitationID, Valid: true})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &ShareLinkResponse{
		Slug: inv.Slug,
		Url:  fmt.Sprintf("/invite/%s", inv.Slug),
	}, nil
}

func (s *invitationService) ListByWeddingID(ctx context.Context, weddingID pgtype.UUID) ([]InvitationSummary, error) {
	q := db.New(s.pool)

	rows, err := q.ListInvitationsByWeddingID(ctx, weddingID)
	if err != nil {
		return nil, err
	}

	result := make([]InvitationSummary, 0, len(rows))
	for _, row := range rows {
		result = append(result, InvitationSummary{
			Id:         uuidToOpenapi(row.ID),
			Slug:       row.Slug,
			CoverImage: ptrFromText(row.CoverImage),
		})
	}

	return result, nil
}

func toInvitation(inv db.V3MobileInvitation) *Invitation {
	result := &Invitation{
		Id:               uuidToOpenapi(inv.ID),
		WeddingId:        uuidToOpenapi(inv.WeddingID),
		DesignTemplateId: inv.DesignTemplateID,
		CustomMessage:    ptrFromText(inv.CustomMessage),
		CoverImage:       ptrFromText(inv.CoverImage),
		GalleryPhotos:    jsonToStringSlicePtr(inv.GalleryPhotos),
		HeartCount:       int(inv.HeartCount),
		VisitedCount:     int(inv.VisitedCount),
		Slug:             inv.Slug,
		CreatedAt:        inv.CreatedAt.Time,
	}
	if len(inv.CoverTextConfig) > 0 {
		var cfg CoverTextConfig
		if err := json.Unmarshal(inv.CoverTextConfig, &cfg); err == nil {
			result.CoverTextConfig = &cfg
		}
	}
	if len(inv.DesignConfig) > 0 {
		var cfg DesignConfig
		if err := json.Unmarshal(inv.DesignConfig, &cfg); err == nil {
			result.DesignConfig = &cfg
		}
	}
	return result
}
