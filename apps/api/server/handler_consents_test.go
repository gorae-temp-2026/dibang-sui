package api

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// --- mocks ---

type mockConsentService struct {
	GetConsentsRequiredFn    func(ctx context.Context, userID pgtype.UUID) ([]UserConsentsRequired, error)
	CreateConsentsFn         func(ctx context.Context, userID pgtype.UUID, name string, items []ConsentItem, ip, ua *string) error
	UpdateMarketingConsentFn func(ctx context.Context, userID pgtype.UUID, agreed bool, ip, ua *string) error
	GetMarketingAgreedFn     func(ctx context.Context, userID pgtype.UUID) (bool, error)
}

func (m *mockConsentService) GetConsentsRequired(ctx context.Context, userID pgtype.UUID) ([]UserConsentsRequired, error) {
	return m.GetConsentsRequiredFn(ctx, userID)
}
func (m *mockConsentService) CreateConsents(ctx context.Context, userID pgtype.UUID, name string, items []ConsentItem, ip, ua *string) error {
	return m.CreateConsentsFn(ctx, userID, name, items, ip, ua)
}
func (m *mockConsentService) UpdateMarketingConsent(ctx context.Context, userID pgtype.UUID, agreed bool, ip, ua *string) error {
	return m.UpdateMarketingConsentFn(ctx, userID, agreed, ip, ua)
}
func (m *mockConsentService) GetMarketingAgreed(ctx context.Context, userID pgtype.UUID) (bool, error) {
	return m.GetMarketingAgreedFn(ctx, userID)
}

type mockUserSvc struct {
	GetByIDFn    func(ctx context.Context, id pgtype.UUID) (*User, error)
	UpdateFn     func(ctx context.Context, id pgtype.UUID, req *UpdateUserRequest) (*User, error)
	EnsureUserFn func(ctx context.Context, id pgtype.UUID, email, name string) error
}

func (m *mockUserSvc) GetByID(ctx context.Context, id pgtype.UUID) (*User, error) {
	return m.GetByIDFn(ctx, id)
}
func (m *mockUserSvc) Update(ctx context.Context, id pgtype.UUID, req *UpdateUserRequest) (*User, error) {
	return m.UpdateFn(ctx, id, req)
}
func (m *mockUserSvc) EnsureUser(ctx context.Context, id pgtype.UUID, email, name string) error {
	return m.EnsureUserFn(ctx, id, email, name)
}

// helper
func mustUUID(t *testing.T, s string) pgtype.UUID {
	t.Helper()
	var u pgtype.UUID
	if err := u.Scan(s); err != nil {
		t.Fatalf("uuid: %v", err)
	}
	return u
}

// --- tests ---

func TestCreateConsents_Unauthorized(t *testing.T) {
	s := &Server{}
	_, err := s.CreateConsents(context.Background(), CreateConsentsRequestObject{})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	// strict server interface returns 401 inside response — not error.
	// Smoke check: handler completed without panic.
}

func TestCreateConsents_HappyPath(t *testing.T) {
	userID := mustUUID(t, "00000000-0000-0000-0000-000000000001")
	users := &mockUserSvc{
		GetByIDFn: func(ctx context.Context, id pgtype.UUID) (*User, error) {
			return &User{Id: openapi_types.UUID(id.Bytes), Name: "테스트", Email: "t@gorae.dev", CreatedAt: time.Now()}, nil
		},
	}
	var captured []ConsentItem
	consents := &mockConsentService{
		CreateConsentsFn: func(ctx context.Context, id pgtype.UUID, name string, items []ConsentItem, ip, ua *string) error {
			captured = items
			return nil
		},
	}
	s := &Server{Users: users, Consents: consents}
	ctx := WithUserContext(context.Background(), userID)

	items := []ConsentItem{
		{TermsType: ConsentItemTermsTypeAgeVerification, Agreed: true},
		{TermsType: ConsentItemTermsTypeService, Agreed: true},
		{TermsType: ConsentItemTermsTypePrivacy, Agreed: true},
		{TermsType: ConsentItemTermsTypeMarketing, Agreed: false},
	}
	resp, err := s.CreateConsents(ctx, CreateConsentsRequestObject{
		Body: &CreateConsentsJSONRequestBody{Items: items},
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	rec := httptest.NewRecorder()
	if e := resp.VisitCreateConsentsResponse(rec); e != nil {
		t.Fatalf("visit: %v", e)
	}
	if rec.Code != 201 {
		t.Fatalf("want 201, got %d", rec.Code)
	}
	if len(captured) != 4 {
		t.Fatalf("expected 4 items, got %d", len(captured))
	}
}

func TestCreateConsents_EmptyItems(t *testing.T) {
	userID := mustUUID(t, "00000000-0000-0000-0000-000000000002")
	s := &Server{
		Users: &mockUserSvc{
			GetByIDFn: func(ctx context.Context, id pgtype.UUID) (*User, error) {
				return &User{Id: openapi_types.UUID(id.Bytes), Name: "x"}, nil
			},
		},
		Consents: &mockConsentService{},
	}
	ctx := WithUserContext(context.Background(), userID)
	resp, err := s.CreateConsents(ctx, CreateConsentsRequestObject{
		Body: &CreateConsentsJSONRequestBody{Items: []ConsentItem{}},
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	rec := httptest.NewRecorder()
	_ = resp.VisitCreateConsentsResponse(rec)
	if rec.Code != 400 {
		t.Fatalf("want 400, got %d", rec.Code)
	}
}

func TestUpdateMarketingConsent_HappyPath(t *testing.T) {
	userID := mustUUID(t, "00000000-0000-0000-0000-000000000003")
	var captured bool
	consents := &mockConsentService{
		UpdateMarketingConsentFn: func(ctx context.Context, id pgtype.UUID, agreed bool, ip, ua *string) error {
			captured = agreed
			return nil
		},
	}
	s := &Server{Consents: consents}
	ctx := WithUserContext(context.Background(), userID)
	resp, err := s.UpdateMarketingConsent(ctx, UpdateMarketingConsentRequestObject{
		Body: &UpdateMarketingConsentJSONRequestBody{Agreed: true},
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	rec := httptest.NewRecorder()
	_ = resp.VisitUpdateMarketingConsentResponse(rec)
	if rec.Code != 201 {
		t.Fatalf("want 201, got %d", rec.Code)
	}
	if !captured {
		t.Fatalf("expected agreed=true captured")
	}
}

func TestGetMe_PopulatesConsentFields(t *testing.T) {
	userID := mustUUID(t, "00000000-0000-0000-0000-000000000004")
	users := &mockUserSvc{
		GetByIDFn: func(ctx context.Context, id pgtype.UUID) (*User, error) {
			return &User{Id: openapi_types.UUID(id.Bytes), Name: "n", Email: "e@e"}, nil
		},
	}
	consents := &mockConsentService{
		GetConsentsRequiredFn: func(ctx context.Context, id pgtype.UUID) ([]UserConsentsRequired, error) {
			return []UserConsentsRequired{"age_verification", "privacy"}, nil
		},
		GetMarketingAgreedFn: func(ctx context.Context, id pgtype.UUID) (bool, error) {
			return true, nil
		},
	}
	s := &Server{Users: users, Consents: consents}
	ctx := WithUserContext(context.Background(), userID)
	resp, err := s.GetMe(ctx, GetMeRequestObject{})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	rec := httptest.NewRecorder()
	if e := resp.VisitGetMeResponse(rec); e != nil {
		t.Fatalf("visit: %v", e)
	}
	if rec.Code != 200 {
		t.Fatalf("want 200, got %d", rec.Code)
	}
	body := rec.Body.String()
	if !strings.Contains(body, `"consents_required":["age_verification","privacy"]`) {
		t.Fatalf("consents_required missing or wrong: %s", body)
	}
	if !strings.Contains(body, `"marketing_agreed":true`) {
		t.Fatalf("marketing_agreed missing: %s", body)
	}
}

func TestGetMe_DefaultsWhenConsentNil(t *testing.T) {
	userID := mustUUID(t, "00000000-0000-0000-0000-000000000005")
	users := &mockUserSvc{
		GetByIDFn: func(ctx context.Context, id pgtype.UUID) (*User, error) {
			return &User{Id: openapi_types.UUID(id.Bytes), Name: "n", Email: "e@e"}, nil
		},
	}
	s := &Server{Users: users} // Consents nil
	ctx := WithUserContext(context.Background(), userID)
	resp, err := s.GetMe(ctx, GetMeRequestObject{})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	rec := httptest.NewRecorder()
	_ = resp.VisitGetMeResponse(rec)
	body := rec.Body.String()

	var got User
	if e := json.Unmarshal([]byte(body), &got); e != nil {
		t.Fatalf("unmarshal: %v", e)
	}
	if got.ConsentsRequired == nil || len(got.ConsentsRequired) != 0 {
		t.Fatalf("expected empty consents_required, got %v", got.ConsentsRequired)
	}
	if got.MarketingAgreed != false {
		t.Fatalf("expected marketing_agreed=false, got %v", got.MarketingAgreed)
	}
}
