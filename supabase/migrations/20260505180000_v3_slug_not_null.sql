-- v3_mobile_invitations: slug를 NOT NULL로 변경
-- Wedding 생성 시 클라이언트가 slug를 직접 입력하므로 항상 존재

ALTER TABLE v3_mobile_invitations ALTER COLUMN slug SET NOT NULL;
