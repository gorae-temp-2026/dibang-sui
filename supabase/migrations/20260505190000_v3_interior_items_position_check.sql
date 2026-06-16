-- v3_interior_items: position JSONB에 {x, y} 구조 CHECK 제약 추가
-- position이 NULL이면 OK (unplaced 상태), 값이 있으면 x와 y 키가 반드시 존재해야 함

ALTER TABLE v3_interior_items
    ADD CONSTRAINT interior_items_position_structure
    CHECK (position IS NULL OR (position ? 'x' AND position ? 'y'));
