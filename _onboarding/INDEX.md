# 디방-Sui 온보딩 — 다음 세션을 위한 단일 진입점

이 폴더(`_onboarding/`)는 **이 프로젝트(디방 웨딩 방명록 + 그 위에 Sui 온체인을 붙이는 작업)를
처음 맡는 세션이 오해 없이 이해**하도록 만든 핸드북이다. 압축·축약 없이, "왜"의 원천(VISION)과
"무엇"의 단일 원천(도메인 모델)을 충실히 반영해 작성했다.

> **이 폴더가 생긴 이유**: 이전 세션이 도메인 모델·앱 경계를 안 읽고 온체인 설계를 시작해
> (1) 익명 퍼널인 guest-web에 로그인을 붙이고 (2) 축의금을 단순 기록으로 가정하고
> (3) 미구현인 신뢰네트워크를 "전환" 대상으로 보고 (4) 활동 기록을 transfer 가능한 객체로 만드는
> 오해를 했다. 그 재발을 막기 위한 문서다. 실수 기록은 `07-LESSONS.md`.

---

## 읽는 순서 (반드시 위에서부터)

| 순서 | 문서 | 내용 |
|------|------|------|
| ★ | **`VISION-AND-INTENT.md`** | 프로젝트 오너의 원문 — "왜 Sui인가"의 원천. **가장 먼저.** |
| 0 | **`00-READ-FIRST.md`** | 코드 만지기 전 필독. 가장 오해하기 쉬운 것들. 작업 전 체크리스트. |
| 1 | `01-SERVICE-OVERVIEW.md` | 디방이 무슨 서비스인가 + 핵심 비전 "신뢰네트워크". |
| 2 | `02-APP-BOUNDARIES.md` | guest-web(익명 퍼널) vs dibang-wedding(로그인 본체) vs admin. |
| 3 | `03-IDENTITY-AND-AUTH.md` | 현재(Supabase) + 목표(zkLogin 대체). 익명/로그인 경계, 동의, claim, 마스킹. |
| 4 | `04-USER-JOURNEYS.md` | 모든 사용자 여정(현장 하객·라운지·호스트·초대·동의·장부·메모리·사진·디스플레이). |
| 5 | `05-IMPLEMENTED-VS-PLANNED.md` | **무엇이 실제 구현됐고 무엇이 선언만 됐는가**(Moi/Ium 등 미구현 = 그린필드). |
| 6 | `06-SUI-ONCHAIN-DIRECTION.md` | Sui 붙이는 방향 + 지금까지 만든 것 + 정정 + 결정. SBT 원칙. |
| 7 | `07-LESSONS.md` | 이전 세션의 실수와 교훈. |
| 8 | `08-TRUST-BALANCE-CREDIT-MODEL.md` | 상호작용 → 관계 신뢰 잔액 → 신용 → DeFi. **핵심 차별점.** |
| 9 | `09-HACKATHON-ALIGNMENT.md` | Sui Overflow 2026 Payment&DeFi 트랙 정렬(심사기준·제출요건). |

---

## 단일 원천(SSOT)과 원본 문서

이 핸드북은 **요약/해설**이고, 진실의 원천은 아래 원본이다. 충돌 시 **항상 원본 우선.**

- **`_onboarding/VISION-AND-INTENT.md` ← "왜/방향"의 원천** (프로젝트 오너 원문, 왜곡·압축 금지).
- **`_architecture/DOMAIN_MODEL_SUMMARY.md` ← "무엇"의 단일 진실 원천(SSOT).** 엔티티·불변식·관계·Use Case 최종 기준.
- `_architecture/APP_SCOPE.md` — 앱 경계 원본.
- `_architecture/API_ENDPOINT_MAP.md` — 엔드포인트 + 접근 정책 원본(R7).
- `_architecture/API_CONVENTIONS.md` — 인증·마스킹·에러 규약.
- `_scenario/*/SCENARIOS.md` — 기능별 구현 시나리오. **구현용이라 도메인 모델과 어긋난 부분이 있을 수 있음 → 도메인 모델 우선.**
- `_research/gathering-taxonomy-trust-balance/` — 신뢰 잔액·신용 모델 연구 원본(핵심 IP).
- `_code_convention/*` — 백엔드/프론트/테스트/DB/스토리지/env + 온체인(`SUI_MOVE.md`, `SUI_SDK.md`).

## 규칙·컨벤션

- 프로젝트 규칙: 루트 **`CLAUDE.md`** (글로벌 `~/.claude/CLAUDE.md`를 보완).
- 코드 컨벤션: **`_code_convention/`**.

## 지금까지의 온체인 산출물 (이미 빌드·검증·커밋됨, 단 SBT 정정 대상)

- `contracts/dibang_wedding/` — Move 컨트랙트 (testnet 배포). `.env.testnet.sui`에 패키지 ID.
- `packages/sui-sdk/` — `@gorae/sui-sdk` (PTB 빌더·조회·zkLogin·sponsor).
- `apps/api/server/*_zklogin*` — zkLogin Salt 서버.
- 프론트 `apps/guest-web`·`apps/dibang-wedding` — dApp Kit + ZkLoginProvider (빌드만, UI 미배선).

> ⚠️ 위 컨트랙트의 일부 기록 객체는 `key+store`(transfer 가능)로 만들어져 있어, VISION §4(활동 기록 =
> soulbound)에 맞춰 `key`-only 재작성 검토가 필요하다. 상세는 `06-SUI-ONCHAIN-DIRECTION.md` + `07-LESSONS.md`.
