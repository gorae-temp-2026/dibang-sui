# 데이터베이스 마이그레이션 운영 규칙

이 문서는 DB 마이그레이션 파일의 작성·적용·동기화 절차의 단일 진실원천이다. 환경별 도구·폴더 구조·운영 절차·첫 도입 백필을 모두 다룬다.

## 1. 환경별 도구 매핑

| 환경 | DB | 적용 도구 | 명령 |
|---|---|---|---|
| 로컬 (OrbStack Supabase, `127.0.0.1:54322`) | 로컬 Supabase 풀스택 | Supabase CLI | `supabase db reset` |
| dev Supabase (`cvtcogtdbaimcckjkzqy`) | 원격 PostgreSQL | Supabase CLI | `supabase db push --linked` |
| prod Supabase (`wjwiiuhixdtwushbqztd`) | 원격 PostgreSQL | Supabase CLI | `supabase db push --db-url "...:5432..."` (세션 풀러) |

모든 환경에서 **Supabase CLI 단일 도구**로 적용한다. `schema_migrations` 테이블에 적용 이력을 기록하고, 그 이력에 없는 파일만 골라 순서대로 적용하는 메커니즘은 환경별로 동일하다. 파일명 prefix(`YYYYMMDDHHMMSS`)가 `version` 값으로 그대로 박혀 파일명과 이력이 항상 일치한다.

로컬엔 `supabase db reset`을 쓰는 이유: 로컬은 자유롭게 갈아엎을 수 있으니 매번 초기화 + 전체 재적용이 안전. dev/prod는 누적 적용(`db push`)만 가능.

## 2. 폴더 구조

```
supabase/
├── migrations/         단일 원천. DDL + RLS + seed.sql 모두 여기에
├── config.toml         Supabase 로컬 스택 설정 (포트·확장·이메일 등)
└── seed.sql            로컬·dev 시드 데이터 (prod 적용 금지)
```

원천은 `supabase/migrations/` 단 한 곳. (2026-05-26 이전엔 `migrations-ddl/`라는 dbmate용 심볼릭 링크 폴더가 있었으나 OrbStack 도입으로 dbmate 폐기되며 함께 제거됨.)

## 3. 파일명 규칙

| 종류 | 패턴 | 적용 대상 |
|---|---|---|
| DDL (순수 PostgreSQL) | `{timestamp}_{name}.sql` | 모든 환경 (로컬 Supabase 포함) |
| RLS (Supabase 헬퍼 사용) | `{timestamp}_{name}_rls.sql` | 모든 환경 (로컬 Supabase도 `authenticated` 롤·`auth.uid()` 모두 정상 동작) |

**`_rls.sql` 접미사는 의도 분리용 표기**다. 환경별 호환성 차단 의미는 폐기됐다 (이전 dbmate 시절엔 로컬 plain Postgres에 RLS 못 돌리던 차단 기준이었지만, 로컬도 Supabase가 된 이후엔 무관). 그래도 유지하는 이유:
- 파일 이름만 봐도 "이건 RLS 작업" 인지 가능
- 코드 리뷰 시 RLS만 따로 보기 편함
- 같은 timestamp 충돌 회피용 1초 차이 룰(§4-3)이 여전히 의미 있음

## 4. 새 마이그레이션 추가 절차

### 4-1. DDL 마이그레이션
1. `supabase/migrations/{timestamp}_{name}.sql` 작성
2. 로컬 검증: `supabase db reset` (전체 재적용 + seed 적용)
3. dev 적용: `supabase db push --linked`
4. prod 적용: §8 절차에 따라 세션 풀러 URL 사용

### 4-2. RLS 마이그레이션
1. `supabase/migrations/{timestamp}_{name}_rls.sql` 작성
2. 로컬 검증: `supabase db reset` (로컬 Supabase에도 자동 적용됨)
3. dev 적용: `supabase db push --linked`
4. prod 적용: §8 절차

### 4-3. DDL + RLS가 묶인 변경
같은 작업이라도 파일은 두 개로 분리한다. DDL 먼저, RLS 나중. 같은 timestamp 부여하면 정렬이 보장되지 않으므로 `_rls.sql` 쪽 timestamp를 DDL보다 1초 이상 뒤로 둔다 (예: `20260520120000`, `20260520120100`).

## 5. 첫 도입·신규 환경 부팅 (참고)

신규 개발자 합류, 새 클론, 또는 로컬 DB 초기화 후 절차:

```bash
# 1. OrbStack 설치 (Docker Desktop 대체 — Mac에서 가볍고 빠름)
brew install --cask orbstack
open -a OrbStack

# 2. Supabase 로컬 스택 부팅 (첫 실행은 이미지 pull ~5분)
supabase start
# 출력으로 API URL, DB URL, anon/service_role 키 확인

# 3. .env.local 활성화
scripts/use-env.sh local

# 4. 로컬 DB에 모든 마이그·시드 적용
supabase db reset

# 5. 검증
supabase migration list --local   # Local/Remote 동일성 확인
```

이게 모든 환경 부팅의 표준 절차다. 이전 dbmate 백필 단계는 폐기됐다.

## 6. dev/local timestamp 일관성

`supabase db push`/`supabase db reset` 모두 파일명 prefix를 그대로 `version`으로 INSERT 한다. 따라서 정상 운영 상태에서는 로컬·dev·prod의 `schema_migrations.version` 값이 레포 파일명 prefix와 모두 일치해야 한다. 어긋남이 생기면 적용 도구가 다른 경로(예: MCP `apply_migration`, Dashboard SQL Editor, 직접 SQL INSERT)로 이력이 갈라진 것이므로, 환경별 도구 일원화가 무너지지 않았는지 점검한다 (§10 복구 절차 참고).

## 7. 절대 하지 말 것

- `psql -f` 로 마이그레이션 파일을 직접 적용 — `schema_migrations` 이력이 안 남아 다음 `db push`/`db reset`이 중복 시도. 부득이하면 같은 트랜잭션 안에서 `INSERT INTO supabase_migrations.schema_migrations` 까지 같이 실행
- `mcp__supabase-*__apply_migration` 호출 — `version`이 호출 시점 timestamp로 자체 부여되어 파일명 prefix와 어긋남. 이 프로젝트의 timestamp 어긋남 사고(2026-05-26)의 원인
- `mcp__supabase-*__execute_sql`로 임시 DDL 적용 — 마이그 파일 안 거치면 SoT 깨짐. 메타 테이블(`supabase_migrations.schema_migrations`) 복구처럼 **객체가 아닌 메타 row만 만지는 경우에 한해** 허용
- Supabase Dashboard SQL Editor에서 DDL 직접 실행 — 마이그 파일 없이 schema_migrations에 `created_by=<이메일>`로 row가 박혀 drift 발생. prod의 35개 orphan 사고(2026-05-26)의 원인
- `supabase/migrations/`에 폴더 하위 구조 — Supabase CLI는 flat 구조만 인식
- `supabase db push --include-all`을 무작정 사용 — 마이그 단위 확인 없이 일괄 적용. prod는 반드시 사용자가 직접 터미널에서 실행 (Claude 분류기 정책)
- **`supabase start` 안 띄운 채 로컬 작업 진행** — `apps/api`가 `.env.local` 활성화 상태로 부팅하면 DB 연결 실패. 또는 dev로 우발 fallback으로 작업이 dev에 영향. 작업 전 `supabase status`로 부팅 상태 확인

## 8. PgBouncer 풀러 모드와 적용 도구 선택

Supabase 원격 DB는 두 가지 풀러 경로를 노출:

| 모드 | 포트 | 동작 | 적합한 워크로드 |
|---|---|---|---|
| **Transaction** | 6543 | 트랜잭션 종료 시 backend 연결을 풀에 반납 → 다음 트랜잭션은 다른 backend 가능 | 짧은 쿼리 많음 (REST API, GraphQL) |
| **Session** | 5432 | 클라이언트 세션 종료까지 한 backend 고정 | 상태 유지 필요 (DDL, prepared statement, advisory lock) |

`supabase db push`/`pg_dump` 등 CLI는 **prepared statement를 캐싱**하면서 여러 SQL을 순차 실행한다. 트랜잭션 풀러(6543)로 붙으면 두 번째 SQL이 다른 backend에 도달할 수 있고, 거기서 캐시된 statement는 없으므로 다음과 같은 에러가 발생:

```
ERROR: prepared statement "lrupsc_1_0" already exists (SQLSTATE 42P05)
```

따라서:

- **로컬 (`.env.local`)**: 풀러 없음. `127.0.0.1:54322` 직노출. 앱·마이그 동일 URL.
- **앱 dev/prod (API 서버)**: 트랜잭션 풀러(6543) 사용. `.env.{dev,prod}`의 `DATABASE_URL`이 이미 6543.
- **마이그레이션 dev/prod (`supabase db push`)**: 세션 풀러(**5432**) 사용. prod 적용 시 명시적으로 포트 5432 URL 지정:

```bash
supabase db push --db-url "postgresql://postgres.<project>:<password>@<region>.pooler.supabase.com:5432/postgres" --include-all
```

dev는 `--linked`로 호출하면 CLI가 알아서 적절한 connection으로 붙으므로 별도 설정 불필요.

## 9. Drift — 정의·탐지·청산

### 9-1. 정의와 형태

**drift** = 마이그레이션 파일이 묘사하는 상태와 실제 DB 상태의 불일치. 형태:

- **형태 A** (파일이 앞서감): 파일엔 변경이 있는데 DB엔 미적용 — 적용 누락 또는 사후 수동 되돌림
- **형태 B** (DB가 앞서감): 파일엔 없는데 DB엔 객체 있음 — Dashboard/psql 직접 수정, `mcp apply_migration` 우회

### 9-2. 탐지

| 명령 | 용도 |
|---|---|
| `supabase migration list --linked` | dev/prod 마이그 적용 이력 vs 로컬 파일 목록 비교 |
| `supabase db dump --linked --schema public -f /tmp/dev.sql` + `diff` | 환경별 실제 스키마 dump 비교 (가장 정확) |
| 양쪽 `supabase_migrations.schema_migrations` 직접 비교 | 메타 row 정합성 확인 |

스키마 dump를 비교할 땐 컬럼 선언 **순서 차이**(같은 컬럼 세트, 다른 ALTER 누적 이력)는 cosmetic이라 무시. 실질 객체(함수·정책·CHECK·인덱스·컬럼 존재 여부)만 본다.

### 9-3. 청산 (Cleanup)

drift를 발견하면 **새 마이그 파일로** 청산. 1회용 SQL이나 Dashboard 클릭으로 처리하지 않는다. 청산 마이그가 git에 남아야 다음 사람이 "왜 이 객체가 사라졌나" 추적 가능.

청산 마이그 작성 원칙:

1. **항상 멱등** — `IF EXISTS` / `IF NOT EXISTS` 필수. 같은 파일을 환경마다 다른 상태에서 돌려도 안전.

   ```sql
   DROP FUNCTION IF EXISTS public.old_func(uuid);
   DROP COLUMN IF EXISTS some_column;
   DROP POLICY IF EXISTS old_policy ON public.some_table;

   -- ADD CONSTRAINT는 IF NOT EXISTS 직접 지원 안 함 → DO 블록으로 우회
   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'my_check') THEN
       ALTER TABLE x ADD CONSTRAINT my_check CHECK (...);
     END IF;
   END$$;
   ```

2. **분류별 파일 분리** — legacy 정리 / 누락 캡처 / 환경별 청소를 한 파일에 섞지 않음. 예 (2026-05-26 작업 기준):

   - `20260526120000_drop_legacy_v2_artifacts.sql` (전 환경 legacy 청소)
   - `20260526120100_capture_party_constraints.sql` (dev에만 있던 제약을 prod·local에 신규 ADD)
   - `20260526120200_drop_dev_drift_photo_url.sql` (DDL: drop column)
   - `20260526120300_drop_dev_drift_admin_audit_rls.sql` (RLS: drop policies)

3. **로컬 검증 게이트** — `supabase db reset` 후 `db dump --local`과 dev dump의 diff = 0(또는 cosmetic만) 확인 후에야 dev·prod 적용

4. **참고 사례**: `_audit/2026-05-26-supabase-dev-drift-analysis/` (drift 10건 분석·청산 실행 보고)

## 10. schema_migrations 메타 불일치 복구

실제 DB 상태는 정상인데 `supabase_migrations.schema_migrations` 테이블만 어긋난 경우. 증상: `supabase db push`가 "remote migration not found in local" 에러로 거부.

원인 (이번 사고 기준):
- prod에 Dashboard SQL Editor로 적용된 마이그가 35개 — `version`이 dashboard 자동 timestamp(`created_by=<email>`)로 박혀 로컬 파일명 prefix와 어긋남
- 동시에 로컬 파일 35개는 prod에 정상 등록 안 됨

복구 절차:

1. **백업 먼저** — `pg_dump --data-only --table=supabase_migrations.schema_migrations` 또는 psql `\COPY ... TO ... CSV HEADER`
2. **양쪽 차집합 계산** — orphan(remote-only) / missing(local-only) 목록 분리
3. **orphan 제거** — `supabase migration repair --db-url <prod> --status reverted <version>` (단발 처리. 루프는 pgbouncer prepared statement 충돌로 실패. 다건이면 raw SQL DELETE 권장)
4. **missing 등록** — `migration repair --status applied <version>` 또는 raw SQL INSERT (`version`, `name` 컬럼)
5. **검증** — dev와 prod의 `schema_migrations.version` 집합이 동일한지 확인 후에야 `db push` 시도

raw SQL 사용은 메타 테이블에 한정. public 스키마 객체에 직접 손대는 건 §7 금지.

## 11. 백업·복원

prod 메타·스키마·데이터 작업 전 백업 필수.

```bash
PROD_DB="postgresql://postgres.<project>:<pass>@<region>.pooler.supabase.com:5432/postgres"
TS=$(date +%Y%m%d_%H%M%S)

# Supabase CLI는 자체 호환 도구 번들 사용 (호스트 pg_dump 버전 미스매치 회피)
supabase db dump --db-url "$PROD_DB" -f /tmp/prod-schema-${TS}.sql
supabase db dump --db-url "$PROD_DB" --data-only -f /tmp/prod-data-${TS}.sql
supabase db dump --db-url "$PROD_DB" --role-only -f /tmp/prod-roles-${TS}.sql

# 메타 별도 (CSV로 전체 컬럼 보존)
psql "$PROD_DB" -c "\COPY (SELECT * FROM supabase_migrations.schema_migrations ORDER BY version) TO '/tmp/prod-meta-${TS}.csv' WITH CSV HEADER"

# 묶음
tar czf /tmp/prod-backup-${TS}.tar.gz -C /tmp prod-schema-${TS}.sql prod-data-${TS}.sql prod-roles-${TS}.sql prod-meta-${TS}.csv
```

추가로 Supabase Dashboard의 PITR(Point-in-Time Recovery) — 플랜에 따라 7~28일치 보관. 작업 직후 사고 발견 시 GUI에서 시점 복원.
