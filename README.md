# Dibang — Trust Network DeFi from Real-World Gatherings

Dibang은 결혼식 디지털 방명록·축의 서비스다. 하지만 진짜 목적은 그 위에 있다.

결혼식을 비롯한 모임에서 발생하는 **사람 간 상호작용 데이터를 Sui 온체인에 쌓고**, 그것으로 **관계 신뢰 잔액(trust balance)** 을 계산하고, 한 지갑에 연결된 모든 신뢰 잔액으로 **그 지갑의 신용 점수**를 만들어 **DeFi에 활용**하는 프로젝트다.

> Sui Overflow 2026 — Payment & DeFi 트랙 제출 대상

---

## 왜 결혼식인가

결혼식은 한 사람의 신뢰 네트워크를 **인생에 한 번 전수 샘플링**하는 장치다.

- 통과의례(한 번뿐) × 전체 소집(관계망 총출동) × 부조(돈이 오간다) × 공식 기록(명단이 남는다)
- 누가 왔는지, 얼마를 냈는지, 뭐라고 썼는지 — 이 데이터가 모이면 그 사람의 관계망이 통째로 찍힌다
- 장례식·돌잔치·계모임 등으로 확장 가능하지만, 결혼식이 가장 농밀한 진입점

---

## 핵심 로직 — 4층 사다리

```
1층  분류     모임을 타입별로 분류 (결혼식, 장례식, 계모임...)
2층  누적     raw 액션을 쌓아 관계별 신뢰 잔액 산출 (fold)
3층  신용     신뢰 잔액 그래프 → 지갑별 신용 점수 (PageRank + 행동 신호)
4층  DeFi    신용 점수 → 대출 한도, 결제 보증, 이자율 등 금융 상품
```

### 설계 원칙: raw 액션만 저장, 해석은 계산

온체인에는 **사람이 한 행위 그 자체**(raw 액션)만 저장한다. "부조인지 거래인지" 같은 해석은 저장하지 않고 규칙으로 계산한다.

- 같은 "돈 건넴"이라도 (하객→혼주)면 **부조**, (혼주→업체)면 **거래**로 갈린다
- 해석을 저장하면 규칙이 바뀔 때 과거 데이터를 전부 고쳐야 한다 — raw만 남기면 규칙만 바꾸면 된다

### SBT (Soul Bound Token) — 신용 세탁 방지

활동·관계 기록은 **전송 불가(soulbound, Move에서 `key`-only)**로 만든다.

- 방명록·축의·관계(Ium) 기록을 다른 지갑으로 옮길 수 없다 → 신용 평가의 무결성 보장
- 지갑 1개 = 유저 1명 = Moi(아바타) 1개. 활동 기록이 묶여 있으니 다음 금융 활동에도 그 지갑을 쓸 수밖에 없다
- 선물 의도가 있는 **자산**(예: 모이 아이템)만 예외적으로 전송 가능(`key + store`)

### 신뢰 잔액 → 신용 점수

- **EM (호혜 잔액)**: 부조·참석·축전 등 — 갚을 수 있는 것. 순잔액(net)이 신뢰의 크기
- **CS (유대 강도)**: 초대·동석·안아줌 등 — 돈이 0이어도 친밀의 직접 신호
- **이행률**: 빌린 돈 갚았나, 약속 지켰나 — 본인 행동의 직접 증거
- 최종 신용 = 네트워크 위치(PageRank, "누구와 엮였는가") + 본인 행동(이행률)

---

## 온체인이 SSOT다

**신뢰·웨딩 데이터의 단일 진실 원천은 온체인(Sui)**이다. DB(Supabase)는 표시용 콘텐츠와 캐시의 보조 역할.

현재 코드가 DB에서 데이터를 읽는 부분이 있는데, 이건 **전환기**일 뿐이다. 이걸 보고 "DB 우선 프로젝트"라고 이해하면 틀린다. 온체인 완전 이관이 명시적 목표다.

- 돈(축의금)도 SUI로 온체인 송금 (추후 USDSui 전환)
- 좋아요·하트·댓글 같은 미세 상호작용까지 온체인에 남기는 게 목표
- Supabase는 최후 수단

---

## 앱 경계 — 왜 앱이 둘인가

이 구분을 모르면 기능을 엉뚱한 앱에 넣게 된다.

### guest-web — 게스트 전환 퍼널

공유 링크/QR로 들어온 게스트가 **결혼식에 참여하고 라운지로 유도되는 흐름** 전체.

```
퍼널 A: 청첩장 보기 → 하트 → 라운지 티저
퍼널 B: 누구측 선택 → 관계/이름 → 축의금 → 축하 메시지 → 완료
                                                         ↓
                                              "라운지 들어가기" 유도
```

게스트도 zkLogin으로 서명해서 온체인에 직접 기록한다.

### dibang-wedding — 로그인 서비스 본체

로그인한 Host·Guest의 **모든 식별된 행위**가 여기.

- Host: 결혼식 만들기, 청첩장 관리, 공지, 축의 장부, 호스트 초대
- Guest: 라운지 입장, 피드 하트·댓글, 모이 꾸미기
- 공통: 이음(Ium, 관계) 생성, 프로필, 모이 아이템 선물
- zkLogin 인증, 온체인 신원, 신뢰네트워크 기능은 모두 여기 소속

---

## 실행 방법

### 사전 요구

- Node.js 20+
- pnpm 9.15+ (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- Go 1.25+
- Sui CLI (`cargo install sui --locked`)

### 설치

```bash
pnpm install
```

### Move 컨트랙트 — 빌드·테스트·배포

```bash
cd contracts/dibang_wedding

sui move build           # 빌드
sui move test            # 유닛 테스트
```

#### Testnet 배포

```bash
# Published.toml이 있으면 신규 배포가 막힌다 — 임시 제거 후 publish하고 원복
mv Published.toml Published.toml.bak
sui client publish --gas-budget 500000000
mv Published.toml.bak Published.toml
```

배포 결과에서 다음 ID를 채운다:

| 배포 결과 | 넣는 곳 |
|-----------|---------|
| **Package ID** | `.env.testnet.sui` → `SUI_PACKAGE_ID`, 프론트엔드 `.env` → `VITE_SUI_PACKAGE_ID` |
| **UpgradeCap Object ID** | `.env.testnet.sui` → `SUI_UPGRADE_CAP_ID` |

#### Trust Registry 부트스트랩

배포 후 1회, 신뢰 그래프에 필요한 공유 오브젝트(TrustRegistry + EM/CS 매트릭스)를 생성해야 한다. give/write/invite 등 모든 온체인 상호작용이 이 매트릭스를 참조하므로 없으면 트랜잭션이 실패한다.

```bash
pnpm --filter @gorae/sui-sdk exec tsx scripts/bootstrap-trust.ts
```

출력되는 ID 3개를 `packages/sui-sdk/src/constants.ts`의 `TESTNET_CONFIG`에 넣는다:

| 출력 | 필드 |
|------|------|
| TrustRegistry ID | `trustRegistryId` |
| EM-money Matrix ID | `emMoneyMatrixId` |
| CS Matrix ID | `csMatrixId` |

### 앱 실행

각 앱의 `.env.example`을 `.env`로 복사하고 값을 채운다. 필수값은 Supabase 연결 정보(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)와 위에서 얻은 Sui Package ID.

```bash
pnpm install

# 프론트엔드 (각각 별도 터미널)
pnpm dev:wedding        # dibang-wedding — localhost:5200
pnpm dev:guest          # guest-web — localhost:5201

# Go API
pnpm dev:api:local      # localhost:8080

# 빌드
pnpm build              # 프론트엔드 전체 빌드
```

---

## 도메인 핵심 개념

| 개념 | 설명 |
|------|------|
| **Moi (모이)** | 유저의 아바타이자 신뢰네트워크의 노드. 유저 1명 = Moi 1개 (영속) |
| **Ium (이음)** | 유저와 유저 사이의 관계. 신뢰네트워크의 엣지 |
| **Wedding** | 결혼식 이벤트. 라운지·청첩장·방명록·축의의 컨테이너 |
| **WeddingLounge** | 결혼식의 디지털 공간. 피드·사진·상호작용이 일어나는 곳 |
| **GuestbookEntry** | 한 게스트의 방명록 정체성. 아래에 메시지(GuestbookMessage)가 1:N으로 달림 |
| **CashGift** | 축의금 기록. 온체인에서는 실제 SUI 송금 |
| **Host/Guest** | Wedding별 역할. 같은 유저가 다른 결혼식에선 다른 역할 |

---

## 프로젝트 문서 안내

처음이면 이 순서로 읽는다:

1. `_onboarding/VISION-AND-INTENT.md` — 왜 Sui인가 (프로젝트 오너 원문)
2. `_onboarding/00-READ-FIRST.md` — 가장 오해하기 쉬운 것들
3. `_architecture/DOMAIN_MODEL_SUMMARY.md` — 도메인 모델 (SSOT)
4. `_onboarding/08-TRUST-BALANCE-CREDIT-MODEL.md` — 신뢰잔액·신용 모델 (핵심 IP)
5. `_onboarding/06-SUI-ONCHAIN-DIRECTION.md` — 온체인 방향·SBT 감사

그 외:
- `_onboarding/02-APP-BOUNDARIES.md` — 앱 경계 상세
- `_onboarding/04-USER-JOURNEYS.md` — 사용자 여정
- `_research/gathering-taxonomy-trust-balance/` — 신뢰잔액 핵심 연구 원본
- `_code_convention/` — 코드 컨벤션 (Move, SDK, 테스트 등)
