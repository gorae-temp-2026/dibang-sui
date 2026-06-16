-- weddings 테이블에 사진 크롭 영역 저장용 jsonb 컬럼 추가
-- CropArea: { x, y, width, height } (퍼센트 기반, react-easy-crop 호환)
ALTER TABLE weddings ADD COLUMN photo_crop_area jsonb;
