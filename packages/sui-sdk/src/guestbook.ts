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

/**
 * ⚠️ STALE — 실행 시 abort. `guestbook::write_entry`는 제거됨 → `write(wedding, participation, clock)`.
 * 이름·본문(PII)도 전달. 본문·이름은 오프체인. 사용 금지. 레시피: _audit/2026-06-21-sdk-contract-drift/SUMMARY.md.
 * (구) 방명록 작성 + 생성된 GuestbookEntry를 owner에게 전송.
 */
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

/**
 * ⚠️ STALE — 실행 시 abort. `guestbook::claim_entry` 및 GuestbookEntry 객체 자체가 제거됨(방명록=원장 신호로 일원화).
 * 사용 금지. 레시피: _audit/2026-06-21-sdk-contract-drift/SUMMARY.md.
 * (구) 보유한 방명록 항목을 지정 주소로 전달.
 */
export function buildClaimEntryTx(params: ClaimEntryParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('guestbook', 'claim_entry'),
    arguments: [tx.object(params.entryId), tx.pure.address(params.recipient)],
  });
  return tx;
}

export interface WriteParams {
  weddingId: string;
  /** 하객이 이 결혼식 이벤트에 GUEST로 참가해 받은 Participation 객체 ID(참가-먼저). */
  participationId: string;
}

/**
 * 방명록(현행) — `write(wedding, participation, clock)`. 본문·이름은 오프체인(PII 없음).
 * WRITE_MESSAGE → CS 신호를 온체인 분류·발행한다. buildWriteEntryTx 대체.
 */
export function buildWriteTx(params: WriteParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('guestbook', 'write'),
    arguments: [tx.object(params.weddingId), tx.object(params.participationId), tx.object.clock()],
  });
  return tx;
}
