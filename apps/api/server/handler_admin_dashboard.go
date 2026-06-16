package api

import (
	"context"
	"net/http"
)

// AdminDashboardService backs the /admin/dashboard/* endpoints.
type AdminDashboardService interface {
	Stats(ctx context.Context, req GetAdminDashboardStatsRequestObject) (GetAdminDashboardStatsResponseObject, error)
	Recent(ctx context.Context, req GetAdminDashboardRecentRequestObject) (GetAdminDashboardRecentResponseObject, error)
	Health(ctx context.Context, req GetAdminDashboardHealthRequestObject) (GetAdminDashboardHealthResponseObject, error)
}

func (s *Server) GetAdminDashboardStats(ctx context.Context, req GetAdminDashboardStatsRequestObject) (GetAdminDashboardStatsResponseObject, error) {
	if s.AdminDashboard != nil {
		return s.AdminDashboard.Stats(ctx, req)
	}
	return getAdminDashboardStatsNotImpl{}, nil
}

func (s *Server) GetAdminDashboardRecent(ctx context.Context, req GetAdminDashboardRecentRequestObject) (GetAdminDashboardRecentResponseObject, error) {
	if s.AdminDashboard != nil {
		return s.AdminDashboard.Recent(ctx, req)
	}
	return getAdminDashboardRecentNotImpl{}, nil
}

func (s *Server) GetAdminDashboardHealth(ctx context.Context, req GetAdminDashboardHealthRequestObject) (GetAdminDashboardHealthResponseObject, error) {
	if s.AdminDashboard != nil {
		return s.AdminDashboard.Health(ctx, req)
	}
	return getAdminDashboardHealthNotImpl{}, nil
}

type getAdminDashboardStatsNotImpl struct{}

func (getAdminDashboardStatsNotImpl) VisitGetAdminDashboardStatsResponse(w http.ResponseWriter) error {
	return notImplementedResponse{"GetAdminDashboardStats"}.write(w)
}

type getAdminDashboardRecentNotImpl struct{}

func (getAdminDashboardRecentNotImpl) VisitGetAdminDashboardRecentResponse(w http.ResponseWriter) error {
	return notImplementedResponse{"GetAdminDashboardRecent"}.write(w)
}

type getAdminDashboardHealthNotImpl struct{}

func (getAdminDashboardHealthNotImpl) VisitGetAdminDashboardHealthResponse(w http.ResponseWriter) error {
	return notImplementedResponse{"GetAdminDashboardHealth"}.write(w)
}
