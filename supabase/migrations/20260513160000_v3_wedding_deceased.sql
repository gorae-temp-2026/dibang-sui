-- 고인 여부 컬럼 추가 (신랑/신부 양가 부모님)
ALTER TABLE v3_weddings
    ADD COLUMN groom_father_deceased BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN groom_mother_deceased BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN bride_father_deceased BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN bride_mother_deceased BOOLEAN NOT NULL DEFAULT false;
