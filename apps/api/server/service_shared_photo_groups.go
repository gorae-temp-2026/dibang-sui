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

// SharedPhotoGroupsService — wedding 단위 공유 사진을 게스트별로 묶어 반환.
// _scenario/wedding-memorybook-ui-2026-05-24/SCENARIOS.md §S-02 큐레이션 페이지 데이터 소스.

type SharedPhotoGroupsService interface {
	Get(ctx context.Context, weddingID openapi_types.UUID) (*SharedPhotoGroupsResponse, error)
}

type sharedPhotoGroupsService struct {
	pool *pgxpool.Pool
}

func NewSharedPhotoGroupsService(pool *pgxpool.Pool) SharedPhotoGroupsService {
	return &sharedPhotoGroupsService{pool: pool}
}

func (s *sharedPhotoGroupsService) Get(ctx context.Context, weddingID openapi_types.UUID) (*SharedPhotoGroupsResponse, error) {
	q := db.New(s.pool)
	wPg := pgtype.UUID{Bytes: weddingID, Valid: true}

	// 호스트 본인이 게스트로 사진을 올렸을 때 side를 wedding 6슬롯으로 결정하기 위해 wedding row 조회.
	wedding, err := q.GetWedding(ctx, wPg)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	hostSlotSide := buildHostSlotSideMap(wedding)

	rows, err := q.ListSharedPhotosWithGuestForWedding(ctx, wPg)
	if err != nil {
		return nil, err
	}

	type accum struct {
		userID           openapi_types.UUID
		guestName        string
		side             *SharedPhotoGroupSide
		recipientSlot    *string
		relationCategory *string
		relationDetail   *string
		photos           []SharedPhotoInGroup
	}

	byUser := make(map[openapi_types.UUID]*accum)
	order := make([]*accum, 0)

	for _, r := range rows {
		uid := openapi_types.UUID(r.GuestUserID.Bytes)
		g, ok := byUser[uid]
		if !ok {
			name := r.UserName
			if r.EntryGuestName.Valid && r.EntryGuestName.String != "" {
				name = r.EntryGuestName.String
			}
			g = &accum{userID: uid, guestName: name}

			// side / slot 결정: entry 우선 → 호스트 fallback
			if r.RecipientSlot.Valid && r.RecipientSlot.String != "" {
				slot := r.RecipientSlot.String
				g.recipientSlot = &slot
				side := SharedPhotoGroupSide(sideFromRecipientSlot(slot))
				g.side = &side
			} else if hs, ok := hostSlotSide[uid]; ok {
				slot := hs.slot
				side := SharedPhotoGroupSide(hs.side)
				g.recipientSlot = &slot
				g.side = &side
			}
			if r.RelationCategory.Valid && r.RelationCategory.String != "" {
				v := r.RelationCategory.String
				g.relationCategory = &v
			}
			if r.RelationDetail.Valid && r.RelationDetail.String != "" {
				v := r.RelationDetail.String
				g.relationDetail = &v
			}

			byUser[uid] = g
			order = append(order, g)
		}
		g.photos = append(g.photos, SharedPhotoInGroup{
			Id:          openapi_types.UUID(r.PhotoID.Bytes),
			StoragePath: r.StoragePath,
			CreatedAt:   r.CreatedAt.Time,
		})
	}

	out := make([]SharedPhotoGroup, len(order))
	for i, g := range order {
		out[i] = SharedPhotoGroup{
			UserId:           g.userID,
			GuestName:        g.guestName,
			Side:             g.side,
			RecipientSlot:    g.recipientSlot,
			RelationCategory: g.relationCategory,
			RelationDetail:   g.relationDetail,
			Photos:           g.photos,
			PhotoCount:       len(g.photos),
		}
	}

	return &SharedPhotoGroupsResponse{Groups: out}, nil
}

type hostSlotInfo struct {
	slot string // e.g., "groom_father"
	side string // "groom" | "bride"
}

// buildHostSlotSideMap: wedding 6슬롯 중 채워진 host_*_id를 user_id → slot/side로 매핑.
// 게스트 사진의 업로더가 호스트 본인일 때 entry 없이도 side 라벨 결정.
func buildHostSlotSideMap(w db.V3Wedding) map[openapi_types.UUID]hostSlotInfo {
	out := make(map[openapi_types.UUID]hostSlotInfo, 6)
	add := func(id pgtype.UUID, slot, side string) {
		if id.Valid {
			out[openapi_types.UUID(id.Bytes)] = hostSlotInfo{slot: slot, side: side}
		}
	}
	add(w.HostGroomID, "groom", "groom")
	add(w.HostGroomFatherID, "groom_father", "groom")
	add(w.HostGroomMotherID, "groom_mother", "groom")
	add(w.HostBrideID, "bride", "bride")
	add(w.HostBrideFatherID, "bride_father", "bride")
	add(w.HostBrideMotherID, "bride_mother", "bride")
	return out
}
