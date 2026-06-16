package api

import (
	"context"
	"net/http"
)

// AdminUsersService backs the /admin/users/* endpoints.
// Stub responses are returned when not wired (Server.AdminUsers nil) so the
// generated StrictServerInterface stays satisfied during incremental rollout.
type AdminUsersService interface {
	ListUsers(ctx context.Context, req ListAdminUsersRequestObject) (ListAdminUsersResponseObject, error)
	GetUser(ctx context.Context, req GetAdminUserRequestObject) (GetAdminUserResponseObject, error)
	ListActivities(ctx context.Context, req ListAdminUserActivitiesRequestObject) (ListAdminUserActivitiesResponseObject, error)
}

func (s *Server) ListAdminUsers(ctx context.Context, req ListAdminUsersRequestObject) (ListAdminUsersResponseObject, error) {
	if s.AdminUsers != nil {
		return s.AdminUsers.ListUsers(ctx, req)
	}
	return listAdminUsersNotImpl{}, nil
}

func (s *Server) GetAdminUser(ctx context.Context, req GetAdminUserRequestObject) (GetAdminUserResponseObject, error) {
	if s.AdminUsers != nil {
		return s.AdminUsers.GetUser(ctx, req)
	}
	return getAdminUserNotImpl{}, nil
}

func (s *Server) ListAdminUserActivities(ctx context.Context, req ListAdminUserActivitiesRequestObject) (ListAdminUserActivitiesResponseObject, error) {
	if s.AdminUsers != nil {
		return s.AdminUsers.ListActivities(ctx, req)
	}
	return listAdminUserActivitiesNotImpl{}, nil
}

type listAdminUsersNotImpl struct{}

func (listAdminUsersNotImpl) VisitListAdminUsersResponse(w http.ResponseWriter) error {
	return notImplementedResponse{"ListAdminUsers"}.write(w)
}

type getAdminUserNotImpl struct{}

func (getAdminUserNotImpl) VisitGetAdminUserResponse(w http.ResponseWriter) error {
	return notImplementedResponse{"GetAdminUser"}.write(w)
}

type listAdminUserActivitiesNotImpl struct{}

func (listAdminUserActivitiesNotImpl) VisitListAdminUserActivitiesResponse(w http.ResponseWriter) error {
	return notImplementedResponse{"ListAdminUserActivities"}.write(w)
}
