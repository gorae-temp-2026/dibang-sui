/**
 * moi 모듈 PTB 빌더.
 *
 * create_moi 는 soulbound 아바타를 recipient에게 직접 transfer(내부) 한다.
 * mint_item / unequip_item 은 MoiItem(NFT)을 반환하므로 owner에게 transfer 한다.
 * equip_item 은 소유한 Moi·MoiItem을 입력으로 받아 아이템을 아바타에 부착한다.
 */

import { Transaction } from '@mysten/sui/transactions';
import { moveTarget } from './constants';

export interface CreateMoiParams {
  /** 아바타를 받을 주소(보통 호출자 본인). */
  recipient: string;
}

export interface PurchaseItemParams {
  name: string;
  itemType: string;
  slot: string;
  /** 발행한 아이템 NFT를 받을 주소(보통 구매자 본인). */
  owner: string;
  /** 결제(SUI)를 받을 시스템 treasury 주소. */
  treasury: string;
  /** 아이템 가격(MIST). 기본=컨트랙트 moi::ITEM_PRICE. */
  priceMist?: bigint;
}

/** moi::ITEM_PRICE(MIST)와 동기 — 0.001 SUI(데모). 컨트랙트 변경 시 함께 갱신. */
export const MOI_ITEM_PRICE_MIST = 1_000_000n;

export interface EquipItemParams {
  moiId: string;
  itemId: string;
}

export interface UnequipItemParams {
  moiId: string;
  slot: string;
  /** 해제한 아이템을 받을 주소(보통 아바타 소유자). */
  owner: string;
}

/** 아바타 생성 (recipient에게 transfer). */
export function buildCreateMoiTx(params: CreateMoiParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('moi', 'create_moi'),
    arguments: [tx.pure.address(params.recipient)],
  });
  return tx;
}

/**
 * 샵 아이템 **구매**(SUI 결제 게이트, 결정#6). 가스 코인에서 가격만큼 분리해 결제하고,
 * moi::purchase_item(payment, treasury, …)으로 발행받은 MoiItem을 owner에게 전송한다.
 * mint_item은 봉인(public(package))됐으므로 외부는 이 게이트만 통과한다 — 발행 비용이 gift-CS 시빌 내성을 만든다.
 */
export function buildPurchaseItemTx(params: PurchaseItemParams): Transaction {
  const tx = new Transaction();
  const price = params.priceMist ?? MOI_ITEM_PRICE_MIST;
  // 가스 코인에서 정확히 price만큼 분리 → 결제 Coin<SUI>.
  const [payment] = tx.splitCoins(tx.gas, [price]);
  const item = tx.moveCall({
    target: moveTarget('moi', 'purchase_item'),
    arguments: [
      payment,
      tx.pure.address(params.treasury),
      tx.pure.string(params.name),
      tx.pure.string(params.itemType),
      tx.pure.string(params.slot),
    ],
  });
  tx.transferObjects([item], params.owner);
  return tx;
}

/** 아이템 장착 (소유한 Moi·MoiItem 필요). */
export function buildEquipItemTx(params: EquipItemParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('moi', 'equip_item'),
    arguments: [tx.object(params.moiId), tx.object(params.itemId)],
  });
  return tx;
}

/** 아이템 해제 + 해제된 아이템을 owner에게 전송. */
export function buildUnequipItemTx(params: UnequipItemParams): Transaction {
  const tx = new Transaction();
  const item = tx.moveCall({
    target: moveTarget('moi', 'unequip_item'),
    arguments: [tx.object(params.moiId), tx.pure.string(params.slot)],
  });
  tx.transferObjects([item], params.owner);
  return tx;
}
