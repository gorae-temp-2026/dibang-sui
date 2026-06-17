# 06 — Sui 온체인 방향 (지금까지 + 정정 + 결정 + SBT 감사)

> 상위 근거: `VISION-AND-INTENT.md`(왜), `08-TRUST-BALANCE-CREDIT-MODEL.md`(신뢰잔액/신용 모델),
> `09-HACKATHON-ALIGNMENT.md`(Overflow 2026 DeFi&Payments). 구현 현황은 `05`, 앱 경계는 `02`.

---

## A. 왜 (한 단락)
모든 (비민감) 상호작용을 Sui 온체인에 **불변 기록(SBT)** 으로 쌓아 → 관계 신뢰 잔액 → 지갑 신용 점수 →
DeFi(대출·결제 보증)에 활용. 결혼식은 신뢰망을 일생 1회 전수 샘플링하는 진입점. 돈/금융은 SUI로 온체인
(추후 USDSui). 기존 Supabase는 최후수단, **완전 대체를 향한 빠른 점진 대체.** 제출: Overflow 2026 DeFi&Payments.

---

## B. 지금까지 구축됨 (Phase 1~3, 빌드·검증·커밋 — 단 SBT 정정 대상)

| 산출물 | 위치 | 상태 |
|--------|------|------|
| Move 컨트랙트 (wedding/guestbook/cash_gift/rsvp/moi/ium/utils) | `contracts/dibang_wedding/` | testnet 배포 `0x6bb83eef…dc95`, IumRegistry `0xea55…`, 36 테스트. `.env.testnet.sui` |
| TypeScript SDK (15 빌더+조회+exec+zklogin+sponsor) | `packages/sui-sdk/` | testnet 실호출 E2E 검증 |
| zkLogin Salt 서버 (Go) | `apps/api/server/*_zklogin*` | salt 결정성·핸들러 테스트 |
| Sponsored Tx (Node 서비스) | `packages/sui-sdk/scripts/sponsor-server.ts` | E2E 검증, 독립 감사 CRITICAL 2건 수정 |
| 프론트 dApp Kit + ZkLoginProvider + 온체인 훅 | `apps/guest-web`, `apps/dibang-wedding` | **빌드만, UI 미배선** |

> 단, 아래 §D(정정)대로 **zkLogin은 dibang-wedding 소속**으로 옮겨야 하고, §E(SBT)대로 **기록 객체를
> key-only로 재작성**해야 한다.

---

## C. 신뢰잔액 모델 ↔ 온체인 (핵심 연결)
- **온체인 = raw 액션의 불변(SBT) 원장.** `action_type`(돈건넴·옴·서명·초대·말함…) + actor·target·event·
  resource·amount·timestamp를 저장. **해석(부조/거래/EM·CS·신용)은 저장 안 하고 규칙으로 계산.** (`08` 원칙)
- 신뢰 잔액(fold) · 신용 점수(PageRank+행동신호)는 이 원장을 읽어 인덱서/오프체인(또는 별도 온체인 모듈)에서
  계산. 정식 Φ·요네다·정량모델은 𝒲 트랙.
- 이미 만든 컨트랙트(guestbook/cash_gift/ium 등)를 이 **"액션 원장"** 관점으로 재정렬해야 한다(이벤트/필드가
  trust 계산 입력으로 충분한지).

---

## D. 정정·확정 (실제 서비스·비전 기준)
1. **zkLogin은 dibang-wedding(로그인 본체)** — guest-web(익명 퍼널)엔 로그인 없음. (이전 세션 오류, `07-LESSONS` L2)
2. **zkLogin이 Supabase 로그인 대체**, 단 DB엔 user 행(최소 Sui address) 유지. (VISION §3)
3. **지갑 1개 = User 1개 = Moi 1개**(영속). (VISION §4)
4. **돈은 SUI 온체인**(vault/결제), 추후 USDSui. "기록만"이 아님. (VISION §6, `07-LESSONS` L5)
5. **신뢰네트워크(Moi/Ium/CheckIn)는 오프체인 미구현 → 온체인 그린필드 구축.** (`05`, `07-LESSONS` L4)
6. **익명 하객**: claim 우선 / 서비스 대리서명 fallback. (VISION §5) — 단 SBT와 충돌(아래 §E 주의).
7. **민감정보 비온체인**(이름 등) — 공개 체인. 신뢰 신호는 비민감 상호작용으로. (VISION §7)

---

## E. SBT(soulbound) 감사 — 현재 컨트랙트 객체별 결정 (D15)

원칙(VISION §4): **활동·관계 기록은 transfer 불가(SBT, `key`-only). 거래/선물 의도 자산만 `store`.**

| 객체 | 현재 능력 | 성격 | 결정 | 근거 |
|------|-----------|------|------|------|
| `guestbook::GuestbookEntry` | key + store | **활동 기록**(참석 정체성) | **→ key-only (정정)** | 신용 무결성. 방명록은 거래 대상 아님 |
| `cash_gift::CashGiftRecord` | key + store | **활동 기록**(부조 영수증, EM) | **→ key-only (정정)** | 부조 기록은 옮기면 신뢰 세탁 |
| `ium::Ium` | key + store | **관계 엣지**(CS) | **→ key-only (정정)** | 관계는 매매·이전 불가 |
| `wedding::WeddingCap` | key + store | **권한(Host)** | **→ key-only 검토** | 호스트 권한 토큰의 자유 이전은 host-invite 우회 |
| `moi::Moi` | key (only) | 아바타(정체성) | **유지 ✓** | 이미 soulbound (올바름) |
| `moi::MoiItem` | key + store | **자산**(선물 의도, 도메인 SendMoiItem) | **유지(store)** | 의도된 거래/선물. 단 신용 "기록" 입력에서 제외 |
| `wedding::Wedding` / `WeddingLounge` / `cash_gift::CashGiftVault` / `ium::IumRegistry` | key (shared) | 공유 컨테이너/금고 | N/A | 공유 오브젝트(소유·이전 개념 없음) |
| `rsvp::RsvpSubmitted` | event | 이벤트 로그 | N/A | 이벤트는 불변 로그(적합) |

### SBT × 익명 claim 의 설계 충돌 (반드시 해결할 것)
- soulbound면 transfer 불가 → 익명(서비스 대리서명) 기록을 나중에 사용자 지갑으로 **옮길 수 없다.**
- 해소안 후보: (a) 로그인 후 작성은 **처음부터 사용자 지갑으로 직접 발행**(claim 불필요), (b) 익명 기록은
  **이벤트/레지스트리 항목**으로 두고, claim 시 사용자가 그를 참조하는 **자기 SBT를 새로 mint**, (c) 익명
  기록은 off-chain에 두고 claim 시 온체인 mint. → **결정 필요**(아래 §F).

### SBT 정정 후속 코드 태스크 (문서 단계에선 도출만)
1. GuestbookEntry·CashGiftRecord·Ium을 `key`-only로 재작성 + 생성 함수가 recipient에게 내부 transfer(빌더의 `transferObjects` 제거).
2. WeddingCap soulbound 여부 결정 후 반영.
3. 컨트랙트를 "액션 원장"(action_type·actor·target·resource) 관점으로 필드/이벤트 보강(`08` 요구).
4. 재배포(testnet→추후 mainnet) + SDK 빌더 갱신 + testnet 회귀 + 독립 보안 리뷰.
5. claim/익명 처리 방식(위 충돌 해소안) 구현.

---

## F. 결정 대기 (다음 세션이 사용자와 확정)
1. **익명 기록 claim 방식** (위 §E 충돌): (a) 직접 발행 / (b) 참조-mint / (c) off-chain→mint 중?
2. **돈 온체인 형태**: 지금 SUI로 시작 → USDSui 전환 시점·범위.
3. **WeddingCap soulbound 여부.**
4. **신용 점수 계산 위치**: 인덱서/오프체인 vs 온체인 모듈(가스·검증 트레이드오프).
5. **mainnet 배포 시점**(상금 100% 조건, `09`).

---

## G. 기존 zkLogin/프론트 태스크(C1~C12) 재도출 필요
- C1~C12는 "**하객 zkLogin**" 전제(오류)라, **dibang-wedding 중심 + 익명 퍼널 유지 + SBT** 기준으로 다시 짜야 한다.
- 권장 1차 데모(해커톤 Real-World 50% 정렬): **dibang-wedding 로그인(zkLogin) → 온체인 상호작용(SBT) →
  한 지갑의 신뢰잔액/신용 점수 표시 → 그 점수로 DeFi 동작(예: 대출 한도)** 한 흐름.
