# GLOSSARY — dibang-sui 신규 팀원용 용어집

> 신규 팀원이 도메인·기술·앱 경계를 빠르게 잡도록, 자료 근거로 정의한 용어집이다.
> 형식: `**용어** — 정의 (출처)`. 추측 없이 입력 자료(`05-process-pass5/_appended/docs/*.md`·`code/*.md`)에 명시된 사실만 옮겼다.
> 권위 순서: "왜/방향"은 `VISION-AND-INTENT.md`, "무엇"의 단일 진실 원천(SSOT)은 `_architecture/DOMAIN_MODEL_SUMMARY.md`, `_scenario/*`는 구현용이라 도메인 모델과 충돌 시 도메인 모델이 우선.
> 정렬: 한글(가나다) → 영문(알파벳) 순. 한 용어가 한글·영문을 같이 쓰면 대표 표기 한 곳에 두고 다른 표기를 함께 적었다.

---

## 한글 용어 (가나다)

**관계 카테고리 (relation_category)** — 하객이 어느 관계로 참석했는지 고르는 객관식 6종. GuestbookEntry·CashGift에서 `recipient_slot`과 함께 필수(NOT NULL + 6종 CHECK). LoungeCheckIn에서는 nullable·앱 레벨 검증만. (출처: docs/architecture.md §2 GuestbookEntry·CashGift·LoungeCheckIn)

**누구측 6슬롯 (recipient_slot)** — 하객이 "누구 측 손님인가"를 고르는 6개 슬롯: `groom`(신랑)·`bride`(신부)·`groom_father`·`groom_mother`·`bride_father`·`bride_mother`. GuestbookEntry·CashGift·HostInvite·RSVP·온체인 `wedding::is_valid_recipient_slot`이 공유하는 핵심 enum. (출처: docs/architecture.md §2·§8, code/move-contracts.md §2 wedding)

**라운지 (Wedding Lounge / WeddingLounge)** — 한 결혼식의 신뢰네트워크를 시각화한 디지털 공간(Wedding과 1:1). 피드·사진·MoiGatherPlace 등 Host·Guest 상호작용 영역을 포함. 청첩장이 "입장 전 안내"라면 라운지는 "입장 후 상호작용". 온체인에서는 `wedding::WeddingLounge`(key-only 공유 오브젝트). (출처: docs/architecture.md §2 WeddingLounge, code/move-contracts.md §2)

**모이 (Moi)** — 신뢰네트워크를 구성하는 인물(노드)을 시각화한 아바타. User 자체가 아니라 User의 시각적 표현이며 단순 캐릭터 그래픽이 아닌 "신뢰네트워크의 노드". User:Moi = 1:1. 어원은 프랑스어 "나(me)"·베트남어 "초대(mời)"·핀란드어 "안녕(moi)"·한글 '모이는'의 '모이'. 오프체인 미구현(그린필드), 온체인 `moi::Moi`는 soulbound(key-only). (출처: docs/architecture.md §1, docs/onboarding.md §17, code/move-contracts.md §3)

**모이가모인곳 (MoiGatherPlace / GatherPlace)** — 라운지 안에서 신뢰네트워크의 "이미지화"를 담당하는 영역. Moi 캐릭터·아이템·InteriorItem 이미지로 깊은 시각 표현 제공(라운지와 1:1). 구현 현황(R2, 2026-05-18): 미구현·추후 발전 예정 — 현재 LoungeCheckIn은 MoiGatherPlace 경유 없이 단순화. (출처: docs/architecture.md §2 MoiGatherPlace)

**모이아이템 (MoiItem)** — 모이가 직접 착용·사용하는 아이템(슬롯에 장착). 공간에 배치하는 InteriorItem과 다름. **거래·선물 의도가 있는 자산이라 예외적으로 `store` 보유**(온체인 `moi::MoiItem`은 key+store NFT) — 단 신용 "기록" 입력에서는 제외. 오프체인 미구현(그린필드). (출처: docs/architecture.md §2 MoiItem, docs/onboarding.md §10, code/move-contracts.md §3·§8-1)

**방명록 메시지 (GuestbookMessage)** — GuestbookEntry에 시간순으로 누적되는 개별 방명록 글(Entry:Message = 1:N). 라운지 피드·스토리에 노출되는 실제 글이며 라운지 내 '+'(글 작성)의 산출물. 최대 70자(불변식 표기상 60자), 첨부 사진 0~1장, `view_count`(본인 제외 집계 파생). 2026-05-25 본문 일원화로 GuestbookEntry의 `message` 컬럼을 드롭하고 본문을 여기로 모음. (출처: docs/architecture.md §2 GuestbookMessage·§4)

**방명록 정체성 (GuestbookEntry)** — 한 Guest가 특정 라운지에 남기는 방명록 정체성 단위(누가·어느 라운지에·어떤 관계로 참석했는지). 본문은 GuestbookMessage로 1:N 누적. `guest_id` optional이라 비로그인 작성 가능. 온체인 `guestbook::GuestbookEntry`는 활동 기록이므로 **key-only(SBT)로 정정 대상**(현재 key+store). (출처: docs/architecture.md §2 GuestbookEntry, docs/onboarding.md §10, code/move-contracts.md §5)

**부조 (扶助)** — 하객→혼주의 축의처럼 "갚아야 할 장부"가 남는 호혜성 금전 흐름. 즉시 청산되는 거래(MP)와 구조적으로 다르며, EM(호혜) 원장에 미청산 잔액으로 쌓인다. "같은 돈 건넴"이라도 (하객→혼주)면 부조, (혼주→업체)면 거래로 갈린다 — 해석은 raw 동사가 아니라 (동사 × 역할쌍 × event_type)이 정한다. (출처: docs/research-and-claude.md A3 N6·A7·A11)

**신뢰네트워크** — 인간이 사회적 동물로서 진화시켜온 관계망. 결혼식·장례식 등에서 기쁨·슬픔을 나누는 행위는 본질적으로 "관계를 사기 위한 에너지·재화의 교환"이고, 감정 교류는 관계 유지를 위한 에너지. 단순 SNS 친구 관계가 아니라 오프라인 관계 행위 전부를 포함. 디방이 발굴·활용해 부가가치를 만들려는 가장 중요한 핵심 개념. (출처: docs/architecture.md §1)

**신뢰잔액 (Trust Balance)** — 상호작용 데이터를 누적해 도출하는 관계별 잔액. 두 원장으로 갈림: EM 원장(호혜, 방향별 누적·청산 가능·아벨군)과 CS 원장(유대, 양방향 독립·청산 없음). 좋아요·하트·댓글·방문 등 모든 비민감 상호작용이 입력. 신뢰잔액 → 신용 → DeFi가 프로젝트의 목적. (출처: docs/onboarding.md §3·§12, docs/research-and-claude.md A7)

**신용 (Credit)** — 한 사람(지갑)의 속성으로, 신뢰잔액(관계망)을 PageRank류로 전파해 산출하는 점수. "유대 ≠ 신용" — 유대는 관계의 속성, 신용은 사람의 속성이며 "누구와 엮였나"로 정해진다(고유벡터 중심성=PageRank의 신뢰 버전). first-cut 시제품 공식: 최종신용 = 0.5·부조 + 0.3·CS + 0.2·이행. 비중·계수는 임의·튜닝 대상이라 온체인에 박지 않는다. (출처: docs/onboarding.md §12, docs/research-and-claude.md A8·A10 H12)

**액션 원장 (raw 액션 원장)** — 온체인에 저장하는 "raw 액션의 불변(SBT) 원장". `action_type`(돈건넴·옴·서명·초대·말함…) + actor·target·event·resource·amount·timestamp를 저장하고, **해석(부조/거래/EM·CS·신용)은 저장하지 않고 규칙으로 계산**한다. 같은 행위의 다중 해석·규칙 진화를 허용하려면 raw만 저장해야 한다. (출처: docs/onboarding.md §9, docs/research-and-claude.md B3·C)

**이음 (Ium)** — User와 User 간의 관계(신뢰네트워크의 엣지). User들과 Ium들의 집합이 '신뢰'로 표현됨. 단순 식별 관계가 아닌 "신뢰의 단위"이며 방향성 있음(from→to). 이름 마스킹 해제 조건이 `v3_iums`에 의존하지만 생성 UX는 미구현(테이블만 존재). 온체인 `ium::Ium`은 활동·관계 기록이므로 **key-only(SBT)로 정정 대상**(현재 key+store). (출처: docs/architecture.md §1·§2 Ium, docs/onboarding.md §7·§10, code/move-contracts.md §4)

**이름 마스킹** — 모든 API 응답에서 타인 이름을 기본 마스킹("김민태"→"김\*태"). DB엔 항상 실명, API 서버가 응답 생성 시 분기. 해제 조건(OR): ① 요청자가 그 Wedding의 Host, ② 요청자↔대상 간 Ium 관계 존재(`v3_iums` 양방향). 비로그인은 항상 마스킹. 온체인은 공개라 민감정보 평문 저장 금지와 직접 충돌하는 cross-cutting 제약. (출처: docs/architecture.md §8, docs/onboarding.md §5)

**인테리어아이템 (InteriorItem)** — MoiGatherPlace(공간)를 꾸미는 조형물(공간에 배치). 모이가 착용하는 MoiItem과 다름. `status`('placed'|'unplaced')·`position`(배치 시). 오프체인 미구현(그린필드). (출처: docs/architecture.md §2 InteriorItem)

**입장 기록 (LoungeCheckIn)** — 한 User가 특정 WeddingLounge에 입장했다는 멤버십 기록. **user×lounge 정확히 1건**(DB UNIQUE, 재입장해도 안 늘어남 — 방문 이력이 아닌 멤버십, AUD-0 2026-05-19). 라운지 입장은 로그인 필수(Host도 가능)이며 퍼널→본체 전환의 로그인 게이트. (출처: docs/architecture.md §2 LoungeCheckIn·§4, docs/onboarding.md §5)

**청첩장 (Mobile Invitation / MobileInvitation)** — Wedding을 외부에 공유하는 디지털 청첩장. 디자인 템플릿·인사말·갤러리로 WeddingInfo를 시각화하고 `slug`(UNIQUE 공유 링크)로 공유. "정보를 보여주는 옷"이며 라운지(입장 후 상호작용)와 다름(입장 전 안내). guest-web 퍼널 A의 대상. (출처: docs/architecture.md §2 MobileInvitation, docs/onboarding.md §4)

**축의금 (CashGift)** — 하객이 혼주에게 전달하는 축의금 기록. 오프체인에서는 앱이 딥링크로 송금 유도 후 기록만 남김(`pay_method` ∈ transfer/kakaopay/toss/cash). **온체인 목표는 실제 SUI 송금**(추후 USDSui) — `cash_gift::CashGiftVault`(공유 모금함)에 SUI를 모으고 송금마다 `cash_gift::CashGiftRecord` 영수증 + 이벤트, 인출은 WeddingCap 보유자만. CashGiftRecord는 부조 영수증이라 **key-only(SBT)로 정정 대상**(현재 key+store). (출처: docs/architecture.md §2 CashGift, docs/onboarding.md §10, code/move-contracts.md §7)

**호스트 (Host, 역할)** — 한 Wedding에서 호스트로 정해진 유저들(해당 Wedding 한정 역할, 다른 Wedding에선 Guest일 수 있음). User의 영구 속성이 아님. Wedding당 1~6명(신랑·신부·양가 부모). API 접근 정책 `host`(JWT user_id가 그 Wedding host 슬롯에 있는지 검증)의 주체. (출처: docs/architecture.md §2 역할·§8, docs/onboarding.md §4)

**호스트 초대 (HostInvite)** — Host(신랑/신부)가 양가 부모 4 + 배우자를 그 Wedding의 Host 슬롯에 초대하는 토큰 기반 초대장(Host 역할 자체가 아닌 초대 수단). `token`(unique)·`status`(pending/accepted/cancelled). 부모/배우자 Host 권한은 라운지·웨딩리포트 접근 가능, 청첩장 수정·추가만 제외. accepted는 취소 불가(온체인 finality와 정합). (출처: docs/architecture.md §2 HostInvite·§4, docs/onboarding.md §18)

**혼주 (婚主)** — 결혼식의 주체로 축의를 받는 6명(신랑·신부·양가 부모). recipient_slot 6종과 대응하며, 온체인 코드에서 "혼주 슬롯"으로 지칭(`MAX_HOSTS = 6`, `is_valid_recipient_slot`). (출처: code/move-contracts.md §2 wedding)

---

## 영문 용어 (알파벳)

**ActionRecord / action (액션)** — 신뢰잔액 계산의 원자 단위이자 fold의 입력. 정적 데이터 모델 v0.1에서 `action(id, event_id 필수, actor, action_type, target nullable, payload, timestamp)`로 저장하는 "보편 액션(raw fact, 도메인 중립)". 신뢰 해석값(자원·청산·극성·공개)은 여기 박지 않고 `project` 함수가 파생(저장 안 함). 영어 event-sourcing의 "event"가 여기 "action"에 대응. (출처: docs/onboarding.md §12, docs/research-and-claude.md A10 H11)

**admin (앱)** — 별도 운영 앱(`apps/admin`). render.yaml 블루프린트에 없는 런타임 토글 앱. "read-only"가 아니라 운영 mutation 포함(웨딩 삭제·호스트 슬롯 이동·유저 수정 등 파괴적 작업, live 계약 admin operation 30여 개). 이메일 allowlist `AdminGuard`가 `/admin/*` 전체를 메서드 무관 보호. (출처: docs/architecture.md §7·§12, docs/onboarding.md §4)

**CS (Communal Sharing, 유대)** — 신호 3층위 중 하나. 유대 강도·무청산·비대칭이 특징이며 양방향 독립으로 누적(상쇄 없음, 배신=음수 가능). 가족에게 부조 안 하듯 "잔액(빚)" 개념이 없어 신용 함자 Φ의 정의역이 아니다(그건 EM). 초대·참석·축전·동석 등 돈 0인 행위가 CS○. (출처: docs/onboarding.md §12, docs/research-and-claude.md A7·A11·A10 H3)

**dual-write (이중 기록)** — 결혼식 생성을 Supabase(오프체인) 먼저 + 온체인 둘 다에 기록하는 패턴. 흐름: Supabase `createWedding`으로 weddingId 확보 → 온체인 `createWedding`/`createVault` 발행 → `updateWeddingSuiIds`(`PATCH /weddings/{id}/sui-ids`)로 `sui_wedding_id`/`sui_lounge_id`/`sui_vault_id`를 DB row에 역기록. **온체인 실패 격리**: 온체인이 실패해도 Supabase 생성은 유지하고 sui_id는 null로 두어 추후 재시도. (출처: code/dibang-wedding-frontend.md §4-3, code/packages-sdk.md §2 types.gen·온보딩 시사점)

**dibang-wedding (앱)** — 로그인 서비스 본체. `RegisterUser`+`CreateMoi` 이후 모든 Use Case(Host 기능·Guest 기능·공통). **zkLogin·온체인 신원·신뢰네트워크(Moi/Ium)는 모두 여기 소속**(guest-web에 붙이지 않는다). 경계 기준은 "전환 퍼널이냐 서비스 본체냐"이며 로그인 여부는 보조 설명. (출처: docs/architecture.md §7, docs/onboarding.md §4, 프로젝트 CLAUDE.md §2)

**EM (Equality Matching, 호혜 잔액)** — 신호 3층위 중 하나. 호혜 잔액·청산 가능이 특징. 방향별 `gave[A→B]`를 누적해 `net = gave[A→B] − gave[B→A]`, (ℤ,+) 아벨군(역원=되갚음=청산). **EM만 미청산 잔액을 지원하므로 신용 함자 Φ의 정의역**. 부조가 대표 사례(축의는 갚을 기회가 와야 청산). (출처: docs/onboarding.md §12, docs/research-and-claude.md A7·A10 H3)

**fold** — 2층 동역학의 핵심 연산. 입력은 이벤트가 아니라 신호(project 출력)이며, 신호들을 시간에 따라 누적해 관계·집단 상태를 만든다. 순수 부호 덧셈이라 결합·교환법칙 성립 → 순서 무관(모노이드/아벨군). fold 키 = (from, to, 자원, 청산구조, default판정). (출처: docs/research-and-claude.md A7)

**Guest (역할)** — 한 Wedding에서 Host가 아닌 유저들. 외부인이 아니라 해당 Wedding 참여자이며 영구 역할이 아님. 라운지 입장·피드 하트/댓글·모이 조회 등을 함. 한 Wedding에서 같은 User가 Host와 Guest를 겸할 수 없음. (출처: docs/architecture.md §2 역할·§4, docs/onboarding.md §4)

**guest-web (앱)** — 비로그인 익명 전환 퍼널. 공유 링크/QR 착지점으로 두 갈래 퍼널(A: 청첩장 보기·하트·라운지 티저 / B: 누구측 6슬롯 → 관계·이름 → 금액 → 송금 → 메시지/하트 → 완료)이 모두 라운지 진입을 유도. **비로그인 축의(현금 송금)까지 여기서 책임**(2026-05-18 확정). **로그인/zkLogin/온체인 신원을 여기 붙이지 않는다**(이전 세션이 틀린 지점). (출처: docs/architecture.md §7, docs/onboarding.md §3·§4, 프로젝트 CLAUDE.md §2)

**Manager (역할)** — 기본 Guest지만 축가·축의금·부케 등 들러리로 역할하는 유저. **도메인 정의만 존재 — DB·계약·구현에 미반영(로드맵 보류).** 현재 어느 테이블에도 Manager 표현 없음. (출처: docs/architecture.md §2 역할)

**PTB (Programmable Transaction Block)** — Sui의 여러 커맨드를 한 트랜잭션으로 합성하는 구조. SDK 빌더가 대부분 오브젝트를 모듈 내부에서 transfer하지 않고 **반환**해 PTB가 `transferObjects`로 합성하도록 함(예: `create_wedding`→WeddingCap, `write_entry`→GuestbookEntry). 예외: soulbound(key-only) 객체는 PTB `TransferObjects`로 못 옮겨 모듈이 직접 `transfer::transfer`(예: `create_moi`). 빌더는 `Transaction`(`@mysten/sui/transactions`), 구 `TransactionBlock` 금지. (출처: code/move-contracts.md §8-2, code/code-convention.md §10·§11)

**RSVP (참석 의사)** — 모바일 청첩장 참석 의사 응답. 온체인 `rsvp` 모듈은 **응답 건마다 오브젝트를 만들지 않고 `RsvpSubmitted` 이벤트만 발행**(가스 절약), 호스트가 이벤트 조회로 측별 참석 현황 집계. 필드: recipient_slot·guest_name·attendance(attending/absent)·companion_count·meal(yes/no/undecided). 오프체인 REST에는 `createRsvp`/`listRsvps`. (출처: code/move-contracts.md §6, code/packages-sdk.md §1 rsvp·§2)

**SBT (Soul Bound Token, key-only vs store)** — transfer 불가 토큰. Move 능력(ability)으로 구분: **`key`만 = soulbound(transfer 불가)**, **`key + store` = 누구나 전송 가능**. 프로젝트 핵심 규칙: **활동·관계 기록(방명록·축의·이음 등)은 신용평가 무결성을 위해 transfer 불가여야 하므로 `key`만으로**, 거래/선물 의도 자산(MoiItem 등)만 `store`. 정정 대상 3개 = GuestbookEntry·CashGiftRecord·Ium(현재 key+store). MoiItem은 store 유지. (출처: docs/onboarding.md §3·§10, code/move-contracts.md §8-1, code/code-convention.md §10)

**sponsor 가스대납 (Sponsored Transaction)** — 사용자 대신 sponsor가 가스를 내주는 트랜잭션. 흐름: 클라이언트가 `onlyTransactionKind`로 빌드 → sponsor가 sender/gasOwner/budget 설정·허용 패키지 검증·서명 → 클라이언트가 zkLogin 서명 → 두 서명으로 실행(sponsor는 Node 서비스 `scripts/sponsor-server.ts`). **보안 핵심 `assertSponsorable`**: 모든 커맨드를 화이트리스트 검사 — MoveCall은 허용 패키지만, 어떤 커맨드도 가스 코인(`tx.gas`)을 인자로 쓰면 거부(없으면 가스 탈취 가능 — 실제 발견된 CRITICAL), Publish/Upgrade/미지 커맨드 거부. (출처: code/packages-sdk.md §1 sponsor, docs/onboarding.md §8, code/code-convention.md §11)

**SSOT (Single Source of Truth, 단일 진실 원천)** — 충돌 시 기준이 되는 단일 원천. 권위 순서: ① `VISION-AND-INTENT.md`("왜/방향", 오너 원문) ② `_architecture/DOMAIN_MODEL_SUMMARY.md`("무엇": 엔티티·불변식·관계) ③ `_scenario/*`("어떻게": 구현 시나리오 — 구현용이라 도메인 모델과 어긋나면 도메인 모델을 따른다). 영역별로도 SSOT가 있다(상태관리=`STATE_MANAGEMENT.md`, 테스트=`TESTING.md`, API operationId=`api-contract.yaml`). (출처: docs/onboarding.md §2, docs/architecture.md §10, 프로젝트 CLAUDE.md §1)

**User** — 디방 서비스의 계정 주체(이메일·전화로 식별되는 한 사람). 영속적인 Moi 1개를 보유(1:1). Moi(아바타)가 아니고 Host/Guest 같은 역할도 아님(역할은 특정 Wedding 컨텍스트에서 부여). 온체인 목표는 "지갑 1개 = User 1개(영속)". (출처: docs/architecture.md §2 User, docs/onboarding.md §5)

**Wedding** — 한 결혼식 이벤트. Host(들)이 만드는 최상위 단위로 라운지(WeddingLounge)와 청첩장(MobileInvitation)을 가짐(오프라인 결혼식 자체가 아닌 디지털 표상). 복합 생성: `POST /weddings` 한 번에 Wedding+WeddingLounge+MoiGatherPlace+MobileInvitation을 단일 트랜잭션으로 생성. 온체인 `wedding::Wedding`은 key-only 공유 오브젝트, 수정 권한은 `WeddingCap`. (출처: docs/architecture.md §2 Wedding·§8, code/move-contracts.md §2)

**WeddingCap** — 결혼식 수정·호스트 추가·모금함 생성/인출 권한을 증명하는 온체인 capability(`wedding::WeddingCap`, 현재 key+store). 검증은 `cap.wedding_id == object::id(wedding)` 비교 후 `EWrongCap` abort. soulbound 여부는 결정 대기 항목(자유 이전은 host-invite를 우회하므로 key-only 검토). (출처: code/move-contracts.md §2·§8-3, docs/onboarding.md §10·§11)

**XState 머신화 (전면 머신화)** — 모든 페이지·컴포넌트의 flow(상태 전이)를 xState machine으로 관리하는 컨벤션(2026-06 개정). flow를 useState로 관리하는 코드는 작성 금지. 역할 분담: xState=flow 제어, zustand=폼 데이터 값, TanStack Query=서버 상태 캐시+fetch. 기준 패턴 `invitationCreate.machine.ts`. 머신 정의가 React Query mutation·캐시 무효화 등 앱/서버 의존성을 직접 호출 금지 — `input` 콜백으로 주입. (출처: docs/architecture.md §10, code/code-convention.md §6)

**zkLogin** — Google 등 OAuth(OIDC)로 Sui 지갑 주소를 만드는 로그인 방식. 흐름: ephemeral keypair+nonce → Google OAuth id_token → Salt 서버 → `jwtToAddress`(오프라인·결정적) → ZK prover proof → zkLogin 서명 조립(ephemeral 키는 sessionStorage). 목표는 Supabase 로그인을 대체하되 user 행(최소 Sui address)은 DB 유지. **dibang-wedding 소속**(guest-web 아님). 라이브 검증엔 Google OAuth client + ZK prover 필요(헤드리스 불가). (출처: code/code-convention.md §11, code/packages-sdk.md §1 zklogin, docs/onboarding.md §5)

---

## 부록 — 자주 헷갈리는 구분

- **Moi vs MoiItem vs InteriorItem**: Moi=아바타(노드, soulbound) / MoiItem=모이가 착용(슬롯, store NFT) / InteriorItem=MoiGatherPlace 공간에 배치하는 조형물. (출처: docs/architecture.md §2)
- **GuestbookEntry vs GuestbookMessage**: Entry=방명록 정체성 단위(1) / Message=거기 누적되는 개별 글(N). 2026-05-25 본문은 Message로 일원화. (출처: docs/architecture.md §2)
- **청첩장 하트 vs 피드 하트**: 청첩장 하트=`MobileInvitation.heart_count`(public) / FeedHeart=라운지 피드 항목 반응(1인 1하트 토글). (출처: docs/architecture.md §2)
- **key-only의 두 쓰임**: soulbound 소유 오브젝트(Moi)도 key-only, 공유 오브젝트(Wedding·WeddingLounge·IumRegistry·CashGiftVault)도 key-only(소유·이전 개념 없음). store 없음이 곧 SBT만 뜻하는 건 아님. (출처: code/move-contracts.md §8-1)
- **부조(EM) vs 거래(MP)**: 같은 "돈 건넴"도 역할쌍이 가른다. 부조는 청산 가능한 EM 잔액으로 남고, 업체 거래는 즉시 청산(MP)되어 2층 잔액 0 — 단 3층 신용엔 이행률로 기여. (출처: docs/research-and-claude.md A11)
