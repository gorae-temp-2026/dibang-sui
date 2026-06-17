# Wedding Lounge 시나리오

## 개요

웨딩라운지는 호스트+게스트가 함께 소통하는 양방향 커뮤니티 공간이다.
라운지를 생성하거나 초대받아서 입장한 사람들만 접근 가능하다.
Dibang Wedding은 웹앱이다 (네이티브 앱 아님).

### 진입점 2가지
1. **청첩장 라운지 탭** → 입장 버튼 → Dibang Wedding 웹앱으로 리다이렉트 → 로그인
2. **현장 QR** → Guest Web 축의/메세지 플로우 → 완료 후 "사진 공유하기" → Dibang Wedding 리다이렉트

### 피드 구성 요소
- **고정글(공지)**: HostAnnouncement. 최상단 고정, 항상 최신 1개만.
- **LIVE 축하메세지**: GuestbookEntry(message 있음). 실시간 버블 형태.
- **"참석했어요"**: GuestbookEntry 생성 = 참석. message 유무와 무관하게 한 줄 표시.
- **"입장했어요"**: LoungeEntry. 청첩장에서 라운지 입장 시 생성.

### 피드 규칙
- 정렬: 최신이 위
- 페이지네이션: 무한스크롤
- 갱신: 풀다운 새로고침 + 5초 폴링 (폴링은 구현 난이도 보고 판단)
- 0건: "아직 활동이 없어요" 안내 문구

---

## 그룹 A: 현장 QR 플로우 (Guest Web → 참석 + LIVE 축하메세지)

QR 플로우는 레거시(web-mobile-application)에 이미 있음. 관계/이름 입력 프로토타입: `_prototypes/wedding-lounge/guestbook-name.html`

| # | Actor | Screen | Action | Result | Data Flow | Edge Case |
|---|-------|--------|--------|--------|-----------|-----------|
| S-01 | 현장 방문자 | Guest Web - QR 랜딩 | 현장 QR 스캔 | 누구측 하객 선택 화면 | QR URL → Guest Web | - |
| S-02 | 현장 방문자 | Guest Web - 정보 입력 | 누구측 선택 → 관계(6개 객관식 + 자유서술 40자) → 이름(10자) | 축의 단계 | 클라이언트 상태 | 관계 필수, 이름 필수 → 미입력 시 다음 비활성화 |
| S-03 | 현장 방문자 | Guest Web - 축의 | 축의금 전달 또는 건너뛰기 | 메세지 작성 화면 | 레거시 축의 플로우 | 축의도 메세지도 안 하면 다음 진행 불가 |
| S-04a | 현장 방문자 | Guest Web - 메세지 | 텍스트 메세지(이모지 가능, 60자) 작성 후 전송 | 완료 + 라운지 피드에 "참석했어요" 한 줄 + LIVE 축하메세지 버블 둘 다 표시 | POST → DB(GuestbookEntry with message) → 5초 폴링 | 같은 사람 두 번 → 기록 두 번 뜸 |
| S-04b | 현장 방문자 | Guest Web - 메세지 | 메세지 건너뛰기 (축의만) | 완료 + "참석했어요" 한 줄만 표시 | POST → DB(GuestbookEntry without message) | - |
| S-04c | 현장 방문자 | Guest Web - 완료 | "사진 공유하기" 버튼 탭 | Dibang Wedding 웹앱으로 리다이렉트 → 로그인 → 라운지 진입 | URL 리다이렉트 | 사진 기능 자체는 이번 범위 밖. 리다이렉트만 |

### 관계 카테고리 (객관식 6개)
1. 가족 / 친척
2. 친구 / 지인
3. 동문 / 동창
4. 직장 동료
5. 스승 / 제자
6. 기타 모임

자유서술(주관식)은 선택, 최대 40자.

---

## 그룹 B: 라운지 입장 (청첩장 → Dibang Wedding 웹앱)

| # | Actor | Screen | Action | Result | Data Flow | Edge Case |
|---|-------|--------|--------|--------|-----------|-----------|
| S-05 | 청첩장 방문자 | Guest Web - 청첩장 라운지 탭 | 입장 버튼 탭 | 웹 URL 리다이렉트 → 로그인 → 라운지 피드 + "○○이 입장했어요"(LoungeEntry) + Wedding List 카드 추가 | URL → Dibang Wedding → API(CreateLoungeEntry) | 이미 입장 → 그냥 라운지 진입, 기록 안 뜸 |

---

## 그룹 C: 라운지 피드 조회

| # | Actor | Screen | Action | Result | Data Flow | Edge Case |
|---|-------|--------|--------|--------|-----------|-----------|
| S-06 | Host/입장한 Guest | Dibang Wedding - 라운지 피드 | 피드 진입 | 상단: 고정글(HostAnnouncement, 100자) / 그 아래: "참석했어요" 한 줄 + LIVE 축하메세지 버블(GuestbookEntry) + "입장했어요" 한 줄(LoungeEntry) 최신순 혼합 | GET feed + 5초 폴링 + 무한스크롤 | 0건 → "아직 활동이 없어요" 안내 문구 |
| S-06b | Host/입장한 Guest | Dibang Wedding - 라운지 피드 | 풀다운 새로고침 | 최신 데이터 반영 | GET feed | - |

---

## 그룹 D: 라운지 내 활동

| # | Actor | Screen | Action | Result | Data Flow | Edge Case |
|---|-------|--------|--------|--------|-----------|-----------|
| S-07 | Host | 라운지 피드 | 공지 작성 (텍스트만, 100자) | 최상단 고정 (기존 공지 덮어씌움), 수정/삭제(soft) 가능 | POST → DB(HostAnnouncement) | - |
| S-08 | 멤버 | 라운지 피드 | 축하메세지 또는 공지에 하트 | 토글(on/off), 1인 1하트 | POST → DB | - |
| S-09 | 멤버 | 라운지 피드 | 축하메세지 또는 공지에 댓글 (인스타식 인라인, 50자, 1depth, 수정 불가, 본인만 삭제) | 댓글 카운트 +1 | POST → DB | - |

---

## 그룹 E: 라운지 관리

| # | Actor | Screen | Action | Result | Data Flow | Edge Case |
|---|-------|--------|--------|--------|-----------|-----------|
| S-10 | Host | Dibang Wedding - 결혼식 만들기 | 결혼식 생성 | 라운지 자동 생성 (Wedding 1:1 WeddingLounge) | CreateWedding → CreateWeddingLounge + CreateMoiGatherPlace | - |
| S-11 | - | - | 별도 초대 없음 | 청첩장 공유(카톡/문자/QR) → 수신자가 라운지 탭 입장 or QR → 사진 공유하기로 자연 유입 | - | - |

---

## 이번 범위에서 제외

- 사진 공유 기능 (S-04c의 리다이렉트만 구현, 사진 기능 자체는 나중)
- 이벤트 알림 (축가 선정, 화환 선물 등 — 확장 기능)
- 방명록 카드 형태 (별도 카드 UI 없음)
- 참석/입장 기록에 대한 하트/댓글

## 참고 프로토타입

- 피드 UI: `_prototypes/wedding-lounge/wedding-lounge-feed.html`
- 관계/이름 입력: `_prototypes/wedding-lounge/guestbook-name.html`
- 전체 라운지: `_prototypes/wedding-lounge/모이가모인곳_v2.0.html`

## 도메인 모델 매핑

| 피드 요소 | 도메인 엔티티 | 비고 |
|-----------|--------------|------|
| 고정글(공지) | HostAnnouncement | host_id + message, 최신 1개만 고정 |
| LIVE 축하메세지 | GuestbookEntry (message 있음) | guest_name + 관계 태그 + message |
| "참석했어요" | GuestbookEntry | 생성 자체가 참석 증거 |
| "입장했어요" | LoungeEntry | moi_id + moi_gather_place_id |
| 하트 | v3_feed_hearts (신규) | 다형성 target_type + target_id |
| 댓글 | v3_feed_comments (신규) | 다형성 target_type + target_id |

---

## 구현 명세

### 1. DB Schema 변경

#### 1-1. 기존 테이블 수정: `v3_guestbook_entries`

> ⚠ **2026-05-25 후속 결정**: `message` 컬럼 자체 드롭. 본문은 `v3_guestbook_messages`로 일원화. 마이그레이션 `20260525130000_v3_drop_guestbook_entries_message.sql` 참조. 아래 표의 message 관련 행은 더 이상 유효하지 않음(이력 보존).

현재 관계 정보가 없고 message가 NOT NULL.

| 변경 | 현재 | 변경 후 | 이유 |
|------|------|---------|------|
| `message` | `TEXT NOT NULL` | ~~`TEXT` (nullable)~~ → **드롭(2026-05-25)** | S-04b → 후속: 본문 일원화 |
| 추가 | - | `recipient_slot TEXT NOT NULL` | 누구측 하객 (6종: groom/bride/groom_father/groom_mother/bride_father/bride_mother) |
| 추가 | - | `relation_category TEXT NOT NULL` | 관계 객관식 6종 (`가족/친척 / 친구/지인 / 동문/동창 / 직장동료 / 스승/제자 / 기타모임`) |
| 추가 | - | `relation_detail TEXT` | 관계 자유서술 (40자, 선택) |
| 추가 | - | ~~`CHECK (message ...)`~~ → **제약·컬럼 동시 드롭(2026-05-25)** | 본문 일원화 |
| 추가 | - | `CHECK (relation_detail IS NULL OR char_length(relation_detail) <= 40)` | 40자 제한 |

#### 1-2. 기존 테이블 수정: `v3_host_announcements`

현재 soft delete, 고정, 수정 지원 없음.

| 변경 | 현재 | 변경 후 | 이유 |
|------|------|---------|------|
| 추가 | - | `is_pinned BOOLEAN NOT NULL DEFAULT false` | 고정 기능 (최신 1개만) |
| 추가 | - | `deleted_at TIMESTAMPTZ` | soft delete |
| 추가 | - | `updated_at TIMESTAMPTZ` | 수정 이력 |
| 추가 | - | `CHECK (char_length(message) <= 100)` | 100자 제한 |

#### 1-3. 신규 테이블: `v3_feed_hearts`

다형성(polymorphic) 설계. 대상이 GuestbookEntry 또는 HostAnnouncement.

```sql
CREATE TABLE v3_feed_hearts (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES v3_users(id) ON DELETE CASCADE,
    target_type TEXT        NOT NULL CHECK (target_type IN ('guestbook_entry', 'host_announcement')),
    target_id   UUID        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, target_type, target_id)  -- 1인 1하트 (토글)
);

CREATE INDEX idx_v3_feed_hearts_target ON v3_feed_hearts(target_type, target_id);
CREATE INDEX idx_v3_feed_hearts_user ON v3_feed_hearts(user_id);
```

#### 1-4. 신규 테이블: `v3_feed_comments`

```sql
CREATE TABLE v3_feed_comments (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES v3_users(id) ON DELETE CASCADE,
    target_type TEXT        NOT NULL CHECK (target_type IN ('guestbook_entry', 'host_announcement')),
    target_id   UUID        NOT NULL,
    message     TEXT        NOT NULL CHECK (char_length(message) <= 50),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ  -- soft delete (본인만)
);

CREATE INDEX idx_v3_feed_comments_target ON v3_feed_comments(target_type, target_id);
CREATE INDEX idx_v3_feed_comments_user ON v3_feed_comments(user_id);
```

#### 마이그레이션 파일

`{timestamp}_v3_wedding_lounge_feed.sql` 1개 — ALTER TABLE 2개 + CREATE TABLE 2개 + INDEX

---

### 2. API 변경

#### 2-1. 기존 엔드포인트 수정

| 엔드포인트 | 변경 내용 |
|------------|----------|
| `POST /lounges/{loungeId}/guestbook` (createGuestbookEntry) | request body에 `recipient_slot`, `relation_category`, `relation_detail` 추가. `message`를 optional로 |
| `PATCH /announcements/{announcementId}` (updateAnnouncement) | request body에 `is_pinned` 추가 |

#### 2-2. 신규 엔드포인트 (6개)

| Method | Path | operationId | 접근 정책 | 소비자 | 설명 |
|--------|------|-------------|-----------|--------|------|
| DELETE | `/announcements/{announcementId}` | deleteAnnouncement | host | Dibang Wedding | 공지 삭제 (soft delete) |
| GET | `/lounges/{loungeId}/feed` | listFeed | authenticated | Dibang Wedding | 피드 통합 조회 — GuestbookEntry + LoungeEntry + HostAnnouncement 합쳐서 최신순 cursor pagination. 각 항목에 heart_count, comment_count, my_heart 포함 |
| POST | `/feed-hearts` | toggleFeedHeart | authenticated | Dibang Wedding | 하트 토글 — `{ target_type, target_id }` |
| POST | `/feed-comments` | createFeedComment | authenticated | Dibang Wedding | 댓글 작성 — `{ target_type, target_id, message }` |
| GET | `/feed-comments` | listFeedComments | authenticated | Dibang Wedding | 댓글 목록 — `?target_type=x&target_id=y` |
| DELETE | `/feed-comments/{commentId}` | deleteFeedComment | authenticated (본인) | Dibang Wedding | 댓글 삭제 (soft delete) |

#### 2-3. 피드 API 응답 구조: `GET /lounges/{loungeId}/feed`

3종류의 데이터를 합쳐서 시간순으로 반환:

```json
{
  "items": [
    {
      "type": "guestbook_entry",
      "id": "...",
      "created_at": "...",
      "data": {
        "guest_name": "정○은",
        "recipient_slot": "bride",
        "relation_category": "가족/친척",
        "relation_detail": "사촌언니",
        "message": "언니 넘 예쁘다..."
      },
      "heart_count": 38,
      "comment_count": 2,
      "my_heart": true
    },
    {
      "type": "lounge_entry",
      "id": "...",
      "created_at": "...",
      "data": {
        "visitor_name": "김*○",
        "recipient_slot": "groom",
        "relation_category": "가족/친척"
      }
    },
    {
      "type": "host_announcement",
      "id": "...",
      "created_at": "...",
      "data": {
        "message": "잘살게요",
        "is_pinned": true
      },
      "heart_count": 142,
      "comment_count": 23,
      "my_heart": false
    }
  ],
  "next_cursor": "..."
}
```

- `lounge_entry` 타입에는 heart_count, comment_count 없음 (참석/입장 기록에 하트/댓글 제외)
- `host_announcement`에서 `is_pinned: true`인 항목은 클라이언트가 최상단 고정 처리
- `guest_name`, `visitor_name`은 이름 마스킹 적용 (API_CONVENTIONS.md 참조)

---

### 3. Go 코드 변경

| 파일 | 상태 | 작업 |
|------|------|------|
| `handler_guestbook.go` | 없음 → 신규 | createGuestbookEntry, listGuestbookEntries 구현 |
| `handler_announcements.go` | 없음 → 신규 | CRUD 구현 + deleteAnnouncement 추가 |
| `handler_feed.go` | 없음 → 신규 | listFeed (통합 피드) |
| `handler_feed_hearts.go` | 없음 → 신규 | toggleFeedHeart |
| `handler_feed_comments.go` | 없음 → 신규 | createFeedComment, listFeedComments, deleteFeedComment |
| `service_guestbook.go` | 없음 → 신규 | GuestbookService interface + 구현 |
| `service_announcements.go` | 없음 → 신규 | AnnouncementService interface + 구현 |
| `service_feed.go` | 없음 → 신규 | FeedService interface + 구현 |
| `server.go` | 수정 | Server struct에 Feed, FeedHearts, FeedComments 서비스 추가 |
| `api-contract.yaml` | 수정 | 6개 엔드포인트 추가 (30 → 36개) |
| `API_ENDPOINT_MAP.md` | 수정 | yaml과 동기화 |

---

### 4. 도메인 모델 수정 (`_architecture/DOMAIN_MODEL_SUMMARY.md`)

DB/API 변경 전에 최상위 설계 문서를 먼저 수정한다. 도메인 모델에 없는 엔티티/필드를 DB에 만들면 설계와 구현이 괴리된다.

#### 4-1. Glossary 추가

**FeedHeart**
- **무엇:** 라운지 피드의 항목(GuestbookEntry 또는 HostAnnouncement)에 대한 하트 반응. 1인 1하트, 토글 방식.
- **무엇이 아님:** 청첩장 하트(MobileInvitation.heart_count)가 아님 (피드 항목에 대한 반응).

**FeedComment**
- **무엇:** 라운지 피드의 항목(GuestbookEntry 또는 HostAnnouncement)에 대한 댓글. 인스타/스레드식 인라인 표시. 1depth만.
- **무엇이 아님:** 방명록 메세지가 아님 (피드 항목에 달리는 반응). 대댓글 없음.

#### 4-2. Entities 수정/추가

**GuestbookEntry — 필드 추가**
- `recipient_slot` — 누구측 하객 (6종: 'groom' | 'bride' | 'groom_father' | 'groom_mother' | 'bride_father' | 'bride_mother')
- `relation_category` — 관계 객관식 6종 ('가족/친척' | '친구/지인' | '동문/동창' | '직장동료' | '스승/제자' | '기타모임')
- `relation_detail` — 관계 자유서술 (선택, 40자)
- `message` — NOT NULL → nullable 변경 (축의만 하고 메세지 안 쓰는 케이스)

**HostAnnouncement — 필드 추가**
- `is_pinned` — 고정 여부 (최신 1개만)
- `deleted_at` — soft delete
- `updated_at` — 수정 이력

**FeedHeart — 신규**
- `id`, `user_id`, `target_type`, `target_id`, `created_at`

**FeedComment — 신규**
- `id`, `user_id`, `target_type`, `target_id`, `message`, `created_at`, `deleted_at`

#### 4-3. Aggregates 추가

**FeedHeart Aggregate**
- **Root**: FeedHeart
- **참조**: User (`user_id`), GuestbookEntry 또는 HostAnnouncement (`target_id`, 다형성)

**FeedComment Aggregate**
- **Root**: FeedComment
- **참조**: User (`user_id`), GuestbookEntry 또는 HostAnnouncement (`target_id`, 다형성)

#### 4-4. Invariants 추가

**GuestbookEntry — 추가/변경**
- `message`는 optional (nullable). 존재 시 최대 60자
- `recipient_slot` 필수 (6종: 'groom' | 'bride' | 'groom_father' | 'groom_mother' | 'bride_father' | 'bride_mother')
- `relation_category` 필수 (6종 중 하나)
- `relation_detail` 선택, 최대 40자
- `guest_name` 최대 10자

**HostAnnouncement — 추가**
- `message` 최대 100자
- `is_pinned`가 true인 HostAnnouncement는 같은 lounge 내에서 최대 1개 (새 공지 고정 시 기존 고정 해제)
- soft delete: `deleted_at` IS NOT NULL이면 조회에서 제외

**FeedHeart**
- 같은 user_id + target_type + target_id 조합은 유일 (1인 1하트)
- target_type은 'guestbook_entry' 또는 'host_announcement'만 허용

**FeedComment**
- `message` 필수, 최대 50자
- 삭제는 본인만 가능 (soft delete)
- 수정 불가
- 대댓글 없음 (1depth)
- target_type은 'guestbook_entry' 또는 'host_announcement'만 허용

#### 4-5. Events + Commands 추가

| Event | Command |
|---|---|
| FeedHeartToggled | ToggleFeedHeart |
| FeedCommentCreated | CreateFeedComment |
| FeedCommentDeleted | DeleteFeedComment |
| HostAnnouncementDeleted | DeleteHostAnnouncement |

#### 4-6. Use Cases 추가

**Host — 추가**
- 공지 삭제 → `DeleteHostAnnouncement`

**공통 (Host/Guest 모두) — 추가**
- 피드 하트 토글 → `ToggleFeedHeart`
- 피드 댓글 작성 → `CreateFeedComment`
- 피드 댓글 삭제 (본인) → `DeleteFeedComment`

#### 4-7. 관계 요약 수정

```
WeddingLounge (1:1 Wedding)
  ├─ MoiGatherPlace (1:1)
  │     ├─ LoungeEntry (1:N)
  │     └─ InteriorItem (1:N)
  ├─ GuestbookEntry (1:N)
  │     ├─ FeedHeart (1:N, target_type='guestbook_entry')
  │     └─ FeedComment (1:N, target_type='guestbook_entry')
  └─ HostAnnouncement (1:N)
        ├─ FeedHeart (1:N, target_type='host_announcement')
        └─ FeedComment (1:N, target_type='host_announcement')
```

---

### 5. 작업 순서

```
0. 도메인 모델: DOMAIN_MODEL_SUMMARY.md 수정 (Glossary, Entities, Aggregates, Invariants, Events+Commands, Use Cases, 관계 요약)
1. DB: 마이그레이션 작성 → 로컬 적용 → d2 ERD 갱신
2. API Contract: api-contract.yaml 업데이트 → oapi-codegen 재생성
3. API: service interface → test → handler 구현 (TDD)
4. 프론트: 시나리오대로 연결
```
