# Sui 컨트랙트 설계 방향 (v2 — opus 3인 적대 리뷰 반영)

> 목적: dibang wedding + inyeon(신뢰네트워크)을 **object-centric Sui Move**로 재설계. 현재 컨트랙트가 EVM/Solidity식이라 신뢰-신용 모델을 못 담음.
> SSOT: `_architecture/DOMAIN_MODEL_SUMMARY.md` · 모델: `_onboarding/08-...`, `_research/gathering-taxonomy-trust-balance/` · 비전: `_onboarding/VISION-AND-INTENT.md`.
> 이 문서는 **방향 제시**(구현 아님). v2는 opus 4.8 리뷰 3건(Sui/Move 정합성, 범주론 충실도, 보안·프라이버시·스케일) 반영. 결정 대기 = §11.

> # ⚠️ SSOT 선언 (이 문서·코드 어디서 읽든 이게 기준)
> - **신뢰·Wedding 데이터의 단일 진실원천(SSOT) = 온체인(Sui).** raw 신호·Event·Participation·ActionRecord·신용은 전부 온체인 원천. DB(Supabase/Go API)는 표시콘텐츠(이름·사진, 결정A)·캐시 **보조**.
> - 현재 앱이 Wedding 등을 DB에서 읽는 건 **전환기(TRANSITIONAL)** — "DB 우선" 설계가 아니다(앱이 온체인화 이전에 DB-first로 지어졌고 온체인을 dual-write로 얹은 상태).
> - **명시적 목표(미완): 앱을 온체인(Sui RPC/indexer) 읽기로 이관.** 이게 끝나야 코드=의도가 되어 오해가 원천 차단된다.

---

## 0. 한 줄 요약

현재 컨트랙트는 "기능별 독립 컨트랙트(웨딩·방명록·축의·이음)"라는 **Solidity 앱 구조**다. 신뢰-신용 모델이 요구하는 건 **모든 상호작용이 한 노드(Moi)에 귀속되는 변경불가 SBT 액션 원장**이고, 그 위에서 오프체인이 fold→Φ(범주론적 신용 함자)를 계산하는 구조다. 재설계 핵심: **(1) 보편 액션 원장을 온체인 신뢰 substrate로, (2) 전역 레지스트리·주소 allowlist 같은 EVM 잔재를 object/capability 구조로, (3) 그래프 프라이버시·시빌 내성·스케일 티어링을 1급 설계로.**

> **냉정한 메타-결론(리뷰 합의):** 범주론은 *오프체인 함자 Φ*를 정확히 기술하지만 *컨트랙트*에는 거의 요구사항을 주지 않는다("store raw directed edges with enough context" 한 줄로 환원). 그리고 v1 초안의 일부 메커니즘(dof-on-Moi soulbound, Ium accept, 익명 claim)은 **틀렸거나 위험**해서 v2에서 교체했다.

---

## 1. 진단 — 현재 컨트랙트가 "EVM식"인 지점 (코드 근거 포함)

### 1-1. 아키텍처: 기능별 독립 컨트랙트 (가장 큰 문제)
wedding/guestbook/cash_gift/ium이 각자 record를 들고 있는 "한 기능=한 컨트랙트(+자기 매핑)" 패턴 = Solidity dApp 사고방식. 신용 모델은 이 기록들을 **하나의 보편 액션 원장**으로 봐야 fold가 되는데 그 통합 substrate가 **없다**(그린필드).

### 1-2. `ium.move` 전역 레지스트리 = Solidity mapping (최우선 결함)
- `IumRegistry`(shared singleton)+`(from,to)→true` df = `mapping(addr=>mapping(addr=>bool))` 직역. `df::add(key,true)`의 `true`는 안 읽음(=set 흉내). (ium.move:31,60,68,80)
- **모든 관계 생성이 단일 shared object `&mut`로 직렬화** → Sui 객체-병렬성을 죽임. Sui 쓰는 이유를 깎는 가장 비싼 결함.

### 1-3. SBT 위반 + 비합의 엣지 (보안)
- `Ium`·`GuestbookEntry`·`CashGiftRecord`가 `key+store` → 제3자 transfer 가능(테스트가 실제로 `public_transfer`). 신뢰 세탁 가능 → 전부 key-only.
- `ium::create_ium`은 caller가 `to_user`를 임의 지정·**일방 발행**(to_user 서명 없음, ium.move:67-80). 아무나 타인에게 inbound 신뢰 엣지를 위조 가능. → request→accept 합의 필수.

### 1-4. 프라이버시: 평문 민감정보 온체인 (현재 testnet 유출 중)
- `cash_gift::CashGiftRecord`가 `guest_name`·`relation_category`를 **평문 String 온체인** 저장(cash_gift.move:44-49). `ium::Ium`이 `relation_type`·`label` 평문(ium.move:24-25). VISION §7(민감정보 비온체인) 위반이 **이미 배포돼 있음**.

### 1-5. `wedding.move` 주소 allowlist + god-object
- `host_addresses: vector<address>`(최대6, 선형스캔) = Solidity 접근목록. `WeddingCap`이 이미 증명하는 권한 중복 → **host당 Cap 1개 발행(possession=권한)**으로 대체.
- 15필드 god-object → 선택/확장 필드는 dynamic field로 슬림화.

### 1-6. micro EVM-ism
- **stringly-typed enum**(recipient_slot/attendance/meal/relation_type/slot) → **u8 상수**(업그레이드 안정성상 Move `enum`보다 u8 권장: 변형 추가가 append-only).
- `moi::Moi.owner: address` 중복 — 단 제거엔 트레이드오프 있음(§3-A).

### 1-7. 잘 된 부분(템플릿)
- `moi.move`: `Moi` key-only soulbound(정답), 아이템 dof + VecMap 인덱스(정석). 본보기.
- `cash_gift`: `Balance<SUI>` shared vault(정석), WeddingCap withdraw 게이트(정석).
- UID 객체·이벤트·PTB 반환형 함수 이미 씀 → "완전 EVM" 아님. 핵심은 **통합 + SBT + 전역레지스트리 제거 + 프라이버시**.

---

## 2. 설계 원칙

1. **raw 액션 저장 / 해석은 계산.** 온체인=raw 동사(action_type)+맥락(actor·target·event·role·amount·ts). 부조/거래/EM/CS/신용/±극성/청산/**자원종류(resource)**는 **저장 X, project로 계산**. 튜닝 상수(전파 비중·default 페널티)도 온체인에 안 박음.
   - **정정(R2):** v1이 `resource` enum을 raw로 저장했는데 이는 **해석 누출**이다. money/item/photo 구분은 이미 `action_type`에 들어있으므로 `resource`를 **스키마에서 제거**한다.
2. **SBT-by-construction = key-only + `transfer::transfer`.** (정정 R1) 활동·관계 기록은 `key`-only(no `store`)로 만들고 모듈이 actor 지갑으로 `transfer::transfer`. 이것만으로 transfer 불가·**top-level 조회 가능**·**경합 0**. ~~Moi에 dof 자식으로 매다는 방식(v1)은 폐기~~ — dynamic_field는 객체를 wrap해 인덱서가 못 보고, Moi에 쓰기경합을 만든다. dof는 **per-Moi 카운터/인덱스**에만, 그것도 `dynamic_object_field`로.
3. **per-node 지역성 > 전역 레지스트리.** 유니크·엣지는 **서명자 본인 Moi**에서 지역 강제(전역 singleton 제거). 단 cross-owner `&mut` 금지(§3-F).
4. **capability > 주소체크/allowlist.**
5. **돈은 실제 온체인(SUI now, USDSui later).** 부조 = Coin<SUI> 이동 + 액션 기록을 PTB 한 트랜잭션 원자 실행.
6. **컨트랙트는 신원-불가지(identity-agnostic) 지갑 그래프 (오너 결정 2026-06-20, 토대 원칙).** 설계는 사람의 **이름·성별·정체를 아예 모른다고 가정** — 오직 "어떤 지갑 ↔ 어떤 지갑이 이렇게 연결됐다"만 다룬다. 따라서 PII는 온체인 X(현재 위반 제거), amount·target 등은 가명 주소 그래프라 **공개 수용**(신원 비식별이 invariant, §7). 그래프 재식별은 잔여 위험(나중).
7. **범주 구조는 오프체인 함자.** 온체인=raw 엣지(그래프 잉크). Φ(enrichment·전파)는 오프체인. 온체인은 Φ를 *계산할 수 있을 만큼 충분한 raw*만 — 그 "충분함"의 정확한 목록이 §4.
8. **온체인 raw는 sybil-permissive, Φ가 시빌 필터.** 누구나 싸게 액션을 민팅 가능하므로 신뢰는 raw 카운트가 아니라 Φ(전파·할인)에서 나온다 — DeFi는 raw 엣지 수를 절대 신뢰하지 않는다(§8).

---

## 3. 핵심 객체 모델 (v2)

### 3-A. 노드/정체성
- **`Moi`** (key-only soulbound) — 신뢰 노드, 지갑 1:1. `owner: address`는 **유지 권장**: Move 안엔 `object::owner()`가 없어, 어떤 로직이 "이 Moi가 sender 것"임을 단언하려면 필드가 필요. (제거하려면 모든 참조를 Moi ID 기반으로 바꾸는 감사 선행.)
- **zkLogin** — 인증 레이어(Move 밖). Moi 소유 지갑이 zkLogin 주소. dibang-wedding 소속.

### 3-B. 보편 액션 원장 (NEW — 신뢰 substrate)
```
ActionRecord (key-only soulbound) {
  id, event_id: ID, action_type: u8,
  actor: address, target: Option<address>,
  role_id: u8,                 // ★ R2: 방향의 원천 — 없으면 fold가 무방향 (최우선)
  amount: u64,                 // raw 사실(돈은 실제 이동) — 저장 타입은 §11.1 결정(u64 평문 vs u8 버킷 vs 커밋)
  settles: Option<ID>,         // ★ R2: 이 액션이 청산하는 이전 의무(대여 상환/부조 답례). 대여 default 계산의 raw 링크
  ts: u64,
}
event ActionLogged { 위 필드 미러 }   // 인덱서 fold 입력
```
- **mint 경로 봉인(R1):** `ledger::log`는 **`public(package)`** — 도메인 모듈만 호출(아무나 위조 불가). 외부엔 **얇은 typed 진입함수**(`cash_gift::give`, `inyeon::view_photo`…)만 노출하고 그 안에서 `action_type`/`role`/불변식을 하드코딩 → generic 구조가 잃는 타입안전성 회복.
- `action_type`/`role_id` = **u8 상수**(업그레이드 append-only).
- **`resource` 없음**(해석). **dual-signal**(참석=EM시간+CS유대)은 off-chain `project`가 한 action_type을 신호 둘로 fan-out — 그래서 resource를 raw에 박으면 안 됨(R2).

### 3-C. 이벤트/참가 (방향의 원천)
- **`Event`** (wedding=shared 허브 / inyeon 매칭=Ium이 대체, §3-F) — `Event { id, event_type: u8, time_window, place_ref?, ... }`. **모든 `event_id`가 읽을 수 있는 `Event.event_type`로 resolve돼야** project=f(action_type×event_type×role)가 성립(R2).
- **`Participation`** (key-only soulbound) — 역할 바인딩(혼주/하객/주례/initiator/receiver). **fold 방향**. ActionRecord의 `role_id`는 actor가 그 event에서 가진 Participation과 정합해야.
  - **★ 온체인 강제(수렴리뷰):** `role_id`는 ActionRecord의 비정규화 사본이고 Participation이 진짜 출처다 → 둘이 어긋나면 §8 V4(방향 위조)가 ledger 층에서 다시 열린다. 따라서 **얇은 typed 진입함수가 actor의 Participation(해당 event_id·role)을 참조로 받아 `role_id`와 일치하는지 assert**해야 한다(인덱서 일치 기대만으론 부족).

### 3-D. 권한
- **`WeddingCap`** (key-only soulbound, D15) — host당 1개. `add_host`가 새 Cap 발행·transfer(=`host_addresses` 대체).

### 3-E. 돈
- **`CashGiftVault`** (shared, Balance<SUI>) — 유지, WeddingCap withdraw 게이트. **혼잡 주의(R1):** 인기 결혼식 300하객 동시 입금은 단일 shared vault `&mut`로 직렬화 → 데모 throughput 한계(허용 가능) 또는 슬롯별 sub-vault.
- **`YONE` coin** — **[결정#6 확정 06-21] 모든 결제·비용 = SUI 직접 결제. YONE(Coin<YONE>) 전환은 후순위.** 정식 도입 시 OTW+TreasuryCap, **TreasuryCap 커스터디 명시 필수**(소지자가 무한 발행 = 경제 전체 단일 침해점), 규제코인(DenyCap) 여부·decimals 선택 명문화.

### 3-F. 엣지(Ium=CS) — 소유권 기준 라이프사이클 재설계 (R1 C2)
v1의 `bind(initiator_moi, receiver_moi)`는 **불가**(receiver가 initiator의 owned Moi를 `&mut` 못 함). 재설계:
- **request:** initiator가 `IumRequest`(key-only) 생성 → **receiver에게 `transfer`**. 동시에 (A→B) 유니크를 **initiator 본인 Moi**의 df-key로 강제(서명자라 `&mut` 합법).
- **accept:** receiver가 본인 소유의 `IumRequest` + 본인 `&mut Moi`를 소비 → soulbound `Ium` 엣지 민팅 + receiver Moi df-key 기록 + `ledger::log(ACCEPT_IUM, actor=receiver, target=initiator)`.
- **per-match `Event` 객체 안 만듦(R1 I2)** — Ium 엣지(+ACCEPT_IUM 레코드)가 곧 매칭. cross-owner `&mut` 한 번도 없음.

### 3-G. 자산·화폐·샵·선물 레이어 (머지된 프론트 기준 반영 2026-06-20)

프론트(`moiPlaza.machine`·`ShopSheet`·`gift.machine`/`giftActor`·`GiftPicker`·moi-gather `data.ts`/`manifest`)가 이미 구현한 도메인. 온체인 대응:

- **`MoiItem`** (key+store 유지 — 유일하게 transfer 가능한 자산) = 샵 아이템. `{ id, name, category(hair/clothes/interior/accessory), slot?(head/body/acc) }`. 헤어·옷·액세서리=장착, 인테리어=광장(GatherPlace) 배치.
- **결제 수단** = 구매·선물 결제. **[결정#6 확정 06-21] 모든 결제 = `Coin<SUI>` 직접**(YONE(Coin<YONE>) 전환은 후순위). 구매는 무료 발행이 아니라 **SUI 결제로 mint를 게이트**(`moi::purchase_item(payment: Coin<SUI>, …)`, mint는 public(package) 봉인) — **신뢰 신호 아님(MP/화폐)**. 구매 1회 차감, 장착·배치 토글 무료.

**세 행위의 신뢰 신호 구분 (★ 설계 핵심):**
| 행위 | 방향 | 온체인 | 신뢰 신호 |
|---|---|---|---|
| **구매**(샵: 나→시스템) | 자기 | **SUI 결제(Coin<SUI>) → MoiItem mint**(구매자 소유, 무료 발행 폐기·결정#6) | **없음** — 시장 거래(MP·즉시청산), 사람↔사람 엣지 아님 |
| **선물**(나→상대) | giver→recipient | MoiItem `public_transfer`(자산 이동) **+** `ledger::log(GIFT)` SBT | **있음 — 증여(EM·CS)**. 단 **EM은 부조 전파에서 제외**(MOICREDIT_AUDIT: sole-giver 악용 방지) → CS 위주 |
| **장착/배치**(내 Moi·광장 꾸미기) | 자기 | Moi.equipped(dof+VecMap) / InteriorItem 배치 좌표 | **없음** — 꾸미기 상태일 뿐, 관계 행위 아님 |

→ **선물만 액션 원장(ActionRecord, action_type=GIFT, giver→recipient)에 들어가 증여 신호**가 되고, 구매·장착·배치는 자산/화폐/꾸미기 상태 변경일 뿐 신뢰 그래프에 안 들어간다. 선물은 **자산 이동(MoiItem transfer) + 신호 기록(soulbound ActionRecord)이 한 PTB에서 동시** 발생(자산은 옮겨가도 "증여했다" 기록은 giver에 soulbound로 남음).
- **선물 받은 아이템**: 수령자 소유 MoiItem → 광장 꾸미기(GRANT_OWNED 대응)로 장착·배치 가능. 프로필엔 "받은 증여 신호 수"가 Moi Credit 재료로(profile trace L1_raw의 `선물` 축).

---

## 4. Φ를 계산하기 위한 온체인 raw 최소 집합 (R2 — 충실도)

오프체인 fold/Φ가 무손실로 재구성되려면 **반드시 온체인에 있어야 하는 raw**:
| raw | 왜 | 비고 |
|---|---|---|
| actor, target | 엣지 양끝 | target은 nullable(관람·입장) |
| **role_id** | **fold 방향**(guest→host). 없으면 무방향→`w(g,h)=give/recv` 정의 불가 | v1 누락분, 최우선 |
| event_id → **event_type** | project=f(action_type×event_type×role). 같은 "돈건넴"을 부조(EM) vs 거래(MP)로 가름 | 매칭 event도 resolve 가능해야 |
| action_type | raw 동사 | u8 |
| amount | EM net 잔액 | 공개범위 §7(버킷/커밋) |
| **settles: Option<ID>** | 대여 상환/default 링크 → 이행 node 점수(신용 0.2) | v1 누락분 |
| ts | 시간 발전 | |
- **저장하면 안 되는 것(해석):** resource, 극성(±), 청산구조, default판정, EM/CS 배정, 전파 비중, Φ 출력. 전부 오프체인.
- **②→③ 승급**(온라인 이음→오프라인 검증): 두 매칭 당사자의 **공유 과거 wedding event_id 교집합**으로 인덱서가 탐지(role/event_type가 박혀 있으면 가능). **E4 매체가중(대면>동기온라인>비동기)은 event_type 분류 속성**이라 raw 아님 — 오프체인 도출(정상).

---

## 5. 범주론으로 신뢰 네트워크 반영 (사용자 질문 — 정직한 답)

**반영 가능하다. 단 범주 구조는 *오프체인 함자 Φ*에 있고, 컨트랙트에는 거의 요구사항을 주지 않는다.** 리뷰 합의: enrichment/Grothendieck/CAT-1/Yoneda는 컨트랙트엔 ~80% 장식(off-chain math), 컨트랙트를 실제 구속하는 건 **raw/해석 분리 + role로부터의 방향** 둘뿐(둘 다 평범한 데이터 모델 v0.1로 환원됨).

- **객체=Moi(사람 카테고리 𝒰), Hom(A,B)=Fiske 운영논리가 고른 enrichment 베이스**(H3): EM=아벨군(Pacioli=Grothendieck, 미청산 잔액→Φ 정의역) / CS=부호 있는 방향별 강도(청산 X) / MP=ℝ(즉시청산 0) / AR=poset.
- **Φ=정규화 전이가중치 `w(g,h)=give/recv`의 열확률 행렬 M의 감쇠 경로합=PageRank 부동점**(CAT-1: 항등 I·결합법칙=행렬곱·전파=경로합성 수치검증). **전부 오프체인.** 항등/self-trust/dangling 노드는 온체인 표현 불필요(M⁰=I·teleport 처리).
- **Yoneda 주의(R2 정정):** "store who you're related to, not who you are"는 PageRank 중심성이 Hom-패턴 함수라는 점에서 맞지만, **Yoneda는 패턴이 객체를 동형까지 *결정*한다는 재식별 정리** → "Yoneda라서 같지만 프라이버시 보존"은 자가당착(충분히 풍부한 그래프는 재식별 벡터). 실제 프라이버시는 **라벨(이름) 오프체인 = 평범한 가명성 + ZK 버킷**이지 Yoneda가 아니다. → Yoneda는 *직관 설명*으로만, 프라이버시 근거로 쓰지 않음.
- **온체인 ZK 신용 검증자(≤8 public inputs)**: §10 Phase D 포부 — **미검증(회로 미설계)**. `sui::groth16`(BN254) 후보. 초기 단계 결정을 여기에 묶지 말 것.

---

## 6. zkLogin 인증/인가
- **인증:** zkLogin(OAuth→Sui 주소)이 Supabase 로그인 대체. DB엔 user 행(최소 주소). dibang-wedding 소속.
- **인가:** 온체인은 소유권(Moi/owned)+capability(WeddingCap). zkLogin 주소=actor.
- **보안 주의(R3 V6):** Salt 서버 = 단일 침해점(유출/비결정적 마이그레이션 시 전 사용자 주소 변경=SBT/신용 소실). 커스터디·HSM·백업·로테이션 정책 + OAuth 단일공급자 가용성 SPOF 문서화 필요.

---

## 7. 프라이버시 — 1순위 = 신원 비식별 (오너 결정 2026-06-20)

**우선순위 결정(오너):** 금액·그래프 노출보다 **사람의 신원이 주소와 안 엮이는 것**이 훨씬 중요. 지갑 거래내역은 어차피 공개라, 신원이 안 풀리면 금액 공개는 수용 가능. → **부조 amount = 평문 노출 OK**(버킷/커밋 불필요). [결정#1]

**단 "신원 비식별"은 자동 보장이 아니다 — 무엇이 결정하나:**
1. **온체인 PII 0 (필수).** 이름·관계라벨 등 평문 절대 금지(현재 cash_gift/ium 위반 §1-4 **즉시 제거**). 이게 깨지면 가명성 자체가 무너짐.
2. **address↔사람 매핑은 오직 오프체인 서비스 DB에만.** 신원 노출의 단일 지점 = 그 DB. 신원 보호 = (온체인 PII 0) + (DB 보호). 온체인 주소는 그 자체론 난수 가명.
3. **그래프 재식별 = 잔여 위험(나중 일).** 주소 하나라도 사람과 연결되면(공개 자백·혼주는 자기 결혼식이라 자명 등) 주변 그래프가 드러남. amount처럼 "나중" 처리하되 존재는 인지.

| 데이터 | 결정 | 근거 |
|---|---|---|
| 이름·성별·사람정보·**채팅·사진** | **오프체인(필수)** [결정#2] | 가명성 토대 + 콘텐츠는 신호 아님. 현재 PII 위반 즉시 제거 |
| actor/target 주소 | raw 가명 | 신원 미연결이면 OK |
| 부조 **amount** | **평문 OK** [결정#1] | 돈도 어차피 Coin으로 보임. 신원이 핵심 |
| inyeon **target** | **평문 가명주소** [결정#2] | 인연은 공개 주체 없어 웨딩보다 덜 노출. 콘텐츠만 오프체인 |
| 좋아요/열람 | 이벤트 집계(§8) | 저신호·스케일 |

→ **핵심 invariant: 온체인엔 PII 0 + 가명 주소. 신원은 오프체인 DB에서만 연결.** amount/그래프 공개는 이 invariant가 지켜지는 한 수용.

---

## 8. 보안·시빌 내성·스케일 (NEW — R3)

- **가스 스테이션 잠금(V1, CRITICAL — 현재 코드 무인증·무제한, sponsor-server.ts:36 자인):** zkLogin 세션 토큰 검증 + 주소별·전역 rate limit + 일일 SUI 상한·서킷브레이커 + 함수 단위 allowlist. (무인증 대납 = 가스 고갈 DoS.)
- **합의 강제(V2):** ium request→accept로 비합의 inbound 엣지 차단.
- **시빌 트러스트 파밍(V3):** alts+가짜 결혼식+순환 부조 → PageRank 부풀려 대출 → **온체인은 막을 수 없음**. 방어는 (a) Event 생성에 실제 SUI 비용·Cap 게이트, (b) Φ가 **외부에서 유입된 실제 SUI 대비 내부 순환 자금 비율로 할인**, (c) 상호참조 클러스터 신용 기여 상한, (d) 가스 rate-limit(=시빌 비용). **"raw는 sybil-permissive, Φ가 필터, DeFi는 raw 카운트 불신"을 명문화.**
- **자기거래 방향 위조(V4):** 역할은 actor가 아닌 **독립 Cap 보유자**가 부여해야(자기 alts에 혼주/하객 배정 금지). actor==target·자기통제 target은 Φ에서 필터.
- **익명 claim 사칭(V5 — v1 권고가 위험했음):** "익명기록→claim 시 본인 SBT 민팅"은 **원 서명자가 없어 아무나 남의 부조를 자기 것으로 claim 가능**. 해소: (a) 익명기록 시 claim 비밀(부조 QR 일회코드/전화 해시) 캡처 후 지식증명, 또는 (b) **호스트(Cap) 공동서명 승인**(호스트가 실제 참석자를 앎), 또는 (c) 미보증 익명기록은 **호스트 소유 출석 사실**로 두고 호스트 첨부 전엔 게스트 신용에 전파 안 함. → §11 결정.
- **스케일 티어링(채택, 더는 열린 결정 아님):** 고신호·저빈도(부조·이음·방명록·rsvp)=SBT 객체 / 고빈도·저신호(좋아요·열람·스와이프)=**이벤트(+주기적 카운터 체크포인트)**. 300하객×(부조+방명록+하트) per-object SBT면 결혼식당 ~1000–1500 객체=비현실. per-Moi 카운터를 핫패스에서 `&mut`하면 본인 Moi가 핫오브젝트 → 고빈도는 이벤트로.

### 8-A. 시빌 방어 구현 현황 (2026-06-21 — credit.ts / opus 2차 통합 리뷰 반영)
- ✅ **V4 자기엣지:** fold가 actor==target 엣지 제거(give·cs·참석 전부) — 자기거래 농사 차단(I3).
- ✅ **V2 합의:** 매칭=request→accept 양자 합의 + 양방향 CS는 Participated에서 도출 — 비합의 inbound 엣지 없음.
- ✅ **V3 wash(2자):** 부조 **net 전파**(`netGiveGraph`, 상호 엣지 min 상쇄 = §8 b) → A↔B 순환 부조 신용 0 + 07 EM 아벨군(net=미청산 잔액) 정합. (외부 SUI 유입 없는 자기들끼리 돌리기 차단.)
- ⏳ **후순위(§8 c — DeFi 담보 전 실데이터 튜닝 필수):** ①3자+ 순환 wash(A→B→C→A; pairwise net 미적용) ②참석-스팸(무게이트 participate→혼주 CS, authority가 out=1 가짜 풀파워 통과; invite-스팸은 out정규화로 이미 감쇠) ③gift-CS 농사(무료 mint, L8) → **correlation discounting/클러스터 상한 + 샵 비용 게이트** 필요. 정직한 삼각 호혜(친구 셋 상호 부조) 오탐 위험이라 데이터 없이 막지 않음.
- ⚑ **운영(V1 가스 스테이션):** sponsor 무인증 = 운영 영역(설계 드라이버 아님).
- **원칙 재확인:** raw는 sybil-permissive, Φ가 1차 필터(자기엣지·2자 wash 완료), **DeFi는 raw 카운트 불신** — 신용→대출 담보 전 §8(c) 정식 discounting 필수.

---

## 9. 모듈 구조(제안)
```
moi.move       노드(soulbound), 원장 앵커, owner 유지
ledger.move    NEW: ActionRecord(보편 soulbound)+ActionLogged+action_type/role u8. log=public(package)
event.move     NEW: Event(event_type, 조회가능)+Participation/role(soulbound)  ← 방향의 원천
wedding.move   Wedding(shared, dynamic field 슬림)+WeddingCap(soulbound per-host)+HostInvite
cash_gift.move CashGiftVault(shared)+give=SUI이동+ActionRecord. CashGiftRecord 폐기→ActionRecord. 평문 이름 제거
ium.move       Ium 엣지(soulbound), request→accept(소유권 정합), 전역레지스트리 제거
inyeon.move    NEW: 매칭(request/accept)·view_photo/open_chat(SUI결제+ActionRecord)·gift(MoiItem+ActionRecord)
guestbook.move GuestbookEntry/Message → soulbound ActionRecord. 평문 이름 제거
feed.move      NEW(후순위): 하트/댓글/열람 = 이벤트(+집계). per-object SBT 아님
yone.move      보류(데모는 SUI 직접). 정식화 시 OTW+TreasuryCap 커스터디 명시
utils.move     유지
```

## 10. 빌드 순서 — 척추 먼저, 범위는 전체 (오너 결정 2026-06-20)

**범위 = 전체(wedding + inyeon, 모든 신호). 슬라이스로 줄이지 않는다.** 단 빌드 순서는 **깊이 우선**: 보편 액션 원장(ledger)이라는 척추를 **웨딩 부조(첫 신호)로 끝까지(신용→DeFi) 닫은 뒤**, 다른 신호를 연달아 붓는다. (운영 영역 — sponsor 가스대납·zkLogin·가스최적화·mainnet 배포 — 은 설계 드라이버 아님, 운영에서 처리.)

- **Step 1 (척추 + 첫 신호=부조):** ledger.move + event.move(role) + cash_gift(give=실제 SUI 이동 + SBT ActionRecord) → 인덱서가 온체인 raw 읽어 **한 지갑 신용 점수**(오프체인, 간단 가중 호혜로 시작 → 정식 PageRank로 발전). DeFi 끝단은 그 점수를 **일단 가정**해 표시/데모; 신뢰있는 온체인 재진입(오라클/ZK)은 나중(결정#12). **= 신뢰(온체인 raw)→신용(오프체인) 파이프라인 검증.**
- **Step 2 (정합성 정리):** Ium/Guestbook key-only / IumRegistry 제거 / WeddingCap per-host / u8 enum / 평문 민감정보 제거.
- **Step 3 (신호 확장 — 넓이):** 이음(inyeon.move: request/accept)·**선물(gift: MoiItem transfer + GIFT 증여 신호, §3-G)**·방명록·참석·하트 등 신호를 action_type+entry+project 규칙으로 연달아 투입. 자산·화폐 레이어(MoiItem 샵 구매·장착/배치·YONE)는 함께 들어오되 **구매·장착·배치는 신호 아님**(§3-G 구분표). feed(고빈도)는 이벤트 집계로.
- **Step 4 (정식화):** 정식 Φ, (선택) 프라이버시 강화. USDSui 등은 서비스 로직 완성 후.

**빌드 후순위(범위에서 제외 아님):** feed/하트(고빈도)·YONE 커스텀코인·정식 PageRank는 척추가 선 뒤로 미룸 — 전부 결국 포함.

## 10-A. 구현 상태 (2026-06-21 갱신 — 척추 + 전 신호 + 신뢰→신용 파이프라인 완성·검증)
> 진척 상세 로그는 `MASTER_DIRECTIVE.md` 하단. 여기는 as-built 스냅샷.

**컨트랙트(`contracts/dibang_wedding/sources`, `sui move test` 49/49, opus 적대 검증):**
- `event.move`(`gathering` alias) + `ledger.move`(ActionRecord soulbound key-only, action_type 0~6, `log`=public(package), event_id·role_id를 actor 소유 Participation에서 **파생**=방향 위조 차단[C1], settles 링크). `participate`=GUEST만 self-claimable·권위역할(혼주·주례·INITIATOR·RECEIVER)은 creator/package 게이트[C3].
- **웨딩 신호셋:** 초대 `wedding::invite`(INVITE, 혼주 HOST→하객, CS★) · 부조 `cash_gift::give`(GIVE_MONEY, **실제 SUI** vault 입금) · 방명록 `guestbook::write`(WRITE_MESSAGE) · 참석 `event::participate`(Participation/Participated emit).
- **인연 신호셋:** 매칭 `ium::request_ium`→`accept_ium`(전역 IumRegistry 제거, 매칭=Event(INYEON)+양측 Participation, RECEIVER는 IumRequest 게이트 package mint=방향위조 차단[C-IUM1]) · 선물 `gift::gift`(MoiItem public_transfer + GIFT, 한 PTB).
- **온체인 PII 0(결정#2):** 이름·연락처·관계라벨·메시지 본문·RSVP 이름 전부 제거(cash_gift/guestbook/ium/rsvp). key-only SBT 일관(활동기록 transfer 불가), 거래의도 자산만 key+store(MoiItem). ⚑[잔여 플래그] Wedding 구조체가 신랑/신부/부모 이름·예식장 평문 보유 = **사용자 결정 대기**(온체인 유지 vs 오프체인 이전).

**신뢰→신용(`apps/dibang-wedding/src/lib/credit.ts`, vitest 9/9, 결정#12):**
- **[2026-06-21: 분류 온체인 이관 — §10-B]** "어떤 신호인가"(분류)는 이제 온체인(signal.move). credit.ts는 온체인 분류된 `SignalEvent[]`만 입력받아 fold(kind별)→Φ(부조=reversed-giving PageRank[09 PHI-5] / CS=authority PageRank, net wash 상쇄)→가중합 0.5/0.3/0.2(이행 무기록 0.7) = **집계 전담**. 자기엣지·비-기여자=0.
- **SDK(`packages/sui-sdk/src/queries.ts`):** `getSignalEvents`(signal::SignalEmitted)가 credit 입력 경로. 죽은 PII 리더 제거[C-Q1], SDK typecheck 0.

**검증 누적:** opus 적대 리뷰 — 실결함 6(C1·C3·C-IUM1·rsvp PII·C-Q1 등) + 모델보강 4(I1 참석·I3 자기엣지·CS authority·I-CS1 매칭양방향) 발견·반영.

**남음(후순위/결정대기):** ①Wedding 이름 온체인 보유(사용자 결정) ②온체인 DeFi 재진입(오라클/ZK, 결정#12) = 토이 대출 끝단 ③SDK write 빌더 정렬 + guest-web 온체인 경계 위반(§2) ④test-testnet.ts 신규 API 재작성 ⑤가중치 실데이터 튜닝 ⑥**이행축(perf)**: 대여 상환=이행 raw인데 대여가 #12(온체인 DeFi 재진입) 영역이라, 그전까지 perf 0.7 고정(변별력 0)·settles는 log에 예비 인자로만(전부 none). **답례는 부조 양방향(give A→B, give B→A)으로 이미 도출되어 settles 불요** — settles는 대여 상환 1:1 링크(default 판정) 전용. DeFi 도입 시 lend/repay 진입함수가 settles를 some으로 활성.

## 10-B. 온체인 신호 분류 (2026-06-21 — 분류=온체인 SSOT 이관, 적대 리뷰 반영)
> 사용자 결정: "이 액션이 부조/유대다"라는 *분류*는 온체인 SSOT여야 한다(DeFi가 신용을 trustless하게 쓰려면 신호 소스가 온체인). 단 가중치·전파(PageRank)·wash net 상쇄 등 튜닝성/그래프-단위 계산은 오프체인(credit.ts) 잔류 = **분류=온체인 / 집계=오프체인**.

**`signal.move`(신규):** `Signal{kind, source, from, to, magnitude}`(copy/drop/store) + 순수 분류기 — 한 액션 → **0~N 신호(fan-out)**.
- `project_action(action×event×role×actor×target×amount)→vector<Signal>`: GIVE_MONEY@WEDDING@GUEST→[BUSU] / WRITE_MESSAGE·INVITE·GIFT→[CS] / 자기엣지·target無·그외→[].
- `match_signals(init,recv)`→양방향 CS 2개(source=ACCEPT_IUM) · `attendance_signals(part,creator)`→단방향 CS 1개(source=ATTEND).
- 신호는 **source(원천 action) 보존** → 오프체인 행위별 CS 차등 가중 가능(분류가 가중 재료를 안 버림 = "가중=오프체인" 원칙 충족).

**발행 계약(신호 소스 2개 — credit 소비와 1:1, dead/누락 0):**

| 신호 | 발행 지점 | kind(source) | 저장 | emit |
|---|---|---|---|---|
| 부조 | `cash_gift::give`→`ledger::log` | BUSU(GIVE_MONEY) | ActionRecord.signals | SignalEmitted |
| 방명록·초대·선물 | guestbook/wedding/gift→`ledger::log` | CS(WRITE_MESSAGE/INVITE/GIFT) | ActionRecord.signals | SignalEmitted |
| 참석 | `event::participate`(웨딩만) | CS(ATTEND) | (emit-only) | SignalEmitted |
| 매칭 | `ium::accept_ium` | CS(ACCEPT_IUM)×2 | (emit-only) | SignalEmitted |

**온체인 읽기 모델(DeFi trustless):** 분류 SSOT = signal.move *순수 함수*. 온체인 소비자는 stored 소스 객체(ActionRecord·Event·Participation)로 분류 함수를 호출해 분류를 trustless 재현. ledger는 결과를 ActionRecord.signals에 캐시(편의·DeFi 직접읽기). 인덱서/credit.ts는 SignalEmitted로 읽음(오프체인 경로). `Participation.event_type` 추가로 `ledger::log`이 추가 조회 없이 event_type 파생.

**검증:** signal 단위(fan-out 0~N·방향·source·자기엣지·비-GUEST give) + e2e(give→stored BUSU, write→CS) + credit e2e(부조 서열·wash net·CS authority·매칭 양방향) + 미러상수 안티-드리프트 핀 + SDK↔credit 드리프트 가드. **sui move 50/50 · vitest 10/10 · 앱·SDK tsc 0.** opus 2차 적대 리뷰 7건: 미러상수·fan-out·자기엣지·순환의존 **무결**; source 보존·주석드리프트 **즉시 수정**; 드리프트 위험 2개 **테스트로 전환**.

**testnet 실호출 실증(2026-06-21):** 신규 배포 pkg `0x32654d9d…7d97cc`(digest `8sRmqdTP…`)에 HOST/GUEST 2지갑으로 create_wedding→create_vault→participate→give→write 실행 → 온체인 `SignalEmitted` **3건 실조회**: 참석 `CS(source=ATTEND, 하객→혼주)` · 부조 `BUSU(source=GIVE_MONEY, 1000)` · 방명록 `CS(source=WRITE_MESSAGE)` — 방향·source·magnitude·fan-out 전부 정확. `creditFromSignals` → 하객 busu=1·혼주 cs=1(신용 0.64/0.44). **분류=온체인 → 집계=오프체인 전 파이프라인 실증.** 스크립트: `packages/sui-sdk/scripts/test-signals-testnet.ts`.

**남은 후속(적대 리뷰 — 정직 기록):**
1. **참석·매칭 신호 stored 미보존(emit-only)** — 현재는 classify 함수 재현으로 trustless 충족. DeFi *직접* 읽기 완전 대칭 원하면 `Participation.signals` 또는 매칭 SBT 보존(후속).
2. **신용 파이프라인 앱 미배선** — `getSignalEvents→creditFromSignals`가 화면/훅에 아직 안 붙음(테스트만 소비). = §10-A 온체인-읽기 이관 과제와 동일.
3. **행위별 CS 차등 가중**(source 활용) = 모델 07/08 확정 후. 현재 CS 평탄(magnitude=1).
4. **vestigial** ACTION_ATTEND/REQUEST_IUM/ACCEPT_IUM 상수 정리 + `log`의 ATTEND 모호성 제거.
5. **amount=number** — 부조 MIST는 이 도메인서 2^53 아래라 정확. 초대형 부조 도입 시 bigint 재검토.

## 11. 사용자 결정 대기 (06 §F + 리뷰)
1. ~~부조 amount 공개형태~~ **[결정완료 06-20]** 평문 노출 OK. 프라이버시 1순위 = 신원 비식별(온체인 PII 0 + 가명주소). amount는 나중 일.
2. ~~inyeon target 공개형태~~ **[결정완료 06-20]** 평문 가명주소(웨딩과 동일). 채팅·사진·사람정보는 전부 오프체인. 온체인은 행위 사실(매칭·열람·대화열림)만.
3. **익명 claim 인증:** 호스트 공동서명(권장) / claim 비밀 / 미전파 출석사실. (v1 "단순 claim"은 사칭 취약 — 폐기)
4. ~~신용 계산 위치~~ **[결정완료 06-20]** 오프체인 인덱서가 온체인 raw를 읽어 계산(결과 일단 가정). 신뢰있는 온체인 재진입(오라클 서명/ZK)은 나중. 원본 raw는 전부 온체인이 SSOT.
5. **micro-interaction:** 이벤트+집계(권장) — 사실상 채택.
6. ~~YONE~~ **[결정완료 06-21]** 모든 결제·비용 = **SUI 직접**(Coin<SUI>). YONE(Coin<YONE>) 전환은 **후순위**. 샵/아이템은 **무료 발행 폐기 → Sui payment SDK 기반 SUI 결제 '구매'로 mint 게이트**(`moi::purchase_item(payment: Coin<SUI>)` + `mint_item` public(package) 봉인). SUI 결제 게이트가 서야 gift-CS 신뢰 가능(§8 c 농사 차단과 연결).
7. ~~해커톤 범위~~ **[결정완료 06-20]** 범위 = 전체(wedding+inyeon). 빌드 순서 = 웨딩 부조로 척추 먼저, 그 뒤 신호 확장(§10).
8. USDSui 시점(서비스 로직 완성 후).

---
*반영: opus 4.8 리뷰 3건(Sui/Move 정합·범주론 충실·보안/프라이버시/스케일). 근거: VISION-AND-INTENT, 08/06, DOMAIN_MODEL_SUMMARY, 05/07/09 + inyeon/wedding action-catalog, contracts/dibang_wedding 실코드(ium·moi·cash_gift·sponsor-server), sui-dev-skills(move/FAQ).*
