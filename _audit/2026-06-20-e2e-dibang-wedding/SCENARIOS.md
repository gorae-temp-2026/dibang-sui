# dibang-wedding 전체 서비스 E2E 시나리오 (2026-06-20)

실행 방식: **Playwright MCP**로 워크트리 dev 앱 구동(wedding `http://localhost:5410`, api `:8098`, 로컬 Supabase `:54321`).
레포에 Playwright 러너(`@playwright/test`)가 없어 스펙 파일 대신 MCP 클릭 실행 + 시나리오별 스냅샷/스크린샷으로 검증한다.

전제(공통): 로컬 Supabase 스택 가동, api dev-auth 우회(`DEV_AUTH_BYPASS=true`, dev user `4c53c6ce-…`), dev 지갑 로그인으로 인증.
판정: 각 시나리오의 "기대"가 실제 스냅샷/스크린샷과 일치하면 PASS, 아니면 FAIL(원인 기록). 데이터 없음으로 도달 불가 시 BLOCKED(사유 기록).

표기: 🧩 = 검증되는 상태머신/핵심 로직.

---

## Phase 0 — 환경·세션 셋업 (선행)
- **P0-1** 서버 헬스: `:5410`·`:8098` LISTEN, `GET :8098/health`=ok.
- **P0-2** dev 지갑 로그인: `/login` → "DEV 지갑 로그인" 클릭 → `/my-wedding` 진입(세션 없이 X-Dev-Auth로 인증). 🧩 LoginPage devLogin effect
- **P0-3** ID 발견: `/my-wedding`에서 weddingId·loungeId·slug 확보(카드 액션 버튼 URL에서 추출). 이후 파라미터 라우트에 사용.

---

## A. 인증 · 온보딩
- **A-1 로그아웃** `/settings` → 로그아웃 → `/login`에 머묾(`/my-wedding`으로 안 튕김) + sessionStorage 비워짐. 🧩 zk.logout
- **A-2 로그인 화면 구성** `/login`: dibang 워드마크, 구글 버튼, DEV MODE(이메일·비번·이메일로그인·지갑로그인) 노출.
- **A-3 이메일 로그인 검증** 이메일/비번 비우고 "이메일로 로그인" → `window.alert` 발생(mutate 미호출).
- **A-4 온보딩 게이트** 미인증 보호 라우트 직접 접근 → `/login?redirect=…`로 유도. consents_required 있으면 `/onboarding/consent`.

## B. 나의 결혼식 · 내비게이션
- **B-1 my-wedding 렌더** 결혼식 카드(신랑·신부명, 일시, 장소, D-day 배지) + 액션(리포트·라운지·축의 QR·메모리북) + 하단탭.
- **B-2 하단탭 이동** Inyeon→`/inyeon`, Event list→`/wedding-list`, My event→`/my-wedding`, Setting→`/settings` 정상 전환.
- **B-3 wedding-list** 목록/빈상태(AddCard) 렌더. AddCard → `/invitation/create`.
- **B-4 카드 공유** 공유 버튼 → 공유/복사 동작(클립보드 토스트).

## C. 청첩장 (invitationCreate / invitationEdit 머신)
- **C-1 청첩장 생성 진입** `/invitation/create` → slugGate 단계 노출. 🧩 invitationCreate.machine (slugGate)
- **C-2 생성 플로우** slug 확정 → editing 단계 진입(폼). 🧩 CONFIRM_SLUG → editing
- **C-3 청첩장 수정** `/invitation/edit/:weddingId` 진입 → 기존 값 로드 + 편집 폼. 🧩 invitationEdit.machine
- (주의: 실제 저장은 DB 변경 — 생성/수정은 "진입·검증 단계까지"만, 저장 버튼은 데이터 오염 방지 위해 선택적.)

## D. 디방 인연 (inyeon.machine — 이번 작업 핵심)
- **D-1 카드 탐색** `/inyeon` 렌더(디방인연·요네 1,250·익명 카드). 사진 이전/다음(PHOTO_NAV), 넘기기(SWIPE_NEXT)로 큐 변화. 🧩 PHOTO_NAV/SWIPE_NEXT
- **D-2 사진 잠금 해제** 추가 사진 열기 → 요네 PHOTO_COST(20) 차감 + 잠금 해제. 🧩 UNLOCK_PHOTOS guard
- **D-3 이음 신청(성사)** 카드 "이음 신청" → 한마디 시트(composing) → 입력(SET_MESSAGE, 버튼 활성) → 보내기 → 650ms 후 매칭 오버레이(서아). 🧩 OPEN_IEUM→composing→sending(invoke)→matched [기검증]
- **D-4 매칭 후 채팅 이동** 매칭 오버레이 "대화 시작하기" → chat 화면 + 해당 모이 매칭 목록. 🧩 DISMISS_MATCH + NAV chat
- **D-5 매칭범위 필터** 헤더 슬라이더 버튼 → 시트 → 범위 조정 → "이 범위로 보기" → 큐 재구성. 🧩 OPEN_FILTER/SET_FILTER
- **D-6 받은이음 수락/거절** 받은이음 탭 → 받은 신청 "이음 수락"(→matched·chatOpen) / "거절"(→목록 제거). 🧩 ACCEPT_REQ/DECLINE_REQ
- **D-7 채팅 DM 게이트·전송** 채팅 탭 → 대화 "열기"(요네 게이트 OPEN_DM_ROOM) → 방 입장 → 메시지 전송 → 900ms 자동응답. 🧩 OPEN_DM_ROOM/SEND_DM/DM_REPLY
- **D-8 메모리 뷰어** 채팅 메모리 스트립 썸네일 클릭 → 풀스크린 메모리 뷰어 → 닫기. 🧩 OPEN_MEMORY/CLOSE_MEMORY
- **D-9 오버레이 전환** 카드 "프로필 보기"(상세 시트) → "이음 신청"(상세 닫힘+이음) / "전체 프로필"(상세 닫힘+프로필). 🧩 OPEN_DETAIL/OPEN_PROFILE/OPEN_IEUM 전환규칙
- **D-10 NAV 리셋/보존(회귀 가드)** 채팅서 DM방 연 뒤 ① 유니버스로 이동 후 복귀 → 방 닫힘/대화 초기화, ② 같은 "채팅" 탭 재클릭 → 방·메시지 유지. 🧩 NAV 가드(이번 수정)
- **D-11 내 프로필** 프로필 탭(MeScreen) → 신뢰잔액 카드 → "내 전체 프로필" → 공유 ProfileSheet. 🧩 OPEN_MY_PROFILE

## E. 웨딩 라운지 V2
- **E-1 라운지 진입** `/lounge/:loungeId/v2`(또는 `/enter` 게이트 통과) 렌더: 상단바·피드·LIVE 섹션. 🧩 loungeCheckInGate / loungeV2.machine
- **E-2 LIVE 축하메시지** LIVE 섹션 노출(메시지 없으면 QR 안내 카드, 있으면 회전 카드). 🧩 liveCelebration.machine
- **E-3 작성/선물/공지** 작성(ComposeModal)·선물(GiftSheet)·공지(announce) 시트 오픈·닫기.
- **E-4 모이가모인곳 진입** 라운지 미리보기 카드 → `/lounge/:loungeId/moi-gather`.

## F. 모이가 모인곳 (moiPlaza.machine)
- **F-1 광장 렌더** PixiJS 캔버스·상단바(요네)·테마 토글(결혼식/파티/클럽)·조작 힌트. 🧩 moiPlaza init
- **F-2 테마 스왑** 테마 버튼 클릭 → 데코 세트 전환. 🧩 SET_THEME
- **F-3 샵 구매** 샵 → 아이템 구매(요네 차감 + 자동 배치/장착), 요네 부족 시 차단(에러). 🧩 PURCHASE guard/invoke
- **F-4 모이→프로필→이음→토스트** 광장 모이 클릭 → 프로필(lounge 컨텍스트) → 이음 → 토스트 노출 후 2600ms 자동 소멸. 🧩 SHOW_TOAST/CLEAR_TOAST 타이머

## G. 결혼식 하위 페이지
- **G-1 리포트(원장)** `/wedding/:weddingId/report` 렌더. 🧩 LedgerPage
- **G-2 메모리북** `/wedding/:weddingId/memory-book` 렌더 + `/curate` 큐레이션 페이지.
- **G-3 공유사진 업로드** `/lounge/:loungeId/share-photos/upload` 렌더. 🧩 sharePhotoUpload.machine

## H. 기타
- **H-1 설정 마케팅 토글** `/settings` 마케팅 수신 동의 토글 → 변경 토스트.
- **H-2 네트워크** `/network` 렌더.
- **H-3 QR/DM 페이지** `/qr`·`/dm` 렌더.

---

## 실행 원칙
- 데이터 변경(생성/저장/구매/전송/공지)은 로컬 Supabase에만 영향. 비가역 우려 시 "진입·시트 오픈까지"로 한정하고 저장은 생략(시나리오에 명시).
- 각 시나리오: 스냅샷으로 요소 확인 → 핵심 1~2 스크린샷. 실패 시 콘솔/네트워크 로그 첨부.
- 결과는 본 폴더 `RESULTS.md`에 PASS/FAIL/BLOCKED로 집계.
