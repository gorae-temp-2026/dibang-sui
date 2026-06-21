/**
 * guestbook 모듈 PTB 빌더.
 *
 * write 는 방명록 작성을 WRITE_MESSAGE → CS 신호로 온체인 기록한다(본문·이름은 오프체인, PII 없음, 참가-먼저).
 * (구 write_entry/claim_entry + GuestbookEntry 객체는 컨트랙트에서 제거됨 — cutover로 빌더도 삭제.)
 */

import { Transaction } from '@mysten/sui/transactions';
import { moveTarget } from './constants';

export interface WriteParams {
  weddingId: string;
  /** 하객이 이 결혼식 이벤트에 GUEST로 참가해 받은 Participation 객체 ID(참가-먼저). */
  participationId: string;
}

/**
 * 방명록 — `write(wedding, participation, clock)`. 본문·이름은 오프체인(PII 없음).
 * WRITE_MESSAGE → CS 신호를 온체인 분류·발행한다.
 */
export function buildWriteTx(params: WriteParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('guestbook', 'write'),
    arguments: [tx.object(params.weddingId), tx.object(params.participationId), tx.object.clock()],
  });
  return tx;
}
