# 프론트엔드 전수 감사 — SUMMARY (2026-06-21)

> 범위: `apps/dibang-wedding`(+일부 guest-web). 4차원 점검 — ①xState 적용 ②흐름 논리/오류 ③컨트랙트 정합 ④모순.
> 방식: 횡단 2(xState 인벤토리·컨트랙트 정합)는 직접, 영역별 9는 조사 에이전트 병렬. 모든 발견 file:line 근거.
> ⚠️ 전제: 저장소가 **머지 진행 중 + 다른 세션(payment) 동시 편집** → 현재 디스크 상태 기준 스냅샷.

## 한 줄 결론

**앱이 지금 빌드되지 않고(타입에러 11건, tsc 확인), "온체인"이라 표시된 핵심 흐름(인연·샵·선물·신용)이 실제로는 거의 전부 mock이며, 대응 온체인 훅은 데드코드다.** 그 위에 최근 매트릭스 변경이 "미주입 시한폭탄"을 얹었다.

## 심각도 집계

| 심각도 | 건수 | 대표 |
|---|---|---|
| CRITICAL | 3 | 빌드 깨짐 · 인연 전체 mock · 샵/선물/모이 전체 mock |
| HIGH | 7 | 매트릭스 미주입 throw · zkLogin real로그인 끊김 · 신용 미배선 · resource_id 미사용 · Edit 무손실저장 · 공유사진 부분실패 은폐 · Sui충전 mock |
| MED | ~12 | dual-write 누수 · 전파 이중구현 · 설정토글 롤백부재 · addHost/withdraw 게이트 어긋남 · 공통머신 우회 등 |
| LOW/정리 | 다수 | orphan 머신 2 · placeholder · 테스트 부재 등 |

## 🔴 CRITICAL (3)

1. **빌드 불가 — tsc 11 에러.** (직접 확인)
   - `lib/loungeV2Feed.ts:106` `WARMTH_STEPS` import 누락 (TS2552) → `MoiGatherPage`까지 영향.
   - `pages/MyWeddingPage.tsx:122-123` `WeddingSummary`에 없는 `sui_wedding_id`/`sui_vault_id` 접근 (TS2339×3) → 출금·공동혼주 기능 통째 비활성.
   - `machines/{addHost,moiGate,onchainTx}.machine.test.ts` `fromPromise(throw-only)` 반환 `never`↔actor `string` (TS2322×3).
   - → 머지 미해결 artifact. `pnpm build`(`tsc -b && vite build`) 실패 상태.
2. **인연(이음) 전체 mock.** `inyeon.machine.ts:90` `sendIeum`=setTimeout, 상대가 mock 숫자 id(`components/inyeon/data.ts`)라 실 Sui 주소·`accept_ium`용 eventId/requestId가 원천 부재. "이음=온체인 ium"이라는 SSOT 주장과 정면 모순. 인연 흐름 전체에 address/zkLogin 0건.
3. **샵/선물/모이 전체 mock.** `purchaseItem`·`equipItem`·`unequipItem`·`buildGiftTx` 모두 데드코드(UI 호출 0). `gift.machine`/`moiPlaza.machine`은 setTimeout mock. createMoi 게이트(인연에만)와 mock 경제가 단절. **요네 지갑이 광장(300)·선물(500)로 분열**되고 "Sui 충전"이 어느 쪽도 안 늘리는 경로 존재.

## 🟠 HIGH (7)

4. **매트릭스 미주입 시한폭탄.** `ZkLoginProvider.tsx:36` `configureSui`가 network·packageId만 주입, `csMatrixId`/`emMoneyMatrixId` 미주입 → `buildInvite/Gift/AcceptIum/Give/Participate/Write` 빌더가 `requireMatrixId` throw. **지금은 그 흐름들이 mock/주석이라 안 터질 뿐**, 배선 즉시 전 흐름 throw. (최근 매트릭스 변경의 미배선.)
5. **zkLogin "real 로그인" 끊김.** `ZkLoginProvider.login`/`completeLoginFromUrl` 미호출 + `AuthCallbackPage`가 `id_token` 미처리 → 작동 경로는 dev 키페어뿐. + 세션 만료(maxEpoch) 미검증(만료 세션도 인증됨, 트잭 실패 시점에야 드러남).
6. **신용 읽기 미배선.** `useCredit`/`useWalletCredit`/`signalBreakdownFor` 호출처 0 → 온체인→신용 파이프라인은 완성됐는데 화면에 신용이 안 보임.
7. **`resource_id` 받기만 하고 미사용.** `credit.ts:fold`가 `kind`로만 분기, `resource_id` 무시 → 두 번째 EM 자원 추가 시 "환산 불가 자원 합산" 버그(설계 금지). 지금은 돈 하나라 잠복.
8. **청첩장 Edit 디자인-only 변경 무손실 저장.** `useUpdateWedding.ts:23` `hasInvitationData`에 `design_config`·`cover_text_config` 누락 → 디자인/캔버스/커버텍스트만 바꾸면 `updateInvitation` 미호출인데 성공 처리. 생성 경로와 비대칭.
9. **공유사진 부분실패가 "성공"으로 둔갑 + 100장 가드 우회.** `sharePhotoUpload`: 실패분 버리고 done, `existingCount`가 input 1회 주입이라 재진입 시 옛 카운트로 가드 무력.
10. **`YoneChargeSheet` "Sui 충전" mock인데 실거래 UI.** 하드코딩 가짜 주소, "네트워크 처리 중" 표기, SUI 0원 차감. (하단 "데모" 고지는 있음.)

## 가장 큰 횡단 주제 (모순)

- **A. mock↔real 단절이 압도적.** 인연·샵·선물·신용·라운지 "온기"가 전부 mock 또는 DB 파생인데 카피·주석은 "온체인/신뢰 attestation"으로 단언. 온체인 훅은 정의만 있고 UI가 안 부름.
- **B. 온체인 배선의 단일 설정 공백.** `configureSui`가 매트릭스 ID를 안 받음 → 모든 신뢰그래프 쓰기 경로가 throw 대기. + dual-write 부분성공 누수(온체인 발행 후 DB null, idempotency 없음).
- **C. xState 적용은 양호하나 공통화 미흡.** 머신 커버리지 높음. 단 orphan 2(`invitationCreate.design`,`uploadItem` 설계용), `DmPage` 머신없음, 온체인 flow 머신 5종 파편화(`onchainTxMachine`은 Withdraw 1곳만).

## 권고 순서 (수정 착수 시)

1. **빌드 복구**(CRITICAL 1) — import 1줄·타입 3곳·테스트 actor 타입. 머지 충돌 잔재 정리.
2. **매트릭스 config 주입 경로**(HIGH 4) — bootstrap ID를 env→configureSui. (payment 세션과 SDK 충돌 조율 필요.)
3. **mock↔real 경계 명문화**(CRITICAL 2·3, 주제 A) — "이건 mock" 표식 일원화 + 온체인 배선 로드맵. (큰 결정 — 착수 전 합의.)
4. 나머지 HIGH/MED는 영역별 findings.md 참조.

상세: 같은 폴더 `findings.md`.
