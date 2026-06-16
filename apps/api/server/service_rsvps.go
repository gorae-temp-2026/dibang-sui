package api

import (
	"context"
	"errors"

	"gorae-api/db"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// RsvpService — 모바일 청첩장 참석 의사(QA 2026-05-29 G1).
// 게스트가 청첩장에서 제출, 호스트가 리포트에서 자기 측 응답만 조회.
type RsvpService interface {
	Create(ctx context.Context, weddingID openapi_types.UUID, req *CreateRsvpRequest) (*Rsvp, error)
	ListBySide(ctx context.Context, weddingID openapi_types.UUID, side string) ([]Rsvp, error)
	// HostSide: userID가 이 wedding의 신랑측/신부측 호스트인지 판별. 비호스트면 "".
	HostSide(ctx context.Context, weddingID openapi_types.UUID, userID pgtype.UUID) (string, error)
}

type rsvpService struct {
	pool *pgxpool.Pool
}

func NewRsvpService(pool *pgxpool.Pool) RsvpService {
	return &rsvpService{pool: pool}
}

// 측 → 슬롯 매핑. 신랑측 3명(groom·groom_father·groom_mother)은 데이터 공유,
// 신부측도 동일. 측 간에는 공유하지 않는다(이미지 G1 권한 규칙).
var rsvpSideSlots = map[string][]string{
	"groom": {"groom", "groom_father", "groom_mother"},
	"bride": {"bride", "bride_father", "bride_mother"},
}

func (s *rsvpService) Create(ctx context.Context, weddingID openapi_types.UUID, req *CreateRsvpRequest) (*Rsvp, error) {
	q := db.New(s.pool)

	companion := 0
	if req.CompanionCount != nil {
		companion = *req.CompanionCount
	}
	meal := "undecided"
	if req.Meal != nil {
		meal = string(*req.Meal)
	}

	row, err := q.InsertRsvp(ctx, db.InsertRsvpParams{
		WeddingID:      pgtype.UUID{Bytes: weddingID, Valid: true},
		RecipientSlot:  string(req.RecipientSlot),
		GuestName:      req.GuestName,
		Attendance:     string(req.Attendance),
		CompanionCount: int32(companion),
		Meal:           meal,
		PhoneLast4:     textFromPtr(req.PhoneLast4),
	})
	if err != nil {
		return nil, err
	}
	return buildRsvp(row.ID, row.WeddingID, row.RecipientSlot, row.GuestName, row.Attendance, row.CompanionCount, row.Meal, row.PhoneLast4, row.CreatedAt), nil
}

func (s *rsvpService) ListBySide(ctx context.Context, weddingID openapi_types.UUID, side string) ([]Rsvp, error) {
	q := db.New(s.pool)
	rows, err := q.ListRsvpsByWeddingSlots(ctx, db.ListRsvpsByWeddingSlotsParams{
		WeddingID: pgtype.UUID{Bytes: weddingID, Valid: true},
		Slots:     rsvpSideSlots[side],
	})
	if err != nil {
		return nil, err
	}
	out := make([]Rsvp, len(rows))
	for i, row := range rows {
		out[i] = *buildRsvp(row.ID, row.WeddingID, row.RecipientSlot, row.GuestName, row.Attendance, row.CompanionCount, row.Meal, row.PhoneLast4, row.CreatedAt)
	}
	return out, nil
}

func (s *rsvpService) HostSide(ctx context.Context, weddingID openapi_types.UUID, userID pgtype.UUID) (string, error) {
	q := db.New(s.pool)
	w, err := q.GetWedding(ctx, pgtype.UUID{Bytes: weddingID, Valid: true})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrNotFound
		}
		return "", err
	}
	for _, slot := range []pgtype.UUID{w.HostGroomID, w.HostGroomFatherID, w.HostGroomMotherID} {
		if slot.Valid && slot.Bytes == userID.Bytes {
			return "groom", nil
		}
	}
	for _, slot := range []pgtype.UUID{w.HostBrideID, w.HostBrideFatherID, w.HostBrideMotherID} {
		if slot.Valid && slot.Bytes == userID.Bytes {
			return "bride", nil
		}
	}
	return "", nil
}

func buildRsvp(id, weddingID pgtype.UUID, recipientSlot, guestName, attendance string, companion int32, meal string, phoneLast4 pgtype.Text, createdAt pgtype.Timestamptz) *Rsvp {
	return &Rsvp{
		Id:             uuidToOpenapi(id),
		WeddingId:      uuidToOpenapi(weddingID),
		RecipientSlot:  RsvpRecipientSlot(recipientSlot),
		GuestName:      guestName,
		Attendance:     RsvpAttendance(attendance),
		CompanionCount: int(companion),
		Meal:           RsvpMeal(meal),
		PhoneLast4:     ptrFromText(phoneLast4),
		CreatedAt:      createdAt.Time,
	}
}
