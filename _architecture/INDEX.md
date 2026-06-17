# Architecture — 설계 산출물 목록

## 도메인 모델
- [DOMAIN_MODEL_SUMMARY.md](DOMAIN_MODEL_SUMMARY.md) — 도메인 모델 1차 정리 (Glossary, Entities, VO, Aggregates, Invariants, Events, Use Cases)

## DB 스키마
- [diagram-db-schema.d2](diagram-db-schema.d2) — v3 DB 스키마 ERD (d2 소스). `d2 diagram-db-schema.d2 diagram-db-schema.svg`로 렌더링
- [diagram-db-schema.svg](diagram-db-schema.svg) — 렌더링된 ERD 이미지

## 앱 구조
- [APP_SCOPE.md](APP_SCOPE.md) — 앱별 기능 경계 (Guest Web = 비로그인 전환 퍼널[청첩장 / 방명록·메시지·축의 → 웨딩라운지 유도], Dibang Wedding = 로그인 서비스 본체)

## API 설계
- [API_CONVENTIONS.md](API_CONVENTIONS.md) — API 설계 컨벤션 6개 항목 (복합 생성, 비로그인 분리, pagination, 에러, URL, security)
- [API_CONSUMER_NEEDS.md](API_CONSUMER_NEEDS.md) — 소비자별(dibang-wedding, guest-web) API 필요 목록
- [API_ENDPOINT_MAP.md](API_ENDPOINT_MAP.md) — 전체 58개 엔드포인트 매핑 (method, path, operationId, 인증, 소비자). spec operationId 기준 단일 진실원 (R7 동기화, 2026-05-18)

## 기술 스택
- [tech-stack-map.html](tech-stack-map.html) — v3 기술 스택 다이어그램 (브라우저에서 열기)

## 배포
- [DEPLOYMENTS.md](DEPLOYMENTS.md) — 배포 서버 URL 단일 대장 (dev/prod × api·dibang-wedding·guest-web). render.yaml은 서비스 정의, 이 문서는 실제 접속 URL

## 관련 (다른 폴더)
- legacy → v3 copy 마이그레이션 매핑 분석: [`_research_analysis/legacy-v3-migration/`](../_research_analysis/legacy-v3-migration/)
