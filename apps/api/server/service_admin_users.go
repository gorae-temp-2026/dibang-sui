package api

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"

	"gorae-api/db"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// adminUsersService backs AdminUsersService. Wraps sqlc Queries + a Supabase
// auth.users metadata provider.
type adminUsersService struct {
	pool   *pgxpool.Pool
	authCl AuthMetaProvider
}

// AuthMetaProvider lets tests substitute the Supabase Admin client.
type AuthMetaProvider interface {
	ListAuthUsers(ctx context.Context, ids []string) (map[string]AuthUserMeta, error)
	GetAuthUser(ctx context.Context, id string) (AuthUserMeta, error)
}

func NewAdminUsersService(pool *pgxpool.Pool, authCl AuthMetaProvider) AdminUsersService {
	return &adminUsersService{pool: pool, authCl: authCl}
}

// ListUsers handles GET /admin/users.
func (s *adminUsersService) ListUsers(ctx context.Context, req ListAdminUsersRequestObject) (ListAdminUsersResponseObject, error) {
	page, limit := normalizePagination(req.Params.Page, req.Params.Limit, 50, 200)
	search := ""
	if req.Params.Search != nil {
		search = strings.TrimSpace(*req.Params.Search)
	}

	q := db.New(s.pool)
	rows, err := q.ListAdminUsers(ctx, db.ListAdminUsersParams{
		Search: search,
		Lim:    int32(limit),
		Off:    int32((page - 1) * limit),
	})
	if err != nil {
		return nil, err
	}

	ids := make([]string, 0, len(rows))
	for _, r := range rows {
		ids = append(ids, uuidStringFrom(r.ID))
	}
	metas := map[string]AuthUserMeta{}
	if s.authCl != nil && len(ids) > 0 {
		m, err := s.authCl.ListAuthUsers(ctx, ids)
		if err != nil {
			log.Printf("admin: ListAuthUsers failed (non-fatal): %v", err)
		} else {
			metas = m
		}
	}

	data := make([]AdminUser, 0, len(rows))
	total := 0
	for _, r := range rows {
		total = int(r.TotalCount)
		data = append(data, buildAdminUser(r.ID, r.Name, r.Email, r.Phone, r.ProfileImageUrl, r.CreatedAt, int(r.OwnWeddingsCount), int(r.GuestWeddingsCount), metas[uuidStringFrom(r.ID)]))
	}

	return ListAdminUsers200JSONResponse(AdminUserList{
		Data: data,
		Meta: AdminPagination{Page: page, Limit: limit, Total: total},
	}), nil
}

// GetUser handles GET /admin/users/{userId}.
func (s *adminUsersService) GetUser(ctx context.Context, req GetAdminUserRequestObject) (GetAdminUserResponseObject, error) {
	uid := pgtype.UUID{Bytes: req.UserId, Valid: true}
	q := db.New(s.pool)

	row, err := q.GetAdminUser(ctx, uid)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			detail := "user not found"
			return GetAdminUser404JSONResponse{NotFoundJSONResponse(ProblemDetail{
				Type: "about:blank", Title: "Not Found", Status: 404,
				Detail: &detail,
			})}, nil
		}
		return nil, err
	}

	parts, err := q.ListAdminUserHostParticipations(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("host participations: %w", err)
	}
	counts, err := q.GetAdminUserActivityCounts(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("activity counts: %w", err)
	}

	var authMeta AuthUserMeta
	if s.authCl != nil {
		meta, err := s.authCl.GetAuthUser(ctx, uuidStringFrom(row.ID))
		if err != nil {
			log.Printf("admin: GetAuthUser failed (non-fatal): %v", err)
		} else {
			authMeta = meta
		}
	}

	base := buildAdminUser(row.ID, row.Name, row.Email, row.Phone, row.ProfileImageUrl, row.CreatedAt, int(row.OwnWeddingsCount), int(row.GuestWeddingsCount), authMeta)

	hostParts := make([]AdminHostParticipation, 0, len(parts))
	for _, p := range parts {
		var datePtr *openapi_types.Date
		if p.WeddingDate.Valid {
			d := openapi_types.Date{Time: p.WeddingDate.Time}
			datePtr = &d
		}
		hostParts = append(hostParts, AdminHostParticipation{
			WeddingId:     uuidToOpenapi(p.WeddingID),
			WeddingLabel:  fmt.Sprintf("%s ♥ %s", p.GroomName, p.BrideName),
			Slot:          AdminHostParticipationSlot(p.SlotKind),
			WeddingDate:   datePtr,
			WeddingStatus: p.WeddingStatus,
		})
	}

	isPlaceholder := uuidStringFrom(row.ID) == placeholderUserID()
	detail := AdminUserDetail{
		Id:                 base.Id,
		Name:               base.Name,
		Email:              base.Email,
		Phone:              base.Phone,
		ProfileImageUrl:    base.ProfileImageUrl,
		CreatedAt:          base.CreatedAt,
		Provider:           base.Provider,
		LastSignInAt:       base.LastSignInAt,
		OwnWeddingsCount:   base.OwnWeddingsCount,
		GuestWeddingsCount: base.GuestWeddingsCount,
		HostParticipations: hostParts,
		ActivityCounts: AdminActivityCounts{
			Guestbook:    int(counts.Guestbook),
			CashGifts:    int(counts.CashGifts),
			Messages:     int(counts.Messages),
			SharedPhotos: int(counts.SharedPhotos),
			Memories:     int(counts.Memories),
			MemoryBook:   int(counts.MemoryBook),
			Lounge:       int(counts.Lounge),
		},
		IsPlaceholder: &isPlaceholder,
	}
	return GetAdminUser200JSONResponse(detail), nil
}

// ListActivities handles GET /admin/users/{userId}/activities.
func (s *adminUsersService) ListActivities(ctx context.Context, req ListAdminUserActivitiesRequestObject) (ListAdminUserActivitiesResponseObject, error) {
	page, limit := normalizePagination(req.Params.Page, req.Params.Limit, 50, 200)
	uid := pgtype.UUID{Bytes: req.UserId, Valid: true}
	off := int32((page - 1) * limit)
	lim := int32(limit)

	activityType := ListAdminUserActivitiesParamsTypeAll
	if req.Params.Type != nil {
		activityType = *req.Params.Type
	}

	data, total, err := s.fetchActivities(ctx, activityType, uid, lim, off)
	if err != nil {
		return nil, err
	}
	return ListAdminUserActivities200JSONResponse(AdminActivityList{
		Data: data,
		Meta: AdminPagination{Page: page, Limit: limit, Total: total},
	}), nil
}

func (s *adminUsersService) fetchActivities(ctx context.Context, t ListAdminUserActivitiesParamsType, uid pgtype.UUID, lim, off int32) ([]AdminActivity, int, error) {
	q := db.New(s.pool)
	switch t {
	case ListAdminUserActivitiesParamsTypeGuestbook:
		rows, err := q.ListAdminGuestbookActivities(ctx, db.ListAdminGuestbookActivitiesParams{GuestID: uid, Lim: lim, Off: off})
		if err != nil {
			return nil, 0, err
		}
		out := make([]AdminActivity, 0, len(rows))
		total := 0
		for _, r := range rows {
			total = int(r.TotalCount)
			out = append(out, AdminActivity{
				Id: uuidToOpenapi(r.ID), Type: AdminActivityTypeGuestbook,
				WeddingId: uuidToOpenapi(r.WeddingID),
				WeddingLabel: weddingLabel(r.GroomName, r.BrideName),
				Role: Guest, Summary: r.Summary,
				CreatedAt: r.CreatedAt.Time,
			})
		}
		return out, total, nil
	case ListAdminUserActivitiesParamsTypeCashGifts:
		rows, err := q.ListAdminCashGiftActivities(ctx, db.ListAdminCashGiftActivitiesParams{GuestID: uid, Lim: lim, Off: off})
		if err != nil {
			return nil, 0, err
		}
		out := make([]AdminActivity, 0, len(rows))
		total := 0
		for _, r := range rows {
			total = int(r.TotalCount)
			amt := int(r.Amount)
			summary := fmt.Sprintf("%d원", amt)
			if r.RelationSummary != "" {
				summary = r.RelationSummary + " — " + summary
			}
			out = append(out, AdminActivity{
				Id: uuidToOpenapi(r.ID), Type: AdminActivityTypeCashGifts,
				WeddingId: uuidToOpenapi(r.WeddingID),
				WeddingLabel: weddingLabel(r.GroomName, r.BrideName),
				Role: Guest, Summary: summary,
				Amount: &amt, CreatedAt: r.CreatedAt.Time,
			})
		}
		return out, total, nil
	case ListAdminUserActivitiesParamsTypeMessages:
		rows, err := q.ListAdminMessageActivities(ctx, db.ListAdminMessageActivitiesParams{GuestID: uid, Lim: lim, Off: off})
		if err != nil {
			return nil, 0, err
		}
		out := make([]AdminActivity, 0, len(rows))
		total := 0
		for _, r := range rows {
			total = int(r.TotalCount)
			out = append(out, AdminActivity{
				Id: uuidToOpenapi(r.ID), Type: AdminActivityTypeMessages,
				WeddingId: uuidToOpenapi(r.WeddingID),
				WeddingLabel: weddingLabel(r.GroomName, r.BrideName),
				Role: Guest, Summary: truncate(r.Summary, 60),
				CreatedAt: r.CreatedAt.Time,
			})
		}
		return out, total, nil
	case ListAdminUserActivitiesParamsTypeSharedPhotos:
		rows, err := q.ListAdminSharedPhotoActivities(ctx, db.ListAdminSharedPhotoActivitiesParams{GuestUserID: uid, Lim: lim, Off: off})
		if err != nil {
			return nil, 0, err
		}
		out := make([]AdminActivity, 0, len(rows))
		total := 0
		for _, r := range rows {
			total = int(r.TotalCount)
			out = append(out, AdminActivity{
				Id: uuidToOpenapi(r.ID), Type: AdminActivityTypeSharedPhotos,
				WeddingId: uuidToOpenapi(r.WeddingID),
				WeddingLabel: weddingLabel(r.GroomName, r.BrideName),
				Role: Guest, Summary: r.Summary,
				CreatedAt: r.CreatedAt.Time,
			})
		}
		return out, total, nil
	case ListAdminUserActivitiesParamsTypeMemories:
		rows, err := q.ListAdminMemoryActivities(ctx, db.ListAdminMemoryActivitiesParams{AuthorUserID: uid, Lim: lim, Off: off})
		if err != nil {
			return nil, 0, err
		}
		out := make([]AdminActivity, 0, len(rows))
		total := 0
		for _, r := range rows {
			total = int(r.TotalCount)
			out = append(out, AdminActivity{
				Id: uuidToOpenapi(r.ID), Type: AdminActivityTypeMemories,
				WeddingId: uuidToOpenapi(r.WeddingID),
				WeddingLabel: weddingLabel(r.GroomName, r.BrideName),
				Role: Guest, Summary: truncate(r.Summary, 60),
				CreatedAt: r.CreatedAt.Time,
			})
		}
		return out, total, nil
	case ListAdminUserActivitiesParamsTypeMemoryBook:
		rows, err := q.ListAdminMemoryBookActivities(ctx, db.ListAdminMemoryBookActivitiesParams{SelectedBy: uid, Lim: lim, Off: off})
		if err != nil {
			return nil, 0, err
		}
		out := make([]AdminActivity, 0, len(rows))
		total := 0
		for _, r := range rows {
			total = int(r.TotalCount)
			out = append(out, AdminActivity{
				Id: uuidToOpenapi(r.ID), Type: AdminActivityTypeMemoryBook,
				WeddingId: uuidToOpenapi(r.WeddingID),
				WeddingLabel: weddingLabel(r.GroomName, r.BrideName),
				Role: Host, Summary: "메모리북 사진 선택",
				CreatedAt: r.CreatedAt.Time,
			})
		}
		return out, total, nil
	case ListAdminUserActivitiesParamsTypeLounge:
		rows, err := q.ListAdminLoungeActivities(ctx, db.ListAdminLoungeActivitiesParams{UserID: uid, Lim: lim, Off: off})
		if err != nil {
			return nil, 0, err
		}
		out := make([]AdminActivity, 0, len(rows))
		total := 0
		for _, r := range rows {
			total = int(r.TotalCount)
			out = append(out, AdminActivity{
				Id: uuidToOpenapi(r.ID), Type: AdminActivityTypeLounge,
				WeddingId: uuidToOpenapi(r.WeddingID),
				WeddingLabel: weddingLabel(r.GroomName, r.BrideName),
				Role: Guest, Summary: r.Summary,
				CreatedAt: r.CreatedAt.Time,
			})
		}
		return out, total, nil
	case ListAdminUserActivitiesParamsTypeAll, "":
		return s.collectAllActivities(ctx, uid, lim, off)
	default:
		return nil, 0, fmt.Errorf("unsupported activity type: %s", t)
	}
}

// collectAllActivities fetches all 7 types up to soft cap, merges, then paginates the merged slice.
func (s *adminUsersService) collectAllActivities(ctx context.Context, uid pgtype.UUID, lim, off int32) ([]AdminActivity, int, error) {
	types := []ListAdminUserActivitiesParamsType{
		ListAdminUserActivitiesParamsTypeGuestbook,
		ListAdminUserActivitiesParamsTypeCashGifts,
		ListAdminUserActivitiesParamsTypeMessages,
		ListAdminUserActivitiesParamsTypeSharedPhotos,
		ListAdminUserActivitiesParamsTypeMemories,
		ListAdminUserActivitiesParamsTypeMemoryBook,
		ListAdminUserActivitiesParamsTypeLounge,
	}
	const softCap = 500
	merged := make([]AdminActivity, 0)
	for _, t := range types {
		sub, _, err := s.fetchActivities(ctx, t, uid, softCap, 0)
		if err != nil {
			return nil, 0, err
		}
		merged = append(merged, sub...)
	}
	sortActivitiesDesc(merged)
	total := len(merged)
	start := int(off)
	if start > total {
		start = total
	}
	end := start + int(lim)
	if end > total {
		end = total
	}
	return merged[start:end], total, nil
}

// --- helpers ---

func normalizePagination(p, l *int, defLimit, maxLimit int) (page, limit int) {
	page = 1
	limit = defLimit
	if p != nil && *p > 0 {
		page = *p
	}
	if l != nil && *l > 0 {
		limit = *l
	}
	if limit > maxLimit {
		limit = maxLimit
	}
	return
}

func buildAdminUser(id pgtype.UUID, name string, email string, phone pgtype.Text, profileImg pgtype.Text, createdAt pgtype.Timestamptz, ownCount, guestCount int, meta AuthUserMeta) AdminUser {
	u := AdminUser{
		Id: uuidToOpenapi(id), Name: name, Email: email,
		Phone: textPtrOrNil(phone), ProfileImageUrl: textPtrOrNil(profileImg),
		CreatedAt: createdAt.Time,
		OwnWeddingsCount:   ownCount,
		GuestWeddingsCount: guestCount,
	}
	if meta.Provider != "" {
		p := meta.Provider
		u.Provider = &p
	}
	if meta.LastSignInAt != nil {
		t, err := parseRFC3339(*meta.LastSignInAt)
		if err == nil {
			u.LastSignInAt = &t
		}
	}
	return u
}

func textPtrOrNil(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	v := t.String
	return &v
}

func uuidStringFrom(id pgtype.UUID) string {
	if !id.Valid {
		return ""
	}
	b := id.Bytes
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

func weddingLabel(groom, bride string) string {
	return fmt.Sprintf("%s ♥ %s", groom, bride)
}

func truncate(s string, max int) string {
	if len([]rune(s)) <= max {
		return s
	}
	r := []rune(s)
	return string(r[:max]) + "…"
}

// placeholderUserID returns the G-15 운영자 placeholder user UUID.
// See _research_analysis/legacy-v3-migration/decisions.md G-15.
func placeholderUserID() string { return "00000000-0000-0000-0000-000000000001" }
