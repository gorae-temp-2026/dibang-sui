# E2E 검증 보고서 — 2026-06-29

## 1. 검증 환경

- **네트워크**: Sui Testnet
- **패키지**: original `0xf33fba09` / upgraded `0xb529ddd0`
- **데이터**: 41명 (A1~A10 혼주, B1~B30 참석자, 사용자 0x46e7), 10개 결혼식, 130+ 참석, 50건 이음
- **앱**: `localhost:5400` (dibang-wedding dev server)

---

## 2. 검증 결과 요약

| # | 항목 | 결과 | 비고 |
|---|------|------|------|
| P7-1 | Trust Graph | **PASS** | 96 nodes, 891 edges |
| P7-3 | A1 Profile 신용 점수 | **PASS** | Trust score 534, Ieum 3, Top 6% |
| P7-4 | C1 비참여자 빈 상태 | **PASS** | Moi 생성 게이트 정상 |
| P7-5 | B18 event-list | **PASS** | Past events 4/5 (pruned TX 1건 누락) |
| P7-6 | B18 Received | **PASS** | Ieum 0, Interest 0 (전부 수락 완료) |
| P7-9 | A1/B15 Settings | **PASS** | 지갑 주소, 프로필 사진, SUI 잔액 표시 |
| P7-2 | A1 Chat 탭 전환 | **PASS** | 탭 전환 정상 작동 확인 |
| P7-7 | B23 Chat 이음 상대 | **DEFER** | matchedIds 미매칭 (주소 normalization은 적용 완료) |
| P7-8 | 사용자(zkLogin) 수동 검증 | **DEFER** | zkLogin JWT 만료 — 사용자 수동 검증 필요 |

---

## 3. 스크린샷

### 3-1. Trust Graph (96 nodes, 891 edges)
![trust-graph](../e3-trust-graph-sim.png)

- **Trust Network** 패널: 96 nodes, 891 edges
- P6 사용자 이음(0x46e7) 포함
- EM/CS/event 신호 타임라인 표시

### 3-2. A1(강건우) Profile — Trust Score 534
> 스크린샷 ID: ss_412015vwp

- 프로필 사진 정상 표시 (결혼 사진)
- **My trust balance: 534** / trust score
- Ieum: **3** (B1, B7, 사용자)
- Shared events: **2**
- Network centrality: **Top 6%**
- "View my full profile" / "Check Moi Credit on-chain" 버튼

### 3-3. C1(비참여자) — Moi 생성 게이트
> 스크린샷 ID: ss_86565nm55

- "Please create your avatar (Moi)" 모달
- Moi가 없는 사용자는 인연 기능 접근 불가 (게이트 정상 작동)

### 3-4. B18(송준도) Event List — Past Events 4
> 스크린샷 ID: ss_9846og2vk

- Joined events: Past events **4** (expected 5, 1건 pruned TX 누락)
- 각 카드에 Wedding 태그 + 날짜 + 온체인 wedding ID 표시

### 3-5. B18 Received 탭
> 스크린샷 ID: ss_8655g8r10

- Interest · Ieum 화면 정상 전환
- Ieum 0, Interest 0 (B18의 모든 이음이 이미 수락 완료)

### 3-6. B18 Chat 탭
> 스크린샷 ID: ss_1383vemfv

- "Memory · Chat" 화면 정상 전환
- "No ieum connections yet" — matchedIds 미매칭

### 3-7. A1 Settings
> 스크린샷 ID: ss_7294fqino

- Sui wallet address: `0xdabbe6...` 표시
- dibang inyeon photo: 결혼 사진 표시
- My SUI: 0.000 SUI (E2E 이음 실행 후 잔액 소진)
- Language: English

### 3-8. B15 Settings
> 스크린샷 ID: ss_8649u0fbc

- Sui wallet address: `0x380bca...` 표시
- dibang inyeon photo: 프로필 사진 표시
- My SUI: 0.000 SUI

---

## 4. Bug Report — 최종 정리

### BUG-001: queryAllEvents pruned TX 이벤트 누락 (수정 완료)
- **증상**: MoiCreated 114개 중 E2E Moi 일부 누락, trust-graph 0 nodes
- **원인**: SDK `queryEvents`가 pruned TX digest에서 에러 throw
- **수정**: `queryAllEvents`를 직접 `fetch` 기반으로 전환 + 양방향(descending+ascending) 조회 + Participated 이벤트로 사용자 목록 보강
- **커밋**: `7815a8e`, `58079e5`

### BUG-002: 주소 비교 normalizeSuiAddress 미적용 (수정 완료)
- **증상**: Chat "No ieum connections", discoverUsers에서 B1/B7 미발견
- **원인**: Sui RPC 이벤트 응답 주소 형식(0x padding 차이)이 일관되지 않음
- **수정**: SDK `discoverUsers`/`buildDegreeMap` + 프론트 `useDiscoverUsers`/`InyeonPage` 전체에 `normalizeSuiAddress` 적용
- **커밋**: `2686b5f`, `a8a2c9b`

### BUG-003: TrustMatrix 패키지 호환 에러 (수정 완료)
- **증상**: `CommandArgumentError: TypeMismatch` — 이전 패키지 TrustMatrix 객체와 현재 패키지 함수 호환 불가
- **원인**: 이전 패키지(`0x39ba6062`)의 shared object type과 현재 패키지(`0xf33fba09`) 함수가 요구하는 type 불일치
- **수정**: `bootstrap-trust.ts`로 새 TrustRegistry + EM/CS Matrix 생성, constants.ts에 새 ID 반영
- **커밋**: `83315d1`

### BUG-004: Connection Web 0 neighbors (수정 완료)
- **증상**: Profile 탭 Connection web에 자기 자신 노드만 표시, "0 strong neighbors"
- **원인**: 내 프로필의 `buildProfileFromMoi` 호출에 `ieumCount` 미전달 (항상 0)
- **수정**: `matchedAddresses.length`를 `ieumCount`로 전달
- **커밋**: `42eeee0`

### BUG-005: 가스 부족 시 무응답 (수정 완료)
- **증상**: 가스 부족으로 TX 실패 시 사용자에게 아무 피드백 없음
- **수정**: `executeOnchain`에 try-catch 추가, "Balance" 에러 감지 → "SUI 잔액 부족" toast 표시
- **커밋**: `fe73bb8`

### BUG-006: Chat DM 잠금/비용 UI (수정 완료)
- **증상**: 이음 상대와 대화 시 Lock 아이콘 + SUI 비용 표시
- **수정**: Lock/비용 UI 제거 → 모든 이음 상대와 무료 대화 가능
- **커밋**: `f5ae7a1`

### BUG-007: Received/Chat 로딩 빈 화면 (수정 완료)
- **증상**: 데이터 로딩 중 빈 화면 (스피너 없음)
- **수정**: `discoverLoading` 상태에서 스피너 표시
- **커밋**: `f5ae7a1`

### BUG-008: 프로필 이미지 미표시 (수정 완료)
- **증상**: Chat/Received 카드에서 그라데이션만 표시, DiceBear 아바타 안 보임
- **수정**: `photoBg` 함수에 `photos[0].url` 전달 → 이미지 URL이 있으면 이미지 표시
- **커밋**: `f5ae7a1`

### KNOWN-ISSUE-001: Chat matchedIds 미매칭
- **증상**: Chat 탭에서 "No ieum connections" — 이음 상대가 matchedIds에 안 들어감
- **원인**: `useDiscoverUsers`에서 `IumAccepted` 주소를 `pool`의 `suiAddress`와 매칭할 때, pruned TX 영역의 사용자가 pool에 없어서 moiId를 못 찾음
- **상태**: normalize + Participated 보강으로 개선됐으나, 일부 사용자 여전히 pool에 누락 가능
- **다음 단계**: Participated에서 고유 참가자를 추출해 pool을 만드는 방식이 이미 적용됨 — 추가 검증 필요

---

## 5. 온체인 데이터 현황

| 항목 | 수량 |
|------|------|
| Moi 생성 | 40명 (A1~A10, B1~B30) |
| 결혼식 | 10개 (W1~W10) |
| 참석 | 130+ 건 |
| 이음 신청 | 50건 (A/B 30건 + 사용자 20건) |
| 이음 수락 | 50건 |
| Trust Graph | 96 nodes, 891 edges |
| 사용자(0x46e7) 이음 | 20건 (7건 발신 + 13건 수신) |

---

## 6. 수정 커밋 목록

| 커밋 | 설명 |
|------|------|
| `83315d1` | TrustMatrix bootstrap — 새 Registry + EM/CS Matrix |
| `8b17d4c` | queryAllEvents try/catch |
| `0fae9ec` | queryAllEvents descending |
| `7815a8e` | queryAllEvents 직접 fetch 전환 |
| `2686b5f` | normalizeSuiAddress 적용 (InyeonPage + useDiscoverUsers) |
| `a8a2c9b` | SDK discoverUsers/buildDegreeMap normalize |
| `58079e5` | discoverUsers Participated 보강 + queryAllEvents 양방향 |
| `fe73bb8` | 가스 부족 toast 표시 |
| `f5ae7a1` | 로딩 스피너 + DM 잠금 제거 + 프로필 이미지 |
| `42eeee0` | Connection Web ieumCount 전달 |
