# 온체인 쿼리 → Go API 프록시 이관 — 전수 조사 인벤토리

> 계획용 산출물(구현 아님). INV-1/INV-2/INV-3의 조사 결과를 모은다.
> 검증: INV-V(Opus 4.8)에서 누락 0건 확인 후 BE 단계로.

조사일: 2026-07-01 · 도구: rg + codegraph(init 완료)

---

## INV-1 — SDK 온체인 "읽기" 함수 전수 목록

**결론: Sui 온체인 읽기는 `packages/sui-sdk/src/queries.ts` 한 파일에만 존재.**
SDK 전체를 읽기 프리미티브(`getObject`/`getOwnedObjects`/`queryEvents`/`getBalance`)로 grep한 결과, queries.ts 외 파일(walrus·sponsor·zklogin)의 네트워크 호출은 전부 Walrus/스폰서/prover **HTTP**이며 Sui RPC가 아니다.

export된 읽기 함수 = **총 24개**. RPC 프리미티브별로 분류.

### A. 단일 오브젝트 조회 — `client.getObject` (5개)

| # | 함수 | 파라미터 | 반환 타입 | 필터 |
|---|------|----------|-----------|------|
| A1 | `getWedding` | client, weddingId | `WeddingOnChain \| null` | — |
| A2 | `getWeddingLounge` | client, loungeId | `WeddingLoungeOnChain \| null` | — |
| A3 | `getCashGiftVault` | client, vaultId | `CashGiftVaultOnChain \| null` | — |
| A4 | `getMoi` | client, moiId | `MoiOnChain \| null` | — |
| A5 | `getInvitation` | client, invitationId | `InvitationOnChain \| null` | — |

→ 파라미터가 오브젝트 ID 1개. 캐시 키 단순. 프록시 난이도 낮음.

### B. 소유 오브젝트 조회 — `client.getOwnedObjects` (페이지네이션, 7개)

내부 헬퍼 `listOwnedByType(client, owner, structType)`로 owner의 특정 타입 오브젝트를 커서 순회.

| # | 함수 | 파라미터 | 반환 타입 | StructType / 필터 |
|---|------|----------|-----------|-------------------|
| B1 | `getOwnedMoiItems` | client, owner | `MoiItemOnChain[]` | MoiItem |
| B2 | `getOwnedMoiIds` | client, owner | `string[]` | Moi |
| B3 | `getOwnedWeddingCapIds` | client, owner | `string[]` | WeddingCap |
| B4 | `getWeddingCapForWedding` | client, owner, weddingId | `string \| null` | WeddingCap + wedding_id 매칭 |
| B5 | `getParticipationForEvent` | client, owner, eventId | `ParticipationOnChain \| null` | Participation + event_id 매칭 |
| B6 | `getAnyParticipation` | client, owner | `ParticipationOnChain \| null` | Participation (첫 건) |
| B7 | `getOwnedIumRequests` | client, owner | `OwnedIumRequest[]` | IumRequest |

→ 파라미터에 owner 주소. 캐시 키 = owner(+event/wedding). 소유물은 TX 후 변함 → TTL 짧게.

### C. 이벤트 전역 스캔 — `suix_queryEvents` via `queryAllEvents` (10개) ⚠️ rate-limit 주범

내부 헬퍼 `queryAllEvents(_client, eventType)` — 넘겨받은 client **무시**하고 하드코딩 `RPC_URL`(현재 publicnode)로 `suix_queryEvents`를 50개씩 커서 순회. 이벤트 필드 필터 미지원이라 **패키지 전역 해당 타입 이벤트 전부**를 가져와 클라이언트에서 거른다. 데이터 증가 시 O(전체 이벤트) → 429.

| # | 함수 | 파라미터 | 반환 타입 | 이벤트 타입 | 클라 필터 |
|---|------|----------|-----------|-------------|-----------|
| C1 | `getRsvpEvents` | client, weddingId | `RsvpEvent[]` | rsvp::RsvpSubmitted | wedding_id |
| C2 | `getActionLoggedEvents` | client | `ActionLoggedQuery[]` | ledger::ActionLogged | — |
| C3 | `getEventCreatedEvents` | client | `EventCreatedQuery[]` | event::EventCreated | — |
| C4 | `getParticipatedEvents` | client | `ParticipatedQuery[]` | event::Participated | — |
| C5 | `getSignalEvents` | client | `SignalQuery[]` | signal::SignalEmitted | — |
| C6 | `getMoiCreatedEvents` | client | `MoiCreatedQuery[]` | moi::MoiCreated | — |
| C7 | `getGiftSentEvents` | client | `GiftSentQuery[]` | gift::GiftSent | — |
| C8 | `getIumRequestedEvents` | client | `IumRequestedQuery[]` | ium::IumRequested | — |
| C9 | `getIumAcceptedEvents` | client | `IumAcceptedQuery[]` | ium::IumAccepted | — |
| C10 | `getNoteSentEvents` | client, myAddress | `NoteSentQuery[]` | note::NoteSent | from/to == myAddress |

→ **이 그룹이 프록시+캐시 효과 최대.** 전역 스캔 결과를 서버가 1번 캐시하면 전 유저 공유. C2~C9는 파라미터 없음(전역) → 캐시 키 단순, 공유율 최고.

### D. 복합 조회 — 위 함수 조합 (2개)

| # | 함수 | 파라미터 | 반환 타입 | 내부 호출 |
|---|------|----------|-----------|-----------|
| D1 | `getInvitationForWedding` | client, weddingId | `InvitationOnChain \| null` | getWedding(A1) + queryEvents[InvitationCreated] 스캔 + getInvitation(A5) |
| D2 | `discoverUsers` | client, myAddress | `DiscoveredUser[]` | getMoiCreatedEvents(C6) + getParticipatedEvents(C4) + getEventCreatedEvents(C3) + getSignalEvents(C5) = **4 스캔** + BFS degree 계산 |

→ D2가 인연 카드의 핵심 소스이자 가장 무거움(4 전역 스캔 + 그래프 계산). 프록시 시 서버 단일 엔드포인트로 묶으면 라운드트립·중복 대폭 감소.

### 내부 헬퍼 (비-export — 프록시 시 서버 측으로 이동)

| 헬퍼 | 역할 |
|------|------|
| `queryAllEvents` | 이벤트 전역 스캔 (하드코딩 RPC_URL, client 인자 무시) |
| `listOwnedByType` | 소유 오브젝트 페이지네이션 |
| `buildDegreeMap` | SignalEmitted+Participated 간선으로 BFS 최단거리(degree) |
| `objectFields`/`asString`/`asNumber`/`optString` | Move 필드 파싱 |

---

## 이관 경계 — 제외 대상 (명시)

| 대상 | 파일 | 이유 |
|------|------|------|
| TX 실행 | `exec.ts`(executeAndAssert), `sponsor.ts`(sponsored*) | **쓰기** — 이번 제외(나중 과제) |
| TX 이펙트 읽기 | `apps/dibang-wedding/src/queries/invitation-create/onchainWedding.ts:31` (extractWeddingObjectIds, `client.getTransactionBlock`) | createWedding **실행 결과**의 objectChanges에서 발행 오브젝트 ID 추출 — digest 필요, **쓰기 흐름에 묶임**(독립 읽기 아님). TX 제출 이관 시 execute 응답으로 흡수 → 이번 제외 (INV-V 지적 반영) |
| PTB 빌더 | 모든 `buildXxxTx` (event·cash-gift·gift·memory·ium·invitation·moi·guestbook·note·wedding·rsvp·trust·announcement) | **쓰기** 트랜잭션 구성 |
| 서명/세션 | `zklogin.ts` 전체 | 인증·서명 — 브라우저 고정 |
| Walrus 저장/조회 | `walrus.ts` (walrusStore/Fetch류) | **Sui RPC 아님** — Walrus HTTP publisher/aggregator. fullnode CORS·JSON-RPC sunset과 무관 → 이번 이관 대상 아님 ⚠️결정 필요로 플래그 |
| 설정/팩토리 | `constants.ts`, `client.ts` | 체인 읽기 아님 |

---

## INV-2 — 프론트엔드 call site 전수

### ⚠️ 핵심 구분: `getWedding`/`getInvitation`이 두 종류

- **`@gorae/sui-sdk`** `getWedding(client, id)` = **Sui 직접 읽기** → **이관 대상**
- **`@gorae/contracts`** (`sdk.gen` / `@tanstack/react-query.gen`) `getWedding({path})` = **이미 Go API 경유**(현재 Supabase DB 읽음) → **이번 이관 대상 아님**(참고만)

따라서 이관 대상 = `@gorae/sui-sdk` 읽기 함수 호출 + 직접 `client.xxx()` Sui 읽기.

### Group 1 — SDK(@gorae/sui-sdk) 직접 Sui 읽기 call site (이관 대상)

| 파일 : 라인 | 호출 SDK 함수 | 화면/기능 | RQ래핑 |
|-------------|---------------|-----------|--------|
| pages/MoiGatherPage.tsx:152,168,183 | getOwnedMoiIds | Moi 광장 — 내 아바타 | xstate actor |
| pages/MoiGatherPage.tsx:152,183 | getOwnedMoiItems | Moi 광장 — 내 아이템 | xstate |
| pages/MoiGatherPage.tsx:191 | getMoi | Moi 광장 — 장착상태 | xstate |
| pages/MoiGatherPage.tsx:221 | discoverUsers | Moi 광장 — 참가자 발견 | xstate |
| pages/MoiGatherPage.tsx:297 | getSignalEvents, getActionLoggedEvents | Moi 광장 — 신호/액션 | xstate |
| pages/InyeonPage.tsx:227 | getIumAcceptedEvents | 인연 — 매칭 확인 | 직접 |
| pages/InyeonPage.tsx:233 | getParticipationForEvent | 인연 — 참가증명 | 직접 |
| pages/TrustGraphPage.tsx:67 | getSignalEvents, getParticipatedEvents, getMoiCreatedEvents, getIumAcceptedEvents | 신뢰 그래프 | 직접 |
| hooks/useDiscoverUsers.ts:74-82 | discoverUsers, getIumRequestedEvents, getIumAcceptedEvents, getOwnedIumRequests, getSignalEvents | **인연 카드 메인 소스** | Promise.all |
| hooks/useCredit.ts:22,63 | getSignalEvents | 신용 점수 | useQuery |
| hooks/useGiftLog.ts:26 | getActionLoggedEvents | 선물 로그 | useQuery |
| hooks/useNotes.ts:41,113 | getNoteSentEvents, getAnyParticipation | 쪽지 | useQuery |
| hooks/useOnchainLoungeFeed.ts:50-52 | getActionLoggedEvents, getParticipatedEvents, getNoteSentEvents | 라운지 피드 | useQuery |
| hooks/useOwnedItems.ts:19 | getOwnedMoiItems | 소유 아이템 | useQuery |
| hooks/useOnchainWeddingList.ts:32 | getEventCreatedEvents, getParticipatedEvents | 결혼식 목록 | useQuery |
| hooks/useOnchainWedding.ts:27,38 | getWedding(SDK), getCashGiftVault | 결혼식 상세 | useQuery |
| hooks/useOnchainMemory.ts:54,56 | **getWedding**(별칭 getOnchainWedding, :54) + getParticipationForEvent(:56) | 메모리 | mutation |
| hooks/useOnchainAnnouncement.ts:56 | getWeddingCapForWedding | 공지 | mutation |
| hooks/useOnchainCheckIn.ts:68,71 | **getWedding**(별칭 getOnchainWedding, :68) + getParticipationForEvent(:71) | 체크인 | mutation |
| components/MoiGateModal.tsx:26 | getOwnedMoiIds | Moi 게이트 모달 | useQuery |
| components/my-wedding/WithdrawSection.tsx:44 | getWeddingCapForWedding | 출금 | mutation |
| components/my-wedding/AddHostSection.tsx:37 | getWeddingCapForWedding | 공동주최 추가 | mutation |
| queries/invitation-edit/useUpdateWedding.ts:87 | getInvitationForWedding | 청첩장 수정 | mutation |
| **guest-web** hooks/guestFlow/useGuestFlowSubmitter.ts:60,63,133,192 | getParticipationForEvent, getWedding(SDK) | 게스트 플로우 제출 | mutation |

### Group 2 — 직접 `client.xxx()` Sui 읽기 (SDK 우회, 이관 대상 · 24개에 없는 신규 프리미티브)

| 파일 : 라인 | 프리미티브 | 대상 | 비고 |
|-------------|-----------|------|------|
| pages/MoiGatherPage.tsx:196 | client.getObject | MoiItem 상세 | SDK getMoi류로 흡수 가능 |
| hooks/useSuiBalance.ts:25 | client.getBalance | SUI 잔액 | **신규: getBalance** (24개에 없음) |
| pages/MoiGatherPage.tsx:262 | client.getBalance | SUI 잔액 | 동일 |
| hooks/useNotes.ts:74,89 | client.queryEvents | note::**NoteBoxCreated** | **신규 이벤트 타입** (SDK엔 NoteSent만) |
| hooks/useOnchainWeddingList.ts:53 | client.queryEvents | wedding::**WeddingCreated** | **신규 이벤트 타입** (24개에 없음) |

→ Go 엔드포인트 설계(BE-2) 시 **getBalance·NoteBoxCreated·WeddingCreated 3종을 추가**로 포함해야 함.

**직접 client 읽기 프리미티브 전수 확인(INV-V 검증 완료):** 위 5곳 + `onchainWedding.ts:31 getTransactionBlock`(1건) = 앱 전체 직접 Sui 읽기 총 6곳. getTransactionBlock은 쓰기흐름 종속이라 위 "제외 경계"로 분류. 그 외 SDK 우회 직접 읽기 **0건**(변수명 우회 grep 포함 재확인).

### Group 3 — 이미 Go API 경유(@gorae/contracts, DB 기반) — 이관 대상 아님(참고)

`sdk.gen`/`react-query.gen`의 getWedding·getLounge·getInvitation·getWeddingMemoryBook·listRsvps 등. 이미 브라우저→Go API. (현재 Supabase 읽기 — 추후 Sui 소스로 통합할지는 별도 결정.)
사용처: useOnchainMemory·useOnchainAnnouncement·useOnchainCheckIn(getWedding/getLounge from sdk.gen), LedgerPage·WeddingMemoryBookPage·useLoadWedding·useGetWedding 등 다수.

### 앱 경계

- **dibang-wedding**: 대부분의 call site.
- **guest-web**: useGuestFlowSubmitter만 SDK Sui 읽기(getParticipationForEvent, getWedding). dapp-kit.ts는 gRPC 컨텍스트용(쿼리 미사용).

## INV-3 — 쿼리별 데이터 특성·온디맨드 캐시 TTL 후보

건수는 2026-06-28 testnet 실측(WED-4-1) 기준 대략치. TTL은 BE-3 캐시 설계 입력(후보값, 확정 아님).

### C. 이벤트 전역 스캔 (append-only · 대부분 파라미터 없음) — 캐시 효과 최대

| 함수 | 파라미터 | 대략 건수 | 변동성 | 캐시 공유 | TTL 후보 |
|------|----------|-----------|--------|-----------|----------|
| C2 getActionLoggedEvents | 없음(전역) | 중 | append-only(낮음) | **전 유저 공유** | 60s |
| C3 getEventCreatedEvents | 없음 | 소~중 | 낮음 | 공유 | 60s |
| C4 getParticipatedEvents | 없음 | ~499 | 낮음 | 공유 | 60s |
| C5 getSignalEvents | 없음 | ~547 | 낮음 | 공유 | 60s |
| C6 getMoiCreatedEvents | 없음 | ~118 | 낮음 | 공유 | 60s |
| C7 getGiftSentEvents | 없음 | 소 | 낮음 | 공유 | 60s |
| C8 getIumRequestedEvents | 없음 | ~116 | 낮음 | 공유 | 30s |
| C9 getIumAcceptedEvents | 없음 | ~58 | 낮음 | 공유 | 30s |
| C1 getRsvpEvents | weddingId(클라필터) | 소 | 낮음 | 전역스캔 공유+요청별 필터 | 60s |
| C10 getNoteSentEvents | myAddress(클라필터) | 소 | 낮음 | 전역스캔 공유+필터 | 30s |

→ **이 그룹이 온디맨드 프록시의 핵심 이득.** append-only라 TTL 길어도 안전(새 이벤트 반영만 지연). 전역 스캔 결과를 서버가 1회 캐시 → 전 유저 공유 → fullnode 요청 급감. C8/C9(이음)는 실시간성 약간 필요 → 30s.

### B. 소유 오브젝트 (getOwnedObjects · owner 파라미터)

| 함수 | 파라미터 | 크기 | 변동성 | 캐시 공유 | TTL 후보 |
|------|----------|------|--------|-----------|----------|
| B1 getOwnedMoiItems | owner | 소 | 구매/장착 후 변함(중) | per-user | 15s |
| B2 getOwnedMoiIds | owner | 0~1 | Moi 생성 후 변함 | per-user | 15s |
| B3 getOwnedWeddingCapIds | owner | 소 | 낮음 | per-user | 30s |
| B4 getWeddingCapForWedding | owner,weddingId | 0~1 | 낮음 | per-user | 30s |
| B5 getParticipationForEvent | owner,eventId | 0~1 | **참가 직후 변함(높음)** | per-user | 10s |
| B6 getAnyParticipation | owner | 0~1 | 참가 후 변함 | per-user | 10s |
| B7 getOwnedIumRequests | owner | 소 | 이음신청 후 변함 | per-user | 10s |

→ owner별 캐시 키(공유 안 됨). 내 TX 직후 반영 필요 → TTL 짧게(10~15s). 참가/이음 계열은 특히 짧게.

### A. 단일 오브젝트 (getObject · ID 파라미터)

| 함수 | 파라미터 | 변동성 | 캐시 공유 | TTL 후보 |
|------|----------|--------|-----------|----------|
| A1 getWedding | weddingId | 거의 불변 | **오브젝트별 공유** | 300s |
| A2 getWeddingLounge | loungeId | 불변 | 공유 | 300s |
| A5 getInvitation | invitationId | 거의 불변 | 공유 | 300s |
| A3 getCashGiftVault | vaultId | **give마다 변함(높음)** | 공유 | 10s |
| A4 getMoi | moiId | equip마다 변함(중) | 공유 | 15s |

### D. 복합

| 함수 | 구성 | TTL 후보 |
|------|------|----------|
| D1 getInvitationForWedding | getWedding(불변)+InvitationCreated 스캔(append-only)+getInvitation | 60s |
| D2 discoverUsers | 4 전역 스캔(C6·C4·C3·C5)+BFS | 60s (서버가 통째 캐시) |

### 신규 프리미티브(Group 2)

| 대상 | 변동성 | TTL 후보 |
|------|--------|----------|
| getBalance (SUI 잔액) | **매 TX마다 변함(최고)** | 5s 또는 무캐시(실시간 우선) — TX 후 즉시 갱신 필요 |
| queryEvents NoteBoxCreated | append-only | 60s |
| queryEvents WeddingCreated | append-only | 60s |

### 캐시 설계 함의 (→ BE-3 입력)

1. **전역 이벤트 스캔(C군·D2)** = 파라미터 없는 공유 캐시 → single-flight로 동시 요청 병합 시 fullnode 부담 최소. TTL 30~60s.
2. **소유물(B군)·잔액** = per-user, 짧은 TTL(5~15s). 내 TX 후 반영 지연 최소화. 무효화 훅(TX 성공 시 캐시 버림) 검토.
3. **단일 오브젝트(A군)** = 불변형(Wedding/Lounge/Invitation, 300s)과 변동형(Vault/Moi, 10~15s) 분리.

