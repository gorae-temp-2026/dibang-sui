# 코드 컨벤션 INDEX

이 폴더는 디방-Sui 프로젝트의 코드 컨벤션 모음이다. (대부분 digital-guestbook-v3에서 가져온 검증된
컨벤션 + 온체인 작업을 위한 신규 컨벤션.) 작성·리뷰 전 해당 영역 문서를 읽는다.

## 백엔드 (Go API — `apps/api`)
- `BACKEND_STRUCTURE.md` — handler → service(interface) → sqlc → DB. 파일 네이밍(`*.gen.go` 직접 수정 금지, `service_{리소스}.go`, `handler_{리소스}.go`). oapi-codegen.
- `BACKEND_TESTING.md` — Go 테스트(테이블 주도, testify, 80% 목표).

## 프론트엔드 (React — `apps/guest-web`, `apps/dibang-wedding`)
- `FRONTEND_STRUCTURE.md` — 폴더 구조·네이밍.
- `FRONTEND_TESTING.md` — vitest.
- `STATE_MANAGEMENT.md` — XState 등 상태 관리.
- `data-fetching.md` — React Query + contracts 런타임.

## 데이터 / 인프라
- `DB_MIGRATIONS.md` — Supabase 마이그레이션 규칙.
- `DB_TESTING.md` — DB 테스트.
- `STORAGE.md` — 파일 스토리지(presigned, public/private 버킷 분리).
- `ENV_MANAGEMENT.md` — env 스키마 검증(부팅 시점 SSOT, `.env.<mode>` 심링크 전환).

## 테스트 (단일 진실원천)
- `TESTING.md` — 테스트 운영의 SSOT. 영역별 디테일은 BACKEND/FRONTEND/DB_TESTING.

## 온체인 (Sui — 이 프로젝트 신규)
- **`SUI_MOVE.md`** — Move 컨트랙트 컨벤션. **SBT 원칙(활동 기록 = key-only, transfer 불가)** 포함.
- **`SUI_SDK.md`** — @mysten/sui v2 SDK·zkLogin·sponsor 컨벤션. 실행 성공 검증·이벤트 스케일 한계·sponsor 보안.

## 기타
- `ISSUE_GUIDELINES.md` — 이슈 작성 가이드.

> 온체인 작업의 큰 방향·결정은 `_onboarding/06-SUI-ONCHAIN-DIRECTION.md`, "왜"는 `_onboarding/VISION-AND-INTENT.md`.
