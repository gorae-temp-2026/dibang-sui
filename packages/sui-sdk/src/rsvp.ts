/**
 * rsvp 모듈 PTB 빌더. submit_rsvp 는 오브젝트를 만들지 않고 이벤트만 발행한다.
 */

import { Transaction } from '@mysten/sui/transactions';
import { moveTarget } from './constants';

export interface SubmitRsvpParams {
  loungeId: string;
  /** 6종 혼주 슬롯 중 하나. */
  recipientSlot: string;
  guestName: string;
  /** 'attending' | 'absent' */
  attendance: string;
  companionCount: number;
  /** 'yes' | 'no' | 'undecided' */
  meal: string;
}

/** 참석 의사 제출 (RsvpSubmitted 이벤트 발행). */
export function buildSubmitRsvpTx(params: SubmitRsvpParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('rsvp', 'submit_rsvp'),
    arguments: [
      tx.object(params.loungeId),
      tx.pure.string(params.recipientSlot),
      tx.pure.string(params.guestName),
      tx.pure.string(params.attendance),
      tx.pure.u64(params.companionCount),
      tx.pure.string(params.meal),
      tx.object.clock(),
    ],
  });
  return tx;
}
