package api

import (
	"context"
	"errors"

	"gorae-api/db"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// invitationLister is the subset of InvitationService needed by weddingService.
type invitationLister interface {
	ListByWeddingID(ctx context.Context, weddingID pgtype.UUID) ([]InvitationSummary, error)
}

type weddingService struct {
	pool        *pgxpool.Pool
	invitations invitationLister
}

func NewWeddingService(pool *pgxpool.Pool, invitations invitationLister) WeddingService {
	return &weddingService{pool: pool, invitations: invitations}
}

func (s *weddingService) Create(ctx context.Context, hostUserID pgtype.UUID, req *CreateWeddingRequest) (*Wedding, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	q := db.New(tx)

	// Validate: at least one host slot must contain the current user
	hostSlots := []*openapi_types.UUID{
		req.Hosts.HostGroomId, req.Hosts.HostBrideId,
		req.Hosts.HostGroomFatherId, req.Hosts.HostGroomMotherId,
		req.Hosts.HostBrideFatherId, req.Hosts.HostBrideMotherId,
	}
	selfIncluded := false
	for _, slot := range hostSlots {
		if slot != nil && *slot == openapi_types.UUID(hostUserID.Bytes) {
			selfIncluded = true
			break
		}
	}
	if !selfIncluded {
		return nil, ErrHostSelfRequired
	}

	// 1. Insert wedding
	weddingParams := db.InsertWeddingParams{
		GroomName:           req.Info.GroomName,
		BrideName:           req.Info.BrideName,
		GroomFatherName:     textFromPtr(req.Info.GroomFatherName),
		GroomMotherName:     textFromPtr(req.Info.GroomMotherName),
		BrideFatherName:     textFromPtr(req.Info.BrideFatherName),
		BrideMotherName:     textFromPtr(req.Info.BrideMotherName),
		GroomFatherDeceased: boolValFromPtr(req.Info.GroomFatherDeceased),
		GroomMotherDeceased: boolValFromPtr(req.Info.GroomMotherDeceased),
		BrideFatherDeceased: boolValFromPtr(req.Info.BrideFatherDeceased),
		BrideMotherDeceased: boolValFromPtr(req.Info.BrideMotherDeceased),
		Date:                pgDateFromOpenapiDate(req.Info.Date),
		Time:                req.Info.Time,
		VenueName:           req.Info.Venue.VenueName,
		VenueAddress:        req.Info.Venue.VenueAddress,
		VenueHall:           textFromPtr(req.Info.Venue.VenueHall),
		ConvertFrom:   accountToJSON(req.Info.GroomAccount),
		ConvertFrom_2: accountToJSON(req.Info.BrideAccount),
		ConvertFrom_3: accountToJSON(req.Info.GroomFatherAccount),
		ConvertFrom_4: accountToJSON(req.Info.GroomMotherAccount),
		ConvertFrom_5: accountToJSON(req.Info.BrideFatherAccount),
		ConvertFrom_6: accountToJSON(req.Info.BrideMotherAccount),
		HostGroomID:         uuidFromPtr(req.Hosts.HostGroomId),
		HostBrideID:         uuidFromPtr(req.Hosts.HostBrideId),
		HostGroomFatherID:   uuidFromPtr(req.Hosts.HostGroomFatherId),
		HostGroomMotherID:   uuidFromPtr(req.Hosts.HostGroomMotherId),
		HostBrideFatherID:   uuidFromPtr(req.Hosts.HostBrideFatherId),
		HostBrideMotherID:   uuidFromPtr(req.Hosts.HostBrideMotherId),
	}

	wedding, err := q.InsertWedding(ctx, weddingParams)
	if err != nil {
		return nil, err
	}

	// 2. Insert lounge
	lounge, err := q.InsertLounge(ctx, db.InsertLoungeParams{
		WeddingID: wedding.ID,
		Name:      wedding.GroomName + " & " + wedding.BrideName,
	})
	if err != nil {
		return nil, err
	}

	// 3. Insert gather place
	gatherPlace, err := q.InsertGatherPlace(ctx, db.InsertGatherPlaceParams{
		LoungeID: lounge.ID,
		Type:     "main",
	})
	if err != nil {
		return nil, err
	}

	// 4. Insert invitation
	invitation, err := q.InsertInvitation(ctx, db.InsertInvitationParams{
		WeddingID:        wedding.ID,
		Slug:             req.Slug,
		DesignTemplateID: "default",
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrSlugConflict
		}
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &Wedding{
		Id:        uuidToOpenapi(wedding.ID),
		Status:    WeddingStatus(wedding.Status),
		CreatedAt: wedding.CreatedAt.Time,
		Hosts: HostSlots{
			HostGroomId:       uuidPtrToOpenapi(wedding.HostGroomID),
			HostBrideId:       uuidPtrToOpenapi(wedding.HostBrideID),
			HostGroomFatherId: uuidPtrToOpenapi(wedding.HostGroomFatherID),
			HostGroomMotherId: uuidPtrToOpenapi(wedding.HostGroomMotherID),
			HostBrideFatherId: uuidPtrToOpenapi(wedding.HostBrideFatherID),
			HostBrideMotherId: uuidPtrToOpenapi(wedding.HostBrideMotherID),
		},
		Info: WeddingInfo{
			GroomName:           wedding.GroomName,
			BrideName:           wedding.BrideName,
			GroomFatherName:     ptrFromText(wedding.GroomFatherName),
			GroomMotherName:     ptrFromText(wedding.GroomMotherName),
			BrideFatherName:     ptrFromText(wedding.BrideFatherName),
			BrideMotherName:     ptrFromText(wedding.BrideMotherName),
			GroomFatherDeceased: &wedding.GroomFatherDeceased,
			GroomMotherDeceased: &wedding.GroomMotherDeceased,
			BrideFatherDeceased: &wedding.BrideFatherDeceased,
			BrideMotherDeceased: &wedding.BrideMotherDeceased,
			Date:                openapiDateFromPg(wedding.Date),
			Time:                wedding.Time,
			Venue: Venue{
				VenueName:    wedding.VenueName,
				VenueAddress: wedding.VenueAddress,
				VenueHall:    ptrFromText(wedding.VenueHall),
			},
			GroomAccount:       accountFromJSON(wedding.GroomAccount),
			BrideAccount:       accountFromJSON(wedding.BrideAccount),
			GroomFatherAccount: accountFromJSON(wedding.GroomFatherAccount),
			GroomMotherAccount: accountFromJSON(wedding.GroomMotherAccount),
			BrideFatherAccount: accountFromJSON(wedding.BrideFatherAccount),
			BrideMotherAccount: accountFromJSON(wedding.BrideMotherAccount),
		},
		Lounge: LoungeSummary{
			Id:                  uuidToOpenapi(lounge.ID),
			Name:                lounge.Name,
			GatherPlaceId:       uuidPtrToOpenapi(gatherPlace.ID),
			GroomSideGuestCount: 0, // 신규 생성 직후라 라운지 체크인 0
			BrideSideGuestCount: 0,
		},
		Invitations: []InvitationSummary{{
			Id:   uuidToOpenapi(invitation.ID),
			Slug: invitation.Slug,
		}},
	}, nil
}

func (s *weddingService) GetMyWeddings(ctx context.Context, userID pgtype.UUID) ([]WeddingSummary, error) {
	q := db.New(s.pool)

	rows, err := q.GetMyWeddings(ctx, userID)
	if err != nil {
		return nil, err
	}

	result := make([]WeddingSummary, 0, len(rows))
	for _, row := range rows {
		invitations, err := s.invitations.ListByWeddingID(ctx, row.ID)
		if err != nil {
			return nil, err
		}

		// Calculate my_role
		var myRole *string
		type slotCheck struct {
			id   pgtype.UUID
			role string
		}
		// Priority: groom > bride > parents
		for _, sc := range []slotCheck{
			{row.HostGroomID, "groom"},
			{row.HostBrideID, "bride"},
			{row.HostGroomFatherID, "groom_father"},
			{row.HostGroomMotherID, "groom_mother"},
			{row.HostBrideFatherID, "bride_father"},
			{row.HostBrideMotherID, "bride_mother"},
		} {
			if sc.id.Valid && sc.id.Bytes == userID.Bytes {
				myRole = &sc.role
				break
			}
		}

		summary := WeddingSummary{
			Id:              pgUUIDToOpenapi(row.ID),
			Status:          WeddingStatus(row.Status),
			GroomName:       row.GroomName,
			BrideName:       row.BrideName,
			GroomFatherName: ptrFromText(row.GroomFatherName),
			GroomMotherName: ptrFromText(row.GroomMotherName),
			BrideFatherName: ptrFromText(row.BrideFatherName),
			BrideMotherName: ptrFromText(row.BrideMotherName),
			Date:            openapiDateFromPg(row.Date),
			Time:            &row.Time,
			VenueName:       &row.VenueName,
			VenueHall:       ptrFromText(row.VenueHall),
			Invitations:     invitations,
			MyRole:          myRole,
		}
		// lounge_id: LEFT JOIN 결과라 nullable. valid일 때만 응답에 포함.
		if row.LoungeID.Valid {
			loungeID := pgUUIDToOpenapi(row.LoungeID)
			summary.LoungeId = &loungeID
		}
		result = append(result, summary)
	}

	return result, nil
}

func (s *weddingService) GetMyParticipatedWeddings(ctx context.Context, userID pgtype.UUID) ([]ParticipatedWedding, error) {
	q := db.New(s.pool)

	rows, err := q.GetParticipatedWeddings(ctx, userID)
	if err != nil {
		return nil, err
	}

	result := make([]ParticipatedWedding, 0, len(rows))
	for _, row := range rows {
		pw := ParticipatedWedding{
			Id:        pgUUIDToOpenapi(row.ID),
			GroomName: row.GroomName,
			BrideName: row.BrideName,
			Date:      openapiDateFromPg(row.Date),
			LoungeId:  pgUUIDToOpenapi(row.LoungeID),
		}
		if row.Time != "" {
			pw.Time = &row.Time
		}
		if row.VenueName != "" {
			pw.VenueName = &row.VenueName
		}
		pw.VenueHall = ptrFromText(row.VenueHall)
		pw.CoverImage = ptrFromText(row.CoverImage)
		result = append(result, pw)
	}

	return result, nil
}

func (s *weddingService) GetByID(ctx context.Context, id openapi_types.UUID) (*Wedding, error) {
	q := db.New(s.pool)

	pgID := pgtype.UUID{Bytes: id, Valid: true}
	row, err := q.GetWeddingFull(ctx, pgID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	invitations, err := s.invitations.ListByWeddingID(ctx, pgID)
	if err != nil {
		return nil, err
	}

	return dbWeddingFullToAPI(row, invitations), nil
}

// UpdateSuiIds: 온체인 발행 Sui 오브젝트 ID를 Supabase row에 dual-write 저장 (C7).
func (s *weddingService) UpdateSuiIds(ctx context.Context, weddingID openapi_types.UUID, suiWeddingID, suiLoungeID, suiVaultID *string) error {
	q := db.New(s.pool)
	wid := pgtype.UUID{Bytes: weddingID, Valid: true}
	if err := q.UpdateWeddingSuiIds(ctx, db.UpdateWeddingSuiIdsParams{
		ID:           wid,
		SuiWeddingID: textFromPtr(suiWeddingID),
		SuiVaultID:   textFromPtr(suiVaultID),
	}); err != nil {
		return err
	}
	if suiLoungeID != nil && *suiLoungeID != "" {
		if err := q.UpdateLoungeSuiId(ctx, db.UpdateLoungeSuiIdParams{
			WeddingID:   wid,
			SuiLoungeID: textFromPtr(suiLoungeID),
		}); err != nil {
			return err
		}
	}
	return nil
}

func (s *weddingService) IsHost(ctx context.Context, weddingID openapi_types.UUID, userID pgtype.UUID) (bool, error) {
	q := db.New(s.pool)

	w, err := q.GetWedding(ctx, pgtype.UUID{Bytes: weddingID, Valid: true})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, ErrNotFound
		}
		return false, err
	}

	slots := []pgtype.UUID{
		w.HostGroomID,
		w.HostBrideID,
		w.HostGroomFatherID,
		w.HostGroomMotherID,
		w.HostBrideFatherID,
		w.HostBrideMotherID,
	}

	for _, slot := range slots {
		if slot.Valid && slot.Bytes == userID.Bytes {
			return true, nil
		}
	}

	return false, nil
}

func (s *weddingService) Update(ctx context.Context, weddingID openapi_types.UUID, req *UpdateWeddingRequest) (*Wedding, error) {
	q := db.New(s.pool)

	params := db.UpdateWeddingInfoParams{
		ID: pgtype.UUID{Bytes: weddingID, Valid: true},
	}

	if req.Info != nil {
		info := req.Info
		params.GroomName = textFromPtr(&info.GroomName)
		params.BrideName = textFromPtr(&info.BrideName)
		params.GroomFatherName = textFromPtr(info.GroomFatherName)
		params.GroomMotherName = textFromPtr(info.GroomMotherName)
		params.BrideFatherName = textFromPtr(info.BrideFatherName)
		params.BrideMotherName = textFromPtr(info.BrideMotherName)
		params.GroomFatherDeceased = boolFromPtr(info.GroomFatherDeceased)
		params.GroomMotherDeceased = boolFromPtr(info.GroomMotherDeceased)
		params.BrideFatherDeceased = boolFromPtr(info.BrideFatherDeceased)
		params.BrideMotherDeceased = boolFromPtr(info.BrideMotherDeceased)
		params.Date = pgDateFromOpenapiDate(info.Date)
		params.Time = textFromPtr(&info.Time)
		params.VenueName = textFromPtr(&info.Venue.VenueName)
		params.VenueAddress = textFromPtr(&info.Venue.VenueAddress)
		params.VenueHall = textFromPtr(info.Venue.VenueHall)
		params.GroomAccount = accountToJSON(info.GroomAccount)
		params.BrideAccount = accountToJSON(info.BrideAccount)
		params.GroomFatherAccount = accountToJSON(info.GroomFatherAccount)
		params.GroomMotherAccount = accountToJSON(info.GroomMotherAccount)
		params.BrideFatherAccount = accountToJSON(info.BrideFatherAccount)
		params.BrideMotherAccount = accountToJSON(info.BrideMotherAccount)
	}

	if req.Hosts != nil {
		params.HostGroomID = uuidFromPtr(req.Hosts.HostGroomId)
		params.HostBrideID = uuidFromPtr(req.Hosts.HostBrideId)
		params.HostGroomFatherID = uuidFromPtr(req.Hosts.HostGroomFatherId)
		params.HostGroomMotherID = uuidFromPtr(req.Hosts.HostGroomMotherId)
		params.HostBrideFatherID = uuidFromPtr(req.Hosts.HostBrideFatherId)
		params.HostBrideMotherID = uuidFromPtr(req.Hosts.HostBrideMotherId)
	}

	_, err := q.UpdateWeddingInfo(ctx, params)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	// Re-fetch full data with lounge/invitation
	return s.GetByID(ctx, weddingID)
}

func dbWeddingFullToAPI(row db.GetWeddingFullRow, invitations []InvitationSummary) *Wedding {
	w := &Wedding{
		Id:        uuidToOpenapi(row.ID),
		Status:    WeddingStatus(row.Status),
		CreatedAt: row.CreatedAt.Time,
		Hosts: HostSlots{
			HostGroomId:       uuidPtrToOpenapi(row.HostGroomID),
			HostBrideId:       uuidPtrToOpenapi(row.HostBrideID),
			HostGroomFatherId: uuidPtrToOpenapi(row.HostGroomFatherID),
			HostGroomMotherId: uuidPtrToOpenapi(row.HostGroomMotherID),
			HostBrideFatherId: uuidPtrToOpenapi(row.HostBrideFatherID),
			HostBrideMotherId: uuidPtrToOpenapi(row.HostBrideMotherID),
		},
		Info: WeddingInfo{
			GroomName:           row.GroomName,
			BrideName:           row.BrideName,
			GroomFatherName:     ptrFromText(row.GroomFatherName),
			GroomMotherName:     ptrFromText(row.GroomMotherName),
			BrideFatherName:     ptrFromText(row.BrideFatherName),
			BrideMotherName:     ptrFromText(row.BrideMotherName),
			GroomFatherDeceased: &row.GroomFatherDeceased,
			GroomMotherDeceased: &row.GroomMotherDeceased,
			BrideFatherDeceased: &row.BrideFatherDeceased,
			BrideMotherDeceased: &row.BrideMotherDeceased,
			Date:                openapiDateFromPg(row.Date),
			Time:                row.Time,
			Venue: Venue{
				VenueName:    row.VenueName,
				VenueAddress: row.VenueAddress,
				VenueHall:    ptrFromText(row.VenueHall),
			},
			GroomAccount:       accountFromJSON(row.GroomAccount),
			BrideAccount:       accountFromJSON(row.BrideAccount),
			GroomFatherAccount: accountFromJSON(row.GroomFatherAccount),
			GroomMotherAccount: accountFromJSON(row.GroomMotherAccount),
			BrideFatherAccount: accountFromJSON(row.BrideFatherAccount),
			BrideMotherAccount: accountFromJSON(row.BrideMotherAccount),
		},
		Lounge: LoungeSummary{
			Id:                  uuidToOpenapi(row.LoungeID),
			Name:                row.LoungeName.String,
			GatherPlaceId:       uuidPtrToOpenapi(row.GatherPlaceID),
			GroomSideGuestCount: int(row.GroomSideGuestCount),
			BrideSideGuestCount: int(row.BrideSideGuestCount),
			SuiLoungeId:         ptrFromText(row.SuiLoungeID),
		},
		Invitations: invitations,
		SuiWeddingId: ptrFromText(row.SuiWeddingID),
		SuiVaultId:   ptrFromText(row.SuiVaultID),
	}
	return w
}
