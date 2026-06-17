# 신규 유저 개인정보수집동의 — Onboarding Consent

> 작성일: 2026-05-26
> 대상 앱: Dibang Wedding (로그인 본체)
> 대상 사용자: 첫 로그인한 모든 유저 (Host·Guest 공통)
> 설계 출처: `../web-mobile-application` (v2) 의 `profiles` / `terms_documents` / `consent_records` 3-테이블 구조를 v3로 그대로 이식

## 한 줄 요약

Dibang Wedding에 처음 로그인한 모든 유저에게 인터셉트 화면 `/onboarding/consent`로 필수 3개(만 14세 이상 확인 + 서비스 이용약관 + 개인정보 수집·이용) + 선택 1개(마케팅 수신) 동의를 받는다. v2의 3-테이블 구조(`profiles` + `terms_documents` + `consent_records`)를 그대로 이식 — `profiles.terms_version`으로 게이트 빠르게 판정하고, `consent_records`에 IP·UA·method까지 append-only로 감사 로그 보존. 필수 미체크면 "동의하고 시작" 버튼이 비활성화되어 다음 단계로 진입할 수 없다. 약관 본문 페이지는 일단 작성하지 않음(후속 작업).

## 시나리오 테이블

| # | Actor | Screen | Action | Result | Data Flow | State Change | Edge Case | Permission |
|---|-------|--------|--------|--------|-----------|--------------|-----------|------------|
| **S-01** | Dibang Wedding 첫 로그인한 모든 유저 (Host·Guest 공통) | `/onboarding/consent` (인터셉트) | 필수 3개 체크 (+ 선택 1개) → "동의하고 시작" | 원래 가려던 URL로 복귀 | POST `/api/v3/consents` body: `[{terms_type, agreed}]` → 서버가 현행 `terms_documents` 조회해서 매핑 | (1) `consent_records`에 항목 수만큼 row INSERT (IP·UA·consent_method='checkbox' 포함, 마케팅 false도 row 기록) (2) `profiles.terms_version` = 현행 필수 약관 최신 버전으로 UPDATE | 필수 3개 모두 체크돼야 버튼 활성화. 미체크면 그 화면에 머무름 | 인증된 본인만 |
| **S-02** | 첫 로그인 유저 | 동의 화면 | 약관 라벨 옆 "전문 보기" — **이번 범위에서 제외** (본문 페이지 없음) | — | — | — | 본문 페이지 작성 후 별도로 활성화 | — |
| **S-03** | 기존 유저 (현행 버전 동의 완료) | 모든 페이지 | 일반 진입 | 동의 화면 우회 | 로그인 응답에 `consents_required: string[]` 포함. 빈 배열이면 통과, 비어있지 않으면 `/onboarding/consent`로 인터셉트 | 없음 | 약관 버전 올라가면 다음 로그인 때 S-01 재진입 (서버가 `profiles.terms_version < MAX(terms_documents.version WHERE is_required)` 비교) | 인증된 유저 |
| **S-04** | 마케팅 동의 변경 유저 | `/settings` 내 약관·동의 설정 영역 (구체적 마운트 지점 **?** — 구현 시 결정) | 마케팅 토글 ON/OFF | 토스트 "변경되었습니다" | POST `/api/v3/consents/marketing` body: `{agreed: boolean}` | `consent_records`에 새 row append (IP·UA·method 포함, 이력 보존). `profiles.terms_version`은 변하지 않음 | — | 본인만 |
| **S-05** | (감사/CS/법적 분쟁) | DB | 동의 이력 조회 | 누가·언제·어느 버전·어느 항목·어떤 환경(IP·UA)에서 동의했는지 추적 | `consent_records` SELECT (필요시 `terms_documents` JOIN) | — | append-only — UPDATE/DELETE 금지 | 관리자 |
| **S-06** | 관리자 (약관 신버전 발행) | 어드민 UI **(별도 후속 작업)** | 약관 텍스트·버전 등록 | `terms_documents`에 새 (terms_type, version) row INSERT | INSERT INTO `terms_documents` (v2의 admin 패턴 참고) | 새 버전 추가 시 기존 동의 유저는 다음 로그인 때 S-03 비교에 걸려 자동으로 S-01 인터셉트 | 관리자 |

## Validation / Navigation

| # | Validation | Navigation |
|---|------------|------------|
| **S-01** | 필수 3개(`age_verification`, `service`, `privacy`) 모두 체크돼야 버튼 활성화. `marketing`은 기본 unchecked, 미체크여도 진행 가능 | 진입 시 `?next=<original_url>` 쿼리로 원래 경로 보존. 동의 완료 후 `next`로 리다이렉트. 없으면 홈 |
| **S-03** | 서버 판정 로직: 유저의 `profiles.terms_version` < `MAX(terms_documents.version WHERE is_required=true)` 이면 인터셉트. 클라이언트는 응답의 `consents_required` 배열만 확인 | — |

## 확정된 설계 결정

### Screen / Flow
- **Screen 경로**: `/onboarding/consent` (인터셉트 패턴 — 로그인 후 모든 라우트 진입 전에 게이트)
- **Navigation**: `?next=<original_url>` 쿼리로 원래 가려던 URL 보존 후 동의 완료 시 복귀. 없으면 홈
- **거부 시 처리**: 별도 거부/로그아웃/나중에 분기 없음. 필수 미체크면 "동의하고 시작" 버튼이 비활성화될 뿐. 사용자는 그 화면에 머무르거나 알아서 떠남
- **약관 본문 노출**: 이번 범위 **제외**. 라벨 + 체크박스만으로 동의 화면 구성. "전문 보기" 버튼·아코디언 없음. 본문 페이지는 후속 작업으로 추가되면 그때 활성화

### DB — v2 설계 그대로 이식 (3-테이블)
v2 마이그레이션 출처: `../web-mobile-application/supabase/migrations/20260402200000_profiles_and_consent.sql`

| 테이블 | 역할 | 핵심 칼럼 |
|--------|------|-----------|
| `profiles` | 유저 메타 + 게이트 캐시 | `user_id` (PK, FK→auth.users), `display_name`, **`terms_version`** (정수, 마지막 동의 버전), `created_at`, `updated_at` |
| `terms_documents` | 약관 메타 (본문 아님) | `id` (PK), `terms_type`, `version`, `title`, `content_url`, `is_required`, `effective_from`, `created_at`, UNIQUE(terms_type, version) |
| `consent_records` | append-only 감사 로그 | `id` (uuid PK), `user_id` (FK→auth.users, **ON DELETE RESTRICT**), `terms_document_id` (FK), `agreed` (bool), `agreed_at`, `ip_address` (inet), `user_agent`, `consent_method` (default 'checkbox'), `created_at` |

#### RLS (v2 그대로)
- `profiles`: 본인 SELECT/INSERT/UPDATE/DELETE
- `terms_documents`: authenticated SELECT만
- `consent_records`: 본인 SELECT/INSERT만 (UPDATE/DELETE 없음 — append-only)

#### 인덱스
- `consent_records(user_id)`, `consent_records(terms_document_id)`

### API
- **`consent_status`(로그인 응답 형태)**: `consents_required: string[]` — 서버가 판단해서 미동의/재동의 필요한 `terms_type` 배열로 응답. 빈 배열이면 통과
- **POST `/api/v3/consents`** (S-01): body `[{terms_type, agreed}]`. 서버가 IP·UA를 헤더에서 추출해 `consent_records`에 INSERT, `profiles.terms_version` UPDATE
- **POST `/api/v3/consents/marketing`** (S-04): body `{agreed}`. `consent_records`에 새 row append

### 약관 항목 (4개, v2 시드 그대로)

| 코드 | 항목명 | 필수/선택 | 기본 체크 |
|------|--------|-----------|-----------|
| `age_verification` | 만 14세 이상 확인 | 필수 | unchecked |
| `service` | 서비스 이용약관 동의 | 필수 | unchecked |
| `privacy` | 개인정보 수집·이용 동의 | 필수 | unchecked |
| `marketing` | 마케팅 정보 수신 동의 | 선택 | unchecked |

### 약관 버전 관리
- 새 버전은 `terms_documents`에 새 row INSERT (`UNIQUE(terms_type, version)` 제약). 기존 row 수정 안 함
- 기존 동의 유저 게이트 판정: `profiles.terms_version < MAX(terms_documents.version WHERE is_required=true)` → 인터셉트
- 마케팅(선택) 단독 변경은 `profiles.terms_version`을 건드리지 않음

## 미결 항목 (구현 시 결정)

- v2 마이그레이션 파일(`20260402200000_profiles_and_consent.sql`)을 v3로 어떻게 이식할지 — 그대로 복사 + `_code_convention/DB_MIGRATIONS.md`의 DDL/RLS 분리 규칙에 맞춰 split
- `/settings` 페이지의 실제 라우트와 약관 설정 섹션 배치
- API 엔드포인트 형태 — v2의 REST 패턴이 있는지 확인 후 정렬 또는 v3 컨벤션(`_architecture/API_CONVENTIONS.md`) 따라 결정
- 약관 본문 페이지 (`/terms/service`, `/terms/privacy`, `/terms/marketing`, `/terms/age`) 작성 — **별도 후속 작업**
- 어드민에서 약관 신버전 발행 UI (S-06) — **별도 후속 작업**, v2 `apps/admin/src/pages/TermsPage.tsx` 패턴 참고

---

## 구현 보고 (2026-05-26)

### 적용 결정

| 미결 항목 | 결정 |
|---|---|
| consents_required 노출 위치 | `GET /me` 응답에 필드 추가 (라운드트립 절약) |
| terms_documents 시드 위치 | `supabase/migrations/20260526130000_seed_terms_documents.sql` 신규 (운영 데이터, prod까지 적용) |
| S-04 마케팅 토글 마운트 | 기존 `/settings` 페이지에 "약관·동의" 섹션 추가 |
| 약관 라벨 다국어 | 한국어 하드코딩 (i18n 미도입 유지) |
| v2 마이그 이식 | 이미 v3 마이그(`20260402200000_profiles_and_consent.sql`)로 이식 완료 상태였음 — 신규 작업 없음 |

### 구현된 파일

**BE (Go, apps/api)**
- `apps/api/db/queries/consents.sql` — sqlc 쿼리 7개
- `apps/api/db/queries/schema.sql` — `profiles`/`terms_documents`/`consent_records` 추가
- `apps/api/server/service.go` — `ConsentService` 인터페이스
- `apps/api/server/service_consents.go` — 구현
- `apps/api/server/handler_consents.go` — POST /consents, POST /consents/marketing
- `apps/api/server/handler_users.go` — GetMe 응답에 consents_required·marketing_agreed 채움
- `apps/api/server/server.go` — Server struct에 Consents 필드
- `apps/api/main.go` — DI 주입
- `apps/api/server/handler_consents_test.go` — TDD 5 케이스 통과

**OpenAPI 계약 (packages/contracts)**
- `api-contract.yaml` — `User` 스키마 확장 + `POST /consents` + `POST /consents/marketing` 신규
- codegen 자동 생성 — BE 모델·FE SDK·React Query 훅·zod

**FE (Dibang Wedding, apps/dibang-wedding)**
- `src/machines/onboardingConsent.machine.ts` — XState 머신 (editing/submitting/success)
- `src/components/OnboardingGate.tsx` — 라우트 인터셉트
- `src/pages/OnboardingConsentPage.tsx` — 4 체크박스 + "동의하고 시작"
- `src/pages/SettingsPage.tsx` — 마케팅 동의 토글 섹션 추가
- `src/App.tsx` — `/onboarding/consent` 라우트 + 보호된 라우트에 OnboardingGate 래핑

**DB (supabase)**
- `supabase/migrations/20260526130000_seed_terms_documents.sql` — 4 약관 v1 시드 (멱등)
- 로컬 + dev Supabase 적용 완료

### 잔여 작업 (이번 범위 밖)

- **S-02**: 약관 본문 페이지 (`/terms/service` 등). 현재 라벨에 본문 링크는 없음 (`content_url`은 placeholder)
- **S-06**: 어드민 약관 신버전 발행 UI. v2 `apps/admin/src/pages/TermsPage.tsx` 패턴 참고
- **IP·UA 캡처**: 현재 handler의 `requestIPUA`가 stub(`nil, nil`) 반환 → `consent_records.ip_address`/`user_agent`는 NULL 저장. http.Request에서 직접 추출하도록 strict-server 어댑터 우회 또는 미들웨어로 컨텍스트 주입 보강 필요
- **i18n**: 약관 라벨이 한국어 하드코딩. 다국어 진입 시 별도 작업
- **E2E 자동 스모크**: Playwright spec 미작성. 빌드·테스트 통과로 갈음. 시각 검증은 dev Supabase에 로그인 후 흐름 확인 권장

### 검증 게이트 통과 기록

- `go test ./apps/api/server/ -count=1` 전체 통과 (~2.6s)
- `go build ./apps/api/...` 통과
- `pnpm --filter dibang-wedding build` 통과
- `supabase db reset` (로컬) 4 약관 row 생성 확인
- `supabase db push --linked` (dev) 시드 마이그 적용 확인 (4 row)
- Playwright 미인증 진입 시 `/login?redirect=...` 정상 리다이렉트 확인

### prod 적용

이번 작업에선 dev까지만. prod 적용은 사용자 명시 승인 후 `supabase db push --db-url "postgresql://...:5432/postgres"` (세션 풀러)로 별도 단계.
