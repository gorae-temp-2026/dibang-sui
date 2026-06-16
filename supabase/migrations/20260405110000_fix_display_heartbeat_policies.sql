-- display_heartbeats anon 정책 재적용
-- 이전 migration(20260404140000)이 applied로 표시됐으나 정책이 누락된 경우를 대비

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'display_heartbeats'
      AND policyname = 'anon can insert display heartbeat'
  ) THEN
    EXECUTE 'CREATE POLICY "anon can insert display heartbeat"
      ON display_heartbeats FOR INSERT TO anon WITH CHECK (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'display_heartbeats'
      AND policyname = 'anon can update display heartbeat'
  ) THEN
    EXECUTE 'CREATE POLICY "anon can update display heartbeat"
      ON display_heartbeats FOR UPDATE TO anon USING (true) WITH CHECK (true)';
  END IF;
END $$;
