# 웨딩라운지 페이지 시나리오

## 개요

Dibang Wedding 앱에서 `/lounge/{loungeId}`로 접근하는 웨딩라운지 페이지. 다크 헤더(결혼식 정보 + 참여자) + 통합 피드. 피드 백엔드/컴포넌트는 기존 구현 활용.

### 사전 작업

MoiVisit → LoungeEntry 리네임 (DB, Frontend, 시나리오 문서. API·Go·설계 문서는 완료됨)

---

## 그룹 A: 진입점

| # | Actor | Screen | Action | Result | Data Flow | Navigation |
|---|-------|--------|--------|--------|-----------|------------|
| S-01 | Guest | Guest Web - 청첩장 라운지 탭 | 입장 버튼 탭 | Dibang Wedding `/lounge/{loungeId}` 리다이렉트 → 로그인 → 라운지 | URL 리다이렉트 | 청첩장 → 로그인 → 라운지 |
| S-02 | Guest | Guest Web - 전송 완료 | "사진 공유하기" 탭 | Dibang Wedding `/lounge/{loungeId}` 리다이렉트 | URL 리다이렉트 | Guest Web → 라운지 |
| S-03 | Host/Guest | Dibang Wedding - Wedding List | 결혼식 카드 탭 | `/lounge/{loungeId}` 이동 | 클라이언트 라우팅 | Wedding List → 라운지 |
| S-04 | Host | Dibang Wedding - My Wedding | 라운지 바로가기 | `/lounge/{loungeId}` 이동 | 클라이언트 라우팅 | My Wedding → 라운지 |

---

## 그룹 B: 라운지 페이지

| # | Actor | Screen | Action | Result | Data Flow | Edge Case |
|---|-------|--------|--------|--------|-----------|-----------|
| S-05 | Host/Guest | 라운지 | 페이지 진입 | 다크 헤더 + 참여자 + 피드 | GET /weddings/{id}, GET /feed, GET /lounge-entries | 비로그인 → 로그인 리다이렉트 |
| S-06 | Host/Guest | 라운지 헤더 | 로딩 완료 | 다크 헤더: 신랑&신부 이름, 날짜(한글), 장소, 참여자 아바타(중첩 원형 최대 5개 + "+N"), 참여자 수 | GET /weddings/{id} + GET /lounge-entries | 참여자 0명 → 아바타 영역 숨김 |
| S-07 | Host/Guest | 라운지 헤더 | 참여자 아바타 영역 탭 | 참여자 목록 모달: LoungeEntry 기록 있는 사람만. 이름, 역할(Host/Guest) 구분 | GET /lounge-entries | - |
| S-08 | Host/Guest | 참여자 모달 | 모달 바깥 또는 X 탭 | 모달 닫힘 | 클라이언트 | - |

---

## 그룹 C: 피드 (기존 구현 활용)

| # | Actor | Screen | Action | Result | Data Flow | Realtime |
|---|-------|--------|--------|--------|-----------|----------|
| S-09 | Host/Guest | 라운지 피드 | 스크롤 | 고정 공지 + 축하메세지 + "참석했어요" + "입장했어요" 혼합 피드, 무한스크롤 | GET /feed (기존) | 5초 폴링 + 풀다운 새로고침 |
| S-10 | Host | 라운지 피드 | 공지/하트/댓글 | 기존 구현 그대로 | 기존 | - |

---

## 이번 범위에서 제외

- 사진 업로드/공유 (추후)
- 모이 모이는 곳 시각화 (추후)
- 디스플레이 앱 연동 (추후)
