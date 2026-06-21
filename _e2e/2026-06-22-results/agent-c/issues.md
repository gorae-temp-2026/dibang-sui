# Agent C — 발견 이슈

## 1. 인프라: testnet 가스 부족

C-7(교차 결혼식), C-8-6/7/8/13/14가 지갑 가스 부족으로 실행 불가. SDK/컨트랙트 버그가 아닌 **인프라 문제**.

- **원인**: 시드 지갑 5개에 각 ~0.035 SUI. 많은 tx를 거치면서 소진.
- **해결**: testnet faucet 충전 후 재실행하면 모두 통과 예상 (동일 로직 C-1~C-6에서 이미 검증됨)

## 2. Mock/Fixture 의존성 발견

### dibang-wedding 앱

| 파일 | Mock 내용 | 실제 대체해야 할 소스 | 심각도 |
|------|-----------|---------------------|--------|
| `InyeonPage.tsx:22,209,216` | `chulsooProfile` fixture를 ProfileSheet에 하드코딩 | 온체인 Moi 데이터 + 오프체인 프로필 API | **HIGH** — 내 프로필/상대 프로필 모두 fixture |
| `InyeonPage.tsx:139-143` | 받은이음 수락 시 `eventId`/`requestId`가 데모 데이터에 없어 온체인 호출 skip | `useDiscoverUsers`의 incoming에 IumRequest 객체 ID 포함 필요 | **HIGH** — 이음 수락이 실제론 무동작 |
| `dev/devFixtures.ts` | 철수/영희 결혼식, 참여 이벤트 목록 전체가 fixture | `useOnchainWedding` + Supabase 표시콘텐츠 API | **MEDIUM** — DEV 모드 한정 |
| `components/profile/fixture.ts` | 철수 프로필 데이터(sim-scale.mjs 산출물) | 온체인 신호 + Moi 데이터 조합 | **MEDIUM** |
| `components/moi-gather/data.ts` | PLAZA_WEDDING 모이 광장 더미 데이터 | 온체인 Participation 이벤트 기반 군중 조회 | **MEDIUM** |
| `NetworkPage.tsx:10,25` | useOnchainHostActions 임포트 주석 처리 | 실 온체인 연결 필요 | **LOW** — 현재 비활성 |

### 프론트엔드 → 온체인 연결 상태

| 기능 | 온체인 훅 | 연결 상태 |
|------|----------|----------|
| 인연 탐색 (SwipeDeck) | `useDiscoverUsers` → `discoverUsers(SDK)` | ✅ **실연결** — 온체인 MoiCreated+Participated 교차 |
| 이음 신청 | `useOnchainHostActions.requestIum` | ✅ **실연결** |
| 이음 수락 | `useOnchainHostActions.acceptIum` | ⚠️ **부분** — 훅은 있으나 incoming 데이터에 objectId 미포함 |
| 내 신뢰잔액 | `useMyCreditStats` → 온체인 signal | ✅ **실연결** |
| Moi 생성 게이트 | `MoiGateModal` → `getOwnedMoiIds` | ✅ **실연결** |
| 아이템 구매/장착 | `useOnchainHostActions.purchaseItem/equipItem` | ✅ **실연결** |
| 프로필 표시 | `chulsooProfile` fixture | ❌ **미연결** — 하드코딩 fixture |
| 결혼식 표시정보 | `devFixtures.MY_WEDDINGS` | ❌ **미연결** — Supabase API 필요(온체인=앵커만) |

### guest-web 앱

| 파일 | Mock 내용 | 상태 |
|------|-----------|------|
| `src/mocks/handlers.ts` | MSW handler (현재 `/api/health`만) | **LOW** — 최소한 |
| `src/mocks/server.ts` | MSW 서버 셋업 | 정상 (테스트 인프라) |

guest-web은 zkLogin + 온체인 훅(`useOnchainActions`)으로 실 연결 완료 상태. mock 의존성 낮음.

## 3. SDK 빌더 누락

E2E 중 직접 PTB를 구성해야 했던 함수:

| Move 함수 | 대응 | 권고 |
|-----------|------|------|
| `event::assign_role` | 직접 PTB (C-3에서 검증) | SDK 빌더 추가 권고 |
| `trust_registry::add_matrix` | 직접 PTB (C-5에서 검증) | 운영 전용 — 빌더 추가 선택적 |
| `edge_balance::create_edge` | Agent B 범위 | SDK 빌더 추가 권고 |
| `edge_balance::record` | Agent B 범위 | SDK 빌더 추가 권고 |

## 4. 프론트엔드 훅 누락

| 기능 | dibang-wedding | guest-web |
|------|---------------|-----------|
| `rsvp::submit_rsvp` | 훅 없음 | ✅ `useOnchainActions.submitRsvp` |
| `event::assign_role` | 훅 없음 | 훅 없음 |

## 5. C-8-9/C-8-10 발견: Participation 소유권 검증이 Move 이전에 작동

다른 사용자의 soulbound Participation으로 give/write 시도 시, Move abort(EActorMismatch)까지 가지 않고 **Sui 런타임이 input object 소유권에서 먼저 차단**함:
```
Transaction was not signed by the correct sender: Object 0x567b... is owned by account address 0xf334...
```
이는 예상보다 더 강력한 보안 계층 — soulbound(key-only, no store) + owned object 정책이 Move 코드 이전에 위조를 원천 차단.
