/**
 * moi 모듈 PTB 빌더.
 *
 * create_moi 는 soulbound 아바타를 recipient에게 직접 transfer(내부) 한다.
 * mint_item / unequip_item 은 MoiItem(NFT)을 반환하므로 owner에게 transfer 한다.
 * equip_item 은 소유한 Moi·MoiItem을 입력으로 받아 아이템을 아바타에 부착한다.
 */

import { Transaction, coinWithBalance } from '@mysten/sui/transactions';
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
  /** dibang 샵 Payment Kit PaymentRegistry 오브젝트 ID(결제·중복방지·treasury 적립). 1회 생성·설정된 registry. */
  registryId: string;
  /** 결제 고유키(중복 결제 방지) — 매 구매마다 고유값(예: crypto.randomUUID()). */
  nonce: string;
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
 * 샵 아이템 **구매**(Mysten Payment Kit 결제 게이트, 결정#6 "Sui in SDK 기반").
 * moi::purchase_item이 내부에서 payment_kit::process_registry_payment로 결제(registry 적립=treasury·중복방지·receipt) +
 * mint 한다. 결제 코인은 **`coinWithBalance`로 유저 본인 SUI에서 소싱** — `splitCoins(tx.gas)` 금지(sponsor가 거부,
 * SUI_SDK.md §Sponsored CRITICAL). 발행받은 MoiItem을 owner에게 전송. mint_item은 public(package) 봉인 = 이 게이트만 통과.
 */
export function buildPurchaseItemTx(params: PurchaseItemParams): Transaction {
  const tx = new Transaction();
  const price = params.priceMist ?? MOI_ITEM_PRICE_MIST;
  // sponsor-safe: 가스(sponsor 코인) 분리 금지 → 유저 본인 SUI에서 가격만큼 선택. setSender는 실행 플로우가 설정.
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
