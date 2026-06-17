package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

// EnsureUserFunc: 인증된 유저의 도메인 행을 멱등 보장(JIT 프로비저닝) 의존성.
type EnsureUserFunc func(ctx context.Context, id pgtype.UUID, email, name string) error

type contextKey string

const (
	userIDContextKey contextKey = "userID"
	emailContextKey  contextKey = "email"
)

var supabaseHTTPClient = &http.Client{Timeout: 10 * time.Second}

// supabaseUser is a minimal representation of Supabase Auth (GoTrue) /auth/v1/user 응답.
// email/user_metadata는 JIT 프로비저닝(v3_users 행 보장)용. 필드 누락 시 deriveDisplayName이 폴백.
type supabaseUser struct {
	ID           string `json:"id"`
	Email        string `json:"email"`
	UserMetadata struct {
		FullName string `json:"full_name"`
		Name     string `json:"name"`
	} `json:"user_metadata"`
}

// deriveDisplayName: v3_users.name(NOT NULL)에 넣을 표시 이름 도출.
// 우선순위 full_name → name → email local-part → "사용자".
func deriveDisplayName(fullName, name, email string) string {
	if v := strings.TrimSpace(fullName); v != "" {
		return v
	}
	if v := strings.TrimSpace(name); v != "" {
		return v
	}
	if e := strings.TrimSpace(email); e != "" {
		if i := strings.IndexByte(e, '@'); i > 0 {
			return e[:i]
		}
		return e
	}
	return "사용자"
}

// AuthMiddleware validates Bearer tokens by calling Supabase Auth API.
// Soft middleware: requests without tokens pass through for public endpoints.
// Handlers that need auth call UserIDFromContext.
func AuthMiddleware(supabaseURL, supabaseAnonKey string, ensure EnsureUserFunc, devBypass bool, devUserID string) func(http.Handler) http.Handler {
	userEndpoint := fmt.Sprintf("%s/auth/v1/user", strings.TrimRight(supabaseURL, "/"))
	// 가드: uid당 미들웨어 인스턴스 생애 1회만 EnsureUser 시도(핫패스 쓰기 방지). 실패 시 미저장→다음 요청 재시도.
	var ensured sync.Map

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Dev 인증 우회 (localhost·dev 전용): DEV_AUTH_BYPASS=true + X-Dev-Auth 헤더 시
			// Supabase 검증 없이 고정 dev user를 주입한다. prod는 DEV_AUTH_BYPASS 미설정으로 완전 비활성.
			if devBypass && devUserID != "" && r.Header.Get("X-Dev-Auth") != "" {
				var devUID pgtype.UUID
				if err := devUID.Scan(devUserID); err == nil {
					if ensure != nil {
						if _, done := ensured.Load(devUserID); !done {
							if err := ensure(r.Context(), devUID, "dev@localhost", "DEV"); err != nil {
								log.Printf("auth(dev): EnsureUser failed: %v", err)
							} else {
								ensured.Store(devUserID, struct{}{})
							}
						}
					}
					ctx := context.WithValue(r.Context(), userIDContextKey, devUID)
					ctx = context.WithValue(ctx, emailContextKey, "dev@localhost")
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}
			}

			token := extractBearerToken(r)
			if token == "" {
				next.ServeHTTP(w, r)
				return
			}

			req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, userEndpoint, nil)
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}
			req.Header.Set("Authorization", "Bearer "+token)
			req.Header.Set("apikey", supabaseAnonKey)

			resp, err := supabaseHTTPClient.Do(req)
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				next.ServeHTTP(w, r)
				return
			}

			var user supabaseUser
			if err := json.NewDecoder(resp.Body).Decode(&user); err != nil || user.ID == "" {
				next.ServeHTTP(w, r)
				return
			}

			var uid pgtype.UUID
			if err := uid.Scan(user.ID); err != nil {
				next.ServeHTTP(w, r)
				return
			}

			// JIT 프로비저닝: 도메인 유저 행 멱등 보장. 실패는 로그만 — 요청은 절대 막지 않음.
			if ensure != nil {
				if _, done := ensured.Load(user.ID); !done {
					name := deriveDisplayName(user.UserMetadata.FullName, user.UserMetadata.Name, user.Email)
					if err := ensure(r.Context(), uid, user.Email, name); err != nil {
						log.Printf("auth: EnsureUser failed for %s: %v", user.ID, err)
					} else {
						ensured.Store(user.ID, struct{}{})
					}
				}
			}

			ctx := context.WithValue(r.Context(), userIDContextKey, uid)
			if user.Email != "" {
				ctx = context.WithValue(ctx, emailContextKey, user.Email)
			}
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func extractBearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if !strings.HasPrefix(h, "Bearer ") {
		return ""
	}
	return h[7:]
}

// UserIDFromContext retrieves the authenticated user ID from the request context.
func UserIDFromContext(ctx context.Context) (pgtype.UUID, bool) {
	uid, ok := ctx.Value(userIDContextKey).(pgtype.UUID)
	return uid, ok && uid.Valid
}

// EmailFromContext returns the authenticated user's email if AuthMiddleware injected it.
// Used by AdminGuard to gate /admin/* routes by allowlisted email.
func EmailFromContext(ctx context.Context) (string, bool) {
	email, ok := ctx.Value(emailContextKey).(string)
	return email, ok && email != ""
}

// writeUnauthorized writes a 401 JSON response (RFC 7807).
func writeUnauthorized(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_ = json.NewEncoder(w).Encode(ProblemDetail{
		Type:   "about:blank",
		Title:  "Unauthorized",
		Status: http.StatusUnauthorized,
		Detail: strPtr("authentication required"),
	})
}
