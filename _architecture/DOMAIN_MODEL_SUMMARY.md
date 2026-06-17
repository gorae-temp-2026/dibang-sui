# 도메인 모델 — 1차 정리

## Glossary

### User
**무엇:** 디방 서비스의 계정 주체. 이메일·전화번호로 식별되는 한 사람. 영속적인 Moi 1개를 보유 (1:1).

**무엇이 아님:** Moi(아바타)가 아님 (Moi의 시각적 표현 뒤에 있는 실제 인물). Host/Guest 같은 *역할*도 아님 (역할은 특정 Wedding 컨텍스트에서 부여됨).

### Moi
**무엇:** 신뢰네트워크를 구성하는 인물들을 시각화한 아바타. 어원은 프랑스어 "나(me)", 베트남어 "초대(mời)", 핀란드어 "안녕(moi)", 한글 '모이는'의 '모이' — 모두 신뢰네트워크와 관련된 의미.

**무엇이 아님:** User 자체가 아님 (User의 시각적 표현). 단순 캐릭터 그래픽이 아닌 *신뢰네트워크의 노드*.

### Wedding
**무엇:** 한 결혼식 이벤트. Host(들)이 만드는 최상위 단위. 디지털 라운지(WeddingLounge)와 청첩장(MobileInvitation)을 가짐.

**무엇이 아님:** 오프라인 결혼식 자체가 아님 (디지털 표상). 청첩장이나 라운지 *그 자체*가 아님 (그것들의 *컨테이너*).

### WeddingInfo
**무엇:** Wedding의 *사실 정보*. 신랑·신부·부모 이름, 날짜·시간, 장소(예식장 이름·주소·홀), 계좌정보 등을 담는 Value Object.

**무엇이 아님:** Wedding 그 자체가 아님 (Wedding의 일부). 청첩장의 디자인·표현이 아닌 *내용*.

### MobileInvitation
**무엇:** Wedding을 *외부에 공유하는 디지털 청첩장*. 디자인 템플릿, 인사말, 갤러리 사진 등으로 WeddingInfo를 시각화. 고유 링크로 공유 가능.

**무엇이 아님:** WeddingInfo가 아님 (정보를 *참조해서 보여주는 옷*). 라운지가 아님 (라운지는 *입장 후 상호작용* 공간, 청첩장은 *입장 전 안내*).

### WeddingLounge
**무엇:** 한 결혼식의 신뢰네트워크를 시각화한 디지털 공간. MoiGatherPlace, 피드, 사진 등 Host와 Guest의 상호작용이 일어나는 영역들을 포함.

**무엇이 아님:** 결혼식 자체가 아님 (Wedding의 일부). MoiGatherPlace 자체가 아님 (그 컨테이너).

### MoiGatherPlace
**무엇:** 신뢰네트워크 시각화 중 *이미지화*를 담당하는 영역. WeddingLounge 안에서 Moi 캐릭터와 아이템 이미지로 깊은 시각 표현을 제공하는 공간.

**무엇이 아님:** WeddingLounge 자체가 아님 (그 일부). 피드·사진 같은 다른 시각화 영역과 구분.

> **구현 현황 (R2, 2026-05-18):** 모이가모인곳(Moi 시각화 공간)은 아직 미구현이며 추후 발전 예정. 현재 LoungeCheckIn는 MoiGatherPlace 경유 없이 User:Lounge 입장 로그로 단순화됨. 시각화 도입 시 이 경계를 재설계한다.
>
> **구현 현황 (R4, 2026-05-18):** Moi·MoiItem·Ium·InteriorItem·MoiGatherPlace 도메인은 계약상 선언돼 있으나 백엔드 501·프론트 화면 전무(양층 미구현). api-contract.yaml의 14개 operation을 `deprecated: true` + "[미구현·추후]"로 표기(SDK `@deprecated` 전파). 단 `getUser`는 클러스터에서 분리 — 이름 마스킹(API_CONVENTIONS §3) 의존 cross-cutting이라 deprecated 아님, "우선 구현 예정"으로 분류(별도 후속 태스크 권고). `getMoi`는 재구현 시 §3 소유자 이름 마스킹 필수.

### LoungeCheckIn
**무엇:** 한 User가 특정 WeddingLounge에 입장했다는 멤버십 기록. 한 user당 한 lounge에 정확히 1건이며, 재입장해도 행이 늘지 않는다(입장 시점 이름 `visitor_name`과 선택적 관계 정보를 담는 하객 정체성 단위).

**무엇이 아님:** User 자체가 아님 (입장 멤버십의 기록). 입장할 때마다 쌓이는 방문 이력 로그가 아님 (user×lounge 1건 멤버십 — AUD-0 결정 2026-05-19). (구 정의 "Moi가 MoiGatherPlace에 들어옴"은 R2에서 User:Lounge 그레인으로 정정 — Moi:User·GatherPlace:Lounge 하드 1:1이라 무손실 환산)

### GuestbookEntry
**무엇:** 한 Guest가 특정 라운지에 남기는 방명록 정체성 단위. 누가(`guest_name`·`guest_id`), 어느 라운지에(`lounge_id`), 어떤 관계로(`recipient_slot`·`relation_category`·`relation_detail`) 참석했는지를 담는다. **본문은 GuestbookMessage로 1:N 누적** (2026-05-25 본문 일원화로 `entries.message` 컬럼 드롭).

**무엇이 아님:** 방명록 전체가 아님 (한 사람의 항목). 메시지 한 줄 자체가 아님 (개별 메시지는 GuestbookMessage이고, Entry는 그 소유자·정체성).

### GuestbookMessage
**무엇:** GuestbookEntry에 달리는 개별 방명록 메시지. 한 Entry(한 사람의 라운지 정체성)에 여러 GuestbookMessage가 시간순으로 누적된다 (1:N). 라운지 피드·스토리에 노출되는 실제 글이며, 라운지 내 '글 작성'('+')의 산출물이다.

**무엇이 아님:** GuestbookEntry가 아님 (Entry의 자식 메시지). FeedComment가 아님 (FeedComment는 피드 항목에 달리는 반응 댓글, GuestbookMessage는 방명록 본문 메시지 — 단 FeedComment·FeedHeart의 target이 될 수는 있음).

### GuestbookMessageView
**무엇:** 한 User가 특정 GuestbookMessage(피드 글)를 본 사실의 기록. 작성자 본인은 제외하고, 동일 (메시지, 조회자) 1건만 멱등 적재한다. 조회수(`GuestbookMessage.view_count`)의 원천.

**무엇이 아님:** FeedHeart가 아님 (반응이 아닌 단순 열람 기록). 노출 UI가 아님 (집계된 조회수만 카드에 표시, 열람자 목록은 비노출).

### InteriorItem
**무엇:** MoiGatherPlace를 꾸미기 위한 조형물들.

**무엇이 아님:** MoiItem이 아님 (Moi가 직접 착용/사용하는 게 아닌, 공간에 배치되는 것).

### HostAnnouncement
**무엇:** 웨딩라운지에서 호스트가 게스트들을 위해 생성한 공지사항.

**무엇이 아님:** 게스트가 작성하는 게 아님 (호스트 전용). 시스템 알림이 아님 (호스트의 의도된 발표).

### CashGift
**무엇:** 하객이 결혼식 혼주에게 전달하는 축의금 기록. 금액, 결제 방식, 수령인 슬롯 정보를 포함.

**무엇이 아님:** 실제 송금 트랜잭션이 아님 (앱에서 딥링크로 송금 유도 후 기록만 남기는 것). GuestbookEntry가 아님 (축의금과 방명록은 별도 엔티티, guestbook_entry_id로 연결).

### FeedHeart
**무엇:** 라운지 피드의 항목(GuestbookEntry 또는 HostAnnouncement)에 대한 하트 반응. 1인 1하트, 토글 방식.

**무엇이 아님:** 청첩장 하트(MobileInvitation.heart_count)가 아님 (피드 항목에 대한 반응).

### FeedComment
**무엇:** 라운지 피드의 항목(GuestbookEntry, HostAnnouncement, 또는 GuestbookMessage)에 대한 댓글. 인스타/스레드식 인라인 표시. 1depth만.

**무엇이 아님:** GuestbookMessage 자체가 아님 (피드 항목에 달리는 반응 댓글이며, 방명록 본문 메시지와 구분 — 단 GuestbookMessage를 target으로 가리킬 수는 있음). 대댓글 없음.

### MoiItem
**무엇:** 모이가 직접 착용, 사용할 수 있는 아이템들.

**무엇이 아님:** InteriorItem이 아님 (공간에 배치하는 게 아닌, 모이 자체에 적용되는 것).

### Ium
**무엇:** User와 User 간의 관계. 신뢰네트워크의 핵심 개념. User들과 Ium들의 집합이 '신뢰'로 표현됨.

**무엇이 아님:** User 자체가 아님 (User들 사이의 *연결*). 단순 식별 관계가 아닌 *신뢰의 단위*.

### Host (역할)
**무엇:** 웨딩의 호스트로 정해진 유저들. 해당 웨딩에서만 호스트이며, 다른 웨딩에서는 게스트가 될 수 있고 다시 호스트가 될 수도 있음.

**무엇이 아님:** User의 영구 속성이 아님 (특정 Wedding 컨텍스트에서 부여되는 *역할*).

### Guest (역할)
**무엇:** 웨딩에 Host가 아닌 유저들.

**무엇이 아님:** 외부인이 아님 (해당 웨딩에 참여한 사람). 영구 역할이 아님 (다른 웨딩에선 Host일 수 있음).

### Manager (역할)
**무엇:** 기본적으로 게스트지만 축가·축의금·부케 등 들러리로서 역할하는 유저들.

**무엇이 아님:** Host가 아님. 단순 Guest도 아님 (역할이 부여된 Guest).

### 신뢰네트워크
**무엇:** 인간이 사회적 동물로서 생존을 위해 진화시켜온 관계망. 결혼식·장례식 등에서 기쁨과 슬픔을 나누는 행위는 본질적으로 *'관계를 사기 위한 에너지·재화의 교환'*이며, 감정 교류는 *관계 유지를 위한 에너지*. 신뢰네트워크는 이러한 관계의 구조 자체. 디방 서비스가 궁극적으로 발굴·활용하여 부가가치를 창출하고 인간 사회에 긍정적 영향을 주는 방향으로 개발될 때 가장 중요한 핵심 개념.

**무엇이 아님:** 단순 SNS 친구 관계가 아님 (생존과 직결된 본질적 관계). 디지털 표상에 한정되지 않음 (오프라인의 관계 행위 모두 포함).

### 이음
**무엇:** Ium의 한국어 표현. 인간 사이의 '관계'를 표현한 개념.

**무엇이 아님:** Ium과 다른 개념이 아님 (같은 것의 한국어 명칭).

### HostInvite
**무엇:** Host(신랑/신부)가 다른 사람을 그 결혼식의 Host 슬롯(양가 부모 4 + 배우자)에 초대하는 토큰 기반 초대장.

**무엇이 아님:** Host 역할 자체가 아님 (역할 부여를 위한 *초대 수단*). 청첩장 공유가 아님 (라운지·웨딩리포트 권한을 가진 Host로의 합류 절차).

## Entities

### User
- `id`
- `name`, `email`, `phone`
- `profile_image_url`

### Wedding
- `id`
- `status`
- `host_groom`, `host_bride`, `host_groom_father`, `host_groom_mother`, `host_bride_father`, `host_bride_mother`
- `wedding_info: WeddingInfo`

### WeddingInfo
- `groom_name`, `bride_name`
- `groom_father_name`, `groom_mother_name`, `bride_father_name`, `bride_mother_name`
- `groom_father_deceased`, `groom_mother_deceased`, `bride_father_deceased`, `bride_mother_deceased` (boolean, 기본 false — 고인 표기)
- `date`, `time`
- `venue: Venue`
- 계좌 정보 (각 host별 Account):
  - `groom_account: Account`
  - `bride_account: Account`
  - `groom_father_account: Account`
  - `groom_mother_account: Account`
  - `bride_father_account: Account`
  - `bride_mother_account: Account`

### MobileInvitation
- `id`, `wedding_id`
- `design_template_id`
- `custom_message`
- `visited_count`, `heart_count`
- `gallery_photos[]`, `cover_image`
- `cover_text_config` (jsonb, nullable — 커버 문구·폰트 설정)
- `slug` (필수, UNIQUE — 공유 링크 식별자)

### WeddingLounge
- `id`, `wedding_id` [1:1]
- `name`

### MoiGatherPlace
- `id`, `lounge_id` [1:1]
- `type`

### LoungeCheckIn
- `id`
- `user_id` [N:1 → User], `lounge_id` [N:1 → WeddingLounge]
- `visitor_name` (필수 — 입장 시점 User.name 스냅샷)
- `recipient_slot` (선택, nullable — 'groom' | 'bride' | 'groom_father' | 'groom_mother' | 'bride_father' | 'bride_mother')
- `relation_category` (선택, nullable)
- `relation_detail` (선택, nullable)
- `created_at`

### GuestbookEntry
- `id`, `lounge_id` [1:N]
- `guest_name`, `guest_id`
- `recipient_slot` ('groom' | 'bride' | 'groom_father' | 'groom_mother' | 'bride_father' | 'bride_mother')
- `relation_category` ('가족/친척' | '친구/지인' | '동문/동창' | '직장동료' | '스승/제자' | '기타모임')
- `relation_detail` (선택, 40자)
- ~~`message`~~ (**2026-05-25 컬럼 드롭** — 본문은 GuestbookMessage로 일원화)

### GuestbookMessage
- `id`, `guestbook_entry_id` [N:1 → GuestbookEntry]
- `message` (필수, 최대 70자)
- `photo_url` (선택, nullable — 첨부 사진 1장 /uploads URL)
- `view_count` (파생, 서버 집계 readOnly — 작성자 본인 제외 누적)
- `created_at`

### GuestbookMessageView
- `id`, `guestbook_message_id` [N:1 → GuestbookMessage]
- `viewer_id` [N:1 → User]
- `viewed_at`

### InteriorItem
- `id`, `moi_gather_place_id` [1:N]
- `name`, `type`, `size`, `image`
- `status` (`'placed'` | `'unplaced'`)
- `position` (배치된 경우만)

### HostAnnouncement
- `id`, `lounge_id` [1:N]
- `host_id`, `message`
- `is_pinned` (고정 여부, 최신 1개만)
- `deleted_at` (soft delete)
- `updated_at` (수정 이력)

### Moi
- `id`, `user_id` [1:1]
- `equipped_items: { [slot]: MoiItem.id }`

### MoiItem
- `id`, `moi_id` [1:N]
- `name`, `type`, `slot`

### CashGift
- `id`, `wedding_id`, `guest_name`, `guest_id` (nullable)
- `recipient_slot` ('groom' | 'bride' | 'groom_father' | 'groom_mother' | 'bride_father' | 'bride_mother')
- `relation_category` ('가족/친척' | '친구/지인' | '동문/동창' | '직장동료' | '스승/제자' | '기타모임')
- `relation_detail` (선택, 40자)
- `amount` (정수)
- `pay_method` ('transfer' | 'kakaopay' | 'toss' | 'cash')
- `guestbook_entry_id` (nullable)
- `created_at`

### FeedHeart
- `id`, `user_id`, `target_type`, `target_id`, `created_at`

### FeedComment
- `id`, `user_id`, `target_type`, `target_id`, `message`, `created_at`, `deleted_at`

### Ium
- `id`
- `relation_type`, `relation_label`
- `from_user_id` [1:N], `to_user_id` [1:N]

### HostInvite
- `id`
- `wedding_id` [N:1]
- `slot` ('groom' | 'bride' | 'groom_father' | 'groom_mother' | 'bride_father' | 'bride_mother')
- `token` (unique), `status` ('pending' | 'accepted' | 'cancelled')
- `invited_user_id` (수락 후 할당, nullable), `accepted_at` (nullable)

## Value Objects

### WeddingInfo
Wedding 내부의 사실 정보 묶음. (Wedding Aggregate에 속함)
- 이름 정보: `groom_name`, `bride_name`, `groom_father_name`, `groom_mother_name`, `bride_father_name`, `bride_mother_name`
- 고인 표기: `groom_father_deceased`, `groom_mother_deceased`, `bride_father_deceased`, `bride_mother_deceased` (boolean, 기본 false)
- 일시: `date`, `time`
- Venue (VO)
- Account 6개 (VO)

### Venue
예식 장소 정보.
- `venue_name`, `venue_address`, `venue_hall`

### Account
계좌 정보. 6명(groom, bride, 양가 부모)별로 하나씩.
- `bank`, `address`

### Position
InteriorItem의 배치 좌표.
- `x`, `y` (또는 `top`, `left` 등)

## 관계 요약

```
User ─┬─ Moi (1:1)
      ├─ Ium (M:N via from/to)
      └─ LoungeCheckIn (1:N)   [user_id × lounge_id, lounge당 1건]

Wedding ─┬─ WeddingInfo (1:1, 내부 VO)
         ├─ MobileInvitation (1:N)
         ├─ CashGift (1:N)
         ├─ HostInvite (1:N)
         └─ WeddingLounge (1:1)
              ├─ LoungeCheckIn (1:N)          [user_id × lounge_id, 1건/멤버십 — R2 그레인]
              ├─ MoiGatherPlace (1:1)
              │     └─ InteriorItem (1:N)
              ├─ GuestbookEntry (1:N)
              │     ├─ GuestbookMessage (1:N)
              │     │     ├─ GuestbookMessageView (1:N, 본인 제외·중복 멱등)
              │     │     └─ FeedComment (1:N, target_type='guestbook_message', UI 비노출)
              │     ├─ FeedHeart (1:N, target_type='guestbook_entry')
              │     └─ FeedComment (1:N, target_type='guestbook_entry')
              └─ HostAnnouncement (1:N)
                    ├─ FeedHeart (1:N, target_type='host_announcement')
                    └─ FeedComment (1:N, target_type='host_announcement')

Moi ─── MoiItem (1:N)
```

## Aggregates

### User Aggregate
- **Root**: User
- **포함**: User

### Moi Aggregate
- **Root**: Moi
- **포함**: Moi
- **참조**: User (`user_id`), MoiItem (`equipped_items`)

### MoiItem Aggregate
- **Root**: MoiItem
- **참조**: Moi (`moi_id`)

### Wedding Aggregate
- **Root**: Wedding
- **포함**: Wedding, WeddingInfo (VO), WeddingLounge, MoiGatherPlace, MobileInvitation (1:N)
- **참조**: User (host 6슬롯)

### GuestbookEntry Aggregate
- **Root**: GuestbookEntry (각 항목이 독립)
- **포함**: GuestbookEntry, GuestbookMessage (1:N), GuestbookMessageView (GuestbookMessage 1:N — Entry 삭제 시 CASCADE 연쇄)
- **참조**: WeddingLounge (`lounge_id`), User (`guest_id`, optional)

### HostAnnouncement Aggregate
- **Root**: HostAnnouncement
- **참조**: WeddingLounge (`lounge_id`), User (`host_id`)

### InteriorItem Aggregate
- **Root**: InteriorItem
- **참조**: MoiGatherPlace (`moi_gather_place_id`)

### LoungeCheckIn Aggregate
- **Root**: LoungeCheckIn
- **참조**: User (`user_id`), WeddingLounge (`lounge_id`)

### CashGift Aggregate
- **Root**: CashGift
- **참조**: Wedding (`wedding_id`), User (`guest_id`, optional), GuestbookEntry (`guestbook_entry_id`, optional)

### FeedHeart Aggregate
- **Root**: FeedHeart
- **참조**: User (`user_id`), GuestbookEntry 또는 HostAnnouncement (`target_id`, 다형성)

### FeedComment Aggregate
- **Root**: FeedComment
- **참조**: User (`user_id`), GuestbookEntry / HostAnnouncement / GuestbookMessage (`target_id`, 다형성 3종)

### Ium Aggregate
- **Root**: Ium
- **참조**: User × 2 (`from_user_id`, `to_user_id`)

### HostInvite Aggregate
- **Root**: HostInvite
- **참조**: Wedding (`wedding_id`), User (`invited_user_id`, 수락 후)

## Invariants

### User
- `email`은 unique
- `email`은 형식 검증을 통과해야 함
- `name` 필수
- 정확히 1개의 Moi를 가짐 (1:1)

### Moi
- 정확히 1명의 User에 속함 (`user_id` 필수)
- `equipped_items`가 가리키는 아이템들은 본인이 소유한 MoiItem만 허용

### Wedding
- Host는 최소 1명, 최대 6명 (groom, bride, 양가 부모 4명 중)
- `wedding_info` 필수 (1:1)
- WeddingLounge 정확히 1개 (1:1)
- MobileInvitation 최소 1개 (1:N) — 복합 생성 시 1개 생성, 이후 추가 가능 (FE는 현재 추가 생성 잠금)
- `status`는 정해진 enum 값

### WeddingInfo
- `date`, `time` 필수
- `venue_name`, `venue_address` 필수
- `groom_name`, `bride_name` 둘 다 필수

### MobileInvitation
- 정확히 1개의 Wedding에 속함 (`wedding_id`). Wedding : MobileInvitation = 1:N (한 Wedding이 청첩장 여러 개 보유 가능, 최소 1개)
- `design_template_id` 필수
- `slug` 필수 (NOT NULL, UNIQUE). 결혼식 생성 시 클라이언트가 입력

### WeddingLounge
- 정확히 1개의 Wedding에 속함 (`wedding_id`, 1:1)
- `name` 필수

### MoiGatherPlace
- 정확히 1개의 WeddingLounge에 속함 (`lounge_id`, 1:1)
- `type` 필수

### LoungeCheckIn
- `user_id`, `lounge_id` 필수 (라운지 입장은 로그인 필수, Host도 가능)
- `visitor_name` 필수 (입장 시점 User.name)
- `recipient_slot`·`relation_category`·`relation_detail`는 선택(nullable). DB CHECK 미적용 — GuestbookEntry/CashGift의 동명 컬럼(NOT NULL + 6종 CHECK)과 달리, LoungeCheckIn에서는 형식 강제가 앱 레벨에만 존재
- 한 user당 한 lounge에 1건 (하객 정체성/멤버십 기록 — 재입장해도 행이 늘지 않음). **DB UNIQUE (user_id, lounge_id)로 강제** (마이그레이션 `20260519000000_v3_lounge_check_in_unique_user_lounge.sql`; 생성은 `ON CONFLICT (user_id, lounge_id) DO NOTHING` + 충돌 시 기존 행 재조회하는 race-safe get-or-create). AUD-0 결정(2026-05-19)으로 종전 "앱 레벨 보장"이 아니라 DB 강제로 확정

### GuestbookEntry
- `lounge_id` 필수
- `guest_name` 필수, 최대 10자
- `guest_id`는 옵션 (비로그인으로 방명록 작성 가능)
- `recipient_slot` 필수 (6종: 'groom' | 'bride' | 'groom_father' | 'groom_mother' | 'bride_father' | 'bride_mother')
- `relation_category` 필수 (6종 중 하나)
- `relation_detail` 선택, 최대 40자
- `message`는 optional (nullable). 존재 시 최대 60자 (입장 시 첫 메시지)

### GuestbookMessage
- `guestbook_entry_id` 필수 (부모 GuestbookEntry가 존재해야만 생성 가능)
- `message` 필수, 최대 60자
- `photo_url`은 선택(nullable). 첨부 사진 0~1장
- `view_count`는 서버 파생값(readOnly) — GuestbookMessageView를 작성자 본인 제외 집계
- 부모 GuestbookEntry 삭제 시 함께 삭제 (ON DELETE CASCADE)
- 한 GuestbookEntry는 0개 이상의 GuestbookMessage를 시간순으로 가짐 (1:N)
- 피드 글(GuestbookMessage)에 대한 FeedHeart·FeedComment는 UI 비노출(제품 결정). 테이블 `v3_feed_hearts`/`v3_feed_comments`와 target_type CHECK의 `guestbook_message`는 보존(R4 선례)

### GuestbookMessageView
- `guestbook_message_id`, `viewer_id` 필수
- 동일 (guestbook_message_id, viewer_id)는 1건 (DB UNIQUE, 서비스 ON CONFLICT DO NOTHING 멱등)
- 작성자 본인(부모 GuestbookEntry.guest_id == viewer)은 기록하지 않음(서버 판정)
- 부모 GuestbookMessage 삭제 시 함께 삭제 (ON DELETE CASCADE)

### InteriorItem
- `moi_gather_place_id` 필수
- 배치된 경우 `position` 필수

### HostAnnouncement
- `lounge_id` 필수
- `host_id` 필수 (Host만 작성 가능)
- `message` 필수, 최대 100자
- `is_pinned`가 true인 HostAnnouncement는 같은 lounge 내에서 최대 1개 (새 공지 고정 시 기존 고정 해제)
- soft delete: `deleted_at` IS NOT NULL이면 조회에서 제외

### MoiItem
- `moi_id` 필수
- `name`, `type`, `slot` 필수
- 같은 슬롯에 동시에 여러 아이템 장착 불가

### CashGift
- `wedding_id` 필수
- `guest_name` 필수, 최대 10자
- `recipient_slot` 필수 (6종: 'groom' | 'bride' | 'groom_father' | 'groom_mother' | 'bride_father' | 'bride_mother')
- `relation_category` 필수 (6종 중 하나)
- `amount` 필수, 0 이상
- `pay_method` 필수 (4종: 'transfer' | 'kakaopay' | 'toss' | 'cash')

### FeedHeart
- 같은 user_id + target_type + target_id 조합은 유일 (1인 1하트)
- target_type은 'guestbook_entry' 또는 'host_announcement'만 허용

### FeedComment
- `message` 필수, 최대 50자
- 삭제는 본인만 가능 (soft delete)
- 수정 불가
- 대댓글 없음 (1depth)
- target_type은 'guestbook_entry' | 'host_announcement' | 'guestbook_message' (3종, DB CHECK 강제)

### Ium
- `from_user_id` ≠ `to_user_id` (자기 자신과의 이음 불가)
- 같은 from-to 조합은 unique (중복 이음 불가)
- `relation_type`, `relation_label` 필수

### HostInvite
- `wedding_id`, `slot`, `token` 필수. `token`은 unique
- inviter는 해당 Wedding의 신랑/신부(Host)만. 초대 가능 슬롯 = 부모 4 + 배우자(신랑↔신부 상호)
- 같은 `slot`에 pending 초대가 있으면 새로 만들지 않고 기존 토큰 재사용
- 초대 만료 없음
- `status`가 'accepted'면 취소 불가 (pending만 cancel 가능)
- 자기 wedding의 초대를 자기 자신이 수락 불가, 이미 다른 user가 점유한 slot 수락 불가
- 수락 시 `invited_user_id`=수락자, `status`='accepted', `accepted_at` 설정 → 해당 user가 Wedding host 슬롯 보유
- 부모/배우자 Host 권한: 라운지·웨딩리포트 접근 가능, 청첩장 수정·추가만 제외

### 역할 (Host/Guest/Manager)
- 한 Wedding에서 Host와 Guest는 동일 User일 수 없음
- Manager는 Guest의 하위 역할 (Manager면 Guest 자격 가짐). **도메인 정의만 존재 — DB·계약·구현에 미반영(로드맵 보류). 현재 어느 테이블에도 Manager 표현 없음**
- Host는 한 Wedding당 최소 1명, 최대 6명

## Events + Commands

### User & Moi
| Event | Command |
|---|---|
| UserRegistered | RegisterUser |
| UserProfileUpdated | UpdateUserProfile |
| MoiCreated | CreateMoi |

### Wedding
| Event | Command |
|---|---|
| WeddingCreated | CreateWedding |

### MobileInvitation
| Event | Command |
|---|---|
| MobileInvitationCreated | CreateMobileInvitation |
| MobileInvitationUpdated | UpdateMobileInvitation |
| MobileInvitationShared | ShareMobileInvitation |
| MobileInvitationViewed | ViewMobileInvitation |

### WeddingLounge / MoiGatherPlace / LoungeCheckIn
| Event | Command |
|---|---|
| WeddingLoungeCreated | CreateWeddingLounge |
| WeddingLoungeEntered | EnterWeddingLounge |
| MoiGatherPlaceCreated | CreateMoiGatherPlace |
| LoungeCheckInCreated | CreateLoungeCheckIn |

### GuestbookEntry / GuestbookMessage
| Event | Command |
|---|---|
| GuestbookEntryCreated | CreateGuestbookEntry |
| GuestbookMessageCreated | CreateGuestbookMessage |

### CashGift
| Event | Command |
|---|---|
| CashGiftCreated | CreateCashGift |

### HostInvite
| Event | Command |
|---|---|
| HostInviteCreated | CreateHostInvite |
| HostInviteAccepted | AcceptHostInvite |
| HostInviteCancelled | CancelHostInvite |

### HostAnnouncement
| Event | Command |
|---|---|
| HostAnnouncementPublished | PublishHostAnnouncement |
| HostAnnouncementUpdated | UpdateHostAnnouncement |
| HostAnnouncementDeleted | DeleteHostAnnouncement |

### FeedHeart
| Event | Command |
|---|---|
| FeedHeartToggled | ToggleFeedHeart |

### FeedComment
| Event | Command |
|---|---|
| FeedCommentCreated | CreateFeedComment |
| FeedCommentDeleted | DeleteFeedComment |

### InteriorItem
| Event | Command |
|---|---|
| InteriorItemCreated | CreateInteriorItem |
| InteriorItemPlaced | PlaceInteriorItem |
| InteriorItemUnplaced | UnplaceInteriorItem |

### MoiItem
| Event | Command |
|---|---|
| MoiItemCreated | CreateMoiItem |
| MoiItemSent | SendMoiItem |
| MoiItemEquipped | EquipMoiItem |
| MoiItemUnequipped | UnequipMoiItem |

## Use Cases

### User
- 회원 가입 → `RegisterUser`, `CreateMoi`
- 프로필 수정 → `UpdateUserProfile`

### Host
- **결혼식 만들기** (셋업 + 청첩장 한 묶음)
  → `CreateWedding`, `CreateWeddingLounge`, `CreateMoiGatherPlace`, `CreateMobileInvitation`
- 청첩장 수정 → `UpdateMobileInvitation`
- 청첩장 공유 → `ShareMobileInvitation`
- 인테리어 꾸미기 → `PlaceInteriorItem`, `UnplaceInteriorItem`
- 공지 발행 → `PublishHostAnnouncement`
- 공지 수정 → `UpdateHostAnnouncement`
- 공지 삭제 → `DeleteHostAnnouncement`
- 호스트 초대 (부모/배우자 슬롯) → `CreateHostInvite`
- 호스트 초대 취소 (pending만) → `CancelHostInvite`

### 피초대자 (User → Host 합류)
- 초대 링크 조회 (비로그인 가능) → `getHostInvite`
- 초대 수락 (로그인 후, 슬롯 할당) → `AcceptHostInvite`

### Guest
- 청첩장 보기 → `ViewMobileInvitation`
- 라운지 입장 → `EnterWeddingLounge`, `CreateLoungeCheckIn`
- 방명록 작성 (입장 시 정체성 + 첫 메시지) → `CreateGuestbookEntry`
- 방명록 메시지 추가 (라운지 내 글 작성, '+') → `CreateGuestbookMessage`
- 축의금 전달 → `CreateCashGift`

### 공통 (Host/Guest 모두)
- 모이 꾸미기 → `EquipMoiItem`, `UnequipMoiItem`
- 모이 아이템 선물 → `SendMoiItem`
- 피드 하트 토글 → `ToggleFeedHeart`
- 피드 댓글 작성 → `CreateFeedComment`
- 피드 댓글 삭제 (본인) → `DeleteFeedComment`

### Shop / 카탈로그 (Host/Guest/System 모두 가능, v1은 System 자동)
- `CreateMoiItem` — v1: 첫 라운지 입장 시 자동 지급 (System), 추후 Shop 도입 시 Host/Guest 확장
- `CreateInteriorItem` — 추후 Shop 도입 시 Host/Guest 확장
