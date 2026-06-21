# 세션 인수인계 — 2026-06-22 E2E + 온체인 배선

세션 ID: `4937782d-4551-4c80-afd1-b55867409fb4`

## 1. 이번 세션에서 한 작업

### E2E 테스트
- `_e2e/2026-06-22.md` — 139개 시나리오 작성 (A/B/C 3개 에이전트 분할)
- Agent A 46개 실행 완료, Agent B/C는 다른 cmux 패널에서 실행
- E2E 공용 지갑 5개 생성 (`_e2e/2026-06-22-results/e2e-wallets.json`)
- 5개 지갑 모두 Moi 생성 완료 (`e2e-base-setup.json`)

### 온체인 배선 (주 작업)

**SDK 추가 (packages/sui-sdk/src/):**
- `queries.ts`: `getIumAcceptedEvents`, `getOwnedIumRequests`, `getIumRequestedEvents` 추가
- `queries.ts`: `discoverUsers`에서 WEDDING/INYEON 이벤트 구분 (EventCreated로 eventType 필터)
- `gift.ts`: `buildPurchaseAndGiftTx` — 한 PTB로 구매+선물

**신규 훅 (apps/dibang-wedding/src/hooks/):**
- `useOwnedItems.ts` — 온체인 MoiItem 소유 목록
- `useSuiBalance.ts` — 온체인 SUI 잔액
- `useGiftLog.ts` — 온체인 ActionLogged(GIFT) 조회
- `useOnchainWeddingList.ts` — 온체인 결혼식 목록
- `useOnchainLoungeFeed.ts` — 온체인 라운지 피드 (ActionLogged 기반)

**주요 수정:**
- `useDiscoverUsers.ts`: POOL mock 제거, IumAccepted 필터링, requestId 확보, matchedAddresses, refetch
- `inyeon.machine.ts`: SET_MATCHED 추가, 초기 pool=[] (POOL mock 제거)
- `ChatScreen.tsx`: POOL → props pool, 온체인 선물 로그, SUI 잔액, onSendOnchainGift
- `GiftPicker.tsx`: SUI 잔액 표시, 온체인 소유 아이템, purchase 콜백
- `MatchOverlay.tsx`: MOI_MUTUALS → moi.mutualCount
- `DefiTeaserCard.tsx`: WEDDING_FORECAST fixture → useMyCreditStats 온체인
- `useOnchainProfile.ts`: deg→하드코딩 → creditScore 주입
- `gift.machine.ts`: yone=0, received=[], signals={} (mock 제거)
- `ShopSheet.tsx`: 요네→SUI, 충전하기 제거
- `SettingsPage.tsx`: 마케팅 동의 제거, 요네→SUI
- `InyeonCard.tsx`: 사진 비용 요네→SUI
- `WeddingListPage.tsx`: DB+온체인 합산
- `LoungeFeedPage.tsx`: DB 실패 시 온체인 폴백, useEnsureLoungeCheckIn 비활성화
- `data.ts`: TIER_META 라벨 수정

## 2. 사용자 피드백 (중요)

- "mock 데이터인 곳 다 온체인 데이터로 연결해줘" — 전수조사 후 순서대로 교체
- "요네는 다 수이로 해달라니까" — 요네 표시/잔액/비용 전부 SUI로
- "PTB로 한 번에 못해?" — purchase+gift 한 PTB
- "이음한 사람은 인연에 안 나타나는데" — tier 분류가 degree 기준이라 잘못 표시 → sharedEventIds 기준으로 수정
- "DB에서 가져오니까 옛날 데이터가 있고 온체인 데이터랑 다르잖아" — DB↔온체인 이원화 문제
- "웨딩 라운지도 온체인 연결해줘야지. db는 다 지워"
- "방명록 메세지 모두 온체인으로 만들어서 연결해줘. 모든 데이터 db에 있는 모든 데이터 다 일단 온체인화 시켜줘. 컨트랙트 코드 더 만들어서 온체인화 할 수 있게 진짜 다 전수조사 해줘. 싹 다. 모바일 청첩장부터 모든 거 다" — **마지막 지시, 미완**

## 3. 교훈

- E2E에서 지갑 키 저장 안 해서 ~0.5 SUI 유실 → wallets.json 패턴 도입
- POOL mock이 여러 파일에 퍼져있음 (ChatScreen, MatchOverlay, inyeon.machine 등)
- discoverUsers가 INYEON 이벤트도 "공유 결혼식"으로 잡던 버그 → EventCreated로 타입 구분 필요
- ChatScreen의 moiById가 하드코딩 POOL에서 찾아서 온체인 matchedIds가 안 보이던 버그
- DEV 키(suiprivkey1qp6l...)의 주소는 0xe58c... — 사용자의 zkLogin 주소 0x46e7...와 다름
- gift::gift에 Participation 필요 — 이음 매칭의 INYEON Event Participation으로 해결 가능

## 4. 현재 상태 — 미완 작업

### [최우선] 전체 DB→온체인 마이그레이션
사용자가 "모든 데이터 온체인화, 컨트랙트 코드 더 만들어서, 모바일 청첩장부터 다"라고 지시. 아직 시작 안 함.

필요한 작업:
1. **DB 데이터 전수조사** — Go API(@gorae/contracts)가 제공하는 모든 엔드포인트와 데이터 타입
2. **온체인에 없는 데이터 식별** — 방명록 메시지 본문, 라운지 공지, 체크인, 피드, 청첩장 콘텐츠 등
3. **컨트랙트 확장** — 온체인에 저장할 수 없는 데이터용 Move 모듈 추가 (결정#2 신원-불가지 원칙과 충돌 가능 — 사용자와 확인 필요)
4. **프론트엔드 배선** — DB 쿼리를 온체인 쿼리로 교체

### 라운지 피드
- LoungeFeedPage에 온체인 폴백은 추가했지만, 온체인에 데이터가 없어서 빈 피드
- Go API 서버(localhost:8088)가 안 돌아서 400 에러
- useEnsureLoungeCheckIn 주석 처리함 (400 에러 방지)

### mock 전수조사 결과
`_e2e/2026-06-22-results/agent-a/issues.md`에 정리됨. mock-audit 에이전트 결과도 이 세션 대화에 있음.

## 5. 참고 파일

- `CLAUDE.md` — 프로젝트 규칙 (SSOT=온체인, DB는 보조)
- `_onboarding/VISION-AND-INTENT.md` — 왜 Sui인가
- `_architecture/DOMAIN_MODEL_SUMMARY.md` — 도메인 모델 SSOT
- `_e2e/2026-06-22.md` — E2E 시나리오 139개
- `_e2e/2026-06-22-results/E2E_RULES.md` — E2E 실행 규칙 + mock 위치
- `_e2e/2026-06-22-results/e2e-wallets.json` — 공용 지갑 5개 (키 포함)
- `_e2e/2026-06-22-results/agent-a/issues.md` — mock 의존성 + 미연결 이슈
- `packages/sui-sdk/src/queries.ts` — 온체인 쿼리 함수 전체
- `apps/dibang-wedding/src/hooks/useDiscoverUsers.ts` — 인연 카드 소스 (온체인 연결됨)
- `apps/dibang-wedding/src/pages/InyeonPage.tsx` — 인연 페이지 (대부분 온체인 연결됨)
- `apps/dibang-wedding/src/pages/LoungeFeedPage.tsx` — 라운지 (온체인 폴백 추가, 미완)
- `contracts/dibang_wedding/sources/` — Move 컨트랙트 전체

## 6. 환경

- DEV 지갑 키: `suiprivkey1qp6ldcag9qaq3cf8nsfcc065l62vr6qsn55wqsgz4m245t4h0sjevs6qx27` (주소: 0xe58c...)
- 사용자 zkLogin 주소: `0x46e7e39b2acd3973b2d19836243712826200ad5968d5fd4a4c284ccba149c0bb`
- testnet 패키지: `0xf3c24dcc1455a12c3b066e4d9d40112d7be66dd0ccdfe729b9781b42e28f975e`
- 자금 지갑: `packages/sui-sdk/scripts/.shop-admin-key` (약 58 SUI 잔액)
- dev 서버: port 5400 (dibang-wedding)
