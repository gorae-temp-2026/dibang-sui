/**
 * guestbook 모듈 PTB 빌더.
 *
 * write 는 방명록 작성을 WRITE_MESSAGE → CS 신호로 온체인 기록한다(본문·이름은 오프체인, PII 없음, 참가-먼저).
 * write_message 는 신호 + 본문을 온체인 GuestbookMessage(soulbound)로 남긴다. **본문·이름 모두 Walrus blobId로**
 * 전달해 온체인 평문 저장을 피한다(VISION §7). 이름(guest_name)도 평문이 아니라
 * walrusStorePIIString로 올린 blobId 참조를 싣는다(이름 → Walrus → Sui 연결). 이름을 안 싣을 땐 빈 문자열.
 * (구 write_entry/claim_entry + GuestbookEntry 객체는 컨트랙트에서 제거됨 — cutover로 빌더도 삭제.)
 */

import { Transaction } from '@mysten/sui/transactions';
import { moveTarget, requireMatrixId } from './constants';

export interface WriteParams {
  weddingId: string;
  /** 하객이 이 결혼식 이벤트에 GUEST로 참가해 받은 Participation 객체 ID(참가-먼저). */
  participationId: string;
}

export interface WriteMessageParams {
  weddingId: string;
  /** 하객이 이 결혼식 이벤트에 GUEST로 참가해 받은 Participation 객체 ID(참가-먼저). */
  participationId: string;
  /** Walrus에 올린 방명록 본문 블롭의 blobId. 온체인엔 이 참조만 남는다(본문 온체인 평문 회피). */
  messageBlobId: string;
  /** 수신 슬롯 코드(0=groom … 5=bride_mother). */
  recipientSlot: number;
  /**
   * 이름의 Walrus blobId 참조(평문 아님). 이름은 PII라 온체인 평문 금지(VISION §7) →
   * walrusStorePIIString(name)으로 Walrus에 올린 뒤 그 blobId를 여기 싣는다(이름 → Walrus → Sui 연결).
   * 이름을 안 싣을 땐 빈 문자열(기본). 표시용 평문 이름은 DB(전환기)에 유지.
   */
  guestName?: string;
}

/**
 * 방명록 — `write(wedding, participation, clock)`. 본문·이름은 오프체인(PII 없음).
 * WRITE_MESSAGE → CS 신호를 온체인 분류·발행한다.
 */
export function buildWriteTx(params: WriteParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('guestbook', 'write'),
    arguments: [
      tx.object(params.weddingId),
      tx.object(params.participationId),
      // 방명록 CS를 CS TrustMatrix에 반영.
      tx.object(requireMatrixId('cs')),
      tx.object.clock(),
    ],
  });
  return tx;
}

/**
 * 방명록 + 본문 — `write_message(wedding, participation, guest_name, message, recipient_slot, matrix, clock)`.
 * WRITE_MESSAGE → CS 신호를 발행하고 본문을 soulbound GuestbookMessage로 남긴다.
 * **message·guest_name 모두 Walrus blobId를 넣는다** — 본문·이름 원문은 Walrus에 저장하고 온체인엔 참조만 둔다(평문 회피).
 * guest_name은 walrusStorePIIString(name)의 blobId(이름 미탑재 시 ''). 빈 본문은 Move가 거부(EEmptyMessage)하므로 message blobId는 비어선 안 된다.
 */
export function buildWriteMessageTx(params: WriteMessageParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('guestbook', 'write_message'),
    arguments: [
      tx.object(params.weddingId),
      tx.object(params.participationId),
      tx.pure.string(params.guestName ?? ''),
      tx.pure.string(params.messageBlobId),
      tx.pure.u8(params.recipientSlot),
      // 방명록 CS를 CS TrustMatrix에 반영.
      tx.object(requireMatrixId('cs')),
      tx.object.clock(),
    ],
  });
  return tx;
}
