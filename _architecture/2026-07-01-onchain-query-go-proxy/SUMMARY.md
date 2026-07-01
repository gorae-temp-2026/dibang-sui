# 온체인 쿼리 → Go API GraphQL 프록시 이관 — 계획 요약

작성 2026-07-01 · 상태: **구현 완료(로컬 검증 통과, 미배포)** · 게이트: INV-V·BE-V·FE-V·PLAN-V·P0-V·P1-V·P2-V 전부 통과
> **구현 완료 2026-07-01**: Phase 0(백엔드 Go 프록시 29 엔드포인트 + 캐시 + 무효화, 유닛 29 + 라이브 스모크 6 PASS) · Phase 1(프론트 read call-site 전량 `getOnchain*` 전환, sui-sdk 읽기함수 잔존 0, 두 앱 빌드 통과) · Phase 2(미사용 정리·회귀 0, 로컬 E2E 브라우저→프록시→GraphQL 실데이터 렌더·콘솔에러 0) 모두 완결.
> **남은 보류(정상)**: ① 백엔드 Render 배포 — 미커밋, 사용자 직접. ② zkLogin 게이트 인증페이지 실주소 렌더 + 실제 write TX read-after-write 전체 루프 — 헤드리스 불가(자격증명 대기). ③ 고아 엔드포인트 5개(getOnchainWeddingLounge/Invitation/OwnedWeddingCaps/Rsvp/GiftSent) — SDK 1:1 파리티용, 프론트 미소비(선택적 prune).

## 1. 문제
브라우저가 Sui fullnode를 직접 호출해 3중 문제:
- **CORS**: Sui 공개 노드가 브라우저 origin 요청을 불안정하게 처리(GraphQL은 CORS 헤더 아예 없음).
- **rate-limit**: `queryAllEvents` 전역 스캔이 인연 1로드에 40+ 순차 요청 → 429.
- **JSON-RPC sunset**: 2026-07-31 JSON-RPC 완전 중단(현재 `suix_queryEvents` 의존).

## 2. 결정
- **모든 온체인 "읽기"를 Go API로 위임.** 브라우저→REST→Go→**GraphQL**→Sui.
- 전송 = **GraphQL 단일**(사용자 확정 A). gRPC는 이벤트 타입 쿼리 불가로 제외, JSON-RPC는 sunset.
- **TX 제출·서명은 이번 제외**(나중 과제 — 지금도 CORS 안 나고 동작).
- 캐시 = **가벼운 온디맨드 프록시**(인메모리 TTL + single-flight). Postgres 인덱스는 후속.

## 3. 범위
- **대상**: SDK 읽기 24개(A객체5·B소유7·C이벤트10·D복합2) + 신규 4종(MoiItem단건·getBalance·NoteBoxCreated·WeddingCreated).
- **제외**: TX 빌더(buildXxxTx)·exec·sponsor·zkLogin 서명·`extractWeddingObjectIds`(TX-이펙트)·Walrus(HTTP)·`@gorae/contracts` 기존 DB 엔드포인트(이미 Go API).

## 4. 아키텍처
```
브라우저 ──REST/JSON──▶ Go API (/onchain/*) ──GraphQL──▶ Sui
  @gorae/contracts        무인증·온디맨드캐시            sui-testnet.mystenlabs.com/graphql
  생성 클라이언트          single-flight·TTL·무효화       (서버-투-서버, CORS 무관)
서명·TX제출 = 브라우저 유지(SDK, 이번 제외)
```
- **CORS 해소**(서버-투-서버), **rate-limit 해소**(전역 이벤트 캐시 전유저 공유, 수백배↓), **sunset 해소**(GraphQL).

## 5. 문서 맵
- [INV-inventory.md](./INV-inventory.md) — 전수 조사(읽기 24+신규, call site, TTL). INV-V 통과.
- [BE-design.md](./BE-design.md) — Go 엔드포인트 매핑·캐시·인증·에러. BE-V 통과.
- [FE-design.md](./FE-design.md) — 교체 전략·RQ 통합·call site별 변경. FE-V 통과.

## 6. 실행 순서 (PLAN-1)

### Phase 0 — 백엔드 (Go, 무해 추가)
1. `packages/contracts/api-contract.yaml`에 `/onchain/*` 엔드포인트 28개 + 응답 스키마(SDK 반환타입 1:1) 추가.
2. openapi-ts로 `@gorae/contracts` 재생성(프론트 클라이언트 함수 자동 생성).
3. Go: GraphQL 클라이언트(net/http) + 핸들러 구현(오브젝트·소유·이벤트·잔액·복합) + 페이지네이션 전량 순회.
4. 캐시(go-cache TTL + `x/sync/singleflight`) + 무효화 endpoint(per-user **+ 전역 이벤트 키**).
5. 라우팅: `/onchain/*`를 AuthMiddleware **바깥**(공개). CORS 기존 상속.
6. 배포(엔드포인트 추가라 기존 동작 무영향).

### Phase 1 — 프론트 (점진, 엔드포인트별)
7. call site를 생성된 `getOnchain*`로 교체(FE-3 표). 읽기용 `createJsonRpcClient` 제거.
8. RQ: staleTime=서버 TTL 정합, `refetchOnWindowFocus:false`, `sui:tx-success`→서버 invalidate + `queryClient.invalidateQueries`.
9. **우선순위**: rate-limit·CORS 심한 이벤트 스캔(C군·discover) 먼저 → 나머지.

### Phase 2 — 정리·검증
10. 미사용 `createJsonRpcClient`/`dapp-kit` gRPC 컨텍스트 정리.
11. 엔드포인트별 응답을 기존 SDK 직접읽기와 대조(스모크) + E2E + Playwright 스크린샷.

## 7. 리스크·배포·롤백 (PLAN-2)

| 리스크 | 대응 |
|--------|------|
| 부분 이관 중 읽기 이중화(일부 Go, 일부 직접) | 응답 스키마 1:1 → **같은 데이터**. 화면별 독립 전환 가능(정합 깨짐 없음) |
| Go API 장애 | 프론트 짧은 타임아웃 + 현행 best-effort 유지(온체인 읽기 실패해도 앱 크래시 X). 심각 시 해당 훅만 SDK 직접읽기로 **롤백**(call site 단위) |
| 백엔드 배포 위험 | `/onchain/*`는 **순수 추가** → 기존 엔드포인트·동작 무영향, 롤백 무해 |
| **인덱서 지연** | GraphQL(인덱서 기반)이 TX 확정 직후 미반영 가능 → 무효화해도 짧은 반영 윈도. FE 문서화 + per-user 짧은 TTL 완충 |
| **read-after-write 민감점**(PLAN-V 발견) | `useNotes.findOrCreateNoteBox`는 NoteBox 생성 TX 직후 **같은 함수 내에서 재조회**해 방금 만든 박스를 찾음. Go 프록시+인덱서 지연 시 두 번째 읽기가 신규 박스를 못 볼 수 있음 → tx-success 무효화 + **짧은 재시도**가 실제 동작하는지 **스모크 단계 필수 확인**. (동일 패턴 call site 있으면 함께 점검.) |
| sunset 7/31 임박(~30일) | 이벤트 스캔(JSON-RPC 의존分) **최우선** 이관. 객체 읽기는 상대적 여유 |
| Node 스크립트 회귀 | SDK 읽기 24개 **존치**(FE는 apps/만 변경) → 스크립트 testnet 직접읽기 무손상 |

**배포 순서**: 백엔드 먼저(무해) → 프론트 엔드포인트별 순차 전환 → 정리. 각 단계 독립 롤백 가능.

## 8. 미결 항목(구현 착수 전 확인)
- sunset 정확 날짜(문서 "April" vs 블로그 "July 31" — 후자 유력, 재확인).
- 매니지드 프로바이더(Quicknode 등) 채택 여부(SLA/rate-limit 여유 필요 시).
- 프로덕션 `ALLOWED_ORIGINS`에 `https://dibang-sui.onrender.com` 포함 확인.
