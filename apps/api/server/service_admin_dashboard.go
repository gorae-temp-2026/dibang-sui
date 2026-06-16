package api

import (
	"context"
	"fmt"

	"gorae-api/db"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

type adminDashboardService struct {
	pool *pgxpool.Pool
}

func NewAdminDashboardService(pool *pgxpool.Pool) AdminDashboardService {
	return &adminDashboardService{pool: pool}
}

func (s *adminDashboardService) Stats(ctx context.Context, _ GetAdminDashboardStatsRequestObject) (GetAdminDashboardStatsResponseObject, error) {
	q := db.New(s.pool)
	row, err := q.GetAdminDashboardStats(ctx)
	if err != nil {
		return nil, err
	}
	return GetAdminDashboardStats200JSONResponse(AdminDashboardStats{
		TodayWeddings:        int(row.TodayWeddings),
		TodayUsers:           int(row.TodayUsers),
		TodayCashGiftsCount:  int(row.TodayCashGiftsCount),
		TodayCashGiftsAmount: int(row.TodayCashGiftsAmount),
		TotalUsers:           int(row.TotalUsers),
		TotalWeddings:        int(row.TotalWeddings),
	}), nil
}

func (s *adminDashboardService) Recent(ctx context.Context, _ GetAdminDashboardRecentRequestObject) (GetAdminDashboardRecentResponseObject, error) {
	q := db.New(s.pool)
	uRows, err := q.ListAdminRecentUsers(ctx)
	if err != nil {
		return nil, err
	}
	wRows, err := q.ListAdminRecentWeddings(ctx)
	if err != nil {
		return nil, err
	}
	users := make([]AdminUser, 0, len(uRows))
	for _, r := range uRows {
		users = append(users, AdminUser{
			Id: uuidToOpenapi(r.ID), Name: r.Name, Email: r.Email,
			Phone: textPtrOrNil(r.Phone), ProfileImageUrl: textPtrOrNil(r.ProfileImageUrl),
			CreatedAt:          r.CreatedAt.Time,
			OwnWeddingsCount:   int(r.OwnWeddingsCount),
			GuestWeddingsCount: int(r.GuestWeddingsCount),
		})
	}
	weddings := make([]AdminWeddingSummary, 0, len(wRows))
	for _, r := range wRows {
		var datePtr *openapi_types.Date
		if r.Date.Valid {
			d := openapi_types.Date{Time: r.Date.Time}
			datePtr = &d
		}
		weddings = append(weddings, AdminWeddingSummary{
			Id: uuidToOpenapi(r.ID),
			GroomName: r.GroomName, BrideName: r.BrideName,
			Date: datePtr, Status: r.Status, CreatedAt: r.CreatedAt.Time,
		})
	}
	return GetAdminDashboardRecent200JSONResponse(AdminDashboardRecent{
		RecentUsers:    users,
		RecentWeddings: weddings,
	}), nil
}

func (s *adminDashboardService) Health(ctx context.Context, _ GetAdminDashboardHealthRequestObject) (GetAdminDashboardHealthResponseObject, error) {
	q := db.New(s.pool)
	var placeholderUUID pgtype.UUID
	if err := placeholderUUID.Scan(placeholderUserID()); err != nil {
		return nil, fmt.Errorf("placeholder uuid parse: %w", err)
	}
	row, err := q.GetAdminDashboardHealth(ctx, placeholderUUID)
	if err != nil {
		return nil, err
	}

	checks := []AdminHealthCheck{
		buildCheck(PlaceholderHostWeddings, float64(row.PlaceholderHostWeddings),
			"G-15 placeholder user가 호스트 슬롯에 등록된 wedding 수 (운영자 등록건 잔존)", 0, 0),
		buildCheck(NameFallbackUsers, float64(row.NameFallbackUsers),
			"name이 '사용자' 또는 email local-part로 폴백된 user 수 (휴리스틱)", 5, 50),
		buildCheck(DeletedWeddings, float64(row.DeletedWeddings),
			"status='deleted' 인 wedding 수 (운영자 등록 후 폐기 등)", 5, 50),
		buildCheck(DuplicateCouples, float64(row.DuplicateCouples),
			"같은 (groom_name, bride_name)에 wedding 2건 이상인 부부 수", 0, 10),
		buildCheck(NullHostSlotRatio, row.NullHostSlotRatio,
			"활성 wedding의 호스트 슬롯 6칸 중 NULL 비율 평균 (0~1)", 0, 0),
	}
	return GetAdminDashboardHealth200JSONResponse(AdminDashboardHealth{Checks: checks}), nil
}

func buildCheck(key AdminHealthCheckKey, value float64, desc string, warnAt, errorAt float64) AdminHealthCheck {
	sev := Ok
	if errorAt > 0 && value >= errorAt {
		sev = Error
	} else if warnAt > 0 && value >= warnAt {
		sev = Warn
	}
	return AdminHealthCheck{
		Key:         key,
		Value:       float32(value),
		Severity:    &sev,
		Description: desc,
	}
}
