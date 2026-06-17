# Storage 컨벤션 (Supabase Storage)

스토리지 업로드·경로·URL을 다루는 모든 작업의 단일 진실원천.
근거 감사: `_audit/2026-06-10-storage-path-consistency/` (현행 비일관 4축 + 전수 인벤토리).

## 원칙 (한 줄)

**경로 = 소유 리소스 스코프, DB = object key, URL은 조회 시점에 만든다.**

사진·파일의 수명은 업로더 계정이 아니라 그것이 속한 리소스(wedding/lounge)를 따른다.

## 버킷

| 버킷 | 공개 | 용도 판단 기준 |
|---|---|---|
| `v3-uploads-public` | O | URL 직참조로 렌더되는 것 (청첩장 커버·갤러리·레터링·캔버스, 온기 사진†) |
| `v3-uploads-private` | X | 입장 검증 뒤에만 보여야 하는 것 (현장사진) — signed URL로만 열람 |

† 온기 사진의 비공개 전환(signed URL 동봉)은 만료 갱신·레거시 절대 URL 행 이관이
얽힌 별도 제품 결정으로 보류 중 (2026-06-10 일관화에서 경로만 lounge 스코프로 통일).

- 버킷명은 코드에 하드코딩하지 않는다. 서버는 `cfg.UploadBucketPublic/Private`, FE signed URL은 `sharedPhotoUrl.ts` 패턴 경유.
- v2 레거시 버킷(`wedding-display`/`wedding-feed`/`wedding-shared`)은 신규 사용 금지.

## 경로 규칙

`{카테고리}/{소유 리소스 id}/{하위 구분}/{uuid}{ext}` — 카테고리별 확정 규칙:

| 카테고리 | 경로 | 버킷 | 권한 검증 (서버) |
|---|---|---|---|
| mobile-invitation | `v3-mobile-invitation/{weddingId}/{cover\|gallery\|lettering\|canvas}/{uuid}{ext}` | public | wedding owner |
| memory | `v3-memory/{loungeId}/{uuid}{ext}` | public† | lounge entrant |
| share | `v3-share/{loungeId}/{guestUserId}/{uuid}{ext}` | private | lounge entrant + guestUserId는 서버가 ctx user로 강제 주입 |
| invitation-draft | `v3-tmp/{userId}/{uuid}{ext}` | public | 인증 + 이미지 확장자 allow-list |

- `invitation-draft`는 "경로 = 소유 리소스 스코프" 원칙의 **명시적 임시 예외**다:
  Create 흐름은 저장 전이라 wedding이 없으므로 user 폴더에 잠시 두고,
  저장 확정 시 서버가 wedding 경로로 이동(copy+delete)하며 미저장 잔여물은
  TTL sweep이 정리한다. 설계: `_architecture/2026-06-10-invitation-draft-upload.md`

- 경로 생성은 **서버만** 한다 (`composePresignedObjectKey`, handler_uploads_presigned.go). 클라이언트가 경로를 만들거나 지정하지 않는다.
- 새 업로드 기능 = 새 카테고리 추가다. 기존 카테고리에 다른 리소스의 파일을 끼워 넣지 않는다.

## DB 참조 규칙

- DB에는 **object key(상대 경로)만** 저장한다. 예: `v3-share/{loungeId}/{userId}/{uuid}.jpg`
- 절대 URL(`https://...supabase.co/storage/...`) 저장 금지 — 프로젝트·버킷 이전 시 전부 깨진다.
- URL은 소비 시점에 만든다:
  - public → 서버 `publicURLForObject()` 또는 응답 직렬화 시 조립
  - private → signed URL (FE: `lib/sharedPhotoUrl.ts` `createSignedUrls`, TTL 1시간)
- 다른 테이블의 사진을 참조할 땐 경로 복사가 아니라 **FK** (선례: `v3_memory_book_photos.photo_id` → `v3_shared_photos.id`).

## 업로드 흐름 표준

presigned 3단계만 사용한다 (선례: 레터링·현장사진):

1. `POST /uploads/presigned` — 서버가 권한 검증 후 (upload_url, object_key) 발급 (TTL 15분)
2. 클라이언트가 `PUT upload_url` 직접 업로드 — FE는 `lib/presignedUpload.ts` 경유 (HEIC 변환·재시도·진행률 내장)
3. 등록 API로 object_key를 DB에 기록 — 등록되지 않은 객체는 고아로 간주

클라이언트 측 공통:
- 이미지는 업로드 전 `lib/compress-image.ts`로 10MB 이하 보장 (압축 실패 시 업로드 차단)
- 에디터류 UI는 낙관적 패턴 (선례: `useInvitationImageUpload` + `invitationImageUpload.machine`)

## 금지 사항

- `POST /uploads`(multipart, user 폴더)는 **폐기됨**(2026-06-10) — 재도입 금지. 모든 업로드는 presigned 경유.
- 클라이언트 임의 경로 지정, 절대 URL DB 저장(쓰기 경계 `storage_refs.go`가 key로 정규화), 버킷명 하드코딩, 다른 사용자 폴더 접근.
- "취소 시 클라이언트가 삭제"를 정리 수단으로 삼는 것 — 정리는 서버 몫(`cmd/sweep-storage-orphans`).

## 신규 업로드 기능 체크리스트

1. [ ] 공개/비공개 판단 → 버킷 선택
2. [ ] 소유 리소스 확정 → 카테고리·경로 규칙 정의 (`composePresignedObjectKey`에 추가)
3. [ ] 서버 권한 검증 (소유자/입장자)
4. [ ] 등록 테이블·칼럼은 object key 저장
5. [ ] FE는 presignedUpload + compress-image 경유
6. [ ] 조회는 public 조립 또는 signed URL — 절대 URL 박제 금지

## 현행 예외 (잔여 이관)

신규 업로드는 전부 presigned 리소스 스코프로 이관 완료 (2026-06-10 — 커버·갤러리·캔버스·
레터링·온기). DB 참조도 쓰기 경계에서 key로 정규화, 읽기 경계에서 URL 조립으로 통일
(`server/storage_refs.go` — 양형식 수용이라 레거시 절대 URL 행도 동작.
Realtime은 직렬화를 우회하므로 FE `loungeV2Feed.feedPhotoUrl`이 같은 규칙으로 조립). 잔여:
1. **기존 데이터**: user 폴더(`{userId}/...`)에 남은 과거 객체 + 그 절대 URL을 담은 DB 행
   — `cmd/migrate-storage-scope`(로컬 검증 완료)로 dev/prod 이관 대기.
2. **sweep 주기 실행 미등록**: `cmd/sweep-storage-orphans`(보고 전용 기본,
   `--delete`=tmp 만료분만)는 구현·로컬 검증 완료, cron/CI 스케줄 등록은 미착수.
3. **v2 레거시 버킷 3개**: 정리 계획 inventory.md §9 — 사용자 승인 대기.
이관 로드맵: `_audit/2026-06-10-storage-path-consistency/inventory.md` §8. 완료 시 이 절을 삭제한다.
