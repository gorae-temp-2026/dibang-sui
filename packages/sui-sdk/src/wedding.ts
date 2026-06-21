/**
 * wedding 모듈 PTB 빌더.
 *
 * **결정#2(신원-불가지): create_wedding은 익명 앵커만 생성한다.** 신랑·신부·예식장 등 표시정보는
 * 온체인에 보내지 않고 오프체인(Supabase)에 저장한다 — 빌더도 그 인자를 받지 않는다.
 * create_wedding은 `WeddingCap`(key-only soulbound, 결정 2026-06-21)을 ctx.sender()에게 모듈 내부 transfer한다
 * — store가 없어 PTB transfer 불가 → 빌더는 transferObjects를 하지 않는다. capId는 트잭 object change로 조회.
 */

import { Transaction } from '@mysten/sui/transactions';
import { moveTarget, requireMatrixId } from './constants';

export interface CreateWeddingParams {
  /** WeddingCap을 받을 주소(보통 호출자 본인). */
  owner: string;
}

export interface AddHostParams {
  weddingId: string;
  capId: string;
  newHost: string;
}

export interface InviteParams {
  weddingId: string;
  /** 초대하는 혼주(host)의 HOST Participation 객체 ID(방향·event 파생). */
  hostParticipationId: string;
  /** 초대받는 하객 주소(이름·연락처는 오프체인). */
  guest: string;
}

/**
 * 결혼식(익명 앵커) 생성. WeddingCap(key-only soulbound)은 create_wedding이 ctx.sender(=서명자)에게
 * 내부 transfer하므로 빌더는 transferObjects를 하지 않는다. 표시정보(이름·예식장)는 온체인에 안 보낸다(결정#2).
 * params.owner는 미사용(서명자=cap 수령자) — API 호환 위해 시그니처만 유지.
 */
export function buildCreateWeddingTx(_params: CreateWeddingParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('wedding', 'create_wedding'),
    arguments: [tx.object.clock()],
  });
  return tx;
}

/** 호스트(혼주) 추가 (WeddingCap 필요). */
export function buildAddHostTx(params: AddHostParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('wedding', 'add_host'),
    arguments: [
      tx.object(params.weddingId),
      tx.object(params.capId),
      tx.pure.address(params.newHost),
    ],
  });
  return tx;
}

/** 초대(청첩장) — invite(wedding, host_participation, guest, clock). 초대 관계 신호(CS)를 원장에 기록한다. */
export function buildInviteTx(params: InviteParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('wedding', 'invite'),
    arguments: [
      tx.object(params.weddingId),
      tx.object(params.hostParticipationId),
      tx.pure.address(params.guest),
      // 초대 CS를 CS TrustMatrix에 반영.
      tx.object(requireMatrixId('cs')),
      tx.object.clock(),
    ],
  });
  return tx;
}
