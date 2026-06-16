-- 모청 경로에서 GuestbookEntry 없이 관계 정보를 LoungeEntry에 직접 저장
ALTER TABLE public.v3_lounge_entries
ADD COLUMN recipient_slot    TEXT,
ADD COLUMN relation_category TEXT,
ADD COLUMN relation_detail   TEXT;
