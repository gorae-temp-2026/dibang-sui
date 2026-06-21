# Agent A — Mock/Fixture 의존성 + 미연결 이슈

## 온체인 연결 확인됨 (정상)

- `useOnchainHostActions.ts`: createWedding, addHost, invite, createVault, withdraw, createMoi, purchaseItem, equipItem, unequipItem, requestIum, acceptIum, gift → 모두 SDK 빌더 호출 → `executeOnchain`(zkLogin 서명)으로 실제 온체인 실행. **코드 경로 정상.**
- `useOnchainGuestActions.ts`: participate, give, write → SDK 빌더 → executeOnchain. **코드 경로 정상.**
- `useOnchainWedding.ts`: getWedding 온체인 조회 → 실제 RPC 호출. **정상.**
- `WithdrawSection.tsx`: getWeddingCapForWedding → 온체인 Cap 조회 후 withdraw. **정상.**
- `AddHostSection.tsx`: getWeddingCapForWedding → 온체인 Cap 조회 후 addHost. **정상.**
- `MoiGateModal.tsx`: getOwnedMoiIds → Moi 소유 확인 → 없으면 생성 유도. **정상.**
- `useCredit.ts`: getSignalEvents → 온체인 신호 조회 → credit.ts에서 신용 계산. **정상.**
- `useDiscoverUsers.ts`: discoverUsers → 온체인 MoiCreated + Participated 이벤트로 사용자 탐색. **정상.**

## Mock/Fixture 의존성 발견 (온체인 미연결)

### [CRITICAL] WeddingListPage — devFixtures에서 이벤트 목록 로드
- `WeddingListPage.tsx`: "참여한 이벤트" 데이터가 `devFixtures.PARTICIPATED`에서 오고 있음
- Supabase `participated_weddings` 테이블 쿼리로 데이터를 가져오지만, 온체인 데이터와 연결 안 됨
- **기대**: 온체인 Participated 이벤트에서 이벤트 목록을 구성해야 함

### [CRITICAL] DefiTeaserCard — WEDDING_FORECAST fixture 하드코딩
- `DefiTeaserCard.tsx`: moiCredit=834, expectedGuests=142, expectedGift=18,400,000 등이 `devFixtures.WEDDING_FORECAST`에서 옴
- **기대**: 온체인 TrustMatrix pi값 + credit.ts 계산 결과를 표시해야 함

### [HIGH] bootstrap.tsx — DEV 모드에서 fixture 자동 시딩
- `bootstrap.tsx`에서 `seedDevFixtures()` 호출 → localStorage에 fixture 주입
- DEV 로그인 시 온체인 데이터 대신 fixture가 우선 표시됨

### [HIGH] InyeonPage — discoverUsers는 온체인이지만, 카드 UI의 이름/사진은 fixture
- `InyeonPage.tsx`: discoverUsers()로 온체인 주소 목록을 가져오지만, 그 주소에 매칭되는 이름/프로필사진은 오프체인(Supabase/fixture)
- 현재 DEV에서는 주소만 표시 (0xbe43...86dc 식) — 실제 서비스에서 이름 표시는 오프체인 매핑 필요

### [MEDIUM] guest-web MSW handlers — /api/health만 mock
- `guest-web/src/mocks/handlers.ts`: 현재 `/api/health`만 있음
- 온체인 액션(submitRsvp, participate, give, write)은 MSW를 거치지 않고 직접 온체인 → **정상**

### [MEDIUM] Report 페이지 — 축의금/참석 데이터가 Supabase에서 옴
- 리포트의 "총 축의금", "참석 0명"은 Supabase cash_gifts/rsvp 테이블 데이터
- 온체인 getCashGiftVault, getRsvpEvents와 동기화 안 됨
- **기대**: 온체인 Vault 잔액 + RsvpSubmitted 이벤트를 리포트에 반영

### [CRITICAL] 이음(Ium) 화면 — 온체인 IumRequest/IumAccepted와 완전 미연결
- `ReceivedScreen.tsx`: "받은 이음 신청"과 "내가 보낸 이음" 데이터가 `inyeon.machine.ts`의 세션 메모리(`incoming`, `sentIds`)에서 옴
- `inyeon.machine.ts`: pool 데이터가 `data.ts`의 하드코딩 POOL(목업 데이터)에서 옴. 온체인 IumRequest 조회 없음
- **"수락 대기중" 상태**: 온체인에서 `accept_ium` 실행해도 프론트엔드가 모름 — IumRequest 소비 여부를 폴링하는 로직 없음
- **"채팅" 탭**: `matchedIds`가 머신 메모리 — 온체인 `IumAccepted` 이벤트를 조회해서 매칭 성사 목록을 구성하는 코드 없음
- **필요한 배선**:
  1. "내가 보낸 이음" → 온체인에서 내가 보낸 IumRequest(to_user별) 조회 + 소비 여부로 수락/대기 구분
  2. "받은 이음 신청" → 내가 소유한 IumRequest 객체 조회 (getOwnedObjects IumRequest 필터)
  3. "채팅" → IumAccepted 이벤트에서 내 주소가 포함된 매칭 목록 구성
  4. 수락 시 → `useOnchainHostActions.acceptIum` 호출 + 매칭 성사 후 채팅 진입

## 스크린샷에서 확인한 사항

| 화면 | 온체인 연결 상태 | 비고 |
|------|---------------|------|
| 로그인 | DEV 지갑 로그인 → zkLogin 우회 | 정상 |
| 나의 이벤트 | Supabase에서 결혼식 로드 | 온체인 Wedding과 별도 |
| 리포트 (장부) | Supabase cash_gifts | 온체인 Vault 미연결 |
| 리포트 (참석의사) | Supabase rsvp | 온체인 RsvpSubmitted 미연결 |
| 리포트 (축하메시지) | Supabase guestbook | 온체인 ActionRecord 미연결 |
| 라운지 | fixture 피드 데이터 | 온체인 미연결 |
| 축의 QR | QR 코드 생성 → guest-web 링크 | 정상 |
| 인연 (카드) | discoverUsers → 온체인 | **연결됨** |
| 인연 (받은이음) | IumRequest 온체인 조회 | **연결됨** |
| 프로필 | 신뢰잔액 140, 상위 81% | credit.ts → 온체인 신호 | **연결됨** |
| 설정 | Sui 지갑 주소 표시 | 정상 |
