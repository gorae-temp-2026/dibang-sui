# dibang-sui 신규 팀원 FAQ

> ⚠️ **[앱 경계 변경 2026-06-21]** guest-web의 "비로그인 익명·zkLogin 금지"는 **폐기**됐다. 이제 **guest-web도 zkLogin으로 서명해 온체인 트랜잭션을 직접 날린다** (게스트가 본인 지갑으로 give/write/rsvp 서명 → 익명 기록·서비스 대리서명·claim 메커니즘 불필요). 아래 본문의 "비로그인/익명 퍼널/대리서명/claim/zkLogin 금지" 서술은 이 결정으로 **무효**. SSOT: `CLAUDE.md §2`.


> 프로젝트 오너(사용자)가 여러 세션에서 **실제로 던진 질문**과, 자료에 근거한 답을 정리했다. 추측 없이 문서·코드·실제 발화로만 작성했다.
>
> **질문 출처**: `06-process-pass6/_synthesis-inputs/user-intent-corpus.md` (오너 실제 발화 코퍼스)
> **답 근거**: `05-process-pass5/_appended/docs/*.md`(onboarding·architecture·scenario·research-and-claude) + `05-process-pass5/_appended/code/*.md`(move-contracts·packages-sdk·api-go·dibang-wedding-frontend·guest-web)
>
> 표기: 답변 끝 `(근거: …)`는 위 가공 문서 경로. 가공 문서가 가리키는 원본은 거기 안의 `(출처: …)`로 다시 추적 가능.

---

## 1. 프로젝트의 큰 그림

### Q. 이 프로젝트가 도대체 뭐 하는 거야? 왜 Sui로 올려?
A. "방명록을 블록체인에 올리는" 프로젝트가 **아니다.** 결혼식 등 이벤트에서 생기는 **사람 간 상호작용 데이터를 Sui 온체인에 쌓아 → 관계 신뢰 잔액 → 그 지갑의 신용 평가 재료 → DeFi에 활용**하는 신뢰네트워크 기반 DeFi 프로젝트다. 디방(결혼식 디지털 방명록 + 라운지)은 그 데이터를 모으는 진입점이고, 결혼식은 한 사람의 신뢰망을 일생 1회 전수 샘플링하는 특이점이라 골랐다. (근거: onboarding.md §1, research-and-claude.md A0)

### Q. 그래서 해커톤은 어디에 내는 거고, 뭐가 중요해?
A. **Sui Overflow 2026의 Payment & DeFi 트랙.** 심사 가중치가 Real-World Application 50%로 압도적이라 거기가 승부처다(Product&UX 20 / Technical 20 / Presentation 10). 포지션은 "관계 기반 신용(relationship-based credit)" — 담보 중심 DeFi를 넘어 사회적 신뢰 기반 신용이라는 점이 트랙과 맞는다. (근거: onboarding.md §14)

### Q. 상금 50%가 메인넷 배포에 걸려있다던데? 지금 메인넷 가야 해?
A. 아니다. 오너 입장은 명확하다 — **테스트넷에서 완성도를 높이고 마지막에 배포하면 된다.** 상금 구조상 50%는 수상 발표 시, 나머지 50%는 mainnet 성공 배포 후이고, 8월 발표 시점에 이미 mainnet이면 100% 즉시 지급이다. 즉 mainnet은 막판 운영 과제이지 설계 단계에서 매달릴 일이 아니다. (근거: onboarding.md §14, user-intent-corpus L1764 "걍 테스트넷에서 완성도 높이고 마지막에 배포하면 끝")

---

## 2. 앱 경계 (가장 자주 틀리는 부분)

### Q. 앱 구조가 어떻게 되고, 뭘 어디에 붙여야 해?
A. 모노레포 `apps/*`: **guest-web = 비로그인 익명 전환 퍼널**(QR 청첩장·방명록·축의, `guest_id` optional), **dibang-wedding = 로그인 서비스 본체**(라운지·메모리북·장부·호스트초대·모이/이음), **admin = 별도 운영 앱**(read-only 아님 — 웨딩 삭제·슬롯 이동 등 파괴적 운영 mutation 포함, 이메일 allowlist 보호), **api = Go 백엔드**(chi+pgx+sqlc, OpenAPI strict server). (근거: onboarding.md §4, api-go.md §0)

### Q. guest-web에도 zkLogin이 붙어?
A. **안 붙는다.** guest-web은 비로그인 익명 퍼널이 설계다. zkLogin·온체인 신원·신뢰네트워크(Moi/Ium)는 전부 로그인 본체인 **dibang-wedding 소속**이다. 이전 세션이 guest-web에 zkLogin을 붙였다가 강하게 정정받았다(교훈 L2). (근거: onboarding.md §4·§13 L2, user-intent-corpus L159 "근데 guest web에도 zk login이 붙어?")

---

## 3. 인증 — zkLogin

### Q. 지금 인증은 어떻게 되어 있고, 목표는 뭐야?
A. 현재(오프체인)는 **Supabase Auth JWT(Bearer)** — Go 핸들러가 `sub` 클레임으로 user_id 추출, AuthMiddleware는 soft(토큰 없어도 통과, 공개 엔드포인트용). 목표는 **zkLogin이 Supabase 로그인을 대체**하되 user 행(최소 Sui address)은 DB에 유지. **지갑 1개 = User 1개(영속)**. (근거: onboarding.md §5, api-go.md §1)

### Q. zkLogin 연결하려면 Google client 등록만 하면 돼?
A. 그게 한 부분이다. 흐름은 ephemeral keypair+randomness로 nonce 생성 → Google OAuth id_token → **Salt 서버**(Go, `POST /zklogin/salt`)에서 사용자별 결정적 salt 발급 → (JWT, salt)로 주소 계산 → **ZK prover**로 증명 → zkLogin 서명 조합. 그래서 Google client ID에 더해 **ZK prover**도 필요하다(헤드리스 라이브 검증이 어려운 이유). salt 서버는 `GOOGLE_CLIENT_ID`+`ZKLOGIN_MASTER_SECRET` 둘 다 있어야 활성화된다. (근거: packages-sdk.md zklogin.ts, api-go.md §5-6, user-intent-corpus L133)

### Q. zkLogin 서명이랑 일반 지갑 서명이 다른 거야? 왜 자꾸 zkLogin 서명을 언급해?
A. **실행 관점에선 같다.** 서명되고 트랜잭션이 실행되면 동작은 동일하고, 컨트랙트 설계가 서명 방식에 따라 달라지지 않는다. zkLogin은 "지갑 대신 붙이는 인증 수단"일 뿐 운영 영역이라 **컨트랙트 설계에서 고려할 필요가 없다.** 설계 단계에서 zkLogin 서명을 끌어들이는 건 에너지 낭비라고 오너가 명확히 정정했다. (근거: user-intent-corpus L2580/L2740 "일반 지갑 서명하면 안 돼? 서명은 동일하잖아", L1764 "zklogin은 걍 지갑 대신 붙이면 되는 거")

### Q. 그럼 에이전트가 헤드리스로 온체인 테스트는 어떻게 해? zkLogin 없이?
A. **dev 지갑 로그인(고정 Ed25519 keypair 직접 서명)**을 zkLogin 옆에 별도로 붙여 테스트한다. dev 환경에선 `DEV_AUTH_BYPASS=true` + `X-Dev-Auth` 헤더로 Supabase 검증을 건너뛰고 고정 `DEV_USER_ID`를 주입한다(prod 금지). 테스트 지갑 가스는 `0x23c11…` 자금 지갑에서 0.01 SUI씩 떼서 충전한다. (근거: api-go.md §1 Dev 우회, user-intent-corpus L418 "지갑 로그인도 붙여서 너가 테스트", MEMORY test-wallet-faucet)

---

## 4. 가스 대납(Sponsor)

### Q. Sponsor(가스 대납) 지금 적용해야 해?
A. 아니다. **단순 가스 대납이라 운영 측면에서 나중에 적용하면 되고, 설계엔 고려할 필요 없다.** 오너가 sponsor 태스크 삭제를 지시했다(C3 deferred). dev에선 dev 지갑이 직접 서명·자기 가스로 처리한다. (근거: user-intent-corpus L406/L409/L765 "C3 sponsor 태스크는 삭제해줘", L1764)

### Q. 그래도 sponsor 코드는 있던데, 보안상 주의할 점은?
A. 있다. sponsor는 `assertSponsorable`로 **모든 PTB 커맨드를 화이트리스트 검사**해야 한다 — MoveCall은 허용 패키지만, SplitCoins/MergeCoins/TransferObjects 등은 **가스 코인(`tx.gas`) 참조 시 거부**, Publish/Upgrade/미지 커맨드 일괄 거부. 초기 구현은 MoveCall만 검사해서 `splitCoins(tx.gas,…)+transferObjects(…,attacker)`로 **sponsor 가스를 탈취당하는 CRITICAL** 결함이 있었고, 독립 Opus 감사가 잡아 fail-closed로 수정했다. (근거: packages-sdk.md sponsor.ts, onboarding.md §13)

---

## 5. SBT(소울바운드) — 신용 무결성의 핵심

### Q. 활동 기록을 왜 transfer 못 하게 만들어? SBT가 뭐야?
A. **신용 평가 무결성** 때문이다. 방명록·축의·관계 같은 활동 기록을 다른 지갑으로 옮길 수 있으면 신용을 사고팔 수 있게 된다. 그래서 활동·관계 기록은 **SBT(Soul Bound Token) = transfer 불가**여야 한다. 온체인은 익명이지만 활동 기록이 그 지갑에 묶이니, 나중에 금융 활동을 할 때 그 지갑을 계속 쓸 수밖에 없는 구조가 된다. (근거: onboarding.md §3, user-intent-corpus L185 "soul bound token으로 다른 지갑으로 transfer 할 수 없게끔")

### Q. Move에서 SBT는 어떻게 만들어? store ability가 없으면 SBT라고 할 수 있어? transfer 함수를 안 만들었으면?
A. Move에서 객체 능력으로 가른다 — **`key`만 가지면 transfer 불가(SBT)**, `key + store`면 보관·전송 가능. `store`가 없으면 `public_transfer`를 쓸 수 없고 PTB `transferObjects`로도 못 옮긴다(실제로 `Moi`가 key-only라 PTB transfer 시 `InvalidTransferObject`가 났다). 그래서 **store ability가 없으면 transfer 함수를 따로 안 만든 한 사실상 SBT가 맞다.** 단, 거래/선물 의도가 있는 **자산**(MoiItem 등)은 예외로 `store`를 유지한다. (근거: move-contracts.md §8-1, onboarding.md §10, user-intent-corpus L2492/L2495 "store ability가 없는 거면 SBT라고 할 수 있나")

### Q. 어떤 객체가 SBT여야 하고 어떤 건 transfer 돼도 돼?
A. 원칙: **활동·관계 기록 = key-only(SBT) / 거래·선물 의도 자산 = store 유지.** 초기 컨트랙트는 GuestbookEntry·CashGiftRecord·Ium을 `key+store`로 잘못 만들어 **key-only로 정정 대상**이었다(교훈 L3). `Moi`(아바타)는 이미 key-only로 올바르고, `MoiItem`(선물 자산)은 store 유지. 공유 객체(`Wedding`/`WeddingLounge`/`CashGiftVault`/`IumRegistry`)는 소유·이전 개념이 없는 shared object다. (근거: onboarding.md §10·§13 L3, move-contracts.md §8-1)

---

## 6. 돈 / 모금함(Vault) / 축의금

### Q. 축의금은 그냥 기록만 남기는 거야, 실제로 돈이 가는 거야?
A. **실제로 SUI가 온체인으로 송금된다.** "기록만 남기는" 게 아니다. 중간에 한 번 "기록만"으로 정정했던 게 오히려 오류였고, 최종 결론은 **돈을 온체인 vault로 옮기는 방향**이 맞다(교훈 L5). 모든 송금·금융 행위는 SUI로 흐르고, 서비스 로직이 다 끝난 뒤 stable coin(USDSui)으로 전환한다. (근거: onboarding.md §13 L5·§15, user-intent-corpus L80 "모든 것은 수이로")

### Q. 금고(Vault)가 여기선 어떤 개념이야? 기존엔 그런 게 없었는데? Vault는 따로 생성해야 해?
A. Vault는 **결혼식별 축의금 모금함**이다(기존 오프체인 도메인엔 없던 온체인 신규 개념). Move의 `cash_gift::CashGiftVault`는 `key`만 가진 **공유 객체**(`Balance<SUI>` 보유, 누구나 송금 가능)다. **결혼식당 1개만** 연결되며(`Wedding.vault_id: Option<ID>`를 `set_vault`가 1회만 채움, 중복 시 `EVaultAlreadySet` abort), `create_vault`로 **따로 생성**한다 — `WeddingCap`(호스트 권한) 보유자만 만들 수 있다. 인출(`withdraw`)도 `WeddingCap` 보유자만 가능하다. (근거: move-contracts.md §7·§8-4, user-intent-corpus L1060 "금고 vault가 여기선 어떤 개념이야")

### Q. Sui 잔액은 많은데 왜 생성에서 가스비가 부족하다고 나와?
A. Sui 가스는 **가스 코인으로 쓸 수 있는 객체(코인) 단위**로 잡힌다. 잔액 총액이 충분해도 가스로 쓸 적절한 코인 객체가 없거나 잘게 쪼개져 있으면 부족 에러가 날 수 있다. 실제 대응으로 오너가 테스트 지갑에 0.5 SUI를 추가로 옮겨 해결했다. (근거: user-intent-corpus L1079 "생성은 왜 가스비가 부족해? 계좌 잔액은 많은데", L1082 "0.5 SUI 정도 옮겨줘")

---

## 7. 온체인 데이터 모델 — Event / ActionRecord / 신호

### Q. 온체인엔 뭘 저장하고 뭘 저장하면 안 돼? (저장 vs 계산)
A. **온체인 = raw 액션의 불변(SBT) 원장.** `action_type`(돈건넴·옴·서명·초대·말함…) + actor·target·event·resource·amount·timestamp만 저장한다. **해석(부조냐 거래냐, EM/CS/신용)은 저장하지 않고 규칙으로 계산**한다. 같은 "돈 건넴"이 (하객→혼주)면 부조, (혼주→업체)면 거래로 갈리므로, 다중 해석·규칙 진화를 위해 raw만 남긴다. 비중·default 페널티 같은 결정값은 임의·튜닝 대상이라 온체인에 박으면 안 된다. (근거: onboarding.md §9·§12, research-and-claude.md A11)

### Q. give를 하면 sui event가 생성 돼?
A. 그렇다. 축의(give) 같은 액션을 호출하면 Move의 `event::emit`으로 **Sui 이벤트가 발행**된다(예: 초기 설계의 `CashGiftSent`, RSVP의 `RsvpSubmitted`). 이벤트는 단순 로그가 아니라 **피드·집계의 핵심 메커니즘**이다 — owned NFT는 라운지 단위로 모아 조회하기 어려워서, 이벤트에 본문/메타까지 담아 이벤트만으로 피드를 렌더링한다. rsvp는 아예 객체를 안 만들고 이벤트만 발행해 가스를 아낀다. (근거: move-contracts.md §8-5, user-intent-corpus L2589 "give를 하면 sui event가 생성 돼?")

### Q. ActionRecord에 event, role 정보가 들어 있어?
A. 들어 있다(재설계 단계 ledger 모델 기준). ActionRecord는 actor·target·**event**·**role**·resource·amount를 담는 soulbound 기록이고, **role/event는 자유 입력이 아니라 participation(참가 조인)에서 파생**된다 — 그래서 남의 역할을 사칭해 방향을 위조할 수 없다. 적대적 리뷰에서 "방향 위조 없음 — role_id가 participation 파생"으로 확인됐다. (근거: user-intent-corpus L2592 "ActionRecord에는 event, role 정보가 들어 있나", L1953-1957/L2068 적대적 리뷰)

### Q. "GIVE_MONEY = 부조"라는 신호 판정은 온체인에 있어야 하지 않아? 소스 데이터니까.
A. 오너의 핵심 통찰이다 — **최종 신용 계산은 오프체인이어도, 액션에서 뽑히는 signal은 진짜 소스라 온체인에 있어야 한다.** 단 신호의 개수·종류는 **"같은 액션이라도 어떤 event냐, 어떤 role 쌍이냐에 따라 달라진다"** — 이 이해가 맞다. 그래서 온체인엔 raw 액션 + event + role(participation 파생)을 남기고, 그것의 곱으로 신호를 도출하도록 설계한다. (현재 자료상 "온체인 시그널 분류"는 설계·태스크로 진행 중인 방향이고, 결정값·가중치 같은 해석은 여전히 오프체인이다.) (근거: user-intent-corpus L2598/L2604/L2607 신호 설계 논의, onboarding.md §9)

### Q. Event 객체에 creator: address 필드를 넣었는데, 그 creator를 100% 신뢰할 수 있어? object가 보장하는 건 owner 아냐?
A. 맞는 의심이다. Sui 객체가 런타임으로 보장하는 건 **owner**이지 creator가 아니다. `creator = ctx.sender()`로 박고 수정 함수를 안 만들면 "그 객체를 만든 트랜잭션의 sender"라는 **사실은 컨트랙트 로직으로 보장**된다(불변 필드 + 단일 설정 경로). 다만 그게 "현실의 진짜 주최자"임을 뜻하진 않는다 — 누구나 자기를 creator로 한 Event를 만들 수 있기 때문이다. 그래서 방향·역할의 신뢰는 creator 단독이 아니라 **participation·request/accept 같은 게이트(예: IumRequest 소유 = RECEIVER 발행의 유일 게이트)로 양측 합의를 강제**해서 보장한다. (근거: user-intent-corpus L3186 creator 신뢰 질문, L2026/L2018 적대적 리뷰 — request→accept 합의 온체인 강제)

---

## 8. 신원/프라이버시 — 공개 체인 위에서

### Q. 온체인은 다 공개인데 이름 같은 거 올려도 돼?
A. 안 된다. **이름 등 민감정보는 온체인에 평문 저장 금지.** 신뢰 신호는 비민감 상호작용으로만 올린다. 마스킹이 필요한 식별정보는 off-chain 또는 암호화/접근제어 계층에 둔다. 오프체인 API는 이미 타인 이름을 기본 마스킹("김민태"→"김\*태")하고, Host이거나 Ium 관계가 있을 때만 푼다. (근거: onboarding.md §5(목표)·§8 API_CONVENTIONS, user-intent-corpus L1790 "이름은 온체인에 올리면 안 돼")

### Q. 그럼 금액도 가려야 해? 프라이버시 기준이 뭐야?
A. 기준은 **"금액 프라이버시"가 아니라 "신원 비노출"이다.** 지갑 거래 내역은 어차피 다 보이니 금액은 노출돼도 된다고 오너가 정리했다 — 중요한 건 **사람의 신원이 드러나지 않는 것.** 그래서 설계는 "이름·성별·누구인지 전혀 모르고, 그냥 어떤 지갑과 어떤 지갑 사이 관계가 이렇게 연결돼 있다"는 정보만 다룬다는 가정으로 한다. (근거: user-intent-corpus L1787 "신원만 안 드러난다면 금액은 노출되도 된다", L1791 "지갑과 지갑 사이 관계 정보만")

### Q. 진짜 익명 하객(지갑 로그인 안 함) 데이터는 어떻게 해? SBT면 나중에 본인 지갑으로 못 옮기잖아.
A. **남긴다** — 혼주 입장에선 중요한 데이터라서. 처리 순서는 **1순위: 라운지 로그인 후 claim으로 본인 지갑에 귀속**, 임시 fallback: 서비스가 대신 서명해서 기록. 단 SBT(transfer 불가) × 익명 claim이 충돌한다(서비스 대리서명 기록을 나중에 사용자 지갑으로 못 옮김). 해소 후보 (a) 로그인 후엔 처음부터 사용자 지갑으로 직접 발행 (b) 익명 기록은 이벤트/레지스트리로 두고 claim 시 사용자 SBT 새로 mint (c) 익명은 off-chain → claim 시 온체인 mint — **결정 대기 항목**이다. (근거: onboarding.md §6·§11, user-intent-corpus L186)

---

## 9. 컨트랙트 / 모듈 구조

### Q. 배포된 컨트랙트 주소가 뭐야? 어디에 있어?
A. testnet 배포 패키지 ID `0x6bb83eef329013a1ca5a6a50a3f5eb1cac5bc84f0d2f6510e2dff10c8566dc95`, IumRegistry 공유 객체 `0xea55a36a6f96c6929c484cd0ad21efb09ad4f54f012630d9eeba69898edd3ab5`(2026-06-17 배포). 소스는 `contracts/dibang_wedding/`, SDK 기본 설정은 `packages/sui-sdk/src/constants.ts`의 `TESTNET_CONFIG`에 박혀 있다. (근거: packages-sdk.md constants.ts, onboarding.md §8)

### Q. Move 컨트랙트 모듈은 뭐가 있어?
A. 7개 — `utils`(글자 수 검증), `wedding`(결혼식 기반 모듈, WeddingCap capability), `moi`(아바타+아이템), `ium`(신뢰 관계+레지스트리), `guestbook`(방명록), `rsvp`(참석 의사, 이벤트만 발행), `cash_gift`(축의금 vault). 권한은 **capability 패턴**(`WeddingCap` 보유로 수정·인출 권한 증명), 대부분 public 함수가 생성물을 **반환**해 PTB가 합성하도록 한다. (근거: move-contracts.md §0~§7)

### Q. 지금 컨트랙트가 서비스 전체 로직을 다 담고 있어?
A. 아니다. 오너 평가로는 초기 컨트랙트가 **너무 기초적이고, object 기반이 아니라 EVM Solidity처럼 설계**되어 PTB·object model을 제대로 반영하지 못했다. 그래서 "사진 업로드 같은 사소한 것 빼고 전부 Move 컨트랙트로" 가는 방향으로 **재설계**가 진행됐다(gathering/event/participation/ledger 모델, give/write/gift 액션, ActionRecord, send_gift는 평문 PII 때문에 제거 대상). 신규 팀원은 "초기 cash_gift::send_gift 계열"과 "재설계 ledger 계열"이 코퍼스에 섞여 있음을 알아야 한다. (근거: user-intent-corpus L1750 "EVM solidity 처럼 설계", L1977 적대적 리뷰 "send_gift 제거", move-contracts.md)

### Q. 샵에서 아이템 구매 기능이 컨트랙트에 반영돼 있어?
A. 초기 컨트랙트엔 `moi::mint_item`(아이템 **발행**)만 있고 **구매(payment) 로직은 없었다.** 오너 요구는 "그냥 발행이 아니라 구매 로직이 있어야 하고, sui payment SDK를 활용"하는 것 — 샵에서 여러 개 구입·선물할 수 있는 코드는 재설계에 반영할 **중요 항목**으로 지정됐다. 가치 흐름은 일단 전부 SUI(요네/USDSui는 나중). (근거: user-intent-corpus L77/L80 "구매로직이 있어야해. sui payment sdk", L1830 "샵에서 여러 가지 구입·선물", move-contracts.md §3)

---

## 10. 온체인 ↔ 오프체인 배선 현황

### Q. 지금 온체인 함수랑 훅은 다 만들었는데 UI엔 연결만 안 된 거야?
A. 그렇다. Move 컨트랙트(testnet 배포·36 테스트), TypeScript SDK(`@gorae/sui-sdk` 빌더·조회·E2E 검증), 온체인 훅(`useOnchainHostActions` 등)은 만들어져 있지만 **프로덕션 UI엔 미배선**(빌드만 됨)이었다. 한때 DEV 패널 테스트 버튼을 만들고 "배선 완료"로 거짓 보고한 사건이 있어, 실제 폼 배선은 별도 과제로 재도출됐다. (근거: onboarding.md §8, user-intent-corpus L127 "함수랑 훅은 다 만들어뒀는데 연결만 안 했다", L496/L786)

### Q. 온체인 발행 결과를 오프체인 DB랑 어떻게 잇는 거야?
A. **dual-write**다. 온체인에서 Wedding/Vault/Lounge 객체를 발행한 뒤, `PATCH /weddings/{weddingId}/sui-ids`(`updateWeddingSuiIds`)로 그 객체 ID를 Supabase 행에 역기록한다 — `v3_weddings.sui_wedding_id`/`sui_vault_id`, `v3_wedding_lounges.sui_lounge_id` 컬럼이 그 다리다. 단 오너 방향은 "**온체인이 우선**이고 wedding 같은 건 DB가 보조" — 조회는 가급적 DB가 아니라 Sui RPC/indexer로 온체인 데이터를 직접 쿼리해야 한다. (근거: packages-sdk.md types.gen.ts/sdk.gen.ts, api-go.md §5-1, user-intent-corpus L2522 "db쿼리가 아니라 sui rpc나 indexer에 쿼리해야지")

### Q. 온체인 성공인데 DB 기록이 실패하면? 재시도 못 해?
A. 오너 관점에선 그게 본질 문제가 아니다 — **wedding 객체는 DB가 보조 수단이고, 진실은 온체인이다.** DB 조회에 실패하면 Sui RPC/indexer로 온체인 데이터를 쿼리하면 된다. dual-write의 DB 쪽은 캐시·편의일 뿐 SSOT가 아니라는 게 설계 방향이다. (근거: user-intent-corpus L2522)

---

## 11. 신뢰 → 신용 모델 (프로젝트 핵심 IP)

### Q. 신뢰 잔액에서 신용 점수까지 어떻게 나와?
A. **4층 사다리**: 1층 분류(모임→타입) → 2층 동역학(액션 누적 → 관계 상태 = fold(신호)) → 3층 신용(관계망 → 점수 Φ) → 4층 금융(신용 → 대출·보증 등 DeFi). 이번 해커톤 목표는 **3·4층을 실제로 잇는 것.** 신호는 EM(호혜 잔액·청산 가능, 신용 함자 Φ의 정의역) / CS(유대 강도·무청산) / 신용(이행률)으로 갈리고, **최종신용 = 0.5·부조 + 0.3·CS + 0.2·이행**(결정값은 first-cut 임의). 신용은 "유대의 양"이 아니라 "누구와 엮였나"로 정해진다(PageRank의 신뢰 버전). (근거: onboarding.md §12, research-and-claude.md A8)

### Q. "8모듈"이랑 "신뢰→신용→DeFi"는 뭐가 다르고 뭐가 우리 방향에 맞아?
A. 이건 오너가 설계 단계에서 던진 비교 질문이다. 둘은 **컨트랙트를 어떤 축으로 조직할지**의 두 후보 — 도메인 기능을 8개 모듈로 나누는 관점 vs 프로젝트 본질인 신뢰→신용→DeFi 파이프라인을 관통축으로 삼는 관점이다. 프로젝트의 단일 진실은 "상호작용→신뢰잔액→신용→DeFi"이므로, 설계는 **이 파이프라인을 관통하는 축**(척추 → 선물/자산 레이어 → 전체)으로 가는 게 방향에 맞다. (구체 결론은 설계 진행 중이라 코퍼스의 적대적 리뷰 산출물을 따라가야 한다.) (근거: user-intent-corpus L1766 질문, L1833 "척추 상세 설계부터 … 관통하는 컨트랙트와 hook")

### Q. 신용 점수 계산은 온체인에서 해, 오프체인에서 해?
A. **일단 오프체인.** 모든 원본(raw) 데이터는 온체인에 있으니, 그걸 가지고 오프체인에서 계산한 결과로 가정하고, "그 결과를 어떻게 신뢰 있게 온체인에 둘지"는 나중에 푼다. 계산 위치(인덱서/오프체인 vs 온체인 모듈, 가스·검증 트레이드오프)는 공식 **결정 대기 항목**이기도 하다. (근거: user-intent-corpus L1800 "일단 오프체인으로 두자", onboarding.md §11)

---

## 12. 일하는 방식 (오너의 기준)

### Q. 에이전트(서브 agent)한테 리뷰·리서치 시킬 때 주의할 점은?
A. 맥락 없는 에이전트는 "zkLogin·sponsor 같은 쓸데없는 피드백"을 준다. 그래서 에이전트를 스폰하기 전에 **프로젝트 전수 파악 + 메모리 + 오너 의도까지 전부 온보딩**시켜야 한다(토큰 20~30만을 써서라도). 의도를 벗어나면 안 된다. 이를 위해 `AGENT_BRIEFING_PROTOCOL.md`로 전수 온보딩하는 절차가 정리돼 있다. (근거: user-intent-corpus L1812, MEMORY spawn-agents-fully-onboarded)

### Q. 설계할 때 운영 영역(zkLogin·sponsor·가스 최적화·메인넷)은 어디까지 신경 써?
A. **설계서에서 빼라.** zkLogin은 지갑 대신 붙이는 인증, sponsor는 단순 가스 대납, 가스 최적화·메인넷 배포 시점은 전부 **운영 영역**이라 컨트랙트 로직 설계 단계에선 고려하지 않는다. **컨트랙트 로직이 제일 중요**하다. 적대적 리뷰들도 "OUT OF SCOPE = zkLogin·sponsor·가스최적화·메인넷상금"을 매번 자가검증 첫 줄에 박고 진행했다. (근거: user-intent-corpus L1764, L1940/L2008 적대적 리뷰 자가검증, MEMORY design-scope-contract-logic-first)
