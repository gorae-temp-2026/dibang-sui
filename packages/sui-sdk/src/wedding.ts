/**
 * wedding 모듈 PTB 빌더.
 *
 * **결정#2(신원-불가지): create_wedding은 익명 앵커만 생성한다.** 신랑·신부·예식장 등 표시정보는
 * 온체인에 보내지 않고 오프체인(Supabase)에 저장한다 — 빌더도 그 인자를 받지 않는다.
 * create_wedding은 `WeddingCap`을 반환(합성 가능)하므로 빌더가 owner에게 transfer까지 묶는다.
 */

import { Transaction } from '@mysten/sui/transactions';
import { moveTarget } from './constants';

export interface CreateWeddingParams {
  /** WeddingCap을 받을 주소(보통 호출자 본인). */
  owner: string;
}

export interface AddHostParams {
  weddingId: string;
  capId: string;
  newHost: string;
}

/** 결혼식(익명 앵커) 생성 + 생성된 WeddingCap을 owner에게 전송. 표시정보(이름·예식장)는 온체인에 안 보낸다(결정#2). */
export function buildCreateWeddingTx(params: CreateWeddingParams): Transaction {
  const tx = new Transaction();
  // create_wedding(clock, ctx): WeddingCap — 표시 인자 없음(익명 앵커만). 단일 반환값은 그대로 인자로 쓴다.
  const cap = tx.moveCall({
    target: moveTarget('wedding', 'create_wedding'),
    arguments: [tx.object.clock()],
  });
  tx.transferObjects([cap], params.owner);
  return tx;
}

/** 호스트(혼주) 추가 (WeddingCap 필요). */
export function buildAddHostTx(params: AddHostParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('wedding', 'add_host'),
    arguments: [
      tx.object(params.weddingId),
      tx.object(params.capId),
      tx.pure.address(params.newHost),
    ],
  });
  return tx;
}
