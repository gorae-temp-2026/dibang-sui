# Photo Sharing — 사진 공유 기능 시나리오

이식 원본: `../web-mobile-application/apps-migration/web-app/src/features/{mobile-invitation,guest-photo}`
이식 시점: 2026-05-20 (`/scenario` 인터뷰 확정)

## 1. 목적과 카테고리 3분류

현재 단일 `uploads` bucket에 평탄 저장 중인 구조를, **신규 단일 `v3-uploads` bucket + 카테고리 × ID 단위 폴더**로 재정렬하고 신규 "현장사진 공유" 기능을 추가한다. (v3 격리 위해 bucket 이름·prefix 모두 `v3-` kebab 접두 통일)

| 카테고리 | 정의 | 그룹 ID | 비고 |
|---------|------|---------|------|
| **mobile-invitation** | 호스트가 청첩장 제작 시 업로드하는 사진 (커버 + 갤러리) | `{weddingId}` | legacy `useMobileInvitation` 이식 |
| **memory** | 라운지 메시지에 첨부하는 사진 (현재 `guestbook_messages.photo_url`) | `{loungeId}` | 2026-05-19 FEED에서 도입(현 multipart) |
| **share** | **하객들이 결혼식 현장에서 찍은 사진을 호스트에게 공유 (신규)** | `{loungeId}/{guestUserId}` | legacy `guest-photo` 이식, 최대 100장/하객 1인당 |

> `share`는 legacy `InvitationShare.tsx`(링크 복사·카카오 공유 UI, 사진 업로드 아님)와 무관한 별개 신규 기능. 혼동 주의.

## 2. 시나리오 표

| # | Actor | Screen | Action | Key Path | 메커니즘 | 권한 / 조회 | 파일 제약 | UX·엣지 |
|---|-------|--------|--------|----------|----------|-------------|-----------|---------|
| **S-01** | Host | 청첩장 제작·편집 (`InvitationCreatePage`/`InvitationEditPage`) | 커버 1 + 갤러리 최대 60장 | `v3-mobile-invitation/{weddingId}/{cover\|gallery}/{uuid.ext}` | **presigned 업로드 + public read URL (만료 없음)** | host(owner)만 업로드, 청첩장은 public read | jpg·png·webp·heic, 장당 10MB, **클라이언트 HEIC→JPEG 변환 후 업로드** | — |
| **S-02** | 라운지 입장자 (**로그인 사용자만**) | 라운지 V2 `ComposeModal` (피드 글 작성) | 메시지에 사진 1장 첨부 | `v3-memory/{loungeId}/{uuid.ext}` | **presigned 업로드 + private 서명 URL 조회** | 입장자 본인만 작성 / 라운지 입장자가 피드에서 조회 | S-01과 동일 제약 | 메시지당 0~1장 / **현 multipart→presigned 회귀 재검증 필요** |
| **S-03** | 하객(라운지 입장자) | 라운지 V2 **별도 사진 아이콘 FAB** (기존 `+` 작성 버튼과 2개 공존) | **100장/1인당** 일괄 업로드 → 호스트에게 모임 | `v3-share/{loungeId}/{guestUserId}/{uuid.ext}` | **presigned 다중 업로드 + private** | 본인 폴더만 업로드 / **host만 전체 조회** / 본인은 자기 것만 | S-01과 동일 제약 | **병렬 동시 3–5 + 개별 진행률 + 실패 자동 재시도 1회** |
| **S-04** | Host | `LedgerPage`(`/wedding/:weddingId/report`)에 **"공유 사진" 탭 신설** | 모든 하객 현장사진 조회·다운로드 | (read) `v3-share/{loungeId}/*/*` | GET 목록 + 서명 URL + 서버 ZIP 스트리밍 | 본인 wedding의 lounge만 | — | **하객별 그룹 + 그룹별 일괄 ZIP 다운로드** / 빈 상태 메시지는 구현 시 디자인 |
| ~~S-05~~ | — | — | **MVP 제외 — 삭제 기능 없음** | — | — | — | — |
| **S-06** | 운영자 | 일회성 이관 스크립트 | 기존 평면 `uploads/...` → 새 구조 일괄 이관 | DL → reupload(`{cat}/{id}/{uuid.ext}`) → DB `photo_url` update | dry-run → 실행 → 검증 | **dev 먼저 실행·검증 → prod는 별도 승인 후 적용** | — | 매핑 로직: 아래 §4 참조 |

## 3. 확정 결정 모음 (인터뷰 결과)

- **share 정체**: 하객→호스트 현장사진 공유 (legacy `InvitationShare`와 무관)
- **share 100장 단위**: **하객 1인당 100장** (서버 검증: `(loungeId, guestUserId)`별 count)
- **share 조회 권한**: **host만 전체 조회** (다른 하객은 자기 것만)
- **업로드 메커니즘**: **전부 presigned로 통일** (memory도 현 multipart에서 리팩토링)
- **mobile-invitation 구조**: 커버 1 + 갤러리 N (subKind `cover`/`gallery` 분리)
- **갤러리 최대 장수**: 60장
- **파일 제약**: jpg·png·webp·heic, 장당 10MB
- **HEIC 표시 호환**: 클라이언트에서 HEIC→JPEG 변환 후 업로드 (저장은 jpg 통일)
- **라운지 V2 FAB 구조**: 별도 사진 아이콘 FAB 추가 (기존 `+` 작성 버튼과 2개 공존)
- **호스트 모아보기 위치**: `LedgerPage`(웨딩 리포트)에 "공유 사진" 탭 신설
- **모아보기 UX**: 하객별 그룹 + 그룹별 일괄 ZIP 다운로드
- **삭제 정책**: **MVP 제외** ("공유하면 끝", cascade 정책도 보류)
- **마이그레이션**: dev 먼저 → prod 별도 승인 (일괄 이관 스크립트)
- **S-03 동시 업로드 UX**: 병렬 동시 3–5 + 개별 진행률 + 실패 자동 재시도 1회
- **S-02 비로그인 게스트**: 작성 불가 — 로그인 사용자만 (현 행동 유지)
- **presigned 만료 정책**:
  - mobile-invitation: **public read** (만료 없는 public URL)
  - memory / share: **private + 서명 URL** (권장값: 업로드 15분 / 조회 1시간)

## 4. 마이그레이션 매핑 (S-06)

기존 `uploads/...` 평탄 저장에서 새 카테고리·ID 구조로 옮기는 규칙:

- `guestbook_messages.photo_url`이 가리키는 파일 → `v3-memory/{loungeId}/{uuid.ext}`
  - `loungeId` = 해당 message의 `guestbook_entry_id → v3_guestbook_entries.lounge_id`
- 청첩장 사진 컬럼이 가리키는 파일 → `v3-mobile-invitation/{weddingId}/{cover|gallery}/{uuid.ext}`
  - 청첩장 row에서 `weddingId` 직접 도출, `cover`/`gallery` 구분은 컬럼명 기준
- **share는 신규라 이관 대상 0건**
- 절차: dry-run(매핑 표 출력) → dev 실행 → 검증(원본·신규 URL 양쪽 조회 OK) → prod 별도 승인 → prod 실행 → DB `photo_url` 일괄 update

## 5. 구현 시 결정 위임 항목

시나리오 단계에선 보류, 구현 단계에서 디자인·코드와 함께 정한다:

- S-04 "공유 사진" 탭 **빈 상태 메시지·일러스트** (사진 0건일 때)
- S-04 **새로고침/실시간 반영 정책** (host가 보는 중 새 사진 업로드 시 폴링/Realtime/수동 새로고침 중 택1)
- S-03 **중복 파일 처리** (같은 이름·같은 해시 두 번 올릴 때 UI)
- S-04 **그룹 내 정렬** (하객 그룹 내 사진 정렬 — 업로드 시각 vs EXIF 촬영 시각)
- presigned 발급 **인증 강제** (현 `POST /uploads`의 `UserIDFromContext` 401 정책 동일 적용)

## 6. 참고 코드 경로

### 이식 원본 (web-mobile-application)
- `../web-mobile-application/apps-migration/web-app/src/features/v3-mobile-invitation/hooks/useMobileInvitation.ts` — presigned 업로드 패턴 (`uploadPhoto(weddingId, file, "wedding-display")`)
- `../web-mobile-application/apps-migration/web-app/src/features/guest-photo/{components,hooks,types.ts}` — share(현장사진) 원본
- `../web-mobile-application/apps-migration/web-app/src/lib/upload.ts` — presigned 업로드 공통 로직 (`POST /uploads/presigned → PUT upload_url`)

### 현재 프로젝트 (이식 대상)
- `apps/api/server/storage.go` — `StorageUploader` 인터페이스 (`NewSupabaseStorage`, `NewLocalDiskStorage`)
- `apps/api/server/handler_uploads.go` (또는 `NewUploadHandler` 정의 파일) — 현 multipart `POST /uploads` 핸들러 (R5에서 정상화, bf675ab에서 라우팅 fix)
- `apps/api/main.go` — `uploadHandler` 라우팅 (chi 미들웨어 인터셉트 구조)
- `apps/dibang-wedding/src/hooks/invitation-create/useImageUpload.ts` — 현 multipart 클라이언트 훅 (FEED에서 메모리 사진에도 사용)
- `apps/dibang-wedding/src/components/lounge-v2/ComposeModal.tsx` — 메시지 사진 첨부 UI
- `apps/dibang-wedding/src/pages/LedgerPage.tsx` — 웨딩 리포트, S-04 "공유 사진" 탭 추가 대상
- `apps/dibang-wedding/src/pages/LoungeV2Page.tsx` — 라운지 V2, S-03 FAB 추가 대상

### 도메인·계약·메모리
- `_architecture/DOMAIN_MODEL_SUMMARY.md` — `GuestbookMessage.photo_url`(memory) 기록됨
- `packages/contracts/api-contract.yaml` — `createGuestbookMessage.photo_url` 정의
- `~/.claude/.../v3-memory/project_lounge_v2_decisions.md` (#2) — memory 사진·조회수 도입 결정 이력
- `_audit/2026-05-18-contract-domain-consistency/SUMMARY.md` — R5(/uploads 보안·계약 정상화), R-AUD 이력
- 본 세션 커밋 `bf675ab` — `/uploads` 라우팅 결함 수정

## 7. 관련 기존 시나리오

- `_scenario/wedding-lounge/SCENARIOS.md` — 라운지 본체 (S-02 ComposeModal 맥락)
- `_scenario/wedding-lounge-page/SCENARIOS.md` — 라운지 V2 페이지 레이아웃 (S-03 FAB 추가 지점)
- `_scenario/wedding-report-ledger/SCENARIOS.md` — 웨딩 리포트(LedgerPage) (S-04 "공유 사진" 탭 추가 지점)
- `_scenario/guest-web-flow/SCENARIOS.md` — 게스트 퍼널 (현 시나리오는 로그인 사용자 전제라 직접 연결 없음, 향후 비로그인 확장 시 참조)

---

# 구현 명세 (`/scenario-implement` 입력용)

이하는 시나리오를 코드로 옮기기 위한 명세. `/scenario-implement photo-sharing` 호출 시 §13 작업 순서대로 태스크 세분화 + TDD + 검증 + e2e가 진행된다.

## 8. DB 변경

신규 마이그레이션 파일 1개: `supabase/migrations/{timestamp}_v3_photo_sharing_tables.sql` (DDL only, v3 컨벤션상 RLS 미사용 — Storage RLS는 §12 인프라 액션).

### 8-1. `v3_mobile_invitation_photos` (신규)
```sql
CREATE TABLE public.v3_mobile_invitation_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES v3_mobile_invitations(id) ON DELETE CASCADE,
  sub_kind text NOT NULL CHECK (sub_kind IN ('cover','gallery')),
  storage_path text NOT NULL,           -- "v3-mobile-invitation/{weddingId}/{cover|gallery}/{uuid.ext}"
  file_name text,
  file_size int,
  mime_type text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_v3_mi_photos_invitation_sort ON v3_mobile_invitation_photos (invitation_id, sub_kind, sort_order);
-- cover는 invitation당 최대 1행
CREATE UNIQUE INDEX uniq_v3_mi_photos_cover ON v3_mobile_invitation_photos (invitation_id) WHERE sub_kind='cover';
```

### 8-2. `v3_shared_photos` (신규)
```sql
CREATE TABLE public.v3_shared_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lounge_id uuid NOT NULL REFERENCES v3_wedding_lounges(id) ON DELETE CASCADE,
  guest_user_id uuid NOT NULL REFERENCES v3_users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,           -- "v3-share/{loungeId}/{guestUserId}/{uuid.ext}"
  file_name text,
  file_size int,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_v3_shared_photos_lookup ON v3_shared_photos (lounge_id, guest_user_id, created_at DESC);
```
100장/하객 제약은 **DB CHECK가 아니라 서버 INSERT 트랜잭션에서 `SELECT count(*) WHERE lounge_id=? AND guest_user_id=? < 100`**로 강제(동시성은 `FOR UPDATE`+조건 트랜잭션, `-race` 테스트로 검증).

### 8-3. memory(`v3_guestbook_messages.photo_url`) 변경
컬럼 그대로 유지. **저장 형식만 변경**: full public URL → `storage_path`(`v3-memory/{loungeId}/{uuid.ext}`)만 저장. 조회 시 서버가 서명 URL 재발급. S-02 리팩토링 시점에 적용(본 PR 범위 외).

## 9. API Contract 변경 (`packages/contracts/api-contract.yaml`)

신규 operationId 7개 추가:

| Method · Path | operationId | Auth | 요약 |
|---|---|---|---|
| `POST /uploads/presigned` | `createPresignedUpload` | required | `{ category: 'mobile-invitation'\|'memory'\|'share', wedding_id?, lounge_id?, file_name, mime_type }` → `{ upload_url, object_key, public_url? }`. category·id 권한 강제(아래) |
| `POST /weddings/{weddingId}/invitations/{invitationId}/photos` | `createMobileInvitationPhoto` | host owner | `{ sub_kind, storage_path, file_name?, file_size?, mime_type?, sort_order? }` |
| `GET /weddings/{weddingId}/invitations/{invitationId}/photos` | `listMobileInvitationPhotos` | host owner | sort_order asc |
| `POST /lounges/{loungeId}/shared-photos` | `createSharedPhoto` | 라운지 입장자(본인 폴더만) | `{ storage_path, file_name?, file_size?, mime_type? }`. guest_user_id = ctx user. 100장 검증. |
| `GET /lounges/{loungeId}/shared-photos` | `listSharedPhotos` | host(전체) / 입장자(본인만) | query: `?guest_user_id=`. 서비스 분기 |
| `GET /lounges/{loungeId}/shared-photos/zip` | `downloadSharedPhotosZip` | host only | query: `?guest_user_id=`(그룹 ZIP). `Content-Type: application/zip` 스트리밍 |

### 9-1. presigned 권한 매트릭스 (`createPresignedUpload` 본문 검증)
- `category='mobile-invitation'`: `wedding_id` 필수 + ctx user가 그 wedding의 host owner여야 함
- `category='memory'`: `lounge_id` 필수 + ctx user가 그 lounge에 `v3_lounge_entries` 존재해야 함
- `category='share'`: `lounge_id` 필수 + 동일 입장자 검증 + 응답 object_key의 `{guestUserId}` 부분을 서버가 ctx.user.id로 강제 주입(클라이언트가 다른 사람 폴더로 못 보냄)

### 9-2. 기존 multipart `POST /uploads` 처리
유지 + **deprecated 표기**. memory FEED가 현재 사용 중이라 S-02 리팩토링까지 공존. S-02 완료 후 별도 PR에서 제거.

## 10. Backend 작업 (apps/api, TDD 의무)

### 신규 파일
- `apps/api/server/storage.go` 인터페이스 확장: `IssueSignedUploadURL(ctx, objectKey, mime, ttl) (uploadURL string, err error)`
- `apps/api/server/storage_presigned_supabase.go` — Supabase Storage SignedUploadUrl API 호출 구현 (`POST /storage/v1/object/upload/sign/{bucket}/{path}`)
- `apps/api/server/handler_uploads_presigned.go` — `CreatePresignedUpload` strict handler. 인증·category별 권한 검증·object_key 조립
- `apps/api/server/handler_mobile_invitation_photos.go` — list/create
- `apps/api/server/service_mobile_invitation_photos.go`
- `apps/api/server/handler_shared_photos.go` — list/create/zip
- `apps/api/server/service_shared_photos.go` — 100장 검증 트랜잭션
- `apps/api/server/zip_stream.go` — `archive/zip` + `io.Pipe` 스트리밍 (서버 메모리 최소)
- `apps/api/db/queries/mobile_invitation_photos.sql` + sqlc
- `apps/api/db/queries/shared_photos.sql` + sqlc

### 테스트 파일 (RED → GREEN)
- `service_shared_photos_test.go` — 100장 한도·동시 INSERT(`-race` 8 goroutine)·권한·서명URL host 분기
- `service_mobile_invitation_photos_test.go` — cover UNIQUE·sort_order·CASCADE
- `handler_uploads_presigned_test.go` — category별 권한 401/403/200
- `zip_stream_test.go` — ZIP 무결성·스트리밍 메모리 한도

### 환경변수
이미 R5에서 `SUPABASE_SERVICE_ROLE_KEY`, `UPLOAD_BUCKET` 도입. 그대로 사용.

## 11. Frontend 작업 (apps/dibang-wedding)

### 라이브러리 추가
- `heic2any` (HEIC→JPEG 클라이언트 변환)
- `p-limit` (동시성 풀)

### 신규/수정 파일
- `src/lib/presignedUpload.ts` (신규) — `presignedUpload({ category, weddingId?, loungeId?, files, concurrency=4, onProgress, autoRetry=1 })` 통합 헬퍼. HEIC 감지·변환→presigned 호출→PUT
- `src/hooks/invitation-create/useImageUpload.ts` (수정) — presigned 호출로 리팩토링
- `src/pages/InvitationCreatePage.tsx` / `InvitationEditPage.tsx` (수정) — cover 1 + gallery 60장 슬롯 UI (와이어프레임 수준)
- `src/pages/LoungeV2Page.tsx` (수정) — **신규 사진 아이콘 FAB** 추가 (기존 `+` 작성 FAB과 2개 공존)
- `src/pages/SharePhotoUploadPage.tsx` (신규) — 100장 선택·개별 진행률·취소·재시도. 라우트: `/lounge/:loungeId/share-photos/upload`
- `src/machines/sharePhotoUpload.machine.ts` (신규) — XState (idle → selecting → uploading(per file) → done/error). 2개 이상 비동기 분기라 `STATE_MANAGEMENT` 컨벤션상 machine 필수
- `src/pages/LedgerPage.tsx` (수정) — **"공유 사진" 탭 신설**. 하객별 그룹 카드 + 그룹별 ZIP 다운로드 버튼
- `src/components/share-photos/SharedPhotoGroupCard.tsx` (신규)
- `src/queries/share-photos/*.ts` (신규) — TanStack Query 훅 (list/create/download)

### memory FEED(S-02)
본 PR 범위 외 — 별도 후속 PR. `ComposeModal.tsx`·`useImageUpload.ts`의 현 multipart 흐름은 유지(deprecated 표기만).

## 12. 인프라 액션 (코드 밖, dev/prod 양쪽 운영자가 사전 수행)

- Supabase Storage `v3-uploads` 버킷 신규 생성 + **bucket Public toggle ON**:
  - **현 dev 구현(2026-05-20)**: 단일 public bucket. mobile-invitation·memory·share **모두 anon GET 가능**.
    경로에 UUID 3개 chain(`v3-{cat}/{lounge|wedding}/{guest}/{uuid.ext}`)이라 enumerate 불가 →
    **"URL 모르면 못 본다(obscurity 기반)"** 수준의 보안. dev/MVP는 충분, **prod 적용 전엔 아래 정석으로 정정 필수**.
  - **정석(prod 적용 전 정정)**: bucket 2개 분리 (Supabase Storage 구조상 단일 bucket으론
    prefix별 public/private 분리 불가 — `/object/public/` 경로는 bucket 자체가 Public일 때만 동작):
      - `v3-uploads-public` (Public on) — mobile-invitation 전용. URL 만료 없음(청첩장 비로그인 공유).
      - `v3-uploads-private` (Public off) — memory·share 전용. service_role만 INSERT, 조회는 서명 URL.
    코드 변경: `Server.UploadBucket` → `UploadBucketPublic` + `UploadBucketPrivate`, env 두 개,
    handler_uploads_presigned에서 category로 bucket 분기, migrate-photos 재이관. ~30~60분.
  - 단일 bucket 내 storage.objects RLS 정책은 Supabase 구조상 bucket이 Public일 땐 우회되므로 비활성.
- 환경변수: `SUPABASE_SERVICE_ROLE_KEY` (이미 R5 설정), `UPLOAD_BUCKET=v3-uploads` (코드 기본값과 동일)
- 적용 순서: dev 먼저 → 서버·e2e 검증 → prod는 위 "정석"으로 정정 후 별도 승인

## 13. 작업 순서 (`/scenario-implement` 태스크 세분화 기준)

1. **[DB]** 마이그레이션 작성 (§8) → 로컬 psql 적용 → dev apply_migration MCP 적용
2. **[검증]** psql로 두 테이블·인덱스·CASCADE·cover UNIQUE 확인
3. **[Contract]** api-contract.yaml에 §9 op 7개 추가 → `pnpm codegen` (oapi-codegen + openapi-ts)
4. **[검증]** Go strict interface·TS sdk export 생성 확인, `go build`·`pnpm build` green
5. **[Backend]** `storage.go` `IssueSignedUploadURL` + Supabase 구현 + `handler_uploads_presigned` TDD (RED→GREEN)
6. **[Backend]** `mobile_invitation_photos` handler·service·sqlc TDD
7. **[Backend]** `shared_photos` handler·service·sqlc TDD + 100장 동시성 `-race` 테스트
8. **[Backend]** `zip_stream` + ZIP 다운로드 handler TDD
9. **[검증]** `go test ./... -race` green, dev 서버 curl로 7개 op 200/401/403 확인
10. **[Frontend]** `presignedUpload.ts` + heic2any/p-limit 도입 + Vitest 단위검증 (HEIC 변환·동시성)
11. **[Frontend]** `useImageUpload` 리팩토링 + InvitationCreate/Edit 와이어프레임 UI
12. **[Frontend]** LoungeV2 사진 FAB + SharePhotoUploadPage + sharePhotoUpload.machine
13. **[Frontend]** LedgerPage "공유 사진" 탭 + 그룹 카드 + ZIP 버튼
14. **[검증]** `pnpm build` green + 각 페이지 Playwright 스크린샷
15. **[Migration]** `apps/api/cmd/migrate-photos/main.go` 구현 — flags: `--dry-run`(매핑 표 출력) / `--apply` (실행). 매핑 로직: §4
16. **[Migration]** dev에서 `go run ./cmd/migrate-photos --dry-run` → `--apply` → 검증 (원본·신규 URL 양쪽 조회 OK)
17. **[e2e]** Playwright + dev Supabase 직접: §14 케이스 전부 통과 + 스크린샷
18. **[정리]** `_scenario/INDEX.md` Photo Sharing 완료 표시, 변경 파일 목록·잔여 후속(S-02 memory 리팩토링, prod 인프라 액션) 보고

## 14. E2E 시나리오 매핑 (Playwright + dev Supabase)

| 케이스 | 시나리오 | 검증 |
|---|---|---|
| `s01_invitation_gallery_upload` | S-01 | Host가 jpg 3장 + heic 1장 업로드 → HEIC가 jpg로 변환되어 4장 모두 표시, sort_order 유지, `v3_mobile_invitation_photos` 4행 |
| `s01_invitation_cover_unique` | S-01 edge | cover 2장 업로드 시 두 번째는 첫 번째를 대체(또는 422 — 구현 결정에 따라) |
| `s03_share_5files_parallel` | S-03 | 라운지 입장자가 사진 FAB → 5장 선택 → 병렬 진행률 → `v3_shared_photos` 5행 + Storage 객체 존재 |
| `s03_share_quota_101` | S-03 edge | 100장 이미 있는 상태에서 1장 추가 → 서버 400 + UI 에러 토스트 |
| `s03_share_other_user_forbidden` | S-03 권한 | 다른 사용자의 `guest_user_id`로 presigned 요청 → 서버가 ctx.user.id로 강제 주입(또는 403) |
| `s04_ledger_groups_render` | S-04 | Host가 LedgerPage "공유 사진" 탭 → 하객별 그룹 렌더, 본인 wedding 아니면 403 |
| `s04_ledger_group_zip` | S-04 | 한 그룹 ZIP 버튼 → `application/zip` 헤더, 비-0 바이트, ZIP 무결성 |
| `s04_ledger_empty_state` | S-04 빈 상태 | 사진 0건일 때 빈 상태 메시지 |

S-02(memory presigned)는 본 PR 범위 외. S-06(마이그레이션)은 e2e 대신 `--dry-run`/`--apply` 직접 실행 + DB·Storage 양쪽 조회로 갈음.

## 15. 본 PR 범위 외 (별도 후속)

- **S-02 memory presigned 리팩토링** — `ComposeModal`/`useImageUpload`/`createGuestbookMessage` 흐름 갱신, `photo_url` 컬럼 저장 형식 전환(full URL → storage_path), 기존 multipart `POST /uploads` 폐기
- **prod 인프라 액션** — Storage RLS 정책·service_role_key 적용 (dev 검증 후 별도 승인)
- **S-05 삭제 기능** — MVP 제외 결정 (`/scenario` 인터뷰)
