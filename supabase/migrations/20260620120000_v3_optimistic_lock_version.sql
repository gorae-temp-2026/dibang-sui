-- XS-7d 낙관잠금(optimistic lock): 청첩장/웨딩 동시편집 충돌 감지용 version 칼럼.
-- UpdateWeddingInfo / UpdateInvitation이 UPDATE ... SET version = version + 1
--   WHERE id = $id AND version = $expected 로 갱신하고, 0행이면 conflict(handler가 409).
-- 기존 행은 DEFAULT 0으로 채워지고, 이후 갱신마다 +1 된다.

ALTER TABLE public.v3_weddings
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;

ALTER TABLE public.v3_mobile_invitations
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
