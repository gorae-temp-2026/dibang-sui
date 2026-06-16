package api

import (
	"context"
	"fmt"
	"net/http"

	"gorae-api/db"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Server implements StrictServerInterface.
// Business logic is delegated to service interfaces.
// Unimplemented methods return 501.
type Server struct {
	Users         UserService
	Weddings      WeddingService
	Invitations   InvitationService
	Guestbook     GuestbookService
	CashGifts     CashGiftService
	Announcements AnnouncementService
	Feed          FeedService
	FeedHearts    FeedHeartService
	FeedComments  FeedCommentService
	LoungeCheckIns LoungeCheckInService
	HostInvites   HostInviteService

	// RSVP (QA 2026-05-29 G1): 모바일 청첩장 참석 의사. main.go setter로 주입(NewServer 시그니처 보존).
	Rsvps RsvpService

	// Photo Sharing (T-07~T-11): presigned URL 발급·권한 검증·storage_path 조립을 위한 의존성.
	// NewServer 시그니처를 보존하기 위해 main.go에서 setter로 주입한다.
	Uploader            StorageUploader
	Pool                *pgxpool.Pool
	SupabaseURL         string
	UploadBucketPublic  string // mobile-invitation (anon GET)
	UploadBucketPrivate string // memory·share (signed URL GET)

	// Memory Domain Split: 라운지 V2 "온기" 게시물 도메인.
	// main.go의 setter로 주입 (_scenario/memory-domain-split/SCENARIOS.md).
	Memories MemoryService

	// Wedding MemoryBook: 호스트 큐레이션 사진 + 자동선별 메시지 책자.
	// main.go의 setter로 주입 (_scenario/wedding-memorybook-2026-05-24/SCENARIOS.md).
	MemoryBook MemoryBookService

	// SharedPhoto Groups: wedding 단위 게스트별 그룹 응답.
	// main.go의 setter로 주입 (_scenario/wedding-memorybook-ui-2026-05-24/SCENARIOS.md).
	SharedPhotoGroups SharedPhotoGroupsService

	// Admin (운영자 read-only). T-05/T-15에서 실 구현 주입. nil이면 501 stub 응답.
	AdminUsers     AdminUsersService
	AdminDashboard AdminDashboardService

	// Admin write (수정·삭제). /admin/* 은 AdminGuard(이메일 allowlist)가 보호.
	// main.go setter로 주입. 모든 변경은 admin_audit_logs에 기록.
	AdminMutations AdminMutationService

	// Consents: onboarding 동의 게이트 + 마케팅 토글 (S-01, S-04).
	// main.go에서 setter로 주입 (_scenario/2026-05-26-user-consent-onboarding/SCENARIOS.md).
	Consents ConsentService
}

var _ StrictServerInterface = (*Server)(nil)

func NewServer(users UserService, weddings WeddingService, invitations InvitationService, guestbook GuestbookService, cashGifts CashGiftService, announcements AnnouncementService, feed FeedService, feedHearts FeedHeartService, feedComments FeedCommentService, loungeEntries LoungeCheckInService, hostInvites HostInviteService) *Server {
	return &Server{
		Users:         users,
		Weddings:      weddings,
		Invitations:   invitations,
		Guestbook:     guestbook,
		CashGifts:     cashGifts,
		Announcements: announcements,
		Feed:          feed,
		FeedHearts:    feedHearts,
		FeedComments:  feedComments,
		LoungeCheckIns: loungeEntries,
		HostInvites:   hostInvites,
	}
}

// notImplemented is a helper that returns a generic 501 response.
// Each handler method needs its own response type, so individual stubs
// must use the correct typed response. This struct satisfies any
// ResponseObject interface via VisitXxxResponse by writing 501 directly.
type notImplementedResponse struct {
	operation string
}

func (r notImplementedResponse) write(w http.ResponseWriter) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(501)
	_, err := fmt.Fprintf(w, `{"type":"about:blank","title":"Not Implemented","status":501,"detail":"%s"}`, r.operation)
	return err
}

// --- Stub implementations (501 Not Implemented) ---
// These will be replaced in handler_*.go files as endpoints are implemented.

// GetMe and UpdateMe are implemented in handler_users.go

func (s *Server) GetUser(ctx context.Context, req GetUserRequestObject) (GetUserResponseObject, error) {
	return getUserNotImpl{}, nil
}

type getUserNotImpl struct{}

func (r getUserNotImpl) VisitGetUserResponse(w http.ResponseWriter) error {
	return notImplementedResponse{"GetUser"}.write(w)
}

func (s *Server) ListMyIums(ctx context.Context, req ListMyIumsRequestObject) (ListMyIumsResponseObject, error) {
	return listMyIumsNotImpl{}, nil
}

type listMyIumsNotImpl struct{}

func (r listMyIumsNotImpl) VisitListMyIumsResponse(w http.ResponseWriter) error {
	return notImplementedResponse{"ListMyIums"}.write(w)
}

func (s *Server) CreateIum(ctx context.Context, req CreateIumRequestObject) (CreateIumResponseObject, error) {
	return createIumNotImpl{}, nil
}

type createIumNotImpl struct{}

func (r createIumNotImpl) VisitCreateIumResponse(w http.ResponseWriter) error {
	return notImplementedResponse{"CreateIum"}.write(w)
}

func (s *Server) DeleteIum(ctx context.Context, req DeleteIumRequestObject) (DeleteIumResponseObject, error) {
	return deleteIumNotImpl{}, nil
}

type deleteIumNotImpl struct{}

func (r deleteIumNotImpl) VisitDeleteIumResponse(w http.ResponseWriter) error {
	return notImplementedResponse{"DeleteIum"}.write(w)
}

func (s *Server) GetMyMoi(ctx context.Context, req GetMyMoiRequestObject) (GetMyMoiResponseObject, error) {
	return getMyMoiNotImpl{}, nil
}

type getMyMoiNotImpl struct{}

func (r getMyMoiNotImpl) VisitGetMyMoiResponse(w http.ResponseWriter) error {
	return notImplementedResponse{"GetMyMoi"}.write(w)
}

func (s *Server) ListMyMoiItems(ctx context.Context, req ListMyMoiItemsRequestObject) (ListMyMoiItemsResponseObject, error) {
	return listMyMoiItemsNotImpl{}, nil
}

type listMyMoiItemsNotImpl struct{}

func (r listMyMoiItemsNotImpl) VisitListMyMoiItemsResponse(w http.ResponseWriter) error {
	return notImplementedResponse{"ListMyMoiItems"}.write(w)
}

func (s *Server) EquipMoiItem(ctx context.Context, req EquipMoiItemRequestObject) (EquipMoiItemResponseObject, error) {
	return equipMoiItemNotImpl{}, nil
}

type equipMoiItemNotImpl struct{}

func (r equipMoiItemNotImpl) VisitEquipMoiItemResponse(w http.ResponseWriter) error {
	return notImplementedResponse{"EquipMoiItem"}.write(w)
}

func (s *Server) UnequipMoiItem(ctx context.Context, req UnequipMoiItemRequestObject) (UnequipMoiItemResponseObject, error) {
	return unequipMoiItemNotImpl{}, nil
}

type unequipMoiItemNotImpl struct{}

func (r unequipMoiItemNotImpl) VisitUnequipMoiItemResponse(w http.ResponseWriter) error {
	return notImplementedResponse{"UnequipMoiItem"}.write(w)
}


// GetWedding and UpdateWedding are implemented in handler_weddings.go


// ShareInvitation is implemented in handler_invitations.go

// MemoryBook handlers: handler_memorybook.go.

func (s *Server) GetLounge(ctx context.Context, req GetLoungeRequestObject) (GetLoungeResponseObject, error) {
	q := db.New(s.LoungeCheckIns.(*loungeCheckInService).pool)
	row, err := q.GetLoungeByID(ctx, pgtype.UUID{Bytes: req.LoungeId, Valid: true})
	if err != nil {
		return nil, err
	}
	return GetLounge200JSONResponse(Lounge{
		Id:        uuidToOpenapi(row.ID),
		WeddingId: uuidToOpenapi(row.WeddingID),
		Name:      row.Name,
		GatherPlace: GatherPlaceSummary{
			Id:   uuidToOpenapi(row.GatherPlaceID),
			Type: row.GatherPlaceType,
		},
	}), nil
}

func (s *Server) GetGatherPlace(ctx context.Context, req GetGatherPlaceRequestObject) (GetGatherPlaceResponseObject, error) {
	return getGatherPlaceNotImpl{}, nil
}

type getGatherPlaceNotImpl struct{}

func (r getGatherPlaceNotImpl) VisitGetGatherPlaceResponse(w http.ResponseWriter) error {
	return notImplementedResponse{"GetGatherPlace"}.write(w)
}

func (s *Server) GetMoi(ctx context.Context, req GetMoiRequestObject) (GetMoiResponseObject, error) {
	return getMoiNotImpl{}, nil
}

type getMoiNotImpl struct{}

func (r getMoiNotImpl) VisitGetMoiResponse(w http.ResponseWriter) error {
	return notImplementedResponse{"GetMoi"}.write(w)
}

func (s *Server) SendMoiItem(ctx context.Context, req SendMoiItemRequestObject) (SendMoiItemResponseObject, error) {
	return sendMoiItemNotImpl{}, nil
}

type sendMoiItemNotImpl struct{}

func (r sendMoiItemNotImpl) VisitSendMoiItemResponse(w http.ResponseWriter) error {
	return notImplementedResponse{"SendMoiItem"}.write(w)
}

// ListLoungeCheckIns and CreateLoungeCheckIn are implemented in handler_lounge_entries.go

func (s *Server) ListInteriorItems(ctx context.Context, req ListInteriorItemsRequestObject) (ListInteriorItemsResponseObject, error) {
	return listInteriorItemsNotImpl{}, nil
}

type listInteriorItemsNotImpl struct{}

func (r listInteriorItemsNotImpl) VisitListInteriorItemsResponse(w http.ResponseWriter) error {
	return notImplementedResponse{"ListInteriorItems"}.write(w)
}

func (s *Server) CreateInteriorItem(ctx context.Context, req CreateInteriorItemRequestObject) (CreateInteriorItemResponseObject, error) {
	return createInteriorItemNotImpl{}, nil
}

type createInteriorItemNotImpl struct{}

func (r createInteriorItemNotImpl) VisitCreateInteriorItemResponse(w http.ResponseWriter) error {
	return notImplementedResponse{"CreateInteriorItem"}.write(w)
}

func (s *Server) PlaceInteriorItem(ctx context.Context, req PlaceInteriorItemRequestObject) (PlaceInteriorItemResponseObject, error) {
	return placeInteriorItemNotImpl{}, nil
}

type placeInteriorItemNotImpl struct{}

func (r placeInteriorItemNotImpl) VisitPlaceInteriorItemResponse(w http.ResponseWriter) error {
	return notImplementedResponse{"PlaceInteriorItem"}.write(w)
}

func (s *Server) UnplaceInteriorItem(ctx context.Context, req UnplaceInteriorItemRequestObject) (UnplaceInteriorItemResponseObject, error) {
	return unplaceInteriorItemNotImpl{}, nil
}

type unplaceInteriorItemNotImpl struct{}

func (r unplaceInteriorItemNotImpl) VisitUnplaceInteriorItemResponse(w http.ResponseWriter) error {
	return notImplementedResponse{"UnplaceInteriorItem"}.write(w)
}

// ListGuestbookEntries and CreateGuestbookEntry are implemented in handler_guestbook.go

// CreateCashGift, ListCashGifts, HostCreateCashGift, GetCashGiftsSummary,
// UpdateCashGift, DeleteCashGift are implemented in handler_cash_gifts.go

// ListAnnouncements, CreateAnnouncement, UpdateAnnouncement, DeleteAnnouncement
// are implemented in handler_announcements.go

// ListFeed is implemented in handler_feed.go

// ToggleFeedHeart is implemented in handler_feed_hearts.go

// CreateFeedComment, ListFeedComments, DeleteFeedComment are implemented in handler_feed_comments.go
