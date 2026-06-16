package api

import (
	"encoding/json"
	"net/http"
	"strings"
)

// AdminGuard returns middleware that protects path prefixes (e.g., "/admin/")
// by requiring the authenticated user's email to match one of allowedEmails.
//
// Behavior:
//   - Path NOT starting with any of pathPrefixes → pass through unchanged.
//   - Path matches AND no email in context → 401 (token absent or token rejected upstream).
//   - Path matches AND email not in allowedEmails → 403.
//   - Path matches AND email in allowedEmails → pass through.
//
// Depends on AuthMiddleware running earlier in the chain to populate emailContextKey.
func AdminGuard(pathPrefixes []string, allowedEmails []string) func(http.Handler) http.Handler {
	allowed := make(map[string]struct{}, len(allowedEmails))
	for _, e := range allowedEmails {
		e = strings.ToLower(strings.TrimSpace(e))
		if e != "" {
			allowed[e] = struct{}{}
		}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !matchesAny(r.URL.Path, pathPrefixes) {
				next.ServeHTTP(w, r)
				return
			}
			email, ok := EmailFromContext(r.Context())
			if !ok {
				writeAdminUnauthorized(w)
				return
			}
			if _, ok := allowed[strings.ToLower(email)]; !ok {
				writeAdminForbidden(w)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func matchesAny(path string, prefixes []string) bool {
	for _, p := range prefixes {
		if p != "" && strings.HasPrefix(path, p) {
			return true
		}
	}
	return false
}

func writeAdminUnauthorized(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_ = json.NewEncoder(w).Encode(ProblemDetail{
		Type:   "about:blank",
		Title:  "Unauthorized",
		Status: http.StatusUnauthorized,
		Detail: strPtr("authentication required for admin endpoints"),
	})
}

func writeAdminForbidden(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusForbidden)
	_ = json.NewEncoder(w).Encode(ProblemDetail{
		Type:   "about:blank",
		Title:  "Forbidden",
		Status: http.StatusForbidden,
		Detail: strPtr("admin email not in allowlist"),
	})
}
