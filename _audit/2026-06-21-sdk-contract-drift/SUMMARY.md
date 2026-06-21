# SDK 빌더 ↔ 컨트랙트 드리프트 감사 (2026-06-21)

## 결론(1줄)
SDK PTB 빌더 일부가 **컨트랙트에 더 이상 없는 함수**를 호출한다 → 그 빌더를 쓰는 앱 경로는 **실행 시 MoveAbort/타입오류**. 컨트랙트 측은 정상(아래 testnet 실증). **빌더+앱 호출부 정렬이 미완**(결정B가 rsvp 슬라이스만 처리)이 원인.

`moveTarget('mod','fn')`은 문자열이라 `tsc`가 못 잡는다(런타임에만 터짐) — 이 프로젝트의 반복 결함(C-Q1, wedding-builder)과 같은 부류.

## 드리프트 표

| SDK 빌더 | 호출 타깃(stale) | 컨트랙트 실제 | PII | 앱 호출부 | 영향 |
|---|---|---|---|---|---|
| `cash-gift.ts` `buildSendGiftTx` | `cash_gift::send_gift`(guestName·slot·relation) | **없음** — `give(vault, wedding, participation, coin, clock)` | 이름·관계 전달(결정#2 위반) | guest-web `useOnchainActions.sendCashGift` | 실행 시 abort(send_gift 부재) |
| `guestbook.ts` `buildWriteEntryTx` | `guestbook::write_entry`(loungeId·guestName·message) | **없음** — `write(wedding, participation, clock)` | 이름·본문 전달 | guest-web `useOnchainActions.writeGuestbook` | 실행 시 abort |
| `guestbook.ts` `buildClaimEntryTx` | `guestbook::claim_entry` | **없음**(GuestbookEntry 객체 자체 제거) | — | (test 하네스) | 실행 시 abort |
| `ium.ts` `buildCreateIumTx` | `ium::create_ium`(relationType·label) | **없음** — `request_ium(to_user, clock)`→`accept_ium(ev, req, clock)` | 관계라벨 전달 | dibang-wedding `useOnchainHostActions.createIum` | 실행 시 abort |
| `ium.ts` `buildRevokeIumTx` | `ium::revoke_ium` | **없음**(전역 IumRegistry 제거, revoke 개념 없음) | — | dibang-wedding `useOnchainHostActions.revokeIum` | 실행 시 abort |

## 이미 정렬된 빌더(정상)
- `wedding.ts` `buildCreateWeddingTx` — 익명 `create_wedding(clock)`→Cap (결정A 반영). ✓
- `rsvp.ts` `buildSubmitRsvpTx` — guest_name 제거 (결정B 슬라이스). ✓
- `cash-gift.ts` `buildCreateVaultTx`/`buildWithdrawTx`, `wedding.ts` `buildAddHostTx`, `moi.ts` 전부 — 컨트랙트와 일치. ✓

## 왜 발생했나
컨트랙트가 결정#2(PII 제거)·결정A(익명 Wedding)·send_gift→give 일원화·ium 리팩터(전역 레지스트리 제거, 매칭=request/accept)·guestbook write 슬림화로 바뀌는 동안, **SDK 빌더는 rsvp만 따라갔다**. 빌더는 문자열 타깃이라 빌드가 통과해 드리프트가 숨었다.

## 컨트랙트 측은 정상(실증)
`packages/sui-sdk/scripts/test-signals-testnet.ts`가 testnet 신규 배포 pkg에서 **올바른** 호출(`give`/`write`/`request_ium`/`accept_ium`)을 직접 moveCall로 실행 → 정상 동작 + SignalEmitted 발행 확인. 즉 **고칠 곳은 컨트랙트가 아니라 SDK 빌더 + 앱 호출부**다.

## 수정 레시피(흐름 변경 동반 — 블라인드 금지)
단순 rename이 아니다. 새 함수들은 **하객의 `Participation`을 인자로 요구**(참가-먼저)한다:
1. **give:** `buildGiveTx({vaultId, weddingId, participationId, amount})` → `give(vault, wedding, participation, coin=split, clock)`. PII 제거. 호출부(guest-web)는 하객이 먼저 `participate`로 GUEST Participation을 얻은 뒤 give. 영수증 객체 없음(반환은 ActionRecord id).
2. **write:** `buildWriteTx({weddingId, participationId})` → `write(wedding, participation, clock)`. 본문·이름은 오프체인(DB). claim_entry 제거.
3. **ium:** `buildRequestIumTx({toUser})` + `buildAcceptIumTx({eventId, requestId})` → request_ium/accept_ium. relationType·label은 오프체인. revoke 빌더 제거.
4. 앱 호출부(guest-web `useOnchainActions`, dibang-wedding `useOnchainHostActions`) 동반 수정 + `tsc`.
5. **주의:** guest-web 온체인 경계(§2)·전환기 DB-first 흐름에 닿으므로, **dev 서버 + dev-bypass로 흐름 검증**하며 진행(거짓 완료 방지). testnet 실호출 패턴은 test-signals-testnet.ts 참고.

## 진행 상황 (2026-06-21)
- **빌더 슬라이스 완료·testnet 실증:** `buildGiveTx`·`buildWriteTx`·`buildRequestIumTx`·`buildAcceptIumTx`(현행 컨트랙트 정합, PII 없음) 추가 + `test-signals-testnet.ts`가 이들을 써 실 testnet에서 4종 신호 발행·조회 검증(커밋 f0bd3a7). stale 빌더는 경고헤더로 유지(호출부 마이그레이션 전까지).
- **남음:** 앱 호출부 마이그레이션(아래 경계 충돌 결정 후).

## ★ 경계 충돌 발견 (app-caller 슬라이스의 선결 결정)
새 `give`/`write`는 **actor의 `Participation`(=온체인 신원)을 인자로 요구**한다(참가-먼저, 방향 위조 차단 C1). 그런데 **guest-web = 비로그인 익명 퍼널(§2 — 온체인 신원 안 붙임)**이라 guest-web의 `sendCashGift`/`writeGuestbook` 온체인 쓰기는 **in-place 마이그레이션 불가**(줄 Participation이 없음).
→ 선결 결정 필요(둘 중 1): **(A) 온체인 쓰기를 dibang-wedding(로그인 본체)으로 이동** — §2 정합, 권장. **(B) guest-web에 sponsored-익명 신원 부여** — §2와 충돌, 비권장.
이 결정 전엔 app-caller 슬라이스(특히 guest-web)를 진행하지 말 것.

### dibang-wedding ium도 단순 정렬 불가 (유저 대면 버그 + UX 재설계)
`NetworkPage.tsx`가 `useOnchainHostActions.createIum({toUser, relationType, label})`를 **실제 호출** → `ium::create_ium` 부재로 **런타임 abort(유저 대면 버그)**. 현행 컨트랙트 모델은 **2-step(request_ium→상대가 accept_ium) + relationType/label은 PII라 오프체인**. 즉 NetworkPage의 1-step+PII UI와 근본적으로 불일치 → **UX 재설계**(요청/수락 2단 흐름 + relationType/label 오프체인 저장 위치 결정 + 수락측 UI) 필요. 빌더(buildRequestIumTx/buildAcceptIumTx)는 준비됨. **UI 변경이라 dev 서버+dev-bypass+Playwright 검증 필수**(전역 규칙) → 헤드리스 블라인드 수정 금지.

## 후속
- 이 정렬은 #43(온체인 읽기/쓰기 이관)과 묶어, 앱 실행 검증 가능한 환경에서 도메인별로(give→write→ium) 슬라이스 진행 권장.
- 구 하네스 `test-testnet.ts`도 같은 드리프트(컴파일조차 안 됨 — buildCreateWeddingTx에 groomName 전달) → 정렬 시 함께 재작성/폐기.
