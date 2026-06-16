-- v3_guestbook_entries.message 드롭 + 본문은 v3_guestbook_messages로 일원화.
--
-- 배경:
--   v3 init(20260504200000) 시점에 entries.message TEXT NOT NULL이 박혔고,
--   wedding-lounge 시나리오(20260508100000)가 nullable로 풀었음.
--   이후 Photo Sharing 작업이 v3_guestbook_messages를 신설하고,
--   memory-domain-split이 messages.photo_url을 별도 v3_memories로 떼냈지만
--   entries.message는 손대지 않아 본문이 두 테이블에 이중 저장된 비정규 모델로 굳음.
--   admin "방명록 41 / 라운지 메시지 14" 의 비대칭이 그 결과.
--
-- 결정 (2026-05-25): 본문 단일 진실원천을 v3_guestbook_messages로 통일.
--   - v3_guestbook_entries 는 멤버십·관계만 보존:
--       guest_name, recipient_slot, relation_category, relation_detail
--   - 본문은 v3_guestbook_messages 에서 조회 (entry_id JOIN)
--   - FK 단방향(messages → entries) 유지, 1:N(entry당 여러 메시지) 모델 보존
--
-- 작용:
--   1) messages.chk_guestbook_message_len 60→70자 완화
--      (entries는 24120000에서 이미 70자로 완화됐고, prod entries.message 중
--       60자 초과 2건 존재. messages 통합 시점에 같은 70자 기준으로 정렬)
--   2) entries.message 본문이 있는 행을 messages로 1:1 이관
--      (id=신규 uuid, entry_id=e.id, lounge_id=e.lounge_id, message·created_at 보존)
--   3) entries 의 chk_guestbook_message_len 제약 드롭
--      (※ messages에 동명 제약 별도 존재. ALTER TABLE 테이블 명시로 entries만 드롭)
--   4) entries.message 컬럼 드롭
--
-- 영향 (후속 PR 별도):
--   - 백엔드: apps/api/server/service_feed.go fetchGuestbookEntries에서 message SELECT 제거,
--            sqlc 쿼리 재생성, 신규 entry 생성 핸들러는 entry INSERT → 본문 있으면
--            messages INSERT 2단계 트랜잭션으로 전환.
--   - 프론트: dibang-wedding (FeedItemGuestbookEntry/GatheringLog/loungeV2Feed),
--            admin (WeddingDetailPage 방명록 탭) 모두 entries.message 의존 제거.
--   - 문서: _research_analysis/legacy-v3-migration/mapping-spec.md §6,
--          _scenario/wedding-lounge/SCENARIOS.md §1-1 갱신.
--
-- 순수 DDL + 데이터 이관. RLS·publication 무수정.

-- 1) messages 길이 제약 60→70 완화 (이관 시 entries 60자 초과 2건이 통과되어야 함)
ALTER TABLE v3_guestbook_messages
    DROP CONSTRAINT chk_guestbook_message_len;

ALTER TABLE v3_guestbook_messages
    ADD CONSTRAINT chk_guestbook_message_len CHECK (char_length(message) <= 70);

-- 2) 본문 이관 (placeholder "hearts" entry는 message NULL이라 자동 제외)
INSERT INTO v3_guestbook_messages (id, guestbook_entry_id, lounge_id, message, created_at)
SELECT
    gen_random_uuid(),
    e.id,
    e.lounge_id,
    e.message,
    e.created_at
FROM v3_guestbook_entries e
WHERE e.message IS NOT NULL AND e.message != '';

-- 3) entries 제약·컬럼 드롭
ALTER TABLE v3_guestbook_entries
    DROP CONSTRAINT chk_guestbook_message_len;

ALTER TABLE v3_guestbook_entries
    DROP COLUMN message;
