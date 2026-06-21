# 온체인 배선 감사 — 컨트랙트→hook→UI "끝까지 연결" 현황 (2026-06-21)

> **방법(이전 보고 정정)**: "코드가 있네" 수준이 아니라 체인 바닥(`ZkLoginProvider.executeOnchain`)까지 추적해
> ① 중간에 mock이 끼는지 ② 실제 제출까지 가는지 ③ 어떤 게이트에서 멈추는지를 확인했다.
> **검증 한계**: 코드 경로 완결 ≠ 라이브 실행 검증. zkLogin 라이브는 Google OAuth client+ZK prover 필요(헤드리스 불가, CLAUDE §5) — 본 감사는 **코드 경로 + 게이트 조건**까지이고 실제 testnet 실행은 자격증명 대기.

## 1. 정정: `purchase_item` SUI 결제 게이트 미구현은 "후순위"가 아니라 **인지된 시빌 결함**
- `moi::mint_item(name,item_type,slot,ctx)` — **결제 인자 없음·`public`·무료·무게이트**(moi.move:90). 누구나 무한 발행.
- `gift::gift`가 MoiItem 이전 + **GIFT(CS 유대) 신호** 생성 → **무료 아이템 상호 선물로 신뢰 신호 공짜 농사(gift-CS 시빌 파밍)**.
- 설계가 이를 명시적 시빌 벡터로 규정, **결정#6(06-21)**에서 "무료발행 폐기 → `purchase_item(payment: Coin<SUI>)` 게이트 + `mint_item` 봉인"으로 **수정 확정**. 현재 **"기록만(구현 아님)"**.
- **정정된 분류**: DeFi대출·YONE·feed 같은 순수 후순위와 **다르다.** 이건 *인지된 결함 + 수정 결정 완료 + 미구현*.
- **조건부 보류**: 현 단계(testnet·DeFi 미구현)에선 의식적 수용 — ① 시빌 1차 필터가 오프체인 Φ(전파·할인)라는 설계(§8) ② 시빌이 돈 되는 지점(신용→무담보 대출)이 미구축. **신용→대출이 켜지는 순간 Critical(하중 결함)로 승격.**

## 2. 컨트랙트(Move) — 설계/구현
- 11모듈 ~26함수 **전부 구현**, `sui move test` 56개 통과. 척추(ledger·event·signal)+신호셋(웨딩·인연) 완성. SBT 정정(GuestbookEntry·CashGiftRecord·Ium → key-only) 완료.
- **안 됨**: DeFi 대출/상환(결정#12 보류), `purchase_item` 게이트(§1, TODO), YONE·feed·익명claim·3자+순환wash(후순위). ⚠️ `WeddingCap`=`key+store`(권한토큰 transfer 가능) 위험도 검토 대기.

## 3. SDK 빌더 + React hook
- SDK 빌더 13 / 호스트 hook(`useOnchainHostActions`) 액션 10 + guest-web `submitRsvp`.
- **끊긴 곳**:
  - 🔴 `wedding::invite` — Move엔 있으나 **SDK 빌더·hook 둘 다 없음**(초대 CS 신호 경로 미연결).
  - 🟡 `cash_gift::give`·`guestbook::write` — **SDK 빌더는 있으나 hook 래퍼 없음**. 현재 축의/방명록은 온체인 아닌 **Go API/Supabase 경유**(전환기).

## 4. 끝까지 연결 — 실제 종단 검증 (정정본)

### 체인 바닥(`executeOnchain`)의 실제 동작 (mock 아님, 진짜 제출)
2갈래 + 하드 게이트(ZkLoginProvider.tsx:161-199):
- **dev 경로**: `VITE_DEV_PRIVATE_KEY` 있고 devLogin 시 → keypair 직접 서명 `executeAndAssert` 제출(가스 있는 지갑 필요). devLogin 버튼은 `import.meta.env.DEV` 한정.
- **zkLogin 경로**: `session`(Google OAuth, `VITE_GOOGLE_CLIENT_ID`) + `proofInputs`(`VITE_ZK_PROVER_URL` 실행 prover) + `VITE_SALT_SERVER_URL` + `VITE_SPONSOR_URL` **전부** 있어야 `sponsoredExecute` 제출. **하나라도 없으면 제출 전에 throw.**

### 경로별 종단 상태
| UI 경로 | 체인 | 종단 진실 |
|---|---|---|
| createWedding+createVault (InvitationCreate→useSaveInvitation) | 실(mock 없음) | **best-effort·비차단**: `isAuthenticated`일 때만 실행, 실패는 try/catch로 삼켜 `sui_id=null`(useSaveInvitation:52-78). 미인증/자격증명 없으면 **Supabase만 생성, 온체인 안 감.** |
| createMoi (NetworkPage 버튼) | 실(mock 없음) | ⚠️ **NetworkPage(/network)는 실제 서비스 화면이 아니라 dev 스캐폴드**(이전 세션 임의 생성). 제품상 미연결 — Moi 생성의 진짜 자리는 온보딩/프로필. |
| requestIum (NetworkPage 폼) | 실(mock 없음) | ⚠️ **dev 스캐폴드(NetworkPage)에만 붙어 있음.** 진짜 인연 화면 InyeonPage(/inyeon)는 `inyeonMachine`의 **mock `sendIeum`**을 씀 → 제품상 request_ium 미연결. (NetworkPage는 폐기 대상, 태스크 #24) |
| **acceptIum** | hook 실재 | 🔴 **UI 없음**(이음 *수락* 화면 미배선 → 2단계 합의가 UI에선 미완성). |
| addHost / withdraw / mintItem / equipItem / unequipItem | hook 실재 | 🔴 **UI 없음**(호출 화면 미구현). mintItem은 §1 게이트 이슈도 겹침. |

### Mock(온체인 아님) 머신 — UI는 있으나 가짜
| 머신/화면 | 상태 |
|---|---|
| inyeonMachine (InyeonPage) | 🟡 mock `sendIeum` actor — 온체인 호출 0 (requestIum은 NetworkPage에서만, acceptIum 미배선). |
| moiPlazaMachine (MoiGatherPage 샵) | 🟡 mock `buyItem` — 요네/로컬만, "buildPurchaseItemTx로 교체" 주석(§1과 연결). |
| giftMachine (ChatScreen 선물) | 🟡 mock `sendGift` — 온체인 적립 TODO. |
| liveCelebrationMachine (라운지) | 🟡 타이머 순환만, 온체인 무관. |

## 5. 한 줄 결론 (정정 2)
- Move(설계·테스트) 거의 완성 → SDK/hook은 invite·give·write가 비거나 끊김 → **실제 제품 화면까지 온체인이 도달하는 건 웨딩생성·createVault(InvitationCreate)·submitRsvp(guest-web InvitationPage) 뿐**. 그조차 best-effort·자격증명 게이트(zkLogin 또는 dev keypair)에 묶여 라이브 실행은 미검증.
- ⚠️ **createMoi·requestIum은 "연결됨"이 아님 — dev 스캐폴드 NetworkPage(/network)에만 붙어 있고 실제 인연 화면(InyeonPage)은 mock.** 이전 보고에서 NetworkPage를 실제 화면으로 오인했던 것을 정정.
- 가장 큰 공백: ① **인연(request/accept_ium)이 진짜 화면 InyeonPage에 미배선**(mock sendIeum, 2단계 합의 미완) ② 상점/선물 온체인 mock ③ `mint_item` 무게이트(시빌 결함, 결정#6 미구현) ④ `wedding::invite` SDK/hook 부재.

## 6. 검증 근거(파일:라인)
- moi.move:90 (mint_item 무게이트), gift.move:23 (gift→신호), MASTER_DIRECTIVE.md:81·88, SUI_CONTRACT_DESIGN_DIRECTION.md:§8·결정#6
- useOnchainHostActions.ts:34-108, ZkLoginProvider.tsx:161-199 (executeOnchain 2경로·게이트), useSaveInvitation.ts:48-79 (best-effort dual-write), NetworkPage.tsx:16·31-52·66
