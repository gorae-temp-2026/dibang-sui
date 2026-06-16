-- Display 앱 Realtime 연결 상태 모니터링용 heartbeat 테이블
-- 웨딩당 1개 레코드, Display 앱이 30초마다 last_seen_at을 upsert

CREATE TABLE IF NOT EXISTS display_heartbeats (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id    uuid        NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(wedding_id)
);

ALTER TABLE display_heartbeats ENABLE ROW LEVEL SECURITY;

-- anon(Display 앱)은 INSERT/UPDATE만 허용, SELECT/DELETE 차단
CREATE POLICY "anon can insert display heartbeat"
  ON display_heartbeats FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can update display heartbeat"
  ON display_heartbeats FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 클라이언트가 보내는 last_seen_at을 무시하고 서버 시간으로 강제 덮어쓰기
-- (미래 시간 조작 방지)
CREATE OR REPLACE FUNCTION force_heartbeat_server_time()
RETURNS trigger AS $$
BEGIN
  NEW.last_seen_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_heartbeat_force_now
  BEFORE INSERT OR UPDATE ON display_heartbeats
  FOR EACH ROW EXECUTE FUNCTION force_heartbeat_server_time();

CREATE INDEX idx_display_heartbeats_wedding ON display_heartbeats(wedding_id);
CREATE INDEX idx_display_heartbeats_last_seen ON display_heartbeats(last_seen_at DESC);
