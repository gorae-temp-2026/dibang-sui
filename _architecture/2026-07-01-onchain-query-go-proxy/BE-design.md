# Go API 온체인 읽기 프록시 — 백엔드 설계 (BE)

> 계획용 산출물(구현 아님). INV-inventory.md의 조사 결과를 입력으로 Go 엔드포인트·캐시·인증을 설계.
> 검증: BE-V(Opus 4.8)에서 커버리지 검증 후 FE 단계로.

---

## BE-1 — Go의 Sui 읽기 클라이언트 방식 (조사·결정)

### 현재 상태
- **Go API(`gorae-api`, Go 1.25.4)는 현재 Sui를 전혀 호출하지 않는다.** go.mod에 Sui 라이브러리 0건, pgx로 Supabase(Postgres)만 읽음. DB는 sqlc 생성(`db/*.sql.go`), REST는 oapi-codegen(프론트 `@gorae/contracts` 생성원). → Sui 읽기 계층을 **신규 추가**해야 함.

### 결정을 좌우하는 제약: 전송 프로토콜별 이벤트 쿼리 지원

| 전송 | 객체 읽기(A·B·getBalance) | **이벤트 타입 쿼리(C군·D2 — rate-limit 주범)** | 7/31 sunset |
|------|--------------------------|-----------------------------------------------|-------------|
| JSON-RPC | ✅ (현재 방식) | ✅ suix_queryEvents (현재 방식) | ❌ **죽음** |
| gRPC | ✅ GetObject/ListOwnedObjects | ❌ **타입별 과거 쿼리 없음** (이벤트는 GetTransaction 경유만, 또는 실시간 subscription) | ✅ 생존 |
| GraphQL | ✅ address·object 쿼리 | ✅ **events(filter:{ type: }) 지원** | ✅ 생존 |

- **핵심**: gRPC는 우리 워크로드의 핵심인 "이벤트 타입별 전역 스캔"을 **구조적으로 못 한다.** (Sui 문서·queries.ts 주석 일치 확인.) 따라서 gRPC 단독으론 이관 불가.
- GraphQL만이 **객체 + 이벤트를 모두** sunset-proof하게 커버.

### Go 클라이언트 옵션
- **공식 Mysten Go SDK 없음** (공식은 TS·Rust만).
- 커뮤니티 `block-vision/sui-go-sdk` v2: JSON-RPC+gRPC 통합 API. 단 이벤트 타입 쿼리 gap은 동일(gRPC 한계 상속).
- GraphQL: Go 전용 SDK 불필요 — **net/http POST + 쿼리 문자열**로 충분(경량). 필요 시 `hasura/go-graphql-client` 등 경량 라이브러리.

### 결정 (권장안) — ⚠️ 사용자 확인 필요

**GraphQL RPC를 Go 프록시의 단일 읽기 전송으로 채택.**

근거:
1. **유일하게 객체+이벤트 모두 sunset-proof 커버** — gRPC는 이벤트 스캔 불가, JSON-RPC는 7/31 사망.
2. **단일 전송 = 온디맨드 프록시 단순성** (사용자가 확정한 "가벼운" 방향과 정합). Go에 net/http POST만으로 시작 가능, 무거운 SDK 불필요(전역규칙 §2-1 최소코드).
3. **JSON 응답 = 포팅 용이** — 현재 queries.ts가 파싱하는 필드 shape와 유사(gRPC의 BCS/protobuf 디코딩 부담 없음).
4. **서버-투-서버라 CORS·rate-limit을 Go가 통제** — sui-testnet.mystenlabs.com/graphql는 서버에서 curl 200 확인됨(브라우저 CORS 헤더는 서버엔 무관).

절충/대안:
- gRPC는 **객체 point-lookup 핫패스**(getObject/getBalance)에서 GraphQL보다 저지연 → 추후 성능 필요 시 객체 읽기만 gRPC로 이원화 가능. 단 이번엔 단순성 위해 GraphQL 단일.
- 이벤트 스캔은 **어느 경우든 GraphQL 필수**(gRPC 불가).

### 엔드포인트
- **1차: `https://sui-testnet.mystenlabs.com/graphql`** (Mysten 공식 testnet GraphQL, 서버사이드 사용).
- **폴백/운영: 매니지드 프로바이더**(Quicknode·Ankr·BlockPi·ZAN — Sui가 sunset 대비로 안내, GraphQL/gRPC full-stack + SLA·rate-limit 여유). 환경변수로 전환.

### 리스크
- **sunset 날짜 표기 불일치**: 문서 일부 "April 2026" vs 블로그 "July 31, 2026". 오늘(7/1) JSON-RPC가 아직 살아있음(앱 동작) → **7/31이 실제 sunset**으로 판단(April은 오기/다른 마일스톤). BE 착수 전 정확한 날짜 재확인 권장.
- GraphQL point-lookup은 gRPC보다 다소 느림 → 온디맨드 캐시(BE-3)로 상쇄.

---

## BE-2 — 쿼리 → Go 엔드포인트 매핑 (GraphQL 기반)

### 규약·원칙
- **OpenAPI-first**: 새 엔드포인트는 `packages/contracts/api-contract.yaml`에 추가 → openapi-ts로 프론트 `@gorae/contracts` 재생성 → Go 핸들러 구현. (기존과 동일 워크플로.)
- **네임스페이스 `/onchain/`**: 기존 `/weddings/{id}`(DB 기반)와 충돌 방지. 온체인 읽기는 전부 `/onchain/` 하위.
- **응답 스키마 = SDK 반환 타입 1:1**: queries.ts의 `WeddingOnChain`·`SignalQuery` 등 인터페이스를 그대로 OpenAPI schema로 옮겨 프론트 타입 불변 → FE 변경 최소.
- **GraphQL 매핑**: 각 엔드포인트가 서버에서 GraphQL 쿼리 실행 후 SDK와 동일 shape로 가공. 이벤트는 서버가 **내부 페이지네이션 전량 순회**(현재 queryAllEvents와 동일 동작) 후 완성 배열 반환(→ BE-3에서 캐시).

### A. 단일 오브젝트 (getObject) → GraphQL `object(address:){ asMoveObject{ contents{ json } } }`

| SDK 함수 | 엔드포인트 | 응답 | GraphQL |
|----------|-----------|------|---------|
| getWedding | `GET /onchain/weddings/{weddingId}` | WeddingOnChain\|null | object → fields(status·primary_host·vault_id·event_id) |
| getWeddingLounge | `GET /onchain/lounges/{loungeId}` | WeddingLoungeOnChain\|null | object → wedding_id |
| getCashGiftVault | `GET /onchain/vaults/{vaultId}` | CashGiftVaultOnChain\|null | object → wedding_id·balance |
| getMoi | `GET /onchain/mois/{moiId}` | MoiOnChain\|null | object → owner·equipped(VecMap) |
| getInvitation | `GET /onchain/invitations/{invitationId}` | InvitationOnChain\|null | object → wedding_id·creator·slug·*blobId 필드 |
| (신규) MoiItem 단건 | `GET /onchain/moi-items/{itemId}` | MoiItemOnChain\|null | object → name·item_type·slot (MoiGatherPage:196 흡수) |

### B. 소유 오브젝트 (getOwnedObjects) → GraphQL `address(address:){ objects(filter:{type:}){ nodes{ address, contents{ json } } pageInfo } }`

| SDK 함수 | 엔드포인트 | 응답 | 서버 필터 |
|----------|-----------|------|-----------|
| getOwnedMoiIds | `GET /onchain/addresses/{address}/moi-ids` | string[] | type=Moi |
| getOwnedMoiItems | `GET /onchain/addresses/{address}/moi-items` | MoiItemOnChain[] | type=MoiItem |
| getOwnedWeddingCapIds | `GET /onchain/addresses/{address}/wedding-caps` | string[] | type=WeddingCap |
| getWeddingCapForWedding | `GET /onchain/addresses/{address}/wedding-caps?weddingId=` | {capId:string}\|null | WeddingCap + wedding_id 매칭(서버) |
| getParticipationForEvent | `GET /onchain/addresses/{address}/participations?eventId=` | ParticipationOnChain\|null | Participation + event_id 매칭(서버) |
| getAnyParticipation | `GET /onchain/addresses/{address}/participations` (첫 건) | ParticipationOnChain\|null | Participation |
| getOwnedIumRequests | `GET /onchain/addresses/{address}/ium-requests` | OwnedIumRequest[] | type=IumRequest |
| (신규) SUI 잔액 | `GET /onchain/addresses/{address}/balance` | {mist:string} | address.balance(type:0x2::sui::SUI) |

> 참고: wedding-caps·participations는 필터 유무만 다르므로 쿼리스트링으로 통합(getOwned*/get*ForX가 같은 GraphQL 쿼리 공유). getBalance는 신규 3종 중 1.

### C. 이벤트 타입 스캔 (queryEvents) → GraphQL `events(filter:{ type: "PKG::mod::Event" }){ nodes{ contents{ json } } pageInfo{ hasNextPage endCursor } }` (서버 전량 순회)

> ⚠️ 실제 스키마 필드명은 **`type`**(`eventType` 아님, BE-V 확인). `EventFilter`는 `type`·`module`·`sender` 지원하나 **`module`+`type` 동시 지정 시 에러** — 우리는 완전수식 `type` 하나만 넘기므로 저촉 없음(구현 시 module 병용 금지).

| SDK 함수 | 엔드포인트 | 응답 | 이벤트 타입 · 서버필터 |
|----------|-----------|------|------------------------|
| getSignalEvents | `GET /onchain/events/signals` | SignalQuery[] | signal::SignalEmitted |
| getParticipatedEvents | `GET /onchain/events/participated` | ParticipatedQuery[] | event::Participated |
| getEventCreatedEvents | `GET /onchain/events/event-created` | EventCreatedQuery[] | event::EventCreated |
| getActionLoggedEvents | `GET /onchain/events/action-logged` | ActionLoggedQuery[] | ledger::ActionLogged |
| getMoiCreatedEvents | `GET /onchain/events/moi-created` | MoiCreatedQuery[] | moi::MoiCreated |
| getGiftSentEvents | `GET /onchain/events/gift-sent` | GiftSentQuery[] | gift::GiftSent |
| getIumRequestedEvents | `GET /onchain/events/ium-requested` | IumRequestedQuery[] | ium::IumRequested |
| getIumAcceptedEvents | `GET /onchain/events/ium-accepted` | IumAcceptedQuery[] | ium::IumAccepted |
| getRsvpEvents | `GET /onchain/events/rsvp?weddingId=` | RsvpEvent[] | rsvp::RsvpSubmitted + wedding_id(서버) |
| getNoteSentEvents | `GET /onchain/events/notes-sent?address=` | NoteSentQuery[] | note::NoteSent + from/to==address(서버) |
| (신규) NoteBoxCreated | `GET /onchain/events/note-boxes?address=` | [...] | note::NoteBoxCreated (useNotes:74,89 흡수) |
| (신규) WeddingCreated | `GET /onchain/events/weddings-created` | [...] | wedding::WeddingCreated (useOnchainWeddingList:53 흡수) |

### D. 복합 (서버가 여러 GraphQL 묶어 처리 — 라운드트립·중복 최대 절감)

| SDK 함수 | 엔드포인트 | 응답 | 서버 처리 |
|----------|-----------|------|-----------|
| getInvitationForWedding | `GET /onchain/weddings/{weddingId}/invitation` | InvitationOnChain\|null | getWedding + InvitationCreated 스캔(creator=host 검증) + getInvitation |
| discoverUsers | `GET /onchain/discover?address=` | DiscoveredUser[] | MoiCreated+Participated+EventCreated+Signal 4스캔 + BFS degree. **가장 큰 이득**(브라우저 4스캔→서버 1엔드포인트) |

### 매핑 커버리지 합계
- A 6(5 SDK + MoiItem신규) · B 8(7 SDK + balance신규) · C 12(10 SDK + NoteBox·WeddingCreated 신규) · D 2
- = **SDK 24개 전부 + 신규 4종(MoiItem단건·balance·NoteBoxCreated·WeddingCreated)** 매핑 완료.
- (INV-2 신규 3종 + MoiItem 단건 getObject = 4종. getTransactionBlock은 제외 경계라 미포함.)

### 페이지네이션 정책
- 이벤트(C·D): GraphQL `events`는 커서 페이지네이션. 서버가 `hasNextPage`동안 전량 순회 후 완성 배열 반환(현 queryAllEvents 동작 보존). 결과는 캐시(BE-3)로 재순회 방지.
- 소유물(B): `objects` 커서 페이지네이션 동일 서버 순회.

## BE-3 — 온디맨드 프록시 캐시

가벼운 온디맨드 캐시(사용자 확정). Postgres 이벤트 인덱스는 후속 별도.

### 캐시 저장소
- **프로세스 로컬 인메모리 TTL 캐시.** 권장: `patrickmn/go-cache`(성숙·단순 TTL·janitor 자동 만료) 또는 손수 `map+RWMutex+expiry`. `ristretto`는 대규모 LRU용이라 과함(전역규칙 §2-1 최소).
- Render 단일 인스턴스 가정. 수평 확장 시 Redis로 승격(후속 — 지금 범위 아님).

### 캐시 키 규칙
| 그룹 | 키 예시 | 공유 범위 |
|------|---------|-----------|
| 전역 이벤트(파라미터 없음) | `ev:signals` `ev:participated` `ev:moi-created` … | **전 유저 공유** |
| 파라미터 이벤트 | 전역스캔 원본 `ev:rsvp:_all`·`ev:notes:_all` 캐시 후 wedding_id/address 필터는 **요청별 적용** | 스캔 공유, 필터 요청별 |
| 소유물 | `own:moi-ids:{addr}` `own:participations:{addr}` … | per-user |
| 단일 오브젝트 | `obj:wedding:{id}` `obj:vault:{id}` … | 오브젝트별 공유 |
| 복합 | `discover:{addr}` `inv-for-wedding:{weddingId}` | discover=per-user, inv=공유 |
| 잔액 | `bal:{addr}` | per-user |

> C1(rsvp+weddingId)·C10(notes+address)는 **전역 스캔을 공유 캐시**(`_all`)하고 필터만 요청 시 적용 → 스캔 재사용 극대화. (단순화 원하면 weddingId별 캐시도 가능 — 스캔 중복 vs 키 단순 트레이드오프.)

### TTL (INV-3 확정값 — 전량)
전역 이벤트 30~60s(append-only라 안전) · 소유물 Moi 15s/MoiItem 15s/MoiIds 15s · **wedding-caps 30s** · 참가/이음(participation·ium-requests) 10s · 잔액 5s(또는 무캐시) · 불변 오브젝트(Wedding·Lounge·Invitation) 300s · 변동 오브젝트(Vault 10s·Moi 15s·**MoiItem단건 `obj:moi-item:{id}` 15s**) · discover 60s · **inv-for-wedding 60s**.

### single-flight (중복 스캔 병합) — rate-limit 완화 핵심
- `golang.org/x/sync/singleflight`(이미 go.mod indirect 존재) 사용. **같은 캐시 키에 동시 요청 N개 → GraphQL 스캔 1회만 실행, 나머지는 대기 후 결과 공유.** 이벤트 스캔 thundering herd 차단.

### 무효화 (⚠️ BE-V 지적 반영 — 전역 이벤트 캐시 포함 필수)
- **기본**: 짧은 TTL(per-user 10~15s)로 내 TX 반영 지연 최소화.
- **무효화 endpoint**: `POST /onchain/cache/invalidate?address=` — 프론트가 TX 성공(`sui:tx-success`) 후 호출.
  - per-user 키(`own:*:{addr}`·`bal:{addr}`·`discover:{addr}`) drop **+ 전역 이벤트 키 drop**.
  - ⚠️ **왜 전역까지**: 내 이음/시그널/신규참가는 **전역 이벤트 캐시**(`ev:ium-requested` 30s·`ev:signals` 60s·`discover` 60s)로 서빙된다. per-user만 버리면 내가 방금 보낸 이음이 최대 30~60초 안 보여 **현행(2초 반영) 대비 회귀**. 따라서 tx-success 시 **관련 전역 이벤트 키도 drop**해야 함.
  - 구현: (단순·안전) tx-success 시 전역 이벤트 키 전량 drop → 다음 1회만 single-flight로 재워밍(비용 한정). (정밀) action→event-type 매핑으로 관련 전역 키만 선택 drop.
- **⚠️ 업스트림 인덱서 지연**: 무효화해도 GraphQL(인덱서 기반)이 TX 확정 직후 미반영일 수 있음 → "재조회=즉시 최신"은 보장 아님. 짧은 반영 윈도가 있을 수 있음을 FE에 문서화(현행 직접 RPC보다 약간의 추가 지연 가능).

### 메모리·장애 안전
- 전역 이벤트 캐시: 최대 배열(signal ~547건 등) × 이벤트타입 십수 개 ≈ 수 MB. 안전.
- per-user 키: 10~15s TTL 자동 만료 → 주소 누적 없음(go-cache janitor 청소).
- **GraphQL 429/에러 시**: 만료된 stale 캐시라도 있으면 반환(가용성 우선) + 백오프 재시도(BE-4). 캐시도 없으면 에러 전파.

### rate-limit 완화 정량 목표
- 현재: 인연 1로드 ≈ 40+ 순차 fullnode 요청, 동접 유저마다 반복.
- 프록시 후: 전역 이벤트 스캔은 서버가 TTL당 1회(single-flight). 동접 100명이어도 fullnode 요청 = (이벤트타입 수) × (시간/TTL) → **수백 배 감소**. sunset·CORS는 GraphQL 서버사이드로 이미 해소.

## BE-4 — 인증·CORS·에러 처리

### 인증 — `/onchain/*` = 공개(무인증)
- **온체인 데이터는 본질적으로 공개**(누구나 fullnode에서 읽을 수 있음). 따라서 `/onchain/` 읽기 엔드포인트는 **AuthMiddleware 미적용**(공개).
- **부수 효과(이점)**: 현재 `/users/me` 401(Supabase 세션 만료)이 인연/그래프 읽기를 막던 문제와 **완전 분리**. 미로그인·세션만료여도 온체인 카드가 뜬다.
- 기존 DB 엔드포인트(`/users/me`·`/lounges/...` 등)는 AuthMiddleware·AdminGuard 그대로 유지. 라우팅에서 `/onchain/`을 인증 미들웨어 **바깥**에 등록.
- **남용 방지(옵션)**: `/onchain/*`에 IP당 경량 rate-limit(예: chi httprate) — 프록시 자체가 공개라 과호출 방지. 선택적.

### CORS — 기존 설정 재사용
- 같은 Go API가 서빙하므로 기존 `cors.Handler`(main.go:79, `AllowedOrigins: cfg.AllowedOriginsList()`)를 `/onchain/`도 그대로 상속.
- **확인 필요**: 프로덕션 `ALLOWED_ORIGINS` 환경변수에 `https://dibang-sui.onrender.com` 포함 여부(현재 `/users/me` 401이 브라우저에서 **읽혔다** = origin은 이미 허용됨 → 정상. `default:"http://localhost:*"`뿐이면 프로덕션 env 설정 필수).
- 브라우저↔Go는 same-config CORS로 안정. Go↔Sui(GraphQL)는 서버-투-서버라 CORS 무관.

### 에러 처리
| 상황 | 서버 동작 | HTTP |
|------|-----------|------|
| 오브젝트 없음 | SDK가 null 반환하던 것 → 본문 `null` | **200**(404 아님 — FE 타입 정합) |
| GraphQL 타임아웃 | context deadline(예 10s) → 캐시 stale 있으면 반환, 없으면 오류 | 200(stale) / 504 |
| GraphQL 429(rate-limit) | stale 캐시 반환(BE-3) + 백오프 재시도, 캐시 없으면 | 200(stale) / 503 +Retry-After |
| GraphQL 5xx/네트워크 | 재시도(지수 백오프 2~3회), 실패 시 | 502 |
| 부분 실패(signal 스캔) | **현행 best-effort 정밀 보존** — (i) `/onchain/discover`: 내부 signal 스캔만 try-catch(degree 폴백), Moi/Participated/EventCreated는 hard-fail = 현 `discoverUsers`(queries.ts:607 Promise.all + 613 signal try-catch)와 동일. (ii) 훅의 **독립** `getSignalEvents`(useDiscoverUsers.ts:82 try-catch)는 `/onchain/events/signals` 개별 호출 → FE가 best-effort. 훅의 Promise.all(73-78: discover·ium*)은 현행대로 hard-fail 유지. | 200 |

- **FE 정합 핵심**: null 반환 계약(getWedding 등)·best-effort(discover signal, getSignalEvents try-catch)를 서버가 그대로 재현 → 프론트 로직 불변.
- 모든 GraphQL 호출에 요청 타임아웃(context) + 지수 백오프 재시도. 업스트림 지연이 핸들러를 막지 않게.

### 라우팅 배치 (⚠️ 태스크감사 교정 — 실제 코드베이스 정합)
- **실제 구조**: main.go는 AuthMiddleware·AdminGuard를 전역 `r.Use`로 걸고 모든 OpenAPI 라우트를 oapi-codegen **strict-server 단일 mux**(`HandlerFromMux`)로 마운트한다. **AuthMiddleware는 soft pass-through**(항상 next 호출, 거부 안 함 — auth.go:60). 인증이 필요한 핸들러만 `UserIDFromContext`를 호출해 스스로 게이트. AdminGuard는 `/admin/*` prefix만 거부.
- **따라서 r.Group 재구조화 불필요·위험**(단일 mux와 충돌). 대신:
  1. **onchain 핸들러는 `UserIDFromContext`를 호출하지 않는다** → 자동으로 공개(무인증).
  2. **AdminGuard prefix에 `/onchain/` 없음** 확인(현재 `/admin/`만이라 OK).
  3. **CORS는 전역 `r.Use(cors)` 상속** → `/onchain/`도 자동 커버.
- 즉 라우팅 리팩터가 아니라 "**핸들러가 인증 컨텍스트를 요구하지 않게 두는 것**"이 공개화의 실제 수단. (옵션 IP rate-limit이 필요하면 onchain 라우트 그룹에만 httprate 미들웨어 개별 적용.)

