-- 청첩장 커버 텍스트 커스터마이징 (문구, 크기, 위치)
ALTER TABLE public.v3_mobile_invitations
ADD COLUMN cover_text_config jsonb;
