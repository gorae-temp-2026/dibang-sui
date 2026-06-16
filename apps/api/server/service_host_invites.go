package api

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"

	"gorae-api/db"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

type hostInviteService struct {
	pool *pgxpool.Pool
}

func NewHostInviteService(pool *pgxpool.Pool) HostInviteService {
	return &hostInviteService{pool: pool}
}

func generateToken() string {
	b := make([]byte, 16)
	// crypto/rand 실패는 OS 엔트로피 고갈 등 시스템 자체 이상 — 약한 토큰을
	// 발급하느니 panic으로 즉시 중단(보안 결함 차단). 실무에서 발생 극히 드물다.
	if _, err := rand.Read(b); err != nil {
		panic(fmt.Errorf("generateToken: crypto/rand.Read failed: %w", err))
	}
	return hex.EncodeToString(b)
}

func (s *hostInviteService) Create(ctx context.Context, weddingID openapi_types.UUID, slot string) (*HostInvite, error) {
	q := db.New(s.pool)
	pgWeddingID := pgtype.UUID{Bytes: weddingID, Valid: true}

	// Check if pending invite already exists for this slot
	existing, err := q.GetPendingInviteBySlot(ctx, db.GetPendingInviteBySlotParams{
		WeddingID: pgWeddingID,
		Slot:      slot,
	})
	if err == nil {
		// Reuse existing token
		return dbHostInviteToAPI(existing), nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	// Create new invite
	inv, err := q.InsertHostInvite(ctx, db.InsertHostInviteParams{
		WeddingID: pgWeddingID,
		Slot:      slot,
		Token:     generateToken(),
	})
	if err != nil {
		return nil, err
	}

	return dbHostInviteToAPI(inv), nil
}

func (s *hostInviteService) GetByToken(ctx context.Context, token string) (*HostInvitePublic, error) {
	q := db.New(s.pool)

	row, err := q.GetHostInviteByToken(ctx, token)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &HostInvitePublic{
		Slot:   HostInvitePublicSlot(row.Slot),
		Status: HostInvitePublicStatus(row.Status),
		WeddingSummary: struct {
			BrideName string             `json:"bride_name"`
			Date      openapi_types.Date `json:"date"`
			GroomName string             `json:"groom_name"`
			VenueName *string            `json:"venue_name,omitempty"`
		}{
			GroomName: row.GroomName,
			BrideName: row.BrideName,
			Date:      openapiDateFromPg(row.Date),
			VenueName: &row.VenueName,
		},
	}, nil
}

func (s *hostInviteService) Accept(ctx context.Context, token string, userID pgtype.UUID) (*HostInvite, error) {
	q := db.New(s.pool)

	// Get invite first to check status and ownership
	row, err := q.GetHostInviteByToken(ctx, token)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if row.Status != "pending" {
		if row.Status == "accepted" {
			return nil, ErrAlreadyAccepted
		}
		return nil, ErrNotFound // cancelled
	}

	// Check not accepting own wedding.
	// 이 검증엔 host 슬롯 6개만 필요하므로 해당 컬럼만 조회한다.
	// (SELECT * + 고정 순서 Scan은 v3_weddings 컬럼 추가 시 개수 불일치로 깨진다 — 명시 컬럼으로 고정.)
	var wedding db.V3Wedding
	err = s.pool.QueryRow(ctx,
		`SELECT host_groom_id, host_bride_id,
		        host_groom_father_id, host_groom_mother_id,
		        host_bride_father_id, host_bride_mother_id
		 FROM v3_weddings WHERE id = $1`, row.WeddingID).Scan(
		&wedding.HostGroomID, &wedding.HostBrideID,
		&wedding.HostGroomFatherID, &wedding.HostGroomMotherID,
		&wedding.HostBrideFatherID, &wedding.HostBrideMotherID,
	)
	if err != nil {
		return nil, err
	}

	hostSlots := []pgtype.UUID{
		wedding.HostGroomID, wedding.HostBrideID,
		wedding.HostGroomFatherID, wedding.HostGroomMotherID,
		wedding.HostBrideFatherID, wedding.HostBrideMotherID,
	}
	for _, slot := range hostSlots {
		if slot.Valid && slot.Bytes == userID.Bytes {
			return nil, ErrCannotAcceptOwn
		}
	}

	// Check slot not already taken
	slotCol := fmt.Sprintf("host_%s_id", row.Slot)
	var existingSlotID pgtype.UUID
	err = s.pool.QueryRow(ctx,
		fmt.Sprintf(`SELECT %s FROM v3_weddings WHERE id = $1`, slotCol),
		row.WeddingID,
	).Scan(&existingSlotID)
	if err == nil && existingSlotID.Valid {
		return nil, ErrSlotAlreadyTaken
	}

	// Accept invite
	accepted, err := q.AcceptHostInvite(ctx, db.AcceptHostInviteParams{
		Token:         token,
		InvitedUserID: userID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAlreadyAccepted
		}
		return nil, err
	}

	// Update wedding host slot
	_, err = s.pool.Exec(ctx,
		fmt.Sprintf(`UPDATE v3_weddings SET %s = $1 WHERE id = $2`, slotCol),
		userID, row.WeddingID,
	)
	if err != nil {
		return nil, err
	}

	return dbHostInviteToAPI(db.V3HostInvite{
		ID:            accepted.ID,
		WeddingID:     accepted.WeddingID,
		Slot:          accepted.Slot,
		Token:         accepted.Token,
		Status:        accepted.Status,
		InvitedUserID: accepted.InvitedUserID,
		CreatedAt:     accepted.CreatedAt,
		AcceptedAt:    accepted.AcceptedAt,
	}), nil
}

func (s *hostInviteService) Cancel(ctx context.Context, inviteID openapi_types.UUID) error {
	q := db.New(s.pool)

	inv, err := q.GetHostInviteByID(ctx, pgtype.UUID{Bytes: inviteID, Valid: true})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}

	if inv.Status != "pending" {
		return fmt.Errorf("cannot cancel non-pending invite: %w", ErrForbidden)
	}

	return q.CancelHostInvite(ctx, pgtype.UUID{Bytes: inviteID, Valid: true})
}

func (s *hostInviteService) List(ctx context.Context, weddingID openapi_types.UUID) ([]HostInvite, error) {
	q := db.New(s.pool)

	rows, err := q.ListHostInvitesByWeddingID(ctx, pgtype.UUID{Bytes: weddingID, Valid: true})
	if err != nil {
		return nil, err
	}

	result := make([]HostInvite, 0, len(rows))
	for _, row := range rows {
		result = append(result, *dbHostInviteToAPI(row))
	}
	return result, nil
}

func dbHostInviteToAPI(inv db.V3HostInvite) *HostInvite {
	result := &HostInvite{
		Id:        uuidToOpenapi(inv.ID),
		WeddingId: uuidToOpenapi(inv.WeddingID),
		Slot:      HostInviteSlot(inv.Slot),
		Token:     inv.Token,
		Status:    HostInviteStatus(inv.Status),
		CreatedAt: inv.CreatedAt.Time,
	}
	if inv.InvitedUserID.Valid {
		id := uuidToOpenapi(inv.InvitedUserID)
		result.InvitedUserId = &id
	}
	if inv.AcceptedAt.Valid {
		t := inv.AcceptedAt.Time
		result.AcceptedAt = &t
	}
	return result
}
