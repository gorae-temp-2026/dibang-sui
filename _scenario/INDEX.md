# Scenario Index

> 새 주제 폴더·파일은 `{YYYY-MM-DD}-{제목}` 형식(ISO 8601 날짜 prefix)으로 시작한다. 예: `2026-05-08-wedding-lounge`. 상세 규칙: `~/.claude/CLAUDE.md` §6-4.

- [x] [Wedding Lounge](wedding-lounge/SCENARIOS.md) — 웨딩라운지 피드, QR 참석, 입장, 공지, 하트, 댓글 (완료 2026-05-08)
- [x] [Guest Web Flow](guest-web-flow/SCENARIOS.md) — 결혼식 QR → 누구측 → 관계/이름 → 축의 → 메세지 → 완료 + QR 다운로드 (완료 2026-05-11)
- [x] [Wedding Lounge Page](wedding-lounge-page/SCENARIOS.md) — 라운지 페이지 레이아웃, 진입점, 헤더, 참여자 목록 (완료 2026-05-11)
- [x] [Host Invite](host-invite/SCENARIOS.md) — 부모님 초대 플로우, 역할 판별, 권한 분기 (완료 2026-05-11)
- [x] [Wedding Report: 장부](wedding-report-ledger/SCENARIOS.md) — 축의금 장부 조회/추가/수정/삭제, CSV 내보내기 (완료 2026-05-11)
- [x] [Photo Sharing](photo-sharing/SCENARIOS.md) — 사진 공유 3분류(mobile-invitation/memory/share), presigned 통일, 라운지 → 호스트 현장사진(100장/하객) (완료 2026-05-20)
  - [x] [UI Port 2026-05-22](photo-sharing/UI_PORT_2026-05-22.md) — 와이어프레임 → 레거시 PhotoSharePage UI 이식 + 사진별 진행률 보존
  - [x] [Bucket Split 2026-05-22](photo-sharing/BUCKET_SPLIT_2026-05-22.md) — v3-uploads 단일 → public/private 2분리 (faea79e 청사진 구현). dev 적용 완료
- [ ] [Display Port](display-port/SCENARIOS.md) — 레거시 mecdisplay → guest-web `/display?weddingId=...` 이식. 헤더+슬라이드쇼+Realtime 떠오르는 카드(entries+messages)+catch-up+안내 무한루프+QR (2026-05-20)
- [ ] [Memory Domain Split](memory-domain-split/SCENARIOS.md) — `v3_guestbook_messages.photo_url` 분리. 신규 `v3_memories`(author_user_id, text+사진 0/1, 게스트·호스트 공통). "온기" 사람별 collapse + LIVE 축하메세지 분리 + 활동 로그 라벨 (2026-05-22)
- [x] [Wedding MemoryBook 2026-05-24](wedding-memorybook-2026-05-24/SCENARIOS.md) — v2 웨딩메모리북+사진큐레이션 기능 v3 백엔드 이식 완료. shared 30장 큐레이션 + 모청 사진 display + 메시지 자동선별(__HEART__ sentinel + recipient_slot → side). 단위·핸들러 32/32 PASS + dev e2e 9/9 PASS. UI는 별도 트랙 (완료 2026-05-24)
- [x] [Wedding MemoryBook UI 2026-05-24](wedding-memorybook-ui-2026-05-24/SCENARIOS.md) — v2 메모리북 UI(curate·viewer·MemoryBookV2_4) v3 dibang-wedding 이식 완료. 큐레이션 페이지(Tailwind+RQ+embla 라이트박스+저장) + viewer(MemoryBookV2_4Inner 2214라인 1:1 포팅 + 어댑터) + 진입점(MyWeddingPage). 그룹 API `getWeddingSharedPhotoGroups` 신규 추가. Playwright e2e PASS (스크린샷 7장) — `_e2e_test/runs/2026-05-24-wedding-memorybook-ui/` (완료 2026-05-24)
- [~] [Admin Page](admin-page/SCENARIOS.md) — `apps/admin` 신규 앱 구현 완료(2026-05-25). `admin@gorae.dev` 단일 계정, dev/prod 환경 토글(LOCAL 제외), v3 read-only. 대시보드(v2 통계 박제 6카드) + 웨딩 목록(created_at DESC, 전체 로드) + 웨딩 상세(11 v3 테이블 섹션). 5개 시나리오(S-01~S-05) 모두 구현, lint·build 통과. Playwright MCP로 가드 동선 4종 검증·스크린샷 첨부. 인증 후 데이터 페이지(S-03/04/05 실 데이터) e2e는 사용자가 `.env`에 PROD URL/KEY 채워 직접 검증 필요.
- [ ] [User Consent Onboarding 2026-05-26](2026-05-26-user-consent-onboarding/SCENARIOS.md) — Dibang Wedding 첫 로그인 모든 유저 대상 `/onboarding/consent` 인터셉트. 필수 3개(age_verification/service/privacy)+선택 1개(marketing) 동의. v2(`../web-mobile-application`)의 3-테이블 구조(`profiles`+`terms_documents`+`consent_records`) 그대로 이식 — `profiles.terms_version`으로 게이트 빠른 판정 + `consent_records`에 IP/UA/method append-only 감사 로그. 약관 본문 페이지는 후속 작업(이번 범위 제외), 거부/로그아웃 분기 없음(필수 미체크 시 버튼 비활성화로만 차단).
