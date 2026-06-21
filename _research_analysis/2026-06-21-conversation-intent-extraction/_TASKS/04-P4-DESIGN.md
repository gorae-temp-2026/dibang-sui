# P4 설계 — 4차 가공 (현 프로젝트 문서·코드 중요부 덧붙이기)

> 규칙(헌장 §2-2): pass3를 **건드리지 않고**, 관련 위치에 현 dibang-sui 문서·코드의 중요부를 **덧붙인다**. 압축요약 아님. 분량은 더 방대해진다. 덧붙인 내용엔 **출처 파일경로**를 명시.

## 입력
- `03-extract-pass3/` (P3.V 통과본) — 의도의 정제된 핵심.
- 현 프로젝트 문서·코드(아래 소스).

## 출처 소스
**문서 (P4.DOC.*)**
- `_onboarding/` 12개: VISION-AND-INTENT, 00-READ-FIRST, 01-SERVICE-OVERVIEW, 02-APP-BOUNDARIES, 03-IDENTITY-AND-AUTH, 04-USER-JOURNEYS, 05-IMPLEMENTED-VS-PLANNED, 06-SUI-ONCHAIN-DIRECTION, 07-LESSONS, 08-TRUST-BALANCE-CREDIT-MODEL, 09-HACKATHON-ALIGNMENT, INDEX
- `_architecture/` (DOMAIN_MODEL_SUMMARY 등 SSOT)
- `_scenario/`, `_code_convention/`, `_research/`
- `CLAUDE.md`(전역+프로젝트)

**코드 (P4.CODE.*)**
- `contracts/dibang_wedding`(Move)
- `apps/api`(Go)
- `apps/dibang-wedding`, `apps/guest-web`
- `packages/*`(sui-sdk·contracts 등)

## 처리 방식
1. **P4.DOC.{area}** — 문서영역별 서브에이전트가 "온보딩에 중요한 사실/결정/제약"을 출처경로와 함께 추출.
2. **P4.CODE.{subsystem}** — 코드 서브시스템별로 핵심 구조·계약·엔트리포인트를 파일:라인과 함께 추출.
3. **P4.MERGE.{cluster}** — 추출 중요부를 pass3의 맞는 위치(주제 클러스터)에 **덧붙임**. pass3 원문 보존.

## 자원
- 문서영역 ~6 + 코드 서브시스템 ~5 + 머지 ~클러스터수. medium~high effort.
- pass3가 세션 단위이므로, 머지 전에 주제 클러스터로 재배열할지(원래 P3.CLUSTER) 여부는 P3 완료 후 규모 보고 결정.

## 검증 게이트 P4.V
- 분량이 pass3보다 증가(덧붙임 확인).
- 덧붙인 모든 블록에 출처 경로 존재.
- pass3 원문 블록이 그대로 존재(뼈대 보존) — substring 대조.

## 상태
- P3 완료·검증(P3.V) 후 착수. 현재 P3 진행 중이라 **대기**.
