# API 엔드포인트 매핑

> 분류 기준: path의 첫 번째 세그먼트(루트 리소스). `/users/me/*` 패턴은 Users에 배치.
> 접근 정책: public / authenticated / owner / host (API_CONVENTIONS.md §2 참조)
> 소비자: Guest Web, Dibang Wedding
> 이름 마스킹: API_CONVENTIONS.md §3 참조. 🔒 표시된 엔드포인트에 적용

## Users

| Method | Path | operationId | 접근 정책 | 소비자 | 설명 |
|--------|------|-------------|-----------|--------|------|
| GET | /users/me | getMe | owner | Dibang Wedding | 현재 로그인 사용자 조회 |
| PATCH | /users/me | updateMe | owner | Dibang Wedding | 프로필 수정 |
| GET | /users/{userId} | getUser | authenticated | Dibang Wedding | 다른 사용자 공개 프로필 🔒 이름 마스킹 |
| GET | /users/me/weddings | getMyWeddings | owner | Dibang Wedding | 내가 Host인 결혼식 목록 |
| GET | /users/me/participated-weddings | getMyParticipatedWeddings | authenticated | Dibang Wedding | 내가 참여한 결혼식 목록 |
| GET | /users/me/iums | listMyIums | owner | Dibang Wedding | 내 이음 목록 |

## Weddings

| Method | Path | operationId | 접근 정책 | 소비자 | 설명 |
|--------|------|-------------|-----------|--------|------|
| POST | /weddings | createWedding | authenticated | Dibang Wedding | 복합 생성 (Lounge+GatherPlace+Invitation 포함) |
| GET | /weddings/{weddingId} | getWedding | public | Guest Web + Dibang Wedding | 결혼식 상세 (QR 플로우 비로그인 접근) |
| PATCH | /weddings/{weddingId} | updateWedding | host | Dibang Wedding | WeddingInfo 수정 |

## Invitations (청첩장)

| Method | Path | operationId | 접근 정책 | 소비자 | 설명 |
|--------|------|-------------|-----------|--------|------|
| GET | /invitations/{slug} | getInvitation | public | Guest Web | 공유 링크로 청첩장 조회 (visited_count++) |
| POST | /invitations/{slug}/heart | heartInvitation | public | Guest Web | 하트 (heart_count++) |
| POST | /weddings/{weddingId}/invitations | createInvitation | host | Dibang Wedding | 기존 결혼식에 청첩장 추가 |
| PATCH | /weddings/{weddingId}/invitations/{invitationId} | updateInvitation | host | Dibang Wedding | 청첩장 수정 |
| DELETE | /weddings/{weddingId}/invitations/{invitationId} | deleteInvitation | host | Dibang Wedding | 청첩장 삭제 (최소 1개 유지) |
| GET | /weddings/{weddingId}/invitations/{invitationId}/share | shareInvitation | host | Dibang Wedding | 공유 링크 조회 |

## Lounges (라운지)

| Method | Path | operationId | 접근 정책 | 소비자 | 설명 |
|--------|------|-------------|-----------|--------|------|
| GET | /lounges/{loungeId} | getLounge | authenticated | Dibang Wedding | 라운지 정보 (GatherPlace 포함) |
| POST | /lounges/{loungeId}/entries | createLoungeCheckIn | authenticated | Dibang Wedding | 라운지 입장 (LoungeCheckIn 생성) |
| GET | /lounges/{loungeId}/entries/mine | getMyLoungeCheckIn | authenticated | Dibang Wedding | 내 라운지 입장 기록 조회 |

## Guestbook (방명록)

| Method | Path | operationId | 접근 정책 | 소비자 | 설명 |
|--------|------|-------------|-----------|--------|------|
| GET | /lounges/{loungeId}/guestbook | listGuestbookEntries | public | Guest Web + Dibang Wedding | 방명록 목록 (cursor pagination) 🔒 guest_name 마스킹 |
| POST | /lounges/{loungeId}/guestbook | createGuestbookEntry | public | Guest Web + Dibang Wedding | 방명록 작성 |
| GET | /lounges/{loungeId}/guestbook/mine | getMyGuestbookEntry | authenticated | Dibang Wedding | 내 방명록 조회 |
| POST | /guestbook/{entryId}/message | createGuestbookMessage | public | Guest Web | 방명록 메세지(피드 글) 생성 — text + photo_url(선택) |
| POST | /guestbook/messages/{messageId}/view | recordGuestbookMessageView | authenticated | Dibang Wedding | 피드 글 조회 기록 (작성자 본인 제외·중복 멱등, 204) |
| POST | /guestbook/{entryId}/claim | claimGuestbookEntry | authenticated | Dibang Wedding | 비로그인 방명록을 현재 유저에 연결 |

## Announcements (공지)

| Method | Path | operationId | 접근 정책 | 소비자 | 설명 |
|--------|------|-------------|-----------|--------|------|
| GET | /lounges/{loungeId}/announcements | listAnnouncements | public | Dibang Wedding | 공지 목록 |
| POST | /lounges/{loungeId}/announcements | createAnnouncement | host | Dibang Wedding | 공지 발행 |
| PATCH | /announcements/{announcementId} | updateAnnouncement | host | Dibang Wedding | 공지 수정 |
| DELETE | /announcements/{announcementId} | deleteAnnouncement | host | Dibang Wedding | 공지 삭제 (soft delete) |

## Feed (라운지 피드)

| Method | Path | operationId | 접근 정책 | 소비자 | 설명 |
|--------|------|-------------|-----------|--------|------|
| GET | /lounges/{loungeId}/feed | listFeed | authenticated | Dibang Wedding | 피드 통합 조회 (GuestbookEntry + LoungeCheckIn + HostAnnouncement 최신순 cursor pagination) |

## FeedHearts (피드 하트)

| Method | Path | operationId | 접근 정책 | 소비자 | 설명 |
|--------|------|-------------|-----------|--------|------|
| POST | /feed-hearts | toggleFeedHeart | authenticated | Dibang Wedding | 하트 토글 (있으면 삭제, 없으면 생성) |

## FeedComments (피드 댓글)

| Method | Path | operationId | 접근 정책 | 소비자 | 설명 |
|--------|------|-------------|-----------|--------|------|
| POST | /feed-comments | createFeedComment | authenticated | Dibang Wedding | 댓글 작성 |
| GET | /feed-comments | listFeedComments | authenticated | Dibang Wedding | 댓글 목록 (?target_type=x&target_id=y) |
| DELETE | /feed-comments/{commentId} | deleteFeedComment | authenticated (본인) | Dibang Wedding | 댓글 삭제 (soft delete) |

## CashGifts (축의금)

| Method | Path | operationId | 접근 정책 | 소비자 | 설명 |
|--------|------|-------------|-----------|--------|------|
| POST | /cash-gifts | createCashGift | public | Guest Web | 축의금 기록 (비로그인, 퍼널 B) |
| GET | /weddings/{weddingId}/cash-gifts | listCashGifts | host | Dibang Wedding | 축의금 장부 목록 |
| POST | /weddings/{weddingId}/cash-gifts | hostCreateCashGift | host | Dibang Wedding | 축의금 수동 추가 (호스트) |
| GET | /weddings/{weddingId}/cash-gifts/summary | getCashGiftsSummary | host | Dibang Wedding | 축의금 요약 (총액·건수·참석) |
| PATCH | /weddings/{weddingId}/cash-gifts/{giftId} | updateCashGift | host | Dibang Wedding | 축의금 수정 |
| DELETE | /weddings/{weddingId}/cash-gifts/{giftId} | deleteCashGift | host | Dibang Wedding | 축의금 삭제 |

## MemoryBook (웨딩메모리북)

| Method | Path | operationId | 접근 정책 | 소비자 | 설명 |
|--------|------|-------------|-----------|--------|------|
| GET | /weddings/{weddingId}/memory-book | getWeddingMemoryBook | host | Dibang Wedding | 큐레이션 사진 + 모청 사진 + 자동선별 메시지(__HEART__ sentinel) + 통계 |
| PUT | /weddings/{weddingId}/memory-book/photos | replaceWeddingMemoryBookPhotos | host | Dibang Wedding | 큐레이션 사진 일괄 교체 (max 30, 원자적 RPC) |

## SharedPhotos (wedding 단위)

| Method | Path | operationId | 접근 정책 | 소비자 | 설명 |
|--------|------|-------------|-----------|--------|------|
| GET | /weddings/{weddingId}/shared-photo-groups | getWeddingSharedPhotoGroups | host | Dibang Wedding | wedding의 모든 라운지의 공유 사진을 게스트별 그룹으로 묶어 반환 (메모리북 큐레이션 페이지용) |

## GatherPlaces (MoiGatherPlace)

| Method | Path | operationId | 접근 정책 | 소비자 | 설명 |
|--------|------|-------------|-----------|--------|------|
| GET | /gather-places/{placeId} | getGatherPlace | public | Dibang Wedding | GatherPlace 상세 |
| GET | /gather-places/{placeId}/check-ins | listLoungeCheckIns | public | Dibang Wedding | 방문 모이 목록 🔒 visitor_name 마스킹 |

## Interior Items (인테리어)

| Method | Path | operationId | 접근 정책 | 소비자 | 설명 |
|--------|------|-------------|-----------|--------|------|
| GET | /gather-places/{placeId}/interior-items | listInteriorItems | public | Dibang Wedding | 아이템 목록 |
| POST | /gather-places/{placeId}/interior-items | createInteriorItem | host | Dibang Wedding | 아이템 추가 |
| PATCH | /interior-items/{itemId}/position | placeInteriorItem | host | Dibang Wedding | 아이템 배치 |
| DELETE | /interior-items/{itemId}/position | unplaceInteriorItem | host | Dibang Wedding | 배치 해제 |

## Mois (모이)

| Method | Path | operationId | 접근 정책 | 소비자 | 설명 |
|--------|------|-------------|-----------|--------|------|
| GET | /mois/me | getMyMoi | owner | Dibang Wedding | 내 모이 (equipped_items 포함) |
| GET | /mois/{moiId} | getMoi | public | Dibang Wedding | 특정 모이 조회 🔒 소유자 이름 마스킹 |

## Moi Items (모이 아이템)

| Method | Path | operationId | 접근 정책 | 소비자 | 설명 |
|--------|------|-------------|-----------|--------|------|
| GET | /mois/me/items | listMyMoiItems | owner | Dibang Wedding | 내 아이템 목록 |
| POST | /mois/me/items/{itemId}/equip | equipMoiItem | owner | Dibang Wedding | 장착 |
| POST | /mois/me/items/{itemId}/unequip | unequipMoiItem | owner | Dibang Wedding | 해제 |
| POST | /mois/me/items/{itemId}/send | sendMoiItem | owner | Dibang Wedding | 선물 |

## Iums (이음)

| Method | Path | operationId | 접근 정책 | 소비자 | 설명 |
|--------|------|-------------|-----------|--------|------|
| POST | /iums | createIum | authenticated | Dibang Wedding | 이음 생성 |
| DELETE | /iums/{iumId} | deleteIum | owner | Dibang Wedding | 이음 삭제 |

## HostInvites (호스트 초대 — 부모/배우자)

| Method | Path | operationId | 접근 정책 | 소비자 | 설명 |
|--------|------|-------------|-----------|--------|------|
| GET | /weddings/{weddingId}/host-invites | listHostInvites | host | Dibang Wedding | 호스트 초대 목록 |
| POST | /weddings/{weddingId}/host-invites | createHostInvite | host | Dibang Wedding | 호스트 초대 생성 (부모 4·배우자 슬롯, 같은 슬롯 pending 재사용) |
| DELETE | /weddings/{weddingId}/host-invites/{inviteId} | cancelHostInvite | host | Dibang Wedding | 호스트 초대 취소 (pending만) |
| GET | /host-invites/{token} | getHostInvite | public | Dibang Wedding | 초대 정보 조회 (비로그인 가능) |
| POST | /host-invites/{token}/accept | acceptHostInvite | authenticated | Dibang Wedding | 초대 수락 (슬롯 할당) |

> 분류 근거: api-contract.yaml `tags: [HostInvites]`와 일치 (LESSON: 매핑문서 섹션 = spec 첫 tag).

## Uploads (파일 업로드)

| Method | Path | operationId | 접근 정책 | 소비자 | 설명 |
|--------|------|-------------|-----------|--------|------|
| POST | /uploads | uploadFile | authenticated | Dibang Wedding | 이미지 업로드 → Supabase Storage public URL. multipart라 oapi-codegen strict 밖 수동 핸들러, 계약엔 정식 선언(R5). 비인증 401·확장자 검증·10MB |

> 분류 근거: api-contract.yaml `tags: [Uploads]`와 일치. /uploads/* 로컬 FileServer는 R5에서 제거(B2 디렉토리 리스팅 해소) — Supabase Storage가 서빙.

## 총 엔드포인트

**전체 58개** — `packages/contracts/api-contract.yaml`의 `operationId` 기준 (단일 진실원, deprecated 14개 포함: 계약에 선언된 operation은 카운트). 본 문서 표 등록분 = 58, spec과 1:1 정합.

> **R7 (2026-05-18):** 감사 7-4 "수치 4중 불일치(INDEX 30 / 옛 푸터 39 / 표 45 / spec 57)" 해소. 재측정 결과 spec은 57→**58**(R5 `POST /uploads` 추가분). 미문서 9 op 추가(CashGifts host 5 + Guestbook 3 + Lounges 1; HostInvites 5는 R3 등록분, 중복 없음). INDEX.md:16·API_CONVENTIONS §3(`listVisits`→`listLoungeCheckIns`) 동기화. **잔존(R7 밖):** `heartInvitation` error 응답 미정의(계약 변경 동반), 스펙→문서 자동생성 도입(권고 — 수기 동기화 LESSON 재발 확인), `_scenario`·DOMAIN_MODEL 깊은 재동기화(별도).

> **R4 (2026-05-18):** Mois·Moi Items·Iums·Interior Items·GatherPlaces 섹션의 14개 op은 계약상 `deprecated`·백엔드 501·프론트 전무(미구현·추후). `getUser`는 deprecated 아님 — 이름 마스킹(§3) 의존 cross-cutting이라 "우선 구현 예정" 분류(별도 후속 권고). 전체 수치 정합은 R7.
