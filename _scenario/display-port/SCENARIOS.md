# Display Port — mecdisplay → guest-web 이식

> 레거시 `web-mobile-application/apps/display` 의 mecdisplay 기능을 v3 `apps/guest-web` 에 컨벤션에 맞게 이식.
> 기능 기획은 레거시 그대로(전적 추종), 스키마·데이터 소스·상태관리만 v3 컨벤션으로 매핑.
>
> 작성일: 2026-05-20

## 0. 카드 모델

display에 떠오르는 envelope은 **한 종류**다. 별도 시나리오로 갈라지지 않는다.

```
┌──────────────────────────────────┐
│  [헤더]  guest_name · relation   │  ← guestbook_entries (identity)
│ ─────────────────────────────── │
│  [본문]  message text            │  ← guestbook_entries.message
│                                  │     또는 guestbook_messages.message
└──────────────────────────────────┘
```

도메인:
- `GuestbookEntry` = 한 Guest의 라운지 정체성 단위 (이름·관계 + 입장 시 첫 메시지 선택)
- `GuestbookMessage` = Entry에 달리는 개별 글 (1 Entry : N Message)
- **카드 1개 = 글 1건** (entry.message 한 건 또는 messages row 한 건)
- 헤더의 이름·관계는 **항상** 부모 entry에서 join
- 카드의 시각 포맷은 한 가지. 출처(entry.message vs guestbook_messages.message)는 내부 구현 디테일이고 화면에는 차이가 보이지 않는다.

## 1. 검증 기준 — "완전 동일"

mec display의 **모든 시각 요소**는 web-mobile-application 레거시와 **픽셀-동일**해야 한다. 조금이라도 달라선 안 된다.

### 1-1. 시각 동일성 대상

다음 레거시 자산을 **1:1 그대로** 이식한다. Tailwind 클래스, 인라인 스타일, 좌표, 색상, 폰트, 비율, framer-motion variants, 애니메이션 타이밍, easing 모두 동일.

| 레거시 자산 (apps/display/src) | 동일 보존 항목 |
|---|---|
| `DisplayPage.tsx` Layer 1~20 구성 | 배경 슬라이드쇼·그라데이션 오버레이 3종·헤더 영역·장식선·봉투 플로팅 영역·QR 영역의 z-index, 위치, transform, mask, 색상 |
| `mecdisplay/FloatingMessageCard.tsx` | 봉투 카드 디자인, 색상, 그림자, 폰트, 패딩, framer-motion variants, exit 애니메이션 |
| `mecdisplay/ApproachingHearts.tsx` | 다가오는 하트 애니메이션 그대로 |
| `mecdisplay/FloatingStickerHeart.tsx` | 스티커 하트 시각·물리 그대로 |
| `mecdisplay/HostParents.tsx`, `HostNamesRow` | 호스트·부모 이름 row 레이아웃 동일 |
| `mecdisplay/QRSection.tsx`, `ChukuihamQR.tsx` | QR 영역 디자인·glow·위치 동일 |
| `mecdisplay/animations.ts` | 모든 motion variant·duration·easing 동일 |
| `mecdisplay/physics.ts` | d3-force 파라미터·radius·반발력 동일 |
| `mecdisplay/useEnvelopeQueue.ts` | 큐 정책, HISTORY_MAX, replay 간격, MIN_VISIBLE, 노티스 동작 동일 |
| `mecdisplay/useViewportScale.ts` | FHD 가로형 스케일 로직 동일 |
| `mecdisplay/constants.ts` | 모든 상수값 동일 (REPLAY_INTERVAL_MIN/MAX, QUIET_WAIT_MS, NOTICE_DELAY_MS, FLOAT_*_OFFSET, ENVELOPE_RADIUS, QR_RADIUS, SLIDESHOW_INTERVAL_MS 등) |

### 1-2. 검증 방법

레거시 환경과 v3 이식 환경에서 동일 데이터를 시드하고 양쪽 화면을 비교한다. 정지 화면 + 애니메이션 진행 중 양쪽 모두 시각 차이 없어야 한다.

- 동일 weddingId(또는 동일 lounge_id) 데이터로 양쪽 환경 시드
- 정지 스크린샷 비교: 헤더 영역, 배경 슬라이드, 봉투 카드 1장, QR 영역
- 애니메이션 진행 중 스크린샷 비교: 봉투 floating 중간, 노티스 카드 출현 순간
- 시각 차이 발견 시 → 작업 미완료. 차이를 0으로 만들 때까지 종료 금지.

### 1-3. 시각 변경·신규 시안 금지

이식 과정에서 새로운 시안·디자인 변형·시각 보강은 일체 없다. **레거시에 없는 것은 v3에도 없다.**

- v3에만 있는 데이터(예: `guestbook_messages.photo_url`)는 카드 시각으로 표현하지 않는다.
- 사진 첨부 메시지는 **photo_url 무시**하고 텍스트만 카드화한다 (텍스트 빈 메시지는 표시하지 않음).
- 사진을 카드에 노출하려면 별도 PR·별도 시안 검증이 필요하며, 본 이식 범위에는 포함되지 않는다.

### 1-4. 배경 사진 fit 사양 (의도적 이탈, 2026-05-20 사용자 결정 / 같은 날 정정)

레거시 mecdisplay의 `sameOrientation` 가드(사진·화면 방향 일치 시 cover, 다르면 contain) 대신 **사진 비율 vs 화면 비율의 상대 차이**를 본다. 사용자 요구사항을 우선해 레거시 동등성에서 의도적으로 이탈한다.

**새 규칙** (`imgRatio = naturalWidth / naturalHeight`, `screenRatio = innerWidth / innerHeight`):

```
ratio = imgRatio / screenRatio
```

| ratio 범위 | 동작 |
|---|---|
| `1/1.1 ≤ ratio ≤ 1.1` (화면과 ±10% 이내) | **`cover`** — 잘림 감수 꽉 채움 |
| 그 외 (상대 차이 10% 초과) | `contain` + blur 배경 |

**해석**: "화면을 1로 봤을 때 사진이 화면 비율에 얼마나 가까운가"를 본다. 사진 종횡비 자체가 아니라 **화면 비율 대비 상대 차이**가 기준. 같은 사진이라도 화면 비율이 바뀌면 결과가 달라진다.

**예시**:
- 가로 16:9(`screenRatio≈1.78`) 화면: imgRatio 1.6 (ratio 0.9, 10% 차이) → cover / imgRatio 0.8 (ratio 0.45, 55% 차이) → contain + 양옆 blur
- portrait 9:16(`screenRatio≈0.56`) 화면: imgRatio 0.6 (ratio 1.07) → cover / imgRatio 1.0 정사각 (ratio 1.79) → contain

**근거**: 사진과 화면 비율이 거의 같으면 잘림이 적게 발생하므로 cover로 꽉 채우는 게 자연스럽고, 비율 차이가 크면 잘림이 심해져 오히려 contain + blur가 시각적으로 낫다.

**레거시와의 차이**: 레거시는 `sameOrientation` boolean(방향 동일성)만 봤지만, 새 규칙은 실제 비율 차이를 정량적으로 본다. 결과적으로 동일·다른 케이스가 모두 다수 발생.

**구현 위치**: `apps/guest-web/src/components/display/BackgroundSlideshow.tsx` `createSlotImg` 함수의 `img.onload` 콜백.

### 1-5. `__HEART__` sentinel 처리 (v3 신규, 2026-05-20 사용자 결정)

레거시 mecdisplay에는 없는 v3 신규 sentinel. 게스트가 guest-web GuestFlowPage에서 '하트 보내기'를 누르면 `guestbook_messages.message`가 문자열 `'__HEART__'`로 INSERT된다 (`apps/guest-web/src/machines/guestFlow.machine.ts:270` 참조). dibang-wedding의 `FeedItemGuestbookMessage`는 이 값을 카드 내 하트로 렌더하지만, mecdisplay에서는 **카드(envelope)가 아니라 SVG 하트 sticker로 표시**한다 (사용자 요구사항).

**처리 사양**:
- seed history fetch에서 `message === '__HEART__'`인 row는 envelope 큐에서 **제외**한다 (텍스트 카드로 떠오르지 않음).
- Realtime postgres_changes INSERT 콜백에서 `message === '__HEART__'`이면 `addLiveEnvelope` 대신 `addSticker()`를 호출한다. lastReceivedAt은 갱신.
- catch-up fetch에서도 동일 분기.
- sticker는 `FloatingStickerHeart`(이미 복사된 컴포넌트)로 SVG 하트가 임의 위치에 240×240 크기로 4초간 펑 떠올랐다 사라진다. 동시 표시 최대 20개.

**구현 위치**:
- `apps/guest-web/src/pages/DisplayPage.tsx` — `HEART_SENTINEL` 상수, `activeStickers` state, `addSticker/removeSticker` callback, Layer 25 `<AnimatePresence>` 영역, 시드/Realtime/catch-up 분기.
- `apps/guest-web/src/components/display/FloatingStickerHeart.tsx` — 레거시 컴포넌트 그대로(시각 동일성).

**SCENARIOS §0 카드 모델과의 관계**: 카드 모델은 entry+message 텍스트 카드에 한정. `__HEART__`는 카드가 아닌 별도 sticker 시각이므로 카드 모델과 독립. 레거시 V2 DisplayPage의 `addSticker()` 패턴을 차용했으며, 트리거 소스만 v3 sentinel로 변경.

## 2. 확정 결정 요약

| 영역 | 결정 |
|---|---|
| 위치·인증 | guest-web 내 공개 라우트 `/display?weddingId=...` (레거시 진입 방식 동일) |
| wedding/사진 데이터 | v3 백엔드 API 경유 — `GET /weddings/{id}` + `mobile_invitations.gallery_photos` 재사용 |
| entries/messages 데이터 | Supabase 직접 (시드 fetch, catch-up fetch, Realtime 구독 모두) |
| Realtime 필터 | `guestbook_entries`는 기존 `lounge_id` / `guestbook_messages`는 **`lounge_id` 비정규화 컬럼 신규 추가** → `filter: lounge_id=eq.X` |
| `lounge_id` 채움 전략 | **service_guestbook_messages 핸들러가 INSERT 시 lounge_id 명시 구성** + 기존 row 1회 백필 |
| 마이그레이션 전략 | **완전 별도 PR/분기**로 분리. 동시 진행 워크스트림(photo/view_count, dev 미적용) **머지 후 rebase로 충돌 해소** |
| 카드 모델 | entry(헤더) + message(본문) = 1 카드. 시각 포맷 단일. 화면상 출처 구분 없음 |
| **시각 동일성** | **레거시 픽셀-동일 보존 (§1 검증 기준)**. 신규 시안 금지 |
| photo_url 처리 | **카드화에서 무시** (텍스트만 표시). 텍스트도 사진도 둘 다 빈 메시지는 표시 안 함 |
| side / is_private | v3 개념 아님 — 이식 안 함 / 전부 공개 표시 |
| 배경 사진 출처 | `mobile_invitations.gallery_photos` 재사용 |
| 안내 문구 | 클라이언트 상수 하드코딩 (레거시 `NOTICE_MESSAGES` 그대로, 명명 `INFO_MESSAGES`) |
| heartbeat | **1차 이식에서 제외** |
| QR 타깃 URL | `${BASE_URL}/?weddingId=...` (guest-web 루트) |
| 상태관리 | XState `displayMachine` (CLAUDE.md 규칙) |
| MVP 범위 | 헤더 + 사진 슬라이드쇼 + Realtime 떠오르는 카드 + catch-up + 안내 무한루프 + QR 전부 포함 |

## 3. 시나리오 테이블

| # | Actor | Screen | Action | Result | Data Flow | Realtime | Permission | Edge Case |
|---|---|---|---|---|---|---|---|---|
| S-01 | display 클라이언트 | `/display?weddingId=` 진입 | 페이지 로드 | 헤더(호스트·날짜·장소) + 배경사진 + 시드 카드 큐 | (1) `GET /weddings/{id}` → wedding, lounge_id, invitation.gallery_photos<br>(2) Supabase 직접: `guestbook_entries where lounge_id=X order by created_at limit N`(이름·관계·entry.message)<br>(3) Supabase 직접: `guestbook_messages` join `guestbook_entries` `where lounge_id=X order by created_at limit N` (글 본문 + 헤더용 entry 정보, photo_url 무시) | — | 공개 | weddingId 없음 → 안내 화면 |
| S-02 | display 클라이언트 | 배경 | `SLIDESHOW_INTERVAL_MS`(6초) 주기 전환 | 사진 cross-fade (3-slot sliding window) | gallery_photos 배열 회전 | (선택) invitation 갱신 구독 | 공개 | 사진 0장 → 단색 배경 `#080808` |
| **S-03** | Guest → display | display 본문 | 외부에서 글 1건 INSERT | **카드 1개 떠오름** (entry 이름·관계 헤더 + message 본문). 레거시 봉투 카드 디자인·물리·애니메이션 100% 동일 | Supabase Realtime 구독 두 트리거, 결과는 동일 카드 포맷:<br>(a) `table:guestbook_entries, filter:lounge_id=eq.X, event:INSERT` — entry.message 있으면 카드화<br>(b) `table:guestbook_messages, filter:lounge_id=eq.X, event:INSERT` — entry_id로 부모 entries 조회 → 이름·관계 join → 카드화 (photo_url 무시) | **필수** | 공개 | message 빈 entry/message → 표시 안 함 |
| S-04 | display 클라이언트 | (네트워크) | 채널 `CHANNEL_ERROR` / `TIMED_OUT` | 5초 후 재구독 + catch-up (두 트리거 각각) | Supabase 직접: 두 테이블 각각 `where lounge_id=X and created_at > lastReceivedAt[table] order by created_at` → 글이 발생한 시간순으로 카드 큐 push | 재연결 | 공개 | 무한 재시도 (레거시 그대로) |
| S-05 | display 클라이언트 | 본문 | `NOTICE_DELAY_MS`(10초) 간격 안내 카드 자동 표시 | 안내 envelope 카드 표시 (별도 색상, 레거시 `isNotice` 플래그 그대로) | 클라이언트 상수 `INFO_MESSAGES` (레거시 `NOTICE_MESSAGES` 배열 그대로) | — | — | onComplete 후 다음 카드 스케줄 |
| S-06 | Guest | display 화면 | QR 스캔 | guest-web 루트 진입 | QR 이미지 = `${BASE_URL}/?weddingId=...` | — | 공개 | 모바일/세로 화면 → QR 숨김 (`hidden sm:flex`) |
| ~~S-07~~ | — | — | heartbeat | — | — | — | — | **1차 제외** |

## 4. 카드 시각 포맷

화면에 떠오르는 카드는 **두 종류뿐**이며, 둘 다 레거시 디자인 100% 동일:

| 종류 | 트리거 | 시각 |
|---|---|---|
| **글 카드** | S-03 (entry / message 어느 출처든) | 레거시 `FloatingMessageCard` 그대로. 헤더(이름·관계) + 본문 텍스트. photo_url은 무시 |
| **안내 카드** | S-05 | 레거시 `isNotice=true` 봉투 그대로 (별도 색상) |

## 5. 작업 순서 (구현 시작 시 TaskCreate로 변환)

1. **(선행)** 동시 워크스트림 머지 대기 또는 별도 분기 시작
2. 마이그레이션 작성:
   - `{ts}_v3_guestbook_messages_add_lounge_id.sql` (DDL — `ALTER TABLE ... ADD COLUMN lounge_id uuid REFERENCES wedding_lounges(id) NOT NULL`, 인덱스)
   - `{ts}_v3_guestbook_messages_add_lounge_id_rls.sql` (RLS — display anon SELECT 허용)
3. 백엔드 핸들러 수정: `service_guestbook_messages.go` createGuestbookMessage가 entry_id에서 lounge_id 조회 후 INSERT 시 명시 구성
4. 기존 row 1회 백필 SQL (entries → messages.lounge_id 복사)
5. guest-web 라우트 `/display` 추가 + XState `src/machines/display.machine.ts` (loading → ready → subscribing → reconnecting 분기)
6. mecdisplay 컴포넌트 **그대로 복사** → `src/components/display/*`. 변경 금지:
   - FloatingMessageCard, ApproachingHearts, FloatingStickerHeart, HostParents, QRSection, ChukuihamQR
   - animations.ts, physics.ts, constants.ts, types.ts
   - useEnvelopeQueue.ts, useViewportScale.ts
7. wedding/invitation TanStack Query 훅 (v3 API client 경유)
8. Supabase Realtime 구독 두 트리거(entries, messages) + 카드 단일 포맷 변환 레이어 (entry-only / message+entry-join 두 경로 모두 같은 `EnvelopeBase`로 정규화)
9. catch-up 로직 (두 테이블별 lastReceivedAt 두 개)
10. `INFO_MESSAGES` 상수 이식 (레거시 `NOTICE_MESSAGES` 배열 그대로)
11. **시각 동일성 검증**: 레거시 vs 이식본 양쪽 환경 동일 데이터 시드 → 정지/애니메이션 스크린샷 비교. 차이 0 확인까지 미완료
12. (마지막) 동시 워크스트림 머지 후 rebase + 충돌 해소
13. dev Supabase 마이그레이션 적용, 백필, 검증

## 6. 구현 단계에서 추가 결정될 사항

- React 19 / framer-motion 버전 호환성 확인 — 단, 시각 결과는 동일해야 하므로 framer-motion 메이저 변경이 시각 차이를 만들면 버전 다운그레이드 또는 호환 패치 필요
- guest-web에 supabase-js 클라이언트 추가 (publishable key 환경변수)
- 두 Realtime 구독을 한 채널의 두 listener로 합칠지 vs 두 채널로 분리할지

## 7. 참고 — 레거시 ↔ v3 매핑 표

| 레거시 (web-mobile-application) | v3 (digital-guestbook-v3) |
|---|---|
| `apps/display/src/DisplayPage.tsx` (558 라인) | `apps/guest-web/src/pages/DisplayPage.tsx` (이식 — 레이어 구성 100% 동일) |
| `apps/display/src/mecdisplay/*` | `apps/guest-web/src/components/display/*` (파일 그대로 복사, 변경 금지) |
| `apps/display/src/queries.ts` | `apps/guest-web/src/lib/displayQueries.ts` (Supabase 직접) + `src/hooks/useWedding.ts`(v3 API) |
| `messages(wedding_id, guest_name, guest_affil, message, side, is_private, created_at)` 단일 row | `guestbook_entries(lounge_id, guest_name, recipient_slot, message, ...)` + `guestbook_messages(guestbook_entry_id, message, ...)` 두 row를 join한 **단일 EnvelopeBase**로 정규화. `photo_url`은 무시 |
| `photos(wedding_id, photo_type='display')` | `mobile_invitations.gallery_photos: jsonb` |
| `display_heartbeats(wedding_id)` | **미도입** |
| 클라이언트 `NOTICE_MESSAGES` 상수 | `INFO_MESSAGES` 상수 (배열 그대로) |
| `BASE_URL = VITE_BASE_URL` | guest-web env 동일 패턴 |
| `__GORAE_DEMO__` 플래그 | 1차 이식에서 동등물 도입 여부 미정 |
| Supabase `messages:{weddingId}` 단일 채널 | 두 트리거(entries / messages)를 묶어 **카드는 단일 포맷**으로 변환 |
| `lastReceivedAtRef` 단일 | 두 테이블별 lastReceivedAt 두 개 (catch-up용) |
| `seedHistory([...DEFAULT_SEED + dbMessages])` | entries(message != null) + messages(entry join, photo_url 무시) 합쳐 시간순 시드 |
