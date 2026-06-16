-- Photo Sharing 기능: 신규 테이블 2개
--
-- 시나리오: _scenario/photo-sharing/SCENARIOS.md §8
-- - v3_mobile_invitation_photos: 청첩장 커버/갤러리 사진 1:N (cover 1 + gallery 60장)
-- - v3_shared_photos: 하객→호스트 현장사진 공유 (lounge_id × guest_user_id, 100장/하객 한도는 서버 트랜잭션 검증)
--
-- DDL only (v3 컨벤션상 RLS 미사용). Storage RLS는 인프라 액션(§12)으로 별도.

-- ── v3_mobile_invitation_photos ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.v3_mobile_invitation_photos (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id uuid NOT NULL REFERENCES public.v3_mobile_invitations(id) ON DELETE CASCADE,
    sub_kind      text NOT NULL CHECK (sub_kind IN ('cover','gallery')),
    storage_path  text NOT NULL,          -- "mobile-invitation/{weddingId}/{cover|gallery}/{uuid.ext}"
    file_name     text,
    file_size     int,
    mime_type     text,
    sort_order    int  NOT NULL DEFAULT 0,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v3_mi_photos_invitation_sort
    ON public.v3_mobile_invitation_photos (invitation_id, sub_kind, sort_order);

-- cover는 invitation당 최대 1행 (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_v3_mi_photos_cover
    ON public.v3_mobile_invitation_photos (invitation_id)
    WHERE sub_kind = 'cover';


-- ── v3_shared_photos ────────────────────────────────────────────────────
-- 하객→호스트 현장사진 공유. 100장/하객 한도는 서버 INSERT 트랜잭션에서
-- SELECT count(*) WHERE lounge_id=? AND guest_user_id=? < 100 검증
-- (DB CHECK가 아니라 동시성은 -race 테스트로 보장).
CREATE TABLE IF NOT EXISTS public.v3_shared_photos (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lounge_id      uuid NOT NULL REFERENCES public.v3_wedding_lounges(id) ON DELETE CASCADE,
    guest_user_id  uuid NOT NULL REFERENCES public.v3_users(id) ON DELETE CASCADE,
    storage_path   text NOT NULL,          -- "share/{loungeId}/{guestUserId}/{uuid.ext}"
    file_name      text,
    file_size      int,
    mime_type      text,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v3_shared_photos_lookup
    ON public.v3_shared_photos (lounge_id, guest_user_id, created_at DESC);
