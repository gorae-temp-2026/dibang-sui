# 프론트엔드 이관 설계 (FE)

> 계획용 산출물(구현 아님). INV·BE 설계를 입력으로 프론트 교체 전략·React Query 통합·call site별 변경을 설계.
> 검증: FE-V(Opus 4.8) 통과 후 계획 통합(PLAN)으로.

---

## FE-1 — SDK 쿼리 함수 → Go API 호출 교체 전략

### 결정적 제약: `@gorae/sui-sdk` 읽기 함수는 **이중 소비자**
- 소비처 ①: 프론트(apps/dibang-wedding·guest-web) — Go 프록시로 가야 함.
- 소비처 ②: **Node E2E 스크립트**(`packages/sui-sdk/scripts/*` — `getParticipationForEvent` 등 사용) — Go API 없이 **testnet 직접 읽기** 필요.
- → **SDK 함수 내부를 Go-proxy 호출로 갈아끼우면 스크립트가 깨진다.**

### 결정: "프론트만 Go로 전환, SDK 직접읽기는 존치"

| 대상 | 조치 |
|------|------|
| **프론트 call site** | 생성된 **`@gorae/contracts` `/onchain/` 클라이언트**(react-query.gen)로 전환 |
| **`@gorae/sui-sdk` 읽기 24개** | **변경 없음** — 스크립트·비프록시 용도로 존치 |
| TX 빌더(buildXxxTx)·exec·sponsor·zklogin | **변경 없음** — 서명·제출은 이번 제외 |

근거:
1. **스크립트 무손상** — 직접 testnet 읽기 유지.
2. **기존 패턴과 일관** — 프론트는 이미 DB 엔드포인트를 `@gorae/contracts`(sdk.gen/react-query.gen)로 소비(INV-2 Group3). `/onchain/` 엔드포인트는 **생성된 함수가 하나 더 느는 것**뿐 → 새 개념 없음.
3. **타입 자동 정합** — BE-2가 응답 스키마를 SDK 반환 타입과 1:1로 설계 → openapi-ts 생성 타입이 기존 shape와 동형. 매핑 거의 항등.

### 기각된 대안: "SDK 내부 재작성(시그니처 유지, call site 0변경)"
- call site 변경이 없어 매력적이나 **이중 소비자라 스크립트가 깨짐**(위). → 기각. (최소변경보다 스크립트 무결성·정석 우선 — 전역규칙 §1-1.)

### 전환 매핑 규칙(개별은 FE-3)
- `getSignalEvents(client)` → `getOnchainSignals()` / `getOnchainSignalsOptions()`(useQuery).
- **읽기용 `createJsonRpcClient(network)` 호출 제거** — client 인자·네트워크 계산 소멸.
- 직접 `client.xxx()` 읽기(getBalance·NoteBoxCreated·WeddingCreated·MoiItem getObject) → 대응 `/onchain/` 생성 함수로 교체.
- **`discoverUsers` 4스캔 → 단일 `getOnchainDiscover()`** — useDiscoverUsers 대폭 단순화(Promise.all 축소).
- **TX 제출·서명 call site = 변경 없음**(SDK buildXxxTx + zkLogin 그대로).

### 앱별
- dibang-wedding: 대부분 call site 전환.
- guest-web(useGuestFlowSubmitter): 읽기(getParticipationForEvent·getWedding)만 `/onchain/`로. TX 빌드·제출은 SDK 유지.

### 트레이드오프
- call site별 import·호출 교체 필요(FE-3 건별). 단 다수 훅은 생성된 `*Options`로 **오히려 단순화**(수동 useQuery 래핑 제거).

## FE-2 — React Query 통합·캐시 정합

### 쿼리 키 일원화
- 생성된 `@gorae/contracts/@tanstack/react-query.gen`의 **`get{X}QueryKey`·`get{X}Options`** 사용. 수동 문자열 키·수동 `useQuery` 래핑 제거 → 키 규칙 자동 일원화.

### staleTime — 서버 캐시(BE-3)와 이중 정합
- 프론트 staleTime을 **서버 TTL과 동일하게** per-query 설정(서버가 같은 값 돌려줄 시간엔 RQ도 재요청 안 하게):
  - 이벤트류(signals·participated·discover 등) staleTime **60s**, 이음 30s, 소유물 15s, 잔액 5s, 불변 오브젝트(wedding·lounge·invitation) 300s, 변동 오브젝트(vault·moi) 10~15s.
- 현재 전역 기본 `staleTime:30_000`(bootstrap.tsx:30) → `/onchain/` 쿼리는 per-query override.
- **`refetchOnWindowFocus: false`** for `/onchain/` 쿼리 — 데이터 변동 느리고 서버 캐시가 있으니 포커스마다 재요청 불필요(현재 포커스 리페치가 부하 유발했음).

### 중복 스캔 제거 (자동)
- 현재 `useDiscoverUsers`가 `getSignalEvents`를 **2회**(discoverUsers 내부 + line82) 호출 → 이관 후: discover는 `/onchain/discover` 단일 엔드포인트(서버가 내부 signal 처리), 별도 signal 표시는 `/onchain/events/signals`. **동일 queryKey면 React Query가 자동 dedup** + 서버 캐시 → 중복 스캔 소멸.

### best-effort — RQ 쿼리 격리로 자연 보존/개선
- 현재 `getSignalEvents`만 try-catch(카드 표시 보존). 이관 후 signals가 **독립 쿼리**가 되면, signals 쿼리 실패해도 discover 쿼리는 독립 성공 → **React Query per-query 에러 격리로 자연히 best-effort**(현행 Promise.all 하드실패보다 오히려 견고).
- 단 BE-4대로 `/onchain/discover` 내부 signal은 서버가 try-catch(degree 폴백)로 현행 `discoverUsers` 동작 보존.

### TX 후 무효화 배선
- 기존 `sui:tx-success` 리스너(useSuiBalance 등)에 연결: (1) BE-3 `POST /onchain/cache/invalidate?address=` 호출(서버 캐시 버림, **전역 이벤트 포함**), (2) `queryClient.invalidateQueries`로 영향 키(own·bal·discover·ev:ium·ev:signals) RQ 캐시 무효화. 둘 다 해야 "내 행동 즉시 반영".

### 수동 훅 → 생성 Options 이전
- useCredit·useGiftLog·useOwnedItems·useNotes·useOnchainLoungeFeed·useOnchainWedding 등 수동 `useQuery(SDK호출)` → 생성된 `*Options`로 교체(대개 코드 축소).

## FE-3 — call site별 구체 변경 계획

각 call site: 기존 호출 → 교체. 반환 타입은 BE-2 1:1이라 **데이터 안 끊김**(전역규칙 §0-1). TX 제출·서명 = 변경 없음.

### 쿼리형(useQuery/표시) — 생성 `*Options`로

| 파일:라인 | 기존 | 교체 |
|-----------|------|------|
| hooks/useDiscoverUsers.ts:74-82 | discoverUsers+getIumReq/Acc+getOwnedIumReq+getSignalEvents (Promise.all) | getOnchainDiscover + getOnchainIumRequested/Accepted + getOnchainOwnedIumRequests + getOnchainSignals (각 useQuery, dedup) — **Promise.all 해체·단순화** |
| hooks/useCredit.ts:22,63 | getSignalEvents(client) | getOnchainSignals() |
| hooks/useGiftLog.ts:26 | getActionLoggedEvents(client) | getOnchainActionLogged() |
| hooks/useOwnedItems.ts:19 | getOwnedMoiItems(client,addr) | getOnchainOwnedMoiItems(addr) |
| hooks/useNotes.ts:41,113 | getNoteSentEvents, getAnyParticipation | getOnchainNotesSent(addr), getOnchainAnyParticipation(addr) |
| hooks/useNotes.ts:74,89 | client.queryEvents(NoteBoxCreated) | getOnchainNoteBoxes(addr) |
| hooks/useOnchainLoungeFeed.ts:50-52 | getActionLogged/Participated/NoteSent | getOnchainActionLogged/Participated/NotesSent |
| hooks/useOnchainWeddingList.ts:32 | getEventCreated/Participated | getOnchainEventCreated/Participated |
| hooks/useOnchainWeddingList.ts:53 | client.queryEvents(WeddingCreated) | getOnchainWeddingsCreated() |
| hooks/useOnchainWedding.ts:27,38 | getWedding(SDK)/getCashGiftVault | getOnchainWedding(id)/getOnchainVault(id) |
| hooks/useSuiBalance.ts:25 | client.getBalance(addr) | getOnchainBalance(addr) |
| components/MoiGateModal.tsx:26 | getOwnedMoiIds | getOnchainOwnedMoiIds(addr) |
| pages/TrustGraphPage.tsx:67 | getSignal/Participated/MoiCreated/IumAccepted | getOnchain 동명 4종 |
| pages/InyeonPage.tsx:227,233 | getIumAcceptedEvents/getParticipationForEvent | getOnchainIumAccepted/getOnchainParticipation(addr,eventId) |

### 명령형(mutation/흐름 내 읽기) — 생성 `sdk.gen` inline 호출로 (읽기만 교체, TX 빌드·제출 SDK 유지)

| 파일:라인 | 기존 읽기 | 교체 | TX 부분 |
|-----------|-----------|------|---------|
| hooks/useOnchainMemory.ts:54,56 | **getWedding**(별칭 `getOnchainWedding`, :54) + getParticipationForEvent(:56) | getOnchainWedding(weddingId) + getOnchainParticipation | buildCreateMemoryTx 유지 |
| hooks/useOnchainAnnouncement.ts:56 | getWeddingCapForWedding | getOnchainWeddingCap(addr,weddingId) | 빌더 유지 |
| hooks/useOnchainCheckIn.ts:68,71 | **getWedding**(별칭 `getOnchainWedding`, :68) + getParticipationForEvent(:71) | getOnchainWedding(weddingId) + getOnchainParticipation | buildParticipateTx/executeOnchain 유지 |
| components/my-wedding/WithdrawSection.tsx:44 | getWeddingCapForWedding | getOnchainWeddingCap | withdraw 빌더 유지 |
| components/my-wedding/AddHostSection.tsx:37 | getWeddingCapForWedding | getOnchainWeddingCap | addHost 빌더 유지 |
| queries/invitation-edit/useUpdateWedding.ts:87 | getInvitationForWedding | getOnchainInvitationForWedding(weddingId) | updateWedding 유지 |
| **guest-web** hooks/guestFlow/useGuestFlowSubmitter.ts:60,63,133,192 | getParticipationForEvent, getWedding(SDK) | getOnchainParticipation, getOnchainWedding | buildParticipate/Give/Write 유지 |

### 특수: MoiGatherPage.tsx (xstate actor)
- 152·168·183 getOwnedMoiIds/MoiItems, 191 getMoi, 221 discoverUsers, 297 getSignal/ActionLogged → 대응 `getOnchain*`로. 196 `client.getObject(MoiItem)` → getOnchainMoiItem(id). 262 `client.getBalance` → getOnchainBalance. **읽기용 `createJsonRpcClient` 제거.** xstate actor의 `fromPromise` 내부 호출만 교체(머신 구조 불변).

### 변경 없음(명시)
- TX 빌더(buildParticipate/Give/Write/CreateMemory/RequestIum/…)·`executeOnchain`(ZkLoginProvider)·zkLogin 서명·`onchainWedding.ts` extractWeddingObjectIds(제외 경계).
- `@gorae/contracts` 기존 DB 엔드포인트 호출(INV-2 Group3) — 이미 Go API.

### 커버리지
- INV-2 Group1(SDK 직접) + Group2(직접 client) call site **전부** 매핑(FE-V 지적 별칭 2건 포함).
- ⚠️ **별칭 사각지대(FE-V 발견)**: `useOnchainMemory`·`useOnchainCheckIn`은 `getWedding as getOnchainWedding`(@gorae/sui-sdk)으로 별칭 임포트해 `getWedding` grep을 회피했음. 두 파일 모두 **contracts getWedding(DB, path)**와 **SDK getWedding(Sui 직접, 별칭)**을 동시 임포트 → 교체 시 **이름 충돌 주의**: SDK 별칭 제거하고 생성된 contracts `getOnchainWedding`(Go /onchain/weddings/{id})으로 치환.
- 위 두 파일은 온체인 읽기(getOnchainWedding+getParticipation) 모두 이관 후 **읽기용 `createJsonRpcClient`/`configureSui` 제거**(남은 SDK 읽기 없음). 그 외 파일도 읽기 제거 후 `createJsonRpcClient`/`dapp-kit` gRPC 컨텍스트 미사용 → 정리 대상(별도).

