
CREATE TABLE public.v3_cash_gifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wedding_id uuid NOT NULL,
    guest_name text NOT NULL,
    guest_id uuid,
    recipient_slot text NOT NULL,
    relation_category text NOT NULL,
    relation_detail text,
    amount integer NOT NULL,
    pay_method text NOT NULL,
    guestbook_entry_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT v3_cash_gifts_amount_check CHECK ((amount >= 0)),
    CONSTRAINT v3_cash_gifts_guest_name_check CHECK ((char_length(guest_name) <= 10)),
    CONSTRAINT v3_cash_gifts_pay_method_check CHECK ((pay_method = ANY (ARRAY['transfer'::text, 'kakaopay'::text, 'toss'::text, 'cash'::text]))),
    CONSTRAINT v3_cash_gifts_recipient_slot_check CHECK ((recipient_slot = ANY (ARRAY['groom'::text, 'bride'::text, 'groom_father'::text, 'groom_mother'::text, 'bride_father'::text, 'bride_mother'::text]))),
    CONSTRAINT v3_cash_gifts_relation_detail_check CHECK (((relation_detail IS NULL) OR (char_length(relation_detail) <= 40)))
);

CREATE TABLE public.v3_rsvps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wedding_id uuid NOT NULL,
    recipient_slot text NOT NULL,
    guest_name text NOT NULL,
    attendance text NOT NULL,
    companion_count integer DEFAULT 0 NOT NULL,
    meal text DEFAULT 'undecided'::text NOT NULL,
    phone_last4 text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT v3_rsvps_attendance_check CHECK ((attendance = ANY (ARRAY['attending'::text, 'absent'::text]))),
    CONSTRAINT v3_rsvps_companion_check CHECK (((companion_count >= 0) AND (companion_count <= 20))),
    CONSTRAINT v3_rsvps_guest_name_check CHECK ((char_length(guest_name) <= 20)),
    CONSTRAINT v3_rsvps_meal_check CHECK ((meal = ANY (ARRAY['yes'::text, 'no'::text, 'undecided'::text]))),
    CONSTRAINT v3_rsvps_recipient_slot_check CHECK ((recipient_slot = ANY (ARRAY['groom'::text, 'bride'::text, 'groom_father'::text, 'groom_mother'::text, 'bride_father'::text, 'bride_mother'::text])))
);

CREATE TABLE public.v3_feed_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT v3_feed_comments_message_check CHECK ((char_length(message) <= 50)),
    CONSTRAINT v3_feed_comments_target_type_check CHECK ((target_type = ANY (ARRAY['guestbook_entry'::text, 'host_announcement'::text, 'guestbook_message'::text])))
);

CREATE TABLE public.v3_feed_hearts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.v3_feed_hearts IS '피드 아이템 좋아요 (중복 방지). target_type: guestbook_entry | announcement';

COMMENT ON COLUMN public.v3_feed_hearts.target_type IS 'guestbook_entry | announcement';

COMMENT ON COLUMN public.v3_feed_hearts.target_id IS '대상 테이블의 PK (UUID)';

CREATE TABLE public.v3_guestbook_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lounge_id uuid NOT NULL,
    guest_name text NOT NULL,
    guest_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    recipient_slot text NOT NULL,
    relation_category text NOT NULL,
    relation_detail text,
    CONSTRAINT chk_guestbook_guest_name_len CHECK ((char_length(guest_name) <= 20)),
    CONSTRAINT chk_guestbook_recipient_slot CHECK ((recipient_slot = ANY (ARRAY['groom'::text, 'bride'::text, 'groom_father'::text, 'groom_mother'::text, 'bride_father'::text, 'bride_mother'::text]))),
    CONSTRAINT chk_guestbook_relation_detail_len CHECK (((relation_detail IS NULL) OR (char_length(relation_detail) <= 40)))
);

COMMENT ON COLUMN public.v3_guestbook_entries.recipient_slot IS '작성자 소속: groom | bride';

COMMENT ON COLUMN public.v3_guestbook_entries.relation_category IS '관계 카테고리: 친구·지인, 가족·친척, 동문·동창, 직장동료, 스승·제자 등';

COMMENT ON COLUMN public.v3_guestbook_entries.relation_detail IS '세부 관계 설명: 사촌언니, 하이닉스, 경영 13 등';

CREATE TABLE public.v3_guestbook_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    guestbook_entry_id uuid NOT NULL,
    message text NOT NULL,
    lounge_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_guestbook_message_len CHECK ((char_length(message) <= 70))
);

CREATE TABLE public.v3_memories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lounge_id uuid NOT NULL,
    author_user_id uuid NOT NULL,
    text text NOT NULL,
    photo_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT chk_memory_text_len CHECK (((char_length(text) >= 1) AND (char_length(text) <= 60)))
);

CREATE TABLE public.v3_guestbook_message_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    guestbook_message_id uuid NOT NULL,
    viewer_id uuid NOT NULL,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.v3_host_announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lounge_id uuid NOT NULL,
    host_id uuid NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT chk_announcement_message_len CHECK ((char_length(message) <= 100))
);

COMMENT ON COLUMN public.v3_host_announcements.is_pinned IS '피드 상단 고정 여부 (라운지당 최대 1개)';

CREATE TABLE public.v3_host_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wedding_id uuid NOT NULL,
    slot text NOT NULL,
    token text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    invited_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    accepted_at timestamp with time zone
);

CREATE TABLE public.v3_interior_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    moi_gather_place_id uuid NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    size text,
    image text,
    status text DEFAULT 'unplaced'::text NOT NULL,
    "position" jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT interior_items_position_structure CHECK ((("position" IS NULL) OR (("position" ? 'x'::text) AND ("position" ? 'y'::text))))
);

CREATE TABLE public.v3_iums (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    relation_type text NOT NULL,
    relation_label text NOT NULL,
    from_user_id uuid NOT NULL,
    to_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT iums_no_self_link CHECK ((from_user_id <> to_user_id))
);

CREATE TABLE public.v3_lounge_check_ins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    lounge_id uuid NOT NULL,
    visitor_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    recipient_slot text,
    relation_category text,
    relation_detail text
);

CREATE TABLE public.v3_mobile_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wedding_id uuid NOT NULL,
    design_template_id text NOT NULL,
    custom_message text,
    visited_count integer DEFAULT 0 NOT NULL,
    heart_count integer DEFAULT 0 NOT NULL,
    gallery_photos jsonb DEFAULT '[]'::jsonb NOT NULL,
    cover_image text,
    cover_text_config jsonb,
    design_config jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    slug text NOT NULL
);

CREATE TABLE public.v3_moi_gather_places (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lounge_id uuid NOT NULL,
    type text NOT NULL
);

CREATE TABLE public.v3_moi_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    moi_id uuid NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    slot text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.v3_mois (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    equipped_items jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE public.v3_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    profile_image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.v3_wedding_lounges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wedding_id uuid NOT NULL,
    name text NOT NULL,
    sui_lounge_id text
);

CREATE TABLE public.v3_weddings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    host_groom_id uuid,
    host_bride_id uuid,
    host_groom_father_id uuid,
    host_groom_mother_id uuid,
    host_bride_father_id uuid,
    host_bride_mother_id uuid,
    groom_name text NOT NULL,
    bride_name text NOT NULL,
    groom_father_name text,
    groom_mother_name text,
    bride_father_name text,
    bride_mother_name text,
    groom_father_deceased boolean DEFAULT false NOT NULL,
    groom_mother_deceased boolean DEFAULT false NOT NULL,
    bride_father_deceased boolean DEFAULT false NOT NULL,
    bride_mother_deceased boolean DEFAULT false NOT NULL,
    date date NOT NULL,
    "time" text NOT NULL,
    venue_name text NOT NULL,
    venue_address text NOT NULL,
    venue_hall text,
    groom_account jsonb,
    bride_account jsonb,
    groom_father_account jsonb,
    groom_mother_account jsonb,
    bride_father_account jsonb,
    bride_mother_account jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sui_wedding_id text,
    sui_vault_id text
);

ALTER TABLE ONLY public.v3_feed_hearts
    ADD CONSTRAINT feed_hearts_unique_per_user UNIQUE (user_id, target_type, target_id);

ALTER TABLE ONLY public.v3_iums
    ADD CONSTRAINT iums_unique_pair UNIQUE (from_user_id, to_user_id);

ALTER TABLE ONLY public.v3_cash_gifts
    ADD CONSTRAINT v3_cash_gifts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.v3_feed_comments
    ADD CONSTRAINT v3_feed_comments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.v3_feed_hearts
    ADD CONSTRAINT v3_feed_hearts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.v3_guestbook_entries
    ADD CONSTRAINT v3_guestbook_entries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.v3_guestbook_messages
    ADD CONSTRAINT v3_guestbook_messages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.v3_guestbook_message_views
    ADD CONSTRAINT v3_guestbook_message_views_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.v3_guestbook_message_views
    ADD CONSTRAINT v3_guestbook_message_views_unique UNIQUE (guestbook_message_id, viewer_id);

ALTER TABLE ONLY public.v3_memories
    ADD CONSTRAINT v3_memories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.v3_host_announcements
    ADD CONSTRAINT v3_host_announcements_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.v3_host_invites
    ADD CONSTRAINT v3_host_invites_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.v3_host_invites
    ADD CONSTRAINT v3_host_invites_token_key UNIQUE (token);

ALTER TABLE ONLY public.v3_interior_items
    ADD CONSTRAINT v3_interior_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.v3_iums
    ADD CONSTRAINT v3_iums_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.v3_mobile_invitations
    ADD CONSTRAINT v3_mobile_invitations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.v3_mobile_invitations
    ADD CONSTRAINT v3_mobile_invitations_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.v3_moi_gather_places
    ADD CONSTRAINT v3_moi_gather_places_lounge_id_key UNIQUE (lounge_id);

ALTER TABLE ONLY public.v3_moi_gather_places
    ADD CONSTRAINT v3_moi_gather_places_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.v3_moi_items
    ADD CONSTRAINT v3_moi_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.v3_lounge_check_ins
    ADD CONSTRAINT v3_lounge_check_ins_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.v3_mois
    ADD CONSTRAINT v3_mois_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.v3_mois
    ADD CONSTRAINT v3_mois_user_id_key UNIQUE (user_id);

ALTER TABLE ONLY public.v3_users
    ADD CONSTRAINT v3_users_email_key UNIQUE (email);

ALTER TABLE ONLY public.v3_users
    ADD CONSTRAINT v3_users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.v3_wedding_lounges
    ADD CONSTRAINT v3_wedding_lounges_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.v3_wedding_lounges
    ADD CONSTRAINT v3_wedding_lounges_wedding_id_key UNIQUE (wedding_id);

ALTER TABLE ONLY public.v3_weddings
    ADD CONSTRAINT v3_weddings_pkey PRIMARY KEY (id);

CREATE INDEX idx_v3_cash_gifts_wedding ON public.v3_cash_gifts USING btree (wedding_id);

CREATE INDEX idx_v3_feed_comments_target ON public.v3_feed_comments USING btree (target_type, target_id);

CREATE INDEX idx_v3_feed_comments_user ON public.v3_feed_comments USING btree (user_id);

CREATE INDEX idx_v3_feed_hearts_target ON public.v3_feed_hearts USING btree (target_type, target_id);

CREATE INDEX idx_v3_feed_hearts_user ON public.v3_feed_hearts USING btree (user_id);

CREATE INDEX idx_v3_guestbook_entries_lounge_id ON public.v3_guestbook_entries USING btree (lounge_id);

CREATE INDEX idx_v3_guestbook_messages_entry ON public.v3_guestbook_messages USING btree (guestbook_entry_id);

CREATE INDEX idx_v3_guestbook_message_views_message ON public.v3_guestbook_message_views USING btree (guestbook_message_id);

CREATE INDEX idx_v3_memories_lounge_created_at ON public.v3_memories USING btree (lounge_id, created_at DESC) WHERE (deleted_at IS NULL);

CREATE INDEX idx_v3_memories_author_lounge ON public.v3_memories USING btree (author_user_id, lounge_id);

CREATE INDEX idx_v3_host_announcements_lounge_id ON public.v3_host_announcements USING btree (lounge_id);

CREATE INDEX idx_v3_host_invites_token ON public.v3_host_invites USING btree (token);

CREATE INDEX idx_v3_host_invites_wedding_id ON public.v3_host_invites USING btree (wedding_id);

CREATE INDEX idx_v3_interior_items_place_id ON public.v3_interior_items USING btree (moi_gather_place_id);

CREATE INDEX idx_v3_iums_from ON public.v3_iums USING btree (from_user_id);

CREATE INDEX idx_v3_iums_to ON public.v3_iums USING btree (to_user_id);

CREATE INDEX idx_v3_lounge_check_ins_lounge_user ON public.v3_lounge_check_ins USING btree (lounge_id, user_id);
-- (인덱스 이름은 idx_v3_lounge_check_ins_lounge_user — rename 마이그레이션 적용 후 상태)

CREATE INDEX idx_v3_guestbook_entries_lounge_guest ON public.v3_guestbook_entries USING btree (lounge_id, guest_id);

CREATE INDEX idx_v3_mobile_invitations_wedding_id ON public.v3_mobile_invitations USING btree (wedding_id);

CREATE INDEX idx_v3_moi_items_moi_id ON public.v3_moi_items USING btree (moi_id);

CREATE INDEX idx_v3_weddings_bride_id ON public.v3_weddings USING btree (host_bride_id);

CREATE INDEX idx_v3_weddings_groom_id ON public.v3_weddings USING btree (host_groom_id);

ALTER TABLE ONLY public.v3_cash_gifts
    ADD CONSTRAINT v3_cash_gifts_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.v3_users(id);

ALTER TABLE ONLY public.v3_cash_gifts
    ADD CONSTRAINT v3_cash_gifts_guestbook_entry_id_fkey FOREIGN KEY (guestbook_entry_id) REFERENCES public.v3_guestbook_entries(id);

ALTER TABLE ONLY public.v3_cash_gifts
    ADD CONSTRAINT v3_cash_gifts_wedding_id_fkey FOREIGN KEY (wedding_id) REFERENCES public.v3_weddings(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.v3_feed_comments
    ADD CONSTRAINT v3_feed_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.v3_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.v3_feed_hearts
    ADD CONSTRAINT v3_feed_hearts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.v3_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.v3_guestbook_entries
    ADD CONSTRAINT v3_guestbook_entries_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.v3_users(id);

ALTER TABLE ONLY public.v3_guestbook_entries
    ADD CONSTRAINT v3_guestbook_entries_lounge_id_fkey FOREIGN KEY (lounge_id) REFERENCES public.v3_wedding_lounges(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.v3_guestbook_messages
    ADD CONSTRAINT v3_guestbook_messages_entry_fkey FOREIGN KEY (guestbook_entry_id) REFERENCES public.v3_guestbook_entries(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.v3_guestbook_message_views
    ADD CONSTRAINT v3_guestbook_message_views_message_fkey FOREIGN KEY (guestbook_message_id) REFERENCES public.v3_guestbook_messages(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.v3_guestbook_message_views
    ADD CONSTRAINT v3_guestbook_message_views_viewer_fkey FOREIGN KEY (viewer_id) REFERENCES public.v3_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.v3_memories
    ADD CONSTRAINT v3_memories_lounge_id_fkey FOREIGN KEY (lounge_id) REFERENCES public.v3_wedding_lounges(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.v3_memories
    ADD CONSTRAINT v3_memories_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES public.v3_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.v3_host_announcements
    ADD CONSTRAINT v3_host_announcements_host_id_fkey FOREIGN KEY (host_id) REFERENCES public.v3_users(id);

ALTER TABLE ONLY public.v3_host_announcements
    ADD CONSTRAINT v3_host_announcements_lounge_id_fkey FOREIGN KEY (lounge_id) REFERENCES public.v3_wedding_lounges(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.v3_host_invites
    ADD CONSTRAINT v3_host_invites_invited_user_id_fkey FOREIGN KEY (invited_user_id) REFERENCES public.v3_users(id);

ALTER TABLE ONLY public.v3_host_invites
    ADD CONSTRAINT v3_host_invites_wedding_id_fkey FOREIGN KEY (wedding_id) REFERENCES public.v3_weddings(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.v3_interior_items
    ADD CONSTRAINT v3_interior_items_moi_gather_place_id_fkey FOREIGN KEY (moi_gather_place_id) REFERENCES public.v3_moi_gather_places(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.v3_iums
    ADD CONSTRAINT v3_iums_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.v3_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.v3_iums
    ADD CONSTRAINT v3_iums_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.v3_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.v3_mobile_invitations
    ADD CONSTRAINT v3_mobile_invitations_wedding_id_fkey FOREIGN KEY (wedding_id) REFERENCES public.v3_weddings(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.v3_moi_gather_places
    ADD CONSTRAINT v3_moi_gather_places_lounge_id_fkey FOREIGN KEY (lounge_id) REFERENCES public.v3_wedding_lounges(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.v3_moi_items
    ADD CONSTRAINT v3_moi_items_moi_id_fkey FOREIGN KEY (moi_id) REFERENCES public.v3_mois(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.v3_lounge_check_ins
    ADD CONSTRAINT v3_lounge_check_ins_lounge_id_fkey FOREIGN KEY (lounge_id) REFERENCES public.v3_wedding_lounges(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.v3_lounge_check_ins
    ADD CONSTRAINT v3_lounge_check_ins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.v3_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.v3_mois
    ADD CONSTRAINT v3_mois_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.v3_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.v3_wedding_lounges
    ADD CONSTRAINT v3_wedding_lounges_wedding_id_fkey FOREIGN KEY (wedding_id) REFERENCES public.v3_weddings(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.v3_weddings
    ADD CONSTRAINT v3_weddings_host_bride_father_id_fkey FOREIGN KEY (host_bride_father_id) REFERENCES public.v3_users(id);

ALTER TABLE ONLY public.v3_weddings
    ADD CONSTRAINT v3_weddings_host_bride_id_fkey FOREIGN KEY (host_bride_id) REFERENCES public.v3_users(id);

ALTER TABLE ONLY public.v3_weddings
    ADD CONSTRAINT v3_weddings_host_bride_mother_id_fkey FOREIGN KEY (host_bride_mother_id) REFERENCES public.v3_users(id);

ALTER TABLE ONLY public.v3_weddings
    ADD CONSTRAINT v3_weddings_host_groom_father_id_fkey FOREIGN KEY (host_groom_father_id) REFERENCES public.v3_users(id);

ALTER TABLE ONLY public.v3_weddings
    ADD CONSTRAINT v3_weddings_host_groom_id_fkey FOREIGN KEY (host_groom_id) REFERENCES public.v3_users(id);

ALTER TABLE ONLY public.v3_weddings
    ADD CONSTRAINT v3_weddings_host_groom_mother_id_fkey FOREIGN KEY (host_groom_mother_id) REFERENCES public.v3_users(id);

-- ── Photo Sharing (시나리오 _scenario/photo-sharing/SCENARIOS.md §8) ──
CREATE TABLE public.v3_mobile_invitation_photos (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id uuid NOT NULL REFERENCES public.v3_mobile_invitations(id) ON DELETE CASCADE,
    sub_kind      text NOT NULL CHECK (sub_kind IN ('cover','gallery')),
    storage_path  text NOT NULL,
    file_name     text,
    file_size     int,
    mime_type     text,
    sort_order    int  NOT NULL DEFAULT 0,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_v3_mi_photos_invitation_sort
    ON public.v3_mobile_invitation_photos (invitation_id, sub_kind, sort_order);
CREATE UNIQUE INDEX uniq_v3_mi_photos_cover
    ON public.v3_mobile_invitation_photos (invitation_id)
    WHERE sub_kind = 'cover';

CREATE TABLE public.v3_shared_photos (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lounge_id      uuid NOT NULL REFERENCES public.v3_wedding_lounges(id) ON DELETE CASCADE,
    guest_user_id  uuid NOT NULL REFERENCES public.v3_users(id) ON DELETE CASCADE,
    storage_path   text NOT NULL,
    file_name      text,
    file_size      int,
    mime_type      text,
    created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_v3_shared_photos_lookup
    ON public.v3_shared_photos (lounge_id, guest_user_id, created_at DESC);

-- 웨딩메모리북 큐레이션 사진 (호스트가 v3_shared_photos에서 max 30장 선택)
-- _scenario/wedding-memorybook-2026-05-24/SCENARIOS.md
CREATE TABLE public.v3_memory_book_photos (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id    uuid NOT NULL REFERENCES public.v3_weddings(id) ON DELETE CASCADE,
    photo_id      uuid NOT NULL REFERENCES public.v3_shared_photos(id) ON DELETE CASCADE,
    display_order int  NOT NULL CHECK (display_order BETWEEN 1 AND 30),
    selected_by   uuid NOT NULL REFERENCES public.v3_users(id),
    created_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_mbp_wedding_photo UNIQUE (wedding_id, photo_id),
    CONSTRAINT uq_mbp_wedding_order UNIQUE (wedding_id, display_order)
);
CREATE INDEX idx_v3_memory_book_photos_wedding_order
    ON public.v3_memory_book_photos (wedding_id, display_order);

-- ============================================
-- 약관 동의 (Onboarding Consent)
-- _scenario/2026-05-26-user-consent-onboarding/SCENARIOS.md
-- 원천 마이그레이션: supabase/migrations/20260402200000_profiles_and_consent.sql
-- ============================================

-- 1. profiles — 유저 메타 + 게이트 캐시
CREATE TABLE public.profiles (
    user_id       uuid PRIMARY KEY,
    display_name  text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 20),
    terms_version integer NOT NULL DEFAULT 0,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 2. terms_documents — 약관 메타 (본문 아님)
CREATE TABLE public.terms_documents (
    id              serial PRIMARY KEY,
    terms_type      text NOT NULL,
    version         integer NOT NULL,
    title           text NOT NULL,
    content_url     text NOT NULL,
    is_required     boolean NOT NULL DEFAULT true,
    effective_from  timestamptz NOT NULL DEFAULT now(),
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (terms_type, version)
);

-- 3. consent_records — append-only 감사 로그
CREATE TABLE public.consent_records (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            uuid NOT NULL,
    terms_document_id  integer NOT NULL REFERENCES public.terms_documents(id),
    agreed             boolean NOT NULL,
    agreed_at          timestamptz NOT NULL DEFAULT now(),
    ip_address         inet,
    user_agent         text,
    consent_method     text NOT NULL DEFAULT 'checkbox',
    created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_consent_records_user ON public.consent_records (user_id);
CREATE INDEX idx_consent_records_doc  ON public.consent_records (terms_document_id);

-- ============================================
-- Admin 감사 로그 (admin write 작업 추적)
-- 원천 마이그레이션: supabase/migrations/20260404100000_admin_audit_logs.sql
-- (sqlc 타입 생성용 스키마 스냅샷 — 마이그레이션은 별도 관리)
-- RLS: service_role only (정책 0개).
-- ============================================
CREATE TABLE public.admin_audit_logs (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id  uuid NOT NULL,
    admin_email    text NOT NULL DEFAULT '',
    action         text NOT NULL,         -- 'create' | 'update' | 'delete' | 'soft_delete'
    resource_type  text NOT NULL,         -- 'cash_gift' | 'wedding' | ...
    resource_id    text NOT NULL,         -- UUID 또는 복합키 (text)
    changes        jsonb,                 -- { before?: {...}, after?: {...} }
    request_method text,                  -- 'PATCH' | 'DELETE'
    request_path   text,
    ip_address     text,
    created_at     timestamptz NOT NULL DEFAULT now()
);
