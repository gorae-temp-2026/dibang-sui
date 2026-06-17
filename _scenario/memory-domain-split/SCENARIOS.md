# Memory Domain Split — 시나리오

> Photo Sharing PR #1 머지 후 도출된 도메인 분리 작업.
> `v3_guestbook_messages.photo_url`을 제거하고 별도 도메인 **Memory**를 신설한다.
> 라운지 V2의 ComposeModal로 작성되는 게시물 단위를 GuestbookMessage(text)·GuestbookEntry(게스트 신원 카드) 의존에서 떼어내,
> `author_user_id` 직접 식별 + 사진 옵셔널 단위로 표현한다.

## 0. 배경 / 의도

### 0-1. 분리의 이유
- Photo Sharing 작업 때 `v3_guestbook_messages`에 `photo_url`을 통합했지만, 라운지 V2 화면의 "온기" 영역과 "LIVE 축하메세지"가 같은 테이블에 섞이는 책임 충돌 발생.
- GuestbookMessage는 `v3_guestbook_entries` 자식 구조라 호스트가 자기 라운지에서 일반 게시를 시도하면 `getMyGuestbookEntry` 404로 차단됨 (실제 dev에서 콘솔 404 재현 — `useCreateLoungePost.ts:37`).
- 도메인 책임을 다음과 같이 분리한다:

| 도메인 | 역할 | 식별 | 사진 | 화면 영역 |
|---|---|---|---|---|
| **GuestbookEntry** | 게스트 신원 카드(이름·관계·슬롯) | id, lounge_id, guest_id, recipient_slot, relation_* | — | 라운지 입장 게이트(`/guest`) |
| **GuestbookMessage** | 현장 QR 스캔 축하메세지 (text only, MEC디스플레이 공개) | entry FK | **없음 (drop)** | "LIVE 축하메세지" 영역, MEC디스플레이 |
| **Memory (신규)** | 라운지 V2 게시물 (text + 사진 0/1) | `author_user_id` 직접 (entry 무관) | 0 또는 1 | "온기" 영역, 활동 로그 |

> ⚠ **2026-05-25 후속 결정 — 사각지대 인정 + 본문 일원화**
> 본 SCENARIOS의 분리(GuestbookEntry = 신원 카드, GuestbookMessage = 축하메세지)에서 **`entries.message` 컬럼을 손대지 않아 본문이 두 테이블에 이중 저장되는 비정규 상태로 굳었음.** 마이그레이션 `20260525130000_v3_drop_guestbook_entries_message.sql`로 entries.message 컬럼·CHECK 드롭, 본문 214행을 messages로 1:1 이관, messages CHECK 60→70 완화. 이로써 본문 단일 진실원천(messages) + 1:N + FK 단방향(messages→entries) 모델이 모순 없이 성립. 결정·SQL: `_research_analysis/legacy-v3-migration/mapping-spec.md §6·§7`.

### 0-2. 확정 결정사항 (인터뷰)
- Memory 1 row = 1 게시물. 사진 0 또는 1장.
- text **필수** + photo **optional**. text 1–60자 (GuestbookMessage와 동일).
- 작성 권한: 게스트 + 호스트 둘 다, `author_user_id`로 식별 (entry 불필요).
- 본인만 soft delete. 수정 불가 (MVP scope 외).
- "온기" 그리드: **사람별 1 동그라미 collapse**, **최근 작성자순**, 한 번에 전체 fetch (최근 100명).
- 활동 로그: Memory 1건당 활동 행 1개, 최근순 무한스크롤.
- 0건 빈 상태: 영역별 안내 코피.
- Realtime: Memory도 supabase_realtime publication 등록 → authenticated 즉시 반영.
- GuestbookMessage anon SELECT + Realtime은 그대로 (MEC디스플레이 공개 데이터, T-LD-02 적용 확인).
- 기존 `v3_guestbook_messages.photo_url` 데이터는 버린다 (dev only).

---

## 1. A. Memory 작성 플로우

| # | Actor | Screen | Action | Result | Data Flow | State Change | Validation | Edge Case | Permission | Realtime |
|---|---|---|---|---|---|---|---|---|---|---|
| S-01 | Guest (인증) | 라운지 V2 ComposeModal | text 입력 + 사진 1장 첨부 + "게시" | "온기" 그리드 본인 동그라미 갱신, 활동 로그 "메모리를 올렸어요" 1행 | dibang `createMemory({loungeId, text, photo_url})` → `POST /memories` → v3_memories INSERT | +1 row | text 1–60자, photo ≤ 10MB | 네트워크/업로드 실패 → 토스트 + 재시도 | Guest (entry 무관, user_id 식별) | publication → 동그라미 + 활동 로그 즉시 갱신 |
| S-02 | Host | 라운지 V2 ComposeModal | 동일 | 동일 (호스트도 `author_user_id` 식별 → 동그라미 등장) | 동일 | 동일 | 동일 | **호스트 차단 안 됨** (분리 핵심) | Host (자기 라운지) | 동일 |
| S-03 | Guest/Host | ComposeModal | photo 없이 text만 게시 | text-only Memory, 동그라미는 이니셜 fallback | photo_url=null | +1 row (photo_url NULL) | text 필수 | — | 인증 | 동일 |
| S-04 | Guest/Host | ComposeModal | text 비어 photo만 | **차단** (게시 버튼 비활성) | — | — | text 필수 | 안내 라벨 ("메시지를 작성해주세요.") | — | — |
| S-05 | Guest/Host | ComposeModal | photo 첨부 (HEIC 포함) | `heic2any` JPEG 변환 → presigned PUT → 받은 URL을 createMemory에 전달 | `createPresignedUpload({category:'memory', loungeId})` → PUT Supabase Storage | `v3-uploads/v3-memory/{loungeId}/{userId}/{uuid}.jpg` 1 object | jpg/png/webp/gif/heic ≤ 10MB | 변환 실패·timeout → 1회 자동 재시도 | 인증 | — |

## 2. B. Memory 조회·표시

| # | Actor | Screen | Action | Result | Data Flow | Sort/Filter/Paging | Edge Case | Permission | Realtime |
|---|---|---|---|---|---|---|---|---|---|
| S-06 | Guest/Host | "온기" 영역 | 진입 | 작성자별 1 동그라미 (사람별 collapse, 사진/이니셜 fallback), **최근 작성자순** | `listMemories({loungeId})` 한 번에 전체 fetch | 최대 100명 collapse, cursor 없음 (단발) | 0건 → "메모리를 올려보세요" | **인증 필수** (anon 차단) | 구독으로 즉시 갱신 |
| S-07 | Guest/Host | "온기" 동그라미 탭 | 스토리 뷰어(FeedCardModal) 열림, 그 사람의 Memory 최근순. 좌우 스와이프로 다음 사람 | 사전 fetch한 grouped 데이터 사용 | 사람 내 최근순, 100명 그룹 내 순회 | 마지막 → 다음 사람 자동, 끝에서 닫힘 (FCM3 동일) | 인증 | 구독 중 신규 Memory 도착 시 다음 진입 때 반영 |
| S-08 | Guest/Host | "모이는 중" 활동 로그 | 진입 | "메모리를 올렸어요", Enter, Check-in 등. **Memory 1건당 활동 행 1개**, 최근순 무한스크롤 | 기존 활동 피드 + Memory INSERT 활동 row | 30 limit cursor 무한스크롤 | 0건 → "아직 활동이 없어요" | 인증 | Memory Realtime 구독으로 활동 로그 즉시 반영 |

## 3. C. Memory 삭제

| # | Actor | Screen | Action | Result | Data Flow | Edge Case | Permission |
|---|---|---|---|---|---|---|---|
| S-09 | Guest/Host | 스토리 뷰어 (본인 Memory) | "삭제" → 확인 | soft delete, 본인 마지막 Memory였으면 동그라미 사라짐 | `DELETE /memories/{id}` → `deleted_at` 갱신 | 호스트의 게스트 Memory 삭제 = **불가** (본인만) | **본인만** (author_user_id 일치) |
| S-10 | — | — | **수정 불가** (MVP scope 제외) | — | — | — | — |

## 4. D. GuestbookMessage 책임 분리 (LIVE 축하메세지)

| # | Actor | Screen | Action | Result | Data Flow | Permission |
|---|---|---|---|---|---|---|
| S-11 | Guest 현장 | 현장 QR 게이트 후 짧은 메시지 | GuestbookMessage 1행 (text only, entry 자식) | v3_guestbook_messages INSERT, **photo_url 칼럼 drop됨** | Guest 현장 입장자 |
| S-12 | 비인증 anon | **MEC디스플레이** | LIVE 메시지 표시 | anon SELECT + Realtime 구독 (T-LD-02 적용 확인) | **공개 (anon SELECT 정책 존재)** |
| S-13 | Guest/Host | 라운지 V2 "LIVE 축하메세지" 영역 | 진입 | Memory 영역과 명확 분리, QR 안내 카드 + 메시지 카드들 | 기존 GuestbookMessage flow 유지 (변동: photo_url 응답 필드 제거) | 인증 (라운지 진입자) |

## 5. E. 데이터·코드 정리 (작업 명세)

### 작업 순서

| # | 항목 | 작업 |
|---|---|---|
| S-14 | **DB 마이그레이션** | `CREATE TABLE v3_memories` (id PK uuid, lounge_id uuid NOT NULL FK ON DELETE CASCADE, author_user_id uuid NOT NULL FK, text text NOT NULL CHECK (char_length BETWEEN 1 AND 60), photo_url text NULL, created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz NULL). 인덱스 `(lounge_id, created_at DESC) WHERE deleted_at IS NULL`, `(author_user_id, lounge_id)`. RLS: `ENABLE` + `authenticated SELECT TO authenticated USING (true)`, INSERT/UPDATE/DELETE는 service_role only. supabase_realtime publication에 v3_memories 등록. **별도 파일**: `..._rls.sql`로 RLS·publication 분리. `ALTER TABLE v3_guestbook_messages DROP COLUMN photo_url`. **기존 photo_url 데이터 버림.** |
| S-15 | **sqlc queries** | `db/queries/memories.sql` 신규: `InsertMemory`, `ListMemoriesByLounge`, `GetMemoryByID`, `SoftDeleteMemory`. `guestbook_messages.sql`에서 photo_url SELECT/INSERT 제거. |
| S-16 | **Contract (OpenAPI)** | op 신규: `createMemory` (POST `/memories`), `listMemories` (GET `/lounges/{loungeId}/memories`), `deleteMemory` (DELETE `/memories/{memoryId}`). GuestbookMessage 응답 스키마에서 `photo_url` 제거. tags: `memories`. |
| S-17 | **Backend handler·service** | `handler_memories.go` + `service_memories.go` 신규. 권한: 인증 필수 (UserIDFromContext). DELETE는 author 일치 검증. 기존 `service_guestbook.go`에서 photo_url 사용 코드 제거. |
| S-18 | **Frontend (dibang)** | `useCreateLoungePost.ts` → `useCreateMemory.ts` rename. `getMyGuestbookEntry` 호출 제거 (호스트 게시 404 자연 해소). 라운지 V2 "온기" 컴포넌트(`OngiGrid`?) 신규 또는 갱신 — 사람별 collapse, FeedCardModal 연결. 활동 로그 행에서 라벨 `Feed` → `Memory`, 카피 "이 피드를 올렸어요" → "메모리를 올렸어요". `presignedUpload`의 `memory` 카테고리 그대로 활용. Supabase Realtime 구독 hook 추가. |
| S-19 | **E2E (Playwright)** | (1) 게스트 Memory text+photo 작성 → "온기" 동그라미 등장 (2) 호스트 같은 라운지에서 Memory 작성 → 호스트 동그라미 등장 (게시 차단 없음) (3) text-only Memory → 이니셜 fallback (4) 본인 Memory soft delete → 동그라미 사라짐 (마지막이었을 때) (5) LIVE 축하메세지 영역과 Memory 영역 분리 표시 (6) 활동 로그 "메모리를 올렸어요" 라벨 (7) Realtime: 한 탭에서 Memory 게시 → 다른 탭에서 즉시 반영 |

### 작업 의존 순서
1. DB 마이그레이션 (S-14) — 로컬 psql + dev Supabase 양쪽 적용
2. sqlc 재생성 (S-15) → backend 빌드 통과 확인
3. Contract OpenAPI (S-16) → `pnpm generate` → SDK 갱신
4. Backend handler·service TDD (S-17) → `go test` 통과
5. Frontend (S-18) — 카테고리별 분할 가능
6. E2E 검증 (S-19) — 모든 시나리오 통과

### 무엇이 깨질 수 있는가
- 기존 사용처에서 GuestbookMessage 응답 `photo_url` 참조하는 코드 → 컴파일 fail (의도된 트리거, 정리하라는 신호)
- 라운지 V2 피드 표시 로직이 Memory + LIVE Message + 활동 로그 셋을 합쳐 보여주던 부분 → 영역 분리로 명확화 필요
- photo-sharing의 `memory` storage 카테고리 prefix(`v3-uploads/v3-memory/...`)는 그대로 유지 — 코드 흐름에서 Memory 도메인이 자연 연결

---

## 6. 비-시나리오 (의도적 제외)

- Memory **수정** — MVP 제외. 작성 직후 보이는 게 곧 최종.
- 호스트의 게스트 Memory 강제 삭제 — 신고/검열 도메인 별개.
- 사진 2장 이상 첨부 — Memory 1행당 0/1로 한정. 여러 장은 Photo Sharing의 `share` 카테고리(현장 사진)가 담당.
- 비인증 사용자가 Memory 조회 — 라운지 V2는 인증 본체. LIVE 축하메세지만 MEC디스플레이에서 공개.
