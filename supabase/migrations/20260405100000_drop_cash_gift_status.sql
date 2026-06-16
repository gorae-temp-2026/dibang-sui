-- cash_gifts.status 컬럼 제거
-- cash_gifts는 레코드 존재 여부로 납부 확인. status는 불필요
alter table cash_gifts drop column if exists status;
