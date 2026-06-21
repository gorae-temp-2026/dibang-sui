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

export interface MintItemParams {
  name: string;
  itemType: string;
  slot: string;
  /** 발행한 아이템 NFT를 받을 주소. */
  owner: string;
}

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
 * 아이템 발행 + owner에게 전송.
 * TODO(결정#6, 2026-06-21): '발행'이 아니라 'SUI 결제 구매'여야 한다. Sui payment SDK로 Coin<SUI>
 *   입력을 받아 moi::purchase_item(payment, …)을 호출하는 buildPurchaseItemTx로 전환(무료 mint는 임시).
 *   YONE(Coin<YONE>) 전환은 후순위 — 지금은 모든 결제=SUI 직접.
 */
export function buildMintItemTx(params: MintItemParams): Transaction {
  const tx = new Transaction();
  const item = tx.moveCall({
    target: moveTarget('moi', 'mint_item'),
    arguments: [
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
