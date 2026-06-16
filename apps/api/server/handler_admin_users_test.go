// handler_admin_users_test — admin users 핸들러 thin delegation 검증.
//
// 컨벤션: _code_convention/BACKEND_TESTING.md § 빠른 사이클(mock service).

package api

import (
	"context"
	"errors"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

type mockAdminUsersService struct {
	ListUsersFn      func(ctx context.Context, req ListAdminUsersRequestObject) (ListAdminUsersResponseObject, error)
	GetUserFn        func(ctx context.Context, req GetAdminUserRequestObject) (GetAdminUserResponseObject, error)
	ListActivitiesFn func(ctx context.Context, req ListAdminUserActivitiesRequestObject) (ListAdminUserActivitiesResponseObject, error)
}

func (m *mockAdminUsersService) ListUsers(ctx context.Context, req ListAdminUsersRequestObject) (ListAdminUsersResponseObject, error) {
	return m.ListUsersFn(ctx, req)
}
func (m *mockAdminUsersService) GetUser(ctx context.Context, req GetAdminUserRequestObject) (GetAdminUserResponseObject, error) {
	return m.GetUserFn(ctx, req)
}
func (m *mockAdminUsersService) ListActivities(ctx context.Context, req ListAdminUserActivitiesRequestObject) (ListAdminUserActivitiesResponseObject, error) {
	return m.ListActivitiesFn(ctx, req)
}

func TestListAdminUsers_NilService_NotImpl(t *testing.T) {
	srv := &Server{}
	resp, err := srv.ListAdminUsers(context.Background(), ListAdminUsersRequestObject{})
	assert.NoError(t, err)
	assert.IsType(t, listAdminUsersNotImpl{}, resp)

	rec := httptest.NewRecorder()
	assert.NoError(t, resp.(listAdminUsersNotImpl).VisitListAdminUsersResponse(rec))
	assert.Equal(t, 501, rec.Code)
}

func TestListAdminUsers_WithMock_Delegates(t *testing.T) {
	called := false
	srv := &Server{
		AdminUsers: &mockAdminUsersService{
			ListUsersFn: func(_ context.Context, _ ListAdminUsersRequestObject) (ListAdminUsersResponseObject, error) {
				called = true
				return nil, nil
			},
		},
	}
	_, _ = srv.ListAdminUsers(context.Background(), ListAdminUsersRequestObject{})
	assert.True(t, called)
}

func TestListAdminUsers_MockError_Propagates(t *testing.T) {
	want := errors.New("boom")
	srv := &Server{
		AdminUsers: &mockAdminUsersService{
			ListUsersFn: func(_ context.Context, _ ListAdminUsersRequestObject) (ListAdminUsersResponseObject, error) {
				return nil, want
			},
		},
	}
	_, err := srv.ListAdminUsers(context.Background(), ListAdminUsersRequestObject{})
	assert.ErrorIs(t, err, want)
}

func TestGetAdminUser_NilService_NotImpl(t *testing.T) {
	srv := &Server{}
	resp, err := srv.GetAdminUser(context.Background(), GetAdminUserRequestObject{})
	assert.NoError(t, err)
	assert.IsType(t, getAdminUserNotImpl{}, resp)
}

func TestGetAdminUser_WithMock_Delegates(t *testing.T) {
	called := false
	srv := &Server{
		AdminUsers: &mockAdminUsersService{
			GetUserFn: func(_ context.Context, _ GetAdminUserRequestObject) (GetAdminUserResponseObject, error) {
				called = true
				return nil, nil
			},
		},
	}
	_, _ = srv.GetAdminUser(context.Background(), GetAdminUserRequestObject{})
	assert.True(t, called)
}

func TestListAdminUserActivities_NilService_NotImpl(t *testing.T) {
	srv := &Server{}
	resp, err := srv.ListAdminUserActivities(context.Background(), ListAdminUserActivitiesRequestObject{})
	assert.NoError(t, err)
	assert.IsType(t, listAdminUserActivitiesNotImpl{}, resp)
}

func TestListAdminUserActivities_WithMock_Delegates(t *testing.T) {
	called := false
	srv := &Server{
		AdminUsers: &mockAdminUsersService{
			ListActivitiesFn: func(_ context.Context, _ ListAdminUserActivitiesRequestObject) (ListAdminUserActivitiesResponseObject, error) {
				called = true
				return nil, nil
			},
		},
	}
	_, _ = srv.ListAdminUserActivities(context.Background(), ListAdminUserActivitiesRequestObject{})
	assert.True(t, called)
}
