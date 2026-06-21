# dibang-wedding E2E 실행 결과 (2026-06-20)

실행: Playwright MCP, 워크트리 dev(wedding `:5410` / api `:8098` / 로컬 Supabase). 인증: dev 지갑 로그인.
대상 데이터: weddingId `22f0cd64-…`(김신랑&김신부), loungeId `9a14d009-…`. slug 미설정.

범례: ✅ PASS · ❌ FAIL · ⛔ BLOCKED(도달 불가) · ⚪ NOT-RUN(유닛테스트로 커버 또는 이번 스윕 미실행)

## 요약
- 실행 PASS **22** · FAIL **1** · BLOCKED **1** · NOT-RUN **다수(아래 명시)**
- **핵심(이번 작업 = 디방인연/모이광장/LIVE 머신)은 실브라우저 PASS.**
- 발견 결함 1건: **마케팅 동의 토글 저장 500**(consent 백엔드, dibang-inyeon 범위 밖).

## Phase 0
- ✅ P0-1 서버 헬스(:5410·:8098 LISTEN, /health=ok)
- ✅ P0-2 dev 지갑 로그인 → /my-wedding
- ✅ P0-3 ID 발견(weddingId·loungeId; my-weddings 5건)

## A. 인증·온보딩
- ✅ A-1 로그아웃 → `/login?redirect=/settings` 머묾(안 튕김)
- ⚪ A-2 로그인 화면 구성(부분 확인: 워드마크·구글·DEV MODE 노출 봄) / A-3 이메일 빈값 alert / A-4 온보딩 게이트 — 이번 스윕 미실행(A-4 redirect 동작은 A-1에서 간접 확인)

## B. 나의 결혼식·내비
- ✅ B-1 my-wedding 카드(김신랑&김신부 일시·장소·D+1·액션) + 카드 5건
- ✅ B-2 하단탭 라우팅(Inyeon/Event list/My event/Setting) + 카드 "라운지"→ `/lounge/:id/v2`
- ⚪ B-3 wedding-list/AddCard, B-4 카드 공유 — 미실행

## C. 청첩장
- ✅ C-1 `/invitation/create` 에디터 렌더(섹션 구성·디자인, 에러 없음) 🧩 invitationCreate
- ⚪ C-2 저장 플로우(데이터 오염 방지 위해 저장 생략), C-3 edit — 렌더 미실행

## D. 디방 인연 (이번 작업 핵심 — inyeon.machine)
- ✅ D-3 이음 신청 풀플로우: 카드→한마디 시트(composing)→입력(SET_MESSAGE 버튼활성)→보내기→650ms 매칭 오버레이("서아 님과 이어졌어요") 🧩 OPEN_IEUM→composing→sending(invoke)→matched
- ✅ D-6 받은이음: 수아 "이음 수락"→matched+chatOpen, 목록서 제거 🧩 ACCEPT_REQ
- ✅ D-7 채팅 DM: 채팅 탭→수아 "열기"(OPEN_DM_ROOM, seedDm 3줄)→메시지 전송(우측 파랑)→900ms 자동응답("…네트워크도 이어지겠네요") 🧩 OPEN_DM_ROOM/SEND_DM/DM_REPLY
- ✅ D-10 NAV 리셋(리뷰 수정 검증): DM방 연 채 유니버스로 이동 후 채팅 복귀 → 방 닫힘+이전 메시지 사라짐(dms 초기화) 🧩 NAV 가드
- ⚪ D-1 사진넘기기/스와이프, D-2 사진 잠금해제, D-5 필터, D-8 메모리뷰어, D-9 오버레이 전환, D-11 내프로필 — 이번 스윕 미실행(전부 inyeon.machine 유닛테스트 21건으로 커버)

## E. 웨딩 라운지 V2
- ✅ E-1 `/lounge/:id/v2` 렌더(온도 36.6°·라운지 헤더·모이가모인곳 카드·메모리·모이는중 로그)
- ✅ E-2 LIVE 축하메시지: 메시지 없어 QR 안내 카드(= liveCelebration 빈 상태 분기) 🧩 liveCelebration
- ✅ E-4 "모이가 모인곳 들어가기"→ `/lounge/:id/moi-gather`
- ⚪ E-3 작성/선물/공지 시트 — 미실행

## F. 모이가 모인곳 (moiPlaza.machine)
- ✅ F-1 광장 렌더(PixiJS 2.5D·모이 61·🪙300·테마토글·힌트)
- ✅ F-2 테마 스왑(파티) — 에러 없이 전환 🧩 SET_THEME
- ✅ F-3 샵 구매(꽃 화분 15) → 요네 300→285 차감 + 보유 반영 🧩 PURCHASE→invoke→차감/자동배치
- ⛔ F-4 모이 클릭→프로필→이음→토스트 — 모이가 PixiJS 캔버스 스프라이트라 a11y ref로 클릭 불가(토스트 SHOW_TOAST/2600ms는 유닛테스트로 검증)

## G. 결혼식 하위
- ✅ G-1 `/wedding/:id/report` 렌더(WEDDING REPORT·총 축의금 0원·장부/메시지/참석/사진·빈 상태)
- ✅ G-2 `/wedding/:id/memory-book`→curate 렌더("아직 공유된 사진이 없어요")
- ⚪ G-3 share-photos upload — 미실행

## H. 기타
- ❌ **H-1 마케팅 동의 토글 → `POST :8098/consents/marketing` 500 Internal Server Error.** 토글은 낙관적 체크되나 저장 실패(성공 토스트 없음). 원인: consent 백엔드(Go) 오류. **dibang-inyeon 범위 밖** — 별도 확인 필요.
- ✅ H-2 `/network` 렌더(신뢰 네트워크·내 주소·Moi 발행)
- ✅ H-3 `/qr`·`/dm` 렌더(구현예정 placeholder, 에러 없음)

## 결함 상세
### [FAIL] H-1 마케팅 동의 저장 500
- 재현: /settings → "마케팅 정보 수신 동의" 토글 클릭.
- 결과: 콘솔 `Failed to load resource: 500 @ /consents/marketing`, 네트워크 `POST /consents/marketing → 500`. UI는 낙관적 체크만, 성공 토스트("변경되었습니다") 없음.
- 범위: settings/consent 도메인(백엔드). 이번 디방인연 작업과 무관 — 다른 세션/백엔드 영역으로 surface.

## 미실행(NOT-RUN) 사유
- 토큰 예산상 핵심 머신 플로우(디방인연·모이광장·LIVE) 실브라우저 검증에 집중. 미실행 항목은 대응 유닛테스트(머신 37건)로 이미 커버되거나, 데이터/캔버스 제약으로 후순위.
- 후속 필요 시: D 잔여(필터·메모리뷰어·오버레이·내프로필), E-3 시트, C 저장/edit, B-3/4, G-3, A-2~4.
