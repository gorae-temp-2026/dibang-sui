# 07 — 교훈 (이전 세션의 실수 — 반복 금지)

> ⚠️ **[앱 경계 변경 2026-06-21]** guest-web의 "비로그인 익명·zkLogin 금지"는 **폐기**됐다. 이제 **guest-web도 zkLogin으로 서명해 온체인 트랜잭션을 직접 날린다** (게스트가 본인 지갑으로 give/write/rsvp 서명 → 익명 기록·서비스 대리서명·claim 메커니즘 불필요). 아래 본문의 "비로그인/익명 퍼널/대리서명/claim/zkLogin 금지" 서술은 이 결정으로 **무효**. SSOT: `CLAUDE.md §2`.


> 이전 세션이 도메인 모델·앱 경계·비전을 **안 읽고** 온체인 설계를 시작해 여러 오해를 했다. 솔직히 남긴다.
> 핵심 교훈: **코드 만지기 전 `VISION-AND-INTENT.md` + `_architecture/DOMAIN_MODEL_SUMMARY.md`(SSOT) +
> `02-APP-BOUNDARIES.md`를 먼저 읽어라.**

---

## L1 — 문서를 안 읽고 설계를 시작했다 (근본 원인)
- **무엇**: 도메인 모델/시나리오/비전을 안 읽은 채 Move 컨트랙트·SDK·zkLogin을 구현했다.
- **결과**: 아래 L2~L5의 오해들. 코드는 빌드·테스트가 됐지만 **서비스 의도와 어긋난 전제** 위에 세워졌다.
- **교훈**: "빌드 통과 = 맞다"가 아니다. 의도 정합이 먼저. 큰 구현 전 SSOT부터.

## L2 — 익명 퍼널(guest-web)에 로그인을 붙였다 ⚠️[2026-06-21 반전: 이제 그게 맞는 방향이 됨]
- **무엇**: guest-web에 zkLogin 로그인 Provider/훅을 넣고 "하객이 로그인해서 온체인에 쓴다"고 가정.
- **사실(2026-06-21 변경)**: ~~guest-web은 비로그인 익명 전환 퍼널~~ → **이제 guest-web도 zkLogin 서명으로
  게스트가 본인 지갑에서 직접 온체인에 쓴다(익명 기록·대리서명·claim 폐기).** 당시 규칙("비로그인 익명")에선
  실수였으나, 규칙 자체가 바뀌어 지금은 의도된 방향이다.
- **교훈(여전히 유효)**: 어느 앱에 작업하는지 먼저 확인하되 — **경계 규칙은 변한다.** 최신 SSOT는 `CLAUDE.md §2`.

## L3 — 활동 기록을 transfer 가능한 객체로 만들었다 (SBT 위반)
- **무엇**: GuestbookEntry·CashGiftRecord·MoiItem·Ium을 `key + store`(public_transfer 가능)로 작성. (단 **MoiItem은 선물·거래 의도 자산**이라 `06 §E`에서 `store` 유지로 결정 — SBT 위반 정정 대상은 GuestbookEntry·CashGiftRecord·Ium 3개.)
- **사실**: VISION §4 — **활동 기록은 신용평가 무결성을 위해 transfer 불가(SBT, key-only)** 여야 한다. 기록이
  다른 지갑으로 옮겨지면 신뢰/신용이 거래·세탁될 수 있다.
- **교훈**: 기록(전송 불가) vs 자산(거래 의도) 구분. 활동 기록은 `key`-only. (정정 계획: `06`·D15.)

## L4 — 신뢰네트워크(Moi/Ium)를 "전환" 대상으로 봤다
- **무엇**: Moi/Ium을 "오프체인을 온체인으로 옮기는 마이그레이션"으로 취급.
- **사실**: Moi·MoiItem·Ium·InteriorItem·GatherPlace는 **오프체인에 미구현**(계약 deprecated·백엔드 501·프론트
  없음, `05-IMPLEMENTED-VS-PLANNED.md`). → **그린필드로 온체인에 새로 짓는 것.** 이번 해커톤의 핵심.
- **교훈**: "전환"인지 "신규 구축"인지 구현 현황(05)으로 확인.

## L5 — 축의금을 단순 기록/오프체인 결제로 가정 (양방향 오류)
- **무엇**: 처음엔 CashGiftVault(온체인 잔액)로 만들었다가, 도메인만 보고 "외부송금+기록만"으로 정정 제안.
- **사실**: VISION §6 — **모든 송금·금융 행위는 SUI로 온체인** 진행(추후 USDSui). "기록만"이 아니다.
  **→ 최종 결론: 돈을 온체인으로 옮기는 vault/온체인 결제 방향이 맞다.** (중간에 "기록만"으로 정정했던 건 오류였음.)
- **교훈**: 돈 흐름은 비전(VISION)에서 확정. 도메인 모델(현재 구현)만으로 미래 방향을 단정하지 마라.

## L6 — (프로세스) 허락 없이 실행을 시작했다
- **무엇**: 문서 구축 첫 태스크(D1)를 사용자 승인 없이 실행 착수.
- **교훈**: 글로벌 CLAUDE.md §0·§3 — 명시 지시 전엔 대기. 이해가 부족하면 **질문**하고, 답을 태스크에 반영한 뒤 실행.

## L7 — (설계/검증) 모듈 단위 테스트가 다 통과해도 *모듈을 잇는 발행 계약*은 안 잡힌다 (2026-06-21)
- **무엇**: credit.ts가 인연 매칭 CS를 ActionLogged의 ACCEPT_IUM에서 기대했는데, ium.move는 §3-F대로 ledger를 안 불러 그 이벤트가 영영 안 생김 → 인연→신용 파이프라인이 **빌드·유닛테스트 다 초록인 채 조용히 끊겨 있었다.** 개별 증분 리뷰(ium OK / credit OK)도 각자 통과해 못 잡음.
- **교훈**: cross-module 통합 결함은 per-increment 검증으로 안 잡힌다 → ①주기적 **전체 as-built 통합 적대 리뷰**(모듈 잇는 계약 점검) ②**cross-module e2e 테스트**(한 흐름이 여러 모듈 관통)가 구조적 방어. **발행 계약**(어떤 action이 어느 event로 emit되나 — 인연·참석은 ActionLogged 아닌 Participated)을 코드에 명문화(ledger.move).

## L8 — (보안/경제) 신호의 무결성은 그 신호를 만드는 행위의 *비용/희소성*에 직결된다 (2026-06-21)
- **무엇**: moi::mint_item이 현재 무료·무게이트(public) → 무한 MoiItem 발행 + gift(GIFT=CS 신호) = CS 시빌 농사 가능. 샵 경제(구매=비용, §3-G)가 그린필드라 mint가 placeholder.
- **교훈**: "선물=신뢰 신호"는 선물에 *비용*이 있어야 의미 있다(공짜 선물은 농사). 샵이 발행을 비용으로 게이트하기 전까지 gift-CS는 할인/보류. 부조(실제 SUI)·매칭(양자 합의)이 강한 신호인 이유도 비용/합의가 있어서다.

---

## 검증이 잡아낸 "좋은 사례" (검증의 가치 — 계속할 것)
- **testnet 스모크**가 `Moi` key-only를 PTB `transferObjects`로 못 옮기는 `InvalidTransferObject`를 잡아냄
  → 설계 정정(recipient 인자 내부 transfer). (역설적으로 SBT 방향과 정합.)
- **독립 보안 감사(Opus)** 가 sponsor의 **가스 코인 탈취**(MoveCall 없이 `splitCoins(gas)+transfer`)와
  **aud 검증 우회**(fail-open) 두 CRITICAL을 잡아냄 → 화이트리스트·fail-closed로 수정.
- **전체 통합 적대 리뷰(Opus)** 가 인연→신용 단절(credit ACCEPT_IUM dead 분기, §3-F와 모순)을 잡아냄 — 개별 증분 14회가 다 통과한 cross-cutting 결함. → Participated 도출로 수정 + Move/TS e2e 테스트로 방어(L7).
- **교훈**: testnet 실호출 + 독립 적대적 리뷰(증분별 + 주기적 전체)는 빌드/유닛테스트가 못 잡는 결함을 잡는다. 온체인·보안 작업엔 필수.

---

## 다음 세션이 첫 행동 전 할 일 (체크리스트)
1. `VISION-AND-INTENT.md` → `00-READ-FIRST.md` → `_architecture/DOMAIN_MODEL_SUMMARY.md` 읽기.
2. 작업 대상 앱을 `02-APP-BOUNDARIES.md`로 확인(익명 퍼널 vs 로그인 본체).
3. 온체인이면 `06-SUI-ONCHAIN-DIRECTION.md`의 "결정 대기" 확정 여부 확인 + `08` 모델 이해 + SBT(key-only) 적용.
4. 큰 구현 전 사용자 의도 재확인.
