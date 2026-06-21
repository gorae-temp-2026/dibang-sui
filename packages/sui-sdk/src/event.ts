/**
 * event 모듈 PTB 빌더.
 *
 * participate: 타인이 self-claimable 역할(하객 GUEST)로 이벤트에 참가. WEDDING 참석이면 attendance CS
 * 신호를 발행 + CS TrustMatrix에 반영(#50 배선). 참가-먼저 패턴의 첫 단계(이후 give/write가 이 Participation 사용).
 */

import { Transaction } from '@mysten/sui/transactions';
import { moveTarget, requireMatrixId } from './constants';

export interface ParticipateParams {
  /** 참가할 gathering::Event 객체 ID(공유). */
  eventId: string;
  /** 역할 코드. self-claim 가능한 건 하객 GUEST=1뿐(권위·매칭 역할은 불가). */
  roleId: number;
}

/**
 * 참가 — `participate(ev, role_id, matrix, clock)`. WEDDING 참석 시 참가자→혼주 CS 신호를
 * 온체인 분류·발행하고 CS 매트릭스에 반영한다(레지스트리로 라우팅된 CS 매트릭스 ID 사용).
 */
export function buildParticipateTx(params: ParticipateParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('event', 'participate'),
    arguments: [
      tx.object(params.eventId),
      tx.pure.u8(params.roleId),
      // 참석 CS를 CS TrustMatrix에 반영(INYEON 참가 등 비-WEDDING이면 매트릭스 미사용).
      tx.object(requireMatrixId('cs')),
      tx.object.clock(),
    ],
  });
  return tx;
}
