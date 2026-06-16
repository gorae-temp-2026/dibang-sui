// handler_admin_dashboard_test — admin dashboard 핸들러 thin delegation 검증.
//
// 컨벤션: _code_convention/BACKEND_TESTING.md § 빠른 사이클(mock service).
// 책임:
//   - Server.AdminDashboard nil → notImpl 응답(VisitXxx가 501 작성).
//   - mock 설정 시 mock의 Stats/Recent/Health로 delegate.

package api

import (
	"context"
	"errors"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

// --- mock ---

type mockAdminDashboardService struct {
	StatsFn  func(ctx context.Context, req GetAdminDashboardStatsRequestObject) (GetAdminDashboardStatsResponseObject, error)
	RecentFn func(ctx context.Context, req GetAdminDashboardRecentRequestObject) (GetAdminDashboardRecentResponseObject, error)
	HealthFn func(ctx context.Context, req GetAdminDashboardHealthRequestObject) (GetAdminDashboardHealthResponseObject, error)
}

func (m *mockAdminDashboardService) Stats(ctx context.Context, req GetAdminDashboardStatsRequestObject) (GetAdminDashboardStatsResponseObject, error) {
	return m.StatsFn(ctx, req)
}
func (m *mockAdminDashboardService) Recent(ctx context.Context, req GetAdminDashboardRecentRequestObject) (GetAdminDashboardRecentResponseObject, error) {
	return m.RecentFn(ctx, req)
}
func (m *mockAdminDashboardService) Health(ctx context.Context, req GetAdminDashboardHealthRequestObject) (GetAdminDashboardHealthResponseObject, error) {
	return m.HealthFn(ctx, req)
}

func TestGetAdminDashboardStats_NilService_NotImpl(t *testing.T) {
	srv := &Server{}
	resp, err := srv.GetAdminDashboardStats(context.Background(), GetAdminDashboardStatsRequestObject{})
	assert.NoError(t, err)
	assert.IsType(t, getAdminDashboardStatsNotImpl{}, resp)

	// VisitXxx 가 501을 쓴다
	rec := httptest.NewRecorder()
	require := assert.New(t)
	require.NoError(resp.(getAdminDashboardStatsNotImpl).VisitGetAdminDashboardStatsResponse(rec))
	assert.Equal(t, 501, rec.Code)
}

func TestGetAdminDashboardStats_WithMock_Delegates(t *testing.T) {
	called := false
	srv := &Server{
		AdminDashboard: &mockAdminDashboardService{
			StatsFn: func(_ context.Context, _ GetAdminDashboardStatsRequestObject) (GetAdminDashboardStatsResponseObject, error) {
				called = true
				return nil, nil
			},
		},
	}
	_, _ = srv.GetAdminDashboardStats(context.Background(), GetAdminDashboardStatsRequestObject{})
	assert.True(t, called, "AdminDashboard.Stats should be invoked")
}

func TestGetAdminDashboardStats_MockError_Propagates(t *testing.T) {
	want := errors.New("boom")
	srv := &Server{
		AdminDashboard: &mockAdminDashboardService{
			StatsFn: func(_ context.Context, _ GetAdminDashboardStatsRequestObject) (GetAdminDashboardStatsResponseObject, error) {
				return nil, want
			},
		},
	}
	_, err := srv.GetAdminDashboardStats(context.Background(), GetAdminDashboardStatsRequestObject{})
	assert.ErrorIs(t, err, want)
}

func TestGetAdminDashboardRecent_NilService_NotImpl(t *testing.T) {
	srv := &Server{}
	resp, err := srv.GetAdminDashboardRecent(context.Background(), GetAdminDashboardRecentRequestObject{})
	assert.NoError(t, err)
	assert.IsType(t, getAdminDashboardRecentNotImpl{}, resp)
}

func TestGetAdminDashboardRecent_WithMock_Delegates(t *testing.T) {
	called := false
	srv := &Server{
		AdminDashboard: &mockAdminDashboardService{
			RecentFn: func(_ context.Context, _ GetAdminDashboardRecentRequestObject) (GetAdminDashboardRecentResponseObject, error) {
				called = true
				return nil, nil
			},
		},
	}
	_, _ = srv.GetAdminDashboardRecent(context.Background(), GetAdminDashboardRecentRequestObject{})
	assert.True(t, called)
}

func TestGetAdminDashboardHealth_NilService_NotImpl(t *testing.T) {
	srv := &Server{}
	resp, err := srv.GetAdminDashboardHealth(context.Background(), GetAdminDashboardHealthRequestObject{})
	assert.NoError(t, err)
	assert.IsType(t, getAdminDashboardHealthNotImpl{}, resp)
}

func TestGetAdminDashboardHealth_WithMock_Delegates(t *testing.T) {
	called := false
	srv := &Server{
		AdminDashboard: &mockAdminDashboardService{
			HealthFn: func(_ context.Context, _ GetAdminDashboardHealthRequestObject) (GetAdminDashboardHealthResponseObject, error) {
				called = true
				return nil, nil
			},
		},
	}
	_, _ = srv.GetAdminDashboardHealth(context.Background(), GetAdminDashboardHealthRequestObject{})
	assert.True(t, called)
}
