/**
 * ium 모듈 PTB 빌더 (이음 = 인연 매칭, 2단계 합의).
 *
 * request_ium: 신청자가 매칭 INYEON Event 생성(자신=INITIATOR) + IumRequest를 상대에게 전달.
 * accept_ium: 수신자가 소유한 IumRequest로 RECEIVER 참가 → 매칭 확정 + 양방향 CS 신호 발행.
 * (구 create_ium/revoke_ium + 전역 IumRegistry는 컨트랙트에서 제거됨 — cutover로 빌더도 삭제. PII 없음.)
 */

import { Transaction } from '@mysten/sui/transactions';
import { moveTarget, requireMatrixId } from './constants';

export interface RequestIumParams {
  /** 이음을 신청할 상대 지갑 주소. */
  toUser: string;
}

export interface AcceptIumParams {
  /** request_ium이 만든 매칭 INYEON Event ID. */
  eventId: string;
  /** 수신자가 소유한 IumRequest 객체 ID(소유=수락 권한). */
  requestId: string;
}

/**
 * 이음 신청 — `request_ium(to_user, clock)`. 매칭 INYEON Event 생성(신청자=INITIATOR) + IumRequest를
 * to_user에게 전달. relationType·label(PII) 없음(오프체인).
 */
export function buildRequestIumTx(params: RequestIumParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('ium', 'request_ium'),
    arguments: [tx.pure.address(params.toUser), tx.object.clock()],
  });
  return tx;
}

/**
 * 이음 수락 — `accept_ium(ev, req, clock)`. 수신자가 RECEIVER로 참가해 매칭 확정 → 양방향 CS 신호 발행.
 * req(IumRequest)는 수신자 소유(소유=게이트).
 */
export function buildAcceptIumTx(params: AcceptIumParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('ium', 'accept_ium'),
    arguments: [
      tx.object(params.eventId),
      tx.object(params.requestId),
      // 매칭 양방향 CS를 CS TrustMatrix에 반영.
      tx.object(requireMatrixId('cs')),
      tx.object.clock(),
    ],
  });
  return tx;
}
