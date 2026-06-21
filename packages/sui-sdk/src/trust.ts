/**
 * trust_registry / trust_matrix PTB 빌더 — 온체인 신뢰 집계(fold·전파) 레이어.
 *
 * bootstrap: TrustRegistry + 표준 매트릭스(EM-money, CS)를 1회 생성·공유·등록(결정#42·#45).
 *   실행 후 objectChanges/이벤트에서 registry·matrix ID들을 회수해 configureSui로 주입한다
 *   (이후 give/write/invite/gift/participate/accept_ium 빌더가 그 매트릭스로 라우팅).
 */

import { Transaction } from '@mysten/sui/transactions';
import { moveTarget } from './constants';

/** TrustRegistry + 표준 매트릭스(EM-money, CS) 부트스트랩(1회). 인자 없음. */
export function buildBootstrapTrustTx(): Transaction {
  const tx = new Transaction();
  tx.moveCall({ target: moveTarget('trust_registry', 'bootstrap'), arguments: [] });
  return tx;
}
