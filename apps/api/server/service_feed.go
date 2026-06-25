package api

import (
	"context"
	"sort"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

type feedService struct {
	pool *pgxpool.Pool
}

func NewFeedService(pool *pgxpool.Pool) FeedService {
	return &feedService{pool: pool}
}

// feedRow is an internal type holding a raw feed item before conversion.
type feedRow struct {
	itemType  FeedItemType
	id        pgtype.UUID
	createdAt time.Time
	data      map[string]interface{}
}

func (s *feedService) ListFeed(ctx context.Context, loungeID openapi_types.UUID, userID *openapi_types.UUID, cursor *string, limit int) ([]FeedItem, bool, *string, error) {
	// Parse cursor timestamp.
	var cursorTime *time.Time
	if cursor != nil {
		t, err := time.Parse(time.RFC3339Nano, *cursor)
		if err == nil {
			cursorTime = &t
		}
	}

	// Fetch limit+1 from each source to allow proper merge + hasMore detection.
	fetchLimit := limit + 1

	// Fetch all 3 sources concurrently would be nice, but for simplicity we do sequential.
	guestRows, err := s.fetchGuestbookEntries(ctx, loungeID, cursorTime, fetchLimit)
	if err != nil {
		return nil, false, nil, err
	}

	announcementRows, err := s.fetchAnnouncements(ctx, loungeID, cursorTime, fetchLimit)
	if err != nil {
		return nil, false, nil, err
	}

	moiRows, err := s.fetchLoungeCheckIns(ctx, loungeID, cursorTime, fetchLimit)
	if err != nil {
		return nil, false, nil, err
	}

	msgRows, err := s.fetchGuestbookMessages(ctx, loungeID, cursorTime, fetchLimit)
	if err != nil {
		return nil, false, nil, err
	}

	memoryRows, err := s.fetchMemories(ctx, loungeID, cursorTime, fetchLimit)
	if err != nil {
		return nil, false, nil, err
	}

	// Merge all rows, sort by created_at DESC.
	all := make([]feedRow, 0, len(guestRows)+len(announcementRows)+len(moiRows)+len(msgRows)+len(memoryRows))
	all = append(all, guestRows...)
	all = append(all, announcementRows...)
	all = append(all, moiRows...)
	all = append(all, msgRows...)
	all = append(all, memoryRows...)

	sort.Slice(all, func(i, j int) bool {
		return all[i].createdAt.After(all[j].createdAt)
	})

	// Take limit+1 to determine hasMore, then trim.
	hasMore := len(all) > limit
	if len(all) > limit {
		all = all[:limit]
	}

	// Convert to FeedItem with heart/comment counts.
	// 성능 참고: 항목당 3회 개별 쿼리(N+1). limit=20 기준 최대 60회.
	// 배치 쿼리(IN (...) GROUP BY)로 1회로 줄일 수 있으나 sqlc 재설계 필요.
	items := make([]FeedItem, len(all))
	for i, row := range all {
		item := FeedItem{
			Type:      row.itemType,
			Id:        uuidToOpenapi(row.id),
			CreatedAt: row.createdAt,
			Data:      &row.data,
		}

		// heart_count, comment_count, my_heart only for guestbook_entry and host_announcement.
		if row.itemType != FeedItemTypeLoungeCheckIn {
			targetType := string(row.itemType)
			targetID := row.id

			hc, err := s.countHearts(ctx, targetType, targetID)
			if err != nil {
				return nil, false, nil, err
			}
			item.HeartCount = &hc

			cc, err := s.countComments(ctx, targetType, targetID)
			if err != nil {
				return nil, false, nil, err
			}
			item.CommentCount = &cc

			if userID != nil {
				mh, err := s.hasMyHeart(ctx, targetType, targetID, *userID)
				if err != nil {
					return nil, false, nil, err
				}
				item.MyHeart = &mh
			} else {
				f := false
				item.MyHeart = &f
			}
		}

		items[i] = item
	}

	var nextCursor *string
	if hasMore && len(items) > 0 {
		last := items[len(items)-1]
		c := last.CreatedAt.Format(time.RFC3339Nano)
		nextCursor = &c
	}

	return items, hasMore, nextCursor, nil
}

func (s *feedService) fetchGuestbookEntries(ctx context.Context, loungeID openapi_types.UUID, cursorTime *time.Time, limit int) ([]feedRow, error) {
	// entry 본문 일원화(20260525130000): entries.message 컬럼 사라짐.
	// 본문은 v3_guestbook_messages에서 별도 표시(fetchGuestbookMessages).
	query := `SELECT id, guest_name, recipient_slot, relation_category, relation_detail, created_at
		FROM v3_guestbook_entries
		WHERE lounge_id = $1`
	args := []interface{}{pgtype.UUID{Bytes: loungeID, Valid: true}}

	if cursorTime != nil {
		query += ` AND created_at < $2 ORDER BY created_at DESC LIMIT $3`
		args = append(args, pgtype.Timestamptz{Time: *cursorTime, Valid: true}, limit)
	} else {
		query += ` ORDER BY created_at DESC LIMIT $2`
		args = append(args, limit)
	}

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []feedRow
	for rows.Next() {
		var (
			id               pgtype.UUID
			guestName        string
			recipientSlot    string
			relationCategory string
			relationDetail   pgtype.Text
			createdAt        pgtype.Timestamptz
		)
		if err := rows.Scan(&id, &guestName, &recipientSlot, &relationCategory, &relationDetail, &createdAt); err != nil {
			return nil, err
		}

		data := map[string]interface{}{
			"guest_name":        guestName,
			"recipient_slot":    recipientSlot,
			"relation_category": relationCategory,
		}
		if relationDetail.Valid {
			data["relation_detail"] = relationDetail.String
		}

		result = append(result, feedRow{
			itemType:  FeedItemTypeGuestbookEntry,
			id:        id,
			createdAt: createdAt.Time,
			data:      data,
		})
	}
	return result, rows.Err()
}

func (s *feedService) fetchAnnouncements(ctx context.Context, loungeID openapi_types.UUID, cursorTime *time.Time, limit int) ([]feedRow, error) {
	query := `SELECT ha.id, ha.message, ha.is_pinned, ha.created_at,
		u.name AS author_name,
		CASE
			WHEN ha.host_id = w.host_groom_id THEN 'groom'
			WHEN ha.host_id = w.host_bride_id THEN 'bride'
			WHEN ha.host_id = w.host_groom_father_id THEN 'groom_father'
			WHEN ha.host_id = w.host_groom_mother_id THEN 'groom_mother'
			WHEN ha.host_id = w.host_bride_father_id THEN 'bride_father'
			WHEN ha.host_id = w.host_bride_mother_id THEN 'bride_mother'
			ELSE NULL
		END AS author_role
		FROM v3_host_announcements ha
		JOIN v3_users u ON u.id = ha.host_id
		JOIN v3_wedding_lounges wl ON wl.id = ha.lounge_id
		JOIN v3_weddings w ON w.id = wl.wedding_id
		WHERE ha.lounge_id = $1 AND ha.deleted_at IS NULL`
	args := []interface{}{pgtype.UUID{Bytes: loungeID, Valid: true}}

	if cursorTime != nil {
		query += ` AND ha.created_at < $2 ORDER BY ha.created_at DESC LIMIT $3`
		args = append(args, pgtype.Timestamptz{Time: *cursorTime, Valid: true}, limit)
	} else {
		query += ` ORDER BY ha.created_at DESC LIMIT $2`
		args = append(args, limit)
	}

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []feedRow
	for rows.Next() {
		var (
			id         pgtype.UUID
			message    string
			isPinned   bool
			createdAt  pgtype.Timestamptz
			authorName string
			authorRole pgtype.Text
		)
		if err := rows.Scan(&id, &message, &isPinned, &createdAt, &authorName, &authorRole); err != nil {
			return nil, err
		}

		data := map[string]interface{}{
			"message":     message,
			"is_pinned":   isPinned,
			"author_name": authorName,
		}
		if authorRole.Valid {
			data["author_role"] = authorRole.String
		}

		result = append(result, feedRow{
			itemType:  FeedItemTypeHostAnnouncement,
			id:        id,
			createdAt: createdAt.Time,
			data:      data,
		})
	}
	return result, rows.Err()
}

func (s *feedService) fetchLoungeCheckIns(ctx context.Context, loungeID openapi_types.UUID, cursorTime *time.Time, limit int) ([]feedRow, error) {
	// 입장자가 호스트면 계정 이름(visitor_name) 대신 청첩장 실명(groom_name 등)을 표기한다.
	// 호스트가 자기 슬롯과 다른 계정명을 쓰는 경우(예: '신랑 김수영'인데 계정명 '박태원')를 바로잡는다.
	// 부모 슬롯 이름은 nullable이라 NULL이면 visitor_name으로 fallback.
	query := `SELECT mv.id,
		CASE
			WHEN mv.user_id = w.host_groom_id THEN w.groom_name
			WHEN mv.user_id = w.host_bride_id THEN w.bride_name
			WHEN mv.user_id = w.host_groom_father_id THEN COALESCE(w.groom_father_name, mv.visitor_name)
			WHEN mv.user_id = w.host_groom_mother_id THEN COALESCE(w.groom_mother_name, mv.visitor_name)
			WHEN mv.user_id = w.host_bride_father_id THEN COALESCE(w.bride_father_name, mv.visitor_name)
			WHEN mv.user_id = w.host_bride_mother_id THEN COALESCE(w.bride_mother_name, mv.visitor_name)
			ELSE mv.visitor_name
		END AS display_name, mv.created_at,
		CASE
			WHEN mv.user_id = w.host_groom_id THEN 'groom'
			WHEN mv.user_id = w.host_bride_id THEN 'bride'
			WHEN mv.user_id = w.host_groom_father_id THEN 'groom_father'
			WHEN mv.user_id = w.host_groom_mother_id THEN 'groom_mother'
			WHEN mv.user_id = w.host_bride_father_id THEN 'bride_father'
			WHEN mv.user_id = w.host_bride_mother_id THEN 'bride_mother'
			ELSE NULL
		END AS host_role,
		COALESCE(mv.recipient_slot, ge.recipient_slot) AS recipient_slot,
		COALESCE(mv.relation_category, ge.relation_category) AS relation_category,
		COALESCE(mv.relation_detail, ge.relation_detail) AS relation_detail
		FROM v3_lounge_check_ins mv
		JOIN v3_wedding_lounges wl ON wl.id = mv.lounge_id
		JOIN v3_weddings w ON w.id = wl.wedding_id
		LEFT JOIN LATERAL (
			SELECT recipient_slot, relation_category, relation_detail
			FROM v3_guestbook_entries
			WHERE guest_id = mv.user_id AND lounge_id = mv.lounge_id
			ORDER BY created_at DESC
			LIMIT 1
		) ge ON true
		WHERE mv.lounge_id = $1`
	args := []interface{}{pgtype.UUID{Bytes: loungeID, Valid: true}}

	if cursorTime != nil {
		query += ` AND mv.created_at < $2 ORDER BY mv.created_at DESC LIMIT $3`
		args = append(args, pgtype.Timestamptz{Time: *cursorTime, Valid: true}, limit)
	} else {
		query += ` ORDER BY mv.created_at DESC LIMIT $2`
		args = append(args, limit)
	}

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []feedRow
	for rows.Next() {
		var (
			id               pgtype.UUID
			visitorName      string
			createdAt        pgtype.Timestamptz
			hostRole         pgtype.Text
			recipientSlot    pgtype.Text
			relationCategory pgtype.Text
			relationDetail   pgtype.Text
		)
		if err := rows.Scan(&id, &visitorName, &createdAt, &hostRole, &recipientSlot, &relationCategory, &relationDetail); err != nil {
			return nil, err
		}

		data := map[string]interface{}{
			"visitor_name": visitorName,
		}
		if hostRole.Valid {
			data["is_host"] = true
			data["host_role"] = hostRole.String
		}
		if recipientSlot.Valid {
			data["recipient_slot"] = recipientSlot.String
		}
		if relationCategory.Valid {
			data["relation_category"] = relationCategory.String
		}
		if relationDetail.Valid {
			data["relation_detail"] = relationDetail.String
		}

		result = append(result, feedRow{
			itemType:  FeedItemTypeLoungeCheckIn,
			id:        id,
			createdAt: createdAt.Time,
			data:      data,
		})
	}
	return result, rows.Err()
}

func (s *feedService) fetchGuestbookMessages(ctx context.Context, loungeID openapi_types.UUID, cursorTime *time.Time, limit int) ([]feedRow, error) {
	// GuestbookMessage는 LIVE 축하메세지(현장 QR) text-only로 환원 — photo_url 제거.
	// 사진은 별도 v3_memories 도메인이 담당.
	query := `SELECT gm.id, gm.message, gm.created_at,
		ge.guest_name, ge.recipient_slot, ge.relation_category, ge.relation_detail,
		(SELECT count(*) FROM v3_guestbook_message_views v WHERE v.guestbook_message_id = gm.id) AS view_count
		FROM v3_guestbook_messages gm
		JOIN v3_guestbook_entries ge ON ge.id = gm.guestbook_entry_id
		WHERE ge.lounge_id = $1`
	args := []interface{}{pgtype.UUID{Bytes: loungeID, Valid: true}}

	if cursorTime != nil {
		query += ` AND gm.created_at < $2 ORDER BY gm.created_at DESC LIMIT $3`
		args = append(args, pgtype.Timestamptz{Time: *cursorTime, Valid: true}, limit)
	} else {
		query += ` ORDER BY gm.created_at DESC LIMIT $2`
		args = append(args, limit)
	}

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []feedRow
	for rows.Next() {
		var (
			id               pgtype.UUID
			message          string
			createdAt        pgtype.Timestamptz
			guestName        string
			recipientSlot    string
			relationCategory string
			relationDetail   pgtype.Text
			viewCount        int64
		)
		if err := rows.Scan(&id, &message, &createdAt, &guestName, &recipientSlot, &relationCategory, &relationDetail, &viewCount); err != nil {
			return nil, err
		}

		data := map[string]interface{}{
			"message":           message,
			"guest_name":        guestName,
			"recipient_slot":    recipientSlot,
			"relation_category": relationCategory,
			"view_count":        int(viewCount),
		}
		if relationDetail.Valid {
			data["relation_detail"] = relationDetail.String
		}

		result = append(result, feedRow{
			itemType:  FeedItemTypeGuestbookMessage,
			id:        id,
			createdAt: createdAt.Time,
			data:      data,
		})
	}
	return result, rows.Err()
}

// fetchMemories — 라운지 V2 "온기" 게시물을 라운지 피드에 통합.
// _scenario/memory-domain-split/SCENARIOS.md S-06·S-08.
// author_user_id로 v3_users JOIN해 author_name을 data에 포함(클라이언트 표시용).
func (s *feedService) fetchMemories(ctx context.Context, loungeID openapi_types.UUID, cursorTime *time.Time, limit int) ([]feedRow, error) {
	query := `SELECT m.id, m.created_at, m.text, m.photo_url, m.author_user_id, u.name
		FROM v3_memories m
		JOIN v3_users u ON u.id = m.author_user_id
		WHERE m.lounge_id = $1 AND m.deleted_at IS NULL`
	args := []interface{}{pgtype.UUID{Bytes: loungeID, Valid: true}}

	if cursorTime != nil {
		query += ` AND m.created_at < $2 ORDER BY m.created_at DESC LIMIT $3`
		args = append(args, pgtype.Timestamptz{Time: *cursorTime, Valid: true}, limit)
	} else {
		query += ` ORDER BY m.created_at DESC LIMIT $2`
		args = append(args, limit)
	}

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []feedRow
	for rows.Next() {
		var (
			id           pgtype.UUID
			createdAt    pgtype.Timestamptz
			text         string
			photoURL     pgtype.Text
			authorUserID pgtype.UUID
			authorName   string
		)
		if err := rows.Scan(&id, &createdAt, &text, &photoURL, &authorUserID, &authorName); err != nil {
			return nil, err
		}

		data := map[string]interface{}{
			"text":           text,
			"author_user_id": uuidToOpenapi(authorUserID).String(),
			"author_name":    authorName,
		}
		if photoURL.Valid {
			data["photo_url"] = photoURL.String
		}

		result = append(result, feedRow{
			itemType:  FeedItemTypeMemory,
			id:        id,
			createdAt: createdAt.Time,
			data:      data,
		})
	}
	return result, rows.Err()
}

func (s *feedService) countHearts(ctx context.Context, targetType string, targetID pgtype.UUID) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM v3_feed_hearts WHERE target_type = $1 AND target_id = $2`,
		targetType, targetID,
	).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

func (s *feedService) countComments(ctx context.Context, targetType string, targetID pgtype.UUID) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM v3_feed_comments WHERE target_type = $1 AND target_id = $2 AND deleted_at IS NULL`,
		targetType, targetID,
	).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

func (s *feedService) hasMyHeart(ctx context.Context, targetType string, targetID pgtype.UUID, userID openapi_types.UUID) (bool, error) {
	var exists bool
	err := s.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM v3_feed_hearts WHERE user_id = $1 AND target_type = $2 AND target_id = $3)`,
		pgtype.UUID{Bytes: userID, Valid: true}, targetType, targetID,
	).Scan(&exists)
	if err != nil {
		if err == pgx.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return exists, nil
}
