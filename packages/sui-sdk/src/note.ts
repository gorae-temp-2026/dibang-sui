/**
 * 쪽지(DM) PTB 빌더 + Walrus 저장/조회 + Seal 암호화/복호화.
 *
 * 흐름:
 *   보내기: Seal.encrypt(message, noteBoxId) → Walrus.store(blob) → buildSendNoteTx(noteBox, to, blobId)
 *   받기: queryNoteSentEvents(myAddress) → Walrus.fetch(blobId) → Seal.decrypt(blob)
 */

import { Transaction } from '@mysten/sui/transactions';
import { moveTarget, requireMatrixId } from './constants';

// === PTB 빌더 ===

export interface CreateNoteBoxParams {
  other: string;
}

export interface SendNoteParams {
  noteBoxId: string;
  /** 보내는 사람의 Participation 객체 ID(이벤트 참가 후 받은 것). */
  participationId: string;
  to: string;
  blobId: Uint8Array;
}

export function buildCreateNoteBoxTx(params: CreateNoteBoxParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('note', 'create_note_box'),
    arguments: [tx.pure.address(params.other)],
  });
  return tx;
}

export function buildSendNoteTx(params: SendNoteParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('note', 'send_note_v2'),
    arguments: [
      tx.object(params.noteBoxId),
      tx.object(params.participationId),
      tx.pure.address(params.to),
      tx.pure('vector<u8>', Array.from(params.blobId) as number[]),
      tx.object(requireMatrixId('cs')),
      tx.object.clock(),
    ],
  });
  return tx;
}

// === Walrus 저장/조회 ===
// 공유 Walrus 클라이언트는 walrus.ts로 일반화됨(index에서 export). walrusStore/walrusFetch/walrusStorePII 등은
// '@gorae/sui-sdk'에서 그대로 import 가능. note 모듈은 blobId를 인자로 받기만 한다.

// NoteSentQuery는 queries.ts에서 export — 여기선 중복 정의 안 함.
