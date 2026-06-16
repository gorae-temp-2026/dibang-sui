package api

import (
	"context"
	"fmt"
	"net/netip"

	"gorae-api/db"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// consentService — _scenario/2026-05-26-user-consent-onboarding/
// profiles + terms_documents + consent_records 3-테이블 구조.
type consentService struct {
	pool *pgxpool.Pool
}

func NewConsentService(pool *pgxpool.Pool) ConsentService {
	return &consentService{pool: pool}
}

// GetConsentsRequired: 게이트 판정. profiles.terms_version 미달이면 필수 약관 terms_type 배열 반환.
// 빈 배열이면 게이트 통과.
func (s *consentService) GetConsentsRequired(ctx context.Context, userID pgtype.UUID) ([]UserConsentsRequired, error) {
	q := db.New(s.pool)
	maxVer, err := q.GetMaxRequiredTermsVersion(ctx)
	if err != nil {
		return nil, err
	}
	if maxVer == 0 {
		// 필수 약관 자체가 없으면 게이트 비활성 — 빈 배열 반환.
		return []UserConsentsRequired{}, nil
	}
	curVer, err := q.GetProfileTermsVersion(ctx, userID)
	if err != nil {
		return nil, err
	}
	if curVer >= maxVer {
		return []UserConsentsRequired{}, nil
	}
	// 미달이면 모든 필수 약관 미동의로 간주 (단순화 — v2도 동일 동작).
	rows, err := q.GetRequiredTermsTypesLatest(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]UserConsentsRequired, 0, len(rows))
	for _, r := range rows {
		out = append(out, UserConsentsRequired(r.TermsType))
	}
	return out, nil
}

// CreateConsents: S-01. 트랜잭션: consent_records INSERT × N + profiles.terms_version UPSERT.
// displayName은 profiles row 없을 때 INSERT용 — caller(handler)가 GetMe 흐름에서 user.Name 전달.
func (s *consentService) CreateConsents(
	ctx context.Context,
	userID pgtype.UUID,
	displayName string,
	items []ConsentItem,
	ip *string,
	userAgent *string,
) error {
	if len(items) == 0 {
		return fmt.Errorf("items empty")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	q := db.New(tx)
	ipVal := parseIPAddr(ip)
	uaVal := nullableText(userAgent)

	// 각 item에 대해 terms_documents 최신 row 찾아 consent_records INSERT.
	for _, item := range items {
		td, err := q.GetTermsDocumentByTypeLatest(ctx, string(item.TermsType))
		if err != nil {
			return fmt.Errorf("get terms_documents %s: %w", item.TermsType, err)
		}
		if err := q.InsertConsentRecord(ctx, db.InsertConsentRecordParams{
			UserID:          userID,
			TermsDocumentID: td.ID,
			Agreed:          item.Agreed,
			Column4:         ipVal,
			UserAgent:       uaVal,
		}); err != nil {
			return fmt.Errorf("insert consent_record: %w", err)
		}
	}

	// profiles.terms_version = MAX(required version) 으로 갱신.
	maxVer, err := q.GetMaxRequiredTermsVersion(ctx)
	if err != nil {
		return err
	}
	if err := q.UpsertProfileTermsVersion(ctx, db.UpsertProfileTermsVersionParams{
		UserID:       userID,
		DisplayName:  displayName,
		TermsVersion: maxVer,
	}); err != nil {
		return fmt.Errorf("upsert profile: %w", err)
	}

	return tx.Commit(ctx)
}

// UpdateMarketingConsent: S-04. 마케팅 terms_type에 row append. terms_version은 건드리지 않음.
func (s *consentService) UpdateMarketingConsent(
	ctx context.Context,
	userID pgtype.UUID,
	agreed bool,
	ip *string,
	userAgent *string,
) error {
	q := db.New(s.pool)
	td, err := q.GetTermsDocumentByTypeLatest(ctx, "marketing")
	if err != nil {
		return fmt.Errorf("get marketing terms_documents: %w", err)
	}
	return q.InsertConsentRecord(ctx, db.InsertConsentRecordParams{
		UserID:          userID,
		TermsDocumentID: td.ID,
		Agreed:          agreed,
		Column4:         parseIPAddr(ip),
		UserAgent:       nullableText(userAgent),
	})
}

// GetMarketingAgreed: GetMe 응답 marketing_agreed 필드용.
func (s *consentService) GetMarketingAgreed(ctx context.Context, userID pgtype.UUID) (bool, error) {
	q := db.New(s.pool)
	return q.GetLatestMarketingConsent(ctx, userID)
}

// parseIPAddr: nullable IP 문자열 → netip.Addr (sqlc inet 매핑).
// 파싱 실패·nil 모두 zero Addr 반환 — Postgres가 NULL 처리.
func parseIPAddr(ip *string) netip.Addr {
	if ip == nil || *ip == "" {
		return netip.Addr{}
	}
	addr, err := netip.ParseAddr(*ip)
	if err != nil {
		return netip.Addr{}
	}
	return addr
}

func nullableText(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{}
	}
	return pgtype.Text{String: *s, Valid: true}
}
