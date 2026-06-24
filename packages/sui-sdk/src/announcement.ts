/**
 * announcement 모듈 PTB 빌더.
 *
 * create_announcement: 혼주(WeddingCap 보유자)가 라운지 공지를 온체인 Announcement(공유 오브젝트)로 남긴다.
 *
 * **PII/평문 비온체인 원칙(VISION §7)**: 공지 본문도 온체인 평문 금지 → Walrus에 블롭으로 올리고
 * 온체인엔 **blobId(참조)만** 남긴다. message 인자에 walrusStoreString(text)로 얻은 blobId를 넣는다.
 * (Move의 message: String 필드에 blobId 문자열을 저장 — guestbook::write_message·memory와 동일 패턴.)
 */

import { Transaction } from '@mysten/sui/transactions';
import { moveTarget } from './constants';

export interface CreateAnnouncementParams {
  /** 호스트가 보유한 이 결혼식의 WeddingCap 객체 ID(getWeddingCapForWedding로 조회). */
  capId: string;
  /** Walrus에 올린 공지 본문 블롭의 blobId. 온체인엔 이 참조만 남는다(본문 온체인 평문 회피). */
  messageBlobId: string;
  /** 상단 고정 여부. */
  isPinned?: boolean;
}

/**
 * 공지 생성 — `create_announcement(cap, message, is_pinned, clock)`.
 * WeddingCap 보유 혼주만 호출 가능. message 자리에 Walrus blobId를 넣어 본문을 온체인에 평문으로 올리지 않는다.
 */
export function buildCreateAnnouncementTx(params: CreateAnnouncementParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('announcement', 'create_announcement'),
    arguments: [
      tx.object(params.capId),
      tx.pure.string(params.messageBlobId),
      tx.pure.bool(params.isPinned ?? false),
      tx.object.clock(),
    ],
  });
  return tx;
}
