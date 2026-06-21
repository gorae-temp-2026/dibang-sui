# Agent C 미션 — Ium · 역할 · TrustMatrix · Registry · 통합 · 엣지

> 이 파일을 읽고 E2E 테스트를 실행하세요.

## 역할

너는 E2E 테스트 **Agent C**. 시나리오 C-1 ~ C-8을 실행한다.

## 필독 파일 (순서대로)

1. `_e2e/2026-06-22-results/E2E_RULES.md` — 실행 규칙, 환경 정보, 결과 기록 방식
2. `_e2e/2026-06-22.md` — 전체 시나리오. **에이전트 C 섹션만** 실행

## 시나리오 범위

- **C-1**: 이음 신청 (request_ium)
- **C-2**: 이음 수락 (accept_ium)
- **C-3**: 역할 할당 (assign_role — SDK 빌더 없음, 직접 PTB)
- **C-4**: TrustMatrix / TrustRegistry / Signal 검증 (16개 세부 시나리오)
- **C-5**: TrustRegistry 관리 (add_matrix — 직접 PTB)
- **C-6**: 통합 시나리오: 완전한 결혼식 라이프사이클
- **C-7**: 교차 결혼식 시나리오
- **C-8**: 엣지 케이스 모음 (14개)

## 지갑 구성

지갑 5개 생성 + 각각 0.1 SUI 펀딩:
- **Host**: 결혼식 혼주
- **CoHost**: 공동 혼주
- **Guest1, Guest2, Guest3**: 하객 (Ium 신청자/수신자 겸용)

자금 지갑: `packages/sui-sdk/scripts/.shop-admin-key`

## SDK 빌더 없는 함수 — 직접 PTB 구성

### assign_role (C-3)
```ts
import { Transaction } from '@mysten/sui/transactions';
import { moveTarget } from '@gorae/sui-sdk';

const tx = new Transaction();
tx.moveCall({
  target: moveTarget('event', 'assign_role'),
  arguments: [tx.object(eventId), tx.pure.address(toAddress), tx.pure.u8(roleId), tx.object.clock()],
});
```

### add_matrix (C-5)
```ts
const tx = new Transaction();
tx.moveCall({
  target: moveTarget('trust_registry', 'add_matrix'),
  arguments: [tx.object(registryId), tx.pure.u8(kind), tx.pure.u8(resourceId)],
});
```

### edge_balance (B-7이 담당하지만, C-8 엣지 케이스에서도 참조 가능)
```ts
// create_edge
const tx = new Transaction();
tx.moveCall({
  target: moveTarget('edge_balance', 'create_edge'),
  arguments: [tx.pure.address(p0), tx.pure.address(p1)],
});

// record
const tx = new Transaction();
tx.moveCall({
  target: moveTarget('edge_balance', 'record'),
  arguments: [
    tx.object(edgeId), tx.object(matrixId),
    tx.pure.address(from), tx.pure.address(to),
    tx.pure.u8(kind), tx.pure.u8(resourceId), tx.pure.u64(magnitude),
  ],
});
```

## 사전 셋업

C-1/C-2(Ium)은 독립적(결혼식 불필요).
C-3~C-8은 결혼식이 필요하므로:
1. Host가 결혼식 생성 → Wedding + Event + Cap
2. Host가 Vault 생성
3. Guest1~3이 GUEST로 참가
4. Host가 Guest1~3 초대 (C-6 통합 시나리오)

## 실행 방법

```bash
cd packages/sui-sdk
pnpm tsx scripts/your-test-script.ts
```

## 결과 기록

- 이 폴더(`_e2e/2026-06-22-results/agent-c/`)에 기록
- `results.jsonl`: 시나리오별 결과
- 스크린샷: `{시나리오ID}_{설명}.png`
- 이슈: `issues.md`
- 완료 시: `SUMMARY.md`

## Playwright

스크린샷은 Playwright MCP로. 각 섹션 완료 시 Sui Explorer에서 트랜잭션 확인 스크린샷.

## 시작

이 파일을 다 읽었으면 바로 시작. 시나리오를 C-1부터 순서대로 실행.
