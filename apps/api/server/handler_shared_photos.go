package api

import (
	"context"
	"fmt"
	"hash/fnv"
	"io"
	"net/http"

	"gorae-api/db"

	"github.com/jackc/pgx/v5/pgtype"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// 시나리오 §3 [확정]: 하객 1인당 100장 한도.
const sharedPhotoQuotaPerGuest = 100

// ── typed responses (spec에 schema 없는 상태코드는 직접 구현) ──

type listSP401 struct{}

func (listSP401) VisitListSharedPhotosResponse(w http.ResponseWriter) error {
	w.WriteHeader(http.StatusUnauthorized)
	return nil
}

type listSP403 struct{}

func (listSP403) VisitListSharedPhotosResponse(w http.ResponseWriter) error {
	w.WriteHeader(http.StatusForbidden)
	return nil
}

type createSP401 struct{}

func (createSP401) VisitCreateSharedPhotoResponse(w http.ResponseWriter) error {
	w.WriteHeader(http.StatusUnauthorized)
	return nil
}

type createSP403 struct{}

func (createSP403) VisitCreateSharedPhotoResponse(w http.ResponseWriter) error {
	w.WriteHeader(http.StatusForbidden)
	return nil
}

type createSP400 struct{ detail string }

func (r createSP400) VisitCreateSharedPhotoResponse(w http.ResponseWriter) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	_, _ = fmt.Fprintf(w, `{"type":"about:blank","title":"Bad Request","status":400,"detail":%q}`, r.detail)
	return nil
}

// 본인 wedding의 lounge인지 = 그 lounge의 wedding에 user가 host owner.
func (s *Server) isLoungeHost(ctx context.Context, loungeID, userID openapi_types.UUID) bool {
	if s.Pool == nil {
		return false
	}
	var count int
	err := s.Pool.QueryRow(ctx, `
        SELECT count(*) FROM v3_wedding_lounges wl
        JOIN v3_weddings w ON w.id = wl.wedding_id
        WHERE wl.id=$1 AND (
            w.host_groom_id=$2 OR w.host_bride_id=$2 OR
            w.host_groom_father_id=$2 OR w.host_groom_mother_id=$2 OR
            w.host_bride_father_id=$2 OR w.host_bride_mother_id=$2
        )`, pgtype.UUID{Bytes: loungeID, Valid: true}, pgtype.UUID{Bytes: userID, Valid: true}).Scan(&count)
	if err != nil {
		return false
	}
	return count > 0
}

func (s *Server) ListSharedPhotos(ctx context.Context, req ListSharedPhotosRequestObject) (ListSharedPhotosResponseObject, error) {
	userIDPg, ok := UserIDFromContext(ctx)
	if !ok {
		return listSP401{}, nil
	}
	userID := openapi_types.UUID(userIDPg.Bytes)

	isHost := s.isLoungeHost(ctx, req.LoungeId, userID)
	isEntrant := s.userIsLoungeEntrant(ctx, req.LoungeId, userID)

	if !isHost && !isEntrant {
		return listSP403{}, nil
	}

	q := db.New(s.Pool)
	var rows []db.V3SharedPhoto
	var err error

	switch {
	case isHost && req.Params.GuestUserId != nil:
		// host + query 필터
		rows, err = q.ListSharedPhotosByLoungeAndGuest(ctx, db.ListSharedPhotosByLoungeAndGuestParams{
			LoungeID:    pgtype.UUID{Bytes: req.LoungeId, Valid: true},
			GuestUserID: pgtype.UUID{Bytes: *req.Params.GuestUserId, Valid: true},
		})
	case isHost:
		// host 전체
		rows, err = q.ListSharedPhotosByLounge(ctx, pgtype.UUID{Bytes: req.LoungeId, Valid: true})
	default:
		// 입장자: 본인 것만 (query param 무시)
		rows, err = q.ListSharedPhotosByLoungeAndGuest(ctx, db.ListSharedPhotosByLoungeAndGuestParams{
			LoungeID:    pgtype.UUID{Bytes: req.LoungeId, Valid: true},
			GuestUserID: pgtype.UUID{Bytes: userID, Valid: true},
		})
	}
	if err != nil {
		return nil, err
	}

	out := make([]SharedPhoto, 0, len(rows))
	for _, r := range rows {
		out = append(out, sharedPhotoRowToAPI(r))
	}
	return ListSharedPhotos200JSONResponse{Data: out}, nil
}

// CreateSharedPhoto — race-safe 한도 검증:
// (lounge_id, guest_user_id) advisory_xact_lock으로 동일 키 트랜잭션 직렬화 →
// count<100 검증 → INSERT. -race 8 goroutine 동시 호출에도 일관.
func (s *Server) CreateSharedPhoto(ctx context.Context, req CreateSharedPhotoRequestObject) (CreateSharedPhotoResponseObject, error) {
	userIDPg, ok := UserIDFromContext(ctx)
	if !ok {
		return createSP401{}, nil
	}
	userID := openapi_types.UUID(userIDPg.Bytes)
	if !s.userIsLoungeEntrant(ctx, req.LoungeId, userID) {
		return createSP403{}, nil
	}
	if req.Body == nil {
		return createSP400{detail: "request body required"}, nil
	}
	body := *req.Body

	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	lockKey := advisoryLockKey(req.LoungeId, userID)
	if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock($1)", lockKey); err != nil {
		return nil, err
	}
	var count int
	if err := tx.QueryRow(ctx,
		`SELECT count(*)::int FROM v3_shared_photos WHERE lounge_id=$1 AND guest_user_id=$2`,
		pgtype.UUID{Bytes: req.LoungeId, Valid: true},
		pgtype.UUID{Bytes: userID, Valid: true},
	).Scan(&count); err != nil {
		return nil, err
	}
	if count >= sharedPhotoQuotaPerGuest {
		return createSP400{detail: fmt.Sprintf("quota exceeded: %d/%d photos for this guest", count, sharedPhotoQuotaPerGuest)}, nil
	}

	var rowID, loungeID, guestUID pgtype.UUID
	var sp pgtype.Text
	var fn pgtype.Text
	var fs pgtype.Int4
	var mt pgtype.Text
	var created pgtype.Timestamptz
	if err := tx.QueryRow(ctx, `
        INSERT INTO v3_shared_photos (lounge_id, guest_user_id, storage_path, file_name, file_size, mime_type)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, lounge_id, guest_user_id, storage_path, file_name, file_size, mime_type, created_at`,
		pgtype.UUID{Bytes: req.LoungeId, Valid: true},
		pgtype.UUID{Bytes: userID, Valid: true},
		body.StoragePath,
		textPtr(body.FileName),
		int4Ptr(body.FileSize),
		textPtr(body.MimeType),
	).Scan(&rowID, &loungeID, &guestUID, &sp, &fn, &fs, &mt, &created); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	api := SharedPhoto{
		Id:          openapi_types.UUID(rowID.Bytes),
		LoungeId:    openapi_types.UUID(loungeID.Bytes),
		GuestUserId: openapi_types.UUID(guestUID.Bytes),
		StoragePath: sp.String,
		CreatedAt:   created.Time,
	}
	if fn.Valid {
		v := fn.String
		api.FileName = &v
	}
	if fs.Valid {
		v := int(fs.Int32)
		api.FileSize = &v
	}
	if mt.Valid {
		v := mt.String
		api.MimeType = &v
	}
	return CreateSharedPhoto201JSONResponse(api), nil
}

func sharedPhotoRowToAPI(r db.V3SharedPhoto) SharedPhoto {
	out := SharedPhoto{
		Id:          openapi_types.UUID(r.ID.Bytes),
		LoungeId:    openapi_types.UUID(r.LoungeID.Bytes),
		GuestUserId: openapi_types.UUID(r.GuestUserID.Bytes),
		StoragePath: r.StoragePath,
		CreatedAt:   r.CreatedAt.Time,
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

func advisoryLockKey(loungeID, userID openapi_types.UUID) int64 {
	h := fnv.New64a()
	h.Write(loungeID[:])
	h.Write(userID[:])
	return int64(h.Sum64())
}

// ── DownloadSharedPhotosZip (T-11c) ─────────────────────────────────────

type downloadSPZ401 struct{}

func (downloadSPZ401) VisitDownloadSharedPhotosZipResponse(w http.ResponseWriter) error {
	w.WriteHeader(http.StatusUnauthorized)
	return nil
}

type downloadSPZ403 struct{}

func (downloadSPZ403) VisitDownloadSharedPhotosZipResponse(w http.ResponseWriter) error {
	w.WriteHeader(http.StatusForbidden)
	return nil
}

type downloadSPZ404 struct{}

func (downloadSPZ404) VisitDownloadSharedPhotosZipResponse(w http.ResponseWriter) error {
	w.WriteHeader(http.StatusNotFound)
	return nil
}

// DownloadSharedPhotosZip — host only, ?guest_user_id 필수.
// io.Pipe로 ZIP 스트리밍(메모리 한도 = 한 객체).
func (s *Server) DownloadSharedPhotosZip(ctx context.Context, req DownloadSharedPhotosZipRequestObject) (DownloadSharedPhotosZipResponseObject, error) {
	userIDPg, ok := UserIDFromContext(ctx)
	if !ok {
		return downloadSPZ401{}, nil
	}
	userID := openapi_types.UUID(userIDPg.Bytes)
	if !s.isLoungeHost(ctx, req.LoungeId, userID) {
		return downloadSPZ403{}, nil
	}

	q := db.New(s.Pool)
	rows, err := q.ListSharedPhotosByLoungeAndGuest(ctx, db.ListSharedPhotosByLoungeAndGuestParams{
		LoungeID:    pgtype.UUID{Bytes: req.LoungeId, Valid: true},
		GuestUserID: pgtype.UUID{Bytes: req.Params.GuestUserId, Valid: true},
	})
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return downloadSPZ404{}, nil
	}

	items := make([]SharedPhotoZipItem, 0, len(rows))
	for _, r := range rows {
		it := SharedPhotoZipItem{StoragePath: r.StoragePath}
		if r.FileName.Valid {
			it.FileName = r.FileName.String
		}
		items = append(items, it)
	}

	pr, pw := io.Pipe()
	uploader := s.Uploader
	// shared 사진은 모두 private bucket. closure로 bucket을 캡처해 WriteSharedPhotosZip의
	// fetch 시그니처(ctx, storagePath)를 유지한다.
	bucket := s.UploadBucketPrivate
	fetch := func(c context.Context, path string) (io.ReadCloser, error) {
		return uploader.Download(c, bucket, path)
	}
	go func() {
		defer pw.Close()
		_ = WriteSharedPhotosZip(ctx, pw, items, fetch)
	}()
	return DownloadSharedPhotosZip200ApplicationzipResponse{Body: pr}, nil
}
