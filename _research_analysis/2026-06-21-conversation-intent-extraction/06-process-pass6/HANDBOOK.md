# dibang-sui 온보딩 핸드북

> ⚠️ **[앱 경계 변경 2026-06-21]** guest-web의 "비로그인 익명·zkLogin 금지"는 **폐기**됐다. 이제 **guest-web도 zkLogin으로 서명해 온체인 트랜잭션을 직접 날린다** (게스트가 본인 지갑으로 give/write/rsvp 서명 → 익명 기록·서비스 대리서명·claim 메커니즘 불필요). 아래 본문의 "비로그인/익명 퍼널/대리서명/claim/zkLogin 금지" 서술은 이 결정으로 **무효**. SSOT: `CLAUDE.md §2`.


> **신규 팀원용 메인 문서.** 이 프로젝트가 왜 존재하고, 무엇을 만들며, 어떻게 짓고, 지금 어디까지 왔는지를 서사로 엮었다.
>
> **작성 원칙**: 추측 없이 입력 자료(세션 의도 백본 288개 세션유닛 + `_architecture`·`_onboarding`·`_scenario`·`_code_convention`·`_research` 문서 + 실제 코드)에 근거했다. 각 핵심 주장에는 가능한 한 출처를 달았다.
>
> **출처 표기 규칙**: 이 핸드북은 요약·해설이고, 진실의 원천은 원본 문서·코드다. 충돌하면 항상 원본이 이긴다. 권위 순서는 ① `_onboarding/VISION-AND-INTENT.md`(왜/방향) → ② `_architecture/DOMAIN_MODEL_SUMMARY.md`(무엇 = SSOT) → ③ `_scenario/*`(어떻게 = 구현용, 도메인 모델과 어긋나면 도메인 모델 우선). (출처: `_onboarding/00-READ-FIRST.md`, `CLAUDE.md §1`)

---

## 목차

1. [왜 이 프로젝트인가 — 결혼식에서 신용으로](#1-왜-이-프로젝트인가--결혼식에서-신용으로)
2. [무엇을 만드나 — 도메인과 앱 경계](#2-무엇을-만드나--도메인과-앱-경계)
3. [어떻게 만드나 — 아키텍처·온체인·컨벤션](#3-어떻게-만드나--아키텍처온체인컨벤션)
4. [지금 상태 — 구현됨 vs 그린필드](#4-지금-상태--구현됨-vs-그린필드)
5. [프로젝트의 여정 — v3 레거시에서 온체인으로](#5-프로젝트의-여정--v3-레거시에서-온체인으로)
6. [신규 팀원 첫 걸음](#6-신규-팀원-첫-걸음)

---

## 1. 왜 이 프로젝트인가 — 결혼식에서 신용으로

### 1-1. 한 줄로

디방(Dibang)은 표면적으로는 **결혼식 디지털 방명록 + 웨딩 라운지 서비스**다. 그런데 진짜 목표는 그 위에 있다. 결혼식을 포함한 여러 이벤트에서 발생하는 **사람들 간 상호작용 데이터를 Sui 온체인에 올리고**, 그것으로 **관계별 신뢰 잔액**을 도출하고, 한 사람(지갑)에게 연결된 모든 신뢰 잔액을 모아 **신용 평가 모델의 재료**를 만들어 **DeFi에 활용**한다. (출처: `_onboarding/VISION-AND-INTENT.md`, `_onboarding/00-READ-FIRST.md`)

이걸 한 번 더 강조하는 이유가 있다. 이건 "방명록을 블록체인에 올리는" 프로젝트가 **아니다.** 방명록·축의·좋아요 같은 일상의 상호작용을 **신용의 원료로 삼는 신뢰네트워크 기반 DeFi 프로젝트**다. 결혼식은 그 신뢰망을 일생에 한 번, 전수로 샘플링하는 진입점일 뿐이다. (출처: `_onboarding/00-READ-FIRST.md`, `_onboarding/06-SUI-ONCHAIN-DIRECTION.md`)

### 1-2. 왜 결혼식인가 — "네트워크 스냅샷 생성기"

리서치(`_research/gathering-taxonomy-trust-balance/`)는 이 직관을 정량 언어로 굳혔다. 세상의 "2인 이상 모임"을 분류해 보면, **결혼식은 5개 축 값의 유일한 조합**(통과의례 × 전체소집 × 부조 × 공식기록 × 일생1회)으로 특이점에 놓인다. 빈도는 1인데 강도는 최대다. 한 사람의 신뢰 네트워크 전체를 `Hom(−, h)`로 일생 1회 전수 샘플링하는 장치인 셈이다. (출처: `_research/.../SUMMARY.md`, `02-axis-relations.md §3 C5`, `05-category-hints.md H4`)

축의금이 핵심인 이유도 여기서 나온다. 축의는 단순 지불이 아니라 **호혜 원장(갚아야 할 장부)** 이다. 거래와 구조적으로 다르다. 그래서 "S3 금전 흐름 구조"가 이 프로젝트에서 가장 중요한 축으로 꼽혔다. (출처: `_research/.../01-axes.md §2 N6`, `02-axis-relations.md §4-3`)

### 1-3. 신뢰 → 신용 → DeFi의 4층 사다리

프로젝트의 핵심 지식재산은 신뢰를 신용으로 환산하는 **4층 사다리**다. (출처: `_research/.../SUMMARY.md`, `_onboarding/08-TRUST-BALANCE-CREDIT-MODEL.md`)

| 층 | 이름 | 하는 일 | 현재 상태 |
|----|------|---------|-----------|
| 1층 | **분류** | 모임 → 타입/프로필 (집합론) | ✅ 완성 |
| 2층 | **동역학** | 액션을 쌓아 관계·집단 형성, 상태 = fold(신호) | ✅ 골격 |
| 3층 | **신용** | 관계망 → 신용 점수 (Φ: 관계→신용, 범주론) | 🔧 시제품(`sim.mjs`) |
| 4층 | **금융** | 신용 → 대출·보증 등 DeFi 상품 | ⬜ 미구축 |

핵심 순서는 **분류 → 누적 → 환산 → 상품**. 이번 해커톤의 목표는 **3층과 4층을 실제로 잇는 것**이다. (출처: `_onboarding/08-TRUST-BALANCE-CREDIT-MODEL.md`, `_research/.../SUMMARY.md`)

작동 메커니즘을 조금 더 풀면:

- **2층(fold)**: 입력은 이벤트가 아니라 **신호**(project 함수의 출력)다. 신호를 시간순으로 누적해 관계·집단 상태를 만든다. 원장은 둘로 갈린다 — **EM 원장**(Equality Matching, 호혜 잔액, 청산 가능, `net = gave[A→B] − gave[B→A]`, ℤ 아벨군)과 **CS 원장**(Communal Sharing, 유대 강도, 무청산, 비대칭). 거래(MP)는 즉시 청산이라 영속 상태에 0 기여 → 저장 안 함. (출처: `_research/.../07-fold-dynamics.md §1·§2`)
- **fold 키의 원자 차원**: 같은 10만 원이라도 축의금(부조)·빌려줌(대여)·선물(증여)은 신뢰적으로 다르다. 신용이 쓰는 최소 차원은 둘 — ① 청산구조(무청산=증여) ② default 판정 불리언("미반환이 신용 손상 사건인가" — 부조 vs 대여를 가름). 그래서 **fold 키 = (from, to, 자원, 청산구조, default판정)**. 복합 라벨은 금지, 원자 차원만. (출처: `_research/.../07-fold-dynamics.md §2-2`)
- **3층(신용 전파)**: ① 자원별 동질 그래프 분리 → ② 자원별 PageRank(무방향, d=0.85) → ③ 행동 신호 직접 투입(대여 갚음=1.0 / default=0.2 / 무기록=0.7) → ④ 점수 합산. **최종신용 = 0.5·부조 + 0.3·CS + 0.2·이행.** (출처: `_research/.../09-credit-propagation.md §1`, `_onboarding/08-TRUST-BALANCE-CREDIT-MODEL.md`)
- **유대(CS) ≠ 신용**: 유대는 *관계*의 속성, 신용은 *사람*의 속성이다. 신용은 "유대의 양"이 아니라 "누구와 엮였나"로 정해진다(요네다 직관 = 고유벡터 중심성 = PageRank의 신뢰 버전 — 건달과의 유대는 −, 대부호와의 유대는 +). (출처: `_research/.../05-category-hints.md H12`, `_onboarding/08-TRUST-BALANCE-CREDIT-MODEL.md`)

> **정직 경고**: 결정값(무방향·default 0.2·비중 0.5/0.3/0.2)은 모두 **first-cut 임의값**이다. 정식 Φ·요네다·MEC 정량 모델은 hackathon 𝒲 트랙에서 정밀화하고 실데이터로 보정해야 한다. (출처: `_research/.../09-credit-propagation.md §5`, `_onboarding/08-TRUST-BALANCE-CREDIT-MODEL.md`)

### 1-4. 해커톤 정렬 (Sui Overflow 2026, Payment & DeFi)

제출 목표는 **Sui Overflow 2026의 Payment & DeFi 트랙**이다. 트랙 포지션은 **관계 기반 신용(relationship-based credit)** — 담보 중심을 넘어 사회적 신뢰 기반으로 가는 "beyond traditional DeFi"에 정확히 부합한다. (출처: `_onboarding/VISION-AND-INTENT.md`, `_onboarding/09-HACKATHON-ALIGNMENT.md`)

- **심사 가중치**: Real-World Application 50%(최대 강점·승부처), Product & UX 20%, Technical Implementation 20%, Presentation & Vision 10%. (출처: `_onboarding/09-HACKATHON-ALIGNMENT.md`)
- **상금**: 1st $30,000 / 2nd $15,000 / 3rd $10,000 / 4th $7,500. **50%는 수상 발표 시, 나머지 50%는 mainnet 배포 후.** 현재 testnet만 배포돼 있으므로 mainnet 배포를 목표에 넣어야 전액 + 자격을 충족한다. (출처: `_onboarding/09-HACKATHON-ALIGNMENT.md`)
- **권장 1차 데모**(Real-World 50% 정렬): **dibang-wedding 로그인(zkLogin) → 온체인 상호작용(SBT) → 한 지갑의 신뢰잔액/신용 점수 표시 → 그 점수로 DeFi 동작(예: 대출 한도)** 한 흐름. (출처: `_onboarding/06-SUI-ONCHAIN-DIRECTION.md`, `_onboarding/09-HACKATHON-ALIGNMENT.md`)

### 1-5. 오너가 못 박은 방향 (VISION 원문)

세션 의도 백본에서 반복 확인되는, 오너가 직접 정한 방향이다. 추측 아님.

- **완전 대체를 목적으로 점진 대체하되 꽤 빠르게.** 코어한 내용은 일단 다 온체인으로, 사소한 건 나중에. **Supabase는 아주 어쩔 수 없을 때만 사용(최후수단).** (출처: `_onboarding/VISION-AND-INTENT.md`)
- **여기서 발생하는 모든 송금·금융 행위는 SUI로 이뤄진다.** 나중에 스테이블코인(USDSui)으로 바꾸되, 그건 서비스 로직 구현이 모두 끝난 다음이다. (출처: `_onboarding/VISION-AND-INTENT.md`)
- 사람들 간 **모든 상호작용(좋아요 포함)** 을 (민감하지 않은 것만) 온체인에 안전하게 저장하고, 그것으로 신뢰 네트워크·신뢰 잔액을 계산하는 게 목표다. (출처: `_onboarding/VISION-AND-INTENT.md`)

---

## 2. 무엇을 만드나 — 도메인과 앱 경계

### 2-1. 도메인의 두 핵심 개념: Moi와 Ium

신뢰네트워크는 이 서비스가 궁극적으로 발굴·활용해 부가가치를 만들려는 가장 중요한 개념이다. 결혼식·장례식에서 기쁨·슬픔을 나누는 행위는 본질적으로 *"관계를 사기 위한 에너지·재화의 교환"* 이고, 감정 교류는 *관계 유지를 위한 에너지*다. 단순 SNS 친구 관계가 아니라 오프라인의 관계 행위를 모두 포함한다. (출처: `_architecture/DOMAIN_MODEL_SUMMARY.md`)

그 네트워크는 **노드와 엣지**로 표현된다:

- **Moi(모이)** = 신뢰네트워크의 **노드**. User를 시각화한 아바타다. User 자체가 아니라 User의 시각적 표현이며, 단순 캐릭터 그래픽이 아닌 신뢰네트워크의 노드다. 어원은 프랑스어 "나(me)", 베트남어 "초대(mời)", 핀란드어 "안녕(moi)", 한글 '모이는'의 '모이'. (출처: `_architecture/DOMAIN_MODEL_SUMMARY.md`)
- **Ium(이음)** = 신뢰네트워크의 **엣지**. User와 User 간의 관계다. 단순 식별 관계가 아닌 *신뢰의 단위*. User들과 Ium들의 집합이 곧 '신뢰'로 표현된다. (출처: `_architecture/DOMAIN_MODEL_SUMMARY.md`)

### 2-2. 엔티티 지도 (도메인 모델 SSOT)

`_architecture/DOMAIN_MODEL_SUMMARY.md`가 엔티티·불변식·관계의 단일 진실 원천이다. 관계 골격:

```
User ─┬─ Moi (1:1)                      [지갑 1개 = User 1개 = Moi 1개]
      ├─ Ium (M:N, from/to)             [신뢰 엣지, 자기 자신 불가, (from,to) unique]
      └─ LoungeCheckIn (1:N)            [user×lounge 1건, 멤버십, 로그인 필수]

Wedding ─┬─ WeddingInfo (1:1, VO)       [신랑·신부·부모 이름, 날짜·장소·계좌]
         ├─ MobileInvitation (1:N)      [청첩장, slug UNIQUE]
         ├─ CashGift (1:N)              [축의금]
         ├─ HostInvite (1:N)            [부모·배우자 초대 토큰]
         └─ WeddingLounge (1:1)
              ├─ LoungeCheckIn (1:N)
              ├─ MoiGatherPlace (1:1)   [모이가모인곳 — 미구현]
              │     └─ InteriorItem (1:N)
              ├─ GuestbookEntry (1:N)   [하객 정체성 카드]
              │     ├─ GuestbookMessage (1:N)   [실제 글, 본문 SSOT]
              │     │     ├─ GuestbookMessageView (1:N, 본인 제외·멱등)
              │     │     └─ FeedComment (target='guestbook_message')
              │     ├─ FeedHeart (target='guestbook_entry')
              │     └─ FeedComment (target='guestbook_entry')
              └─ HostAnnouncement (1:N)
                    ├─ FeedHeart / FeedComment
Moi ─── MoiItem (1:N)
```
(출처: `_architecture/DOMAIN_MODEL_SUMMARY.md`)

핵심 엔티티를 짧게:

- **User**: 디방 계정 주체(이메일·전화로 식별). 영속 Moi 1개. Host/Guest는 User의 영구 속성이 아니라 *특정 Wedding 컨텍스트의 역할*이다. DB 테이블 `v3_users`. (출처: `_architecture/DOMAIN_MODEL_SUMMARY.md`)
- **Wedding**: 한 결혼식 이벤트. host 6슬롯(groom / bride / groom_father / groom_mother / bride_father / bride_mother), WeddingInfo VO, WeddingLounge 1:1. host 최소 1·최대 6. (출처: `_architecture/DOMAIN_MODEL_SUMMARY.md`)
- **MobileInvitation**: 청첩장. 입장 *전* 안내(라운지는 입장 *후* 상호작용). `slug` 필수·UNIQUE. (출처: `_architecture/DOMAIN_MODEL_SUMMARY.md`)
- **LoungeCheckIn**: 라운지 입장 멤버십. **한 user당 한 lounge에 정확히 1건**(재입장해도 안 늘어남 — DB UNIQUE로 강제, AUD-0 2026-05-19 결정). 방문 이력 로그가 아니라 멤버십이다. (출처: `_architecture/DOMAIN_MODEL_SUMMARY.md`)
- **GuestbookEntry / GuestbookMessage**: Entry = 하객의 라운지 정체성 카드(누가·어떤 관계로 참석했나). Message = Entry에 시간순으로 누적되는 실제 글(1:N). **본문 단일 진실 원천은 Message**(2026-05-25에 `entries.message` 컬럼을 드롭하고 일원화). (출처: `_architecture/DOMAIN_MODEL_SUMMARY.md`, `_scenario/wedding-lounge/SCENARIOS.md §1-1`)
- **CashGift**: 하객 → 혼주 축의금. 오프체인에서는 딥링크로 송금 유도 후 기록만 남긴다(`pay_method` ∈ transfer/kakaopay/toss/cash). 단, **온체인 방향에서는 실제로 SUI가 흐른다**(§3 참조). (출처: `_architecture/DOMAIN_MODEL_SUMMARY.md`, `_onboarding/VISION-AND-INTENT.md`)
- **HostInvite**: 신랑/신부가 양가 부모·배우자를 host 슬롯에 초대하는 토큰 기반 초대. 부모/배우자 Host는 라운지·웨딩리포트 접근 가능, **청첩장 수정·추가만 제외**. accepted면 취소 불가(온체인 finality와 자연 정합). (출처: `_architecture/DOMAIN_MODEL_SUMMARY.md`, `_scenario/host-invite/SCENARIOS.md`)
- **공통 키 두 개**: 모든 도메인이 **누구측 6슬롯**(groom/bride/양가부모4)과 **관계 카테고리 6종**(가족·친척 / 친구·지인 / 동문·동창 / 직장동료 / 스승·제자 / 기타모임)을 공유한다. 과거 `side`(2종) → `recipient_slot`(6종) 전환이 사전 작업으로 수행됐다. (출처: `_scenario/guest-web-flow/SCENARIOS.md §0`, `_architecture/DOMAIN_MODEL_SUMMARY.md`)

> **동음이의 주의**: "Memory"가 두 가지를 가리킨다 — 라운지 V2의 `v3_memories`(사람별 동그라미 게시물, author_user_id 식별)와 웨딩메모리북(`v3_memory_book_photos`, 결혼식 후 호스트가 큐레이션하는 사진+메시지 책자). 다른 도메인이다. (출처: `_scenario/memory-domain-split/SCENARIOS.md`, `_scenario/wedding-memorybook-2026-05-24/SCENARIOS.md §0-1`)

### 2-3. 앱 경계 (절대 혼동 금지)

이전 세션들이 가장 자주 틀린 지점이다. 경계 기준은 **"전환 퍼널이냐 서비스 본체냐"** — 로그인 여부가 *유일*·절대 기준은 아니다. (출처: `_architecture/APP_SCOPE.md`, `_onboarding/02-APP-BOUNDARIES.md`)

- **guest-web = 비로그인 익명 전환 퍼널.** 공유 링크/QR의 착지점이다. 두 갈래:
  - **퍼널 A**(모바일 청첩장): 청첩장 보기 → 하트 → 라운지 티저.
  - **퍼널 B**(방명록·축의, 비로그인): 누구측 6슬롯 → 관계/이름(GuestbookEntry) → 금액 → 송금(CashGift) → 메시지/하트(GuestbookMessage) → 완료.
  - 두 퍼널 모두 종착은 라운지 진입 유도. **비로그인 축의(현금 송금)까지 guest-web이 책임진다**(2026-05-18 확정 — "비로그인이면 최소 행위만"이 아니다). 호출 엔드포인트는 전부 public: `getInvitation`·`heartInvitation`·`getWedding`·`createGuestbookEntry`·`createGuestbookMessage`·`createCashGift`. (출처: `_architecture/APP_SCOPE.md`, `_onboarding/02-APP-BOUNDARIES.md`)
  - **→ guest-web에 로그인/zkLogin/온체인 신원을 붙이지 마라.** (출처: `CLAUDE.md §2`, `_onboarding/07-LESSONS.md L2`)
- **dibang-wedding = 로그인 서비스 본체.** `RegisterUser`+`CreateMoi` 이후 모든 Use Case. Host 기능(결혼식 생성·관리, 청첩장·공지·인테리어, 호스트 초대, 축의 장부, 메모리북), Guest 기능(라운지 입장, 피드 하트/댓글, 모이 조회), 공통(모이 꾸미기, 아이템 선물, 이음 생성/조회/삭제, 프로필). **zkLogin·온체인 신원·신뢰네트워크(Moi/Ium)는 전부 여기.** (출처: `_architecture/APP_SCOPE.md`, `_onboarding/02-APP-BOUNDARIES.md`)
- **admin = 별도 운영 앱**(`apps/admin`). 주의: "read-only"라고 과소평가하지 말 것 — 실제로는 **운영 mutation 포함**(웨딩 삭제·호스트 슬롯 이동·유저 수정 등 파괴적 작업). AdminGuard(허용 이메일 allowlist)로 보호하며 `/admin/*` 전체를 메서드 무관하게 막는다. (출처: `_onboarding/02-APP-BOUNDARIES.md`, `_architecture/admin-write-api/SUMMARY.md`)
- **display = 경계 밖(추후)**: 현장 디스플레이에 하객 메시지 표출. APP_SCOPE상 두 앱 범위 밖이지만, guest-web public 라우트 `/display`로 포팅하는 시나리오가 일부 구현돼 있다(아래 §5 참조). (출처: `_onboarding/02-APP-BOUNDARIES.md`, `_scenario/display-port/SCENARIOS.md`)

---

## 3. 어떻게 만드나 — 아키텍처·온체인·컨벤션

### 3-1. 모노레포 구조

- 패키지 매니저 **pnpm(9.15.0)**, Move는 **sui CLI**, 백엔드는 **go**. 탐색은 `rg`/`fd`, 코드 인덱스는 `codegraph`. (출처: `CLAUDE.md §6`)
- 레이아웃:
  - `apps/api` — Go 백엔드(chi v5 + pgx v5 + sqlc + oapi-codegen).
  - `apps/dibang-wedding` — 로그인 본체(React + Vite, zkLogin·온체인 여기).
  - `apps/guest-web` — 비로그인 퍼널.
  - `apps/admin` — 운영 앱.
  - `packages/sui-sdk`(`@gorae/sui-sdk`) — 손으로 작성한 온체인 호출 빌더·조회.
  - `packages/contracts`(`@gorae/contracts`) — OpenAPI에서 코드젠한 REST SDK·타입·zod·react-query.
  - `contracts/dibang_wedding` — Move 컨트랙트.
  - (그 외 `packages/ui`·`invitation-ui`·`web-utils`.)
  - (출처: `CLAUDE.md §6`, `code/packages-sdk.md`, `code/api-go.md`)

### 3-2. 단일 OpenAPI 계약이 프론트와 백엔드 양쪽을 생성

이 프로젝트의 데이터 흐름 척추는 **하나의 OpenAPI 계약**(`packages/contracts/api-contract.yaml`)이다. 여기서:

- **TS 쪽**: `pnpm generate:ts`(hey-api/openapi-ts)로 `types.gen.ts`·`sdk.gen.ts`·`zod.gen.ts`·`@tanstack/react-query.gen.ts` 생성. 프론트는 직접 `fetch`를 쓰지 않고 이 코드를 쓴다. (출처: `_code_convention/data-fetching.md`, `code/packages-sdk.md`)
- **Go 쪽**: `pnpm generate:go`(oapi-codegen)로 모델(`models.gen.go`)·서버(`server.gen.go`) 생성. "strict server" 패턴 — 미구현 메서드는 자동 501. (출처: `_code_convention/BACKEND_STRUCTURE.md`, `code/api-go.md`)
- 그래서 **프론트·백 타입이 항상 일치**한다. `operationId`가 엔드포인트의 SSOT이고, REST 분류 기준은 path 첫 세그먼트(루트 리소스)다. (출처: `_architecture/API_ENDPOINT_MAP.md`, `_architecture/LESSON.md`)

백엔드 아키텍처: HTTP 요청 → handler(thin, HTTP 플러밍만) → service(인터페이스, 비즈니스 로직, mock 가능) → sqlc → DB. 서비스는 도메인 에러(`ErrNotFound`·`ErrSlugConflict` 등)를 반환하고 handler가 HTTP 상태로 매핑한다. (출처: `_code_convention/BACKEND_STRUCTURE.md`, `code/api-go.md §5`)

접근 정책 4종: `public`(인증 불필요) / `authenticated`(로그인하면 누구나) / `owner`(JWT user_id = 리소스 소유자) / `host`(JWT user_id가 그 Wedding host 슬롯에 있는지). (출처: `_architecture/API_CONVENTIONS.md`, `code/api-go.md §1`)

> **함정 메모(Go)**: jsonb 컬럼 UPDATE는 `COALESCE(convert_from(sqlc.narg('x'),'UTF8')::jsonb, col)` 패턴 필수. `DATABASE_URL`에 `default_query_exec_mode=simple_protocol`이 켜져 pgx가 `[]byte`를 bytea hex로 보내므로 `::jsonb` 캐스트만으론 22P02로 깨진다(근거 commit 489b2ab). (출처: `_code_convention/BACKEND_STRUCTURE.md`)

### 3-3. 온체인 방향 — 핵심 원칙들

이게 이 프로젝트의 심장이다. 네 가지 원칙을 머리에 박아두자.

**① 활동·관계 기록은 SBT(Soul Bound Token)다.** 신용평가 무결성을 위해 방명록·축의·이음 같은 활동 기록은 다른 지갑으로 옮길 수 없어야 한다. Move에서 `key`만(=`store` 없음)으로 만든다. 거래/선물 의도가 있는 *자산*(예: MoiItem 선물)만 예외로 `store`를 준다. (출처: `_onboarding/00-READ-FIRST.md`, `_code_convention/SUI_MOVE.md`, `CLAUDE.md §3`)

**② 온체인 = raw 액션의 불변 원장.** `action_type`(돈건넴·옴·서명·초대·말함…) + actor·target·event·resource·amount·timestamp를 저장한다. 그런데 **해석(부조/거래/EM·CS·신용)은 저장하지 않고 규칙으로 계산한다.** 같은 "돈 건넴"이 (하객→혼주)면 부조(EM○), (혼주→업체)면 거래(EM✗·신용○)로 갈리기 때문이다. raw에 신뢰를 박으면 재해석이 막히고 규칙이 이중 적용된다. 이건 리서치 H11의 "(A) 보편 액션 저장 + (B) 신뢰 투영 = project 함수(저장 안 함)" 분리와 직접 대응한다. (출처: `_onboarding/06-SUI-ONCHAIN-DIRECTION.md`, `_onboarding/08-TRUST-BALANCE-CREDIT-MODEL.md`, `_research/.../05-category-hints.md H11`)

**③ 민감정보(이름 등) 온체인 평문 금지.** 온체인 데이터는 공개다. 이름 등은 온체인에 평문으로 올리지 않고, 신뢰 신호는 비민감 상호작용으로만 남긴다. 마스킹이 필요한 식별정보는 off-chain 또는 암호화/접근제어 계층에. (출처: `_onboarding/03-IDENTITY-AND-AUTH.md`, `_onboarding/VISION-AND-INTENT.md §7`)

**④ 돈은 SUI 온체인으로 흐른다.** 축의금 등 금융 행위는 실제로 SUI로 송금된다(나중에 USDSui). "기록만 남기는" 게 아니다. (한때 "기록만"으로 정정했던 게 오히려 오류였다 — `_onboarding/07-LESSONS.md L5`.) (출처: `_onboarding/00-READ-FIRST.md`, `_onboarding/VISION-AND-INTENT.md`)

**온체인/오프체인 경계**: 온체인 = raw 액션 + participation(역할) + event/entity(SBT가 든 사실). 오프체인(또는 별도 모듈) = `project`(해석) · `fold`(EM/CS 누적) · `PageRank Φ`(신용). 후자의 결정값(비중·default 페널티)은 임의·튜닝 대상이라 온체인에 박으면 안 된다. (출처: `_onboarding/08-TRUST-BALANCE-CREDIT-MODEL.md`)

### 3-4. Move 컨트랙트 — 지금 배포된 것

`contracts/dibang_wedding/` 패키지(edition 2024, testnet 배포 `0x6bb83eef…dc95`, IumRegistry `0xea55…`). 모듈 7개 + 36 테스트. (출처: `code/move-contracts.md`, `_onboarding/06-SUI-ONCHAIN-DIRECTION.md`)

| 모듈 | 역할 | 핵심 객체 | 능력(ability) |
|------|------|-----------|---------------|
| `utils` | UTF8 글자 수 검증(한글 대비 코드포인트 카운트) | — | — |
| `wedding` | 결혼식 기반 모듈 | `Wedding`(공유), `WeddingLounge`(공유), `WeddingCap` | Cap만 `key+store` |
| `moi` | 아바타 | `Moi`(soulbound), `MoiItem`(NFT) | Moi=`key`-only, Item=`key+store` |
| `ium` | 신뢰 관계 | `Ium`, `IumRegistry`(공유, 중복·자기링크 차단) | Ium=`key+store`(정정 대상) |
| `guestbook` | 방명록 | `GuestbookEntry` | `key+store`(정정 대상) |
| `rsvp` | 참석 의사 | (객체 없음 — 이벤트만) | — |
| `cash_gift` | 축의금 | `CashGiftVault`(공유 SUI 모금함), `CashGiftRecord` | Vault=`key`-only, Record=`key+store`(정정 대상) |

코드에서 배운 핵심 패턴:

- **PTB 합성 패턴**: 대부분 public 함수가 객체를 모듈 내부에서 transfer하지 않고 **반환**해 PTB가 합성하도록 한다(`create_wedding`→WeddingCap, `write_entry`→GuestbookEntry, `send_gift`→CashGiftRecord, `withdraw`→Coin). 예외는 `create_moi` — Moi가 store 없는 soulbound라 PTB로 못 옮기므로 모듈이 직접 `transfer::transfer`(recipient 인자로 self-transfer lint 회피). (출처: `code/move-contracts.md §8-2`)
- **권한 모델 = capability**: 결혼식 수정·호스트 추가·모금함 생성·인출 모두 `WeddingCap` 보유로 증명하고 `cap.wedding_id == object::id(wedding)` 검사 후 `EWrongCap` abort. (출처: `code/move-contracts.md §8-3`)
- **이벤트 중심 피드/집계**: guestbook은 owned NFT라 라운지 단위 조회가 안 돼서 `GuestbookEntryCreated` 이벤트에 message 본문까지 담아 피드를 이벤트만으로 렌더링한다. rsvp는 아예 객체 없이 `RsvpSubmitted` 이벤트만(가스 절약). 상태 변경마다 `event::emit`. (출처: `code/move-contracts.md §8-5`, `_code_convention/SUI_MOVE.md`)

> **SBT 정정 대상(D15, 반드시 반영)**: 현재 `guestbook::GuestbookEntry`·`cash_gift::CashGiftRecord`·`ium::Ium` 3개가 `key+store`(transfer 가능)로 작성돼 있다. 활동·관계 기록이라 **key-only로 정정해야 한다.** `moi::MoiItem`은 선물·거래 의도 자산이라 store 유지. `wedding::WeddingCap`의 soulbound 여부는 결정 대기. (출처: `_onboarding/06-SUI-ONCHAIN-DIRECTION.md`, `_onboarding/07-LESSONS.md L3`)

### 3-5. TypeScript SDK·zkLogin·Sponsor·dual-write

**`@gorae/sui-sdk`**(손으로 작성한 핵심): 15개 PTB 빌더 + 조회 + 실행 헬퍼 + zkLogin + sponsor. testnet 실호출 E2E 검증됨. `configureSui()`를 앱 시작 시 1회 호출해 packageId·iumRegistryId 설정. 신규 코드 기본 클라이언트는 `SuiGrpcClient`, 이벤트 쿼리만 `SuiJsonRpcClient`(gRPC에 queryEvents 대응 없음). (출처: `code/packages-sdk.md §1`, `_code_convention/SUI_SDK.md`)

**zkLogin이 Supabase 로그인을 대체한다**(목표). 단 user 행(최소 Sui address)은 DB에 유지. 흐름: ephemeral keypair+nonce → Google OAuth → Salt 서버 → `jwtToAddress` → ZK prover proof → zkLogin 서명 조립. **지갑 1개 = User 1개 = Moi 1개**(영속). 온체인은 익명이지만 활동 기록이 그 지갑에 귀속되므로 익명이라도 신용평가가 성립한다. (출처: `_onboarding/03-IDENTITY-AND-AUTH.md`, `code/packages-sdk.md`, `code/dibang-wedding-frontend.md §3`)

- Salt 서버(Go): `salt = HMAC-SHA256(masterSecret, len-prefixed(iss,aud,sub))` 앞 16바이트 → "같은 구글 계정 → 항상 같은 salt → 항상 같은 Sui 주소"(랜덤 저장 안 함). GoogleJWTVerifier는 audience 미설정이면 fail-closed(거부 — 보안 정정 결과). (출처: `code/api-go.md §5-6`)

**Sponsored Transaction**: 호스트도 하객도 지갑·SUI 없이 Google 로그인만으로 온체인 작업이 가능하도록 sponsor가 가스를 대납한다. 보안 핵심은 `assertSponsorable(tx, allowedPackageId)` — 모든 커맨드를 화이트리스트 검사하고, 어떤 커맨드도 가스 코인(`tx.gas`)을 인자로 쓰면 거부한다. (없으면 `splitCoins(gas)+transfer(attacker)`로 sponsor 가스를 탈취당하는 실제 발견된 CRITICAL이 있었다.) 또 aud 검증 fail-open도 CRITICAL로 잡혀 fail-closed로 고쳤다. (출처: `code/packages-sdk.md §sponsor`, `_onboarding/07-LESSONS.md`)

**dual-write(온체인 ↔ 오프체인 다리)**: 웨딩 생성은 **Supabase 먼저 + 온체인 이중 기록**이다.
- Step 1: Supabase `createWedding` → weddingId 확보(D0-1: Supabase 먼저).
- Step 2: invitation 데이터 있으면 `updateInvitation`.
- Step 3: zkLogin 인증 시 온체인 `createWedding` → 발행된 Sui 오브젝트 ID 추출 → `createVault`로 축의 Vault 생성 → `updateWeddingSuiIds`(`PATCH /weddings/{id}/sui-ids`)로 `sui_wedding_id`/`sui_lounge_id`/`sui_vault_id`를 Supabase row에 역기록.
- **온체인 실패 격리**: 온체인이 실패해도 Supabase 생성은 유지하고 sui_id를 null로 둬 추후 재시도(결혼식 생성 자체를 막지 않음). (출처: `code/dibang-wedding-frontend.md §4-3`, `code/packages-sdk.md §types.gen`, `code/api-go.md §5-1`)

> **이벤트 조회 스케일 한계**: JSON-RPC `queryEvents`는 이벤트 *필드* 필터를 지원하지 않아 패키지 전역 이벤트를 다 가져와 클라이언트에서 거른다(O(전체 이벤트)). MVP/testnet 한정이고, 프로덕션은 전용 인덱서(sui-indexer-alt-framework)로 대체해야 한다. (출처: `code/packages-sdk.md §queries`, `_code_convention/SUI_SDK.md`)

### 3-6. 프론트엔드 — 상태머신 전면화

프론트엔드 상태 관리는 2026-06에 **전면 머신화**로 개정됐다. 핵심은 명확한 역할 분담이다(출처: `_code_convention/STATE_MANAGEMENT.md`, `_architecture` STATE_MANAGEMENT):

- **xState** = flow 제어(어떤 상태에서 뭐가 가능한지). 모든 페이지·컴포넌트의 flow를 머신으로. `flow`를 `useState`로 관리하는 코드는 작성하지 않는다. 기준 패턴은 `invitationCreate.machine.ts`.
- **zustand** = 폼 데이터 값 보관.
- **TanStack Query** = 서버 상태 캐시 + fetch lifecycle.
- 단순 흐름(상태 1~2개)도 머신으로 표현(단일상태 reducer형 허용).
- **머신 밖 예외(최소화)**: flow와 무관한 순수 UI 토글(`isOpen`/`mobileTab`/`focusedSection` 등)→useState, 서버 fetch→Query, 폼 필드 값→zustand.
- **중요한 격리 규칙**: 머신 정의가 React Query mutation·캐시 무효화 등 앱/서버 의존성을 *직접 호출하면 안 된다* — `input` 콜백으로 주입한다(순수 헬퍼 import는 허용). 머신은 결과를 `send`로 받아 flow만 제어한다.

데이터 페칭: 모든 API 호출은 `@gorae/contracts` 생성 코드를 쓰고, 앱에서 직접 `fetch`를 작성하지 않는다. 읽기는 `getXOptions`+`useQuery`, 쓰기는 `xMutation`+`useMutation`, 네트워크 경계 응답은 Zod로 검증. custom query hook은 `src/queries/{page-name}/`에. (출처: `_code_convention/data-fetching.md`)

프론트 구조: 같은 역할은 같은 타입 폴더(`components`/`hooks`/`queries`/`types`/`pages`), 같은 페이지는 같은 페이지명(kebab-case) 폴더. `hooks/`=순수 React 로직, `queries/`=서버 데이터. 스타일은 Tailwind CSS 4 유틸리티만(별도 CSS 파일 금지). 폴더 구조는 `eslint-plugin-project-structure`로 린트 강제. (출처: `_code_convention/FRONTEND_STRUCTURE.md`)

dibang-wedding의 인증은 **이중 트랙**이다 — Supabase 세션과 zkLogin 세션이 병존하고, `AuthGuard`는 둘 중 하나라도 있으면 통과시킨다(주석에 "zkLogin이 Supabase 로그인 대체 — VISION §3" 명시). 온체인 쓰기는 전부 `useOnchainHostActions` → `executeOnchain` 한 통로를 거친다. (출처: `code/dibang-wedding-frontend.md §3·§4`)

### 3-7. TDD — 강제 범위와 도구

TDD가 강제다. `_code_convention/TESTING.md`가 SSOT, 영역별 디테일은 BACKEND/FRONTEND/DB_TESTING.

- **Go**: service·handler 구현 전 `_test.go`를 먼저 작성, `go test`로 red 확인 후 구현. 핸들러는 mock service로 빠른 사이클, service는 로컬 Supabase(`127.0.0.1:54322`)로 통합. 게이트는 `go test ./... -race -count=1`. (출처: `_code_convention/BACKEND_TESTING.md`, `CLAUDE.md §2-2-1`)
- **Move**: 구현 전 `_test` 먼저 `sui move test` red 확인. (출처: `_code_convention/SUI_MOVE.md`)
- **프론트**: 비즈니스 hook(`hooks/`·`queries/`) 강제, xState machine은 machine 작성 시 강제, 페이지 흐름 강제, 단순 컴포넌트는 권장. 도구는 Vitest + Testing Library + MSW 2.7, E2E는 Playwright 1.52. 네트워크는 항상 MSW로 stub(`fetch` 직접 모킹 금지). (출처: `_code_convention/FRONTEND_TESTING.md`)
- **인증 우회 금지**: 테스트 모드 우회 플래그를 만들지 말 것 — RLS 버그를 못 잡는다. E2E는 storageState 방식(시드 유저 로그인 → 세션 저장 → fixture). (출처: `_code_convention/TESTING.md`)
- **검증·커밋**: 코드 수정 후 빌드·테스트 통과를 확인하고 보고한다. UI 작업 완료 보고엔 Playwright 스크린샷 첨부(단, zkLogin 라이브 검증은 Google OAuth client + ZK prover 필요 → 헤드리스 불가, 없으면 "자격증명 대기"로 명시). 온체인·보안 변경은 **독립 적대적 리뷰**로 검증(빌드/유닛이 못 잡는 결함 — 이미 CRITICAL 2건 발견 사례). 커밋·푸시는 명시 지시 시에만. (출처: `CLAUDE.md §5`, `_onboarding/07-LESSONS.md`)

### 3-8. DB·스토리지·환경변수 (요점)

- **DB 마이그레이션**: Supabase CLI 단일 도구로만(로컬 `db reset`, dev `db push --linked`, prod 세션 풀러 URL). 원천은 `supabase/migrations/` 한 곳, flat 구조만. `mcp__supabase-*__apply_migration`·Dashboard SQL Editor DDL 직접 실행은 금지(각각 timestamp 어긋남·prod orphan 35개 사고 원인). (출처: `_code_convention/DB_MIGRATIONS.md`)
- **스토리지**: 경로 = 소유 리소스 스코프, DB엔 object key만(절대 URL 금지), URL은 조회 시점에 조립. 버킷 2개 — `v3-uploads-public`(직참조 렌더) / `v3-uploads-private`(입장 검증 뒤 signed URL). 업로드는 presigned 3단계만(구 multipart `POST /uploads` 폐기). (출처: `_code_convention/STORAGE.md`)
- **환경변수**: "실제 값은 git 밖, 키 카탈로그는 git 안"(`.env` / `.env.example` / 검증 스키마 세 곳 동기화). 코드에서 환경 분기 금지(`if MODE==='production'` 같은 것 — 환경 차이는 env 값으로 표현). 직접 참조(`import.meta.env.VITE_*`)는 lint로 차단, `env` 객체 경유. (출처: `_code_convention/ENV_MANAGEMENT.md`)
- **배포 URL**: dev는 `dev` 브랜치(`v3-api-dev`·`v3-dibang-wedding-dev`·`v3-guest-web-dev`.onrender.com), prod는 `main` 브랜치(`v3-api-yrx1`·`v3-dibang-wedding`·`v3-guest-web`.onrender.com). (출처: `_architecture/DEPLOYMENTS.md`)

---

## 4. 지금 상태 — 구현됨 vs 그린필드

### 4-1. 구현됨 (오프체인, 실제 동작)

이미 동작하는 v3 오프체인 기능들(출처: `_onboarding/05-IMPLEMENTED-VS-PLANNED.md`, `_scenario/INDEX.md`):

- 라운지 피드(GuestbookEntry + LoungeCheckIn + HostAnnouncement) + 하트 + 댓글.
- guest-web 퍼널(QR → 방명록 → 축의 → 메시지 → 완료).
- 라운지 페이지 UI, 호스트 초대(부모/배우자 슬롯·토큰).
- 웨딩 리포트/축의 장부(요약·CSV·수동추가).
- 사진 공유 3종(invitation/memory/share) + presigned + 버킷분리(dev).
- 동의 온보딩(dev 구현, prod pending, IP/UA는 stub → NULL).
- 웨딩 메모리북(BE 32/32 PASS + UI), admin 페이지(가드 검증).

API는 90개 이상 등록돼 있고(생성 서버 라우트 기준), Go 백엔드에 Wedding·Invitation·Lounge·Guestbook·Feed·CashGift·HostInvite·MemoryBook·Consent·Admin 핸들러가 구현돼 있다. (출처: `code/api-go.md §4·§5`)

### 4-2. 온체인 산출물 (이미 빌드·검증·커밋)

- **Move 컨트랙트** 7모듈(testnet 배포, 36 테스트). **TS SDK** `@gorae/sui-sdk`(15 빌더, testnet 실호출 E2E). **zkLogin Salt 서버**(Go). **Sponsored Tx**(Node 서비스, 독립 감사 CRITICAL 2건 수정). **프론트 dApp Kit + ZkLoginProvider + 온체인 훅**(빌드됨). (출처: `_onboarding/06-SUI-ONCHAIN-DIRECTION.md`)
- dibang-wedding의 `NetworkPage`(`/network`)는 Moi/Ium을 직접 발행하는 실제 화면(DEV 패널 아님)이고, `useSaveInvitation`이 웨딩 생성 시 온체인 dual-write를 수행한다. (출처: `code/dibang-wedding-frontend.md §4`)

### 4-3. 그린필드 — 처음부터 온체인으로 짓는 것 (이번 해커톤 핵심)

가장 중요한 인지: **신뢰네트워크의 시각·소셜 계층(Moi 아바타, MoiItem, Ium, InteriorItem, MoiGatherPlace)은 오프체인에 존재하지 않는다.** 계약상 14개 operation이 `deprecated` + 백엔드 501 + 프론트 전무다. "오프체인 → 온체인 전환"이 아니라 **처음부터 온체인으로 새로 짓는 그린필드**다. (출처: `_onboarding/00-READ-FIRST.md`, `_onboarding/05-IMPLEMENTED-VS-PLANNED.md`, `CLAUDE.md §4`)

- 미묘한 점: 이름 마스킹 해제가 `v3_iums` 테이블에 의존하지만 Ium CRUD UX는 501 → 이음은 **테이블만 존재**하고 생성 경로가 없다. `getUser`는 마스킹 cross-cutting이라 deprecated가 아니고 "우선 구현 예정". (출처: `_onboarding/05-IMPLEMENTED-VS-PLANNED.md`)
- 신용 모델은 1·2층 리서치 완성/골격, 3층은 시제품(`sim.mjs`), 4층 미구축 → **3·4층을 실제로 잇는 게 이번 목표.** (출처: `_onboarding/08-TRUST-BALANCE-CREDIT-MODEL.md`)

### 4-4. 결정 대기 항목 (큰 구현 전 사용자와 확정 필수)

`06` §F의 결정 대기 항목이 확정되기 전에는 큰 구현에 착수하지 않는다(`CLAUDE.md §3`). (출처: `_onboarding/06-SUI-ONCHAIN-DIRECTION.md`)

1. **익명 기록 claim 방식**: (a) 로그인 후 직접 발행 / (b) 참조-mint / (c) off-chain → mint 중? — SBT와 익명 claim이 충돌한다(soulbound면 익명 기록을 나중에 사용자 지갑으로 못 옮김). 익명 하객 데이터도 남기되, 1순위는 라운지 로그인 후 claim 귀속, 임시 fallback은 서비스 대리 서명. (출처: `_onboarding/06-SUI-ONCHAIN-DIRECTION.md`, `_onboarding/00-READ-FIRST.md`)
2. **돈 온체인 형태**: SUI로 시작 → USDSui 전환 시점·범위.
3. **WeddingCap soulbound 여부.**
4. **신용 점수 계산 위치**: 인덱서/오프체인 vs 온체인 모듈(가스·검증 트레이드오프).
5. **mainnet 배포 시점**(상금 100% 조건).

기존 zkLogin/프론트 태스크 C1~C12는 "하객 zkLogin" 오류 전제라, **dibang-wedding 중심 + 익명 퍼널 유지 + SBT** 기준으로 다시 짜야 한다. (출처: `_onboarding/06-SUI-ONCHAIN-DIRECTION.md`, `CLAUDE.md §4`)

---

## 5. 프로젝트의 여정 — v3 레거시에서 온체인으로

### 5-1. 어디서 왔나

세션 의도 백본(288개 세션유닛)은 작업 출처를 코드 A~F로 나눈다:
- **A = dibang-sui 현행**(이 저장소, Sui 온체인 방향).
- **B = 현행 워크트리**(Sui creator 신뢰보장·UpgradeCap·이벤트 신뢰성 같은 온체인 설계 논의).
- **C/D/E/F = digital-guestbook-v3 레거시 원천**(Sui 전환 *이전*의 오프체인 웨딩 서비스).
- (출처: `session-intent-notes.md` 머리주석·전 항목)

레거시 C/D/E/F가 압도적으로 많다. 거기서 만들어진 것이 지금 dibang-sui가 가져온 **오프체인 v3 웨딩 서비스 전체**다 — 라운지 피드, guest-web 퍼널, 청첩장 에디터(레터링·캔버스 드로잉), 호스트 초대, 축의 장부, 사진 공유, 웨딩 메모리북, 동의 온보딩, admin. 세션 백본에서 이 작업들은 "현재 Sui 방향과 단절된 레거시"로 표시되지만, **도메인 의도**(엔티티 설계 결정, 네이밍 논쟁, 버그 분석)는 살아 있어 보존됐다. (출처: `session-intent-notes.md` C/* 다수)

### 5-2. 무엇을 가져왔나 — v3 도메인의 정착된 결정들

레거시에서 굳어진, 그리고 현행으로 그대로 넘어온 핵심 결정들(출처: `_scenario/*`, `_architecture/DOMAIN_MODEL_SUMMARY.md`):

- `side`(2종) → `recipient_slot`(6슬롯) 전환. (`guest-web-flow`)
- GuestbookEntry/Message 본문 일원화(2026-05-25, `entries.message` 드롭). (`wedding-lounge §1-1`)
- `MoiVisit`/`LoungeEntry` → `LoungeCheckIn` 리네임 + user×lounge 1건 멤버십 그레인(AUD-0). (`wedding-lounge-page`, `DOMAIN_MODEL_SUMMARY`)
- `__HEART__` sentinel(하트 보내기 = `guestbook_messages.message='__HEART__'`, v2 `is_heart` boolean 대체). dibang-wedding은 하트 아이콘, mecdisplay는 SVG sticker, 메모리북 자동선별은 하트로 분리. (`display-port §1-5`, `wedding-memorybook §0-2`)
- 스토리지 보안 진화: dev 단일 public 버킷(obscurity) → prod 정석 public/private 2버킷 분리. (`photo-sharing §12`)
- 사진 공유 3분류(mobile-invitation/memory/share), presigned 통일. (`photo-sharing`)
- 웨딩 메모리북 v2→v3 이식(BE 32/32 + UI), Memory Domain Split(`v3_memories` 신설로 "온기"와 "LIVE 축하메세지" 책임 분리). (`wedding-memorybook`, `memory-domain-split`)
- User Consent Onboarding(3-테이블 `profiles`/`terms_documents`/`consent_records`, 첫 로그인 인터셉트). (`2026-05-26-user-consent-onboarding`)

### 5-3. 어디로 가나 — 온체인 전환의 방향

여정의 다음 단계는 명확하다(출처: `_onboarding/VISION-AND-INTENT.md`, `06-SUI-ONCHAIN-DIRECTION.md`, `08-TRUST-BALANCE-CREDIT-MODEL.md`):

1. **코어 도메인을 온체인으로**(빠르게, Supabase는 최후수단). 활동·관계 기록은 SBT, 돈은 SUI.
2. **신뢰네트워크 시각·소셜 계층(Moi/Ium/모이가모인곳)을 그린필드로 온체인 구축.**
3. **상호작용 → raw 액션 원장(온체인) → fold(신호 누적) → PageRank Φ(신용) → DeFi 상품**으로 4층 사다리의 3·4층을 잇기.
4. **zkLogin을 dibang-wedding 본체의 주 인증으로**, 익명 퍼널(guest-web)은 유지.
5. **mainnet 배포**(상금 100% + 자격).

이 흐름의 1차 데모 형태는 §1-4의 "로그인 → 온체인 상호작용 → 신용 점수 → DeFi 동작" 한 줄기다.

### 5-4. 이전 세션이 틀린 것 (반복 금지 — 가장 비싼 교훈)

여정에서 가장 값진 자산은 실수 목록이다. 안 읽고 시작했다가 헛다리 짚은 기록이다(출처: `_onboarding/07-LESSONS.md`):

- **L1**: 문서를 안 읽고 Move·SDK·zkLogin을 구현 → 빌드·테스트는 됐지만 서비스 의도와 어긋난 전제 위에 세워짐. **"빌드 통과 = 맞다"가 아니다.**
- **L2**: 익명 퍼널(guest-web)에 zkLogin 로그인을 붙임 → guest-web은 비로그인, 로그인 본체는 dibang-wedding.
- **L3**: 활동 기록(GuestbookEntry·CashGiftRecord·Ium)을 `key+store`(transfer 가능)로 작성 → 신용 무결성 위해 SBT(key-only)여야.
- **L4**: Moi/Ium을 "전환" 대상으로 봄 → 실제론 오프체인 미구현 그린필드.
- **L5**: 축의금을 단순 기록/오프체인 결제로 가정 → VISION §6대로 모든 송금은 SUI 온체인이 맞다.
- **L6**: 허락 없이 실행 시작 → 명시 지시 전엔 대기, 이해 부족하면 질문하고 답을 태스크에 반영 후 실행.

**검증이 잡아낸 좋은 사례도 기억하자**: testnet 스모크가 `Moi` key-only를 PTB `transferObjects`로 못 옮기는 `InvalidTransferObject`를 잡아 설계를 정정했고, 독립 보안 감사(Opus)가 sponsor 가스 탈취와 aud fail-open 두 CRITICAL을 잡았다. **testnet 실호출 + 독립 적대적 리뷰는 빌드/유닛이 못 잡는 결함을 잡는다 — 온체인·보안 작업엔 필수다.** (출처: `_onboarding/07-LESSONS.md`)

---

## 6. 신규 팀원 첫 걸음

### 6-1. 코드 만지기 전 필독 (순서대로)

`CLAUDE.md §0`이 못 박은 순서다. 안 읽고 시작하면 §5-4의 실수를 반복한다.

1. `_onboarding/VISION-AND-INTENT.md` — "왜 Sui인가"의 원천(오너 원문).
2. `_onboarding/00-READ-FIRST.md` — 가장 오해하기 쉬운 것들 + 체크리스트.
3. `_architecture/DOMAIN_MODEL_SUMMARY.md` — "무엇"의 단일 진실 원천(SSOT).
4. 작업 대상에 맞춰: `_onboarding/02-APP-BOUNDARIES.md`, `04-USER-JOURNEYS.md`, `05-IMPLEMENTED-VS-PLANNED.md`, `06-SUI-ONCHAIN-DIRECTION.md`, `08-TRUST-BALANCE-CREDIT-MODEL.md`.
(출처: `CLAUDE.md §0`, `_onboarding/00-READ-FIRST.md`)

### 6-2. 작업 전 체크리스트

- [ ] VISION → 00-READ-FIRST → DOMAIN_MODEL_SUMMARY(SSOT) 읽었나?
- [ ] 작업 대상 앱을 `02-APP-BOUNDARIES.md`로 확인했나? (익명 퍼널 guest-web vs 로그인 본체 dibang-wedding vs 운영 admin)
- [ ] 온체인 작업이면 `06`의 결정 대기 항목이 확정됐나? `08` 모델을 이해했나? 활동 기록 객체는 SBT(key-only) 원칙을 적용했나?
- [ ] 큰 구현 전에 사용자 의도를 다시 확인했나? (글로벌 `CLAUDE.md §0~§3`)
(출처: `_onboarding/00-READ-FIRST.md`, `_onboarding/07-LESSONS.md`)

### 6-3. 가장 자주 틀리는 5가지 (외워두기)

1. **guest-web = 비로그인 익명 퍼널.** 로그인/zkLogin/온체인 신원을 여기 붙이지 마라(→ dibang-wedding에). (단, 현재 코드 레이어엔 dev keypair 기반 온체인 best-effort 경로가 일부 실재한다 — `code/guest-web.md §7`의 경계 차이 참조.)
2. **신뢰네트워크(Moi/Ium 등)는 오프체인 미구현 그린필드.** "전환"이 아니라 새로 짓는다.
3. **활동·관계 기록은 SBT(key-only).** 거래/선물 자산만 store.
4. **돈은 SUI 온체인으로 흐른다.** 기록만이 아니다.
5. **목적은 신뢰잔액 → 신용 → DeFi.** 모든 (비민감) 상호작용이 입력이므로 온체인에 남긴다. Supabase는 최후수단.
(출처: `_onboarding/00-READ-FIRST.md`)

### 6-4. 영역별 빠른 진입점

| 작업 영역 | 먼저 볼 것 | 핵심 규칙 |
|-----------|-----------|-----------|
| Move 컨트랙트 | `contracts/dibang_wedding/sources/*`, `_code_convention/SUI_MOVE.md`, `~/.claude/skills/sui-dev-skills/` | TDD(`sui move test` red→green), SBT=key-only, 이벤트에 본문 충분히 |
| Sui SDK·프론트 온체인 | `packages/sui-sdk/src/*`, `_code_convention/SUI_SDK.md` | `@mysten/sui` v2, `tsc --noEmit`, sponsor 화이트리스트, testnet 실호출 검증 |
| Go API | `apps/api/server/*`, `_code_convention/BACKEND_STRUCTURE.md`/`BACKEND_TESTING.md` | handler thin → service → sqlc, `_test.go` 먼저, `go test -race` |
| 프론트(dibang-wedding) | `apps/dibang-wedding/src/*`, `_code_convention/STATE_MANAGEMENT.md`/`FRONTEND_*` | flow=xState, 값=zustand, 서버=Query, 의존성은 input 콜백 주입 |
| 프론트(guest-web) | `apps/guest-web/src/*` | 비로그인 퍼널, `@gorae/contracts` SDK, 직접 fetch 금지 |
| DB | `supabase/migrations/`, `_code_convention/DB_MIGRATIONS.md`/`DB_TESTING.md` | Supabase CLI만, flat 구조, Dashboard DDL 금지 |

### 6-5. 도구·작업 규율

- 패키지 매니저 **pnpm**, Move **sui CLI**, 백엔드 **go**. 탐색은 `rg`/`fd`, 코드 인덱스는 `codegraph`. (출처: `CLAUDE.md §6`)
- 빌드·검증: Move `sui move test`, Go `go build/test`, 프론트 `pnpm build`. 통과 확인 후 보고. UI 완료 보고엔 Playwright 스크린샷. (출처: `CLAUDE.md §5`)
- **커밋·푸시는 명시 지시 시에만.** 커밋 전 "커밋하겠습니다: [파일목록]" 발화. 브랜치/워크트리는 메인 체크아웃 임의 전환 금지(전역 §3-1·§3-2). GitHub 이슈 작업은 새 워크트리 분기. (출처: `CLAUDE.md §5`, 전역 `CLAUDE.md`)
- 폴더 표준: `_architecture`·`_audit`·`_research_*`·`_prototypes`·`_code_convention`·`_scenario` + 온보딩 핸드북 `_onboarding/` + 신뢰잔액 연구 `_research/gathering-taxonomy-trust-balance/`. (출처: `CLAUDE.md §7`)

---

> **마지막 한마디**: 이 핸드북은 지도이고, 진실은 코드와 원본 문서에 있다. 충돌하면 원본을 따르고, 모르면 추측하지 말고 실제 문서·코드·온체인 상태로 확인하라(`CLAUDE.md §1`, 전역 §2). 그리고 — **빌드가 통과해도 의도와 어긋나면 틀린 것이다.**
