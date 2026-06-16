-- v3_cash_gifts: is_attended 칼럼 추가 + pay_method에 'cash' 추가
ALTER TABLE v3_cash_gifts
    ADD COLUMN IF NOT EXISTS is_attended BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE v3_cash_gifts
    DROP CONSTRAINT v3_cash_gifts_pay_method_check;

ALTER TABLE v3_cash_gifts
    ADD CONSTRAINT v3_cash_gifts_pay_method_check
    CHECK (pay_method IN ('transfer', 'kakaopay', 'toss', 'cash'));
