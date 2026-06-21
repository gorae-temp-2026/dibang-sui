/**
 * cash_gift 모듈 PTB 빌더.
 *
 * give 는 가스 코인에서 금액을 분리해 모금함에 입금하고 GIVE_MONEY → BUSU 신호를 발행한다(PII 없음, 참가-먼저).
 * withdraw 는 인출 Coin을 호스트에게 전송한다.
 */

import { Transaction } from '@mysten/sui/transactions';
import { moveTarget } from './constants';

export interface CreateVaultParams {
  weddingId: string;
  capId: string;
}

export interface WithdrawParams {
  vaultId: string;
  capId: string;
  amount: bigint;
  /** 인출 Coin<SUI>를 받을 주소(보통 호스트 본인). */
  owner: string;
}

/** 결혼식 축의금 모금함 생성 (WeddingCap 필요, 결혼식당 1개). */
export function buildCreateVaultTx(params: CreateVaultParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('cash_gift', 'create_vault'),
    arguments: [tx.object(params.weddingId), tx.object(params.capId)],
  });
  return tx;
}

/** 호스트 축의금 인출: 인출 Coin을 owner에게 전송. */
export function buildWithdrawTx(params: WithdrawParams): Transaction {
  const tx = new Transaction();
  const coin = tx.moveCall({
    target: moveTarget('cash_gift', 'withdraw'),
    arguments: [
      tx.object(params.vaultId),
      tx.object(params.capId),
      tx.pure.u64(params.amount),
    ],
  });
  tx.transferObjects([coin], params.owner);
  return tx;
}

export interface GiveParams {
  vaultId: string;
  weddingId: string;
  /** 하객(actor)이 이 결혼식 이벤트에 GUEST로 참가해 받은 Participation 객체 ID(참가-먼저). */
  participationId: string;
  /** MIST 단위 부조 금액. */
  amount: bigint;
}

/**
 * 부조(현행) — 가스에서 금액 분리 → `give(vault, wedding, participation, coin, clock)`. PII 없음(결정#2).
 * give가 방향·역할을 participation에서 파생해 GIVE_MONEY → BUSU 신호를 온체인 분류·발행한다.
 */
export function buildGiveTx(params: GiveParams): Transaction {
  const tx = new Transaction();
  const coin = tx.splitCoins(tx.gas, [tx.pure.u64(params.amount)]);
  tx.moveCall({
    target: moveTarget('cash_gift', 'give'),
    arguments: [
      tx.object(params.vaultId),
      tx.object(params.weddingId),
      tx.object(params.participationId),
      coin,
      tx.object.clock(),
    ],
  });
  return tx;
}
