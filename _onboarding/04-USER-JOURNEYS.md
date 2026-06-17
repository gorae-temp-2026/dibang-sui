# 04 — 사용자 여정 (전 흐름)

> 원본: `_scenario/*/SCENARIOS.md` + `_architecture/API_ENDPOINT_MAP.md`. 시나리오가 도메인 모델과
> 어긋나면 **도메인 모델/엔드포인트맵 우선**(각 여정에 충돌 메모). 접근 정책은 03-IDENTITY-AND-AUTH 참조.

---

## (a) 익명 현장 하객 — QR → 방명록·축의 (guest-web, 비로그인)

1. 현장 QR 스캔 → `guest/?weddingId=...` → guest-web 착지. (정책: 없음)
2. 결혼식 정보 표시: `GET /weddings/{weddingId}` (`getWedding`, **public**). 상단 신랑/신부·날짜·사진 + 하단 누구측 6슬롯.
3. **누구측 선택**(recipient_slot 6종: groom/bride/groom_father/groom_mother/bride_father/bride_mother).
4. **관계/이름**: 관계 카테고리 6종(가족·친척/친구·지인/동문·동창/직장동료/스승·제자/기타모임) + 자유서술(≤40) + 이름(≤10 — 도메인 기준; 계약 상한은 20)
   → `POST /lounges/{loungeId}/guestbook` (`createGuestbookEntry`, **public**, guest_id optional). **Entry 생성 = 참석 기록.**
5. **금액 선택**(±1만/±5만) → 또는 "이미 축의함"/"건너뛰기"(기록 없이 메시지로).
6. **축의 전달**: 계좌 복사 또는 토스/카카오 딥링크 → `POST /cash-gifts` (`createCashGift`, **public**). pay_method ∈ transfer/kakaopay/toss(/cash).
7. **축하 메시지**(≤60 — `createGuestbookMessage` 요청 계약값; 단 방명록 생성 시 동봉하는 첫 메시지(`createGuestbookEntry`)는 ≤70으로 **계약 내 혼재**) 또는 하트만 → `POST /guestbook/{entryId}/message` (`createGuestbookMessage`, **public**). 하트만일 때 message=`__HEART__` sentinel(피드에 하트 아이콘).
8. **완료** → "사진 공유하기" 후킹 → dibang-wedding `/lounge/{loungeId}/enter`(로그인 게이트)로 유도.
- 제약: 같은 사람 두 번 = 두 기록. 진입은 적어도 축의/메시지 중 하나.
- **온체인**: 익명이라 서명자 없음 → claim(1순위) 또는 서비스 대리서명(fallback). (VISION §5)

## (b) 로그인 유저 라운지 입장 (dibang-wedding)

1. 진입: 청첩장 "라운지 탭"의 입장 버튼 또는 guest-web 완료의 "사진 공유" → 리다이렉트 → 로그인.
2. `POST /lounges/{loungeId}/entries` (`createLoungeCheckIn`, **authenticated**). LoungeCheckIn 생성 + 내 Wedding List에 추가. (user×lounge 1건; 재입장 시 신규 없음 — 멱등)
3. 라운지 페이지: 다크 헤더(신랑/신부·한국식 날짜·예식장·참석자 아바타 최대 5+"+N") + 통합 피드.
4. `GET /lounges/{loungeId}/feed` (`listFeed`, **authenticated**): GuestbookEntry + LoungeCheckIn + HostAnnouncement 최신순 cursor, 5초 폴링 + pull-to-refresh.
5. 피드 액션(**authenticated**): `toggleFeedHeart`(1인 1하트 토글), `createFeedComment`(≤50, 1depth, 본인만 삭제), `recordGuestbookMessageView`(작성자 제외 멱등).
- 충돌 메모: 시나리오의 "LoungeEntry/MoiVisit" 명칭 → 도메인/계약은 **LoungeCheckIn**(`createLoungeCheckIn`).

## (c) 호스트 결혼식 생성/관리 (dibang-wedding)

- **복합 생성**: `POST /weddings` (`createWedding`, **authenticated**) → Wedding + WeddingLounge(1:1) + MoiGatherPlace(1:1) + MobileInvitation(1, 추가 가능)을 **한 트랜잭션**으로.
- 관리(모두 **host**): `PATCH /weddings/{id}`(정보 수정), 청첩장 추가/수정/삭제(최소 1개 유지)/공유, 공지 발행/수정/삭제, 인테리어 추가/배치/해제.

## (d) 호스트 초대 — 부모/배우자 슬롯 (dibang-wedding)

1. 신랑/신부(Host만)가 빈 슬롯 탭 → `POST /weddings/{weddingId}/host-invites` (`createHostInvite`, **host**) → token, status `pending`. 같은 슬롯 pending이면 토큰 재사용.
2. 카카오/링크 공유.
3. 피초대자(익명) `/invite/{token}` → `GET /host-invites/{token}` (`getHostInvite`, **public**): 결혼식 요약 + 슬롯 + 로그인 유도.
4. 로그인 후 `POST /host-invites/{token}/accept` (`acceptHostInvite`, **authenticated**) → 슬롯에 user_id 할당, status `accepted`.
5. 취소: `cancelHostInvite`(**host**), **pending만**. **accepted는 취소 불가.**
- 부모 Host 권한 = 풀 Host **except 청첩장 수정/추가**. 라운지·웨딩리포트 접근 가능. 한 user가 여러 슬롯이면 최고 권한 우선(groom>bride>parent).
- **온체인 함의**: 6 host 슬롯 = capability 집합. host-invite = 권한 이전(토큰). accepted 취소불가 ↔ 온체인 finality와 자연 정합.

## (e) 온보딩/동의 (dibang-wedding)

- 첫 로그인 → `/onboarding/consent` 인터셉트. 필수 3(age/service/privacy) + 선택 1(marketing).
- `GET /me`의 `consents_required`로 판정. `POST /consents`(append-only) + `POST /consents/marketing`.
- 구현됨(dev). IP/UA 캡처 stub(NULL). 거부/로그아웃 분기 없음(미체크면 버튼 비활성).

## (f) 웨딩 리포트 / 축의 장부 (dibang-wedding, host)

- 진입: MyWedding 모청 카드 → 리포트 → `/wedding/{weddingId}/report`.
- 요약 카드(총 축의·건수·참석) + 시간순 목록(무한 스크롤) + 상세 drawer + 수정/삭제 + CSV + 수동 추가.
- 엔드포인트(모두 **host**): `listCashGifts`, `hostCreateCashGift`(수동 추가), `getCashGiftsSummary`, `updateCashGift`, `deleteCashGift`.
- **충돌 메모**: 시나리오는 `/report/gifts...` 경로, 엔드포인트맵(R7)은 `/weddings/{id}/cash-gifts...` → **엔드포인트맵 우선**(report/gifts는 옛 명칭). 측 필터 없음(v3는 채널 분리 없이 host 슬롯만).

## (g) 메모리 / 메모리북 — 이름 충돌 주의

- **Memory(`v3_memories`)**: 라운지 V2 1인 1포스트(text 필수 ≤60 + 사진 1장 선택), `author_user_id` 직접 식별(Entry 의존 없음). "온기" 그리드(1인 collapse) + 활동로그. 게스트·호스트 모두 작성, 본인만 soft delete, 수정 없음. `createMemory`/`listMemories`/`deleteMemory`(authenticated). **상태: in-flight(`[ ]`), 엔드포인트맵엔 없음 — 미확정.**
- **MemoryBook(`v3_memory_book_photos`)**: 결혼식 후 **호스트**가 만드는 큐레이션 사진+메시지 책자. `getWeddingMemoryBook`(host) + `replaceWeddingMemoryBookPhotos`(host, max 30, 원자적 RPC). 큐레이션 소스=`v3_shared_photos`, 표시 사진=`v3_mobile_invitation_photos`, 메시지=`__HEART__` sentinel + slot→side 매핑 자동선별. **상태: 구현됨**(BE 32/32, UI 포팅).

## (h) 사진 공유 — 3종 (dibang-wedding)

- **mobile-invitation**(`v3_mobile_invitation_photos`): 호스트 커버1+갤러리≤60, **public read, 무만료**.
- **memory**(`v3_guestbook_messages.photo_url`): 라운지 메시지 첨부 사진, **private + signed URL**.
- **share**(`v3_shared_photos`): 하객이 호스트에게 현장 사진 업로드, **≤100/하객**, `v3-share/{loungeId}/{guestUserId}/...`, **private**. 하객은 본인 폴더만 업로드/조회, **호스트는 전체 조회**, zip 다운로드(host).
- 모든 업로드 **presigned**(`createPresignedUpload`, authenticated → 업로드는 로그인). HEIC→JPEG 클라 변환.
- **보안 갭**: dev는 단일 public 버킷(obscurity-only). **prod는 `v3-uploads-public`+`v3-uploads-private` 분리 필요.** 공개 체인 노출 전 private 사진은 실제 접근제어 필요.

## (i) 디스플레이 (경계 밖, 미구현 `[ ]`)

- 현장 디스플레이에 하객 메시지 표출. guest-web public `/display?weddingId=...`로 포팅하는 시나리오 존재.
- 레거시 픽셀 포팅. wedding/photos는 v3 API, entries/messages는 **Supabase 직접**(seed+catch-up+Realtime). `__HEART__` → SVG 스티커. `guestbook_messages.lounge_id` 비정규화 컬럼 필요.

---

## 충돌 메모 요약 (시나리오 vs 도메인/계약 — 후자 우선)
1. 장부 경로: `report/gifts`(시나리오) → `cash-gifts`(엔드포인트맵 R7).
2. `GuestbookEntry.message`: 2026-05-25 **컬럼 드롭**, 본문은 `GuestbookMessage`로 일원화. 시나리오의 entry.message는 옛것.
3. 명칭: "LoungeEntry/MoiVisit" → **LoungeCheckIn**.
4. Memory(`v3_memories`) 구현 상태 in-flight(엔드포인트맵 미등재).
