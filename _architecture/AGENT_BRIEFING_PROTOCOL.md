# 에이전트 온보딩·브리핑 규약 (디방-Sui 설계 작업용)

> **언제 쓰나:** 메인 설계자(나)가 리서치·피드백·검증·최종검토용 서브에이전트를 **스폰할 때마다** 이 파일을 펴서, 아래 §7 프리앰블을 프롬프트 맨 앞에 붙인다.
> **왜 있나:** 맥락 없는 에이전트는 프로젝트 의도를 모른 채 **쓸데없는 피드백**(zkLogin 커스터디·sponsor 인증·가스 최적화·메인넷 상금 등 운영 영역)을 쏟아낸다. 그건 "온보딩 실패"의 신호다. 모든 스폰 에이전트는 **먼저 프로젝트를 전수 파악(약 20~30만 토큰)하고, 스스로 인사이트를 낼 수준으로 온보딩된 뒤에만** 과업을 수행한다. 의도를 벗어나면 안 된다.

---

## 0. 미션 컨텍스트 (에이전트가 알아야 할 큰 그림)

- **프로젝트:** 디방 웨딩 + 인연(신뢰네트워크) 서비스를 **Sui 온체인(Move)** 으로. 사람들의 상호작용(부조·이음·방명록·참석…)을 온체인 raw로 쌓아 → **관계 신뢰 잔액 → 지갑 신용 점수 → DeFi**.
- **지금 단계 = '설계 완성'.** 구현(Move 코딩/TDD) 아님. 방향(direction)을 **구현 직전 수준의 완전한 설계**로 끌어올리는 게 목표. (구조체 필드·능력·소유권, 함수 시그니처, action_type/role/event_type 목록, project·fold 매핑, 7-엔티티의 Move 대응 — 코드만 안 짰지 뭘 짤지는 다 정해진 상태.)
- **메인 설계자(나)가 주도**, 에이전트는 **검증·피드백·완성도 향상**을 돕는 보조. 에이전트의 결과물은 사용자에게 직접 가지 않고 내가 취합한다.

---

## 1. 필수 정독 목록 (전수 파악 — 약 20~30만 토큰, 건너뛰기 금지)

모든 경로는 워크트리 루트 `/Users/taewonpark/Github/WORK/GoraeUniverse/dibang-sui-worktrees/feat-integrate-sui-dibang-inyeon/` 기준.

**A. 의도·규칙(왜) — 가장 먼저:**
- `CLAUDE.md` (프로젝트 규칙) + 전역 `~/.claude/CLAUDE.md` (행동 규칙)
- `_onboarding/VISION-AND-INTENT.md` — 오너 원문, "왜 Sui인가"의 SSOT
- `_onboarding/00-READ-FIRST.md` — 오해하기 쉬운 것 + 체크리스트
- 메모리: `~/.claude/projects/-Users-taewonpark-Github-WORK-GoraeUniverse-dibang-sui/memory/MEMORY.md` 와 그 안의 파일들 — 특히 `design-scope-contract-logic-first.md`(설계=컨트랙트 로직, 운영 제외)

**B. 무엇(도메인·온체인 방향):**
- `_architecture/DOMAIN_MODEL_SUMMARY.md` — 도메인 SSOT(엔티티·불변식·역할)
- `_onboarding/02-APP-BOUNDARIES.md` (guest-web=익명 퍼널 / dibang-wedding=로그인 본체 / admin=운영)
- `_onboarding/05-IMPLEMENTED-VS-PLANNED.md`, `04-USER-JOURNEYS.md`, `07-LESSONS.md`
- `_onboarding/06-SUI-ONCHAIN-DIRECTION.md` — 온체인 방향·SBT 감사(D15)
- `_onboarding/08-TRUST-BALANCE-CREDIT-MODEL.md` — 신뢰잔액/신용 모델 + 온체인 스키마 요구

**C. 신뢰-신용 모델(핵심 IP):** `_research/gathering-taxonomy-trust-balance/`
- `SUMMARY.md` · `05-category-hints.md`(H1~H13, 범주론) · `07-fold-dynamics.md`(fold·PHI-4) · `09-credit-propagation.md`(PHI-1/5·CAT-1)
- `wedding-action-catalog_유상검토_260619.md` · `inyeon-action-catalog_260619.md` · `디방_1층_catalog_통합_260619.md` · `해커톤_회의록_260619_모이크레딧_4층모델.md`

**D. 현재 설계·코드:**
- `_architecture/SUI_CONTRACT_DESIGN_DIRECTION.md` — **현재 설계(가장 중요). 결정사항·v2 리뷰 반영분 포함.**
- `contracts/dibang_wedding/sources/*.move` — 현재 컨트랙트(재설계 대상). `Move.toml`.

**E. Sui 설계 표준:** `~/.claude/skills/sui-dev-skills/move/SKILL.md` + 하위(objects·patterns) + `FAQ.md`.

> 인연 프론트/액션 surface가 과업에 필요하면: `apps/dibang-wedding/src/machines/inyeon.machine.ts`, `components/inyeon/*`, `prototypes/dibang-inyeon/feature-definition-260617.md`.

---

## 2. 확정된 결정·의도 가드레일 (재론·역행 금지)

에이전트는 아래를 **이미 정해진 전제**로 받아들인다. 다시 열거나, 이걸 모른 채 피드백하지 않는다.

- **토대 원칙:** 컨트랙트는 **신원-불가지 지갑 그래프**. 사람(이름·성별·정체)은 아예 모른다 가정 — 오직 "어떤 지갑↔어떤 지갑이 이렇게 연결됐다"만 다룬다.
- **[결정#1]** 부조 amount = **평문 OK**. 프라이버시 1순위는 금액이 아니라 **신원 비식별**(온체인 PII 0 + 가명 주소).
- **[결정#2]** inyeon target = **평문 가명주소**. **모든 채팅·사진·사람정보 = 오프체인**, 온체인은 행위 사실만.
- **[결정#4]** 범위 = **전체(wedding+inyeon)**. 빌드 순서 = **웨딩 부조로 척추(ledger) 먼저** → 신호 확장(깊이 우선).
- **[결정#12]** 신용 계산 = **오프체인 인덱서**(원본 raw는 온체인 SSOT). 신뢰있는 온체인 재진입(오라클/ZK)은 **나중**.
- **설계 핵심 원칙(이미 합의):** raw 액션 저장/해석은 오프체인 계산 · SBT=key-only+transfer · per-node(전역레지스트리 X) · capability(allowlist X) · 돈은 실제 SUI · **role=fold 방향** · 범주론은 오프체인 함자(컨트랙트엔 거의 요구 없음, over-claim 금지).

---

## 3. ⛔ OUT OF SCOPE — 이 피드백을 내면 "온보딩 실패"다

아래는 **운영/배포 영역**이라 **설계 피드백에서 다루지 않는다.** 에이전트가 결과물에 이걸 꺼내려 하면 멈추고 지운다. (이것이 zkLogin/sponsor 사건의 교훈.)

- ❌ **sponsor(가스 대납)** 인증·rate limit·DoS — 단순 가스 대납, 운영에서 처리.
- ❌ **가스비 최적화** — 불필요. 컨트랙트 로직이 우선.
- ❌ **zkLogin** 커스터디·salt 서버·OAuth SPOF — 그냥 지갑 대체, 운영 영역.
- ❌ **메인넷 배포/상금 50%** 를 설계 드라이버로 부풀리기 — testnet에서 완성도 높이고 마지막에 배포하면 됨.
- ❌ amount/그래프 프라이버시를 과하게 설계(버킷·커밋·ZK 등) — 신원 비식별(PII 오프체인)이면 충분, 나머진 나중.

> 이 항목들에 대한 *우려 자체가 틀렸다*는 게 아니라, **지금 설계 단계의 관심사가 아니다.** 정 필요하면 "운영 후속(out-of-scope)"으로 1줄만 분리해 적고 본문에서 비운다.

---

## 4. 온보딩 프로토콜 (에이전트가 따르는 순서)

1. **정독:** §1 목록을 실제로 읽는다(요약 받지 말고 원문). 약 20~30만 토큰. 건너뛰기·추측 금지.
2. **자가검증(§8) 통과:** 아래 체크에 스스로 답할 수 있어야 온보딩 완료. 못 하면 더 읽는다.
3. **인사이트 모드로 과업 수행:** 단순 요약이 아니라 **스스로 인사이트**를 낸다. 단 §2 가드레일 안에서, §3 금지목록 밖에서.
4. **반환 전 자기검열:** 결과물에 §3 항목이 섞였는지 확인하고 제거. 의도(VISION) 정합성 재확인.

---

## 5. 에이전트 재사용 원칙 (토큰 절약)

- 한 번 온보딩된 에이전트는 **버리지 말고 `SendMessage`로 이어서** 다음 과업을 준다(맥락·온보딩 유지 → 재정독 불필요).
- 새 `Agent` 스폰은 맥락이 0이라 §1 전수 정독을 처음부터 다시 해야 한다 → 같은 관점이면 기존 에이전트 재사용이 우선.
- 서로 다른 적대적 관점이 필요할 때만 새로 스폰(각자 온보딩).

---

## 6. 온보딩 자가검증 체크 (과업 착수 전 반드시 통과)

에이전트는 다음에 막힘없이 답할 수 있어야 한다(못 하면 §1 더 읽기):
1. 이 프로젝트의 한 줄 명제(상호작용→신뢰잔액→신용→DeFi)와 "왜 Sui/SBT인가"를 설명하라.
2. **온체인에 올리는 것 vs 오프체인에 두는 것**의 경계를 말하라. (raw 액션·지갑 엣지·실제 SUI = 온체인 / 이름·성별·채팅·사진·사람정보·해석·fold·Φ = 오프체인)
3. §3 OUT OF SCOPE 항목 3개 이상을 대고, 왜 설계 피드백에서 빼는지 설명하라.
4. 확정된 결정 4개(#1·#2·#4·#12)와 토대 원칙(신원-불가지 지갑 그래프)을 말하라.
5. 범주론이 컨트랙트 설계에 주는 실제 요구가 무엇인지(거의 없음 — raw/해석 분리 + role=방향뿐, 나머진 오프체인 함자)를 말하라.

---

## 7. 표준 프롬프트 프리앰블 (스폰 시 복붙)

```
너는 디방-Sui '설계 완성' 작업의 보조 에이전트다. 과업을 하기 전에 반드시 온보딩하라.

[온보딩 — 건너뛰기 금지, 약 20~30만 토큰]
다음을 원문으로 정독하라(요약 받지 말 것). 경로 기준:
/Users/taewonpark/Github/WORK/GoraeUniverse/dibang-sui-worktrees/feat-integrate-sui-dibang-inyeon/
- _architecture/AGENT_BRIEFING_PROTOCOL.md  ← 먼저 이 파일 전체(가드레일·금지목록·자가검증)
- _architecture/SUI_CONTRACT_DESIGN_DIRECTION.md (현재 설계, 최우선)
- _onboarding/VISION-AND-INTENT.md, 00-READ-FIRST.md, 06-SUI-ONCHAIN-DIRECTION.md, 08-TRUST-BALANCE-CREDIT-MODEL.md
- _architecture/DOMAIN_MODEL_SUMMARY.md
- _research/gathering-taxonomy-trust-balance/ : SUMMARY.md, 05-category-hints.md, 07-fold-dynamics.md, 09-credit-propagation.md, wedding/inyeon action-catalog_260619, 디방_1층_catalog_통합_260619
- contracts/dibang_wedding/sources/*.move
- 메모리: ~/.claude/projects/-Users-taewonpark-Github-WORK-GoraeUniverse-dibang-sui/memory/ (MEMORY.md + design-scope-contract-logic-first.md)
- ~/.claude/skills/sui-dev-skills/move/SKILL.md + FAQ.md

[규칙]
- AGENT_BRIEFING_PROTOCOL.md의 §2 가드레일 안에서, §3 OUT OF SCOPE(zkLogin·sponsor·가스최적화·메인넷상금·과한 amount/그래프 프라이버시) 밖에서만 의견을 낸다.
- 단순 요약 금지 — 스스로 인사이트를 낸다. 반환 전 §3 섞였는지 자기검열.
- 온보딩 자가검증(§6) 5문항에 답할 수 있을 때만 과업 착수. 출력 맨 앞에 자가검증 1줄 요약을 붙여 온보딩됨을 증명하라.

[과업]
(여기에 구체 과업 — 리서치/피드백/검토 — 을 적는다.)
```

---

*유지보수: 결정이 추가/변경되면 §2·§3·§6을 갱신한다. 이 파일은 설계 스프린트 내내 살아있는 단일 출처다.*
