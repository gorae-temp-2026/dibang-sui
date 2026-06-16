-- 웨딩메모리북 큐레이션·조회 쿼리.
-- _scenario/wedding-memorybook-2026-05-24/SCENARIOS.md §A, §B, §D.

-- name: ListMemoryBookPhotosByWedding :many
-- 큐레이션된 사진 목록 (display_order 순). 표시용 storage_path / guest_user_id 함께.
SELECT
    mbp.photo_id,
    mbp.display_order,
    sp.storage_path,
    sp.guest_user_id
FROM v3_memory_book_photos mbp
JOIN v3_shared_photos sp ON sp.id = mbp.photo_id
WHERE mbp.wedding_id = $1
ORDER BY mbp.display_order ASC;

-- name: CountMemoryBookPhotosByWedding :one
-- status 분기용 (0건 → ready_uncurated).
SELECT count(*)::int FROM v3_memory_book_photos WHERE wedding_id = $1;

-- name: GetInvitationCoverAndGalleryForMemoryBook :one
-- 메모리북 표지 + 디스플레이 슬라이드쇼 소스.
-- 실제 데이터는 v3_mobile_invitations 행 안의 cover_image(text URL) + gallery_photos(jsonb array of URLs).
-- v3_mobile_invitation_photos 테이블은 별개로 v3에서 사실상 안 쓰임 (모청 사진은 invitation row에 통합).
-- 두 칼럼 모두 public 버킷의 full URL이라 signed URL 변환 불필요.
SELECT
    cover_image,
    coalesce(gallery_photos, '[]'::jsonb) AS gallery_photos
FROM v3_mobile_invitations
WHERE wedding_id = $1
LIMIT 1;

-- name: ValidateSharedPhotoIdsForWedding :many
-- PUT 큐레이션 시 photo_ids가 해당 wedding의 lounge들의 shared 사진인지 검증.
-- 입력 photo_ids 중 유효한 것만 반환 → service에서 set diff로 invalidIds 계산.
SELECT sp.id
FROM v3_shared_photos sp
JOIN v3_wedding_lounges wl ON wl.id = sp.lounge_id
WHERE wl.wedding_id = $1 AND sp.id = ANY($2::uuid[]);

-- RPC public.v3_upsert_memory_book_photos(uuid, uuid[], uuid)는 sqlc로 생성하지 않는다.
-- 이유: SELECT function() 패턴의 파라미터 추론이 generic interface{}로 생성되어 type-safe하지 않음.
-- service_memorybook.go에서 pool.Exec로 직접 호출한다.
-- 이름에 v3_ prefix를 둔 이유: dev Supabase에 v2 시절 잔재 upsert_memory_book_photos(uuid, uuid[], uuid)가 존재하므로,
-- 동일 시그니처로 덮어쓰지 않도록 분리. (사이드 이펙트 회피)

-- name: CountSharedPhotosByWedding :one
-- 통계용: 라운지(들) 전체 공유 사진 수.
SELECT count(*)::int
FROM v3_shared_photos sp
JOIN v3_wedding_lounges wl ON wl.id = sp.lounge_id
WHERE wl.wedding_id = $1;

-- name: CountGuestbookMessagesByWedding :one
-- 통계용 totalGuests: wedding의 모든 라운지의 방명록 메시지 수.
SELECT count(*)::int
FROM v3_guestbook_messages gm
JOIN v3_wedding_lounges wl ON wl.id = gm.lounge_id
WHERE wl.wedding_id = $1;

-- name: CountCashGiftsByWedding :one
-- 통계용 (메시지+축의 합산 = totalMessages).
SELECT count(*)::int FROM v3_cash_gifts WHERE wedding_id = $1;

-- name: ListGuestbookMessagesForCurationByWedding :many
-- 메시지 자동선별 입력. JOIN entries로 recipient_slot/guest_name/relation 함께 반환.
-- is_heart는 message = '__HEART__' sentinel로 판정.
-- 빈 문자열 제외는 service의 selectMessages에서 처리 (NULL/공백 정책 일원화).
SELECT
    gm.id,
    gm.message,
    gm.created_at,
    ge.guest_name,
    ge.recipient_slot,
    ge.relation_category,
    ge.relation_detail,
    (gm.message = '__HEART__')::boolean AS is_heart
FROM v3_guestbook_messages gm
JOIN v3_guestbook_entries ge ON ge.id = gm.guestbook_entry_id
JOIN v3_wedding_lounges wl ON wl.id = gm.lounge_id
WHERE wl.wedding_id = $1
ORDER BY gm.created_at ASC;

-- name: ListSharedPhotosWithGuestForWedding :many
-- 메모리북 큐레이션 페이지용 그룹 데이터 소스.
-- wedding의 모든 라운지의 shared_photos에 user.name + entry(누구측·관계) JOIN.
-- 호스트는 entry가 없을 수 있어 LEFT JOIN. service 레이어에서 guest_user_id로 그룹화.
SELECT
    sp.id              AS photo_id,
    sp.storage_path,
    sp.created_at,
    sp.guest_user_id,
    u.name             AS user_name,
    ge.guest_name      AS entry_guest_name,
    ge.recipient_slot,
    ge.relation_category,
    ge.relation_detail
FROM v3_shared_photos sp
JOIN v3_wedding_lounges wl ON wl.id = sp.lounge_id
JOIN v3_users u ON u.id = sp.guest_user_id
LEFT JOIN v3_guestbook_entries ge
    ON ge.lounge_id = sp.lounge_id AND ge.guest_id = sp.guest_user_id
WHERE wl.wedding_id = $1
ORDER BY sp.guest_user_id ASC, sp.created_at DESC;

-- name: GetWeddingCoupleForMemoryBook :one
-- 메모리북 couple 섹션. v3_weddings 필요 컬럼만.
SELECT
    id,
    groom_name,
    bride_name,
    date,
    time,
    venue_name,
    venue_address,
    venue_hall,
    host_groom_id,
    host_bride_id,
    host_groom_father_id,
    host_groom_mother_id,
    host_bride_father_id,
    host_bride_mother_id
FROM v3_weddings
WHERE id = $1;
