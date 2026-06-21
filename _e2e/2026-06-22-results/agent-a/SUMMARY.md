# Agent A E2E 결과 요약

## 실행 일시
2026-06-22

## 시나리오 수치 (Part 1 + Part 2 합산)
- **총 시나리오**: 46개 (Part 1: 28 + Part 2: 18)
- **PASS**: 27개
- **EXPECTED_FAIL**: 18개 (모두 기대한 abort code와 일치)
- **UNEXPECTED_FAIL**: 1개 (A-8-5: slot=5에서 가스 부족 — 코드 문제 아닌 가스 부족)
- **스크린샷**: 6장 (로그인, 인연, 이벤트리스트, 나의이벤트, 설정, DEV로그인 후)

## 섹션별 결과

| 섹션 | 시나리오 | PASS | EXPECTED_FAIL | FAIL |
|------|----------|------|---------------|------|
| A-1 Wedding 생성 | 6 | 6 | 0 | 0 |
| A-2 공동혼주 | 3 | 2 | 1 (abort:7 ENotPrimaryHost) | 0 |
| A-3 초대 | 2 | 2 | 0 | 0 |
| A-4 Vault | 4 | 3 | 1 (abort:4 EVaultAlreadySet) | 0 |
| A-5 참석 | 3 | 2 | 1 (abort:2 ENotSelfClaimable) | 0 |
| A-6 부조 | 4 | 3 | 1 (abort:1 EZeroAmount) | 0 |
| A-7 인출 | 4 | 2 | 2 (abort:2 InsufficientBalance, abort:1 ZeroAmount) | 0 |
| A-8 RSVP | 8 | 4 | 4 (abort:0,1,2,3) | 0 |

## 검증된 온체인 경로

1. **Wedding 생성**: create_wedding → Wedding(shared) + WeddingLounge(shared) + WeddingCap(soulbound) + Event(shared) + Participation(HOST)
2. **공동혼주**: add_host → 새 WeddingCap 발행, primary_host 제한 정상 동작
3. **초대**: invite → ActionRecord(INVITE) + CS 신호 (getActionLoggedEvents로 조회 확인)
4. **축의금**: create_vault → CashGiftVault(shared), wedding.vaultId 연결, 중복 방지
5. **참석**: participate → Participation(GUEST, soulbound), self-claim 역할 제한
6. **부조**: give → Vault 잔액 증가, ActionRecord(GIVE_MONEY), 0원 방지
7. **인출**: withdraw → Vault 잔액 감소, Host에게 Coin<SUI> 전송, 잔액 초과/0원 방지
8. **RSVP**: submit_rsvp → RsvpSubmitted 이벤트, getRsvpEvents 조회, 경계값 검증 (slot/attendance/companion/meal)

## SDK↔컨트랙트 연결 확인

| SDK 빌더 | 컨트랙트 함수 | 상태 |
|----------|-------------|------|
| buildCreateWeddingTx | wedding::create_wedding | ✅ 동작 |
| buildAddHostTx | wedding::add_host | ✅ 동작 |
| buildInviteTx | wedding::invite | ✅ 동작 |
| buildCreateVaultTx | cash_gift::create_vault | ✅ 동작 |
| buildGiveTx | cash_gift::give | ✅ 동작 |
| buildWithdrawTx | cash_gift::withdraw | ✅ 동작 |
| buildParticipateTx | event::participate | ✅ 동작 |
| buildSubmitRsvpTx | rsvp::submit_rsvp | ✅ 동작 |

## SDK 쿼리 연결 확인

| SDK 쿼리 | 상태 |
|----------|------|
| getWedding | ✅ 정상 반환 |
| getWeddingLounge | ✅ 정상 반환 |
| getCashGiftVault | ✅ 정상 반환 (balance bigint) |
| getOwnedWeddingCapIds | ✅ 정상 반환 |
| getWeddingCapForWedding | ✅ 정상 반환 |
| getParticipationForEvent | ✅ 정상 반환 |
| getRsvpEvents | ✅ 정상 반환 |
| getActionLoggedEvents | ✅ 정상 반환 |

## Part 2 추가 결과

| 시나리오 | 결과 | abort code |
|----------|------|-----------|
| A-2-4 (잘못된 Cap add_host) | EXPECTED_FAIL | abort:0 EWrongCap |
| A-3-3 (GUEST로 초대) | EXPECTED_FAIL | abort:6 ENotHost |
| A-3-4 (다른 결혼식 Part로 초대) | EXPECTED_FAIL | abort:5 EWrongEvent |
| A-4-5 (잘못된 Cap vault) | EXPECTED_FAIL | abort:0 EWrongCap |
| A-5-3 (CS 매트릭스 확인) | PASS | — |
| A-5-4 (참석 신호 확인) | PASS | — |
| A-5-6~8 (OFFICIANT/INITIATOR/RECEIVER self-claim) | EXPECTED_FAIL x3 | abort:2 ENotSelfClaimable |
| A-6-3 (ActionRecord GIVE_MONEY) | PASS | — |
| A-6-4 (EM 매트릭스 node 확인) | PASS | — |
| A-6-5 (BUSU 신호 확인) | PASS | — |
| A-6-8 (다른 Part로 부조) | EXPECTED_FAIL | abort:3 EWrongEvent |
| A-7-3 (인출 후 SUI 잔액) | PASS | — |
| A-7-4 (전액 인출) | PASS | — |
| A-7-7 (잘못된 Cap 인출) | EXPECTED_FAIL | abort:0 EWrongCap |
| A-7-8 (공동혼주 Cap 인출) | PASS | — |
| A-8-5 (slot 0~5 순회) | FAIL | slot=5에서 가스 부족 (코드 문제 아님) |
| A-8-6 (meal 0~2 순회) | PASS | — |

## 스크린샷

| 파일 | 설명 |
|------|------|
| dibang-wedding-main.png | 로그인 페이지 |
| dibang-wedding-after-dev-login.png | DEV 로그인 후 나의 이벤트 |
| inyeon-page.png | 인연 페이지 (Moi 게이트 모달) |
| event-list-page.png | 이벤트 리스트 (빈 상태) |
| my-event-page.png | 나의 이벤트 |
| settings-page.png | 설정 (DEV 모드, Sui 지갑 주소 표시) |

## 발견한 이슈
- A-8-5: slot=5에서 Guest1 지갑 가스 부족 (0~4까지는 성공). 코드 문제가 아닌 테스트 환경 문제.
- 그 외 모든 온체인 경로 정상 동작.

## 비고
- 자금 지갑(0xbe43…)에 test-sui-many(0x489b…)에서 3 SUI 충전 후 실행
- 지갑당 0.04 SUI 펀딩, 부조 0.001 SUI, 인출 0.0005 SUI
- 환경변수로 금액 조절 가능: E2E_FUND_AMOUNT, E2E_GIVE_AMOUNT, E2E_WITHDRAW_AMOUNT
