# SUMMARY — dibang-wedding 전체 E2E (2026-06-20)

**목적**: 디방인연 XState 이관 검증 + dibang-wedding 전 서비스 e2e 스윕(Playwright MCP).

**결론**
- 이번 작업 핵심 머신은 **실브라우저 PASS**: 디방인연(이음→매칭 / 받은이음 수락 / 채팅 DM 전송+자동응답 / NAV 리셋), 모이광장(렌더·테마·샵 구매 요네차감), LIVE(빈 상태 QR 카드).
- 주요 페이지 렌더 정상: my-wedding, 청첩장 생성, 라운지 v2, 리포트, 메모리북, network, qr/dm.
- **결함 1건**: 마케팅 동의 토글 → `POST /consents/marketing` **500**(consent 백엔드, dibang-inyeon 범위 밖) → 별도 surface.
- 집계: PASS 22 / FAIL 1 / BLOCKED 1(모이 캔버스 클릭) / NOT-RUN 다수(머신 유닛테스트 37건으로 커버).

**산출물**: [SCENARIOS.md](SCENARIOS.md)(시나리오 35개) · [RESULTS.md](RESULTS.md)(실행 결과).

**후속**: ① consents/marketing 500 원인(백엔드). ② D 잔여·E-3·C 저장·G-3 등 미실행 e2e는 필요 시 추가.
