# _audit 인덱스

코드 리뷰·시스템 감사·환경 갭 분석 등 결함 찾기 결과물.

| 주제 | 요약 | 링크 |
|------|------|------|
| 2026-06-20 dibang-wedding E2E | 전 서비스 e2e 스윕 — 디방인연/모이광장/LIVE 머신 PASS, 마케팅 동의 500 결함 1건 | [SUMMARY](2026-06-20-e2e-dibang-wedding/SUMMARY.md) · [SCENARIOS](2026-06-20-e2e-dibang-wedding/SCENARIOS.md) · [RESULTS](2026-06-20-e2e-dibang-wedding/RESULTS.md) |
| 2026-06-21 온체인 배선 감사 | 컨트랙트→hook→UI "끝까지 연결" 추적 — mint_item 무게이트=시빌 결함(결정#6 미구현) 재분류, 실제 온체인 도달 3경로(웨딩생성·Moi·이음신청)뿐·자격증명 게이트·best-effort, acceptIum/상점/선물 미배선·mock | [SUMMARY](2026-06-21-onchain-wiring-audit/SUMMARY.md) |
| 2026-06-21 프론트 전수 감사 | xState·흐름·컨트랙트정합·모순 4차원 전수(횡단2+영역9 에이전트). 빌드 깨짐(tsc 11) + 인연·샵·선물·신용 전부 mock(온체인 훅 데드코드) + 매트릭스 미주입 시한폭탄. CRITICAL 3·HIGH 7 | [SUMMARY](2026-06-21-frontend-audit/SUMMARY.md) · [findings](2026-06-21-frontend-audit/findings.md) |
