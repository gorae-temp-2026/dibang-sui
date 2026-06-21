# Agent B — 발견 이슈

## E2E 테스트 이슈

### 1. B-6-2 테스트 스크립트 actionType 상수 오류 (수정 완료)
- **증상**: WRITE_MESSAGE ActionRecord를 `actionType === 1`로 필터 → 못 찾음
- **원인**: 실제 온체인 상수 `ACTION_WRITE_MESSAGE = 4` (1은 REQUEST_IUM)
- **수정**: `e2e-agent-b.ts`에서 `actionType === 4`로 변경

### 2. B-5-7 신호 kind 상수 오류 (수정 완료)
- **증상**: GIFT CS signal을 `kind === 1`로 필터 → 못 찾음
- **원인**: CS 신호 kind는 2(KIND_CS), 1은 KIND_BUSU(EM)
- **수정**: `kind === 2`로 변경

### 3. B-6-4 abort code 미검증
- **기대**: `EActorMismatch(abort 0)`
- **실제**: `fetch failed` (owned 오브젝트 참조 에러)
- **판정**: EXPECTED_FAIL이긴 하나 abort code가 아닌 네트워크 에러

---

## 온체인 연결 전수 점검 — 버튼별 결과

### ✅ 온체인 실연결 (트랜잭션 발생 확인됨)

| 페이지 | 버튼/동작 | Move 함수 | 스크린샷 | 비고 |
|--------|----------|-----------|---------|------|
| MoiGather 샵 | "30 구매" (철수 반삭발) | `moi::purchase_item` | B-2-2 | TX 성공 토스트 확인, 요네 300→270 차감 |
| MoiGather 내아이템 | "확정 · 모이에 적용" | `moi::equip_item` | B-3-3 | 캐릭터 머리 변경 확인 |
| 인연 | "이음 신청" | `ium::request_ium` | B-8-2 | "신청을 보냈어요" 완료 화면, 카드 제거 |
| MoiGateModal | Moi 소유 확인 | `getOwnedMoiIds` (조회) | — | 소유 없으면 게이트 모달, 있으면 통과 |
| 인연 유니버스 | 카드 피드 | `discoverUsers` (조회) | B-1 | 온체인 주소 기반 카드 표시 |
| 프로필(MeScreen) | 내 신뢰잔액 | `useMyCreditStats` (조회) | B-8-3 | 140점, 이음 0, 이벤트 0, 상위 83% |

### ❌ 온체인 미연결 — 화면은 있으나 mock/하드코딩

| 페이지 | 항목 | 현재 상태 | 필요한 온체인 연결 |
|--------|------|---------|-----------------|
| MoiGather 광장 | 요네 잔액 (🪙 300) | `moiPlaza.machine`의 `START_YONE_PLAZA=300` 하드코딩 | 온체인 SUI 잔액 또는 별도 요네 토큰 조회 |
| MoiGather 광장 | 보유 아이템 목록 | `DEFAULT_OWNED`(manifest의 isDefault) 하드코딩 | `getOwnedMoiItems(client, address)`로 hydrate |
| MoiGather 광장 | 장착 상태 | 로컬 머신 상태(구매/장착 시 로컬 업데이트) | Moi DOF 조회로 실제 장착 상태 동기화 |
| MoiGather 광장 | 군중 캐릭터 | `PLAZA_CROWD` 60명 static 생성 (data.ts) | 같은 이벤트 참가자의 Moi 온체인 조회 |
| MoiGather 광장 | 호스트 Moi 6인 | `HOST_MOIS` 하드코딩 (강병주·송민정 데모) | 결혼식 호스트의 Moi 온체인 조회 |
| MoiGather 광장 | 요네 충전하기 | `CHARGE_AMOUNT=100` 로컬 가산 | 온체인 충전 트랜잭션 또는 faucet |
| MoiGather 샵 | 샵 카탈로그 | manifest.json static (정상 — 카탈로그는 static이 맞음) | — |
| 인연 프로필시트 | 상대 프로필 | `chulsooProfile` fixture 고정 (모든 상대 동일) | 상대 주소별 온체인 신용/이벤트 조회 |
| 인연 | 요네 잔액 (🪙 1,250) | `inyeon.machine` 로컬 시드 | 온체인 잔액 조회 |
| 인연 받은이음 | 이음 수락 (accept_ium) | `requestId: ''` 빈 값 → 버튼 비활성 | `getIumRequestedEvents`에서 requestId 채워야 함 |
| 선물 | 선물 수신함 | `gift.machine`의 `received: ['bouquet','flower_crown']` 하드코딩 | 온체인 선물 이벤트 조회 (받은 MoiItem 목록) |
| 선물 | 선물 신호 | `signals: {'201': 1}` 하드코딩 | 온체인 `getActionLoggedEvents` GIFT 필터 |
| 라운지 | 축하메세지 (방명록) | "QR을 스캔하고 남겨주세요" 안내만 | guest-web에서 write 후 라운지 피드 표시 = 현재 미구현 |
| 라운지 | 메모리 카드 | 이름 깨짐(ㅁㅁㅁㅁ), 비활성 | Supabase 표시콘텐츠 연결 필요 |
| 나의이벤트 | "온체인 결혼식이 아직 생성되지 않아…" | 안내 메시지 표시 | create_wedding 온체인 호출 UI 미구현 |
| 나의이벤트 | "온체인 축의 금고가 아직 없어…" | 안내 메시지 표시 | create_vault 온체인 호출 UI 미구현 |
| 나의이벤트 | 공동 혼주 추가 | 비활성 | add_host 온체인 호출 UI 미구현 |
| 나의이벤트 | 축의금 인출 | 비활성 | withdraw 온체인 호출 UI 미구현 |
| 설정 | 내 요네 | 모이 아바타 + "입기" 버튼 | 온체인 Moi 상태와 동기화 여부 미확인 |

### ⚠️ 부분 연결 (쓰기만 온체인, 읽기는 로컬)

| 기능 | 쓰기 | 읽기 |
|------|------|------|
| MoiItem 구매 | ✅ `purchase_item` 온체인 TX | ❌ 요네 차감은 로컬, 보유 목록은 로컬 머신 |
| MoiItem 장착/해제 | ✅ `equip_item`/`unequip_item` 온체인 TX | ❌ 장착 상태 표시는 로컬 머신 |
| 이음 신청 | ✅ `request_ium` 온체인 TX | ❌ 받은이음의 requestId가 빈 값 → 수락 불가 |

---

## SDK 이슈

### 1. edge_balance SDK 빌더 없음
- `create_edge`, `record` 직접 PTB 구성 필요 → 빌더 추가 권고

### 2. 시나리오 문서 actionType 상수 오류
- 문서: WRITE_MESSAGE = 1 → 실제: 4 (1은 REQUEST_IUM)

### 3. useDiscoverUsers incoming requestId 누락
- `getIumRequestedEvents`가 requestId를 반환하지 않아 accept_ium이 작동 불가
- InyeonPage의 받은이음 탭에서 수락 버튼이 사실상 비활성
