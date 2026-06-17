# 테스트 컨벤션

본 문서는 테스트 *작성·운영*의 단일 진실원천(SSOT)이다. 영역별 디테일은 다음으로 분리:

- 백엔드(Go): `BACKEND_TESTING.md`
- 프론트(Vitest + RTL + MSW): `FRONTEND_TESTING.md`
- DB(migration · RLS · 시드): `DB_TESTING.md`

---

## 원칙

1. **인증은 우회하지 않는다, 자동화한다.** 테스트 모드 우회 플래그를 만들지 말 것 — RLS 버그를 못 잡는다.
2. **레이어별 격리.** 단위는 mock, 통합은 real DB, E2E는 실제 사용자 흐름.
3. **결정성 > 속도.** flaky 테스트를 retry로 가리지 말고 원인 잡기.
4. **사용자 환경을 깨지 않는다.** dev server 죽이지 말 것, 사용자 기본 브라우저 프로파일 점유 금지.

## 레이어별 매트릭스

| 레이어 | 도구 | 인증 처리 | DB | TDD 강제 |
|------|------|---------|-----|---------|
| Go 단위 (service) | go test + testify | `WithUserContext` | mock | 강제 (CLAUDE.md §2-2-1) |
| Go 통합 (handler) | go test + httptest + testify | `NewFakeGoTrueServer` | 로컬 Supabase (`127.0.0.1:54322`) + truncate | 강제 |
| 프론트 hook | Vitest + RTL `renderHook` | `QueryClientProvider` wrap | MSW 2.7 stub | 비즈니스 hook만 |
| xState machine | Vitest + `createActor` (v5) | n/a | n/a | machine 작성 시 강제 |
| 프론트 component | Vitest + RTL `render` | n/a | MSW(필요 시) | 권장 (강제 아님) |
| 페이지 흐름 | Vitest + RTL + MSW + Router | mock 세션 | MSW stub | 강제 |
| E2E | Playwright 1.52 | `storageState` | dev Supabase | 주요 사용자 흐름 강제 |

도구 출처: `_architecture/tech-stack-map.html` 확정 스택.

## 시드 유저

| email | role | 비고 |
|-------|------|------|
| test-guest@example.com | guest | 비로그인·게스트 진입 경로 검증 |
| test-host@example.com | host | 호스트 본체 (Dibang Wedding) |
| test-cohost@example.com | cohost | 공동호스트 권한 경계 |

- UUID·비밀번호는 `supabase/seed.sql`에 고정. dev only.
- 환경변수: `apps/guest-web/.env.test`에 `E2E_TEST_{ROLE}_EMAIL` / `E2E_TEST_{ROLE}_PASSWORD`로 동기화.
- 변경 절차: `seed.sql` + `.env.test` + 본 문서 § 시드 유저 표 세 곳 모두 갱신.

## Go 백엔드 패턴 (요약)

상세 → `BACKEND_TESTING.md`.

- **빠른 사이클(handler 단위)**: mock service로 HTTP 플러밍만 검증(인증 확인·에러 매핑·응답 변환).
- **느린 사이클(service 통합)**: real DB(로컬 Supabase `127.0.0.1:54322`) + 관련 테이블 truncate 격리.
- **인증 헬퍼**: `apps/api/server/testhelpers_auth.go` — `NewFakeGoTrueServer`, `WithUserContext`, `NoopEnsureUser`.
- **실행**: `go test ./... -race -count=1` 기본.

## 프론트 단위 패턴 (요약)

상세 → `FRONTEND_TESTING.md`.

- **도구**: Vitest, `@testing-library/react`, MSW 2.7.
- **파일 위치**: co-located. `Button.tsx` 옆 `Button.test.tsx`.
- **TDD 강제 범위**: 비즈니스 hook + xState machine + 페이지 흐름. 단순 프레젠테이션 컴포넌트는 권장.
- **네트워크**: 항상 MSW로 stub. `fetch` 직접 모킹 금지.
- **xState v5**: `createActor(machine)` → `actor.start()` → `actor.send(...)` → `actor.getSnapshot().value` 검증.

## E2E 패턴

도구: Playwright 1.52.

### 인증 = storageState

1. `e2e/auth.setup.ts`가 setup project에서 1회 실행.
2. Supabase anon 클라이언트로 시드 유저(test-guest/host/cohost) `signInWithPassword` → 받은 세션을 `e2e/.auth/{role}.json`에 storageState로 저장.
3. 각 spec은 `loggedInAsGuest` / `loggedInAsHost` / `loggedInAsCohost` fixture (`e2e/fixtures.ts`)로 시작. **UI 로그인 클릭 금지.**

### Selector 우선순위

1. `getByRole` (접근성 트리 기반, i18n에 강함)
2. `getByLabel`
3. `data-testid` (안정적인 hook)
4. 텍스트 매칭은 last resort

### Web-first assertion

`expect(locator).toBeVisible()` 같은 자동 재시도 assertion 사용. `waitForTimeout` 금지.

## 금지 항목

- 테스트마다 UI 로그인 페이지 클릭 — storageState로 우회.
- 테스트 모드 우회 플래그 — RLS·인증 버그를 못 잡는다.
- `fetch()` 직접 모킹 — MSW만.
- Implementation detail 테스트 — 내부 state·private 함수 직접 검증 금지. 사용자 관점 행동만.
- `waitForTimeout` 등 고정 대기 — web-first assertion으로 대체.
- Snapshot 테스트 — 의도가 흐려져 검증 가치 낮음.
- 사용자 기본 Chrome 프로파일 점유 — Playwright 내장 chromium + 별도 user-data-dir만 사용.
- flaky 테스트를 retry로 가리기 — 원인 잡기.

## 시드 적용 절차

로컬 Supabase는 `supabase db reset` 시 `seed.sql`이 자동 적용된다. 원격 dev Supabase에는 자동 적용 안 되므로 다음 중 하나로 수동 적용:

1. **MCP**: `mcp__supabase-dev__execute_sql`로 `seed.sql` 내용 실행 (`apply_migration`은 마이그 트래킹 어긋남 사고가 있어 금지 — `DB_MIGRATIONS.md` §7).
2. **직접 psql**: `psql "$DEV_SUPABASE_URL" -f supabase/seed.sql`.

**prod에는 절대 적용 금지.** `seed.sql` 맨 위 `-- DEV ONLY` 주석으로 보호 + 적용 전 connection string 확인.

---

# 테스트 실행 방법론 (운영)

테스트를 *돌릴 때* 어떻게 사용자 환경을 깨지 않고 결정적인 결과를 얻을지에 대한 규칙. 작성법(위)과 별개로 매 세션 에이전트가 따라야 한다.

## 1. MCP vs CLI 선택

| 도구 | 용도 |
|------|------|
| **Playwright MCP** (`mcp__playwright__*`) | 대화 중 즉석 화면 확인, 1회성 스크린샷, UI 작업 완료 보고 시 증거 캡처 (CLAUDE.md §2-3 강제) |
| **Playwright CLI** (`pnpm exec playwright test`) | 회귀 슈트, 다수 spec 일괄, storageState 의존, 검증 게이트, CI |

**섞어 쓰지 말 것.** MCP = 대화형·일회성, CLI = 배치·회귀.

## 2. Headless vs Headed

- **기본 headless.** 검증 게이트·백그라운드 실행은 무조건 headless.
- `--headed` / `--ui`는 사용자 화면 점유 → **사용자 동의 받고만** 사용.

## 3. 사용자 브라우저 격리

- 사용자의 기본 Chrome 프로파일에 절대 붙지 말 것.
- Playwright는 내장 chromium을 별도 user-data-dir로 띄운다(기본 동작이지만 명시 확인 권장).
- MCP 브라우저는 단일 컨텍스트를 공유한다 → 작업 끝나면 `browser_close`로 명시 정리.

## 4. Dev server 기동

- CLAUDE.md §5: `Bash` 도구의 `run_in_background: true`로 띄우기. 쉘 `&` 금지(TUI에 안 보임).
- **또는** `playwright.config.ts`의 `webServer` 옵션에 위임(테스트 시작 시 자동 기동).
- **둘 중 하나로 통일.** 둘 다 하면 포트 충돌 + 좀비 프로세스.

## 5. 포트 충돌 처리

- `lsof -i :5173` 등으로 확인. **살아있으면 재사용. 죽이지 말 것.**
- 사용자가 띄워둔 서버일 가능성 — 죽이면 사용자 작업 끊김.
- `playwright.config.ts`에 `webServer.reuseExistingServer: !process.env.CI` 명시.

## 6. 아티팩트 저장 위치

- **임시 산출물(스크린샷·trace·다운로드)**: `/tmp` 또는 `.playwright-mcp/` 하위. 레포 루트 금지 (memory의 '루트 와일드카드 rm' 사고 방지).
- Playwright CLI 산출물(`test-results/`, `playwright-report/`)은 `.gitignore` 등록.
- storageState 파일(`e2e/.auth/*.json`)은 액세스 토큰 포함 → 절대 커밋 금지.

## 7. 실패 디버깅 절차

1. **`pnpm exec playwright show-trace test-results/.../trace.zip`** — 사용자 화면 안 깬다. 1순위.
2. MCP로 같은 시나리오 수동 재현 → 어디서 갈리는지 추적.
3. `--ui` 모드 — 사용자 동의 받고만.

## 8. 환경 가정 명시

- dev server가 어떤 DB에 붙는지 확인(`apps/api/.env` → 보통 dev Supabase).
- 시드 유저가 그 DB에 존재하는지 확인 (`SELECT email FROM auth.users WHERE email LIKE 'test-%@example.com'`).
- 로컬 psql 모드에선 E2E 못 돌림 → spec에서 명시적 에러로 안내.

## 9. 종료 절차

- 백그라운드로 띄운 dev server는 작업 끝나고 **사용자에게 알리고 멈출지 물어볼 것** (사용자가 같이 쓰는 중일 수 있음).
- MCP 브라우저는 `browser_close`로 명시 종료.
- 임시 디렉토리(`.playwright-mcp/`)는 작업 종료 시 정리 권장(루트 와일드카드 `rm` 금지, 디렉토리 단위로만).

---

## 변경 시 동기화 체크리스트

- 시드 유저 추가·변경 → `supabase/seed.sql` + `.env.test` + § 시드 유저 표
- 새 인증 패턴 도입 → `BACKEND_TESTING.md` 또는 `FRONTEND_TESTING.md` + § 해당 요약
- 새 레이어 추가(예: contract test) → § 매트릭스에 행 추가
- 도구 버전 변경 → `_architecture/tech-stack-map.html` 우선 갱신 후 본 문서 반영
