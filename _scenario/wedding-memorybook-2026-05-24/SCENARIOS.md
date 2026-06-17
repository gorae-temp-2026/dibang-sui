# 웨딩메모리북 + 사진 큐레이션 (v2 → v3 기능 이식)

> v2(`web-mobile-application/apps/web-app`)의 웨딩메모리북·사진큐레이션 기능을 v3로 이식.
> UI 이식은 별도 트랙이며 본 시나리오는 **기능 동작·데이터 흐름**만 정의한다.
> 시나리오 작성일: 2026-05-24

## 0. 배경 / 결정사항

### 0-1. v3 상태 (작성 시점)
- 웨딩메모리북 관련 테이블·API·핸들러·프론트 **전부 없음** (제로 베이스).
- 동음이의 주의: v3 라운지 V2의 `v3_memories`는 사람별 동그라미 게시물(다른 도메인). 본 시나리오의 "웨딩메모리북"은 결혼식 후 호스트가 만드는 큐레이션된 사진+메시지 책자.

### 0-2. v2 → v3 매핑 (확정)
| v2 가정 | v3 매핑 |
|---|---|
| `messages.is_heart` (boolean) | `v3_guestbook_messages.message = '__HEART__'` sentinel |
| `messages.side` ('groom'/'bride'/...) | `v3_guestbook_entries.recipient_slot` 첫 단어 (`groom_*` → groom, `bride_*` → bride, 그 외 → other) |
| `messages.is_private` | v3 라운지 인증 게이트로 대체 → 필터 불필요 |
| `messages.guest_name`/`guest_affil` | `v3_guestbook_entries.guest_name`, `relation_category`/`relation_detail` |
| `photos.photo_type='shared'` (큐레이션 소스) | `v3_shared_photos` |
| `photos.photo_type='display'` (신랑신부 본인 사진) | `v3_mobile_invitation_photos` |
| `weddings.host1_id/host2_id` | `v3_weddings` 6슬롯 (`host_groom_id`, `host_bride_id`, `host_groom_father_id`, `host_groom_mother_id`, `host_bride_father_id`, `host_bride_mother_id`) |
| `weddings.end_time` | **없음** → 이용가능시점 게이트 MVP에서 제거 |
| `cash_gifts` count | `v3_cash_gifts` count (status 컬럼 없음, 그대로 카운트) |

### 0-3. 확정 결정사항
- **이용가능시점 제한 없음** — MVP에서는 호스트가 언제든 큐레이션 가능. status 분기는 `ready_uncurated` / `ready` 2단계 (v2의 `not_ready` 제거).
- **메시지 자동선별** — v2 알고리즘 그대로 포팅 (sentinel + recipient_slot 매핑).
- **디스플레이 사진 소스** — `v3_mobile_invitation_photos` (호스트가 청첩장에 올린 신랑신부 사진).
- **큐레이션 대상 사진** — `v3_shared_photos`만 (모청 사진은 큐레이션 풀에 포함 안 함).
- **호스트 권한** — 6슬롯 호스트 중 하나라도 일치하면 호스트로 인정.

---

## 1. A. 사진 큐레이션 (호스트가 30장 선택)

| # | Actor | Screen | Action | Result | Data Flow | State Change | Validation | Edge Case | Permission |
|---|---|---|---|---|---|---|---|---|---|
| S-01 | Host | 큐레이션 페이지 진입 | 페이지 로드 | shared 사진 그리드 + 기존 큐레이션 선택 상태 복원 | `GET /host/{weddingId}/memorybook` (curated 포함) + `GET /host/{weddingId}/shared-photos` | — | — | shared 0건 → "아직 공유된 사진이 없어요" 빈 상태 | 해당 wedding 6슬롯 호스트 중 하나 |
| S-02 | Host | 사진 그리드 | 사진 토글 (선택/해제) | 선택 카운터·동그라미 번호 갱신 | 클라이언트 state | — | **최대 30장**, 31번째 토글은 무시 (배열 push 안 함) | — | 호스트만 |
| S-03 | Host | 사진 그리드 | 사진 본체 클릭 | 라이트박스 — 좌우 스와이프, 라이트박스에서도 선택 토글 가능 | 클라이언트 | — | — | 양 끝 사진 다음 스와이프 차단 | 호스트만 |
| S-04 | Host | 하단 "저장하기" | 클릭 (1장 이상 선택) | DB 큐레이션 교체 후 메모리북 화면(`ready` 상태)으로 이동 | `PUT /host/{weddingId}/memorybook/photos {photoIds}` → RPC `upsert_memory_book_photos` (원자적 DELETE+INSERT) | `v3_memory_book_photos` 전체 삭제 + 새 row 1~N개 (display_order = ordinality) | photoIds: UUID array, 중복 금지, 모두 해당 wedding의 라운지 shared 사진이어야 함 | 잘못된 ID 포함 → 400 invalidIds 반환, RPC 실패 → 500 "저장 실패" 토스트 | 호스트만 |
| S-05 | Host | 하단 "저장하기" | 클릭 (0장 선택) | confirm("선택된 사진이 없습니다. 마치고 나가시겠습니까?") → 확인 시 빈 배열 저장 → 홈(`/`)으로 이동 | 동일 (photoIds: []) | 모든 큐레이션 row DELETE → status `ready_uncurated` | — | — | 호스트만 |

## 2. B. 웨딩메모리북 조회 (status: ready)

| # | Actor | Screen | Action | Result | Data Flow | Sort/Filter | Edge Case | Permission |
|---|---|---|---|---|---|---|---|---|
| S-06 | Host | 웨딩메모리북 페이지 | 진입 | 커플 정보 + 큐레이션 사진 + 디스플레이 사진(모청 사진) + 자동선별 메시지(텍스트 30 + 하트 6) + 통계 표시 | `GET /host/{weddingId}/memorybook` 단일 호출, 서버에서 5개 병렬 조회 | curated: `display_order` asc, display: `created_at` asc, 메시지: 시간순 + 하트 뒤 | curated 0건이면 status=`ready_uncurated` → 큐레이션 페이지로 자동 라우팅 | 호스트만 (공유 viewer 권한은 MVP scope 외) |

## 3. C. 메시지 자동선별 (서버 알고리즘)

| # | 단계 | 로직 | v3 매핑 |
|---|---|---|---|
| S-07 | **소스** | `v3_guestbook_messages` × `v3_guestbook_entries` JOIN으로 entry의 `recipient_slot` 가져옴 | entry의 `recipient_slot`이 v2 `side` 대체 |
| S-08 | **하트 분리** | `WHERE message = '__HEART__'` → 하트, `WHERE message != '__HEART__'` → 텍스트 | v3 sentinel 그대로 |
| S-09 | **하트 선별** | 최근순 정렬 → 최대 6개 (3개씩 2그룹) | v2와 동일 |
| S-10 | **텍스트 선별** | (1) 욕설 필터(`detectProfanity` Go 포팅) + 빈 문자열 제외. (2) 합 ≤30이면 그대로. (3) 합 >30이면 side별로 분류 후 비율 할당 + 각 side에서 시간 균등 샘플링 | side 매핑: `recipient_slot` 첫 단어 (`groom_*` → groom, `bride_*` → bride, 그 외 → other) |
| S-11 | **부족분 보충** | floor 잔여로 부족하면 미사용 메시지에서 추가 균등 샘플링 | v2와 동일 |
| S-12 | **정렬** | 텍스트는 시간순(오래된 순), 하트는 뒤에 별도 | v2와 동일 |
| S-13 | **is_private** | v2: `is_private=false`만. v3: **필터 불필요** (라운지 인증으로 이미 게이트됨) | 단순화 |

## 4. D. 통계

| # | 칸 | 출처 |
|---|---|---|
| S-14 | totalGuests | `v3_guestbook_messages` 전체 count (해당 wedding의 lounge들) |
| S-15 | totalMessages | totalGuests + `v3_cash_gifts` count |
| S-16 | photosUploaded | `v3_shared_photos` 전체 count (해당 wedding의 lounge들) |

## 5. E. 보안·계약

| # | 항목 | 정의 |
|---|---|---|
| S-17 | **소유권 체크** | wedding의 6슬롯(`host_groom_id`, `host_bride_id`, `host_groom_father_id`, `host_groom_mother_id`, `host_bride_father_id`, `host_bride_mother_id`) 중 하나라도 일치하면 호스트. 아니면 403 |
| S-18 | **RLS** | `v3_memory_book_photos` — 위 6슬롯 정책으로 호스트만 ALL |
| S-19 | **OpenAPI 추가** | `getHostMemoryBook` (GET `/host/{weddingId}/memorybook`), `putHostMemoryBookPhotos` (PUT `/host/{weddingId}/memorybook/photos`). tags: `host-memorybook` |

## 6. F. 작업 명세

| # | 레이어 | 작업 |
|---|---|---|
| S-20 | **DB DDL** | `{ts}_v3_memory_book_photos.sql` — table(id, wedding_id FK→v3_weddings, photo_id FK→v3_shared_photos, display_order 1~30, selected_by FK→v3_users, created_at), unique constraints(wedding_id+photo_id, wedding_id+display_order), index(wedding_id, display_order). RPC `upsert_memory_book_photos(wedding_id, photo_ids[], selected_by)` 원자적 DELETE+INSERT |
| S-21 | **DB RLS** | `{ts}_v3_memory_book_photos_rls.sql` — 6슬롯 호스트 정책 |
| S-22 | **sqlc** | `apps/api/db/queries/memory_book_photos.sql` — Insert/List/Replace |
| S-23 | **Contract** | OpenAPI `getHostMemoryBook`, `putHostMemoryBookPhotos` 추가. response status enum: `ready_uncurated` / `ready` |
| S-24 | **Backend Go** | `handler_memorybook.go` + `service_memorybook.go`. `selectMessages` 알고리즘 Go 포팅. `detectProfanity` v2(JS) → Go 포팅 |
| S-25 | **Frontend UI** | **이 시나리오 범위 밖** (별도 트랙) |

---

## 7. v2 참조 코드 위치

- 백엔드 라우트: `web-mobile-application/apps/api/src/routes/host/memorybook.ts`
  - `computeAvailableAt` (이용가능시점 — v3에서는 제거)
  - `selectMessages` (메시지 자동선별 알고리즘 — v3 Go 포팅 대상)
  - `formatKSTTime`
  - `detectProfanity` (`web-mobile-application/apps/api/src/lib/profanity.ts`)
  - RPC: `upsert_memory_book_photos` (v3 새로 작성 필요)
- 프론트 페이지: `web-mobile-application/apps/web-app/src/pages/host/memorybook/`
  - `MemoryBookCuratePage.tsx` (큐레이션 UI)
  - `WeddingMemoryBookPage.tsx` (status 분기 + viewer 라우팅)
  - `v2.4_final/MemoryBookV2_4.tsx` (메모리북 viewer)
