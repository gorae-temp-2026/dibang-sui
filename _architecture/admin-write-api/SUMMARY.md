# Admin Write API (수정·삭제) — 설계·구현 요약

작성: 2026-05-30. admin page에서 요소(행)를 수정·삭제하는 풀스택 기능. 모든 삭제는 "삭제 모드 ON"을 거쳐야 한다.

## 핵심 결정
- **쓰기 경로 = Go admin API** (Supabase 직접쓰기 아님). 이유: 서버 1곳 권한검증 + 입력검증 + 감사로그 + 연쇄삭제 통제. 읽기는 기존대로 Supabase 직접.
- **권한 = 이메일 allowlist 미들웨어**: `AdminGuard(["/admin/"], cfg.AdminEmails())`(`main.go`)가 `/admin/*` 전체를 메서드 무관 보호. → 신규 write 엔드포인트는 `/admin/...` 경로에 두기만 하면 자동 보호(핸들러 IsAdmin 불필요).
- **삭제 정책**(사용자 확정):
  - `weddings` = **soft delete** (`status='deleted'`, 연쇄 물리삭제 없음)
  - `memories` = soft delete (`deleted_at`, 기존 컬럼)
  - `wedding_lounges`·`users` = **삭제 미제공**(수정만)
  - 그 외 = hard delete
- **수정 = 핵심 필드만**(부분 수정 — 전달된 필드만 변경, 미전달은 유지).
- **응답 = 204 통일**(수정·삭제 모두). FE가 Supabase 직접 재조회로 갱신하므로 본문 불필요 → per-table 응답스키마·Row매핑 코드 0.
- **감사 로그 = 기존 `admin_audit_logs` 재사용**(`20260404100000`, RLS service_role 전용). 새 마이그레이션 없이 sqlc INSERT만 추가. 모든 수정·삭제가 1행 기록(action·resource_type·resource_id·changes·actor_email).

## 엔드포인트 (tags: Admin, 모두 BearerAuth + AdminGuard)
PATCH = 수정, DELETE = 삭제.

| 리소스 | PATCH | DELETE | 비고 |
|---|---|---|---|
| cash-gifts | ✅ | ✅ hard | 레퍼런스 |
| rsvps | ✅ | ✅ hard | |
| host-invites | ✅(status) | ✅ hard | |
| guestbook-messages | ✅ | ✅ hard | |
| guestbook-entries | ✅ | ✅ hard(메시지 cascade) | |
| mobile-invitations | ✅ | ✅ hard(사진 cascade) | slug unique→409 |
| memories | ✅ | ✅ **soft** | |
| weddings | ✅ | ✅ **soft**(status='deleted') | |
| wedding-lounges | ✅(name) | — | 삭제 미제공 |
| users | ✅ | — | 삭제 미제공, email unique→409 |
| memory-book-photos | — | ✅ hard | 삭제 전용 |
| shared-photos | — | ✅ hard(메모리북 cascade) | 삭제 전용 |
| lounge-check-ins | — | ✅ hard | 삭제 전용 |

## 코드 위치
- 계약: `packages/contracts/api-contract.yaml`(`/admin/{resource}/{id}` PATCH/DELETE, `UpdateAdmin*Request` 스키마, `AdminResourceId` 파라미터) → codegen.
- sqlc: `apps/api/db/queries/admin_mutations.sql`(21개 쿼리 + `InsertAdminAuditLog`), audit 테이블은 `schema.sql`에 스냅샷 추가.
- BE: `server/service_admin_mutations.go`(스캐폴드·`mapPgError`·`finishMutation`), `service_admin_mutations_methods.go`(서비스 메서드+인터페이스), `service_admin_audit.go`(AuditLogger), `handler_admin_mutations.go`(핸들러), `main.go`(주입).
- FE: `apps/admin/src/lib/adminApi.ts`(`adminApiSend`), `hooks/useAdminMutation.ts`(`useAdminDelete`/`useAdminUpdate`), `hooks/useDeleteMode.ts`, `components/admin/{DeleteModeToggle,RowDeleteButton}.tsx`, `pages/WeddingDetailPage.tsx`(cash_gifts 탭 배선).

## 검증
- `go test ./... -race -count=1` green(핸들러 mock + 서비스 실DB + 권한가드 + 감사로그).
- `pnpm --filter admin build` green + `pnpm --filter admin lint`(env rule 포함) 0 에러.
- `pnpm --filter @gorae/contracts generate` 무오류(스펙↔생성물 동기).

## FE 배선 현황
- **삭제(삭제모드 게이트) 완료**: WeddingDetail 7개 탭 — 축의금·방명록·Live메시지·공유사진·메모리(soft)·메모리북·호스트초대. + 헤더 웨딩 soft-delete. cascade 위험 탭은 확인창에 경고.
- **수정 완료**: 축의금(이름·금액 인라인), 유저(이름·이메일·전화, UserDetail).
- **남음(BE는 전부 지원)**: 단일필드 수정 배선(메모리 text·Live메시지 message·호스트초대 status·웨딩 기본정보), 청첩장 카드·라운지 name 수정/삭제, RSVP 어드민 조회 화면 신설(현재 어드민에 RSVP surface 없음).
- **선행 버그(별개)**: WeddingDetail `lounge_entries` 탭이 개명 전 `v3_lounge_entries`를 읽음(실테이블 `v3_lounge_check_ins`) → 읽기 수정 후 삭제 배선 가능.
- 라이브 Playwright 스크린샷: admin 앱이 dev/prod Supabase + admin 로그인 계정 필요(이 환경 미보유).
