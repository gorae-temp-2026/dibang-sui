/**
 * gift 모듈 PTB 빌더 (선물 = MoiItem 증여 + GIFT 신호).
 *
 * gift(participation, item, recipient, clock): MoiItem을 recipient에게 이전 + GIFT(soulbound ActionRecord) 기록.
 * 방향(giver→recipient)·event는 giver의 Participation에서 파생(위조 불가). 자산은 옮겨가도 "증여했다" 기록은 giver에 남는다.
 */

import { Transaction, coinWithBalance } from '@mysten/sui/transactions';
import { moveTarget, requireMatrixId } from './constants';

export interface GiftParams {
  /** 선물하는 사람(giver)의 Participation 객체 ID — 자기 소유 soulbound(방향·event 파생). */
  participationId: string;
  /** 선물할 MoiItem 객체 ID(giver 소유). */
  itemId: string;
  /** 받는 사람 주소. */
  recipient: string;
}

/** 선물 — gift(participation, item, recipient, clock). MoiItem 이전 + GIFT 신호 기록(한 트잭). */
export function buildGiftTx(params: GiftParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('gift', 'gift'),
    arguments: [
      tx.object(params.participationId),
      tx.object(params.itemId),
      tx.pure.address(params.recipient),
      tx.object(requireMatrixId('cs')),
      tx.object.clock(),
    ],
  });
  return tx;
}

export interface PurchaseAndGiftParams {
  participationId: string;
  recipient: string;
  registryId: string;
  nonce: string;
  name: string;
  itemType: string;
  slot: string;
  priceMist?: bigint;
}

/** 구매+선물 한 PTB — purchase_item 결과를 바로 gift 입력으로. */
export function buildPurchaseAndGiftTx(params: PurchaseAndGiftParams): Transaction {
  const tx = new Transaction();
  const price = params.priceMist ?? 1_000_000n;
  const payment = coinWithBalance({ balance: price });
  const item = tx.moveCall({
    target: moveTarget('moi', 'purchase_item'),
    arguments: [
      tx.object(params.registryId),
      tx.pure.string(params.nonce),
      payment,
      tx.pure.string(params.name),
      tx.pure.string(params.itemType),
      tx.pure.string(params.slot),
      tx.object.clock(),
    ],
  });
  tx.moveCall({
    target: moveTarget('gift', 'gift'),
    arguments: [
      tx.object(params.participationId),
      item,
      tx.pure.address(params.recipient),
      tx.object(requireMatrixId('cs')),
      tx.object.clock(),
    ],
  });
  return tx;
}
