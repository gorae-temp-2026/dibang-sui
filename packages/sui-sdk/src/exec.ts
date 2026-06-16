/**
 * 트랜잭션 실행 헬퍼.
 *
 * 빌더가 만든 PTB는 컨트랙트의 여러 `assert!`(EZeroAmount, EWrongCap, ESelfLink,
 * 글자수 초과 등)를 트리거할 수 있다. 트랜잭션이 온체인에 들어가도 Move abort로 실패할 수
 * 있으므로(빌드/제출 성공 ≠ 실행 성공), 반드시 effects.status로 성공을 확인해야 한다.
 * 이 헬퍼는 서명·실행·인덱싱 대기·성공 검증을 한데 묶는다.
 *
 * (프론트엔드는 dApp Kit의 signAndExecuteTransaction 결과의 FailedTransaction 분기를
 * 직접 확인한다. 이 헬퍼는 Node 스크립트·백엔드용.)
 */

import type { SuiJsonRpcClient, SuiTransactionBlockResponse } from '@mysten/sui/jsonRpc';
import type { Transaction } from '@mysten/sui/transactions';
import type { Signer } from '@mysten/sui/cryptography';

export interface ExecuteOptions {
  transaction: Transaction;
  signer: Signer;
}

/**
 * 트랜잭션을 서명·실행하고 인덱싱을 기다린 뒤, Move abort 등으로 실패하면 throw 한다.
 * 성공 시 effects/objectChanges/events가 포함된 응답을 반환한다.
 */
export async function executeAndAssert(
  client: SuiJsonRpcClient,
  { transaction, signer }: ExecuteOptions,
): Promise<SuiTransactionBlockResponse> {
  const res = await client.signAndExecuteTransaction({
    transaction,
    signer,
    options: { showEffects: true, showObjectChanges: true, showEvents: true },
  });
  await client.waitForTransaction({ digest: res.digest });

  const status = res.effects?.status?.status;
  if (status !== 'success') {
    const err = res.effects?.status?.error ?? 'unknown error';
    throw new Error(`transaction failed (${err}) — digest ${res.digest}`);
  }
  return res;
}
