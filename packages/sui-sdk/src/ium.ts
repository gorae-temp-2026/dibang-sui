/**
 * ium 모듈 PTB 빌더.
 *
 * create_ium 은 공유 IumRegistry(설정에서 ID 주입)와 함께 호출해 Ium(NFT)을 반환하므로
 * owner에게 transfer 한다. revoke_ium 은 보유한 Ium을 소비한다.
 */

import { Transaction } from '@mysten/sui/transactions';
import { moveTarget, getConfig } from './constants';

export interface CreateIumParams {
  toUser: string;
  relationType: string;
  label: string;
  /** 생성한 Ium을 받을 주소(보통 호출자 본인 = from_user). */
  owner: string;
}

export interface RevokeIumParams {
  iumId: string;
}

/** 신뢰 관계 생성 + Ium을 owner에게 전송. */
export function buildCreateIumTx(params: CreateIumParams): Transaction {
  const tx = new Transaction();
  const ium = tx.moveCall({
    target: moveTarget('ium', 'create_ium'),
    arguments: [
      tx.object(getConfig().iumRegistryId),
      tx.pure.address(params.toUser),
      tx.pure.string(params.relationType),
      tx.pure.string(params.label),
      tx.object.clock(),
    ],
  });
  tx.transferObjects([ium], params.owner);
  return tx;
}

/** 신뢰 관계 취소 (보유한 Ium 소비, 레지스트리에서 쌍 제거). */
export function buildRevokeIumTx(params: RevokeIumParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('ium', 'revoke_ium'),
    arguments: [tx.object(getConfig().iumRegistryId), tx.object(params.iumId)],
  });
  return tx;
}
