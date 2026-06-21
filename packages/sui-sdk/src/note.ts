/**
 * 쪽지(DM) PTB 빌더 + Walrus 저장/조회 + Seal 암호화/복호화.
 *
 * 흐름:
 *   보내기: Seal.encrypt(message, noteBoxId) → Walrus.store(blob) → buildSendNoteTx(noteBox, to, blobId)
 *   받기: queryNoteSentEvents(myAddress) → Walrus.fetch(blobId) → Seal.decrypt(blob)
 */

import { Transaction } from '@mysten/sui/transactions';
import { moveTarget } from './constants';

// === PTB 빌더 ===

export interface CreateNoteBoxParams {
  other: string;
}

export interface SendNoteParams {
  noteBoxId: string;
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
    target: moveTarget('note', 'send_note'),
    arguments: [
      tx.object(params.noteBoxId),
      tx.pure.address(params.to),
      tx.pure('vector<u8>', Array.from(params.blobId) as number[]),
      tx.object.clock(),
    ],
  });
  return tx;
}

// === Walrus 저장/조회 ===

const WALRUS_PUBLISHER = 'https://publisher.walrus-testnet.walrus.space';
const WALRUS_AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space';

export async function walrusStore(data: Uint8Array): Promise<string> {
  const res = await fetch(`${WALRUS_PUBLISHER}/v1/blobs`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: data as unknown as BodyInit,
  });
  if (!res.ok) throw new Error(`Walrus store failed: ${res.status}`);
  const json = await res.json() as Record<string, unknown>;
  const newlyCreated = json.newlyCreated as { blobObject?: { blobId?: string } } | undefined;
  const alreadyCertified = json.alreadyCertified as { blobId?: string } | undefined;
  const blobId = newlyCreated?.blobObject?.blobId ?? alreadyCertified?.blobId;
  if (!blobId) throw new Error('Walrus: no blobId in response');
  return blobId;
}

export async function walrusFetch(blobId: string): Promise<Uint8Array> {
  const res = await fetch(`${WALRUS_AGGREGATOR}/v1/blobs/${blobId}`);
  if (!res.ok) throw new Error(`Walrus fetch failed: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

// NoteSentQuery는 queries.ts에서 export — 여기선 중복 정의 안 함.
