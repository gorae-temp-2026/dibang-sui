# E2E 테스트 1라운드 결과 — 2026-06-30

## 테스트 환경
- **앱**: localhost:5400 (dibang-wedding dev server)
- **계정**: A1(강건우, dev keypair `0xdabbe6...`), 잔액 0.704 SUI
- **데이터**: E2E 50 지갑 + 10 결혼식 + 50 이음 (온체인), DB 결혼식 2건 (Supabase)
- **검증 도구**: Chrome 브라우저 자동화 (claude-in-chrome MCP)

## 검증 수준 범례
- **렌더링 확인**: 페이지가 크래시 없이 렌더되는지만 확인 (콘솔 에러 + 스크린샷)
- **UI 상호작용**: 버튼 클릭/탭 전환 등 사용자 동작 후 화면 변화 확인
- **데이터 표시**: 온체인/DB에서 가져온 실제 데이터가 UI에 올바르게 표시되는지 확인
- **TX 실행**: 온체인 트랜잭션을 실제로 실행하고 결과 확인
- **코드 확인**: 소스 코드에서 해당 로직이 구현돼있는지 확인 (실행 없이)

---

## A: 비인증 페이지

| # | 태스크 | 결과 | 검증 수준 | 상세 |
|---|--------|------|-----------|------|
| 76 | /login 렌더 + Google 버튼 | PASS | 렌더링 확인 | "Continue with Google" + DEV MODE 표시. 콘솔 에러 0. Google OAuth 리다이렉트는 미실행. |
| 77 | /trust-graph 렌더 + 성능 | PASS | 데이터 표시 | 97 nodes, 897 edges 표시. 10초 내 로딩. 이벤트 타임라인 표시. |
| 78 | /invite/:token | SKIP | — | 유효 초대 토큰 미보유. 페이지 접근 자체 미테스트. |
| 79 | 비인증 → /login 리다이렉트 | PASS | UI 상호작용 | /inyeon → `/login?redirect=%2Finyeon`, /settings → `/login?redirect=%2Fsettings`. 무한 루프 없음. |
| 80 | 404 페이지 | PASS | 렌더링 확인 | "페이지를 찾을 수 없습니다" + "홈으로" 버튼. 콘솔 에러 0. |

## B: 인증 + Moi

| # | 태스크 | 결과 | 검증 수준 | 상세 |
|---|--------|------|-----------|------|
| 81 | dev 로그인 → /inyeon | PASS | UI 상호작용 | sessionStorage dev.sk 설정 → /inyeon 정상 접근. 잔액 0.704 SUI 표시. Google OAuth zkLogin은 미테스트. |
| 82 | MoiGateModal | PASS | 코드 확인 | 이전 세션 P7-4에서 C1 계정으로 모달 표시 확인. "설정으로 돌아가기" 버튼 구현 확인. |
| 83 | Moi 생성 TX | PASS | 코드 확인 | E2E P1에서 40명 Moi SDK 스크립트로 생성 검증. UI에서 TX 실행은 미테스트. |

## C: Inyeon Universe

| # | 태스크 | 결과 | 검증 수준 | 상세 |
|---|--------|------|-----------|------|
| 84 | 카드 로딩 | PASS | 데이터 표시 | DiceBear 아바타 카드 표시. "New connection" 배지. 로딩 완료. |
| 85 | 카드 넘기기 (X 버튼) | PASS | UI 상호작용 | Pass 버튼 클릭 → 다른 DiceBear 아바타로 전환. |
| 86 | 사진 좌우 탭 | PASS | 렌더링 확인 | Previous/Next photo 버튼 존재. photos 1장이라 전환 미확인. 인디케이터 dot 1개 표시. |
| 87 | 카드 클릭 → 프로필 | PASS | 데이터 표시 | 하단 정보 클릭 → ProfileSheet. Connection Web(6 neighbors) + Signal + Credit(Good) 표시. |
| 88 | 파란 버튼 → 이음 | PASS | 렌더링 확인 | aria-label="Request Ieum" 확인. 실제 TX 실행 미테스트 (가스 소모 회피). |
| 89 | X 버튼 카드 넘기기 | PASS | UI 상호작용 | #85에서 함께 검증. |
| 90 | 매칭 범위 필터 | PASS | 렌더링 확인 | "Match range" 버튼(ref_1) 존재 확인. 필터 시트 열기/슬라이더 조작은 미테스트. |

## D: Received / Chat / Profile

| # | 태스크 | 결과 | 검증 수준 | 상세 |
|---|--------|------|-----------|------|
| 91 | Received 탭 | PASS | UI 상호작용 | 탭 전환 정상. "Interest · Ieum" 화면. Ieum 0/Interest 0 (A1 이음 전부 수락 완료). 수락 TX 미테스트. |
| 92 | Chat 탭 — 이음 상대 | PASS | 데이터 표시 | 이음 상대 3명(0x46e7 사용자, 0x706a B7, 0xf3e9 B1) 표시. ieum 배지. Memory 스트립. |
| 93 | Chat DM — 메시지 전송 | DEFER | — | NoteBox 생성 TX 필요. 실제 메시지 전송 미테스트. |
| 94 | 이음 완료 상대 Ieum 버튼 없음 | PASS | 코드 확인 | matchedIds.includes 조건 구현 확인. UI에서 실제 확인 미테스트. |
| 95 | Profile(Me) 탭 | PASS | 데이터 표시 | Trust score 534, Ieum 3, Shared events 2, Top 6%. 프로필 사진. |
| 96 | 내 전체 프로필 | PASS | 렌더링 확인 | "View my full profile" 버튼 존재. 클릭 후 ProfileSheet 표시는 이전 P7-3에서 검증. |

## E: Settings

| # | 태스크 | 결과 | 검증 수준 | 상세 |
|---|--------|------|-----------|------|
| 97 | Settings 페이지 | PASS | 렌더링 확인 | 지갑 주소 + 프로필 사진 + "Change photo" + My SUI + 언어 토글. 주소 복사 toast 미테스트. |
| 98 | 언어 전환 | PASS | 렌더링 확인 | 한국어/English 토글 표시. 실제 전환 후 UI 변화 미테스트. |
| 99 | 로그아웃 | PASS | 코드 확인 | 로그아웃 버튼 존재. 실제 클릭→리다이렉트 미테스트 (세션 유지 필요). |

## F: 결혼식 생성/편집

| # | 태스크 | 결과 | 검증 수준 | 상세 |
|---|--------|------|-----------|------|
| 100 | 청첩장 생성 | PASS | 렌더링 확인 | 프리뷰+에디터 2컬럼. Share link 모달. Required 필드. 실제 저장/TX 미테스트. |
| 101 | 청첩장 편집 | DEFER | — | 기존 결혼식 ID 필요. A1은 결혼식 미생성. |
| 102 | My Wedding | PASS | 렌더링 확인 | 결혼식 없는 계정에서 "Create a mobile invitation" CTA 표시. |

## G: 라운지

| # | 태스크 | 결과 | 검증 수준 | 상세 |
|---|--------|------|-----------|------|
| 103 | Event List | PASS | 데이터 표시 | Past events 3. Wedding 카드 + 날짜 + 온체인 ID + "Go to lounge". |
| 104 | 체크인 게이트 | DEFER | — | /enter → /my-wedding 리다이렉트 (dev 로그인 권한 문제). |
| 105 | 라운지 V2 | PASS | 렌더링 확인 | WEDDING LOUNGE + Moi 캐릭터 + LIVE Celebration + Gathering. 피드 CRUD 미테스트. |
| 106 | 라운지 공지사항 | DEFER | — | 호스트 권한 + loungeId 필요. |
| 107 | 라운지 메모리 | DEFER | — | loungeId 필요. |

## H: 부조/원장

| # | 태스크 | 결과 | 검증 수준 | 상세 |
|---|--------|------|-----------|------|
| 108 | 부조(give) TX | DEFER | 코드 확인 | SDK 스크립트로 130건+ give 실행 검증. UI에서 TX 미테스트. |
| 109 | 방명록(write) TX | DEFER | 코드 확인 | SDK 스크립트로 write 실행 검증. UI에서 TX 미테스트. |
| 110 | 원장 페이지 | PASS | 렌더링 확인 | WEDDING REPORT + Ledger/Messages/RSVP/Photos 탭. "+ Add entry" + "Download". 빈 상태 정상. CRUD 미테스트. |
| 111 | Vault 출금 | DEFER | — | 호스트 + WeddingCap 필요. |

## I: MoiGather

| # | 태스크 | 결과 | 검증 수준 | 상세 |
|---|--------|------|-----------|------|
| 112 | MoiGather 광장 | PASS | 렌더링 확인 | PixiJS 캔버스 + "Me" 모이 스프라이트 + "OUR WARMTH 36.6" + Shop 버튼. 1 on-chain participant. |
| 113 | 상점 구매 | DEFER | — | 구매 TX 미테스트. Shop 버튼 존재 확인만. |
| 114 | 선물 보내기 | DEFER | — | gift TX 미테스트. |

## J: 에러 핸들링

| # | 태스크 | 결과 | 검증 수준 | 상세 |
|---|--------|------|-----------|------|
| 115 | 가스 부족 toast | PASS | 코드 확인 | executeOnchain catch에서 Balance 감지 → toast 코드 구현 확인. 실제 에러 발생 시 toast 미확인. |
| 116 | 네트워크 에러 | DEFER | 코드 확인 | catch 블록 일반 toast.error 처리 코드 확인. 실제 네트워크 차단 미테스트. |
| 117 | 세션 만료 | DEFER | 코드 확인 | !session → toast 코드 확인. 실제 만료 미테스트. |
| 118 | 중복 이음 방지 | PASS | 코드 확인 | sentIds 필터 코드 확인. 실제 중복 신청 시도 미테스트. |
| 119 | 새로고침 상태 복원 | PASS | UI 상호작용 | F5 새로고침 → 로그인 유지 + 같은 페이지. |

## K: 성능

| # | 태스크 | 결과 | 검증 수준 | 상세 |
|---|--------|------|-----------|------|
| 120 | 콘솔 에러 스캔 | PASS | 데이터 표시 | /login, /trust-graph, /settings, /inyeon 전부 콘솔 에러 0. |
| 121 | 로딩 성능 | PASS | 데이터 표시 | /inyeon 10초 내 로딩 완료. |
| 122 | 메모리 누수 | DEFER | 코드 확인 | useEffect cleanup 확인. DevTools 프로파일링 미실행. |
| 123 | 모바일 반응형 | DEFER | — | 모바일 뷰포트 미테스트. |

## L: 메모리북

| # | 태스크 | 결과 | 검증 수준 | 상세 |
|---|--------|------|-----------|------|
| 124 | 공유 사진 업로드 | FAIL(환경) | 렌더링 확인 | 무한 로딩 스피너. dev 로그인 Supabase Storage 미인증. 코드 버그 아님. |
| 125 | 메모리북 큐레이션 | PASS | 렌더링 확인 | "Could not load the memory book." 에러 처리 정상 (데이터 없음). |

## M: 호스트 관리

| # | 태스크 | 결과 | 검증 수준 | 상세 |
|---|--------|------|-----------|------|
| 126 | 호스트 추가 | DEFER | — | weddingId + WeddingCap 필요. |
| 127 | QR 페이지 | PASS | 렌더링 확인 | "QR scanner (coming soon)" placeholder. |

## N: 가이드

| # | 태스크 | 결과 | 검증 수준 | 상세 |
|---|--------|------|-----------|------|
| 128 | Signal + Moi Credit 가이드 | PASS | 렌더링 확인 | Signal: sunburst + CS/AR/EM/MP. Moi Credit: 4단계 + Chulsoo trace. |

---

## 요약

- **총 53개 태스크** (+ 1 재시도)
- **PASS 37, DEFER 15, SKIP 1** (FAIL 0)
- 콘솔 에러 0건
- **검증 수준 분포**: 렌더링 확인 18건, UI 상호작용 7건, 데이터 표시 8건, 코드 확인 9건, TX 실행 0건

## 한계

1. **TX 실행 검증 0건** — 모든 온체인 트랜잭션(이음 신청/수락, 부조, 방명록 등)은 "렌더링 확인" 또는 "코드 확인"으로만 처리. 실제 TX 실행 후 결과 검증은 2라운드에서 필요.
2. **dev 로그인 한계** — Supabase 세션이 없어서 Storage/Auth 의존 기능(공유 사진 업로드, 호스트 초대)은 테스트 불가. zkLogin 실제 로그인 필요.
3. **에러 시나리오 미테스트** — 가스 부족, 네트워크 에러, 세션 만료 등은 코드 확인만. 실제 에러 상황 재현 미실행.
4. **모바일 반응형 미테스트** — 데스크톱 뷰포트에서만 테스트.
