/**
 * memory 모듈 PTB 빌더.
 *
 * create_memory: 라운지에 사진/영상 메모리를 온체인 soulbound(key-only)로 기록한다.
 *
 * **PII 비온체인 원칙(VISION §7)**: 사진 원본은 온체인 평문 금지 → Walrus에 블롭으로 올리고
 * 온체인엔 **blobId(참조)만** 남긴다. photoBlobId 인자에 `walrusStore(photoBytes)`로 얻은 blobId를 넣는다.
 * (Move의 photo_url: String 필드에 blobId 문자열을 저장 — note::send_note(blob_id)와 동일 패턴.)
 */

import { Transaction } from '@mysten/sui/transactions';
import { moveTarget } from './constants';

export interface CreateMemoryParams {
  /** 메모리가 속한 결혼식 Wedding 객체 ID(값으로 전달 — create_memory가 ID by-value를 받음). */
  weddingId: string;
  /** 캡션 등 비민감 텍스트(없으면 빈 문자열). PII 금지 — 이름·연락처는 넣지 않는다. */
  text: string;
  /** Walrus에 올린 사진 블롭의 blobId. 온체인엔 이 참조만 남는다(원본 사진은 온체인 평문 금지). */
  photoBlobId: string;
}

/**
 * 메모리 작성 — `create_memory(wedding_id, text, photo_url, clock)`.
 * 누구나(하객 포함) 작성 가능. Memory는 soulbound(key-only)로 작성자에 귀속된다.
 * photo_url 자리에 Walrus blobId를 넣어 사진을 온체인에 평문으로 올리지 않는다.
 */
export function buildCreateMemoryTx(params: CreateMemoryParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('memory', 'create_memory'),
    arguments: [
      // ID by-value: BCS상 address와 동일(32바이트) → tx.pure.address로 직렬화.
      tx.pure.address(params.weddingId),
      tx.pure.string(params.text),
      tx.pure.string(params.photoBlobId),
      tx.object.clock(),
    ],
  });
  return tx;
}
