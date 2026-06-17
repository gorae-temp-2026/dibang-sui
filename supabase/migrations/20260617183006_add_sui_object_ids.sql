-- Sui 온체인 오브젝트 ID 저장 (C7 데이터 브릿지).
-- 호스트 웨딩 온체인 생성(createWedding)이 발행한 Sui 오브젝트 ID를
-- Supabase row에 dual-write 한다 (D0-1). 온체인 실패 시 null로 두어 추후 재시도.
-- 멱등(IF NOT EXISTS) — 환경별 상태 차이에도 안전.
ALTER TABLE public.v3_weddings        ADD COLUMN IF NOT EXISTS sui_wedding_id text;
ALTER TABLE public.v3_weddings        ADD COLUMN IF NOT EXISTS sui_vault_id   text;
ALTER TABLE public.v3_wedding_lounges ADD COLUMN IF NOT EXISTS sui_lounge_id  text;
