# E2E 테스트 실행 규칙

> 3개 세션이 병렬로 실행. 각 세션은 독립 지갑을 생성하고, 독립 시나리오를 수행하며, 결과를 자기 폴더에 기록한다.

## 세션 ↔ 에이전트 ↔ 폴더 매핑

| 세션 | 에이전트 | 시나리오 | 결과 폴더 | Playwright 포트 |
|------|----------|---------|-----------|----------------|
| 현재 세션 (메인) | Agent A | A-1 ~ A-8 (Wedding, CashGift, RSVP) | `agent-a/` | 9222 |
| dibang-sui(E2E Test2) | Agent B | B-1 ~ B-8 (Moi, Gift, Guestbook, EdgeBalance, 쿼리) | `agent-b/` | 9223 |
| dibang-sui(E2E Test3) | Agent C | C-1 ~ C-8 (Ium, 역할, TrustMatrix, Registry, 통합, 엣지) | `agent-c/` | 9224 |

## Playwright 분배 전략

각 세션이 Playwright MCP 브라우저를 별도 포트로 사용하므로 충돌 없음:
- Agent A: CDP port 9222 (기본)
- Agent B: CDP port 9223
- Agent C: CDP port 9224

스크린샷은 각 세션의 결과 폴더에 시나리오 ID를 파일명으로 저장:
- 형식: `{시나리오ID}_{설명}.png` (예: `A-1-1_wedding-created.png`)
- 실패 시: `{시나리오ID}_FAIL_{에러요약}.png`

## 실행 방식

### 1. 공통 사전 작업 (각 세션이 독립 수행)

```ts
// 공통 셋업 — 각 세션이 자기 지갑을 만들고 SUI를 충전
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { createJsonRpcClient, executeAndAssert, configureSui } from '@gorae/sui-sdk';
import { TESTNET_CONFIG } from '@gorae/sui-sdk';

configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');

// 자금 지갑 로드 (packages/sui-sdk/scripts/.shop-admin-key)
const funder = Ed25519Keypair.fromSecretKey(readFileSync('.shop-admin-key', 'utf-8').trim());

// 지갑 생성 + 펀딩
async function createAndFundWallet(): Promise<Ed25519Keypair> {
  const kp = new Ed25519Keypair();
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [100_000_000]); // 0.1 SUI
  tx.transferObjects([coin], kp.toSuiAddress());
  await executeAndAssert(client, { transaction: tx, signer: funder });
  return kp;
}
```

### 2. 시나리오 실행

- 시나리오를 `_e2e/2026-06-22.md` 순서대로 하나씩 실행
- 각 시나리오 결과를 `{폴더}/results.jsonl`에 한 줄씩 추가:
  ```json
  {"id": "A-1-1", "status": "PASS", "digest": "...", "ts": "2026-06-22T..."}
  {"id": "A-1-2", "status": "PASS", "data": {...}, "ts": "..."}
  {"id": "A-2-3", "status": "FAIL", "error": "ENotPrimaryHost", "ts": "..."}
  ```
- 실패(FAIL)는 기대한 실패(abort code 검증)와 예상치 못한 실패를 구분:
  - `EXPECTED_FAIL`: 시나리오에서 abort를 기대한 실패 → PASS 처리
  - `UNEXPECTED_FAIL`: 성공해야 하는데 실패 → 원인 분석 + 코드 수정

### 3. 스크린샷 규칙

- Playwright MCP로 Sui Explorer에서 트랜잭션/오브젝트를 열어 스크린샷
- 각 섹션의 마지막 시나리오 완료 시 반드시 스크린샷 1장 이상
- 스크린샷 파일명: `{시나리오ID}_{설명}.png`
- 결과 폴더에 저장

### 4. 실패 시 대응

1. 예상치 못한 실패 발생 → 에러 메시지와 digest 기록
2. SDK 빌더 버그인지, 컨트랙트 불일치인지, 오브젝트 ID 참조 오류인지 분석
3. 수정 가능하면 수정 후 해당 시나리오만 재실행
4. 수정 불가하면 `{폴더}/issues.md`에 이슈 기록

### 5. 완료 보고

각 세션은 모든 시나리오 완료 후 `{폴더}/SUMMARY.md`를 작성:
- 총 시나리오 수 / PASS / EXPECTED_FAIL / UNEXPECTED_FAIL
- 발견한 이슈 목록
- 수정한 코드 목록

## 환경 정보

- 네트워크: Sui testnet
- 패키지 ID: `0xf3c24dcc1455a12c3b066e4d9d40112d7be66dd0ccdfe729b9781b42e28f975e`
- 자금 지갑 키: `packages/sui-sdk/scripts/.shop-admin-key`
- TrustRegistry: `0x40225b1c55205ca72e1eb87981c520b25a65d8a25a7c8c4f956a428bf2ac0fa3`
- EM-money Matrix: `0xf586876eca4cbb089b80ce23af4f8c3baa8e1bbdd72623ccfc6caffd1849596d`
- CS Matrix: `0x678551caf41f1be477cac8b64fe0e493039e949b8591a0c88289a10c47116f9b`
- Shop Registry: `0x06cd52b59efdc3e0c4807204be0b3d449842dc591c57cf2cb6704a2b8c4d482c`

## Mock/Fixture 데이터 탐지 — 실제 데이터 연결 확인 필수

E2E 테스트의 핵심 목적 중 하나는 **mock 데이터로 가려진 미연결 부분을 찾는 것**이다. 시나리오 실행 시 해당 코드도 함께 읽으면서, mock으로 우회하고 있는 곳을 발견하면 기록한다.

### Mock/Fixture 파일 위치 (전수 조사 완료)

**dibang-wedding 앱:**
| 경로 | 설명 |
|------|------|
| `src/dev/devFixtures.ts` | DEV 전용 — 철수/영희 결혼식, 참여 이벤트, 라운지 피드, DeFi 예측 fixture 데이터 |
| `src/dev/seedDevFixtures.ts` | dev fixture를 로컬 스토리지에 시드하는 함수 |
| `src/dev/devBypass.ts` | 개발 모드 우회 로직 |
| `src/components/profile/fixture.ts` | 철수 프로필 fixture (sim-scale.mjs 산출물) |
| `src/components/profile/personaProfiles.ts` | 페르소나별 프로필 데이터 |
| `src/components/moi-gather/data.ts` | Moi 모임/Plaza 더미 데이터 (PLAZA_WEDDING 등) |
| `src/types/lounge-v2.ts` | 라운지 V2 타입 + fixture 참조 |
| `src/bootstrap.tsx` | 앱 시작 시 dev fixture 시딩 호출부 |

**guest-web 앱:**
| 경로 | 설명 |
|------|------|
| `src/mocks/handlers.ts` | MSW 핸들러 (현재 /api/health만) |
| `src/mocks/server.ts` | MSW 서버 셋업 |
| `e2e/fixtures.ts` | E2E 테스트 fixture |

**fixture를 사용하는 주요 페이지/컴포넌트:**
- `InyeonPage.tsx` — devFixtures 참조
- `MoiGatherPage.tsx` — data.ts 더미 데이터 참조
- `WeddingListPage.tsx` — devFixtures 참조
- `NetworkPage.tsx` — devFixtures 참조
- `DefiTeaserCard.tsx` — WEDDING_FORECAST fixture
- `SettingsPage.tsx` — devFixtures 참조
- `DisplayWeddingMemoryBook.tsx` — fixture 참조
- 각종 *.test.ts/tsx — 단위 테스트 mock (이건 정상)

### E2E에서 확인할 것

시나리오 실행하면서 **해당 코드 파일도 같이 읽고**:
1. 이 페이지/컴포넌트가 온체인 데이터 대신 fixture를 렌더하고 있는지 확인
2. API 호출이 실제 Supabase/Go API로 가는지, MSW로 가로채는지 확인
3. 온체인 쿼리(getWedding 등)가 실제 RPC를 치는지, 하드코딩 ID를 쓰는지 확인
4. 발견한 mock 의존성을 `issues.md`에 기록:
   ```
   ## Mock 의존성 발견
   - [ ] InyeonPage: discoverUsers() 결과 대신 devFixtures.PARTICIPATED 사용
   - [ ] DefiTeaserCard: WEDDING_FORECAST fixture 하드코딩 (온체인 신용 미연결)
   ```

## [CRITICAL] 지갑 키 저장 필수

**E2E 스크립트에서 생성한 지갑 키페어는 반드시 파일로 저장한다.**

```ts
// 지갑 생성 후 즉시 저장
const walletData = {
  Host: { address: Host.toSuiAddress(), sk: Host.getSecretKey() },
  // ...
};
writeFileSync('wallets.json', JSON.stringify(walletData, null, 2));
```

- 저장 위치: `_e2e/2026-06-22-results/agent-{a,b,c}/wallets.json`
- 재실행 시 기존 파일이 있으면 로드, 없으면 생성+저장+펀딩
- `.gitignore`에 `wallets.json` 추가 (비밀키 포함이므로)
- **교훈**: 2026-06-22 첫 실행에서 키 저장 안 해서 3개 세션 모두 약 0.5 SUI(testnet) 접근 불가 상태로 유실

## 시나리오 문서

상세 시나리오는 `_e2e/2026-06-22.md` 참조.
