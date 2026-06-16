/**
 * guestbook 모듈 PTB 빌더.
 *
 * write_entry 는 GuestbookEntry(NFT)를 반환하므로 작성자(owner)에게 transfer 까지 묶는다.
 * claim_entry 는 보유한 항목을 지정 주소로 넘긴다.
 */

import { Transaction } from '@mysten/sui/transactions';
import { moveTarget } from './constants';

export interface WriteEntryParams {
  loungeId: string;
  guestName: string;
  message: string;
  /** 작성한 방명록 NFT를 받을 주소(보통 작성자 본인). */
  owner: string;
}

export interface ClaimEntryParams {
  entryId: string;
  recipient: string;
}

/** 방명록 작성 + 생성된 GuestbookEntry를 owner에게 전송. */
export function buildWriteEntryTx(params: WriteEntryParams): Transaction {
  const tx = new Transaction();
  const entry = tx.moveCall({
    target: moveTarget('guestbook', 'write_entry'),
    arguments: [
      tx.object(params.loungeId),
      tx.pure.string(params.guestName),
      tx.pure.string(params.message),
      tx.object.clock(),
    ],
  });
  tx.transferObjects([entry], params.owner);
  return tx;
}

/** 보유한 방명록 항목을 지정 주소로 전달. */
export function buildClaimEntryTx(params: ClaimEntryParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('guestbook', 'claim_entry'),
    arguments: [tx.object(params.entryId), tx.pure.address(params.recipient)],
  });
  return tx;
}
