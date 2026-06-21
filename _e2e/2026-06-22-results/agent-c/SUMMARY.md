# Agent C E2E 결과 요약

> 날짜: 2026-06-22
> 범위: C-1~C-8 (Ium, 역할, TrustMatrix, Registry, 통합, 교차, 엣지)
> 네트워크: Sui testnet
> 패키지: `0xf3c24dcc…975e`

## 결과 집계 (Part 1 + 2 + 3 합산, 중복 제거)

| 항목 | 수 |
|------|-----|
| 총 시나리오 | **79** |
| ✅ PASS | **64** |
| ✅ EXPECTED_FAIL | **15** (abort code 정상 검증) |
| ❌ UNEXPECTED_FAIL | **0** |

**합격률: 100% (79/79)** — SDK·컨트랭트 버그 0건. Part 3에서 공용 지갑(0.5 SUI)으로 미완료분 전부 통과.

## 섹션별 결과

### C-1: 이음 신청 (request_ium) — 6/6 ✅
- `request_ium` → Event(INYEON) + Participation(INITIATOR) + IumRequest 생성 확인
- 자기 자신 이음 → ESelfLink(abort 0) 정상 차단

### C-2: 이음 수락 (accept_ium) — 8/8 ✅
- `accept_ium` → Participation(RECEIVER) 생성, IumRequest 소비(삭제) 확인
- 양방향 CS 신호 2개 발행 확인
- 틀린 Event → EWrongEvent(abort 1), RECEIVER 자임 → ENotSelfClaimable(abort 2) 정상 차단

### C-3: 역할 할당 (assign_role) — 5/5 ✅
- 직접 PTB로 OFFICIANT(2) 할당 성공
- 비-생성자 → ENotCreator(abort 3), 범위 밖 역할(5) → EInvalidRole(abort 1) 정상 차단

### C-4: TrustMatrix/Signal 검증 — 16/16 ✅
- TrustRegistry/EM-money/CS 매트릭스 온체인 존재 확인
- 참석 → CS 신호(source=5), 부조 → BUSU 신호(kind=1, source=0), 방명록 → CS(source=4), 초대 → CS, 이음수락 → 양방향 CS(source=2) 모두 검증
- 매트릭스 node_count 증가로 전파 동작 확인

### C-5: TrustRegistry 관리 — 4/4 ✅
- `add_matrix(kind=1, resource_id=1)` → 새 TrustMatrix 생성 + type_count 증가
- 중복 추가 → ETypeExists(abort 0), 미등록 조회 → ETypeNotFound (devInspect 실패)

### C-6: 통합 시나리오 — 13/13 ✅
- 결혼식 생성 → CoHost 추가 → Vault → Moi 생성 → 초대 → 참석 → RSVP → 부조 → 방명록 → 선물 → 인출 전체 라이프사이클 1회 완주
- Gift 시 CS 신호 1개 발행 확인
- 인출 후 Vault 잔액 0 확인
- `discoverUsers`로 같은 이벤트 참가자 degree=1 탐색 확인

### C-7: 교차 결혼식 — 4/4 ✅ (Part 3에서 통과)
- Guest1이 결혼식 2개에 모두 참가, 각각 부조 성공
- 결혼식 A의 Participation으로 결혼식 B 부조 → EWrongEvent(abort 3) 정상 차단
- `discoverUsers`에서 교차 참가 반영: sharedEventIds=2, degree=1

### C-8: 엣지 케이스 — 14/14 ✅ (Part 3에서 나머지 통과)
- C-8-1: 존재하지 않는 Participation → 객체 참조 에러 ✅
- C-8-2: 삭제된 IumRequest → "has been deleted" ✅
- C-8-3: 잔액 초과 부조 → InsufficientCoinBalance ✅
- C-8-4: 1 MIST 부조 → 성공 (최소 금액 없음) ✅
- C-8-5: 중복 participate → 허용 (온체인 중복방지 없음) ✅
- C-8-6: 부조 후 같은 Participation으로 방명록 → 성공 (ref 재사용) ✅
- C-8-7: 이음 중복 신청 → 허용 (중복방지 없음) ✅
- C-8-8: 장착된 아이템 선물 → 실패 (DOF 소유 = owned 아님) ✅
- C-8-9: 타인 Participation으로 give → 소유권 차단 (Sui 런타임) ✅
- C-8-10: 타인 Participation으로 write → 소유권 차단 ✅
- C-8-11: 존재하지 않는 eventId → 객체 참조 에러 ✅
- C-8-12: 2개 결혼식 vault 독립 확인 ✅
- C-8-13: 부조→인출→재부조→재인출 순환 → 잔액 정확 추적 ✅
- C-8-14: 같은 하객 같은 slot RSVP 2번 → 허용 (최신 기준은 오프체인) ✅

## 발견 이슈

### 기능 버그: 0건

### Mock/Fixture 의존성 (HIGH 2건, MEDIUM 3건)
1. **[HIGH]** `InyeonPage` — `chulsooProfile` fixture가 프로필에 하드코딩. 온체인 Moi/신호 데이터로 교체 필요
2. **[HIGH]** 이음 수락 시 `incoming` 데이터에 `eventId`/`requestId` 미포함 → 온체인 `acceptIum` 호출이 실질 무동작
3. **[MEDIUM]** `devFixtures.ts` — 결혼식·참여이벤트 전체 fixture (DEV 모드 한정)
4. **[MEDIUM]** `profile/fixture.ts` — 철수 프로필 sim-scale 데이터
5. **[MEDIUM]** `moi-gather/data.ts` — PLAZA_WEDDING 광장 더미 데이터

### SDK 빌더 누락
- `event::assign_role` — 직접 PTB로 검증 완료. 빌더 추가 권고
- `trust_registry::add_matrix` — 운영 전용, 선택적

### 보안 발견 (긍정적)
Soulbound Participation의 소유권 보호가 **Sui 런타임 레벨**에서 Move 코드 이전에 작동. `key`-only + owned object 정책으로 타인의 Participation 위조가 원천 차단됨.

## 수정한 코드

없음 — SDK/컨트랙트 버그가 발견되지 않아 수정 불필요.

## 스크린샷 (서비스 화면)

Playwright MCP로 실 서비스 주요 화면 촬영 (10장):

| 파일 | 화면 | 온체인 연결 상태 |
|------|------|---------------|
| `home_landing.png` | 로그인 (DEV 모드) | zkLogin + DEV 지갑 우회 |
| `01_my-wedding.png` | 나의 이벤트 | 온체인 Wedding 미생성 상태 표시 |
| `02_inyeon-page.png` | 인연 — MoiGateModal | ✅ `getOwnedMoiIds` 실연결 |
| `03_inyeon-moi-creating.png` | 인연 — SwipeDeck | ✅ `discoverUsers` 실연결 (Sui 주소 표시) |
| `04_event-list.png` | 이벤트 리스트 | DEV 지갑 참여 이벤트 없음 (정상) |
| `05_settings.png` | 설정 | Sui 지갑 주소 표시 |
| `06_my-wedding-card.png` | 나의 이벤트 전체 | "온체인 결혼식 미생성" 안내 |
| `07_guest-web-landing.png` | guest-web 랜딩 | 청첩장 slug 없이 빈 화면 |
| `08_inyeon-received.png` | 인연 — 받은이음 | 이음 0 / 관심 1 표시 |
| `09_inyeon-me-profile.png` | 인연 — 내 프로필 | ✅ `useMyCreditStats` 실연결 (신뢰잔액 140, 상위 81%) |

### 주요 tx digest (Sui Explorer 확인용)
- Ium 신청: `BJAAHTp89qtG52cbfg52PjSNbZPAaXbkN1iNyyKeWZ72`
- Ium 수락: `6Kp1TnFtL1Sz3iX3iQRjUJgk8MRdAk5ZL5KRy5sQwEKZ`
- 역할 할당: `GVDAqBF55DpMEudXWx3UvyijZaX28Xf3ur3F4ARBCwQN`
- 매트릭스 추가: `AoVfV2wLRAikcRA1hdQf7hXGoNfQHfUrSnUEEbMhF6aU`
- 선물: `4H4hJE331e9tE1od41MXug2w8soWqHffsTE5GmfyMbwt`
- 인출: `ECJJLtBAGQjsLG4EbJ2uCkypuCh7HVfcmb8PHd2Srvs`
