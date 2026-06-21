/**
 * ium 모듈 PTB 빌더.
 *
 * create_ium 은 공유 IumRegistry(설정에서 ID 주입)와 함께 호출해 Ium(NFT)을 반환하므로
 * owner에게 transfer 한다. revoke_ium 은 보유한 Ium을 소비한다.
 */

import { Transaction } from '@mysten/sui/transactions';
import { moveTarget, getConfig } from './constants';

export interface CreateIumParams {
  toUser: string;
  relationType: string;
  label: string;
  /** 생성한 Ium을 받을 주소(보통 호출자 본인 = from_user). */
  owner: string;
}

export interface RevokeIumParams {
  iumId: string;
}

/**
 * ⚠️ STALE — 실행 시 abort. `ium::create_ium`/전역 IumRegistry는 제거됨 → 매칭 = `request_ium(to_user, clock)`→
 * `accept_ium(ev, req, clock)`(2단계 핸드오프). relationType·label(PII)도 전달. 사용 금지.
 * 레시피: _audit/2026-06-21-sdk-contract-drift/SUMMARY.md.
 * (구) 신뢰 관계 생성 + Ium을 owner에게 전송.
 */
export function buildCreateIumTx(params: CreateIumParams): Transaction {
  const tx = new Transaction();
  const ium = tx.moveCall({
    target: moveTarget('ium', 'create_ium'),
    arguments: [
      tx.object(getConfig().iumRegistryId),
      tx.pure.address(params.toUser),
      tx.pure.string(params.relationType),
      tx.pure.string(params.label),
      tx.object.clock(),
    ],
  });
  tx.transferObjects([ium], params.owner);
  return tx;
}

/**
 * ⚠️ STALE — 실행 시 abort. `ium::revoke_ium`/IumRegistry 제거됨(전역 레지스트리 폐기 → revoke 개념 없음).
 * 사용 금지. 레시피: _audit/2026-06-21-sdk-contract-drift/SUMMARY.md.
 * (구) 신뢰 관계 취소 (보유한 Ium 소비, 레지스트리에서 쌍 제거).
 */
export function buildRevokeIumTx(params: RevokeIumParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('ium', 'revoke_ium'),
    arguments: [tx.object(getConfig().iumRegistryId), tx.object(params.iumId)],
  });
  return tx;
}

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
 * 이음 신청(현행) — `request_ium(to_user, clock)`. 매칭 INYEON Event 생성(신청자=INITIATOR) + IumRequest를
 * to_user에게 전달. relationType·label(PII) 없음(오프체인). buildCreateIumTx 대체.
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
 * 이음 수락(현행) — `accept_ium(ev, req, clock)`. 수신자가 RECEIVER로 참가해 매칭 확정 → 양방향 CS 신호 발행.
 * req(IumRequest)는 수신자 소유(소유=게이트). buildRevokeIumTx의 정상 대응(매칭은 취소 아닌 수락).
 */
export function buildAcceptIumTx(params: AcceptIumParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('ium', 'accept_ium'),
    arguments: [tx.object(params.eventId), tx.object(params.requestId), tx.object.clock()],
  });
  return tx;
}
