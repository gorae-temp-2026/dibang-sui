package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestAdminGuardPassesThroughNonAdminPath(t *testing.T) {
	served := false
	h := AdminGuard([]string{"/admin/"}, []string{"admin@gorae.dev"})(
		http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			served = true
			w.WriteHeader(http.StatusOK)
		}),
	)
	req := httptest.NewRequest(http.MethodGet, "/users/me", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	assert.True(t, served, "비 admin 경로는 그대로 통과")
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestAdminGuardAllowsAdminEmail(t *testing.T) {
	served := false
	h := AdminGuard([]string{"/admin/"}, []string{"admin@gorae.dev"})(
		http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			served = true
			w.WriteHeader(http.StatusOK)
		}),
	)
	req := httptest.NewRequest(http.MethodGet, "/admin/users", nil)
	req = req.WithContext(WithEmailContext(req.Context(), "admin@gorae.dev"))
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	assert.True(t, served)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestAdminGuardCaseInsensitiveEmail(t *testing.T) {
	served := false
	h := AdminGuard([]string{"/admin/"}, []string{"admin@gorae.dev"})(
		http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			served = true
			w.WriteHeader(http.StatusOK)
		}),
	)
	req := httptest.NewRequest(http.MethodGet, "/admin/users", nil)
	req = req.WithContext(WithEmailContext(req.Context(), "Admin@Gorae.Dev"))
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	assert.True(t, served, "이메일 비교는 대소문자 무시")
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestAdminGuardForbidsOtherEmail(t *testing.T) {
	served := false
	h := AdminGuard([]string{"/admin/"}, []string{"admin@gorae.dev"})(
		http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			served = true
		}),
	)
	req := httptest.NewRequest(http.MethodGet, "/admin/users", nil)
	req = req.WithContext(WithEmailContext(req.Context(), "intruder@example.com"))
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	assert.False(t, served, "허용되지 않은 이메일은 핸들러 진입 금지")
	assert.Equal(t, http.StatusForbidden, rr.Code)
	assert.Contains(t, rr.Body.String(), "Forbidden")
}

func TestAdminGuardRejectsMissingEmail(t *testing.T) {
	served := false
	h := AdminGuard([]string{"/admin/"}, []string{"admin@gorae.dev"})(
		http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			served = true
		}),
	)
	req := httptest.NewRequest(http.MethodGet, "/admin/dashboard/stats", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	assert.False(t, served, "이메일 없으면 401")
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

// 신규 admin write 경로(PATCH/DELETE)도 동일 미들웨어가 막는지 회귀 고정.
// AdminGuard는 메서드 무관 prefix 기반이므로 write 경로도 401/403가 보장돼야 한다.
func TestAdminGuardBlocksAdminWriteRoutes(t *testing.T) {
	cases := []struct {
		name       string
		method     string
		path       string
		email      string // "" = 미인증
		wantStatus int
		wantServed bool
	}{
		{"PATCH cash-gift 미인증 → 401", http.MethodPatch, "/admin/cash-gifts/abc", "", http.StatusUnauthorized, false},
		{"DELETE cash-gift 미인증 → 401", http.MethodDelete, "/admin/cash-gifts/abc", "", http.StatusUnauthorized, false},
		{"DELETE wedding(soft) 비허용 이메일 → 403", http.MethodDelete, "/admin/weddings/abc", "intruder@example.com", http.StatusForbidden, false},
		{"PATCH user 비허용 이메일 → 403", http.MethodPatch, "/admin/users/abc", "intruder@example.com", http.StatusForbidden, false},
		{"DELETE lounge-check-in 허용 이메일 → 통과", http.MethodDelete, "/admin/lounge-check-ins/abc", "admin@gorae.dev", http.StatusOK, true},
		{"DELETE host-slot 미인증 → 401", http.MethodDelete, "/admin/weddings/abc/host-slots/groom", "", http.StatusUnauthorized, false},
		{"DELETE host-slot 비허용 이메일 → 403", http.MethodDelete, "/admin/weddings/abc/host-slots/groom", "intruder@example.com", http.StatusForbidden, false},
		{"DELETE host-slot 허용 이메일 → 통과", http.MethodDelete, "/admin/weddings/abc/host-slots/groom", "admin@gorae.dev", http.StatusOK, true},
		{"POST host-invite 미인증 → 401", http.MethodPost, "/admin/weddings/abc/host-invites", "", http.StatusUnauthorized, false},
		{"POST host-invite 비허용 이메일 → 403", http.MethodPost, "/admin/weddings/abc/host-invites", "intruder@example.com", http.StatusForbidden, false},
		{"POST host-invite 허용 이메일 → 통과", http.MethodPost, "/admin/weddings/abc/host-invites", "admin@gorae.dev", http.StatusOK, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			served := false
			h := AdminGuard([]string{"/admin/"}, []string{"admin@gorae.dev"})(
				http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
					served = true
					w.WriteHeader(http.StatusOK)
				}),
			)
			req := httptest.NewRequest(tc.method, tc.path, nil)
			if tc.email != "" {
				req = req.WithContext(WithEmailContext(req.Context(), tc.email))
			}
			rr := httptest.NewRecorder()
			h.ServeHTTP(rr, req)
			assert.Equal(t, tc.wantServed, served)
			assert.Equal(t, tc.wantStatus, rr.Code)
		})
	}
}

func TestAdminGuardMultiplePrefixes(t *testing.T) {
	h := AdminGuard([]string{"/admin/", "/ops/"}, []string{"admin@gorae.dev"})(
		http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)
	// /ops 경로도 admin email 필요
	req := httptest.NewRequest(http.MethodGet, "/ops/anything", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}
