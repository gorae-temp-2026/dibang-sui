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

	"github.com/google/uuid"
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
// 우선순위 full_name → name → email local-part → "User".
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
	return "User"
}

// AuthMiddleware validates Bearer tokens by calling Supabase Auth API.
// Soft middleware: requests without tokens pass through for public endpoints.
// Handlers that need auth call UserIDFromContext.
func AuthMiddleware(supabaseURL, supabaseAnonKey string, ensure EnsureUserFunc, devBypass bool, devUserID string, googleClientIDs ...string) func(http.Handler) http.Handler {
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

			supabaseOK := resp.StatusCode == http.StatusOK
			var user supabaseUser
			if supabaseOK {
				if err := json.NewDecoder(resp.Body).Decode(&user); err != nil || user.ID == "" {
					supabaseOK = false
				}
			}

			if supabaseOK {
				var uid pgtype.UUID
				if err := uid.Scan(user.ID); err != nil {
					next.ServeHTTP(w, r)
					return
				}
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
				return
			}

			// Supabase 검증 실패 → Google JWT 직접 검증 (zkLogin 호환)
			if len(googleClientIDs) > 0 {
				claims, err := VerifyGoogleJWT(token, googleClientIDs)
				if err == nil && claims.Subject != "" {
					// Google sub를 UUID v5 네임스페이스로 변환 (결정적 매핑)
					googleUID := googleSubToUUID(claims.Subject)
					var uid pgtype.UUID
					if err := uid.Scan(googleUID); err == nil {
						if ensure != nil {
							if _, done := ensured.Load(googleUID); !done {
								name := deriveDisplayName("", claims.Name, claims.Email)
								if err := ensure(r.Context(), uid, claims.Email, name); err != nil {
									log.Printf("auth(google): EnsureUser failed for %s: %v", claims.Email, err)
								} else {
									ensured.Store(googleUID, struct{}{})
								}
							}
						}
						ctx := context.WithValue(r.Context(), userIDContextKey, uid)
						if claims.Email != "" {
							ctx = context.WithValue(ctx, emailContextKey, claims.Email)
						}
						next.ServeHTTP(w, r.WithContext(ctx))
						return
					}
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

// googleSubToUUID converts a Google sub (numeric string) to a deterministic UUID v5.
// Namespace: "google-sub" hashed. Same sub always produces the same UUID.
func googleSubToUUID(sub string) string {
	ns := uuid.MustParse("6ba7b810-9dad-11d1-80b4-00c04fd430c8") // DNS namespace
	return uuid.NewSHA1(ns, []byte("google:"+sub)).String()
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
