-- v3_iums: type → relation_type 칼럼명 변경
-- d2 예약어 'type'과 충돌하여 ERD 렌더링 오류 발생. 의미도 relation_type이 더 명확.

ALTER TABLE v3_iums RENAME COLUMN type TO relation_type;
