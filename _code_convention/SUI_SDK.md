# Sui TypeScript SDK 컨벤션

> `packages/sui-sdk/`(@gorae/sui-sdk) + 프론트 온체인 호출에 적용. 작성·리뷰 전
> `~/.claude/skills/sui-dev-skills/sui-ts-sdk/` 및 `sui-frontend/`를 함께 읽는다. 설치 버전: `@mysten/sui` v2.

## 패키지·클라이언트
- 패키지는 **`@mysten/sui`**(v2). 구 `@mysten/sui.js` 금지. subpath import(`@mysten/sui/transactions`, `/grpc`, `/jsonRpc`, `/zklogin`, `/keypairs/ed25519`, `/utils`, `/cryptography`).
- 신규 코드 기본 클라이언트는 **`SuiGrpcClient`**(`@mysten/sui/grpc`) — 오브젝트 조회·트랜잭션 실행.
- **이벤트 쿼리(queryEvents)는 gRPC Core API에 대응이 없다 → `SuiJsonRpcClient`(`@mysten/sui/jsonRpc`) 또는 GraphQL 사용.** 본 SDK는 두 팩토리(`createSuiClient` gRPC / `createJsonRpcClient` JSON-RPC)를 제공.

## PTB 빌더
- `Transaction`(`@mysten/sui/transactions`). 구 `TransactionBlock` 금지.
- pure 값은 타입 헬퍼: `tx.pure.string/address/u64/bool`, **Option은 `tx.pure.option('string', v ?? null)`**.
- 객체는 `tx.object(id)`, 시스템 객체 단축 `tx.object.clock()`(0x6).
- **단일 반환값은 구조분해(`const [x] =`)하지 말고 `TransactionResult`를 그대로 인자로 사용** —
  `noUncheckedIndexedAccess`에서 구조분해는 `undefined` 가능성. 예: `const cap = tx.moveCall(...); tx.transferObjects([cap], owner)`.
- `splitCoins(tx.gas, [tx.pure.u64(amount)])`도 단일이면 결과 직접 사용.
- 금액은 `bigint`(MIST). 빌더는 `Transaction`을 반환(합성·sponsor용).

## 실행·검증
- **실행 후 반드시 성공 검증.** 빌드/제출 성공 ≠ 온체인 성공(Move abort 가능). 본 SDK의 `executeAndAssert`
  (서명→인덱싱 대기→`effects.status` 확인→실패 시 throw) 사용. 프론트(dApp Kit)는 결과의 `FailedTransaction` 분기 확인.
- 후속 조회 전 `waitForTransaction`.

## 조회·이벤트 (신뢰 잔액 입력)
- 오브젝트 필드는 JSON-RPC `getObject({ showContent })`가 파싱 JSON으로 와 다루기 쉬움. Move `Option`은
  직렬화 형태가 환경별로 달라(값/null/`{vec}`) 방어적 파싱.
- u64는 JSON에서 문자열 → 금액(balance/amount)은 `BigInt(...)`로, 타임스탬프·작은 카운트만 `Number(...)`(2^53 주의).
- **이벤트 조회 스케일 한계**: JSON-RPC `queryEvents`는 이벤트 *필드*(lounge_id 등) 필터를 지원 안 해 패키지
  전역 이벤트를 다 가져와 클라 필터링 → O(전체 이벤트). **프로덕션은 전용 인덱서**(sui-indexer-alt-framework)로
  대체. (신뢰 잔액 집계도 결국 인덱서 기반이 될 것.)

## zkLogin (프론트, dibang-wedding)
- `@mysten/sui/zklogin`: `generateNonce/generateRandomness/jwtToAddress/genAddressSeed/getExtendedEphemeralPublicKey/getZkLoginSignature/decodeJwt`. 별도 `@mysten/zklogin` 패키지 아님.
- 흐름: ephemeral keypair+nonce → Google OAuth(id_token) → Salt 서버 → `jwtToAddress(jwt,salt,false)` → ZK prover proof → ephemeral 서명을 zkLogin 서명으로 조립. ephemeral 키는 세션(sessionStorage) 보관.
- **라이브 동작엔 Google OAuth client id + 실행 중 ZK prover 필요**(헤드리스 검증 불가).

## Sponsored Transaction (가스 대납)
- 흐름: 클라가 `onlyTransactionKind` 빌드 → sponsor가 sender/gasOwner/budget 설정·서명 → 클라가 최종 bytes 서명 → 두 서명으로 실행.
- **보안: sponsor는 tx의 모든 커맨드를 화이트리스트 검증.** MoveCall은 허용 패키지만 + **어떤 커맨드도
  가스 코인(`tx.gas`)을 인자로 쓰면 거부**(없으면 `splitCoins(gas)+transfer`로 가스 탈취 가능 — 실제 발견된 CRITICAL).
  Publish/Upgrade/미지 커맨드 거부. (독립 감사가 이 두 CRITICAL을 잡았음 — `sponsor.ts` 참조.)
- standalone Node 서비스(`scripts/sponsor-server.ts`), 키는 env로만, body 크기 제한, (프로덕션) 인증·rate limit 필요.

## tsconfig
- 프로젝트 표준은 `moduleResolution: bundler`(web-utils 등과 일관). 패키지는 소스로 소비(`main: ./src/index.ts`, 빌드 단계 없음). 타입 검증은 `tsc --noEmit`.
