-- v3_guestbook_messages: 방명록 메세지 (참석 기록과 분리)
CREATE TABLE public.v3_guestbook_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    guestbook_entry_id uuid NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT v3_guestbook_messages_pkey PRIMARY KEY (id),
    CONSTRAINT v3_guestbook_messages_entry_fkey FOREIGN KEY (guestbook_entry_id)
        REFERENCES public.v3_guestbook_entries(id) ON DELETE CASCADE,
    CONSTRAINT chk_guestbook_message_len CHECK (char_length(message) <= 60)
);

CREATE INDEX idx_v3_guestbook_messages_entry ON public.v3_guestbook_messages USING btree (guestbook_entry_id);

-- feed_comments, feed_hearts의 target_type에 'guestbook_message' 허용
ALTER TABLE public.v3_feed_comments DROP CONSTRAINT v3_feed_comments_target_type_check;
ALTER TABLE public.v3_feed_comments ADD CONSTRAINT v3_feed_comments_target_type_check
    CHECK (target_type = ANY (ARRAY['guestbook_entry'::text, 'host_announcement'::text, 'guestbook_message'::text]));
