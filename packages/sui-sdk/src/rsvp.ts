/**
 * rsvp 모듈 PTB 빌더. submit_rsvp 는 오브젝트를 만들지 않고 이벤트만 발행한다.
 */

import { Transaction } from '@mysten/sui/transactions';
import { moveTarget } from './constants';

export interface SubmitRsvpParams {
  loungeId: string;
  /** 혼주 슬롯 u8(§1-6): groom=0·bride=1·groom_father=2·groom_mother=3·bride_father=4·bride_mother=5. */
  recipientSlot: number;
  /** attendance u8: attending=0, absent=1. */
  attendance: number;
  companionCount: number;
  /** meal u8: yes=0, no=1, undecided=2. */
  meal: number;
}

/** 참석 의사 제출 (RsvpSubmitted 이벤트 발행). */
export function buildSubmitRsvpTx(params: SubmitRsvpParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('rsvp', 'submit_rsvp'),
    arguments: [
      tx.object(params.loungeId),
      tx.pure.u8(params.recipientSlot),
      tx.pure.u8(params.attendance),
      tx.pure.u64(params.companionCount),
      tx.pure.u8(params.meal),
      tx.object.clock(),
    ],
  });
  return tx;
}
