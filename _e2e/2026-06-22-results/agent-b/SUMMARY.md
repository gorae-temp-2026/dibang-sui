# Agent B E2E 결과 — 2026-06-22

## 시나리오 실행 결과

| 섹션 | 시나리오 수 | PASS | EXPECTED_FAIL | FAIL | 비고 |
|------|-----------|------|---------------|------|------|
| B-1 Moi 아바타 | 4 | 4 | 0 | 0 | |
| B-2 MoiItem 구매 | 7 | 5 | 2 | 0 | |
| B-3 아이템 장착 | 4 | 3 | 1 | 0 | |
| B-4 아이템 해제 | 4 | 3 | 1 | 0 | |
| B-5 Gift 선물 | 8+셋업4 | 12 | 0 | 0 | |
| B-6 방명록 | 4 | 2 | 1 | 1* | *B-6-2: 스크립트 actionType 상수 오류(수정 완료) |
| B-7 EdgeBalance | 9 | 6 | 3 | 0 | |
| B-8 온체인 쿼리 | 5 | 5 | 0 | 0 | |
| **합계** | **45** | **40** | **8** | **1** | |

> *B-6-2 FAIL은 테스트 스크립트 버그(actionType=1 vs 실제 4). 컨트랙트/SDK 문제 아님. 수정 완료.

## 실행 환경
- 네트워크: Sui testnet
- 패키지: `0xf3c24dcc1455a12c3b066e4d9d40112d7be66dd0ccdfe729b9781b42e28f975e`
- 지갑: User(0x1019…), Recipient(0xd7ce…), Guest(0x05ed…)
- 자금: shop-admin-key(0xbe43…) + dev 지갑(0xe58c…)에서 펀딩
- 실행 시간: ~80초 (셋업 포함)

## 주요 검증 항목

### 성공 확인
1. **Moi 생성·다수 보유**: 1인 다수 아바타 생성 가능, MoiCreated 이벤트 정상
2. **MoiItem 구매**: Payment Kit 결제 게이트 정상 작동, 중복 nonce 방지 확인
3. **장착/해제**: DOF(Dynamic Object Field) 이동 정상, 슬롯 충돌·빈 슬롯 abort 확인
4. **Gift 선물**: MoiItem 소유권 이전 + GIFT ActionRecord + CS 신호 정상
5. **방명록**: WRITE_MESSAGE ActionRecord + CS 신호 정상
6. **EdgeBalance**: 생성·양방향 기록·누적·매트릭스 전파 정상, 자기엣지/비참여자/타입불일치 abort 확인
7. **온체인 쿼리**: discoverUsers(degree=1), 이벤트/참가/신호/액션 전체 조회 정상

### 실패 시나리오 (기대한 실패 — 모두 정상)
- EInsufficientPayment(abort 2): 가격 미달 구매 거부
- Payment Kit 중복 방지(abort 0): 같은 nonce 재사용 거부
- ESlotOccupied(abort 0): 이미 장착된 슬롯에 재장착 거부
- ESlotEmpty(abort 1): 빈 슬롯 해제 거부
- ESelfEdge(abort 2): 자기 자신과 엣지 생성 거부
- ENotParticipant(abort 0): 비참여자 기록 거부
- EMatrixTypeMismatch(abort 1): 매트릭스 타입 불일치 기록 거부

## Mock 의존성 발견 (프론트엔드)

> 상세: `issues.md` 참조

| 영역 | 상태 | 설명 |
|------|------|------|
| MoiGateModal | ✅ 실연결 | getOwnedMoiIds 온체인 실호출 |
| MoiGather 쓰기 | ✅ 실연결 | 구매/장착/해제 온체인 실호출 |
| MoiGather 읽기 | ❌ mock | 보유 아이템·잔액·장착 상태 = 로컬 머신 시드 |
| Gift 수신함 | ❌ mock | received/signals 하드코딩 시드 |
| InyeonPage 디스커버 | ✅ 실연결 | discoverUsers 온체인 실호출 |
| InyeonPage 프로필 | ❌ mock | chulsooProfile fixture 고정 |
| accept_ium | ⚠️ 막힘 | requestId 빈 값 → 트랜잭션 불가 |
| guest-web | ✅ OK | 런타임 MSW 가로채기 없음 |

## 수정한 코드
- `packages/sui-sdk/scripts/e2e-agent-b.ts`: WRITE_MESSAGE actionType 1→4, CS kind 1→2, 이벤트 인덱싱 대기 추가

## 스크린샷 (15장 — 서비스 화면 + 버튼 동작)

| 파일 | 설명 | 온체인 TX |
|------|------|----------|
| `B-0_main-page.png` | 로그인 페이지 (DEV MODE) | — |
| `B-0_my-wedding.png` | 나의 이벤트 (온체인 결혼식 미생성 안내) | — |
| `B-1_inyeon-page.png` | 인연 카드 피드 — 온체인 discoverUsers 실호출 | 조회 |
| `B-1_inyeon-profile.png` | 프로필 시트 — "공통 0명 · 신뢰 낮음" | 조회 |
| `B-2_settings-page.png` | 설정 — Sui 지갑 주소 표시 | — |
| `B-2-1_shop-open.png` | MoiGather 샵 모달 (아이템 목록) | — |
| `B-2-2_purchase-result.png` | 아이템 구매 완료 — TX 성공 토스트, 요네 270 | ✅ purchase_item |
| `B-3_wedding-list.png` | 이벤트 리스트 — 참여 1건 | — |
| `B-3-1_my-items.png` | 내 아이템 탭 — 보유 아이템 목록 | — |
| `B-3-2_equip-result.png` | 장착 미리보기 중 | — |
| `B-3-3_equip-tx-result.png` | 장착 확정 — 캐릭터 머리 변경 | ✅ equip_item |
| `B-3-4_moi-changed.png` | 장착 후 광장 캐릭터 변경 확인 | — |
| `B-4_lounge.png` | 라운지 — 모이가 모인곳 + 축하메세지 | — |
| `B-8-1_ium-request-result.png` | 이음 신청 모달 (한마디 입력) | — |
| `B-8-2_ium-request-tx.png` | 이음 신청 완료 — "신청을 보냈어요" | ✅ request_ium |
| `B-8-3_me-profile.png` | 내 프로필 — 신뢰잔액 140, 상위 83% | 조회 |
