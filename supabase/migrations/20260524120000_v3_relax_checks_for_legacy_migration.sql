-- V3 CHECK 완화 (legacy → V3 마이그레이션 준비)
-- 사유: prod legacy 데이터 분석에서 V3 CHECK 한도 초과 발견. 행 누락·잘림을 피하기 위해 한도 완화.
-- 관련 문서: _research_analysis/legacy-v3-migration/decisions.md §8

-- 1) guest_name: 10자 → 20자
-- prod messages.guest_name 최대 18자 (외국인 5행: Courtney Glotzbach 18, Fadie Musallet 14 등)
ALTER TABLE public.v3_guestbook_entries
  DROP CONSTRAINT chk_guestbook_guest_name_len;
ALTER TABLE public.v3_guestbook_entries
  ADD CONSTRAINT chk_guestbook_guest_name_len CHECK (char_length(guest_name) <= 20);

ALTER TABLE public.v3_cash_gifts
  DROP CONSTRAINT v3_cash_gifts_guest_name_check;
ALTER TABLE public.v3_cash_gifts
  ADD CONSTRAINT v3_cash_gifts_guest_name_check CHECK (char_length(guest_name) <= 20);

-- 2) guestbook_entries.message: 60자 → 70자
-- prod messages.message 최대 66자 (2/279행). 70자 완화 시 prod 데이터 잘림 0건.
ALTER TABLE public.v3_guestbook_entries
  DROP CONSTRAINT chk_guestbook_message_len;
ALTER TABLE public.v3_guestbook_entries
  ADD CONSTRAINT chk_guestbook_message_len CHECK ((message IS NULL) OR (char_length(message) <= 70));

-- 3) memories.text: 1~60자 → 1~80자
-- prod photos(feed).caption 최대 78자 (2/13행). 80자 완화 시 prod 데이터 잘림 0건. (하한 1자 유지)
ALTER TABLE public.v3_memories
  DROP CONSTRAINT chk_memory_text_len;
ALTER TABLE public.v3_memories
  ADD CONSTRAINT chk_memory_text_len CHECK ((char_length(text) >= 1) AND (char_length(text) <= 80));
