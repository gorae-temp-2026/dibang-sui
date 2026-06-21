/**
 * cash_gift 모듈 PTB 빌더.
 *
 * send_gift 는 가스 코인에서 정확한 금액을 분리해 모금함에 입금하고, 반환된
 * CashGiftRecord(영수증)를 송금인에게 전송한다. withdraw 는 인출 Coin을 호스트에게 전송한다.
 */

import { Transaction } from '@mysten/sui/transactions';
import { moveTarget } from './constants';

export interface CreateVaultParams {
  weddingId: string;
  capId: string;
}

export interface SendGiftParams {
  vaultId: string;
  /** MIST 단위 금액(1 SUI = 1_000_000_000 MIST). */
  amount: bigint;
  guestName: string;
  /** 'groom' | 'bride' | 'groom_father' | 'groom_mother' | 'bride_father' | 'bride_mother' */
  recipientSlot: string;
  relationCategory: string;
  /** 영수증(CashGiftRecord)을 받을 주소(보통 송금인 본인). */
  owner: string;
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

/**
 * ⚠️ STALE — 실행 시 abort. `cash_gift::send_gift`는 컨트랙트에서 제거됨 → `give(vault, wedding, participation, coin, clock)`.
 * 이름·관계(PII)도 전달(결정#2 위반). 사용 금지. 정렬 레시피: _audit/2026-06-21-sdk-contract-drift/SUMMARY.md.
 * (구) 축의금 송금: 가스에서 금액 분리 → 모금함 입금 → 영수증을 owner에게 전송.
 */
export function buildSendGiftTx(params: SendGiftParams): Transaction {
  const tx = new Transaction();
  // 단일 분리 코인은 TransactionResult를 그대로 Coin 인자로 사용.
  const coin = tx.splitCoins(tx.gas, [tx.pure.u64(params.amount)]);
  const record = tx.moveCall({
    target: moveTarget('cash_gift', 'send_gift'),
    arguments: [
      tx.object(params.vaultId),
      coin,
      tx.pure.string(params.guestName),
      tx.pure.string(params.recipientSlot),
      tx.pure.string(params.relationCategory),
      tx.object.clock(),
    ],
  });
  tx.transferObjects([record], params.owner);
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
