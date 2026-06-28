/**
 * memory 모듈 PTB 빌더.
 *
 * create_memory: 라운지에 사진/영상 메모리를 온체인 soulbound(key-only)로 기록 + SHARE_MEMORY CS 신호 발행.
 *
 * **PII 비온체인 원칙(VISION §7)**: 사진 원본은 온체인 평문 금지 → Walrus에 블롭으로 올리고
 * 온체인엔 **blobId(참조)만** 남긴다. photoBlobId 인자에 `walrusStore(photoBytes)`로 얻은 blobId를 넣는다.
 */

import { Transaction } from '@mysten/sui/transactions';
import { moveTarget, requireMatrixId } from './constants';

export interface CreateMemoryParams {
  /** 메모리가 속한 결혼식 Wedding 공유 객체 ID. */
  weddingId: string;
  /** 하객이 이 결혼식 이벤트에 참가해 받은 Participation 객체 ID. */
  participationId: string;
  /** 캡션 등 비민감 텍스트(없으면 빈 문자열). PII 금지. */
  text: string;
  /** Walrus에 올린 사진 블롭의 blobId. */
  photoBlobId: string;
}

/**
 * 메모리 작성 — `create_memory(wedding, participation, text, photo_url, matrix, clock)`.
 * SHARE_MEMORY → CS 신호를 온체인 분류·발행한다.
 */
export function buildCreateMemoryTx(params: CreateMemoryParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('memory', 'create_memory_v2'),
    arguments: [
      tx.object(params.weddingId),
      tx.object(params.participationId),
      tx.pure.string(params.text),
      tx.pure.string(params.photoBlobId),
      tx.object(requireMatrixId('cs')),
      tx.object.clock(),
    ],
  });
  return tx;
}
