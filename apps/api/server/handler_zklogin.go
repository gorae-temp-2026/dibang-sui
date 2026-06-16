package api

// zkLogin Salt 엔드포인트 (커스텀 라우트, OpenAPI 비대상 — 인프라성 엔드포인트).
// 프론트엔드가 Google ID 토큰을 보내면 사용자별 결정적 salt를 돌려준다.

import (
	"encoding/json"
	"errors"
	"net/http"
)

type zkSaltRequest struct {
	Token string `json:"token"`
}

type zkSaltResponse struct {
	Salt string `json:"salt"`
}

// NewZkLoginSaltHandler — POST /zklogin/salt 핸들러.
func NewZkLoginSaltHandler(svc *ZkLoginService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req zkSaltRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Token == "" {
			writeProblem(w, http.StatusBadRequest, "Bad Request", "field 'token' (Google ID token) is required")
			return
		}

		salt, err := svc.DeriveSalt(r.Context(), req.Token)
		if err != nil {
			// 검증 실패는 401 — 내부 사유는 노출하지 않음(master secret/salt 관련 정보 보호).
			if errors.Is(err, ErrInvalidIDToken) {
				writeUnauthorized(w)
				return
			}
			writeProblem(w, http.StatusInternalServerError, "Internal Server Error", "failed to derive salt")
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(zkSaltResponse{Salt: salt})
	}
}

// writeProblem — RFC 7807 ProblemDetail 응답(zkLogin/sponsor 커스텀 라우트 공용).
func writeProblem(w http.ResponseWriter, status int, title, detail string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(ProblemDetail{
		Type:   "about:blank",
		Title:  title,
		Status: status,
		Detail: strPtr(detail),
	})
}
