# Photo Sharing — v3-uploads 단일 버킷 → public/private 2분리 (2026-05-22)

## 왜
faea79e 커밋 본문에 "정석(prod 적용 전 정정 필수)"로 명시된 청사진을 구현. v3 photo-sharing은 dev에서 단일 `v3-uploads` 버킷에 모든 카테고리를 obscurity로 담아 왔는데, Supabase Storage는 bucket 단위 public/private이므로 "단일 bucket + prefix별 권한 분리"가 구조적으로 불가. UI 이식 후 "이미 보낸 사진" 썸네일이 안 떴던 것도 이 어긋남의 증상.

## 무엇이 바뀌었나
- 마이그레이션 `20260522133023_v3_uploads_split_buckets_rls.sql`: `v3-uploads-public`(public on, anon read) + `v3-uploads-private`(public off, authenticated read) 두 버킷 + 각 SELECT 정책
- 백엔드 `StorageUploader` 인터페이스 3개 메서드(`Upload`/`IssueSignedUploadURL`/`Download`) 모두 `bucket` 인자화. `supabaseStorage.bucket` 필드 제거.
- `Server.UploadBucket` → `UploadBucketPublic` + `UploadBucketPrivate` 두 필드. `main.go`는 `UPLOAD_BUCKET_PUBLIC`/`UPLOAD_BUCKET_PRIVATE` env 두 개 (fallback `v3-uploads-public`/`v3-uploads-private`).
- `composePresignedObjectKey` 반환을 `(objectKey, bucket, isPublic, err)`로. 카테고리 매핑: `mobile-invitation`→public, `memory`/`share`→private.
- `DownloadSharedPhotosZip`은 closure로 private bucket 캡처해 ZIP 스트림 fetch.
- `NewUploadHandler` 시그니처에 `bucket` 인자. 레거시 `/uploads`는 public bucket으로 라우팅.
- `cmd/rebucket-photos` 신규 — `v3-uploads`의 mobile-invitation/share/memory를 새 버킷으로 copy (Supabase Storage REST `object/copy` + service_role).
- 클라이언트 `sharedPhotoUrl.ts`: `'wedding-shared'` → `'v3-uploads-private'`.
- `render.yaml`: dev/prod 모두 두 env 항목 추가 (sync:false).

## 검증 (dev)
- `pg_policies`에 `v3_uploads_public_read`(public) + `v3_uploads_private_read`(authenticated) 등록
- `rebucket-photos --apply` 결과: public 27 / private 35 / skip 28 / fail 0
- authenticated user(test-host)가 v3-uploads-private의 `v3-share/...` signed URL 받고 이미지 GET까지 200
- anon이 v3-uploads-public의 `v3-mobile-invitation/...` public URL GET 200 + image/png
- `go build/test -race/golangci-lint` green
- `pnpm --filter dibang-wedding build/lint` green

## 의도적으로 안 한 것 (후속 작업)
- prod Supabase에 버킷·정책·데이터 이관 — 별도 운영 작업
- 원본 `v3-uploads` 버킷의 객체 삭제 — 새 버킷에 copy만 했고 원본 보존 (롤백 안전). 검증 안정 후 별도 정리
- 옛 path 형식 28장(`{userId}/{uuid}.png`) — v3 코드 흐름 무관, skip
- mobile-invitation 27장의 publicURL이 DB에 캐시되어 있다면 갱신 — 단 storage_path는 그대로라 백엔드가 새 publicURL 조립 시 자동 정합. 캐시된 절대 URL 컬럼이 있는지는 별도 점검 필요
