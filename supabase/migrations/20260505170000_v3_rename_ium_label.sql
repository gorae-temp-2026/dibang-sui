-- v3_iums: label → relation_label 칼럼명 변경
-- d2 예약어 'label'과 충돌하여 ERD에서 테이블 이름이 "text"로 표시되는 문제 해결.
-- relation_type과 짝을 맞추기 위해 relation_label로 변경.

ALTER TABLE v3_iums RENAME COLUMN label TO relation_label;
