-- v3 MobileInvitation: 공유 링크용 slug 컬럼 추가
-- API에서 GET /invitations/{slug}로 청첩장을 조회하기 위해 필요

ALTER TABLE v3_mobile_invitations
    ADD COLUMN slug TEXT UNIQUE;
