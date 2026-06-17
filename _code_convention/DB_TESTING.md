# DB 테스트 컨벤션

DB(migration · RLS · 시드)의 검증 디테일. 원칙은 `TESTING.md`, Go 통합 테스트의 DB 격리는 `BACKEND_TESTING.md` 참조.

## Migration 테스트

### DDL 마이그레이션 (`supabase/migrations/{ts}_v3_{name}.sql`)

- 순수 PostgreSQL.
- 로컬 Supabase (OrbStack, `127.0.0.1:54322`)에 `supabase db reset`으로 재적용 후 schema diff 검증.
- 적용 후 d2 ERD 갱신 (CLAUDE.md 마이그레이션 규칙).

```bash
# 1. 마이그 파일 작성 후 로컬 재적용 (모든 마이그 + seed.sql)
supabase db reset

# 2. 신규 테이블/컬럼 확인
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\d v3_new_table"

# 3. d2 ERD 갱신
cd /Users/taewonpark/.nvm/versions/node/v22.21.0/lib/node_modules/d2-erd-from-postgres && \
  node index.js "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
python3 scripts/generate-db-schema-d2.py
d2 _architecture/diagram-db-schema.d2 _architecture/diagram-db-schema.svg
```

### RLS 마이그레이션 (`{ts}_v3_{name}_rls.sql`)

- Supabase 헬퍼 사용 (`auth.uid()`, `auth.jwt()`).
- **로컬 Supabase에 자동 적용** (`supabase db reset`이 DDL + RLS 모두 돌림). 이전엔 로컬 plain Postgres라 RLS 적용 불가였으나 OrbStack 도입 후 해소.
- dev/prod 적용: `supabase db push --linked` 또는 prod는 세션 풀러 URL.
- 적용 후 정책 확인:
  ```bash
  psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
    -c "SELECT * FROM pg_policies WHERE tablename = 'v3_xxx'"
  ```

## RLS 정책 검증

`TESTING.md` 결정-3: **단위 RLS 테스트 도구(pgTAP 등) 도입하지 않는다.** E2E 경유 검증으로 충분하다고 판단.

### 검증 시나리오 체크리스트

각 v3 테이블의 RLS 정책마다 E2E 시나리오를 1개 이상 매핑한다.

```
v3_guestbook_messages:
  - test-guest 로그인 → 본인 메시지 INSERT 가능, 타인 메시지 UPDATE 불가
  - test-host 로그인 → 모든 메시지 SELECT 가능
  - 비로그인 → SELECT 정책에 따라 가능/불가 (public read 여부)

v3_cash_gifts:
  - test-guest → 본인이 보낸 축의만 SELECT 가능
  - test-host → 자기 웨딩의 모든 축의 SELECT 가능
```

체크리스트는 `_audit/rls-coverage.md`에 둔다(없으면 신설). 정책-시나리오 매핑이 명시되어야 RLS 변경 시 어떤 E2E를 갱신할지 추적 가능.

### 정책 변경 시 절차

1. `{ts}_v3_{name}_rls.sql` 마이그레이션 작성.
2. 로컬 Supabase 재적용 (`supabase db reset`)으로 RLS 정책 확인.
3. 해당 정책을 검증하는 E2E spec 추가 또는 갱신 (로컬 Supabase에서도 검증 가능 → 1차 검증 게이트).
4. dev Supabase에 적용 (`supabase db push --linked`).
5. `_audit/rls-coverage.md`에 매핑 반영.

## 시드 멱등성

`supabase/seed.sql`은 반복 적용 가능해야 한다.

- 모든 INSERT에 `ON CONFLICT DO NOTHING` 또는 `ON CONFLICT (id) DO UPDATE`.
- 외래키 의존 순서대로 작성 (FK 깨지면 멱등성도 깨짐).
- 검증: 같은 환경에 두 번 적용 → 에러 0건, row count 변화 0.

```bash
# 로컬은 supabase db reset이 자동으로 seed.sql 적용. 멱등성 검증:
supabase db reset  # 1차 (db drop + 전체 재적용)
supabase db reset  # 2차 — 에러 없어야 함

# row count 변화 확인
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -c "SELECT count(*) FROM auth.users WHERE email LIKE 'test-%@example.com'"
```

## 테스트 격리

| 레이어 | 격리 방식 |
|------|----------|
| Go 통합 테스트 | 각 테스트 전 관련 테이블 `TRUNCATE ... CASCADE` (`BACKEND_TESTING.md`) |
| E2E | 트랜잭션 롤백 어려움 → 시나리오 끝 명시적 cleanup 또는 멱등 데이터 사용 |

E2E에서 누적 데이터가 문제되면 시드 유저의 데이터를 시나리오 시작 시 정리하는 헬퍼를 둔다:

```ts
// e2e/db-helpers.ts (필요 시 신설)
export async function resetGuestData(userId: string) {
  // service_role 클라이언트로 user_id 기준 cleanup
}
```

## 환경 매핑

| 환경 | 용도 | RLS 적용 | 시드 적용 |
|------|------|---------|----------|
| 로컬 Supabase (`127.0.0.1:54322`) | DDL·RLS 검증, Go 통합 테스트, E2E 1차 게이트 | O (auth 스키마 포함) | `supabase db reset`이 자동 적용 |
| dev Supabase (`cvtcogtdbaimcckjkzqy`) | 통합 E2E·실제 데이터 검증 | O | seed.sql 수동 적용 (TESTING.md § 절차) |
| prod Supabase | 운영 | O | **금지** |

본 매핑은 memory의 "로컬 DB는 OrbStack supabase local"과 정합한다.

## 로컬 Supabase가 가능해진 것 (OrbStack 도입 전후)

이전엔 로컬이 plain psql `gorae_v2`라 다음이 불가능했다 → 모두 dev 의존:
- `auth.users` INSERT 시드
- `auth.uid()` 기반 RLS 검증
- 인증 토큰 발급 후 RLS 동작 확인

OrbStack + `supabase start` 도입 후 위 셋 모두 **로컬에서 직접 검증 가능**. 따라서:
- 통합 테스트가 시드 유저(`test-*@example.com`)에 의존해도 OK.
- RLS 정책 변경 후 로컬에서 먼저 검증 → dev에 push (1차 게이트 격상).
- E2E의 인증 흐름도 로컬 Supabase로 가능 (Mailpit `:54324`에서 이메일 확인까지).
