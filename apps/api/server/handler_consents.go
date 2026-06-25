package api

import (
	"context"
	"net/http"
	"strings"
)

// CreateConsents (S-01): 동의 일괄 INSERT + profiles.terms_version UPDATE.
// 한 트랜잭션. IP·UA는 헤더에서 추출하여 consent_records에 같이 저장.
func (s *Server) CreateConsents(ctx context.Context, req CreateConsentsRequestObject) (CreateConsentsResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return CreateConsents401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}
	if req.Body == nil || len(req.Body.Items) == 0 {
		return CreateConsents400JSONResponse{BadRequestJSONResponse{
			Type:   "about:blank",
			Title:  "Bad Request",
			Status: 400,
			Detail: strPtr("items empty"),
		}}, nil
	}

	user, err := s.Users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	ip, ua := requestIPUA(ctx)
	if err := s.Consents.CreateConsents(ctx, userID, user.Name, req.Body.Items, ip, ua); err != nil {
		return nil, err
	}
	return CreateConsents201Response{}, nil
}

// UpdateMarketingConsent (S-04): 마케팅 동의 단독 변경. consent_records append-only.
func (s *Server) UpdateMarketingConsent(ctx context.Context, req UpdateMarketingConsentRequestObject) (UpdateMarketingConsentResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return UpdateMarketingConsent401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}
	if req.Body == nil {
		return UpdateMarketingConsent400JSONResponse{BadRequestJSONResponse{
			Type:   "about:blank",
			Title:  "Bad Request",
			Status: 400,
			Detail: strPtr("body required"),
		}}, nil
	}
	ip, ua := requestIPUA(ctx)
	if err := s.Consents.UpdateMarketingConsent(ctx, userID, req.Body.Agreed, ip, ua); err != nil {
		return nil, err
	}
	return UpdateMarketingConsent201Response{}, nil
}

// 클라이언트 IP·User-Agent를 요청 컨텍스트에 실어 나르는 키.
// http.Request 는 strict-server handler 시그니처(ctx만 받음)에 안 닿으므로,
// ClientInfoMiddleware 가 헤더에서 뽑아 context 에 넣고 requestIPUA 가 꺼낸다.
const (
	clientIPContextKey contextKey = "clientIP"
	clientUAContextKey contextKey = "clientUA"
)

// ClientInfoMiddleware: 요청 IP(X-Forwarded-For/CF/RemoteAddr 순)와 User-Agent 를
// 컨텍스트에 주입한다. consent_records 의 ip·ua 컬럼 저장에 쓰인다.
func ClientInfoMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			if ip := extractIPFromXFF(r); ip != "" {
				ctx = context.WithValue(ctx, clientIPContextKey, ip)
			}
			if ua := strings.TrimSpace(r.UserAgent()); ua != "" {
				ctx = context.WithValue(ctx, clientUAContextKey, ua)
			}
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// requestIPUA: ClientInfoMiddleware 가 컨텍스트에 넣어둔 IP·User-Agent 추출.
// 미들웨어 미적용 경로/누락 시 nil 반환 → consent_records 컬럼은 NULL 저장(동작 영향 없음).
func requestIPUA(ctx context.Context) (*string, *string) {
	var ip, ua *string
	if v, ok := ctx.Value(clientIPContextKey).(string); ok && v != "" {
		val := v
		ip = &val
	}
	if v, ok := ctx.Value(clientUAContextKey).(string); ok && v != "" {
		val := v
		ua = &val
	}
	return ip, ua
}

// extractIPFromXFF: X-Forwarded-For 헤더에서 가장 앞 IP 추출(CF-Connecting-IP·RemoteAddr 폴백).
func extractIPFromXFF(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		if idx := strings.IndexByte(xff, ','); idx > 0 {
			return strings.TrimSpace(xff[:idx])
		}
		return strings.TrimSpace(xff)
	}
	if cf := r.Header.Get("CF-Connecting-IP"); cf != "" {
		return strings.TrimSpace(cf)
	}
	if ra := r.RemoteAddr; ra != "" {
		// "host:port" → host
		if idx := strings.LastIndexByte(ra, ':'); idx > 0 {
			return ra[:idx]
		}
		return ra
	}
	return ""
}
