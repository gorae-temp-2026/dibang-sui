-- lounge_entry 생성 시점에 visitor_name을 스냅샷으로 저장
ALTER TABLE public.v3_lounge_entries
ADD COLUMN visitor_name text;

-- 기존 데이터 백필: moi → user name
UPDATE public.v3_lounge_entries le
SET visitor_name = u.name
FROM v3_mois m
JOIN v3_users u ON u.id = m.user_id
WHERE m.id = le.moi_id AND le.visitor_name IS NULL;

-- NOT NULL 제약 추가
ALTER TABLE public.v3_lounge_entries
ALTER COLUMN visitor_name SET NOT NULL;
