package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"gorae-api/db"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// 웨딩메모리북 메시지 자동선별 알고리즘.
// _scenario/wedding-memorybook-2026-05-24/SCENARIOS.md §C(S-07~S-13).
// v2 web-mobile-application/apps/api/src/routes/host/memorybook.ts selectMessages 1:1 포팅.
//
// 차이점:
//   - is_heart: v2 boolean 컬럼 → v3 sentinel (message == "__HEART__"). 쿼리에서 BOOL alias로 받음.
//   - side: v2 messages.side → v3 entries.recipient_slot 첫 단어 (groom_*→groom, bride_*→bride, else→other).
//   - is_private: v2 필터 → v3는 라운지 인증 게이트로 대체, 본 함수에서는 미적용.

const (
	memoryBookTextTotal = 30
	memoryBookHeartMax  = 6
)

// curationInput은 selectMessages 내부 전용. handler에서 sqlc row를 이 형식으로 매핑.
type curationInput struct {
	ID               string
	Message          string
	CreatedAt        time.Time
	GuestName        string
	RecipientSlot    string
	RelationCategory string
	RelationDetail   string
	IsHeart          bool
}

// sideFromRecipientSlot은 v3_guestbook_entries.recipient_slot을 메시지 선별용 side 라벨로 매핑.
// 'groom' / 'groom_father' / 'groom_mother' → "groom"
// 'bride' / 'bride_father' / 'bride_mother' → "bride"
// 그 외 → "other"
func sideFromRecipientSlot(slot string) string {
	if strings.HasPrefix(slot, "groom") {
		return "groom"
	}
	if strings.HasPrefix(slot, "bride") {
		return "bride"
	}
	return "other"
}

func sortByCreatedAtAsc(arr []curationInput) {
	sort.SliceStable(arr, func(i, j int) bool {
		return arr[i].CreatedAt.Before(arr[j].CreatedAt)
	})
}

// evenSample은 시간순 정렬된 배열에서 n개를 균등 간격으로 뽑는다. (v2 evenSample 1:1)
func evenSample(arr []curationInput, n int) []curationInput {
	if n <= 0 {
		return nil
	}
	if len(arr) <= n {
		return arr
	}
	step := float64(len(arr)) / float64(n)
	out := make([]curationInput, n)
	for i := 0; i < n; i++ {
		out[i] = arr[int(float64(i)*step)]
	}
	return out
}

// selectMessages는 입력 메시지(시간순 정렬 무관)에서:
//   1) hearts: __HEART__ sentinel 최근순 max 6개
//   2) texts: 욕설/빈 제외 → 합 ≤30이면 그대로 / >30이면 side별 비율 quota + 시간 균등 샘플링 + 부족분 보충
//   3) texts는 최종 시간순(오래된 순) 반환, hearts는 별도
// 호출자는 두 결과를 contract 응답에서 합쳐 (texts → hearts 순) 전달한다.
func selectMessages(input []curationInput) (texts []curationInput, hearts []curationInput) {
	if len(input) == 0 {
		return nil, nil
	}

	var allText []curationInput
	var allHearts []curationInput
	for _, m := range input {
		if m.IsHeart {
			allHearts = append(allHearts, m)
			continue
		}
		if strings.TrimSpace(m.Message) == "" {
			continue
		}
		if DetectProfanity(m.Message) != "" {
			continue
		}
		allText = append(allText, m)
	}

	// hearts: 최근순(내림차순) max 6
	sort.SliceStable(allHearts, func(i, j int) bool {
		return allHearts[i].CreatedAt.After(allHearts[j].CreatedAt)
	})
	if len(allHearts) > memoryBookHeartMax {
		allHearts = allHearts[:memoryBookHeartMax]
	}

	// texts: ≤30 → 그대로 (시간순 오래된 순 정렬해서 반환)
	if len(allText) <= memoryBookTextTotal {
		sortByCreatedAtAsc(allText)
		return allText, allHearts
	}

	// texts >30 → side별 분류 + 비율 quota + 시간 균등 샘플링
	var groom, bride, other []curationInput
	for _, m := range allText {
		switch sideFromRecipientSlot(m.RecipientSlot) {
		case "groom":
			groom = append(groom, m)
		case "bride":
			bride = append(bride, m)
		default:
			other = append(other, m)
		}
	}
	sortByCreatedAtAsc(groom)
	sortByCreatedAtAsc(bride)
	sortByCreatedAtAsc(other)

	total := len(allText)
	groomQuota := len(groom) * memoryBookTextTotal / total
	brideQuota := len(bride) * memoryBookTextTotal / total
	otherQuota := len(other) * memoryBookTextTotal / total

	selected := append(append(evenSample(groom, groomQuota), evenSample(bride, brideQuota)...), evenSample(other, otherQuota)...)

	// 부족분 보충: 사용 안 된 메시지에서 균등 샘플링
	if len(selected) < memoryBookTextTotal {
		used := make(map[string]bool, len(selected))
		for _, m := range selected {
			used[m.ID] = true
		}
		var remaining []curationInput
		for _, m := range allText {
			if !used[m.ID] {
				remaining = append(remaining, m)
			}
		}
		sortByCreatedAtAsc(remaining)
		selected = append(selected, evenSample(remaining, memoryBookTextTotal-len(selected))...)
	}

	if len(selected) > memoryBookTextTotal {
		selected = selected[:memoryBookTextTotal]
	}

	// 최종 시간순 (오래된 순)
	sortByCreatedAtAsc(selected)
	return selected, allHearts
}

// ─────────────────────────────────────────────────────────────────────────
// MemoryBookService — 웨딩메모리북 조회·큐레이션 저장.
// _scenario/wedding-memorybook-2026-05-24/SCENARIOS.md §A, §B, §D.
// ─────────────────────────────────────────────────────────────────────────

// ReplaceMemoryBookPhotosResult는 ReplacePhotos 결과.
// InvalidIDs가 비어있지 않으면 핸들러는 400으로 응답한다.
type ReplaceMemoryBookPhotosResult struct {
	Count      int
	InvalidIDs []openapi_types.UUID
}

type MemoryBookService interface {
	Get(ctx context.Context, weddingID openapi_types.UUID) (*MemoryBookResponse, error)
	ReplacePhotos(ctx context.Context, weddingID openapi_types.UUID, photoIDs []openapi_types.UUID, userID pgtype.UUID) (*ReplaceMemoryBookPhotosResult, error)
}

type memoryBookService struct {
	pool *pgxpool.Pool
}

func NewMemoryBookService(pool *pgxpool.Pool) MemoryBookService {
	return &memoryBookService{pool: pool}
}

func (s *memoryBookService) Get(ctx context.Context, weddingID openapi_types.UUID) (*MemoryBookResponse, error) {
	q := db.New(s.pool)
	wPg := pgtype.UUID{Bytes: weddingID, Valid: true}

	couple, err := q.GetWeddingCoupleForMemoryBook(ctx, wPg)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	curated, err := q.ListMemoryBookPhotosByWedding(ctx, wPg)
	if err != nil {
		return nil, err
	}
	// 청첩장 cover_image + gallery_photos (jsonb). public URL이라 signed URL 변환 불필요.
	// invitation row 없을 수도 있어 ErrNoRows는 무시 (cover/gallery 빈 채로 진행).
	invitation, err := q.GetInvitationCoverAndGalleryForMemoryBook(ctx, wPg)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	var coverImage string
	var galleryURLs []string
	if err == nil {
		if invitation.CoverImage.Valid {
			coverImage = invitation.CoverImage.String
		}
		if len(invitation.GalleryPhotos) > 0 {
			if jsonErr := json.Unmarshal(invitation.GalleryPhotos, &galleryURLs); jsonErr != nil {
				// jsonb 파싱 실패는 fail-soft (빈 배열로 진행)
				galleryURLs = nil
			}
		}
	}
	msgRows, err := q.ListGuestbookMessagesForCurationByWedding(ctx, wPg)
	if err != nil {
		return nil, err
	}
	totalMsg, err := q.CountGuestbookMessagesByWedding(ctx, wPg)
	if err != nil {
		return nil, err
	}
	cashCount, err := q.CountCashGiftsByWedding(ctx, wPg)
	if err != nil {
		return nil, err
	}
	sharedCount, err := q.CountSharedPhotosByWedding(ctx, wPg)
	if err != nil {
		return nil, err
	}

	status := MemoryBookStatus("ready_uncurated")
	if len(curated) > 0 {
		status = "ready"
	}

	curatedPhotos := make([]MemoryBookPhoto, 0, len(curated))
	for _, c := range curated {
		p := MemoryBookPhoto{
			Id:          openapi_types.UUID(c.PhotoID.Bytes),
			StoragePath: c.StoragePath,
		}
		if c.GuestUserID.Valid {
			gid := openapi_types.UUID(c.GuestUserID.Bytes)
			p.GuestUserId = &gid
		}
		curatedPhotos = append(curatedPhotos, p)
	}

	// display_photos는 청첩장 gallery_photos jsonb URL 배열 그대로.
	displayPhotos := galleryURLs
	if displayPhotos == nil {
		displayPhotos = []string{}
	}

	// 메시지 선별: sqlc row → curationInput → selectMessages → contract MemoryBookMessage
	inputs := make([]curationInput, 0, len(msgRows))
	for _, r := range msgRows {
		var ts time.Time
		if r.CreatedAt.Valid {
			ts = r.CreatedAt.Time
		}
		relDetail := ""
		if r.RelationDetail.Valid {
			relDetail = r.RelationDetail.String
		}
		inputs = append(inputs, curationInput{
			ID:               fmt.Sprintf("%x", r.ID.Bytes),
			Message:          r.Message,
			CreatedAt:        ts,
			GuestName:        r.GuestName,
			RecipientSlot:    r.RecipientSlot,
			RelationCategory: r.RelationCategory,
			RelationDetail:   relDetail,
			IsHeart:          r.IsHeart,
		})
	}
	// ID → 원본 row 매핑 (contract UUID 복원용)
	idToUUID := make(map[string]openapi_types.UUID, len(msgRows))
	for _, r := range msgRows {
		idToUUID[fmt.Sprintf("%x", r.ID.Bytes)] = openapi_types.UUID(r.ID.Bytes)
	}

	texts, hearts := selectMessages(inputs)
	mec := make([]MemoryBookMessage, 0, len(texts)+len(hearts))
	for _, m := range texts {
		mec = append(mec, toMemoryBookMessage(m, idToUUID))
	}
	for _, m := range hearts {
		mec = append(mec, toMemoryBookMessage(m, idToUUID))
	}

	coupleResp := MemoryBookCouple{
		GroomName:   couple.GroomName,
		BrideName:   couple.BrideName,
		WeddingDate: openapi_types.Date{Time: couple.Date.Time},
		VenueName:   couple.VenueName,
	}
	if couple.Time != "" {
		t := couple.Time
		coupleResp.Time = &t
	}
	coupleResp.VenueAddress = &couple.VenueAddress
	if couple.VenueHall.Valid {
		v := couple.VenueHall.String
		coupleResp.VenueHall = &v
	}
	if coverImage != "" {
		c := coverImage
		coupleResp.CoverPhotoUrl = &c
	}

	resp := &MemoryBookResponse{
		Status: status,
		Data: &MemoryBookData{
			Couple:        coupleResp,
			CuratedPhotos: curatedPhotos,
			DisplayPhotos: displayPhotos,
			MecMessages:   mec,
			Stats: MemoryBookStats{
				TotalGuests:    int(totalMsg), // TODO: 메시지 수가 아닌 하객(entry) 수로 변경 필요
				TotalMessages:  int(totalMsg) + int(cashCount),
				PhotosUploaded: int(sharedCount),
			},
		},
	}
	return resp, nil
}

func toMemoryBookMessage(m curationInput, idMap map[string]openapi_types.UUID) MemoryBookMessage {
	uid := idMap[m.ID]
	side := MemoryBookMessageSide(sideFromRecipientSlot(m.RecipientSlot))

	// relation_label 조립: relation_category + (relation_detail) 또는 recipient_slot
	var label *string
	if m.RelationCategory != "" {
		if m.RelationDetail != "" {
			s := m.RelationCategory + " · " + m.RelationDetail
			label = &s
		} else {
			c := m.RelationCategory
			label = &c
		}
	}
	name := m.GuestName
	return MemoryBookMessage{
		Id:            uid,
		Message:       m.Message,
		IsHeart:       m.IsHeart,
		CreatedAt:     m.CreatedAt,
		GuestName:     &name,
		RelationLabel: label,
		Side:          &side,
	}
}

func (s *memoryBookService) ReplacePhotos(ctx context.Context, weddingID openapi_types.UUID, photoIDs []openapi_types.UUID, userID pgtype.UUID) (*ReplaceMemoryBookPhotosResult, error) {
	q := db.New(s.pool)
	wPg := pgtype.UUID{Bytes: weddingID, Valid: true}

	// 중복 검증
	seen := make(map[openapi_types.UUID]bool, len(photoIDs))
	for _, id := range photoIDs {
		if seen[id] {
			return nil, ErrDuplicatePhotoID
		}
		seen[id] = true
	}

	// photo_id 소속 검증 (해당 wedding의 라운지의 shared 사진인가)
	var invalidIDs []openapi_types.UUID
	if len(photoIDs) > 0 {
		pgIDs := make([]pgtype.UUID, len(photoIDs))
		for i, id := range photoIDs {
			pgIDs[i] = pgtype.UUID{Bytes: id, Valid: true}
		}
		validRows, err := q.ValidateSharedPhotoIdsForWedding(ctx, db.ValidateSharedPhotoIdsForWeddingParams{
			WeddingID: wPg,
			Column2:   pgIDs,
		})
		if err != nil {
			return nil, err
		}
		valid := make(map[openapi_types.UUID]bool, len(validRows))
		for _, v := range validRows {
			valid[openapi_types.UUID(v.Bytes)] = true
		}
		for _, id := range photoIDs {
			if !valid[id] {
				invalidIDs = append(invalidIDs, id)
			}
		}
		if len(invalidIDs) > 0 {
			return &ReplaceMemoryBookPhotosResult{Count: 0, InvalidIDs: invalidIDs}, nil
		}
	}

	// RPC 호출 — 원자적 DELETE+INSERT. sqlc 추론이 안 돼서 pool로 직접.
	pgPhotoIDs := make([]pgtype.UUID, len(photoIDs))
	for i, id := range photoIDs {
		pgPhotoIDs[i] = pgtype.UUID{Bytes: id, Valid: true}
	}
	_ = q // 미사용 경고 방지
	if _, err := s.pool.Exec(ctx,
		"SELECT public.v3_upsert_memory_book_photos($1, $2, $3)",
		wPg, pgPhotoIDs, userID,
	); err != nil {
		return nil, err
	}

	return &ReplaceMemoryBookPhotosResult{Count: len(photoIDs)}, nil
}

// ErrDuplicatePhotoID: ReplacePhotos에 중복 photo_id가 포함된 경우. handler가 400으로 변환.
var ErrDuplicatePhotoID = errors.New("duplicate photo id")

