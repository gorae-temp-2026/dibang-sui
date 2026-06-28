# E2E 테스트 시나리오 — 코드 구현 상태 기반

> 대상: https://dibang-sui.onrender.com (dibang-wedding), https://dibang-sui-guest-web.onrender.com (guest-web)
> 테스트 계정: guboc11@gmail.com (zkLogin, 0x46e7…c0bb)
> 작성일: 2026-06-28
> 코드 분석(4개 에이전트 병렬 탐색) 기반. 각 항목에 데이터 소스·연결 상태·발견된 문제 명시.

---

## 1. 이음 수락 (Accept Ieum)

**코드 위치:** InyeonPage.tsx:161~174
**데이터 흐름:**
- incoming 목록 ← `useDiscoverUsers` → `getIumRequestedEvents` + `getOwnedIumRequests` (온체인 RPC)
- Accept 클릭 → `acceptIum({ eventId, requestId })` → `buildAcceptIumTx` → `executeOnchain` (zkLogin 서명)
- 머신 `ACCEPT_REQ`는 로컬 상태만. 온체인 호출은 **페이지 핸들러에서** 실행.
- 성공 후 → `send({ type: 'ACCEPT_REQ' })` + `refetchDiscover()`
- 실패 시 → `console.error` 출력

**⚠️ 가스 주의:** "sponsor 가스 대납" 주석이 있지만 실제 `executeOnchain` 코드엔 sponsor 없음 — **유저 본인 SUI가 가스 지불**(ZkLoginProvider:230~244). 1차 로그 역산 기준 건당 약 0.26 SUI. 현재 잔액 ~0.41 SUI로 1건만 가능.

**테스트:**
- [ ] Received 탭에 이음 요청 카드 표시 (21건)
- [ ] Accept 클릭 → **TX가 실제 발사**되는가 (DevTools Network에서 sui RPC 확인)
- [ ] TX 성공 → Received에서 카드 사라짐
- [ ] TX 실패 → console.error 표시 (에러 삼키지 않음)
- [ ] 잔액 부족 시 TX 실패 + 에러 메시지

---

## 2. 이음 신청 (Request Ieum)

**코드 위치:** InyeonPage.tsx:54~59
**구조:** 머신 `sendIeum` 기본 actor는 **mock(`setTimeout`)**. InyeonPage가 `.provide()`로 온체인 호출을 **덮어씀** — 페이지에서 실행해야만 온체인 동작.
- `requestIum({ toUser: suiAddress })` → `buildRequestIumTx` → `executeOnchain`
- suiAddress 없으면 TX 안 나감

**테스트:**
- [ ] Universe에서 이음 신청 → TX 발사 확인
- [ ] 신청 후 sentPending 오버레이 표시

---

## 3. DM (쪽지)

**코드 위치:** useNotes.ts, InyeonPage.tsx:235~239
**데이터 흐름:**
- 머신 `SEND_DM`은 **로컬 낙관적 append만**
- 페이지에서 동시에 `noteActions.sendNote(suiAddr, text)` 실행 — 이게 진짜 온체인
- sendNote 내부: `getAnyParticipation` → `findOrCreateNoteBox` → `walrusStore(text)` → `buildSendNoteTx` → `executeOnchain`
- 읽기: `getNoteSentEvents` → `walrusFetch(blobId)` → 복호화
- **로컬 전용:** 시드 DM, 메모리 뷰어, DM방 yone 게이트

**선행조건:** 매칭된 상대 필요. 현재 매칭: 강건우×2, 강윤주 (3건)

**테스트:**
- [ ] Chat 탭에 매칭 상대 3명 표시
- [ ] DM 전송 → Walrus 저장 + 온체인 TX 확인
- [ ] 전송 후 메시지 목록 반영

---

## 4. 선물하기 (Gift)

**코드 위치:** InyeonPage.tsx:202~229, GiftPicker.tsx
**구조:** `useOnchainHostActions.gift`(buildGiftTx)는 **데드코드**(호출자 0). 실제는 InyeonPage에서 `buildPurchaseAndGiftTx`를 인라인 호출.

**⚠️ 발견된 문제:**
1. ShopSheet의 "My SUI" 표시가 **가짜 yone**(yone/1000, ShopSheet:192·205) — 실제 결제는 온체인 SUI인데 UI 게이트는 머신 내부 가짜 통화로 판단해서 **불일치**
2. GiftPicker의 "MY SUI"는 `useSuiBalance()` → 실제 온체인 잔액 ✅

**아이템 이름:** `itemDisplayName(it, lang)` — lang='en'이면 영문 표시 (data.ts)

**테스트:**
- [ ] GiftPicker에서 아이템 이름 **영문** 표시 ("Chulsoo Default (Bowl Cut)" 등)
- [ ] GiftPicker "MY SUI" = 실제 온체인 잔액
- [ ] "Gift for 0.001 SUI" 클릭 → TX 발사 확인
- [ ] ShopSheet의 "My SUI" 가 yone 기반인지 확인 (잔액 불일치 여부)

---

## 5. 이벤트 목록 (Event List)

**코드 위치:** WeddingListPage.tsx:248~274
**데이터 흐름 (이중 소스):**
- DB: `getMyParticipatedWeddingsOptions()` → Go API
- 온체인: `useOnchainWeddingList()` → `getEventCreatedEvents` + `getParticipatedEvents` (Sui RPC)
- 합산: DB 목록 + DB에 없는 온체인 전용 결혼식
- 온체인 전용은 이름 대신 "On-chain wedding 0x46e7…" 표시

**테스트:**
- [ ] Event list에 결혼식 목록 표시
- [ ] 카드 클릭 → `/lounge/:loungeId/v2`로 이동
- [ ] 온체인 전용 결혼식(loungeId 없음) 클릭 시 동작 확인 — 빈 화면 가능성

---

## 6. 웨딩 라운지 V2

**코드 위치:** LoungeV2Page.tsx, App.tsx:82
**데이터 소스:** 전부 DB(Go API + Supabase Realtime). 온체인은 메모리 작성 시만.

**렌더 구성:**
- TopBarV2 (신랑·신부 이름)
- LoungeHeroCard (양가 이름 + 온기 라벨)
- MoiGatherPreviewCard (모이가모인곳 진입)
- AnnounceMarquee (공지)
- StoryStrip (메모리/사진/축하 스토리)
- LiveCelebration (실시간 축하)
- GatheringLog (활동 로그)
- LoungeRail (우측 레일: 공지·메모리·피드·선물)
- ComposeModal (메모리 작성 → DB + 온체인 dual-write)

**전제:** loungeId가 DB에 있어야 함. 온체인 전용 결혼식은 loungeId 빈 문자열 → 라운지 데이터 조회 실패.

**테스트:**
- [ ] `/lounge/:id` 접속 → **V2 UI** (V1 "Participants / No activity yet" 아님)
- [ ] HeroCard + StoryStrip + LiveCelebration + GatheringLog 렌더
- [ ] 메모리 작성 (PenLine → ComposeModal → 저장)
- [ ] 호스트인 경우 공지 버튼(Megaphone) 표시

---

## 7. 프로필 / 설정

**MeScreen (InyeonPage:323~389):**
- 이름: `session.user_metadata.name` → 없으면 지갑주소 축약
- 사진: `useInyeonProfile().photoUrl` — **localStorage만**(zustand persist), 온체인/DB 동기화 없음
- 신뢰잔액: `useMyCreditStats(address)` → 온체인 `getSignalEvents` → `creditFromSignals`

**SettingsPage:**
- SUI 잔액: `useSuiBalance()` → 온체인 `getBalance` ✅
- 로그아웃: `signOut` + `zk.logout` + `queryClient.clear()` ✅

**테스트:**
- [ ] Profile에서 이름 = "박태원" 또는 지갑주소 ("Yusang" 아님)
- [ ] 신뢰잔액 score/ieum/events 숫자 표시
- [ ] Settings SUI 잔액 = 실제 온체인 값

---

## 8. Guest Web (하객 플로우)

**코드 위치:** guest-web/src/hooks/guestFlow/useGuestFlowSubmitter.ts

**데이터 흐름:**
| 머신 상태 | DB(Go API) | 온체인(Sui) |
|---|---|---|
| `creating` | createGuestbookEntry ✅ | 없음 |
| `transferring` | createCashGift ✅ | 성공 후 participate→give ⚠️ 조건부 |
| `sendingMessage` | createGuestbookMessage ✅ | 의도적 미수행(done으로 위임) |
| `done` | 없음 | participate + write(Walrus→blobId) ⚠️ 조건부 |

**온체인 조건:** `zk.isAuthenticated` + 온체인 ID(`sui_wedding_id`/`sui_lounge_id`) 있을 때만. 미인증이면 **DB만 저장**, 온체인 통째 skip. 온체인은 fire-and-forget.

**⚠️ 발견:** give 금액 환산이 `amount * 1_000_000n`(원→MIST) — 주석에 "데모 환산" 명시.

**테스트:**
- [ ] 청첩장 slug 접속 → InvitationPage 렌더
- [ ] 축의금 + 방명록 작성 → DB 저장 확인
- [ ] zkLogin 인증 상태에서 → 온체인 TX 추가 발사 확인
- [ ] 미인증 상태에서 → DB만 저장, 온체인 skip 확인
- [ ] 잘못된 slug → 404 처리

---

## 발견된 코드 문제 (테스트 중 확인 필요)

| # | 문제 | 위치 | 영향 |
|---|------|------|------|
| 1 | **sponsor 가스 대납 없음** | ZkLoginProvider:230~244 | 주석과 다르게 유저 본인 SUI 소모. 잔액 0이면 TX 실패. |
| 2 | **ShopSheet "My SUI" = 가짜 yone** | ShopSheet:192·205 | 실 SUI 잔액과 다른 값 표시. 구매 게이트도 yone 기준. |
| 3 | **프로필 사진 = localStorage만** | inyeonProfile.ts:19~28 | 다른 기기에서 보면 사진 안 보임. 온체인/DB 동기화 없음. |
| 4 | **gift 함수 데드코드** | useOnchainHostActions:118~121 | 호출자 없음. 실 선물은 InyeonPage 인라인. |
| 5 | **온체인 전용 결혼식 loungeId 빈값** | useOnchainWeddingList:71 | 카드 클릭 시 `/lounge//v2` → 빈 화면. |

---

## 테스트 우선순위

| 순위 | 시나리오 | 이유 |
|------|----------|------|
| 1 | **1. 이음 수락** | G-1 핵심 검증. 이전에 TX 안 나가던 버그. 가스 본인 부담 확인. |
| 2 | **6. 라운지 V2** | G-4 라우트 교체 검증. V1→V2 전환. |
| 3 | **4. 선물하기** | 영문화 검증 + ShopSheet yone 불일치 확인. |
| 4 | **7. 프로필/설정** | 하드코딩 제거 + 실잔액 검증. |
| 5 | **3. DM** | Walrus + send_note 전체 파이프라인. |
| 6 | **8. Guest Web** | DB 경로 ✅, 온체인 조건부 동작 검증. |
