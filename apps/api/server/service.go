package api

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgtype"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// Domain errors. Handlers map these to HTTP status codes.
var (
	ErrNotFound         = errors.New("not found")
	ErrSlugConflict     = errors.New("slug already exists")
	ErrForbidden        = errors.New("forbidden")
	ErrHostSelfRequired  = errors.New("at least one host slot must contain the current user")
	ErrAlreadyAccepted   = errors.New("invite already accepted")
	ErrSlotAlreadyTaken  = errors.New("slot already taken by another user")
	ErrCannotAcceptOwn   = errors.New("cannot accept own wedding invite")
)

// UserService handles user-related business logic.
type UserService interface {
	GetByID(ctx context.Context, id pgtype.UUID) (*User, error)
	Update(ctx context.Context, id pgtype.UUID, req *UpdateUserRequest) (*User, error)
	// EnsureUser: 인증된 유저의 도메인 행을 멱등 보장(JIT 프로비저닝). 없으면 생성, 있으면 no-op.
	EnsureUser(ctx context.Context, id pgtype.UUID, email, name string) error
}

// WeddingService handles wedding-related business logic.
type WeddingService interface {
	Create(ctx context.Context, hostUserID pgtype.UUID, req *CreateWeddingRequest) (*Wedding, error)
	GetByID(ctx context.Context, id openapi_types.UUID) (*Wedding, error)
	GetMyWeddings(ctx context.Context, userID pgtype.UUID) ([]WeddingSummary, error)
	IsHost(ctx context.Context, weddingID openapi_types.UUID, userID pgtype.UUID) (bool, error)
	Update(ctx context.Context, weddingID openapi_types.UUID, req *UpdateWeddingRequest) (*Wedding, error)
	GetMyParticipatedWeddings(ctx context.Context, userID pgtype.UUID) ([]ParticipatedWedding, error)
}

// InvitationService handles invitation-related business logic.
type InvitationService interface {
	GetBySlug(ctx context.Context, slug string) (*InvitationPublic, error)
	Create(ctx context.Context, weddingID openapi_types.UUID, req *CreateInvitationRequest) (*Invitation, error)
	Update(ctx context.Context, invitationID openapi_types.UUID, req *UpdateInvitationRequest) (*Invitation, error)
	Delete(ctx context.Context, weddingID openapi_types.UUID, invitationID openapi_types.UUID) error
	IncrementHeart(ctx context.Context, slug string) (int, error)
	GetShareLink(ctx context.Context, invitationID openapi_types.UUID) (*ShareLinkResponse, error)
	ListByWeddingID(ctx context.Context, weddingID pgtype.UUID) ([]InvitationSummary, error)
}

// GuestbookService handles guestbook-related business logic.
type GuestbookService interface {
	Create(ctx context.Context, loungeID openapi_types.UUID, req *CreateGuestbookEntryRequest) (*GuestbookEntry, error)
	List(ctx context.Context, loungeID openapi_types.UUID, cursor *string, limit int) ([]GuestbookEntry, bool, *string, error)
	Claim(ctx context.Context, entryID openapi_types.UUID, userID pgtype.UUID) error
	CreateMessage(ctx context.Context, entryID openapi_types.UUID, req *CreateGuestbookMessageRequest) (*GuestbookMessage, error)
	RecordMessageView(ctx context.Context, messageID openapi_types.UUID, viewerID pgtype.UUID) error
	GetByGuest(ctx context.Context, loungeID openapi_types.UUID, userID pgtype.UUID) (*GuestbookEntry, error)
}

// FeedService handles unified feed queries (guestbook + lounge_check_in + announcement).
type FeedService interface {
	ListFeed(ctx context.Context, loungeID openapi_types.UUID, userID *openapi_types.UUID, cursor *string, limit int) ([]FeedItem, bool, *string, error)
}

// FeedHeartService handles feed heart toggle.
type FeedHeartService interface {
	Toggle(ctx context.Context, userID openapi_types.UUID, targetType string, targetID openapi_types.UUID) (hearted bool, heartCount int, err error)
}

// FeedCommentService handles feed comment CRUD.
type FeedCommentService interface {
	Create(ctx context.Context, userID openapi_types.UUID, req *CreateFeedCommentRequest) (*FeedComment, error)
	List(ctx context.Context, targetType string, targetID openapi_types.UUID, cursor *string, limit int) ([]FeedComment, bool, *string, error)
	Delete(ctx context.Context, commentID openapi_types.UUID, userID openapi_types.UUID) error
}

// CashGiftService handles cash gift operations.
type CashGiftService interface {
	Create(ctx context.Context, req *CreateCashGiftRequest) (*CashGift, error)
	HostCreate(ctx context.Context, weddingID openapi_types.UUID, req *HostCreateCashGiftRequest) (*CashGift, error)
	List(ctx context.Context, weddingID openapi_types.UUID, cursor *string, limit int) ([]CashGift, bool, *string, error)
	Summary(ctx context.Context, weddingID openapi_types.UUID) (*CashGiftSummary, error)
	Update(ctx context.Context, giftID openapi_types.UUID, req *UpdateCashGiftRequest) (*CashGift, error)
	Delete(ctx context.Context, giftID openapi_types.UUID) error
}

// LoungeCheckInService handles lounge entry (visitor tracking) operations.
type LoungeCheckInService interface {
	List(ctx context.Context, placeID openapi_types.UUID, cursor *string, limit int) ([]LoungeCheckIn, bool, *string, error)
	Create(ctx context.Context, loungeID openapi_types.UUID, userID openapi_types.UUID, req *CreateLoungeCheckInRequest) (*LoungeCheckIn, error)
	GetByUser(ctx context.Context, loungeID openapi_types.UUID, userID pgtype.UUID) (*LoungeCheckIn, error)
}

// AnnouncementService handles host announcement CRUD.
type AnnouncementService interface {
	Create(ctx context.Context, loungeID openapi_types.UUID, hostID pgtype.UUID, req *CreateAnnouncementRequest) (*Announcement, error)
	List(ctx context.Context, loungeID openapi_types.UUID, cursor *string, limit int) ([]Announcement, bool, *string, error)
	GetByID(ctx context.Context, id openapi_types.UUID) (*Announcement, error)
	Update(ctx context.Context, id openapi_types.UUID, req *UpdateAnnouncementRequest) (*Announcement, error)
	SoftDelete(ctx context.Context, id openapi_types.UUID) error
	GetWeddingIDByLoungeID(ctx context.Context, loungeID openapi_types.UUID) (openapi_types.UUID, error)
}

// HostInviteService handles host invite operations.
type HostInviteService interface {
	Create(ctx context.Context, weddingID openapi_types.UUID, slot string) (*HostInvite, error)
	GetByToken(ctx context.Context, token string) (*HostInvitePublic, error)
	Accept(ctx context.Context, token string, userID pgtype.UUID) (*HostInvite, error)
	Cancel(ctx context.Context, inviteID openapi_types.UUID) error
	List(ctx context.Context, weddingID openapi_types.UUID) ([]HostInvite, error)
}

// ConsentService handles onboarding consent gate + marketing toggle.
// _scenario/2026-05-26-user-consent-onboarding/SCENARIOS.md
type ConsentService interface {
	// GetConsentsRequired: 게이트 판정용. profiles.terms_version < MAX(required version)인 terms_type 배열.
	// 빈 배열이면 통과. UserConsentsRequired 는 OpenAPI 생성 enum (age_verification/service/privacy/marketing).
	GetConsentsRequired(ctx context.Context, userID pgtype.UUID) ([]UserConsentsRequired, error)
	// CreateConsents (S-01): 동의 일괄 INSERT + profiles.terms_version UPDATE. 한 트랜잭션.
	CreateConsents(ctx context.Context, userID pgtype.UUID, displayName string, items []ConsentItem, ip *string, userAgent *string) error
	// UpdateMarketingConsent (S-04): marketing terms_type에 row append.
	UpdateMarketingConsent(ctx context.Context, userID pgtype.UUID, agreed bool, ip *string, userAgent *string) error
	// GetMarketingAgreed: GetMe 응답용. consent_records의 marketing 최신 row agreed.
	GetMarketingAgreed(ctx context.Context, userID pgtype.UUID) (bool, error)
}
