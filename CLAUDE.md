# CLAUDE.md — 디방-Sui 프로젝트 규칙

이 파일은 **전역 `~/.claude/CLAUDE.md`를 보완**한다(대체 아님 — 전역 규칙 §0~§7은 그대로 따른다).
디방 웨딩 서비스를 Sui 온체인(신뢰네트워크→신용→DeFi)으로 옮기는 이 저장소에만 적용되는 규칙이다.

> # ⚠️ 아키텍처 의도(SSOT) — 코드 읽기 전에 무조건 먼저
> - **신뢰·Wedding 데이터의 단일 진실원천(SSOT) = 온체인(Sui).** DB(Supabase/Go API)는 표시콘텐츠·캐시 **보조**다.
> - 현재 앱이 DB에서 읽는 건 **전환기(TRANSITIONAL)**일 뿐 — 이걸 보고 **"이 프로젝트는 DB 우선"이라 이해하면 틀린다.** (이전 세션이 정확히 그렇게 오해했다.)
> - **앱을 온체인(Sui RPC/indexer) 읽기로 이관하는 것은 명시적 목표(아직 미완)** — *할지 말지*가 아니라 *언제 끝내느냐*의 문제다.
> - 트러스트 데이터의 진실은 DB가 아니라 **온체인에서 확인**한다. (raw 신호·Event·Participation·신용은 전부 온체인 원천.)

---

## 0. [최우선] 코드 만지기 전 필독

설계·구현 시작 전 반드시 다음을 읽는다 (안 읽고 시작 금지 — 이전 세션이 그래서 헛다리 짚음, `_onboarding/07-LESSONS.md`):
1. `_onboarding/VISION-AND-INTENT.md` — "왜 Sui인가"의 원천(프로젝트 오너 원문).
2. `_onboarding/00-READ-FIRST.md` — 가장 오해하기 쉬운 것들 + 체크리스트.
3. `_architecture/DOMAIN_MODEL_SUMMARY.md` — "무엇"의 **단일 진실 원천(SSOT)**.
4. 작업 대상에 맞춰 `_onboarding/02-APP-BOUNDARIES.md`, `04-USER-JOURNEYS.md`, `05-IMPLEMENTED-VS-PLANNED.md`, `06-SUI-ONCHAIN-DIRECTION.md`, `08-TRUST-BALANCE-CREDIT-MODEL.md`.

## 1. SSOT 규칙
- **`_architecture/DOMAIN_MODEL_SUMMARY.md`가 도메인의 단일 원천.** `_scenario/*`는 구현용이라 어긋날 수
  있음 → **충돌 시 도메인 모델 우선.** "왜/방향"은 `_onboarding/VISION-AND-INTENT.md`가 원천.
- 추측 금지. 실제 문서·코드·온체인 상태로 확인(전역 §2).

## 2. 앱 경계 규칙 (절대 혼동 금지)
- **guest-web = 비로그인 익명 전환 퍼널.** 로그인/zkLogin/온체인 신원을 **여기 붙이지 않는다.**
- **dibang-wedding = 로그인 서비스 본체.** zkLogin·온체인 신원·신뢰네트워크(Moi/Ium)는 **여기.**
- **admin = 별도 운영 read-only.** 상세 `_onboarding/02-APP-BOUNDARIES.md`.

## 3. 온체인 작업 규칙
- **결정 대기 항목(`06` §F) 확정 전 큰 구현 착수 금지** — 사용자에게 확인.
- **활동·관계 기록은 SBT(`key`-only, transfer 불가).** 거래/선물 의도 자산만 `store`. (`06` §E, VISION §4)
- **온체인 = raw 액션 원장**(action_type·actor·target·event·resource). 신뢰 해석은 규칙으로 계산(저장 X). (`08`)
- **민감정보(이름 등) 온체인 평문 금지.** 신뢰 신호는 비민감 상호작용으로. (VISION §7)
- 돈/금융은 SUI로(추후 USDSui). (VISION §6)
- Move는 `~/.claude/skills/sui-dev-skills/` + `_code_convention/SUI_MOVE.md` 따르고 **TDD**(`sui move test` red→green).
  SDK/프론트는 `_code_convention/SUI_SDK.md` 따르고 `tsc --noEmit`. 가능하면 **testnet 실호출**로 검증.
- 온체인·보안 변경은 **독립 적대적 리뷰**로 검증(빌드/유닛이 못 잡는 결함 — 이미 CRITICAL 2건 발견 사례).

## 4. 구현 현황 인지
- **Moi·MoiItem·Ium·InteriorItem·GatherPlace는 오프체인 미구현(그린필드)** — "전환" 아님, 온체인 신규 구축. (`05`)
- 기존 zkLogin/프론트 태스크(C1~C12)는 "하객 zkLogin" 오류 전제 → `06` §G대로 재도출 후 진행.

## 5. 빌드·검증·커밋
- 코드 수정 후 **빌드·테스트 통과 확인 후 보고**(전역 §2-3). Move `sui move test`, Go `go build/test`, 프론트 `pnpm build`.
- UI 작업 완료 보고엔 **Playwright 스크린샷** 첨부(전역 규칙). 단 zkLogin 라이브 검증은 Google OAuth client +
  ZK prover 필요(헤드리스 불가) — 없으면 "자격증명 대기"로 명시(거짓 완료 보고 금지).
- 커밋·푸시는 **명시 지시 시에만.** 커밋 전 "커밋하겠습니다: [파일목록]" 발화.
- 브랜치/워크트리: 전역 §3-1·§3-2 따름(메인 체크아웃 임의 전환 금지).

## 6. 도구
- 패키지 매니저 **pnpm**(9.15.0), Move **sui CLI**, 백엔드 **go**. 탐색은 `rg`/`fd`, 코드그래프는 `codegraph`.
- 모노레포: `apps/*`(api·dibang-wedding·guest-web·…), `packages/*`(sui-sdk·contracts·…), `contracts/dibang_wedding`(Move).

## 7. 폴더 표준
- 전역 §6 표준 폴더(`_architecture`·`_audit`·`_research_*`·`_prototypes`·`_code_convention`·`_scenario`) 따름.
- 온보딩 핸드북은 `_onboarding/`(이 프로젝트 추가). 신뢰잔액 연구는 `_research/gathering-taxonomy-trust-balance/`.
