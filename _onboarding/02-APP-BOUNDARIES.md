# 02 — 앱 경계 (가장 헷갈리기 쉬운 곳)

> 원본: `_architecture/APP_SCOPE.md`. 이전 세션이 여기를 안 읽고 **익명 앱(guest-web)에 로그인을
> 붙이는** 실수를 했다. 온체인/zkLogin을 어느 앱에 넣을지 결정하는 문서이므로 정확히 이해하라.

---

## 경계 기준: "전환 퍼널이냐 서비스 본체냐"

- **비로그인 전환 퍼널** (공유 링크/QR 착지 → 참여 경험 → 라운지 진입 유도) → **guest-web**
- **로그인 서비스 본체** (식별된 Host/Guest의 모든 Use Case) → **dibang-wedding**

로그인 여부는 경계를 **보조 설명**할 뿐 유일 기준은 아니다. 핵심은: **전환 퍼널 전체가 guest-web,
그 이후 식별된 사용자의 본체 기능이 dibang-wedding.**

> 이력: 축의(현금 송금) 경험을 dibang-wedding(로그인)에서 guest-web(비로그인)으로 옮기기로 2026-05-18
> 확정. 그래서 **돈(축의)도 비로그인 퍼널을 지난다.** "비로그인이면 최소 행위만"이 아니다.

---

## guest-web — 비로그인 전환 퍼널

**역할**: 공유 링크/QR의 착지점. 두 퍼널로 **웨딩 라운지(dibang-wedding) 진입을 유도.** **로그인 없음이 설계.**

### 퍼널 A — 모바일 청첩장
가능(로그인 없이): 청첩장 보기, 청첩장 하트, 라운지 티저 확인.
종착: 청첩장 응답에 라운지 이름·방문자 수를 노출해 라운지 진입 유도.

### 퍼널 B — 방명록·메시지·축의
가능(로그인 없이, 순서): 누구측(6슬롯) → 관계/이름 입력(GuestbookEntry) → 금액 선택 → 송금(CashGift) →
축하 메시지(GuestbookMessage) 또는 하트 → 완료.
종착: 완료 화면 "사진 공유" 후킹 → 라운지 진입 유도.

### guest-web이 호출하는 엔드포인트 (전부 `public`)
- `getInvitation`, `heartInvitation` (퍼널 A)
- `getWedding` (QR 플로우, public)
- `createGuestbookEntry`, `createGuestbookMessage`, `createCashGift` (퍼널 B)
- (계획) `/display` 라우트

### 라운지 진입 유도
두 퍼널의 종착은 모두 라운지다. 라운지 진입(LoungeCheckIn 생성, 라운지 열람)은 **식별된 사용자의 행위**
이므로 **dibang-wedding `/lounge/{loungeId}/enter`** 로 보낸다. 이 경로는 AuthGuard 뒤 → 비로그인 하객은
자연히 로그인 퍼널을 거쳐 라운지로 들어간다.

> **온체인 함의**: guest-web은 익명이다. 익명 하객의 방명록/축의를 온체인에 남기려면 (1) 라운지 로그인 후
> **claim**으로 본인 지갑 귀속(1순위) 또는 (2) **서비스 대리서명**(임시 fallback). guest-web 자체에
> zkLogin 로그인 UI를 넣지 않는다. (VISION §5)

---

## dibang-wedding — 로그인 서비스 본체

**역할**: 서비스 본체. 로그인한 Host·Guest 모두 사용. 전환 퍼널 이후 **모든 식별된 행위.** 도메인 모델의
`RegisterUser` + `CreateMoi` 이후 모든 Use Case가 여기에 해당.

### Host 기능
결혼식 만들기(Wedding+Lounge+GatherPlace+Invitation 복합 생성), 결혼식 정보 수정, 청첩장 수정/추가/공유,
공지 발행/수정/삭제, 인테리어 아이템 추가/배치, 호스트 초대, **축의 장부(웨딩 리포트)**, 메모리북 큐레이션.

### Guest 기능 (로그인)
라운지 입장(LoungeCheckIn), 모이가모인곳 조회·방문 모이 열람, 방명록·공지 조회, 피드 하트·댓글,
(추후) QR 페이지를 통한 로그인 상태 메시지·축의.

### 공통 (Host+Guest)
모이 꾸미기(아이템 장착/해제), 모이 아이템 선물, **이음(Ium) 생성/조회/삭제**, 프로필 조회/수정.

### dibang-wedding이 호출하는 엔드포인트
위 `public` 외 거의 전부: `getMe`/`updateMe`/`getMyWeddings`/`listMyIums`, `createWedding`/`updateWedding`,
청첩장 관리, `getLounge`/`createLoungeCheckIn`/`listFeed`, `toggleFeedHeart`/`createFeedComment`,
축의 장부(`listCashGifts`/`getCashGiftsSummary`/…, host), 메모리북, 공유사진, gather-places, interior-items,
mois, moi-items, iums, host-invites(호스트 측), uploads, consents.

> **온체인 함의**: **zkLogin·온체인 신원·신뢰네트워크(Moi/Ium)는 모두 dibang-wedding 소속.**

---

## admin — 별도 운영 read-only 앱

`apps/admin`. 운영자용 앱. 조회(유저/웨딩/감사 로그) **+ 운영 mutation(웨딩 삭제·호스트 슬롯 이동·유저
수정 등 파괴적 작업 포함)** — 모두 AdminGuard(허용 이메일 allowlist) 보호. 퍼널/본체 경계 밖.
(live `api-contract.yaml`의 admin operation은 30여 개로 적지 않음 — "read-only"로 과소평가 말 것.)

---

## display — 경계 밖 (추후)

현장 디스플레이에 하객 메시지를 표출하는 기능. `APP_SCOPE.md`상 두 앱 범위 **밖**(추후 별도). 다만 이를
guest-web의 public 라우트 `/display`로 포팅하는 시나리오가 존재(미구현 `[ ]`).

---

## 한눈 요약

```
                  ┌─ 퍼널 A: 청첩장 + 하트 + 라운지 티저 ──────────┐
 guest-web ───────┤                                                ├──→ 라운지 진입 유도
 (비로그인 퍼널)   └─ 퍼널 B: 방명록·메시지·축의 → '사진 공유' 후킹 ─┘            │
                                                                                ▼
                                              dibang-wedding /lounge/{loungeId}/enter
                                              (로그인 후 라운지·모이·이음·관리·장부 등 본체 전부)
                                              ↑ zkLogin·온체인 신원·신뢰네트워크는 여기
```

| 구분 | guest-web | dibang-wedding | admin |
|------|-----------|----------------|-------|
| 로그인 | ❌ 익명 퍼널 | ✅ 로그인 본체 | ✅ 운영자 allowlist |
| 접근 정책 | public만 | authenticated/owner/host | admin guard |
| 온체인 신원/zkLogin | ❌ (claim/대리서명) | ✅ 여기 | — |
| 돈(축의) | ✅ 퍼널 B(익명 기록) | 장부 조회(host) | — |
