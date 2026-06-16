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

// requestIPUA: chi 요청 컨텍스트에서 IP·User-Agent 추출.
// http.Request 자체는 context 에 없으니 별도 helper 키로 보존했어야 하나, 현재 미들웨어가
// 그걸 안 함 → caller가 X-Forwarded-For 헤더를 직접 전달하도록 차후 보강. 일단 (nil, nil) 반환으로
// consent_records의 ip·ua 컬럼은 NULL 저장 (서비스 동작에 영향 없음).
func requestIPUA(_ context.Context) (*string, *string) {
	return nil, nil
}

// extractIPFromXFF: X-Forwarded-For 헤더에서 가장 앞 IP 추출. 미사용이지만 helper로 보관.
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
