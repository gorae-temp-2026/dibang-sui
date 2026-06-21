# dibang-sui 의도 타임라인 (Intent Timeline) — Pass 6

> 프로젝트 의도가 시간/단계 순으로 어떻게 진화했는지 정리한다. 추측 없이 입력 근거만 사용한다.
>
> **입력 근거**
> - 세션 의도 백본: `_research_analysis/2026-06-21-conversation-intent-extraction/06-process-pass6/_synthesis-inputs/session-intent-notes.md`
>   - 세션코드 **C / D / E / F** = `digital-guestbook-v3` 레거시(Sui 전환 이전 오프체인 원천 시기)
>   - 세션코드 **A / B** = `dibang-sui` Sui 온체인 전환 현행
> - 보조: `_research_analysis/.../05-process-pass5/_appended/docs/{onboarding,scenario,architecture,research-and-claude}.md`
>
> **읽는 법**: 각 단계마다 ① 그때의 사용자 의도, ② 무엇을 만들었나(근거 세션코드), ③ **전환점**(왜 방향이 바뀌었나)을 표기한다. 단계는 시간순이되 일부는 병행되었다(특히 ①의 v3 구축과 후반부 신뢰잔액 리서치).

---

## 한눈에 보기 (4단계)

| 단계 | 시기/맥락 | 핵심 의도 | 주 세션코드 |
|------|-----------|-----------|-------------|
| **① v3 웨딩 서비스 구축기** | `digital-guestbook-v3` (오프체인, pre-Sui) | "디지털 방명록 + 웨딩 라운지" 실서비스를 만든다 | C(대부분), D, E, F |
| **② 신뢰잔액 리서치 → Sui 전환 결심 → 코드 이관** | v3 후반 ~ dibang-sui 초기 | 상호작용 데이터를 신용의 원료로 본다 → Sui 온체인으로 옮긴다 | C(7a154dcd, 3169106b, 7408019a 등 리서치) → A(28ba2a9b#0~1) |
| **③ 온체인 신뢰네트워크 / zkLogin / sponsor 구현기** | dibang-sui | Move 컨트랙트·SDK·zkLogin·sponsor를 testnet에 실제로 올린다 | A(28ba2a9b, 53c48a16), B |
| **④ 온보딩·검증 체계화기** | dibang-sui | "빌드 통과 ≠ 의도 정합" — 문서·정직한 완료 검증으로 헛다리를 막는다 | A(28ba2a9b#2~9, 84ad9997, fb685fff) |

---

## 단계 ① — v3 웨딩 서비스 구축기 (`digital-guestbook-v3`)

**맥락**: 백본 노트의 압도적 다수(세션코드 C, 일부 D/E/F)가 `digital-guestbook-v3` = Sui 전환 이전의 오프체인 웨딩 서비스다(Supabase/Postgres + Go API + React). 이 단계는 "블록체인"이 전혀 등장하지 않는, **순수한 웨딩 SaaS를 실제로 굴러가게 만든 시기**다.

### 그때의 의도
- 결혼식 디지털 방명록 + 웨딩 라운지를 **돌아가는 실서비스로** 만든다. 사용자는 도메인 디테일(피드=사진1장+글, 폰트 최소크기, 중복 방지, 이름 마스킹 등)을 직접 결정하며 제품을 다듬었다.

### 무엇을 만들었나 (근거)
- **웨딩 라운지 / 피드**: GuestbookEntry·LoungeCheckIn·HostAnnouncement 기반 피드, 하트, 댓글, 스토리 캐러셀. (C/0264e996 시리즈, C/0c8b80bd, C/68cc5929 등 다수)
- **guest-web 비로그인 퍼널**: QR → 누구측 6슬롯 → 관계/이름 → 축의(송금 딥링크) → 메시지/하트 → 완료 → 라운지 유도. (C/5dfe7cdf, C/c0720b88, C/53ad0a8d, scenario.md §1)
- **축의 장부(Wedding Report)**: 조회/추가/수정/삭제, CSV 내보내기. (C/60f1e6fd, C/7dde3f08)
- **메모리북 + 사진 큐레이션**: v2 → v3 백엔드/UI 이식, BE 32/32 + e2e PASS. (C/a0764698, C/ecb3c78c)
- **호스트 초대(부모·배우자 슬롯)**, **admin 운영 앱**(파괴적 mutation 포함), **사진 공유 3종 + presigned + 버킷 분리**, **사용자 동의 온보딩**. (C/bb410a17, C/3327ceb5, C/bbc4435c, C/b73dd933, C/5fcf08a5)
- **청첩장 에디터**(react-moveable/konva 캔버스, 레터링, 커버 편집): C/5116a0c7, C/6fd3b9fd, E/5b5cf62a, E/7e4a532c.
- **인프라/운영**: pgx/sqlc/oapi-codegen 스택, Supabase dev/prod 마이그레이션 트랙 동기화, 500/401 디버깅, lounge_entries→lounge_check_ins 같은 스키마 rename. (C/1a61398e, C/92a2a5fc, C/ddad560a, C/fdd2f418)

### 핵심 도메인 결정 (이 시기에 굳어져 다음 단계로 넘어감)
- **앱 경계**: guest-web = 비로그인 익명 전환 퍼널, dibang-wedding = 로그인 본체. (C/d45f4eff, C/858a8291)
- **축의(현금 송금)를 dibang-wedding → guest-web으로 이동**(2026-05-18 확정) — "비로그인이어도 돈이 퍼널을 지난다". (onboarding.md §4)
- 네이밍 정합: `side`→`recipient_slot`(6슬롯), `MoiVisit/LoungeEntry`→`LoungeCheckIn`. (C/b2019784, C/75adee94)

> **이 단계의 성격**: 이 모든 것이 다음 단계 기준으로는 "레거시"지만, **도메인 모델 자체는 여기서 형성**되어 dibang-sui로 그대로 승계되었다(엔티티 정의, 6슬롯, 마스킹 규칙 등 — architecture.md).

---

## 단계 ② — 신뢰잔액 리서치 → Sui 전환 결심 → 코드 이관

이 단계가 프로젝트의 **방향 전환점**이다. v3를 "더 잘 만드는" 것에서, v3가 쌓는 데이터를 **무엇에 쓸 것인가**로 의도의 무게중심이 옮겨갔다.

### 전환의 씨앗 — 신뢰잔액/신용 리서치 (아직 v3 레포 안에서)
- C/7a154dcd: **"2026 블록체인 해커톤 멀티에이전트 리서치 — 신뢰네트워크 기반 신용모델"** = 백본 노트가 직접 *"dibang-sui 방향의 개념적 기원"*이라고 적은 세션. 여기서 "왜 Sui 신뢰네트워크 방향이 됐나"의 의도 흐름이 시작된다.
- C/3169106b, C/7408019a: gathering-taxonomy(모임 분류 1층→2층), project/fold/signal, Fiske 4모델(CS/AR/EM/MP), 신뢰잔액→신용 — research-and-claude.md의 4층 사다리(분류→누적→환산→상품)가 이 시기 리서치 산출물.

### 의도의 재정의 (한 줄 정체성의 등장)
- 이 프로젝트는 **"방명록을 블록체인에 올리는" 게 아니라**, 방명록·축의·좋아요 같은 상호작용을 **신용의 원료로 삼는 신뢰네트워크 기반 DeFi**다. 목표는 상호작용 → 관계 신뢰 잔액 → 지갑 신용 평가 재료 → DeFi. 제출처는 **Sui Overflow 2026 Payment & DeFi 트랙**. (onboarding.md §1)
- 결혼식 = 신뢰망을 **일생 1회 전수 샘플링**하는 진입점이라는 관점이 이 전환의 정당화. (onboarding.md, research-and-claude.md A4)

### 코드 이관 (v3 → dibang-sui)
- **A/28ba2a9b#0**: *"v3→dibang-sui 이관 · zkLogin 온체인 방명록"* — 백본 노트에서 현행 dibang-sui 레포로 넘어오는 **첫 이관 마커**.
- B/08c0fcfc, B/d1c3d2e6: Sui creator 신뢰보장(UpgradeCap→immutability), Sui event 온체인 신뢰성 — 온체인 신뢰 설계의 초기 질의.

> **전환점 (왜 바뀌었나) ①**: "오프체인 웨딩 서비스를 더 다듬자"에서 → **"이 상호작용 데이터가 곧 신용의 원료다. 그러니 공개·검증 가능한 Sui 온체인으로 올린다"**로. 신뢰잔액 리서치(C/7a154dcd 등)가 이 전환의 지적 근거이고, A/28ba2a9b#0가 코드상 출발점이다.

---

## 단계 ③ — 온체인 신뢰네트워크 / zkLogin / sponsor 구현기 (`dibang-sui`)

전환을 실제 코드로 옮긴 시기. 단일 연속 세션 A/28ba2a9b 와 Move 설계 세션 A/53c48a16 이 척추다.

### 그때의 의도
- 신뢰네트워크(Moi·Ium·MoiGatherPlace 등)는 오프체인에 **미구현**이었다 → "전환"이 아니라 **처음부터 온체인으로 짓는 그린필드**. 핵심 구현 대상. (onboarding.md §3, §7)

### 무엇을 만들었나 (근거)
- **Move 컨트랙트 7종**(wedding/guestbook/cash_gift/rsvp/moi/ium/utils): testnet 배포(`0x6bb83eef…`), 36 테스트. (A/28ba2a9b#3, onboarding.md §8)
- **TypeScript SDK**(`@gorae/sui-sdk`, 15 빌더 + 조회 + exec + zklogin + sponsor): testnet 실호출 E2E. (A/28ba2a9b#1·#3)
- **zkLogin Salt 서버(Go)** + **Sponsored Tx(Node 서비스)**: salt 결정성, sponsor-server. (A/28ba2a9b#3)
- **인프라 우회 과정의 현실적 조정**: prover self-host 시도 → **arm64 미지원으로 hosted 전환**, dev 지갑 로그인 인프라(C4D), dev 인증 우회(C6X). (A/28ba2a9b#3·#5)
- **온체인 배선·E2E**: 호스트 /invitation/create → 온체인 createWedding 실증(V-C6), Supabase↔온체인 Sui ID 브릿지(C7). (A/28ba2a9b#5)
- **Move 신뢰네트워크 컨트랙트 심화**(A/53c48a16): event/ledger 척추 TDD, give·guestbook·ium·gift·invite 신호 확장, `credit.ts` 신뢰→신용 리더(PHI-5 PageRank), PII 제거, SDK 쿼리.

### 이 시기에 굳어진 온체인 원칙
- **활동·관계 기록은 SBT**(`key`-only, transfer 불가) — 신용평가 무결성. 거래/선물 의도 자산만 `store`. (onboarding.md §10)
- **온체인 = raw 액션 원장**(action_type·actor·target·event·resource 저장). 신뢰 해석(부조/거래/신용)은 **저장하지 않고 규칙으로 계산**. (onboarding.md §9, research-and-claude.md A11)
- **민감정보(이름 등) 온체인 평문 금지** — 공개 체인 ↔ 마스킹 충돌. (onboarding.md §5)
- **돈은 SUI 온체인으로**(추후 USDSui). (onboarding.md §15)

> **전환점 (왜 바뀌었나) ②**: 구현 도중 두 번 방향이 교정됐다. (a) testnet 스모크가 `Moi` key-only를 `transferObjects`로 못 옮기는 `InvalidTransferObject`를 잡아 **SBT 설계를 정정**. (b) 독립 보안 감사(Opus)가 sponsor의 가스 코인 탈취 + aud fail-open 두 CRITICAL을 잡아 **화이트리스트·fail-closed로 수정**. → "testnet 실호출 + 독립 적대적 리뷰는 빌드/유닛이 못 잡는 결함을 잡는다"가 규칙이 됨. (onboarding.md §13)

---

## 단계 ④ — 온보딩·검증 체계화기 (`dibang-sui`)

구현이 진행되면서 **"빌드는 통과했는데 의도와 어긋났다"**는 자각이 의도의 중심이 된 시기. A/28ba2a9b의 후반부와 적대 검증 세션들이 여기 속한다.

### 전환의 계기 (반복 금지 교훈)
- 이전 세션이 **문서를 안 읽고** Move·SDK·zkLogin을 구현해 헛다리를 짚었다(L1). guest-web에 zkLogin을 잘못 붙였고(L2), 활동 기록을 transfer 가능하게 만들었고(L3), 신뢰네트워크를 "전환" 대상으로 오인(L4), 축의금을 "기록만"으로 오정(L5). (onboarding.md §13)

### 그때의 의도 — 두 갈래
1. **문서를 단일 진실원천으로 세운다**: A/28ba2a9b#1에서 *"도메인모델 단일원천 → 온보딩문서 최우선"*, A/28ba2a9b#2에서 **온보딩 문서 12개 + 컨벤션 구축 + 검증 라운드**. 결과물이 `_onboarding/00~09` + `_architecture/DOMAIN_MODEL_SUMMARY.md`(SSOT).
2. **정직한 완료 검증 체계를 만든다**: (거짓 완료) 반성 → **TaskUpdate 완료 게이트 hook 신설** → run-tasks/create-tasks 스킬 보강 → 매 태스크마다 opus 적대검증 PASS 게이트. (A/28ba2a9b#4, #7, #9)

### 무엇을 만들었나 (근거)
- **온보딩 핸드북 + 코드 컨벤션** 구축·검증. (A/28ba2a9b#2)
- **xState 전면 머신화 TDD 루프**(dibang-wedding 프론트 상태관리): 페이지별 머신 배선 + optimistic locking, 매 태스크 opus 검증 게이트. (A/28ba2a9b#6~9, XS-N 시리즈)
- **독립 적대적 완료 검증 세션**: A/84ad9997(task #35 false-completion 검사), A/fb685fff(XS-N 커버리지 검증), A/25c842ba#0(태스크#1 검증 → FAIL). 검증자가 빌드 통과를 신뢰하지 않고 직접 확인하는 패턴.

> **전환점 (왜 바뀌었나) ③**: "코드를 더 만들자"에서 → **"만든 것이 의도와 맞는지, 완료 보고가 정직한지를 먼저 보장하자"**로. 거짓 완료 사건과 L1~L6 교훈이 계기. 그 결과 의도가 *기능 추가*보다 *문서 SSOT + 적대적 검증 게이트*로 이동했다.

---

## 의도 진화 요약 (한 문장씩)

- **①** 결혼식 디지털 방명록·라운지를 **실제로 돌아가는 오프체인 웨딩 서비스로** 만들었다. (C/D/E/F)
- **②** 그 서비스가 쌓는 상호작용이 **신용의 원료**임을 신뢰잔액 리서치로 깨닫고, **Sui 온체인으로 옮기기로** 결심·이관했다. (C 리서치 → A/28ba2a9b#0)
- **③** Move·SDK·zkLogin·sponsor를 **testnet에 실제로 올리며**, SBT·raw 원장·민감정보 비저장 원칙을 세웠다. (A/28ba2a9b, A/53c48a16, B)
- **④** "빌드 통과 ≠ 의도 정합"을 자각하고 **문서 SSOT + 정직한 완료 검증 게이트**로 헛다리를 구조적으로 막았다. (A/28ba2a9b 후반, A/84ad9997, A/fb685fff)
