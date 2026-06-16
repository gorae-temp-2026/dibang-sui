-- v3_mobile_invitations.design_config: 레터링·폰트·색상·섹션 구성을 단일 jsonb 컬럼으로 저장.
-- config 구조:
--   lettering: { source, imageUrl, strokes[], drawViewBox, animation, x, y, width, height, rotation }
--   theme: { fonts: { title, subtitle, body }, colors: { background, text, button, accent } }
--   sections: [{ key, enabled, order }]

BEGIN;

ALTER TABLE public.v3_mobile_invitations
    ADD COLUMN design_config jsonb NULL;

COMMENT ON COLUMN public.v3_mobile_invitations.design_config IS
    '레터링·폰트·색상·섹션 구성 (nullable jsonb)';

COMMIT;
